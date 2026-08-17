import { Edge, Node } from '@xyflow/react';
import { QueryAST, PipelineStageAST, FilterAST, Condition } from '@/types/ast';

export function parseGraphToAST(nodes: Node[], edges: Edge[]): QueryAST | null {
  // 1. Find the collection node (the source)
  const collectionNode = nodes.find(n => n.type === 'collection');
  
  if (!collectionNode) {
    return null; // A query must start with a collection
  }

  const ast: QueryAST = {
    operation: 'aggregate', // Default to aggregate for simplicity of pipelines
    collection: collectionNode.data.collection as string,
    pipeline: []
  };

  // 2. Traverse the graph starting from the collection node
  let currentNodeId = collectionNode.id;
  let hasMoreNodes = true;

  while (hasMoreNodes) {
    // Find the edge that goes OUT of the current node
    const outgoingEdge = edges.find(e => e.source === currentNodeId);
    
    if (!outgoingEdge) {
      hasMoreNodes = false;
      break;
    }

    // Find the next node
    const nextNode = nodes.find(n => n.id === outgoingEdge.target);
    
    if (!nextNode) {
      hasMoreNodes = false;
      break;
    }

    // Convert the next node to a pipeline stage
    const stage = parseNodeToStage(nextNode);
    if (stage) {
      ast.pipeline!.push(stage);
    }

    // Move to the next node
    currentNodeId = nextNode.id;
  }

  return ast;
}

function parseNodeToStage(node: Node): PipelineStageAST | null {
  switch (node.type) {
    case 'match': {
      const data = node.data;
      if (!data.field) return null; // Skip empty match
      
      const condition: Condition = {
        type: 'condition',
        field: data.field as string,
        operator: data.operator as any || '$eq',
        value: parseValue(data.value as string)
      };

      return {
        stage: '$match',
        filter: condition
      };
    }
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

// Helper to convert string values to correct types
function parseValue(value: string): any {
  if (value === undefined || value === null) return '';
  
  // Try parsing as number
  if (!isNaN(Number(value)) && value.trim() !== '') {
    return Number(value);
  }
  
  // Try parsing boolean
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;

  // Otherwise it's a string
  return value;
}
