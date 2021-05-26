import React, { memo, ComponentType, useCallback, useState, useMemo } from 'react';
import cc from 'classcat';

import { useStoreActions, useStoreState } from '../../store/hooks';
import { Edge, EdgeProps, WrapEdgeProps } from '../../types';
import { onMouseDown } from '../../components/Handle/handler';
import { EdgeAnchor } from './EdgeAnchor';

export default (EdgeComponent: ComponentType<EdgeProps>) => {
  const EdgeWrapper = ({
    id,
    className,
    type,
    data,
    onClick,
    onEdgeDoubleClick,
    selected,
    animated,
    label,
    labelStyle,
    labelShowBg,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius,
    style,
    arrowHeadType,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    elementsSelectable,
    markerEndId,
    isHidden,
    sourceHandleId,
    targetHandleId,
    handleEdgeUpdate,
    onConnectEdge,
    onContextMenu,
    onMouseEnter,
    onMouseMove,
    onMouseLeave,
    edgeUpdaterRadius,
    onEdgeUpdateStart,
  }: WrapEdgeProps): JSX.Element | null => {
    const addSelectedElements = useStoreActions((actions) => actions.addSelectedElements);
    const setConnectionNodeId = useStoreActions((actions) => actions.setConnectionNodeId);
    const unsetNodesSelection = useStoreActions((actions) => actions.unsetNodesSelection);
    const setPosition = useStoreActions((actions) => actions.setConnectionPosition);
    const connectionMode = useStoreState((state) => state.connectionMode);
    const nodes = useStoreState((state) => state.nodes);

    const [updating, setUpdating] = useState<boolean>(false);

    const inactive = !elementsSelectable && !onClick;
    const edgeClasses = cc([
      'react-flow__edge',
      `react-flow__edge-${type}`,
      className,
      { selected, animated, inactive, updating },
    ]);

    const edgeElement = useMemo<Edge>(() => {
      const el: Edge = {
        id,
        source,
        target,
        type,
      };

      if (sourceHandleId) {
        el.sourceHandle = sourceHandleId;
      }

      if (targetHandleId) {
        el.targetHandle = targetHandleId;
      }

      if (typeof data !== 'undefined') {
        el.data = data;
      }

      return el;
    }, [id, source, target, type, sourceHandleId, targetHandleId, data]);

    const onEdgeClick = useCallback(
      (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        if (elementsSelectable) {
          unsetNodesSelection();
          addSelectedElements(edgeElement);
        }

        onClick?.(event, edgeElement);
      },
      [elementsSelectable, edgeElement, onClick]
    );

    const onEdgeDoubleClickHandler = useCallback(
      (event: React.MouseEvent<SVGGElement, MouseEvent>) => {
        onEdgeDoubleClick?.(event, edgeElement);
      },
      [edgeElement, onEdgeDoubleClick]
    );

    const onEdgeContextMenu = useCallback(
      (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        onContextMenu?.(event, edgeElement);
      },
      [edgeElement, onContextMenu]
    );

    const onEdgeMouseEnter = useCallback(
      (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        onMouseEnter?.(event, edgeElement);
      },
      [edgeElement, onContextMenu]
    );

    const onEdgeMouseMove = useCallback(
      (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        onMouseMove?.(event, edgeElement);
      },
      [edgeElement, onContextMenu]
    );

    const onEdgeMouseLeave = useCallback(
      (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        onMouseLeave?.(event, edgeElement);
      },
      [edgeElement, onContextMenu]
    );

    const handleEdgeUpdater = useCallback(
      (event: React.MouseEvent<SVGGElement, MouseEvent>, isSourceHandle: boolean) => {
        const nodeId = isSourceHandle ? target : source;
        const handleId = isSourceHandle ? targetHandleId : sourceHandleId;
        const isValidConnection = () => true;
        const isTarget = isSourceHandle;

        onEdgeUpdateStart?.(event, edgeElement);

        onMouseDown(
          event,
          handleId,
          nodeId,
          setConnectionNodeId,
          setPosition,
          onConnectEdge,
          isTarget,
          isValidConnection,
          connectionMode
        );
      },
      [id, source, target, type, sourceHandleId, targetHandleId, setConnectionNodeId, setPosition, edgeElement]
    );

    const onEdgeUpdaterSourceMouseDown = useCallback(
      (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        handleEdgeUpdater(event, true);
      },
      [id, source, sourceHandleId, handleEdgeUpdater]
    );

    const onEdgeUpdaterTargetMouseDown = useCallback(
      (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
        handleEdgeUpdater(event, false);
      },
      [id, target, targetHandleId, handleEdgeUpdater]
    );

    const onEdgeUpdaterMouseEnter = useCallback(() => setUpdating(true), [setUpdating]);
    const onEdgeUpdaterMouseOut = useCallback(() => setUpdating(false), [setUpdating]);

    if (isHidden) {
      return null;
    }

    console.log({ source, target });

    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);

    const sourceParent = nodes.find(n => {
      console.log({ n, snpid: sourceNode?.parentId})
      return n.id === sourceNode?.parentId
    });
    const targetParent = nodes.find(n => {
      console.log({ n, tnpid: targetNode?.parentId})
      return n.id === targetNode?.parentId
    });

    // TODO: Make these not hard-coded
    // Also TODO: Fix initial rendering while dragging edge
    // const padding = 13;
    // const titleHeight = 12;
    // const nameHeight = 29;
    // const a = sourceNode?.parentId ?? -1
    // const b = sourceParent?.parentId ?? -1
    // const c = targetNode?.parentId ?? -1
    // const d = targetParent?.parentId ?? -1
    // // document.querySelector(`[data-nodeid="${}"]`)
    // console.log({ a, b, c, d })
    // const sourceNodeElement = document.querySelector(`[data-nodeid="${a}"]`);
    // const sourceParentElement = document.querySelector(`[data-nodeid="${b}"]`);
    // const targetNodeElement = document.querySelector(`[data-nodeid="${c}"]`);
    // const targetParentElement = document.querySelector(`[data-nodeid="${d}"]`);

    // console.log({ sourceNodeElement, targetNodeElement });
    // console.log(sourceNodeElement?.getBoundingClientRect());
    // console.log(targetNodeElement?.getBoundingClientRect());


    // const sourceNodeOffsetX = (sourceNodeElement?.getBoundingClientRect().left ?? 0) - (sourceParentElement?.getBoundingClientRect().left ?? 0);
    // const sourceNodeOffsetY = (sourceNodeElement?.getBoundingClientRect().top ?? 0) - (sourceParentElement?.getBoundingClientRect().top ?? 0);
    // const targetNodeOffsetX = (targetNodeElement?.getBoundingClientRect().left ?? 0) - (targetParentElement?.getBoundingClientRect().left ?? 0);
    // const targetNodeOffsetY = (targetNodeElement?.getBoundingClientRect().top ?? 0) - (targetParentElement?.getBoundingClientRect().top ?? 0); 

    // console.log({ sourceNodeOffsetX, sourceNodeOffsetY, targetNodeOffsetX, targetNodeOffsetY })

    const el1 = document.getElementById("idwithstylescontent");
    const el2 = document.getElementById("idfornodeheader");
    let el1padding = null
    if (el1) {
      el1padding = window.getComputedStyle(el1).getPropertyValue('padding');
    }
    let el2Height = null
    if (el2) {
      el2Height = window.getComputedStyle(el2).getPropertyValue('height');
    }
    const convertFromPxToNum = (pxNumString: string | null): Number => {
      if (!pxNumString) {
        return 0
      }

      const allButPx = pxNumString.slice(0, pxNumString.length - 2)
      console.log({ pxNumString, allButPx })
      return Number(allButPx)
    }
    const [elementPadding, elementHeight] = [el1padding, el2Height].map(convertFromPxToNum)

    return (
      <g
        className={edgeClasses}
        onClick={onEdgeClick}
        onDoubleClick={onEdgeDoubleClickHandler}
        onContextMenu={onEdgeContextMenu}
        onMouseEnter={onEdgeMouseEnter}
        onMouseMove={onEdgeMouseMove}
        onMouseLeave={onEdgeMouseLeave}
      >
        <EdgeComponent
          id={id}
          source={source}
          target={target}
          selected={selected}
          animated={animated}
          label={label}
          labelStyle={labelStyle}
          labelShowBg={labelShowBg}
          labelBgStyle={labelBgStyle}
          labelBgPadding={labelBgPadding}
          labelBgBorderRadius={labelBgBorderRadius}
          data={data}
          style={style}
          arrowHeadType={arrowHeadType}
          sourceX={sourceX + (sourceParent?.__rf.position.x ?? 0) + elementPadding} // + sourceNodeOffsetX} // + elementPadding}
          sourceY={sourceY + (sourceParent?.__rf.position.y ?? 0) + elementPadding + elementHeight} // + sourceNodeOffsetY} //  + elementPadding + elementHeight}
          targetX={targetX + (targetParent?.__rf.position.x ?? 0) + elementPadding} // + targetNodeOffsetX} // + elementPadding}
          targetY={targetY + (targetParent?.__rf.position.y ?? 0) + elementPadding + elementHeight} // + targetNodeOffsetY} // + elementPadding + elementHeight}
          sourcePosition={sourcePosition}
          targetPosition={targetPosition}
          markerEndId={markerEndId}
          sourceHandleId={sourceHandleId}
          targetHandleId={targetHandleId}
        />
        {handleEdgeUpdate && (
          <g
            onMouseDown={onEdgeUpdaterSourceMouseDown}
            onMouseEnter={onEdgeUpdaterMouseEnter}
            onMouseOut={onEdgeUpdaterMouseOut}
          >
            <EdgeAnchor position={sourcePosition} centerX={sourceX} centerY={sourceY} radius={edgeUpdaterRadius} />
          </g>
        )}
        {handleEdgeUpdate && (
          <g
            onMouseDown={onEdgeUpdaterTargetMouseDown}
            onMouseEnter={onEdgeUpdaterMouseEnter}
            onMouseOut={onEdgeUpdaterMouseOut}
          >
            <EdgeAnchor position={targetPosition} centerX={targetX} centerY={targetY} radius={edgeUpdaterRadius} />
          </g>
        )}
      </g>
    );
  };

  EdgeWrapper.displayName = 'EdgeWrapper';

  return memo(EdgeWrapper);
};
