// MongoDB value literals — never expose `any` as a public type.
export type MongoValue =
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'null' }
  | { type: 'regex'; value: string; flags?: string }
  | { type: 'array'; value: MongoValue[] }
  | { type: 'object'; value: Record<string, MongoValue> };

// Allow-listed collection names.
export type CollectionName = 'students' | 'products' | 'orders' | 'sandbox';

// Comparison operators.
export type ComparisonOperator =
  | '$eq'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$ne'
  | '$in'
  | '$nin'
  | '$exists'
  | '$regex';

// Logical operators.
export type LogicalOperator = '$and' | '$or' | '$not';

// A single condition, e.g. { age: { $gt: 20 } }
export interface Condition {
  type: 'condition';
  field: string;
  operator: ComparisonOperator;
  value: MongoValue;
}

// A logical grouping, e.g. { $and: [ ... ] }
export interface LogicalGroup {
  type: 'logical';
  operator: LogicalOperator;
  children: (Condition | LogicalGroup)[];
}

export type FilterAST = Condition | LogicalGroup;

// Accumulators for $group.
export type AccumulatorOperator = '$sum' | '$avg' | '$min' | '$max' | '$push';

export interface Accumulator {
  name: string;
  operator: AccumulatorOperator;
  field: string; // e.g. "$price"
}

// Aggregation pipeline stages.
export interface MatchStage {
  stage: '$match';
  filter: FilterAST;
}

export interface ProjectStage {
  stage: '$project';
  fields: { field: string; include: 1 | 0 }[];
}

export interface GroupStage {
  stage: '$group';
  idField: string;
  accumulators: Accumulator[];
}

export interface SortStage {
  stage: '$sort';
  sorts: { field: string; direction: 1 | -1 }[];
}

export interface LimitStage {
  stage: '$limit';
  limit: number;
}

export interface SkipStage {
  stage: '$skip';
  skip: number;
}

export interface UnwindStage {
  stage: '$unwind';
  path: string;
  preserveNullAndEmptyArrays?: boolean;
}

export interface CountStage {
  stage: '$count';
  field: string;
}

export interface AddFieldsStage {
  stage: '$addFields';
  fields: { field: string; expression: string }[];
}

export type PipelineStageAST =
  | MatchStage
  | ProjectStage
  | GroupStage
  | SortStage
  | LimitStage
  | SkipStage
  | UnwindStage
  | CountStage
  | AddFieldsStage;

// Update operators.
export type UpdateOperator =
  | '$set'
  | '$unset'
  | '$inc'
  | '$push'
  | '$pull'
  | '$mul'
  | '$rename';

export interface UpdateOperation {
  operator: UpdateOperator;
  field: string;
  value: MongoValue;
}

// The root AST object — versioned, discriminated, fully typed.
export interface QueryAST {
  version: 1;
  operation: 'find' | 'aggregate' | 'insertOne' | 'updateMany' | 'deleteMany';
  collection: CollectionName;
  filter?: FilterAST;
  pipeline?: PipelineStageAST[];
  document?: Record<string, MongoValue>;
  updates?: UpdateOperation[];
  projection?: { field: string; include: 1 | 0 }[];
  sort?: { field: string; direction: 1 | -1 }[];
  limit?: number;
  skip?: number;
}