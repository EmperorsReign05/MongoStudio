import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Student from '@/models/Student';
import Movie from '@/models/Movie';
import { QueryAST } from '@/types/ast';

export async function POST(request: Request) {
  try {
    const ast: QueryAST = await request.json();
    
    if (!ast || !ast.collection || !ast.operation) {
      return NextResponse.json({ error: 'Invalid AST provided' }, { status: 400 });
    }

    await connectToDatabase();

    // Determine which model to use
    let Model;
    if (ast.collection === 'students') {
      Model = Student;
    } else if (ast.collection === 'movies') {
      Model = Movie;
    } else {
      return NextResponse.json({ error: 'Invalid collection' }, { status: 400 });
    }

    let results = [];

    // Parse filters from AST back to Mongoose syntax
    const parseFilter = (filterAST: any) => {
      if (!filterAST) return {};
      if (filterAST.type === 'condition') {
        if (filterAST.operator === '$eq') {
          return { [filterAST.field]: filterAST.value };
        }
        return { [filterAST.field]: { [filterAST.operator]: filterAST.value } };
      }
      return {};
    };

    // Execute based on operation
    if (ast.operation === 'find') {
      const filter = parseFilter(ast.filter);
      let query = Model.find(filter);

      if (ast.pipeline) {
        ast.pipeline.forEach((stage: any) => {
          if (stage.stage === '$sort') {
            const sortObj: any = {};
            stage.sorts.forEach((s: any) => { sortObj[s.field] = s.direction; });
            query = query.sort(sortObj);
          }
          if (stage.stage === '$limit') {
            query = query.limit(stage.limit);
          }
        });
      }
      
      results = await query.lean().exec();

    } else if (ast.operation === 'aggregate') {
      const pipeline: any[] = [];
      if (ast.pipeline) {
        ast.pipeline.forEach((stage: any) => {
          if (stage.stage === '$match') {
            pipeline.push({ $match: parseFilter(stage.filter) });
          }
          if (stage.stage === '$sort') {
            const sortObj: any = {};
            stage.sorts.forEach((s: any) => { sortObj[s.field] = s.direction; });
            pipeline.push({ $sort: sortObj });
          }
          if (stage.stage === '$limit') {
            pipeline.push({ $limit: stage.limit });
          }
        });
      }

      results = await Model.aggregate(pipeline).exec();
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Execution Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
