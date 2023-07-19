import React, { FC, useMemo, useEffect, useRef, useState, useCallback, MouseEvent } from 'react';
import cx from 'classnames';
import { settings } from 'carbon-components';
// import { TooltipDefinition } from 'carbon-components-react';
import { Tooltip } from 'carbon-components-react';
import { QueryResult } from 'ibm-watson/discovery/v2';
import { ProcessedDoc } from 'utils/document';
import { Bbox, TextMappings } from '../../types';
import { PdfDisplayProps } from '../PdfViewer/types';
import { PdfRenderedText } from '../PdfViewer/PdfViewerTextLayer';
import { ExtractedDocumentInfo } from './utils/common/documentUtils';
import { Highlighter } from './utils/Highlighter';
import { getShapeFromBboxHighlight } from './utils/common/highlightUtils';
import { DocumentBboxHighlight, HighlightProps, HighlightShape } from './types';
import { OnTooltipEnterFn, TooltipInfo } from '../../types';

type Props = PdfDisplayProps &
  HighlightProps & {
    /**
     * Class name to style highlight layer
     */
    className?: string;

    /**
     * Parsed document information
     */
    parsedDocument: ExtractedDocumentInfo | null;

    /**
     * PDF text content information in a page from parsed PDF
     */
    pdfRenderedText: PdfRenderedText | null;

    /**
     * Highlight bboxes. This overrides `highlights` props
     */
    boxHighlights?: DocumentBboxHighlight[];

    // /**
    //  * Callback returns tooltip information
    //  */
    //  onTooltipEnter?: OnTooltipEnterFn;
  };

const base = `${settings.prefix}--document-preview-pdf-viewer-highlight`;
const baseTooltip = `${settings.prefix}--BREAK-document-preview-tooltip`;

/**
 * Text highlight layer for PdfViewer
 */
const PdfHighlight: FC<Props> = ({
  className,
  highlightClassName,
  activeHighlightClassName,
  document,
  parsedDocument,
  page,
  highlights,
  boxHighlights,
  activeIds,
  pdfRenderedText,
  scale,
  _useHtmlBbox = true,
  _usePdfTextItem = true
}) => {
  const highlighter = useHighlighter({
    document,
    textMappings: parsedDocument?.textMappings,
    processedDoc: _useHtmlBbox ? parsedDocument?.processedDoc : undefined,
    pdfRenderedText: (_usePdfTextItem && pdfRenderedText) || undefined,
    pageNum: page,
    isReady:
      !!parsedDocument && !!highlights && (!_usePdfTextItem || pdfRenderedText?.page === page)
  });

  const { textDivs } = pdfRenderedText || {};
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo>({
    rectTooltipArea: new DOMRect(),
    element: <div></div>,
    isOpen: false
  });

  const highlightShapes = useMemo(() => {
    if (boxHighlights) {
      return getShapeFromBboxHighlight(boxHighlights, page);
    } else {
      highlighter?.setTextContentDivs(textDivs);
      return highlighter
        ? (highlights || []).map(highlight => {
            return highlighter.getHighlight(highlight);
          })
        : [];
    }
  }, [boxHighlights, highlighter, highlights, page, textDivs]);

  const onTooltipEnter = useCallback(
    (mouseAction: String, clickRect?: DOMRect, tooltip?: JSX.Element) => {
      if (!clickRect) {
        clickRect = new DOMRect();
      }
      console.log('onTooltipOver rect            ', clickRect, tooltip);
      let highlightDivRect = highlightDivRef.current?.getBoundingClientRect();
      if (!highlightDivRect) {
        highlightDivRect = new DOMRect();
      }

      const isOpen = mouseAction?.localeCompare('LEAVE') !== 0;

      console.log('onTooltipOver tooltipContainer', highlightDivRect);
      console.log('onTooltipOver mouseAction     ', mouseAction, isOpen);

      const tooltipRect = new DOMRect(
        clickRect.x - highlightDivRect.x - 2,
        clickRect.y - highlightDivRect.y - 2,
        clickRect?.width + 2,
        clickRect?.height + 2
      );
      const tooltipState = {
        rectTooltipArea: tooltipRect,
        element: tooltip || <div></div>,
        isOpen: isOpen
      };
      setTooltipInfo(tooltipState);
      console.log('onTooltipEnter ', tooltipState);
    },
    [setTooltipInfo]
  );

  // const onTooltipLeave = useCallback(() => {
  //   console.log('onTooltipLeave');
  //   // Default, small top left (most likely not part of a document)
  //   const defaultState = {
  //     rect: new DOMRect(10,10,10,10),
  //     element: (<div></div>),
  //     isOpen: false
  //   };
  //   setTooltipInfo(defaultState);
  // }, [setTooltipInfo]);

  const highlightDivRef = useRef<HTMLDivElement | null>(null);
  useScrollIntoActiveHighlight(highlightDivRef, highlightShapes, activeIds);

  return (
    <div ref={highlightDivRef} className={cx(base, className)}>
      {/* Outter div is required to provide tooltip element with position information */}
      <div
        style={{
          border: '2px solid purple',
          width: '50px',
          height: '50px',
          position: 'absolute',
          zIndex: 50,
          top: tooltipInfo.rectTooltipArea.y,
          left: tooltipInfo.rectTooltipArea.x,
          pointerEvents: 'none'
        }}
      >
        <Tooltip
          autoOrientation={true}
          tabIndex={0}
          showIcon={false}
          open={tooltipInfo.isOpen}
          triggerText={
            <div
              style={{
                border: '2px solid green',
                width: tooltipInfo.rectTooltipArea.width,
                height: tooltipInfo.rectTooltipArea.height,
                pointerEvents: 'none'
              }}
            />
          }
          children={
            <div>
              Tooltip <b style={{ color: 'red' }}>text</b> {tooltipInfo.isOpen} x{' '}
              {tooltipInfo.rect.x} zzz
            </div>
          }
        />
      </div>
      {highlightShapes.map(shape => {
        const active = activeIds?.includes(shape.highlightId);
        return (
          <Highlight
            key={shape.highlightId}
            className={highlightClassName}
            activeClassName={activeHighlightClassName}
            shape={shape}
            scale={scale}
            active={active}
            onTooltipAction={onTooltipEnter}
          />
        );
      })}
      //{' '}
    </div>
  );
};

const Highlight: FC<{
  className?: string;
  activeClassName?: string;
  shape: HighlightShape;
  scale: number;
  active?: boolean;
  onTooltipAction?: OnTooltipEnterFn;
}> = ({ className, activeClassName, shape, scale, active, onTooltipAction = () => {} }) => {
  const divHighlightNode = useRef<HTMLDivElement>(null);

  if (shape?.boxes.length === 0) {
    return null;
  }

  const onMouseHandler = () => {
    const divEle = divHighlightNode.current;
    console.log('onMouseHandler', shape, divEle);
    const tooltipContent = <div>see more</div>;
    onTooltipAction('ENTER', divEle?.getBoundingClientRect(), tooltipContent);
    if (divEle) {
      console.log('divEle coord', divEle.getBoundingClientRect());
    }
  };

  const onMouseLeaveHandler = (event: MouseEvent) => {
    // const divEle = divHighlightNode.current;
    console.log('leave, event, got it', event);
    // const tooltipContent =(
    //   <div>see more</div>
    // );
    onTooltipAction('LEAVE');
    // if (divEle) {
    //   console.log('divEle coord', divEle.getBoundingClientRect());
    // }
  };

  return (
    <div data-highlight-id={shape.highlightId}>
      {shape?.boxes.map(item => {
        return (
          <div
            style={{ ...getPositionStyle(item.bbox, scale), position: 'absolute' }}
            // onClick={onClickHandler}
            onMouseEnter={onMouseHandler}
            onMouseLeave={onMouseLeaveHandler}
            ref={divHighlightNode}
          >
            <div
              key={`${item.bbox[0].toFixed(2)}_${item.bbox[1].toFixed(2)}`}
              className={cx(
                `${base}__item`,
                className,
                shape.className,
                active && `${base}__item--active`,
                active && activeClassName,
                shape.facetId && `category_${shape.facetId} mf-highlight`,
                shape.facetId && active && `category_${shape.facetId} mf-active`,
                baseTooltip
              )}
              style={{
                width: getPositionStyle(item.bbox, scale).width,
                height: getPositionStyle(item.bbox, scale).height
              }}
            />
            {/* <TooltipDefinition
              // direction="bottom"
              autoOrientation={true}
              tabIndex={0}
              showIcon={false}
              children={
                <div
                  key={`${item.bbox[0].toFixed(2)}_${item.bbox[1].toFixed(2)}`}
                  className={cx(
                    `${base}__item`,
                    className,
                    shape.className,
                    active && `${base}__item--active`,
                    active && activeClassName,
                    shape.facetId && `category_${shape.facetId} mf-highlight`,
                    shape.facetId && active && `category_${shape.facetId} mf-active`,
                    baseTooltip
                  )}
                  style={{
                    width: getPositionStyle(item.bbox, scale).width,
                    height: getPositionStyle(item.bbox, scale).height
                  }}
                />
              }
              tooltipText={
                <div>
                  Tooltip <b style={{ color: 'red' }}>text</b> zzz
                </div>
              }
            /> */}
          </div>
        );
      })}
    </div>
  );
};

// Original tooltip

{
  /* <div
              key={`${item.bbox[0].toFixed(2)}_${item.bbox[1].toFixed(2)}`}
              className={cx(
                `${base}__item`,
                className,
                shape.className,
                active && `${base}__item--active`,
                active && activeClassName,
                shape.facetId && `category_${shape.facetId} mf-highlight`,
                shape.facetId && active && `category_${shape.facetId} mf-active`,
                baseTooltip
              )}
              // style={{ ...getPositionStyle(item.bbox, scale) }}
            >
              <div 
                className={cx(`${baseTooltip}--text`)}
              >
                {shape.facetId}{shape.value}
              </div>
            </div> */
}

function getPositionStyle(bbox: Bbox, scale: number, padding: number = 0) {
  const [left, top, right, bottom] = bbox;
  return {
    left: `${(left - padding) * scale}px`,
    top: `${(top - padding) * scale}px`,
    width: `${(right - left + padding) * scale}px`,
    height: `${(bottom - top + padding) * scale}px`
  };
}

const useHighlighter = ({
  document,
  textMappings,
  processedDoc,
  pdfRenderedText,
  pageNum,
  isReady
}: {
  document?: QueryResult;
  textMappings?: TextMappings;
  processedDoc?: ProcessedDoc;
  pdfRenderedText?: PdfRenderedText;
  pageNum: number;
  isReady: boolean;
}) => {
  return useMemo(() => {
    if (isReady && document && textMappings) {
      return new Highlighter({
        document,
        textMappings,
        pageNum,
        htmlBboxInfo: processedDoc && {
          bboxes: processedDoc.bboxes,
          styles: processedDoc.styles
        },
        pdfTextContentInfo:
          pdfRenderedText?.textContent && pdfRenderedText?.viewport ? pdfRenderedText : undefined
      });
    }
    return null;
  }, [document, isReady, pageNum, pdfRenderedText, processedDoc, textMappings]);
};

function useScrollIntoActiveHighlight(
  highlightDivRef: React.MutableRefObject<HTMLDivElement | null>,
  shapes: HighlightShape[],
  activeIds: string[] | undefined
) {
  useEffect(() => {
    if (!highlightDivRef.current) {
      return;
    }

    const activeShape = shapes.find(
      shape => shape?.highlightId && activeIds?.includes(shape.highlightId)
    );
    if (activeShape) {
      let timer: NodeJS.Timeout | null = setTimeout(() => {
        timer = null;

        const highlightDiv = highlightDivRef.current;
        if (!highlightDiv) return;

        const highlightElm = highlightDiv?.querySelector(
          `[data-highlight-id=${activeShape.highlightId}]`
        );
        highlightElm?.firstElementChild?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }, 0);

      // cleanup timeout
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
    return;
  }, [activeIds, highlightDivRef, shapes]);
}

export default PdfHighlight;
