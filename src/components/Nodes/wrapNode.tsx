import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  memo,
  ComponentType,
  CSSProperties,
  useMemo,
  MouseEvent,
  useCallback,
} from 'react';
import { DraggableCore, DraggableData, DraggableEvent } from 'react-draggable';
import cc from 'classcat';

import { useStoreActions, useStoreState } from '../../store/hooks';
import { Provider } from '../../contexts/NodeIdContext';
import { NodeComponentProps, WrapNodeProps } from '../../types';

export default (NodeComponent: ComponentType<NodeComponentProps>) => {
  const NodeWrapper = ({
    id,
    type,
    data,
    scale,
    xPos,
    yPos,
    selected,
    onClick,
    onMouseEnter,
    onMouseMove,
    onMouseLeave,
    onContextMenu,
    onNodeDoubleClick,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    style,
    className,
    isDraggable,
    isSelectable,
    isConnectable,
    selectNodesOnDrag,
    sourcePosition,
    targetPosition,
    isHidden,
    isInitialized,
    snapToGrid,
    snapGrid,
    isDragging,
    resizeObserver,
    nestLevel,
    children,
    mostRecentlyTouchedSceneIds
  }: React.PropsWithChildren<WrapNodeProps>) => {
    const observerInitialized = useRef<boolean>(false);
    const updateNodeDimensions = useStoreActions((actions) => actions.updateNodeDimensions);
    const addSelectedElements = useStoreActions((actions) => actions.addSelectedElements);
    const updateNodePosDiff = useStoreActions((actions) => actions.updateNodePosDiff);
    const unsetNodesSelection = useStoreActions((actions) => actions.unsetNodesSelection);
    const nodes = useStoreState(state => state.nodes)

    const nodeElement = useRef<HTMLDivElement>(null);

    const node = useMemo(() => ({ id, type, position: { x: xPos, y: yPos }, data }), [id, type, xPos, yPos, data]);
    const grid = useMemo(() => (snapToGrid ? snapGrid : [1, 1])! as [number, number], [snapToGrid, snapGrid]);

    const nodeStyle: CSSProperties = useMemo(
      () => ({
        zIndex: (selected ? 10 : 3) + (10 * nestLevel),
        transform: `translate(${xPos}px,${yPos}px)`,
        pointerEvents:
          isSelectable || isDraggable || onClick || onMouseEnter || onMouseMove || onMouseLeave ? 'all' : 'none',
        // prevents jumping of nodes on start
        opacity: isInitialized ? 1 : 0,
        ...style,
      }),
      [
        selected,
        xPos,
        yPos,
        isSelectable,
        isDraggable,
        onClick,
        isInitialized,
        style,
        onMouseEnter,
        onMouseMove,
        onMouseLeave,
      ]
    );
    const onMouseEnterHandler = useMemo(() => {
      if (!onMouseEnter || isDragging) {
        return;
      }

      return (event: MouseEvent) => onMouseEnter(event, node);
    }, [onMouseEnter, isDragging, node]);

    const onMouseMoveHandler = useMemo(() => {
      if (!onMouseMove || isDragging) {
        return;
      }

      return (event: MouseEvent) => onMouseMove(event, node);
    }, [onMouseMove, isDragging, node]);

    const onMouseLeaveHandler = useMemo(() => {
      if (!onMouseLeave || isDragging) {
        return;
      }

      return (event: MouseEvent) => onMouseLeave(event, node);
    }, [onMouseLeave, isDragging, node]);

    const onContextMenuHandler = useMemo(() => {
      if (!onContextMenu) {
        return;
      }

      return (event: MouseEvent) => onContextMenu(event, node);
    }, [onContextMenu, node]);

    const onSelectNodeHandler = useCallback(
      (event: MouseEvent) => {
        if (!isDraggable) {
          if (isSelectable) {
            unsetNodesSelection();

            if (!selected) {
              addSelectedElements(node);
            }
          }

          onClick?.(event, node);
        }
      },
      [isSelectable, selected, isDraggable, onClick, node]
    );

    const onDragStart = useCallback(
      (event: DraggableEvent) => {
        // For nodes with parent nodes, ensure dragging the child does not also drag the parent
        // https://github.com/react-grid-layout/react-draggable/issues/11
        event.stopPropagation();

        onNodeDragStart?.(event as MouseEvent, node);

        if (selectNodesOnDrag && isSelectable) {
          unsetNodesSelection();

          if (!selected) {
            addSelectedElements(node);
          }
        } else if (!selectNodesOnDrag && !selected && isSelectable) {
          unsetNodesSelection();
          addSelectedElements([]);
        }
      },
      [node, selected, selectNodesOnDrag, isSelectable, onNodeDragStart]
    );

    const onDrag = useCallback(
      (event: DraggableEvent, draggableData: DraggableData) => {
        if (onNodeDrag) {
          node.position.x += draggableData.deltaX;
          node.position.y += draggableData.deltaY;
          onNodeDrag(event as MouseEvent, node);
        }

        updateNodePosDiff({
          id,
          diff: {
            x: draggableData.deltaX,
            y: draggableData.deltaY,
          },
          isDragging: true,
        });
      },
      [id, node, onNodeDrag]
    );

    const onDragStop = useCallback(
      (event: DraggableEvent) => {
        // onDragStop also gets called when user just clicks on a node.
        // Because of that we set dragging to true inside the onDrag handler and handle the click here
        if (!isDragging) {
          if (isSelectable && !selectNodesOnDrag && !selected) {
            addSelectedElements(node);
          }

          onClick?.(event as MouseEvent, node);

          return;
        }

        updateNodePosDiff({
          id: node.id,
          isDragging: false,
        });

        onNodeDragStop?.(event as MouseEvent, node);
      },
      [node, isSelectable, selectNodesOnDrag, onClick, onNodeDragStop, isDragging, selected]
    );

    const onNodeDoubleClickHandler = useCallback(
      (event: MouseEvent) => {
        onNodeDoubleClick?.(event, node);
      },
      [node, onNodeDoubleClick]
    );

    useLayoutEffect(() => {
      // the resize observer calls an updateNodeDimensions initially.
      // We don't need to force another dimension update if it hasn't happened yet
      if (nodeElement.current && !isHidden && observerInitialized.current) {
        updateNodeDimensions([{ id, nodeElement: nodeElement.current, forceUpdate: true }]);
      }
    }, [id, isHidden, sourcePosition, targetPosition]);

    useEffect(() => {
      if (nodeElement.current) {
        observerInitialized.current = true;
        const currNode = nodeElement.current;
        resizeObserver?.observe(currNode);

        return () => resizeObserver?.unobserve(currNode);
      }
    }, []);

    if (isHidden) {
      return null;
    }

    const nodeClasses = cc([
      'react-flow__node',
      `react-flow__node-${type}`,
      className,
      {
        selected,
        selectable: isSelectable,
      },
    ]);

    const calculateZIndexes = (mostRecentlyTouchedSceneIds: string[] | undefined): number => {
      if (mostRecentlyTouchedSceneIds) {
        const firstNodeSceneId = mostRecentlyTouchedSceneIds[0];
        console.log({ firstNodeSceneId})
        console.log({ nodeIdddddddddddd: id })
        const relevantSceneNodeId = nodes.find(n => n.id === id)?.parentId;
        console.log({ relevantSceneNodeId})
        const isEdgeAtForefront = firstNodeSceneId === relevantSceneNodeId;
        const isSceneAndFirstNodeSceneId = type === "scene" && firstNodeSceneId === id;
        console.log({ isEdgeAtForefront })
        const relevantSceneIdIndex = mostRecentlyTouchedSceneIds.findIndex(sceneId => relevantSceneNodeId === sceneId);
        console.log({ relevantSceneIdIndex })
        const translateSceneIdIndexToZIndex = (ary: string[], idx: number) => ary.length - idx;
        console.log({ translateSceneIdIndexToZIndex })
        const sceneZIndex = (isEdgeAtForefront || isSceneAndFirstNodeSceneId ? 20 : 10) + translateSceneIdIndexToZIndex(mostRecentlyTouchedSceneIds, relevantSceneIdIndex); // nestLevel should be 1
        //const sceneZIndex = translateSceneIdIndexToZIndex(mostRecentlyTouchedSceneIds, relevantSceneIdIndex) * 10; // nestLevel should be 1

        console.log({ sceneZIndex})
        return sceneZIndex - 5; // make sure it's behind the edge
      }
      
      return 3;
    }

    return (
      <DraggableCore
        onStart={onDragStart}
        onDrag={onDrag}
        onStop={onDragStop}
        scale={scale}
        disabled={!isDraggable}
        cancel=".nodrag"
        nodeRef={nodeElement}
        grid={grid}
        enableUserSelectHack={false}
      >
        <div
          className={nodeClasses}
          ref={nodeElement}
          style={{...nodeStyle, zIndex: calculateZIndexes(mostRecentlyTouchedSceneIds)}}
          onMouseEnter={onMouseEnterHandler}
          onMouseMove={onMouseMoveHandler}
          onMouseLeave={onMouseLeaveHandler}
          onContextMenu={onContextMenuHandler}
          onClick={onSelectNodeHandler}
          onDoubleClick={onNodeDoubleClickHandler}
          data-id={id}
        >
          <Provider value={id}>
            <NodeComponent
              id={id}
              data={data}
              type={type}
              xPos={xPos}
              yPos={yPos}
              selected={selected}
              isConnectable={isConnectable}
              sourcePosition={sourcePosition}
              targetPosition={targetPosition}
              isDragging={isDragging}
            >
              {children}
            </NodeComponent>
          </Provider>
        </div>
      </DraggableCore>
    );
  };

  NodeWrapper.displayName = 'NodeWrapper';

  return memo(NodeWrapper);
};
