import React, { memo, useMemo, ComponentType, MouseEvent, CSSProperties } from 'react';

import { getNodesInside } from '../../utils/graph';
import { useStoreState, useStoreActions } from '../../store/hooks';
import { Node, NodeTypesType, WrapNodeProps, Edge,
  ConnectionLineType,
  ConnectionLineComponent,
  ConnectionMode,
  OnEdgeUpdateFunc
 } from '../../types';
import EdgeRenderer from '../EdgeRenderer/index';

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

interface NodeRendererProps {
  nodeTypes: NodeTypesType;
  selectNodesOnDrag: boolean;
  onElementClick?: (event: MouseEvent, element: Node | Edge) => void;
  onNodeDoubleClick?: (event: MouseEvent, element: Node) => void;
  onNodeMouseEnter?: (event: MouseEvent, node: Node) => void;
  onNodeMouseMove?: (event: MouseEvent, node: Node) => void;
  onNodeMouseLeave?: (event: MouseEvent, node: Node) => void;
  onNodeContextMenu?: (event: MouseEvent, node: Node) => void;
  onNodeDragStart?: (event: MouseEvent, node: Node) => void;
  onNodeDrag?: (event: MouseEvent, node: Node) => void;
  onNodeDragStop?: (event: MouseEvent, node: Node) => void;
  snapToGrid: boolean;
  snapGrid: [number, number];
  onlyRenderVisibleElements: boolean;
  mostRecentlyTouchedSceneIds?: string[];
  edgeProps: EdgeRendererProps;
}

const NodeRenderer = (props: NodeRendererProps) => {
  const transform = useStoreState((state) => state.transform);
  const selectedElements = useStoreState((state) => state.selectedElements);
  const nodesDraggable = useStoreState((state) => state.nodesDraggable);
  const nodesConnectable = useStoreState((state) => state.nodesConnectable);
  const elementsSelectable = useStoreState((state) => state.elementsSelectable);
  const width = useStoreState((state) => state.width);
  const height = useStoreState((state) => state.height);
  const nodes = useStoreState((state) => state.nodes);
  const updateNodeDimensions = useStoreActions((actions) => actions.updateNodeDimensions);
  const transformStyle = useMemo(
    () => ({
      transform: `translate(${transform[0]}px,${transform[1]}px) scale(${transform[2]})`,
    }),
    [transform[0], transform[1], transform[2]]
  );

  const visibleNodes = props.onlyRenderVisibleElements
    ? getNodesInside(nodes, { x: 0, y: 0, width, height }, transform, true)
    : nodes;

  const resizeObserver = useMemo(() => {
    if (typeof ResizeObserver === 'undefined') {
      return null;
    }

    return new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const updates = entries.map((entry: ResizeObserverEntry) => ({
        id: entry.target.getAttribute('data-id') as string,
        nodeElement: entry.target as HTMLDivElement,
      }));

      updateNodeDimensions(updates);
    });
  }, []);

  const renderNode = (node: Node, nestLevel = 0) => {
    const nodeType = node.type || 'default';
    const NodeComponent = (props.nodeTypes[nodeType] || props.nodeTypes.default) as ComponentType<WrapNodeProps>;

    if (!props.nodeTypes[nodeType]) {
      console.warn(`Node type "${nodeType}" not found. Using fallback type "default".`);
    }

    const isDraggable = node.draggable || (nodesDraggable && typeof node.draggable === 'undefined');
    const isSelectable = node.selectable || (elementsSelectable && typeof node.selectable === 'undefined');
    const isConnectable = node.connectable || (nodesConnectable && typeof node.connectable === 'undefined');

    const children = visibleNodes.filter(n => n.parentId === node.id);

    return (
      
      <NodeComponent
        key={node.id}
        id={node.id}
        className={node.className}
        style={node.style}
        type={nodeType}
        data={node.data}
        sourcePosition={node.sourcePosition}
        targetPosition={node.targetPosition}
        isHidden={node.isHidden}
        xPos={node.__rf.position.x}
        yPos={node.__rf.position.y}
        isDragging={node.__rf.isDragging}
        isInitialized={node.__rf.width !== null && node.__rf.height !== null}
        snapGrid={props.snapGrid}
        snapToGrid={props.snapToGrid}
        selectNodesOnDrag={props.selectNodesOnDrag}
        onClick={props.onElementClick}
        onMouseEnter={props.onNodeMouseEnter}
        onMouseMove={props.onNodeMouseMove}
        onMouseLeave={props.onNodeMouseLeave}
        onContextMenu={props.onNodeContextMenu}
        onNodeDoubleClick={props.onNodeDoubleClick}
        onNodeDragStart={props.onNodeDragStart}
        onNodeDrag={props.onNodeDrag}
        onNodeDragStop={props.onNodeDragStop}
        scale={transform[2]}
        selected={selectedElements?.some(({ id }) => id === node.id) || false}
        isDraggable={isDraggable}
        isSelectable={isSelectable}
        isConnectable={isConnectable}
        resizeObserver={resizeObserver}
        nestLevel={nestLevel}
        mostRecentlyTouchedSceneIds={props.mostRecentlyTouchedSceneIds}
      >
        <div style={{ position: 'relative' }}>
          {children.map(child => renderNode(child, nestLevel + 1))}
        </div>
      </NodeComponent>
    );
  };

  // const other = {...transformStyle, zIndex: 3, transformOrigin: "0 0", position: 'absolute'}


  return (
    <div className="react-flow__nodes" style={transformStyle}>   
      {visibleNodes.filter(node => !node.parentId).map(node => renderNode(node, 0))}
      <EdgeRenderer
        edgeTypes={props.edgeProps.edgeTypes}
        onElementClick={props.edgeProps.onElementClick}
        onEdgeDoubleClick={props.edgeProps.onEdgeDoubleClick}
        connectionLineType={props.edgeProps.connectionLineType}
        connectionLineStyle={props.edgeProps.connectionLineStyle}
        connectionLineComponent={props.edgeProps.connectionLineComponent}
        connectionMode={props.edgeProps.connectionMode}
        arrowHeadColor={props.edgeProps.arrowHeadColor}
        markerEndId={props.edgeProps.markerEndId}
        onEdgeUpdate={props.edgeProps.onEdgeUpdate}
        onlyRenderVisibleElements={props.edgeProps.onlyRenderVisibleElements}
        onEdgeContextMenu={props.edgeProps.onEdgeContextMenu}
        onEdgeMouseEnter={props.edgeProps.onEdgeMouseEnter}
        onEdgeMouseMove={props.edgeProps.onEdgeMouseMove}
        onEdgeMouseLeave={props.edgeProps.onEdgeMouseLeave}
        onEdgeUpdateStart={props.edgeProps.onEdgeUpdateStart}
        edgeUpdaterRadius={props.edgeProps.edgeUpdaterRadius}
        mostRecentlyTouchedSceneIds={props.edgeProps.mostRecentlyTouchedSceneIds}
      />
    </div>
  );
};

NodeRenderer.displayName = 'NodeRenderer';

export default memo(NodeRenderer);
