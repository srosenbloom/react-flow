import { ComponentType } from 'react';

import { BezierEdge, StepEdge, SmoothStepEdge, StraightEdge } from '../../components/Edges';
import wrapEdge from '../../components/Edges/wrapEdge';
import { rectToBox } from '../../utils/graph';

import {
  EdgeTypesType,
  EdgeProps,
  Position,
  Node,
  XYPosition,
  ElementId,
  HandleElement,
  Transform,
  Edge,
} from '../../types';

export function createEdgeTypes(edgeTypes: EdgeTypesType): EdgeTypesType {
  const standardTypes: EdgeTypesType = {
    default: wrapEdge((edgeTypes.default || BezierEdge) as ComponentType<EdgeProps>),
    straight: wrapEdge((edgeTypes.bezier || StraightEdge) as ComponentType<EdgeProps>),
    step: wrapEdge((edgeTypes.step || StepEdge) as ComponentType<EdgeProps>),
    smoothstep: wrapEdge((edgeTypes.step || SmoothStepEdge) as ComponentType<EdgeProps>),
  };

  const wrappedTypes = {} as EdgeTypesType;
  const specialTypes: EdgeTypesType = Object.keys(edgeTypes)
    .filter((k) => !['default', 'bezier'].includes(k))
    .reduce((res, key) => {
      res[key] = wrapEdge((edgeTypes[key] || BezierEdge) as ComponentType<EdgeProps>);

      return res;
    }, wrappedTypes);

  return {
    ...standardTypes,
    ...specialTypes,
  };
}

export function getHandlePosition(position: Position, node: Node, handle: any | null = null): XYPosition {
  const x = (handle?.x || 0) + node.__rf.position.x;
  const y = (handle?.y || 0) + node.__rf.position.y;
  const width = handle?.width || node.__rf.width;
  const height = handle?.height || node.__rf.height;

  switch (position) {
    case Position.Top:
      return {
        x: x + width / 2,
        y,
      };
    case Position.Right:
      return {
        x: x + width,
        y: y + height / 2,
      };
    case Position.Bottom:
      return {
        x: x + width / 2,
        y: y + height,
      };
    case Position.Left:
      return {
        x,
        y: y + height / 2,
      };
  }
}

export function getHandle(bounds: HandleElement[], handleId: ElementId | null): HandleElement | null {
  if (!bounds) {
    return null;
  }

  // there is no handleId when there are no multiple handles/ handles with ids
  // so we just pick the first one
  let handle = null;
  if (bounds.length === 1 || !handleId) {
    handle = bounds[0];
  } else if (handleId) {
    handle = bounds.find((d) => d.id === handleId);
  }

  return typeof handle === 'undefined' ? null : handle;
}

interface EdgePositions {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export const getEdgePositions = (
  sourceNode: Node,
  sourceHandle: HandleElement | unknown,
  sourcePosition: Position,
  targetNode: Node,
  targetHandle: HandleElement | unknown,
  targetPosition: Position
): EdgePositions => {
  const sourceHandlePos = getHandlePosition(sourcePosition, sourceNode, sourceHandle);
  const targetHandlePos = getHandlePosition(targetPosition, targetNode, targetHandle);

  return {
    sourceX: sourceHandlePos.x,
    sourceY: sourceHandlePos.y,
    targetX: targetHandlePos.x,
    targetY: targetHandlePos.y,
  };
};

export const getEdgeOffsets = (nodes: Node[], nodeId: string): [number, number] => {
  const node = nodes.find(n => n.id === nodeId);
  const parent = node && nodes.find(n => n.id === node.parentId);
  if (!parent || !node)
    return [0, 0];

  const sceneNode = document.querySelector(`[data-id="${node.parentId}"]`);
  const findElemPropertyValue = (elem: Element | null, property: string): null | string => {
    if (!elem) {
      return null;
    }
    return window.getComputedStyle(elem).getPropertyValue(property);
  }
  const sceneNodeHeight = findElemPropertyValue(sceneNode, 'height');
  
  /**
   * Find relevant parent element whose height is not
   * the entire scene node height
   */
  const findRelevantParentNode = (currNodeElem: Element | null): Element | null => {
    if (!currNodeElem) {
      return null;
    }

    const firstChildElem = currNodeElem.firstElementChild;
    const isHeightOfCurrentNodeElemSameAsParent = sceneNodeHeight === findElemPropertyValue(currNodeElem, 'height');

    if (isHeightOfCurrentNodeElemSameAsParent) {
      return findRelevantParentNode(firstChildElem);
    }

    return currNodeElem.parentElement;
  }

  const convertFromPxToNum = (pxNumString: string | null): number => {
    if (!pxNumString) {
      return 0;
    }

    const allButPx = pxNumString.slice(0, pxNumString.length - 2);
    return Number(allButPx);
  }

  /**
   * Find relevant parent node for calculating height of the scene container
   */
  const relevantParentNode = findRelevantParentNode(sceneNode);
  const parentNodePadding = convertFromPxToNum(findElemPropertyValue(relevantParentNode, 'padding'));
  const totalContainingHeight = relevantParentNode
    ? Array.from(relevantParentNode.children)
      .map(i => findElemPropertyValue(i, 'height'))
      .reduce((acc, j) => acc + convertFromPxToNum(j), 0) 
    : 0

  const xOffset = (parent.__rf.position.x ?? 0) + parentNodePadding;
  const yOffset = (parent.__rf.position.y ?? 0) + totalContainingHeight + parentNodePadding;

  const [parentXOffset, parentYOffset] = getEdgeOffsets(nodes, parent.id);

  return [xOffset + parentXOffset, yOffset + parentYOffset];
};

interface IsEdgeVisibleParams {
  sourcePos: XYPosition;
  targetPos: XYPosition;
  width: number;
  height: number;
  transform: Transform;
}

export function isEdgeVisible({ sourcePos, targetPos, width, height, transform }: IsEdgeVisibleParams): boolean {
  const edgeBox = {
    x: Math.min(sourcePos.x, targetPos.x),
    y: Math.min(sourcePos.y, targetPos.y),
    x2: Math.max(sourcePos.x, targetPos.x),
    y2: Math.max(sourcePos.y, targetPos.y),
  };

  if (edgeBox.x === edgeBox.x2) {
    edgeBox.x2 += 1;
  }

  if (edgeBox.y === edgeBox.y2) {
    edgeBox.y2 += 1;
  }

  const viewBox = rectToBox({
    x: (0 - transform[0]) / transform[2],
    y: (0 - transform[1]) / transform[2],
    width: width / transform[2],
    height: height / transform[2],
  });

  const xOverlap = Math.max(0, Math.min(viewBox.x2, edgeBox.x2) - Math.max(viewBox.x, edgeBox.x));
  const yOverlap = Math.max(0, Math.min(viewBox.y2, edgeBox.y2) - Math.max(viewBox.y, edgeBox.y));
  const overlappingArea = Math.ceil(xOverlap * yOverlap);

  return overlappingArea > 0;
}

type SourceTargetNode = {
  sourceNode: Node | null;
  targetNode: Node | null;
};

export const getSourceTargetNodes = (edge: Edge, nodes: Node[]): SourceTargetNode => {
  return nodes.reduce(
    (res, node) => {
      if (node.id === edge.source) {
        res.sourceNode = node;
      }
      if (node.id === edge.target) {
        res.targetNode = node;
      }
      return res;
    },
    { sourceNode: null, targetNode: null } as SourceTargetNode
  );
};
