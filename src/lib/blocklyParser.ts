import * as Blockly from 'blockly/core';
import {
  type Accumulator,
  type CollectionName,
  type Condition,
  type FilterAST,
  type LogicalGroup,
  type MongoValue,
  type PipelineStageAST,
  type QueryAST,
  type UpdateOperation,
} from '@/types/ast';

export function parseWorkspaceToAST(workspace: Blockly.WorkspaceSvg): QueryAST | null {
  const root = workspace.getTopBlocks(true).find((block) => block.type === 'db_root');
  const collection = root?.getNextBlock();
  const method = collection?.getNextBlock();
  if (!root || collection?.type !== 'collection' || !method?.type.startsWith('method_')) return null;

  const collectionName = collection.getFieldValue('COLLECTION_NAME') as CollectionName;
  const operationMap: Record<string, QueryAST['operation']> = {
    method_find: 'find',
    method_aggregate: 'aggregate',
    method_insert: 'insertOne',
    method_update: 'updateMany',
    method_delete: 'deleteMany',
  };
  const operation = operationMap[method.type];
  if (!operation) return null;

  const ast: QueryAST = { version: 1, collection: collectionName, operation };
  if (operation === 'find' || operation === 'updateMany' || operation === 'deleteMany') ast.filter = makeRootFilter(parseFilterChain(method.getInputTargetBlock('FILTER')));
  if (operation === 'find') parseFindOptions(method.getInputTargetBlock('OPTIONS'), ast);
  if (operation === 'aggregate') ast.pipeline = parsePipeline(method.getInputTargetBlock('STAGES'));
  if (operation === 'insertOne') ast.document = parseDocument(method.getInputTargetBlock('FIELDS'));
  if (operation === 'updateMany') ast.updates = parseUpdates(method.getInputTargetBlock('UPDATES'));
  return ast;
}

function makeRootFilter(filters: FilterAST[]): FilterAST | undefined {
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return { type: 'logical', operator: '$and', children: filters };
}

function parseFilterChain(start: Blockly.Block | null): FilterAST[] {
  const filters: FilterAST[] = [];
  let block = start;
  while (block) {
    if (block.type === 'filter_condition') {
      filters.push({ type: 'condition', field: block.getFieldValue('FIELD').trim(), operator: block.getFieldValue('OPERATOR') as Condition['operator'], value: parseLiteral(block.getFieldValue('VALUE'), block.getFieldValue('OPERATOR')) });
    }
    if (block.type === 'filter_logic') {
      const children = parseFilterChain(block.getInputTargetBlock('CONDITIONS'));
      if (children.length) filters.push({ type: 'logical', operator: block.getFieldValue('OPERATOR') as LogicalGroup['operator'], children });
    }
    block = block.getNextBlock();
  }
  return filters;
}

function parseFindOptions(start: Blockly.Block | null, ast: QueryAST): void {
  let block = start;
  while (block) {
    const type = block.getFieldValue('TYPE');
    const field = block.getFieldValue('FIELD').trim();
    const direction = Number(block.getFieldValue('DIRECTION')) as 1 | -1;
    if (type === 'sort' && field) ast.sort = [...(ast.sort ?? []), { field, direction }];
    if (type === 'project' && field) ast.projection = [...(ast.projection ?? []), { field, include: direction === -1 ? 0 : 1 }];
    if (type === 'limit') ast.limit = asNumber(field, 10);
    if (type === 'skip') ast.skip = asNumber(field, 0);
    block = block.getNextBlock();
  }
}

function parsePipeline(start: Blockly.Block | null): PipelineStageAST[] {
  const pipeline: PipelineStageAST[] = [];
  let block = start;
  while (block) {
    if (block.type === 'stage_match') {
      const filter = makeRootFilter(parseFilterChain(block.getInputTargetBlock('FILTER')));
      if (filter) pipeline.push({ stage: '$match', filter });
    }
    if (block.type === 'stage_project') pipeline.push({ stage: '$project', fields: parseFieldList(block.getInputTargetBlock('FIELDS')) });
    if (block.type === 'stage_group') pipeline.push({ stage: '$group', idField: block.getFieldValue('ID_FIELD').trim(), accumulators: parseAccumulators(block.getInputTargetBlock('ACCUMULATORS')) });
    if (block.type === 'stage_sort') pipeline.push({ stage: '$sort', sorts: [{ field: block.getFieldValue('FIELD').trim(), direction: Number(block.getFieldValue('DIRECTION')) as 1 | -1 }] });
    if (block.type === 'stage_limit') pipeline.push({ stage: '$limit', limit: asNumber(block.getFieldValue('VALUE'), 10) });
    if (block.type === 'stage_skip') pipeline.push({ stage: '$skip', skip: asNumber(block.getFieldValue('VALUE'), 0) });
    if (block.type === 'stage_unwind') pipeline.push({ stage: '$unwind', path: block.getFieldValue('VALUE').trim() });
    if (block.type === 'stage_count') pipeline.push({ stage: '$count', field: block.getFieldValue('VALUE').trim() });
    if (block.type === 'stage_add_fields') pipeline.push({ stage: '$addFields', fields: [{ field: block.getFieldValue('FIELD').trim(), expression: block.getFieldValue('VALUE') }] });
    block = block.getNextBlock();
  }
  return pipeline;
}

function parseFieldList(start: Blockly.Block | null): { field: string; include: 1 | 0 }[] {
  const fields: { field: string; include: 1 | 0 }[] = [];
  let block = start;
  while (block) {
    fields.push({ field: block.getFieldValue('FIELD').trim(), include: Number(block.getFieldValue('INCLUDE')) as 1 | 0 });
    block = block.getNextBlock();
  }
  return fields;
}

function parseAccumulators(start: Blockly.Block | null): Accumulator[] {
  const accumulators: Accumulator[] = [];
  let block = start;
  while (block) {
    accumulators.push({ name: block.getFieldValue('NAME').trim(), operator: block.getFieldValue('OPERATOR') as Accumulator['operator'], field: block.getFieldValue('FIELD').trim() });
    block = block.getNextBlock();
  }
  return accumulators;
}

function parseDocument(start: Blockly.Block | null): Record<string, MongoValue> {
  const document: Record<string, MongoValue> = {};
  let block = start;
  while (block) {
    document[block.getFieldValue('FIELD').trim()] = parseLiteral(block.getFieldValue('VALUE'));
    block = block.getNextBlock();
  }
  return document;
}

function parseUpdates(start: Blockly.Block | null): UpdateOperation[] {
  const updates: UpdateOperation[] = [];
  let block = start;
  while (block) {
    updates.push({ operator: block.getFieldValue('OPERATOR') as UpdateOperation['operator'], field: block.getFieldValue('FIELD').trim(), value: parseLiteral(block.getFieldValue('VALUE')) });
    block = block.getNextBlock();
  }
  return updates;
}

function parseLiteral(raw: string, operator?: string): MongoValue {
  const value = raw.trim();
  if (operator === '$exists') return { type: 'boolean', value: value.toLowerCase() !== 'false' };
  if (operator === '$in' || operator === '$nin') return { type: 'array', value: value.split(',').map((item) => parseLiteral(item)) };
  if (operator === '$regex') return { type: 'regex', value };
  if (value === 'true' || value === 'false') return { type: 'boolean', value: value === 'true' };
  if (value === 'null') return { type: 'null' };
  if (value !== '' && Number.isFinite(Number(value))) return { type: 'number', value: Number(value) };
  return { type: 'string', value };
}

function asNumber(value: string, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
