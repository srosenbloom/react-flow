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
    children,
    dragHandle,
    mostRecentlyTouchedSceneIds,
  }: React.PropsWithChildren<WrapNodeProps>) => {
    const updateNodeDimensions = useStoreActions((actions) => actions.updateNodeDimensions);
    const addSelectedElements = useStoreActions((actions) => actions.addSelectedElements);
    const updateNodePosDiff = useStoreActions((actions) => actions.updateNodePosDiff);
    const unsetNodesSelection = useStoreActions((actions) => actions.unsetNodesSelection);
    const nodes = useStoreState((state) => state.nodes);

    const nodeElement = useRef<HTMLDivElement>(null);

    const node = useMemo(() => ({ id, type, position: { x: xPos, y: yPos }, data }), [id, type, xPos, yPos, data]);
    const grid = useMemo(() => (snapToGrid ? snapGrid : [1, 1])! as [number, number], [snapToGrid, snapGrid]);

    /**
     * TODO: Ideally this would be using a nested level to determine a z-index, for cases
     * where there may be more than 2 levels of nodes (not part of the product spec yet but
     * could be in the future).
     * 
     * This is calculating z-index styles for overlay nodes and scene nodes.
     * This is calculating scene node z-indexes in increments of 10: 10, 20, 30, 40, etc.
     * Overlay node z-indexes use their parent's scene node z-index, but add an additional 5 because
     * we want overlay nodes to sit on top of scene nodes: 15, 25, 35, 45, etc.
     * All scene and overlay nodes that haven't been touched will have z-indexes of 10 and 15, respectively.
     * In case `mostRecentlyTouchedSceneIds` is `undefined`, which we wouldn't expect to happen, just apply a
     * z-index that matches the default z-indexing defined in src/style.css
     */
    const calculateZIndexes = (mostRecentlyTouchedSceneIds: string[] | undefined): number => {
      if (mostRecentlyTouchedSceneIds) {
        const parentId = nodes.find((n) => n.id === id)?.parentId;
        const sceneNodeId = parentId ?? id;
        const sceneIdIndex = mostRecentlyTouchedSceneIds.findIndex((sceneId) => sceneNodeId === sceneId);

        /**
         * Part 1:
         * First give a default z-index of 10 for every overlay node or scene node that hasn't been touched
         */
        const baseZIndexForNode = 10;

        /**
         * Part 2:
         * 1. If a scene hasn't been touched yet, it won't appear in `mostRecentlyTouchedSceneIds`, so give these nodes and scene nodes the lowest z-index
         * 2. Otherwise, a lower `sceneIdIndex` means that that scene has been the more recently touched. So if we subtract that number from number of all
         * scene nodes that have been touched and multiply it by 10, we'll get scene z-indexes sequenced in increments of 10.
         */
        const translateSceneIdIndexToZIndex = (ary: string[], idx: number) =>
          idx === -1 ? 0 : (ary.length - idx) * 10;

        /**
         * Part 3:
         * We want overlay nodes to sit on top of scene nodes, so add an additional 5 to overlay nodes
         */
        const additionalZIndexForOverlayNodes = parentId ? 5 : 0;

        const sceneZIndex =
          baseZIndexForNode +
          translateSceneIdIndexToZIndex(mostRecentlyTouchedSceneIds, sceneIdIndex) +
          additionalZIndexForOverlayNodes;

        return sceneZIndex;
      }

      // Default z-index for nodes and edges defined in src/style.css
      return 3;
    };

    const calculatedZIndexValue = useMemo(() => calculateZIndexes(mostRecentlyTouchedSceneIds), [
      mostRecentlyTouchedSceneIds,
    ]);

    const nodeStyle: CSSProperties = useMemo(
      () => ({
        zIndex: calculatedZIndexValue,
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
        calculatedZIndexValue,
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
      if (nodeElement.current && !isHidden) {
        updateNodeDimensions([{ id, nodeElement: nodeElement.current, forceUpdate: true }]);
      }
    }, [id, isHidden, sourcePosition, targetPosition]);

    useEffect(() => {
      if (nodeElement.current) {
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
        handle={dragHandle}
      >
        <div
          className={nodeClasses}
          ref={nodeElement}
          style={nodeStyle}
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
              dragHandle={dragHandle}
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
