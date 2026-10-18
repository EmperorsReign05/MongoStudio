# MongoBlocks

MongoBlocks is a visual MongoDB learning and query-execution studio. Learners build valid MongoDB operations with typed, interlocking blocks, inspect the equivalent MongoDB shell syntax, run it on curated datasets, and understand the result.

## Prerequisites

Before setting up the project, make sure you have:

1. **Node.js** (v18 or higher recommended)
2. **MongoDB**: A local MongoDB instance or a MongoDB Atlas cluster.
3. **Whitelisted IP**: Ensure your IP address is whitelisted in your MongoDB Atlas dashboard (`Network Access` tab -> `Add IP Address`).

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a file named `.env.local` in the root of the project. Add your MongoDB connection string to it:
```env
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority&appName=Cluster0"
```
*(Make sure to replace `<username>`, `<password>`, and `<cluster-url>` with your actual Atlas credentials).*

For local development you can also use:
```env
MONGODB_URI="mongodb://localhost:27017/mongoblocks"
```

### 3. Seed the Database
Before running queries, you need to populate your database with our demo datasets (`students`, `movies`, `products`, `orders`, and `sandbox`). Run the seed script:
```bash
npm run seed
```
*Note: This will reset only the project collections, recreate indexes, and leave a predictable state for the demo.*

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. Drag and drop blocks from the sidebar onto the canvas, connect them, and hit **Run Query**!

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the production bundle |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run seed` | Seed/reset the project collections |
| `npm run test` | Run the test suite |

## Architecture

MongoBlocks uses a layered architecture:

1. **Workspace** — The customer-facing `blockly` workspace (XML + block state).
2. **Parser** — `blocklyParser.ts` converts the current workspace state into a versioned `QueryAST`.
3. **Validator** — Shared validation layer that checks the AST against server-side allow-lists.
4. **Compiler** — `codeGenerator.ts` turns the AST into MongoDB shell code for display.
5. **API** — `api/execute/route.ts` re-validates the AST and runs it against the allow-listed collections via Mongoose.
6. **Datasets** — Deterministic seed data with indexes for students, products, orders, and a resettable sandbox.

## Supported MongoDB Concepts

- Documents and flexible schema
- Embedded documents (dotted paths like `contact.city` and `imdb.rating`)
- Arrays (course/genre filters and `$unwind`)
- Create/read/update/delete (safe sandbox write lab)
- Comparison and logic (nested C-shaped AND/OR/NOT filter blocks)
- Projection/pagination (`$project`, `$skip`, `$limit`, `$sort`)
- Aggregation (`$match` → `$group` → `$sort` → `$limit` pipeline)
- Accumulators (`$sum`, `$avg`, `$min`, `$max`, `$push`)

## License

Internal educational project.