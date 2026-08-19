import { QueryAST, FilterAST, Condition, PipelineStageAST } from '@/types/ast';

export function generateMongoCode(ast: QueryAST | null): string {
  if (!ast) return '// Connect blocks to see query...';

  let code = `db.${ast.collection}.${ast.operation}(`;

  if (ast.operation === 'find') {
    code += generateFilterCode(ast.filter);
    code += ')';
    
    // Add modifiers like sort and limit if present in pipeline
    if (ast.pipeline && ast.pipeline.length > 0) {
      ast.pipeline.forEach(stage => {
        if (stage.stage === '$sort') {
          const sortObj: any = {};
          stage.sorts.forEach(s => { sortObj[s.field] = s.direction; });
          code += `.sort(${JSON.stringify(sortObj)})`;
        }
        if (stage.stage === '$limit') {
          code += `.limit(${stage.limit})`;
        }
      });
    }
  } else if (ast.operation === 'aggregate') {
    code += '[\n';
    if (ast.pipeline && ast.pipeline.length > 0) {
      const stagesCode = ast.pipeline.map(stage => {
        return `  ${generateStageCode(stage)}`;
      }).join(',\n');
      code += stagesCode + '\n';
    }
    code += '])';
  }

  return code;
}

function generateFilterCode(filter?: FilterAST): string {
  if (!filter) return '{}';

  if (filter.type === 'condition') {
    const cond = filter as Condition;
    if (cond.operator === '$eq') {
      return JSON.stringify({ [cond.field]: cond.value });
    } else {
      return JSON.stringify({ [cond.field]: { [cond.operator]: cond.value } });
    }
  }

  // To support $and / $or later
  return '{}'; 
}

function generateStageCode(stage: PipelineStageAST): string {
  if (stage.stage === '$match') {
    return `{ $match: ${generateFilterCode(stage.filter)} }`;
  }
  if (stage.stage === '$sort') {
    const sortObj: any = {};
    stage.sorts.forEach(s => { sortObj[s.field] = s.direction; });
    return `{ $sort: ${JSON.stringify(sortObj)} }`;
  }
  if (stage.stage === '$limit') {
    return `{ $limit: ${stage.limit} }`;
  }
  return '{}';
}
