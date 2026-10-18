import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import type { QueryAST } from '@/types/ast';
import { compileFilter, validateQueryAST } from '@/lib/validator';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const ast: unknown = await request.json();
    const issues = validateQueryAST(ast);
    if (issues.length) return NextResponse.json({ error: issues[0].message }, { status: 400 });
    const query = ast as QueryAST;
    if (query.operation !== 'find') return NextResponse.json({ error: 'Index explanations are available for find queries.' }, { status: 400 });

    const connection = await connectToDatabase();
    const plan = await connection.connection.db!.collection(query.collection).find(compileFilter(query.filter)).explain('executionStats');
    const summary = JSON.stringify(plan);
    const usesIndex = summary.includes('IXSCAN');
    const stats = plan.executionStats;
    return NextResponse.json({
      usesIndex,
      summary: usesIndex
        ? 'MongoDB selected an index scan (IXSCAN), so it can narrow matching documents without scanning the whole collection.'
        : 'MongoDB selected a collection scan (COLLSCAN). Try filtering with a documented indexed field to compare the plan.',
      examinedDocuments: stats?.totalDocsExamined ?? null,
      examinedKeys: stats?.totalKeysExamined ?? null,
      returned: stats?.nReturned ?? null,
    });
  } catch (error) {
    console.error('MongoBlocks explain error:', error);
    return NextResponse.json({ error: 'MongoBlocks could not inspect this query plan.' }, { status: 500 });
  }
}
