import { Edge, Node } from '@xyflow/react';
import { QueryAST, PipelineStageAST, FilterAST, Condition, LogicalGroup } from '@/types/ast';

export function parseGraphToAST(nodes: Node[], edges: Edge[]): QueryAST | null {
  const dbNode = nodes.find(n => n.type === 'db');
  if (!dbNode) return null;

  const dbEdge = edges.find(e => e.source === dbNode.id);
  if (!dbEdge) return null;

  const collectionNode = nodes.find(n => n.id === dbEdge.target);
  if (!collectionNode || collectionNode.type !== 'collection') return null;

  const colEdge = edges.find(e => e.source === collectionNode.id);
  if (!colEdge) return null;

  const methodNode = nodes.find(n => n.id === colEdge.target);
  if (!methodNode || methodNode.type !== 'method') return null;

  const operation = methodNode.data.method as 'find' | 'aggregate';

  const ast: QueryAST = {
    operation,
    collection: collectionNode.data.collection as string,
  };

  const stages: PipelineStageAST[] = [];
  
  // Follow the main pipeline chain starting from the method node
  let currentNodeId = methodNode.id;
  let hasMoreNodes = true;

  while (hasMoreNodes) {
    // If we are at a logic node, it branches. We process its filter tree and then STOP the main pipeline.
    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (currentNode && currentNode.type === 'logic') {
       const logicFilter = parseFilterNode(currentNode.id, nodes, edges);
       if (logicFilter) {
         stages.push({ stage: '$match', filter: logicFilter });
       }
       break; // Pipeline stops here because logic nodes branch out to filters, not to pipeline stages
    }

    // Otherwise, find the next node in the linear chain
    const outgoingEdge = edges.find(e => e.source === currentNodeId);
    if (!outgoingEdge) {
      hasMoreNodes = false;
      break;
    }

    const nextNode = nodes.find(n => n.id === outgoingEdge.target);
    if (!nextNode) {
      hasMoreNodes = false;
      break;
    }

    if (nextNode.type === 'logic') {
      // Handled in next iteration
      currentNodeId = nextNode.id;
      continue;
    }

    if (nextNode.type === 'match') {
       const filter = parseFilterNode(nextNode.id, nodes, edges);
       if (filter) {
         stages.push({ stage: '$match', filter });
       }
    } else {
       const stage = parseNodeToStage(nextNode);
       if (stage) {
         stages.push(stage);
       }
    }

    currentNodeId = nextNode.id;
  }

  if (operation === 'aggregate') {
    ast.pipeline = stages;
  } else if (operation === 'find') {
    const matchStage = stages.find(s => s.stage === '$match') as { stage: '$match', filter: FilterAST } | undefined;
    if (matchStage) {
      ast.filter = matchStage.filter;
    }
    ast.pipeline = stages.filter(s => s.stage !== '$match');
  }

  return ast;
}

function parseFilterNode(nodeId: string, nodes: Node[], edges: Edge[]): FilterAST | null {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return null;

  if (node.type === 'match') {
    const data = node.data;
    if (!data.field) return null;
    
    return {
      type: 'condition',
      field: data.field as string,
      operator: data.operator as any || '$eq',
      value: parseValue(data.value as string)
    } as Condition;
  }

  if (node.type === 'logic') {
    const data = node.data;
    const childEdges = edges.filter(e => e.source === nodeId);
    const children: (Condition | LogicalGroup)[] = [];

    for (const edge of childEdges) {
      const childFilter = parseFilterNode(edge.target, nodes, edges);
      if (childFilter) {
        children.push(childFilter as (Condition | LogicalGroup));
      }
    }

    if (children.length === 0) return null;

    return {
      type: 'logical',
      operator: data.operator as any || '$or',
      children
    } as LogicalGroup;
  }

  return null;
}

function parseNodeToStage(node: Node): PipelineStageAST | null {
  switch (node.type) {
    case 'sort': {
      const data = node.data;
      if (!data.sortField) return null;
      return {
        stage: '$sort',
        sorts: [{ field: data.sortField as string, direction: data.sortDirection as 1 | -1 }]
      };
    }
    case 'limit': {
      const data = node.data;
      return {
        stage: '$limit',
        limit: data.limit as number || 10
      };
    }
    default:
      return null;
  }
}

function parseValue(value: string): any {
  if (value === undefined || value === null) return '';
  if (!isNaN(Number(value)) && value.trim() !== '') return Number(value);
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
}
