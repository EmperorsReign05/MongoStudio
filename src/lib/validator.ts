import {
  type CollectionName,
  type Condition,
  type FilterAST,
  type LogicalGroup,
  type MongoValue,
  type PipelineStageAST,
  type QueryAST,
} from '@/types/ast';

export interface ValidationIssue {
  path: string;
  message: string;
}

export const collectionFields: Record<CollectionName, string[]> = {
  students: ['name', 'age', 'major', 'gpa', 'contact.email', 'contact.phone', 'contact.city', 'courses.code', 'courses.score', 'skills'],
  products: ['name', 'category', 'price', 'stock', 'tags', 'rating'],
  orders: ['orderNo', 'customer.name', 'customer.city', 'status', 'orderedAt', 'items.productId', 'items.quantity', 'items.unitPrice'],
  sandbox: ['title', 'status', 'score', 'tags', 'details.note', 'details.owner'],
};

const supportedOperators = new Set(['$eq', '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin', '$exists', '$regex']);
const supportedUpdates = new Set(['$set', '$unset', '$inc', '$push', '$pull', '$mul', '$rename']);

export function validateQueryAST(ast: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ast || typeof ast !== 'object') {
    return [{ path: 'root', message: 'Connect a complete query before running it.' }];
  }

  const query = ast as Partial<QueryAST>;
  if (query.version !== 1) issues.push({ path: 'version', message: 'This workspace uses an unsupported query format.' });
  if (!query.collection || !(query.collection in collectionFields)) issues.push({ path: 'collection', message: 'Choose a supported demonstration collection.' });
  if (!query.operation || !['find', 'aggregate', 'insertOne', 'updateMany', 'deleteMany'].includes(query.operation)) {
    issues.push({ path: 'operation', message: 'Choose a supported MongoDB operation.' });
  }

  const fields = query.collection && query.collection in collectionFields ? collectionFields[query.collection] : [];
  if (query.filter) validateFilter(query.filter, fields, 'filter', issues);

  if (query.operation === 'aggregate') {
    if (!query.pipeline?.length) issues.push({ path: 'pipeline', message: 'An aggregation needs at least one pipeline stage.' });
    query.pipeline?.forEach((stage, index) => validateStage(stage, fields, 'pipeline.' + index, issues));
  }

  if (query.operation === 'insertOne' && !query.document) {
    issues.push({ path: 'document', message: 'Add at least one field to the document you want to insert.' });
  }
  if (query.operation === 'insertOne' || query.operation === 'updateMany' || query.operation === 'deleteMany') {
    if (query.collection !== 'sandbox') issues.push({ path: 'collection', message: 'Write operations are available only in the resettable sandbox collection.' });
  }
  if (query.operation === 'updateMany') {
    if (!query.filter) issues.push({ path: 'filter', message: 'Add a filter before updating sandbox documents.' });
    if (!query.updates?.length) issues.push({ path: 'updates', message: 'Add at least one update action.' });
    query.updates?.forEach((update, index) => {
      if (!supportedUpdates.has(update.operator)) issues.push({ path: 'updates.' + index, message: 'This update operator is not supported.' });
      if (!isSafeField(update.field)) issues.push({ path: 'updates.' + index, message: 'Choose a valid field name for the update.' });
    });
  }
  if (query.operation === 'deleteMany' && !query.filter) {
    issues.push({ path: 'filter', message: 'Add a filter before deleting sandbox documents.' });
  }

  [query.limit, query.skip].forEach((value, index) => {
    if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 500)) {
      issues.push({ path: index === 0 ? 'limit' : 'skip', message: 'Limit and skip must be whole numbers between 0 and 500.' });
    }
  });
  return issues;
}

function validateFilter(filter: FilterAST, fields: string[], path: string, issues: ValidationIssue[]): void {
  if (filter.type === 'condition') {
    if (!isSafeField(filter.field) || (fields.length > 0 && !fields.includes(filter.field))) {
      issues.push({ path, message: 'The field ' + filter.field + ' is not available for this collection.' });
    }
    if (!supportedOperators.has(filter.operator)) issues.push({ path, message: 'This filter operator is not supported.' });
    return;
  }

  if (!filter.children.length) issues.push({ path, message: 'A logical group needs at least one condition.' });
  if (filter.operator === '$not' && filter.children.length !== 1) issues.push({ path, message: 'NOT must contain exactly one condition or group.' });
  filter.children.forEach((child, index) => validateFilter(child, fields, path + '.' + index, issues));
}

function validateStage(stage: PipelineStageAST, fields: string[], path: string, issues: ValidationIssue[]): void {
  if (stage.stage === '$match') validateFilter(stage.filter, fields, path, issues);
  if (stage.stage === '$group' && !stage.accumulators.length) issues.push({ path, message: 'Group needs at least one accumulator.' });
  if (stage.stage === '$project' && !stage.fields.length) issues.push({ path, message: 'Project needs at least one selected field.' });
  if ((stage.stage === '$limit' || stage.stage === '$skip') && (!Number.isInteger(stage.stage === '$limit' ? stage.limit : stage.skip) || (stage.stage === '$limit' ? stage.limit : stage.skip) < 0)) {
    issues.push({ path, message: 'Pipeline limits and skips must be non-negative whole numbers.' });
  }
}

function isSafeField(field: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(field) && !field.includes('..');
}

export function mongoValueToJS(value: MongoValue): unknown {
  switch (value.type) {
    case 'string': return value.value;
    case 'number': return value.value;
    case 'boolean': return value.value;
    case 'null': return null;
    case 'regex': return new RegExp(value.value, value.flags || 'i');
    case 'array': return value.value.map(mongoValueToJS);
    case 'object': return Object.fromEntries(Object.entries(value.value).map(([key, item]) => [key, mongoValueToJS(item)]));
  }
}

export function compileFilter(filter?: FilterAST): Record<string, unknown> {
  if (!filter) return {};
  if (filter.type === 'condition') return compileCondition(filter);
  const group = filter as LogicalGroup;
  if (group.operator === '$not') return { $nor: group.children.map(compileFilter) };
  return { [group.operator]: group.children.map(compileFilter) };
}

function compileCondition(condition: Condition): Record<string, unknown> {
  const value = mongoValueToJS(condition.value);
  if (condition.operator === '$eq') return { [condition.field]: value };
  if (condition.operator === '$regex' && value instanceof RegExp) return { [condition.field]: value };
  return { [condition.field]: { [condition.operator]: value } };
}

export function compilePipeline(pipeline: PipelineStageAST[] = []): Record<string, unknown>[] {
  return pipeline.map((stage) => {
    switch (stage.stage) {
      case '$match': return { $match: compileFilter(stage.filter) };
      case '$project': return { $project: Object.fromEntries(stage.fields.map((field) => [field.field, field.include])) };
      case '$group': return {
        $group: {
          _id: stage.idField === '(none)' ? null : '$' + stage.idField.replace(/^\$/, ''),
          ...Object.fromEntries(stage.accumulators.map((item) => [item.name, { [item.operator]: '$' + item.field.replace(/^\$/, '') }])),
        },
      };
      case '$sort': return { $sort: Object.fromEntries(stage.sorts.map((item) => [item.field, item.direction])) };
      case '$limit': return { $limit: stage.limit };
      case '$skip': return { $skip: stage.skip };
      case '$unwind': return { $unwind: { path: stage.path.startsWith('$') ? stage.path : '$' + stage.path, preserveNullAndEmptyArrays: stage.preserveNullAndEmptyArrays ?? false } };
      case '$count': return { $count: stage.field };
      case '$addFields': return { $addFields: Object.fromEntries(stage.fields.map((field) => [field.field, field.expression])) };
    }
  });
}
