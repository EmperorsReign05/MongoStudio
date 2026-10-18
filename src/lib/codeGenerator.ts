import { type FilterAST, type MongoValue, type PipelineStageAST, type QueryAST } from '@/types/ast';

export function generateMongoCode(ast: QueryAST | null): string {
  if (!ast) return '// Assemble db, a collection, and an operation to preview code.';

  if (ast.operation === 'find') {
    let code = 'db.' + ast.collection + '.find(' + filterToCode(ast.filter);
    if (ast.projection?.length) code += ', ' + JSON.stringify(Object.fromEntries(ast.projection.map((item) => [item.field, item.include])));
    code += ')';
    if (ast.sort?.length) code += '.sort(' + JSON.stringify(Object.fromEntries(ast.sort.map((item) => [item.field, item.direction]))) + ')';
    if (ast.skip !== undefined) code += '.skip(' + ast.skip + ')';
    if (ast.limit !== undefined) code += '.limit(' + ast.limit + ')';
    return code;
  }
  if (ast.operation === 'aggregate') {
    return 'db.' + ast.collection + '.aggregate([\\n' + (ast.pipeline ?? []).map((stage) => '  ' + stageToCode(stage)).join(',\\n') + '\\n])';
  }
  if (ast.operation === 'insertOne') return 'db.' + ast.collection + '.insertOne(' + JSON.stringify(documentToJS(ast.document ?? {}), null, 2) + ')';
  if (ast.operation === 'updateMany') return 'db.' + ast.collection + '.updateMany(' + filterToCode(ast.filter) + ', ' + JSON.stringify(updateToJS(ast), null, 2) + ')';
  return 'db.' + ast.collection + '.deleteMany(' + filterToCode(ast.filter) + ')';
}

function filterToCode(filter?: FilterAST): string {
  if (!filter) return '{}';
  if (filter.type === 'condition') {
    const value = mongoValueToDisplay(filter.value);
    return filter.operator === '$eq'
      ? JSON.stringify({ [filter.field]: value })
      : JSON.stringify({ [filter.field]: { [filter.operator]: value } });
  }
  if (filter.operator === '$not') return JSON.stringify({ $nor: filter.children.map((child) => JSON.parse(filterToCode(child))) });
  return JSON.stringify({ [filter.operator]: filter.children.map((child) => JSON.parse(filterToCode(child))) });
}

function stageToCode(stage: PipelineStageAST): string {
  switch (stage.stage) {
    case '$match': return JSON.stringify({ $match: JSON.parse(filterToCode(stage.filter)) });
    case '$project': return JSON.stringify({ $project: Object.fromEntries(stage.fields.map((field) => [field.field, field.include])) });
    case '$group': return JSON.stringify({ $group: { _id: stage.idField === '(none)' ? null : '$' + stage.idField.replace(/^\$/, ''), ...Object.fromEntries(stage.accumulators.map((item) => [item.name, { [item.operator]: '$' + item.field.replace(/^\$/, '') }])) } });
    case '$sort': return JSON.stringify({ $sort: Object.fromEntries(stage.sorts.map((item) => [item.field, item.direction])) });
    case '$limit': return JSON.stringify({ $limit: stage.limit });
    case '$skip': return JSON.stringify({ $skip: stage.skip });
    case '$unwind': return JSON.stringify({ $unwind: '$' + stage.path.replace(/^\$/, '') });
    case '$count': return JSON.stringify({ $count: stage.field });
    case '$addFields': return JSON.stringify({ $addFields: Object.fromEntries(stage.fields.map((field) => [field.field, field.expression])) });
  }
}

function documentToJS(document: Record<string, MongoValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(document).map(([key, value]) => [key, mongoValueToDisplay(value)]));
}

function updateToJS(ast: QueryAST): Record<string, Record<string, unknown>> {
  return (ast.updates ?? []).reduce<Record<string, Record<string, unknown>>>((result, update) => {
    result[update.operator] ??= {};
    result[update.operator][update.field] = mongoValueToDisplay(update.value);
    return result;
  }, {});
}

function mongoValueToDisplay(value: MongoValue): unknown {
  switch (value.type) {
    case 'string': return value.value;
    case 'number': return value.value;
    case 'boolean': return value.value;
    case 'null': return null;
    case 'regex': return '/' + value.value + '/' + (value.flags ?? 'i');
    case 'array': return value.value.map(mongoValueToDisplay);
    case 'object': return documentToJS(value.value);
  }
}
