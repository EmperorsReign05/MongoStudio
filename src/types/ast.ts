export type Operator =
  | '$eq'
  | '$gt'
  | '$lt'
  | '$gte'
  | '$lte'
  | '$ne'
  | '$in'
  | '$nin';

export type LogicalOperator = '$and' | '$or' | '$not';

// Represents a basic condition like { age: { $gt: 20 } }
export interface Condition {
  type: 'condition';
  field: string;
  operator: Operator;
  value: any;
}

// Represents a logical grouping like { $and: [ ... ] }
export interface LogicalGroup {
  type: 'logical';
  operator: LogicalOperator;
  children: (Condition | LogicalGroup)[];
}

export type FilterAST = Condition | LogicalGroup;

// Aggregation Accumulators for $group
export type AccumulatorOperator = '$sum' | '$avg' | '$min' | '$max' | '$push';

export interface Accumulator {
  name: string; // The alias field name
  operator: AccumulatorOperator;
  field: string; // The field to compute on, e.g., "$price"
}

// Aggregation Pipeline Stages
export interface MatchStage {
  stage: '$match';
  filter: FilterAST;
}

export interface GroupStage {
  stage: '$group';
  idField: string; // Field to group by, e.g., "$category"
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
  path: string; // e.g. "$tags"
  preserveNullAndEmptyArrays?: boolean;
}

export interface ProjectStage {
  stage: '$project';
  fields: { [key: string]: 1 | 0 };
}

export type PipelineStageAST =
  | MatchStage
  | GroupStage
  | SortStage
  | LimitStage
  | SkipStage
  | UnwindStage
  | ProjectStage;

// The root AST object that gets sent from frontend to backend
export interface QueryAST {
  operation: 'find' | 'aggregate' | 'insert' | 'update' | 'delete';
  collection: string;
  filter?: FilterAST; // For find, update, delete
  pipeline?: PipelineStageAST[]; // For aggregate
  document?: any; // For insert
  update?: any; // For update
}
