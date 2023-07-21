import React, { FC, useMemo, useEffect, useRef, useState, useCallback } from 'react';
import cx from 'classnames';
import { settings } from 'carbon-components';
// import { TooltipDefinition } from 'carbon-components-react';
// import { Tooltip } from 'carbon-components-react';
import { QueryResult } from 'ibm-watson/discovery/v2';
import { ProcessedDoc } from 'utils/document';
import { Bbox, TextMappings } from '../../types';
import { PdfDisplayProps } from '../PdfViewer/types';
import { PdfRenderedText } from '../PdfViewer/PdfViewerTextLayer';
import { ExtractedDocumentInfo } from './utils/common/documentUtils';
import { Highlighter } from './utils/Highlighter';
import { getShapeFromBboxHighlight } from './utils/common/highlightUtils';
import { DocumentBboxHighlight, HighlightProps, HighlightShape } from './types';
import { OnTooltipEnterFn, TooltipAction } from '../../types';
import HighlightTooltip from '../HighlightTooltip/HighlightTooltip';

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

  const [tooltipAction, setTooltipAction] = useState<TooltipAction>({
    mouseAction: 'LEAVE',
    rect: new DOMRect(),
    element: <div></div>
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
    (mouseAction: string, clickRect?: DOMRect, tooltipEle?: JSX.Element) => {
      const updateTooltipAction: TooltipAction = {
        element: tooltipEle || <div></div>,
        mouseAction: mouseAction || 'LEAVE',
        rect: clickRect || new DOMRect()
      };
      setTooltipAction(updateTooltipAction);

      console.log('onTooltipEnter ', updateTooltipAction);
    },
    [setTooltipAction]
  );

  const highlightDivRef = useRef<HTMLDivElement | null>(null);
  useScrollIntoActiveHighlight(highlightDivRef, highlightShapes, activeIds);

  return (
    <div ref={highlightDivRef} className={cx(base, className)}>
      <HighlightTooltip parentDiv={highlightDivRef} tooltipAction={tooltipAction} />

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

  const onMouseLeaveHandler = () => {
    onTooltipAction('LEAVE');
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
          </div>
        );
      })}
    </div>
  );
};

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
