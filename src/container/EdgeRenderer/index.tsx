import React, { memo, CSSProperties, useCallback, useMemo } from 'react';

import { useStoreState } from '../../store/hooks';
import ConnectionLine from '../../components/ConnectionLine/index';
import { isEdge } from '../../utils/graph';
import MarkerDefinitions from './MarkerDefinitions';
import { getEdgeOffsets, getEdgePositions, getHandle, isEdgeVisible, getSourceTargetNodes } from './utils';
import {
  Position,
  Edge,
  Node,
  Elements,
  Connection,
  ConnectionLineType,
  ConnectionLineComponent,
  ConnectionMode,
  Transform,
  OnEdgeUpdateFunc,
} from '../../types';

export interface EdgeRendererProps {
  edgeTypes: any;
  connectionLineType: ConnectionLineType;
  connectionLineStyle?: CSSProperties;
  connectionLineComponent?: ConnectionLineComponent;
  connectionMode?: ConnectionMode;
  onElementClick?: (event: React.MouseEvent, element: Node | Edge) => void;
  onEdgeDoubleClick?: (event: React.MouseEvent, edge: Edge) => void;
  arrowHeadColor: string;
  markerEndId?: string;
  onlyRenderVisibleElements: boolean;
  onEdgeUpdate?: OnEdgeUpdateFunc;
  onEdgeContextMenu?: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeMouseEnter?: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeMouseMove?: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeMouseLeave?: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeUpdateStart?: (event: React.MouseEvent, edge: Edge) => void;
  edgeUpdaterRadius?: number;
  mostRecentlyTouchedSceneIds?: string[];
}

interface EdgeWrapperProps {
  edge: Edge;
  props: EdgeRendererProps;
  nodes: Node[];
  selectedElements: Elements | null;
  elementsSelectable: boolean;
  transform: Transform;
  width: number;
  height: number;
  onlyRenderVisibleElements: boolean;
  connectionMode?: ConnectionMode;
}

const Edge = ({
  edge,
  props,
  nodes,
  selectedElements,
  elementsSelectable,
  transform,
  width,
  height,
  onlyRenderVisibleElements,
  connectionMode,
}: EdgeWrapperProps) => {
  const sourceHandleId = edge.sourceHandle || null;
  const targetHandleId = edge.targetHandle || null;
  const { sourceNode, targetNode } = getSourceTargetNodes(edge, nodes);

  const onConnectEdge = useCallback(
    (connection: Connection) => {
      props.onEdgeUpdate?.(edge, connection);
    },
    [edge]
  );

  if (!sourceNode) {
    console.warn(`couldn't create edge for source id: ${edge.source}; edge id: ${edge.id}`);
    return null;
  }

  if (!targetNode) {
    console.warn(`couldn't create edge for target id: ${edge.target}; edge id: ${edge.id}`);
    return null;
  }

  // source and target node need to be initialized
  if (!sourceNode.__rf.width || !targetNode.__rf.width) {
    return null;
  }

  const edgeType = edge.type || 'default';
  const EdgeComponent = props.edgeTypes[edgeType] || props.edgeTypes.default;
  const targetNodeBounds = targetNode.__rf.handleBounds;
  // when connection type is loose we can define all handles as sources
  const targetNodeHandles =
    connectionMode === ConnectionMode.Strict
      ? targetNodeBounds.target
      : targetNodeBounds.target || targetNodeBounds.source;
  const sourceHandle = getHandle(sourceNode.__rf.handleBounds.source, sourceHandleId);
  const targetHandle = getHandle(targetNodeHandles, targetHandleId);
  const sourcePosition = sourceHandle ? sourceHandle.position : Position.Bottom;
  const targetPosition = targetHandle ? targetHandle.position : Position.Top;

  if (!sourceHandle) {
    console.warn(`couldn't create edge for source handle id: ${sourceHandleId}; edge id: ${edge.id}`);
    return null;
  }

  if (!targetHandle) {
    console.warn(`couldn't create edge for target handle id: ${targetHandleId}; edge id: ${edge.id}`);
    return null;
  }

  const { sourceX, sourceY, targetX, targetY } = getEdgePositions(
    sourceNode,
    sourceHandle,
    sourcePosition,
    targetNode,
    targetHandle,
    targetPosition
  );

  const [sourceEdgeOffsetX, sourceEdgeOffsetY] = useMemo(() => getEdgeOffsets(nodes, edge.source), [
    nodes,
    edge.source,
  ]);

  const [targetEdgeOffsetX, targetEdgeOffsetY] = useMemo(() => getEdgeOffsets(nodes, edge.target), [
    nodes,
    edge.target,
  ]);

  const isVisible = onlyRenderVisibleElements
    ? isEdgeVisible({
        sourcePos: { x: sourceX, y: sourceY },
        targetPos: { x: targetX, y: targetY },
        width,
        height,
        transform,
      })
    : true;

  if (!isVisible) {
    return null;
  }

  const isSelected = selectedElements?.some((elm) => isEdge(elm) && elm.id === edge.id) || false;

  return (
    <EdgeComponent
      key={edge.id}
      id={edge.id}
      className={edge.className}
      type={edge.type}
      data={edge.data}
      onClick={props.onElementClick}
      selected={isSelected}
      animated={edge.animated}
      label={edge.label}
      labelStyle={edge.labelStyle}
      labelShowBg={edge.labelShowBg}
      labelBgStyle={edge.labelBgStyle}
      labelBgPadding={edge.labelBgPadding}
      labelBgBorderRadius={edge.labelBgBorderRadius}
      style={edge.style}
      arrowHeadType={edge.arrowHeadType}
      source={edge.source}
      target={edge.target}
      sourceHandleId={sourceHandleId}
      targetHandleId={targetHandleId}
      sourceX={sourceX + sourceEdgeOffsetX}
      sourceY={sourceY + sourceEdgeOffsetY}
      targetX={targetX + targetEdgeOffsetX}
      targetY={targetY + targetEdgeOffsetY}
      sourcePosition={sourcePosition}
      targetPosition={targetPosition}
      elementsSelectable={elementsSelectable}
      markerEndId={props.markerEndId}
      isHidden={edge.isHidden}
      onConnectEdge={onConnectEdge}
      handleEdgeUpdate={typeof props.onEdgeUpdate !== 'undefined'}
      onContextMenu={props.onEdgeContextMenu}
      onMouseEnter={props.onEdgeMouseEnter}
      onMouseMove={props.onEdgeMouseMove}
      onMouseLeave={props.onEdgeMouseLeave}
      edgeUpdaterRadius={props.edgeUpdaterRadius}
      onEdgeDoubleClick={props.onEdgeDoubleClick}
      onEdgeUpdateStart={props.onEdgeUpdateStart}
    />
  );
};

const BaseEdgeRenderer = (props: EdgeRendererProps) => {
  const transform = useStoreState((state) => state.transform);
  const nodes = useStoreState((state) => state.nodes);
  const edges = useStoreState((state) => state.edges);
  const connectionNodeId = useStoreState((state) => state.connectionNodeId);
  const connectionHandleId = useStoreState((state) => state.connectionHandleId);
  const connectionHandleType = useStoreState((state) => state.connectionHandleType);
  const connectionPosition = useStoreState((state) => state.connectionPosition);
  const selectedElements = useStoreState((state) => state.selectedElements);
  const nodesConnectable = useStoreState((state) => state.nodesConnectable);
  const elementsSelectable = useStoreState((state) => state.elementsSelectable);
  const width = useStoreState((state) => state.width);
  const height = useStoreState((state) => state.height);

  const [connectionSourceOffsetX, connectionSourceOffsetY] = useMemo(
    () => (connectionNodeId ? getEdgeOffsets(nodes, connectionNodeId) : [0, 0]),
    [nodes, connectionNodeId]
  );

  if (!width) {
    return null;
  }

  const {
    connectionLineType,
    arrowHeadColor,
    connectionLineStyle,
    connectionLineComponent,
    onlyRenderVisibleElements,
  } = props;

  const renderConnectionLine = connectionNodeId && connectionHandleType;

  /**
   * This is calculating z-index styles for an edge in increments of 10 (+ 5): 15, 25, 35, 45, etc.
   * The strategy is to find the highest possible z-index associated with this edge.
   * If you're drawing the edge, then it should have the highest z-index value of anything
   * in our node view.
   * For the edges that are connected to two nodes, use the z-index value of the most recently
   * touched scene node ID, since if an edge belongs to the most recently touched scene,
   * then we want to see those associated edges moved to the forefront as well.
   * In case `mostRecentlyTouchedSceneIds` is `undefined`, which we wouldn't expect to happen, just apply a
   * z-index that matches the default z-indexing defined in src/style.css
   */
  const calculateZIndexes = (
    mostRecentlyTouchedSceneIds: string[] | undefined,
    edgeTargetNodeId: string | null,
    edgeSourceNodeId: string | null,
    shouldRenderConnectionLine: boolean
  ): number => {
    // You are drawing an edge if you should render a connection line but the target or source node is still `null`
    const isDrawingEdge = shouldRenderConnectionLine && !(Boolean(edgeSourceNodeId) && Boolean(edgeTargetNodeId));
    if (isDrawingEdge) {
      return 10000000; // an arbitrarily high z-index while drawing
    }

    if (mostRecentlyTouchedSceneIds) {
      /**
       * Part 1:
       * First give a default z-index of 10 for every edge connected to a scene node that hasn't been touched
       */
      const baseZIndexForEdge = 10;

      /**
       * Part 2:
       * Get the scene ID index of interest, which is the most recently touched scene node ID connected to this edge.
       */
      const sceneIdIndex = (): number => {
        const parentIds = nodes
          .filter((n) => n.id === edgeTargetNodeId || n.id === edgeSourceNodeId)
          .map((n) => n?.parentId);

        const uniqueSceneIdsIndexedByMostRecentlyTouched = new Set(
          parentIds.map((parentId) => mostRecentlyTouchedSceneIds.findIndex((sceneId) => parentId === sceneId))
        );

        // If an edge touches an untouched and touched scene, we want the ID of the touched scence, because that will have
        // the highest z-index
        if (uniqueSceneIdsIndexedByMostRecentlyTouched.has(-1) && uniqueSceneIdsIndexedByMostRecentlyTouched.size > 1) {
          uniqueSceneIdsIndexedByMostRecentlyTouched.delete(-1);
        }

        return Math.min(...uniqueSceneIdsIndexedByMostRecentlyTouched);
      };
      // A lower `sceneIdIndex` means that that scene has been the more recently touched. So if we subtract that number from number of all
      // scene nodes that have been touched and multiply it by 10, we'll get edge z-indexes sequenced in increments of 10.
      // And give edges belonging to scene nodes that haven't been touched the lowest z-index (though we actually wouldn't expect this to happen).
      const translateSceneIdIndexToZIndex = (ary: string[], idx: number) => (idx === -1 ? 0 : (ary.length - idx) * 10);

      /**
       * Part 3:
       * Edges should have a higher z-index than scenes, so let's just give it the same z-index as nodes
       */
      const additionalZIndexForEdge = 5;

      const sceneZIndex =
        baseZIndexForEdge +
        translateSceneIdIndexToZIndex(mostRecentlyTouchedSceneIds, sceneIdIndex()) +
        additionalZIndexForEdge;

      return sceneZIndex;
    }

    // Default z-index found in src/style.css
    return 3;
  };

  return (
    <div>
      {renderConnectionLine && (
        <svg
          width={width}
          height={height}
          className="react-flow__edges"
          style={{
            zIndex: calculateZIndexes(
              props.mostRecentlyTouchedSceneIds,
              null,
              connectionNodeId,
              Boolean(renderConnectionLine)
            ),
          }}
        >
          <MarkerDefinitions color={arrowHeadColor} />
          <g>
            <ConnectionLine
              nodes={nodes}
              connectionNodeId={connectionNodeId!}
              connectionHandleId={connectionHandleId}
              connectionHandleType={connectionHandleType!}
              connectionPositionX={connectionPosition.x}
              connectionPositionY={connectionPosition.y}
              transform={transform}
              connectionLineStyle={connectionLineStyle}
              connectionLineType={connectionLineType}
              connectionSourceOffsetX={connectionSourceOffsetX}
              connectionSourceOffsetY={connectionSourceOffsetY}
              isConnectable={nodesConnectable}
              CustomConnectionLineComponent={connectionLineComponent}
            />
          </g>
        </svg>
      )}
      {edges.map((edge: Edge) => {
        return (
          <svg
            key={edge.id}
            width={width}
            height={height}
            className="react-flow__edges"
            style={{
              zIndex: calculateZIndexes(
                props.mostRecentlyTouchedSceneIds,
                edge.target,
                edge.source,
                Boolean(renderConnectionLine)
              ),
            }}
          >
            <MarkerDefinitions color={arrowHeadColor} />
            <g>
              <Edge
                edge={edge}
                props={props}
                nodes={nodes}
                selectedElements={selectedElements}
                elementsSelectable={elementsSelectable}
                transform={transform}
                width={width}
                height={height}
                onlyRenderVisibleElements={onlyRenderVisibleElements}
              />
            </g>
          </svg>
        );
      })}
    </div>
  );
};

BaseEdgeRenderer.displayName = 'EdgeRenderer';

export const EdgeRenderer = memo(BaseEdgeRenderer);
