import { Edge, Node } from '@xyflow/react';
import { QueryAST, PipelineStageAST, FilterAST, Condition } from '@/types/ast';

export function parseGraphToAST(nodes: Node[], edges: Edge[]): QueryAST | null {
  // 1. Find the DB node (the absolute root)
  const dbNode = nodes.find(n => n.type === 'db');
  
  if (!dbNode) {
    return null; // A query must start with db
  }

  // 2. Find the connected Collection node
  const dbEdge = edges.find(e => e.source === dbNode.id);
  if (!dbEdge) return null;

  const collectionNode = nodes.find(n => n.id === dbEdge.target);
  if (!collectionNode || collectionNode.type !== 'collection') return null;

  // 3. Find the connected Method node
  const colEdge = edges.find(e => e.source === collectionNode.id);
  if (!colEdge) return null;

  const methodNode = nodes.find(n => n.id === colEdge.target);
  if (!methodNode || methodNode.type !== 'method') return null;

  const operation = methodNode.data.method as 'find' | 'aggregate';

  const ast: QueryAST = {
    operation,
    collection: collectionNode.data.collection as string,
  };

  // 4. Parse the arguments/pipeline stages attached to the method
  const stages: PipelineStageAST[] = [];
  let currentNodeId = methodNode.id;
  let hasMoreNodes = true;

  while (hasMoreNodes) {
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

    const stage = parseNodeToStage(nextNode);
    if (stage) {
      stages.push(stage);
    }

    currentNodeId = nextNode.id;
  }

  if (operation === 'aggregate') {
    ast.pipeline = stages;
  } else if (operation === 'find') {
    // For find(), we treat the first $match stage as the filter, 
    // and subsequent $sort/$limit as cursor modifiers.
    // This isn't perfect Mongoose translation, but the AST captures it well.
    // The code generator in Phase 3 will handle turning this AST into `find(filter).sort(..)`
    const matchStage = stages.find(s => s.stage === '$match') as { stage: '$match', filter: FilterAST } | undefined;
    if (matchStage) {
      ast.filter = matchStage.filter;
    }
    // We pass the rest of the stages in pipeline anyway, so the code generator can extract sort/limit modifiers
    ast.pipeline = stages.filter(s => s.stage !== '$match');
  }

  return ast;
}

function parseNodeToStage(node: Node): PipelineStageAST | null {
  switch (node.type) {
    case 'match': {
      const data = node.data;
      if (!data.field) return null; 
      
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

function parseValue(value: string): any {
  if (value === undefined || value === null) return '';
  
  if (!isNaN(Number(value)) && value.trim() !== '') {
    return Number(value);
  }
  
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;

  return value;
}
