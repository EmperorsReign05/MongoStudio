import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { type QueryAST } from '@/types/ast';
import { compileFilter, compilePipeline, mongoValueToJS, validateQueryAST } from '@/lib/validator';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const ast: unknown = await request.json();
    const issues = validateQueryAST(ast);
    if (issues.length) return NextResponse.json({ error: issues[0].message, issues }, { status: 400 });

    const query = ast as QueryAST;
    const connection = await connectToDatabase();
    const collection = connection.connection.db!.collection(query.collection);
    const startedAt = performance.now();
    let data: unknown;
    let affectedCount: number | undefined;

    if (query.operation === 'find') {
      const projection = query.projection?.length ? Object.fromEntries(query.projection.map((item) => [item.field, item.include])) : undefined;
      let cursor = collection.find(compileFilter(query.filter), { projection });
      if (query.sort?.length) cursor = cursor.sort(Object.fromEntries(query.sort.map((item) => [item.field, item.direction])));
      if (query.skip) cursor = cursor.skip(query.skip);
      cursor = cursor.limit(query.limit ?? 100);
      data = await cursor.toArray();
    } else if (query.operation === 'aggregate') {
      data = await collection.aggregate(compilePipeline(query.pipeline)).toArray();
    } else if (query.operation === 'insertOne') {
      const result = await collection.insertOne(Object.fromEntries(Object.entries(query.document ?? {}).map(([key, value]) => [key, mongoValueToJS(value)])));
      affectedCount = result.acknowledged ? 1 : 0;
      data = [{ insertedId: result.insertedId }];
    } else if (query.operation === 'updateMany') {
      const update = (query.updates ?? []).reduce<Record<string, Record<string, unknown>>>((result, item) => {
        result[item.operator] ??= {};
        result[item.operator][item.field] = mongoValueToJS(item.value);
        return result;
      }, {});
      const result = await collection.updateMany(compileFilter(query.filter), update);
      affectedCount = result.modifiedCount;
      data = [{ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }];
    } else {
      const result = await collection.deleteMany(compileFilter(query.filter));
      affectedCount = result.deletedCount;
      data = [{ deletedCount: result.deletedCount }];
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        collection: query.collection,
        operation: query.operation,
        count: Array.isArray(data) ? data.length : 0,
        affectedCount,
        durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
      },
    });
  } catch (error) {
    console.error('MongoBlocks execution error:', error);
    return NextResponse.json({ error: 'MongoBlocks could not execute this query. Check your inputs and database connection.' }, { status: 500 });
  }
}
