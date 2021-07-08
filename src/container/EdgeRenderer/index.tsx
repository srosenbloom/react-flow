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
  connectionMode
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

  const [sourceEdgeOffsetX, sourceEdgeOffsetY] = useMemo(() =>
          getEdgeOffsets(nodes, edge.source)
  , [nodes, edge.source]);

  const [targetEdgeOffsetX, targetEdgeOffsetY] = useMemo(() =>
          getEdgeOffsets(nodes, edge.target)
  , [nodes, edge.target]);

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

  console.log({ edgeStyle: edge.style })

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

const EdgeRenderer = (props: EdgeRendererProps) => {
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

  console.log({ mostrecentlysomethingggg: props.mostRecentlyTouchedSceneIds })

  const [connectionSourceOffsetX, connectionSourceOffsetY] = useMemo(() =>
      connectionNodeId ? getEdgeOffsets(nodes, connectionNodeId) : [0, 0]
  , [nodes, connectionNodeId]);

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
  // const transformStyle = `translate(${transform[0]},${transform[1]}) scale(${transform[2]})`;
  const renderConnectionLine = connectionNodeId && connectionHandleType;
  //console.log({ state })
  //const isParentedSceneSelected =
  //const zIndex = (selected ? 10 : 3) + (10 * nestLevel)

  // const sceneIdsPerEdgeConnection = (edgeTargetNodeId: string, edgeSourceNodeId: string): string[] => {
  //   const edgeNodes = nodes.filter(n => n.id === edgeTargetNodeId || n.id === edgeSourceNodeId)

  //   let sceneIds = new Set() as Set<string>
  //   for (const node of edgeNodes) {
  //     if (node.parentId) {
  //       sceneIds.add(node.parentId)
  //     }
  //   }
  //   return Array.from(sceneIds)
  // }
  const calculateZIndexes = (mostRecentlyTouchedSceneIds: string[] | undefined, edgeTargetNodeId: string | null, edgeSourceNodeId: string | null, renderConnectionLine: boolean): number => {
    if (renderConnectionLine && !(Boolean(edgeSourceNodeId) && Boolean(edgeTargetNodeId))) {
      return 10000000;
    }
    console.log({ mostRecentlyTouchedSceneIds, edgeSourceNodeId, edgeTargetNodeId})
    if (mostRecentlyTouchedSceneIds) {

      const parentIds = nodes.filter(n => n.id === edgeTargetNodeId || n.id === edgeSourceNodeId).map(n => n?.parentId)
      // const relevantSceneNodeId = parentId || id; // if cannot find node parent, that means it's a scene, and this is the scene id;
      //const isEdgeAtForefront = firstNodeSceneId === relevantSceneNodeId;
      //const isSceneAndFirstNodeSceneId = type === "scene" && firstNodeSceneId === id;
      const aryForMathMin = new Set(parentIds.map(parentId => mostRecentlyTouchedSceneIds.findIndex(sceneId => parentId === sceneId)));
      // I
      const relevantSceneIdIndex = () => {
        if (aryForMathMin.has(-1) && aryForMathMin.size > 1) {
          aryForMathMin.delete(-1);
        } 
        
        return Math.min(...aryForMathMin)
      };
      // const relevantSceneIdIndex = Math.min(...parentIds.map(parentId => mostRecentlyTouchedSceneIds.findIndex(sceneId => parentId === sceneId)));
      const translateSceneIdIndexToZIndex = (ary: string[], idx: number) => idx === -1 ? 0 : ary.length - idx;
      //const sceneZIndex = (isEdgeAtForefront || isSceneAndFirstNodeSceneId ? 20 : 10) + translateSceneIdIndexToZIndex(mostRecentlyTouchedSceneIds, relevantSceneIdIndex); // nestLevel should be 1
      const sceneZIndex = (10 + translateSceneIdIndexToZIndex(mostRecentlyTouchedSceneIds, relevantSceneIdIndex()) * 10) + 5; // add +5 for nodes sitting on top of scenes
      console.log("THIS IS INSIDE EDGE RENDERER")
      console.log({ parentIds, relevantSceneIdIndex, sceneZIndex })
      return sceneZIndex;


      /** old 
      const firstNodeSceneId = mostRecentlyTouchedSceneIds[0];
      const isEdgeAtForefront = sceneIdsPerEdgeConnection(edgeTargetNodeId, edgeSourceNodeId).includes(firstNodeSceneId);
      const highestSceneIdPartOfEdge = sceneIdsPerEdgeConnection(edgeTargetNodeId, edgeSourceNodeId)[0];
      const relevantSceneIdIndex = mostRecentlyTouchedSceneIds.findIndex(sceneId => sceneId === highestSceneIdPartOfEdge);
      const translateSceneIdIndexToZIndex = (ary: string[], idx: number) => ary.length - idx;
      const sceneZIndex = (isEdgeAtForefront ? 20 : 10) + translateSceneIdIndexToZIndex(mostRecentlyTouchedSceneIds, relevantSceneIdIndex); // nestLevel should be 1

      return sceneZIndex;
      */
    }
    
    return 3;
  }

  return (
    <div>
      {renderConnectionLine && <svg width={width} height={height} className="react-flow__edges" style={{ zIndex: calculateZIndexes(props.mostRecentlyTouchedSceneIds, null, connectionNodeId, Boolean(renderConnectionLine)) }}>
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
        </svg>}
      {edges.map((edge: Edge) => {
        console.log({ iAmEdge: edge, edge, edgeProps: props });
        return (
          <svg key={edge.id} width={width} height={height} className="react-flow__edges" style={{ zIndex: calculateZIndexes(props.mostRecentlyTouchedSceneIds, edge.target, edge.source, Boolean(renderConnectionLine)) }}>
            <MarkerDefinitions color={arrowHeadColor} />
            <g>
              <Edge
                key={`edge-${edge.id}`}
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

EdgeRenderer.displayName = 'EdgeRenderer';

export default memo(EdgeRenderer);
