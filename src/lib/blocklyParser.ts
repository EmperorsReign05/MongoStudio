import * as Blockly from 'blockly/core';
import { QueryAST, PipelineStageAST, FilterAST, Condition, LogicalGroup } from '@/types/ast';

export function parseWorkspaceToAST(workspace: Blockly.WorkspaceSvg): QueryAST | null {
  const topBlocks = workspace.getTopBlocks(true);
  
  // Find db_root
  const dbRoot = topBlocks.find(b => b.type === 'db_root');
  if (!dbRoot) return null;

  // Next block connected to db_root should be a collection
  const collectionBlock = dbRoot.getNextBlock();
  if (!collectionBlock || collectionBlock.type !== 'collection') return null;

  const collectionName = collectionBlock.getFieldValue('COLLECTION_NAME');

  // Next block connected to collection should be a method (find)
  const methodBlock = collectionBlock.getNextBlock();
  if (!methodBlock || methodBlock.type !== 'method_find') return null;
  if (!methodBlock) return null;

  const ast: QueryAST = {
    operation: 'find',
    collection: collectionName,
    pipeline: []
  };

  // Find the filters inside the method block's statement input
  const filterBlock = methodBlock.getInputTargetBlock('FILTER');
  if (filterBlock) {
    const filters = parseFilterChain(filterBlock);
    
    // In our AST, multiple top-level filters in find() are implicitly $and.
    if (filters.length === 1) {
      ast.filter = filters[0];
    } else if (filters.length > 1) {
      ast.filter = {
        type: 'logical',
        operator: '$and',
        children: filters
      } as LogicalGroup;
    }
  }

  return ast;
}

function parseFilterChain(startBlock: Blockly.Block | null): FilterAST[] {
  const filters: FilterAST[] = [];
  let currentBlock = startBlock;

  while (currentBlock) {
    if (currentBlock.type === 'match_filter') {
      filters.push({
        type: 'condition',
        field: currentBlock.getFieldValue('FIELD'),
        operator: currentBlock.getFieldValue('OPERATOR') as any,
        value: parseValue(currentBlock.getFieldValue('VALUE'))
      } as Condition);
    } else if (currentBlock.type === 'logic_branch') {
      const childFilterBlock = currentBlock.getInputTargetBlock('CONDITIONS');
      const childFilters = parseFilterChain(childFilterBlock);
      
      if (childFilters.length > 0) {
        filters.push({
          type: 'logical',
          operator: currentBlock.getFieldValue('OPERATOR') as any,
          children: childFilters
        } as LogicalGroup);
      }
    }
    
    currentBlock = currentBlock.getNextBlock();
  }

  return filters;
}

function parseValue(value: string): any {
  if (value === undefined || value === null) return '';
  if (!isNaN(Number(value)) && value.trim() !== '') return Number(value);
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
}
