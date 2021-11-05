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

interface EdgeRendererProps {
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
  onEdgeUpdateEnd?: (event: MouseEvent, edge: Edge) => void;
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
  sourceEdgeOffsets: EdgeOffsetDictionary;
  targetEdgeOffsets: EdgeOffsetDictionary;
}

type EdgeOffsetDictionary = Record<string, [number, number]>;

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
  sourceEdgeOffsets,
  targetEdgeOffsets
}: EdgeWrapperProps) => {
  const sourceHandleId = edge.sourceHandle || null;
  const targetHandleId = edge.targetHandle || null;
  const { sourceNode, targetNode } = getSourceTargetNodes(edge, nodes);

  const onConnectEdge = useCallback(
    (connection: Connection) => {
      props.onEdgeUpdate?.(edge, connection);
    },
    [edge, props.onEdgeUpdate]
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

  const [sourceEdgeOffsetX, sourceEdgeOffsetY] = sourceEdgeOffsets[edge.id];

  const [targetEdgeOffsetX, targetEdgeOffsetY] = targetEdgeOffsets[edge.id];

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
      onEdgeUpdateEnd={props.onEdgeUpdateEnd}
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

  const sourceEdgeOffsets = useMemo(() =>
    edges.reduce((acc, cur) => ({
      ...acc,
      [cur.id]: getEdgeOffsets(nodes, cur.source)
    }), {} as EdgeOffsetDictionary)
  , [nodes, edges]);

  const targetEdgeOffsets = useMemo(() =>
      edges.reduce((acc, cur) => ({
        ...acc,
        [cur.id]: getEdgeOffsets(nodes, cur.target)
      }), {} as EdgeOffsetDictionary)
  , [nodes, edges]);

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

  const transformStyle = `translate(${transform[0]},${transform[1]}) scale(${transform[2]})`;

  const renderConnectionLine = connectionNodeId && connectionHandleType;

  return (
    <svg width={width} height={height} className="react-flow__edges">
      <MarkerDefinitions color={arrowHeadColor} />
      <g transform={transformStyle}>
        {edges.map((edge: Edge) => (
          <Edge
            key={edge.id}
            edge={edge}
            props={props}
            nodes={nodes}
            selectedElements={selectedElements}
            elementsSelectable={elementsSelectable}
            transform={transform}
            width={width}
            height={height}
            onlyRenderVisibleElements={onlyRenderVisibleElements}
            sourceEdgeOffsets={sourceEdgeOffsets}
            targetEdgeOffsets={targetEdgeOffsets}
          />
        ))}
        {renderConnectionLine && (
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
        )}
      </g>
    </svg>
  );
};

BaseEdgeRenderer.displayName = 'EdgeRenderer';

export default memo(BaseEdgeRenderer);
