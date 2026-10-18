# MongoBlocks Submission Roadmap

## Product Definition

MongoBlocks is a professional visual MongoDB learning and query-execution studio. Learners build valid MongoDB operations with typed, interlocking blocks, inspect the equivalent MongoDB shell syntax, run it on curated datasets, and understand the result.

It is not a generic CRUD dashboard. MongoDB concepts stay visible through document structures, filters, logical groups, aggregation stages, indexes, generated code, and execution feedback.

### Audience and distinction

- Primary users: MongoDB students, junior developers, and instructors.
- MongoDB Compass is an administration/exploration tool. MongoBlocks is a constrained learning environment that makes query grammar and concepts visible.
- The interaction should be approachable, not childish: light interface, restrained colours, concise developer terminology, strong block shapes, and guided examples.

## Current Prototype Assessment

The repository has already completed the right architectural pivot: React Flow was replaced by Blockly in commits 995e6b6 through 3aa7c5d. Keep Blockly and refine it rather than returning to graph wires.

Existing strengths:

- Next.js, TypeScript, Tailwind, Mongoose, Blockly, and react-blockly are configured.
- QueryAST separates the workspace parser from code generation and database execution.
- The seed data includes nested objects and arrays.
- The API allow-lists students and movies rather than exposing arbitrary database commands.

Immediate repair work:

- src/lib/parser.ts is obsolete React Flow code and imports a removed dependency.
- README describes an npm run seed command that package.json does not provide.
- Current blocks only cover db, collection, find, comparison filters, and AND/OR.
- AST and UI contain broad any types; validation and compilation are duplicated.
- Results are raw JSON and the datasets are too small for convincing aggregation or index demonstrations.

## Final Recommended Scope

Build a MongoDB Query Learning Studio, not a full database administration product or a general visual programming language.

### Required capabilities

| Area | Scope |
| --- | --- |
| Visual grammar | Interlocking blocks for collections, read/write operations, filters, nesting, and pipeline stages. |
| CRUD | find, insertOne, updateMany, deleteMany; writes only target a resettable sandbox. |
| Find options | projection, sort, limit, and skip. |
| Filters | comparisons, in/nin, exists, regex, array matching, and dotted nested paths. |
| Aggregation | match, project, group, sort, limit, skip, unwind, count, addFields. |
| Learning | block help, generated code, validation messages, examples/challenges, and aggregation stage preview. |
| Evidence | query history, execution metadata, tests, reproducible seed data, and report artefacts. |

### Explicitly exclude

- Raw arbitrary MongoDB commands.
- Full shell query to block reverse parsing.
- Authentication, multi-user collaboration, and production multi-tenancy.
- Every aggregation operator.
- Generic AI features.

## Academic Coverage Map

| MongoDB concept | MongoBlocks evidence |
| --- | --- |
| Documents and flexible schema | Explorer compares fields across varied documents. |
| Embedded documents | Dotted paths such as contact.city and imdb.rating. |
| Arrays | Course/genre filters and unwind stage. |
| Create/read/update/delete | Safe sandbox write lab and follow-up queries. |
| Comparison and logic | Nested C-shaped AND, OR, and NOT filter blocks. |
| Projection/pagination | Project/select-fields, skip, limit, and sort blocks. |
| Aggregation | Match to group to sort to limit pipeline. |
| Accumulators | Sum, average, minimum, maximum, and push. |
| References | Orders/products model; lookup is optional only after core work. |
| Indexes/query plan | Index lab with a curated explain execution summary. |

## Architecture

    Blockly workspace (XML + block state)
                  |
                  v
    Workspace parser -> versioned QueryAST -> shared validator
                                      |               |
                                      v               v
                         MongoDB operation compiler   learning diagnostics
                                      |
                                      v
                       allow-listed Next.js API route
                                      |
                                      v
                    MongoDB datasets and safe sandbox
                                      |
                                      v
                 results, count, duration, stage trace

### Design rules

1. Blockly enforces structural connections, but the AST remains the source of truth.
2. Store Blockly XML for visual reloading and AST metadata for semantic validation, saved work, and challenge checks.
3. Use one shared validation/compiler layer. Do not separately translate filters in the preview generator and API.
4. Server validation allow-lists collection names, field paths, operators, stage types, result limits, and update operators.
5. Return structured errors with a friendly message, error code, and block identifier when known.

The AST should use discriminated unions, a version number, typed literals, and a collection union. It must distinguish the number 20 from the string 20 and must not expose any as a public type.

## Data Model

Use deterministic seed data with roughly 25 to 60 documents per collection.

- Students: contact object, course objects, skills array; demonstrates embedding, arrays, and dotted paths.
- Products: categories, price, stock, tags; demonstrates filtering, sort, and pagination.
- Orders: embedded customer details and items array referencing products; demonstrates unwind, group, and optional lookup.
- Sandbox: resettable mutable documents used exclusively for create/update/delete.

Create and justify indexes:

- Students: major plus gpa, and contact.city.
- Products: category plus price.
- Orders: status plus orderedAt, and items.productId.

The seed command must reset only project collections, recreate indexes, and leave a predictable state for the demo.

## UX Direction

- Keep a clean light interface. Use soft consistent colour families for database, operation, filter, pipeline, and update blocks.
- Present db, collection, and method as a compact readable sentence, while using reliable vertical Blockly connections.
- Use C-shaped containers for filters and nested logic; use a vertical stage stack for aggregation.
- Selected blocks show plain-language purpose, MongoDB equivalent, expected inputs, and a one-line example.
- Provide one-click example workspaces and a friendly empty state.
- Results need table, document, and JSON views, plus result count and execution duration.

## Delivery Plan

### Phase 0: Stabilise (2-3 days)

Remove obsolete React Flow code, add the missing seed script, type current parser/UI paths, prevent duplicate block registration, repair README, and establish lint/build/smoke checks.

Output: a clean clone can seed, start, assemble a nested find query, and receive results.

### Phase 1: Query Engine Contract (3-4 days)

Introduce AST v1, typed literals, central validation, central compiler, safe API errors, and unit tests for parser/validation/code generation.

Output: a reliable extension point independent of Blockly details.

### Phase 2: Complete Read Builder (4-5 days)

Add field metadata, nested path selection, filter operators, projection, sort, skip, limit, collection hints, and result table.

Output: a polished visual find builder that genuinely demonstrates read querying.

### Phase 3: Aggregation Studio (5-7 days)

Add aggregate method and stage stack: match, project, group, sort, limit, skip, unwind, count, addFields, and accumulators.

Output: the central demonstration flow and stage-by-stage preview.

### Phase 4: Safe Write Lab (3-4 days)

Add sandbox-only insertOne, updateMany, deleteMany, a target-count preview, delete confirmation, and reset control.

Output: visible CRUD depth without risking demonstration data.

### Phase 5: Learning Features (4-5 days)

Add contextual explanations, saved workspaces/history, example gallery, four to six semantic challenges, and index lab if the core is stable.

Output: a learning product, not only a query builder.

### Phase 6: Submission Hardening (3-4 days)

Polish accessibility/error states, rehearse from a clean clone, reset demo data, collect screenshots/test evidence, finalise report, and record a backup demo.

## Team Split

| Workstream | Ownership |
| --- | --- |
| Workspace, blocks, UX | Frontend lead |
| AST, validator, compiler, API | Query-engine lead |
| Datasets, indexes, verified shell queries | MongoDB/data lead |
| Testing, evidence, report, demo | QA/documentation lead |

For three members, combine QA/documentation with the data role and review every block grammar change jointly.

## Demo Script (7-9 minutes)

1. Show the syntax barrier using a nested shell query.
2. Build a find query over students with a dotted field and nested logic.
3. Build an orders aggregation: unwind, group, sort, limit; explain each stage with the preview.
4. Demonstrate projection and pagination on products.
5. Insert, update, re-query, delete, and reset sandbox data.
6. Show index explanation for one curated query.
7. Complete one learning challenge and show generated code.
8. Close with architecture, validation/security boundaries, and limitations.

## Wow Features Ranked

| Feature | Impact | Effort | Decision |
| --- | --- | --- | --- |
| Stage-by-stage aggregation preview | Very high | Medium | Implement |
| Curated index/explain lab | High | Medium | Implement if aggregation is stable |
| Semantic query challenges | High | Medium | Implement |
| Saved named workspaces/history | Medium | Low | Implement |
| Schema/document explorer | High | Medium | Implement in focused form |
| Visual lookup join | High | High | Optional |
| Reverse parser | Medium | Very high | Exclude |

## Risks and Controls

| Risk | Practical control |
| --- | --- |
| Crowded Blockly workspace | Progressive toolbox categories, examples, narrow initial block set. |
| Invalid generated queries | One AST compiler; parser, validator, generator, and execution tests. |
| Nested logic edge cases | Recursive filter AST; never infer semantics from visual position. |
| Unsafe requests | Server-side allow-list validation and sandbox-only writes. |
| Atlas/network failure | Local MongoDB fallback and deterministic seed data. |
| Feature creep | Freeze scope after aggregation; lookup remains optional. |

## Project Report Plan

Write the report continuously in docs/report rather than at the end. Use your own screenshots, diagrams, datasets, test cases, and decision log; cite external factual material and write the explanation in your own words.

### Chapters

1. Abstract: problem, approach, features, outcome.
2. Introduction: motivation, objectives, scope.
3. Technology review: MongoDB, Blockly, learning rationale, concise Compass comparison.
4. Requirements: users, stories, functional/non-functional requirements, boundaries.
5. Design: architecture, AST, block grammar, validation/security, database/index design.
6. Implementation: actual Next.js, Blockly, Mongoose, parser, compiler, API, and UI decisions.
7. MongoDB demonstration: supported concept, generated query, and result evidence.
8. Testing/evaluation: test matrix, expected/actual outcomes, usability observations, limitations.
9. Conclusion/future work.
10. References/appendices: setup, dataset excerpts, screenshots, contribution table, Git milestones.

### Originality safeguards

- Keep a dated decision log: problem, alternatives, final decision, reason.
- Capture screenshots and output for every completed feature.
- Preserve representative ASTs, generated queries, test results, and rejected invalid inputs.
- Cite tools, documentation, and factual claims. Citation supports originality; copied prose does not.
- Add a clear team contribution table.

## Immediate Actions

1. Create Phase 0 issues for the obsolete parser and missing seed script.
2. Agree on AST v1 before adding further blocks.
3. Lock final datasets as students, products, orders, and sandbox.
4. Complete read queries before aggregation, aggregation before writes.
5. Start report evidence collection now.
