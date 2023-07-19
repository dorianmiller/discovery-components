import React, { FC, useState, useEffect } from 'react';

import { Tooltip } from 'carbon-components-react';

import { OnTooltipEnterFn, TooltipInfo, TooltipAction } from '../../types';

type Props = {
  /**
   * state of the highlight-tootip
   */
  tooltipAction: TooltipAction;
};

const HighlightTooltip: FC<Props> = ({ tooltipAction }) => {
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo>({
    rectTooltipArea: new DOMRect(),
    element: <div></div>,
    isOpen: false
  });

  useEffect(() => {
    const isOpen = tooltipAction.mouseAction?.localeCompare('LEAVE') !== 0;
    const clickRect = tooltipAction.rect;
    const tooltipRect = new DOMRect(
      clickRect.x - highlightDivRect.x - 2,
      clickRect.y - highlightDivRect.y - 2,
      clickRect?.width + 2,
      clickRect?.height + 2
    );
    const tooltipUpdate = {
      rectTooltipArea: tooltipRect,
      element: tooltipAction.element || <div></div>,
      isOpen: isOpen
    };
    setTooltipInfo(tooltipUpdate);
    console.log('onTooltipEnter ', tooltipUpdate);
  }, [tooltipAction, setTooltipInfo]);

  /*
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo>({
    rect: new DOMRect(),
    element: (<div></div>),
    isOpen: false
  });

  const onTooltipEnter = useCallback((mouseAction: String, clickRect?: DOMRect, tooltip?: JSX.Element) => {
    if (!clickRect) {
      clickRect = new DOMRect();
    }
    console.log('onTooltipOver rect            ', clickRect, tooltip);
    let highlightDivRect; // = highlightDivRef.current?.getBoundingClientRect();
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
    )
    const tooltipState = {
      rect: tooltipRect,
      element: tooltip || (<div></div>),
      isOpen: isOpen
    }
    setTooltipInfo(tooltipState);
    console.log('onTooltipEnter ', tooltipState);
  }, [setTooltipInfo]);
  */

  return (
    //Outter div is required to provide tooltip element with position information
    <div
      style={{
        border: '2px solid purple',
        width: '50px',
        height: '50px',
        position: 'absolute',
        zIndex: 50,
        top: tooltipInfo.rect.y,
        left: tooltipInfo.rect.x,
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
              width: tooltipInfo.rect.width,
              height: tooltipInfo.rect.height,
              pointerEvents: 'none'
            }}
          />
        }
        children={
          <div>
            Tooltip <b style={{ color: 'red' }}>text</b> {tooltipInfo.isOpen} x {tooltipInfo.rect.x}{' '}
            zzz
          </div>
        }
      />
    </div>
  );
};

export default HighlightTooltip;
