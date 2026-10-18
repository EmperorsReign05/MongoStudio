import { describe, expect, it } from 'vitest';
import type { QueryAST } from '@/types/ast';
import { compileFilter, compilePipeline, validateQueryAST } from '@/lib/validator';

const studentQuery: QueryAST = {
  version: 1,
  operation: 'find',
  collection: 'students',
  filter: {
    type: 'logical',
    operator: '$and',
    children: [
      { type: 'condition', field: 'gpa', operator: '$gte', value: { type: 'number', value: 8 } },
      { type: 'condition', field: 'contact.city', operator: '$eq', value: { type: 'string', value: 'Delhi' } },
    ],
  },
  sort: [{ field: 'gpa', direction: -1 }],
};

describe('MongoBlocks query contract', () => {
  it('accepts an allow-listed nested read query', () => {
    expect(validateQueryAST(studentQuery)).toEqual([]);
    expect(compileFilter(studentQuery.filter)).toEqual({ $and: [{ gpa: { $gte: 8 } }, { 'contact.city': 'Delhi' }] });
  });

  it('rejects writes outside the sandbox', () => {
    const invalid: QueryAST = { ...studentQuery, operation: 'deleteMany' };
    expect(validateQueryAST(invalid).map((issue) => issue.message)).toContain('Write operations are available only in the resettable sandbox collection.');
  });

  it('compiles supported aggregation stages', () => {
    const pipeline = compilePipeline([
      { stage: '$match', filter: { type: 'condition', field: 'status', operator: '$eq', value: { type: 'string', value: 'delivered' } } },
      { stage: '$unwind', path: 'items' },
      { stage: '$group', idField: 'customer.city', accumulators: [{ name: 'orders', operator: '$sum', field: 'items.quantity' }] },
    ]);
    expect(pipeline).toEqual([
      { $match: { status: 'delivered' } },
      { $unwind: { path: '$items', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$customer.city', orders: { $sum: '$items.quantity' } } },
    ]);
  });
});
