'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { BookOpen, Database, Lightbulb, Play, Plus, RotateCcw, Save, Search, Sparkles } from 'lucide-react';
import { defineBlocks } from '@/lib/blocks';
import { parseWorkspaceToAST } from '@/lib/blocklyParser';
import { generateMongoCode } from '@/lib/codeGenerator';
import { validateQueryAST, type ValidationIssue } from '@/lib/validator';
import type { QueryAST } from '@/types/ast';

const blockLibrary = [
  { name: 'Start', colour: 'bg-indigo-500', blocks: [{ type: 'db_root', label: 'Database root', description: 'Start a query' }, { type: 'collection', label: 'Collection', description: 'Choose data' }] },
  { name: 'Operations', colour: 'bg-rose-500', blocks: [{ type: 'method_find', label: 'Find documents', description: 'Read data' }, { type: 'method_aggregate', label: 'Aggregation', description: 'Build a pipeline' }, { type: 'method_insert', label: 'Insert one', description: 'Sandbox only' }, { type: 'method_update', label: 'Update many', description: 'Sandbox only' }, { type: 'method_delete', label: 'Delete many', description: 'Sandbox only' }] },
  { name: 'Filters', colour: 'bg-emerald-500', blocks: [{ type: 'filter_condition', label: 'Field condition', description: 'Fits inside Find filters' }, { type: 'filter_logic', label: 'Logic group', description: 'AND, OR, NOT filters' }, { type: 'find_option', label: 'Find option', description: 'Sort or paginate' }] },
  { name: 'Aggregation', colour: 'bg-amber-500', blocks: [{ type: 'stage_match', label: '$match', description: 'Filter documents' }, { type: 'stage_project', label: '$project', description: 'Select fields' }, { type: 'project_field', label: 'Project field', description: 'Include or exclude' }, { type: 'stage_group', label: '$group', description: 'Summarise values' }, { type: 'accumulator', label: 'Accumulator', description: 'Sum or average' }, { type: 'stage_sort', label: '$sort', description: 'Order output' }, { type: 'stage_limit', label: '$limit', description: 'Cap results' }, { type: 'stage_skip', label: '$skip', description: 'Skip results' }, { type: 'stage_unwind', label: '$unwind', description: 'Expand an array' }, { type: 'stage_count', label: '$count', description: 'Count output' }] },
  { name: 'Sandbox', colour: 'bg-cyan-600', blocks: [{ type: 'document_field', label: 'Document field', description: 'Insert only, not a filter' }, { type: 'update_field', label: 'Update field', description: 'Update only, not a filter' }] },
];

type ExecutionMeta = { count: number; durationMs: number; affectedCount?: number; operation: string; collection: string };
type HistoryItem = { operation: string; collection: string; savedAt: string };
type ExplainFeedback = { usesIndex: boolean; summary: string; examinedDocuments: number | null; examinedKeys: number | null };

const challenges = [
  { title: 'Nested student search', text: 'Find students from Delhi with a GPA of at least 8.', complete: (query: QueryAST | null) => query?.operation === 'find' && query.collection === 'students' && Boolean(query.filter) },
  { title: 'Order insight', text: 'Aggregate orders by unwinding items, then grouping them.', complete: (query: QueryAST | null) => query?.operation === 'aggregate' && (query.pipeline ?? []).some((stage) => stage.stage === '$unwind') && (query.pipeline ?? []).some((stage) => stage.stage === '$group') },
  { title: 'Safe write', text: 'Update a filtered sandbox record with a set block.', complete: (query: QueryAST | null) => query?.operation === 'updateMany' && query.collection === 'sandbox' && Boolean(query.filter) && Boolean(query.updates?.length) },
];

function connectToCompatibleContainer(workspace: Blockly.WorkspaceSvg, block: Blockly.BlockSvg, type: string): boolean {
  const targets: Record<string, { types: string[]; input: string }> = {
    filter_condition: { types: ['method_find', 'method_update', 'method_delete', 'stage_match'], input: 'FILTER' },
    filter_logic: { types: ['method_find', 'method_update', 'method_delete', 'stage_match'], input: 'FILTER' },
    find_option: { types: ['method_find'], input: 'OPTIONS' },
    stage_match: { types: ['method_aggregate'], input: 'STAGES' },
    stage_project: { types: ['method_aggregate'], input: 'STAGES' },
    stage_group: { types: ['method_aggregate'], input: 'STAGES' },
    stage_sort: { types: ['method_aggregate'], input: 'STAGES' },
    stage_limit: { types: ['method_aggregate'], input: 'STAGES' },
    stage_skip: { types: ['method_aggregate'], input: 'STAGES' },
    stage_unwind: { types: ['method_aggregate'], input: 'STAGES' },
    stage_count: { types: ['method_aggregate'], input: 'STAGES' },
    project_field: { types: ['stage_project'], input: 'FIELDS' },
    accumulator: { types: ['stage_group'], input: 'ACCUMULATORS' },
    document_field: { types: ['method_insert'], input: 'FIELDS' },
    update_field: { types: ['method_update'], input: 'UPDATES' },
  };
  const target = targets[type];
  if (!target || !block.previousConnection) return false;

  const container = workspace.getAllBlocks(false).find((candidate) => target.types.includes(candidate.type));
  if (!container) return false;
  const existing = container.getInputTargetBlock(target.input);
  if (existing) {
    let tail = existing;
    while (tail.getNextBlock()) tail = tail.getNextBlock()!;
    if (!tail.nextConnection) return false;
    tail.nextConnection.connect(block.previousConnection);
    return true;
  }
  const inputConnection = container.getInput(target.input)?.connection;
  if (!inputConnection) return false;
  inputConnection.connect(block.previousConnection);
  return true;
}

export default function MongoBlocksApp() {
  const workspaceHostRef = useRef<HTMLDivElement | null>(null);
  const [workspace, setWorkspace] = useState<Blockly.WorkspaceSvg | null>(null);
  const [ast, setAst] = useState<QueryAST | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [results, setResults] = useState<unknown[] | null>(null);
  const [meta, setMeta] = useState<ExecutionMeta | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = window.localStorage.getItem('mongoblocks-history');
    return stored ? JSON.parse(stored) as HistoryItem[] : [];
  });
  const [loading, setLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explain, setExplain] = useState<ExplainFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLibrary, setActiveLibrary] = useState('Start');
  const [activePanel, setActivePanel] = useState<'query' | 'results'>('query');

  const onWorkspaceChange = useCallback((currentWorkspace: Blockly.WorkspaceSvg) => {
    const nextAst = parseWorkspaceToAST(currentWorkspace);
    setAst((previous) => JSON.stringify(previous) === JSON.stringify(nextAst) ? previous : nextAst);
    setIssues(nextAst ? validateQueryAST(nextAst) : [{ path: 'root', message: 'Connect db, a collection, and an operation to begin.' }]);
  }, []);

  useEffect(() => {
    const host = workspaceHostRef.current;
    if (!host) return;

    defineBlocks();
    const injectedWorkspace = Blockly.inject(host, {
      renderer: 'zelos',
      grid: { spacing: 22, length: 3, colour: '#cbd5e1', snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.3, minScale: 0.6 },
      toolbox: { kind: 'flyoutToolbox', contents: [] },
    });
    const root = injectedWorkspace.newBlock('db_root');
    root.initSvg();
    root.render();
    root.moveBy(56, 64);
    const handleChange = () => onWorkspaceChange(injectedWorkspace);
    injectedWorkspace.addChangeListener(handleChange);
    setWorkspace(injectedWorkspace);
    handleChange();

    return () => {
      injectedWorkspace.removeChangeListener(handleChange);
      injectedWorkspace.dispose();
      setWorkspace(null);
    };
  }, [onWorkspaceChange]);

  const resetWorkspace = () => {
    if (!workspace) return;
    workspace.clear();
    const root = workspace.newBlock('db_root');
    root.initSvg();
    root.render();
    root.moveBy(56, 64);
    setResults(null);
    setMeta(null);
    setError(null);
    setExplain(null);
    setActivePanel('query');
  };

  const addBlock = (type: string) => {
    if (!workspace) return;
    const block = workspace.newBlock(type);
    block.initSvg();
    block.render();
    if (connectToCompatibleContainer(workspace, block, type)) return;
    const metrics = workspace.getMetrics();
    const size = block.getHeightWidth();
    block.moveBy(metrics.viewLeft + metrics.viewWidth / 2 - size.width / 2, metrics.viewTop + 100);
  };

  const runQuery = async () => {
    if (!ast || issues.length) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ast) });
      const payload = await response.json() as { data?: unknown[]; meta?: ExecutionMeta; error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error ?? 'The query could not be executed.');
      setResults(payload.data ?? []);
      setMeta(payload.meta ?? null);
      setActivePanel('results');
      const item = { operation: ast.operation, collection: ast.collection, savedAt: new Date().toLocaleTimeString() };
      setHistory((previous) => {
        const next = [item, ...previous].slice(0, 5);
        window.localStorage.setItem('mongoblocks-history', JSON.stringify(next));
        return next;
      });
    } catch (caught) {
      setResults(null);
      setMeta(null);
      setError(caught instanceof Error ? caught.message : 'The query could not be executed.');
      setActivePanel('results');
    } finally {
      setLoading(false);
    }
  };

  const inspectIndexes = async () => {
    if (!ast || ast.operation !== 'find' || issues.length) return;
    setExplainLoading(true);
    try {
      const response = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ast) });
      const payload = await response.json() as ExplainFeedback & { error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error ?? 'Could not inspect the query plan.');
      setExplain(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not inspect the query plan.');
    } finally {
      setExplainLoading(false);
    }
  };

  const code = generateMongoCode(ast);
  const selectedLibrary = blockLibrary.find((category) => category.name === activeLibrary) ?? blockLibrary[0];
  const concept = ast?.operation === 'aggregate'
    ? 'Aggregation transforms documents in ordered stages. Add each stage to the vertical pipeline.'
    : ast?.operation === 'find'
      ? 'Find returns matching documents. Nest AND, OR, and NOT blocks to make a filter tree.'
      : ast?.operation
        ? 'Write operations are restricted to sandbox, so you can practise safely.'
        : 'Start with db, choose a collection, and add an operation.';

  return (
    <div className="flex h-screen min-h-[680px] flex-col bg-slate-50 text-slate-800">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white">M</div><div><h1 className="font-semibold tracking-tight">MongoBlocks</h1><p className="text-xs text-slate-500">Visual MongoDB learning studio</p></div></div>
        <div className="flex items-center gap-2 text-sm"><button onClick={resetWorkspace} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50"><RotateCcw size={15} /> Reset</button><button onClick={runQuery} disabled={!ast || issues.length > 0 || loading} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"><Play size={15} />{loading ? 'Running...' : 'Run query'}</button></div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)_380px]">
        <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 bg-white p-4"><div className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-amber-500" /> Block library</div><p className="mt-1 text-xs leading-4 text-slate-500">Choose a category, then add a block. Compatible blocks snap in automatically.</p></div>
          <div className="grid grid-cols-2 gap-1 border-b border-slate-200 bg-white p-2">{blockLibrary.map((category) => <button key={category.name} onClick={() => setActiveLibrary(category.name)} className={'rounded px-2 py-1.5 text-left text-xs font-medium transition ' + (activeLibrary === category.name ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50')}><span className={'mr-1.5 inline-block h-2 w-2 rounded-full ' + category.colour} />{category.name}</button>)}</div>
          <div className="overflow-auto p-3"><h2 className="mb-2 text-sm font-semibold text-slate-700">{selectedLibrary.name}</h2><div className="space-y-2">{selectedLibrary.blocks.map((item) => <button key={item.type} onClick={() => addBlock(item.type)} className="group flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"><span className={'h-7 w-1 rounded-full ' + selectedLibrary.colour} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-700">{item.label}</span><span className="block truncate text-xs text-slate-500">{item.description}</span></span><Plus size={15} className="text-slate-400 group-hover:text-emerald-600" /></button>)}</div></div>
          <div className="mt-auto border-t border-slate-200 p-3 text-xs leading-5 text-slate-500">Blocks appear in the centre. Drag them into matching connectors.</div>
        </aside>

        <section className="mongoblocks-workspace relative min-h-0 border-r border-slate-200 bg-white">
          <div className="absolute left-5 top-4 z-10 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm"><Sparkles className="mr-1 inline text-amber-500" size={14} /> Build from top to bottom. C-shaped blocks hold nested logic and stages.</div>
          <div ref={workspaceHostRef} className="h-full w-full" />
        </section>

        <aside className="flex min-h-0 flex-col bg-white">
          <div className="flex border-b border-slate-200 px-4 pt-3"><button onClick={() => setActivePanel('query')} className={'border-b-2 px-3 pb-3 text-sm font-medium ' + (activePanel === 'query' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500')}>Query</button><button onClick={() => setActivePanel('results')} className={'border-b-2 px-3 pb-3 text-sm font-medium ' + (activePanel === 'results' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500')}>Results{meta ? ' (' + meta.count + ')' : ''}</button></div>
          {activePanel === 'query' ? <div className="min-h-0 flex-1 overflow-auto"><section className="border-b border-slate-200"><div className="flex items-center justify-between px-4 py-3"><span className="inline-flex items-center gap-2 font-semibold"><Database size={16} className="text-emerald-600" /> Generated MongoDB</span><span className="text-xs text-slate-500">{ast?.collection ?? 'No collection'}</span></div><pre className="max-h-56 overflow-auto border-y border-emerald-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800">{code}</pre></section><section className="p-4"><h2 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold"><BookOpen size={16} className="text-indigo-500" /> What this query teaches</h2><p className="text-sm leading-5 text-slate-600">{concept}</p>{issues.length > 0 && <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{issues[0].message}</div>}</section><details className="border-t border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700"><Lightbulb className="mr-2 inline text-amber-500" size={15} /> Practice challenges</summary><div className="mt-3 space-y-2">{challenges.map((challenge) => <div key={challenge.title} className="rounded border border-slate-100 bg-slate-50 p-2 text-xs"><div className="font-medium text-slate-700">{challenge.complete(ast) ? 'Complete: ' : ''}{challenge.title}</div><p className="mt-0.5 text-slate-500">{challenge.text}</p></div>)}</div></details></div> : <div className="min-h-0 flex-1 overflow-auto"><section className="p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Execution results</h2>{meta && <span className="text-xs text-slate-500">{meta.count} results · {meta.durationMs} ms</span>}</div>{error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{!error && results && <pre className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">{JSON.stringify(results, null, 2)}</pre>}{!error && !results && <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Run a complete query to inspect returned documents.</div>}</section><details className="border-t border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700"><Search className="mr-2 inline text-indigo-500" size={15} /> Index lab</summary><div className="mt-3">{explain ? <div className="rounded border border-indigo-100 bg-indigo-50 p-2 text-xs leading-5 text-indigo-900">{explain.summary}<div className="mt-1 text-indigo-700">Documents examined: {explain.examinedDocuments ?? '—'} · Keys examined: {explain.examinedKeys ?? '—'}</div></div> : <p className="text-xs text-slate-500">Use a students field such as major or contact.city.</p>}<button onClick={inspectIndexes} disabled={!ast || ast.operation !== 'find' || issues.length > 0 || explainLoading} className="mt-3 rounded border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 disabled:opacity-40">{explainLoading ? 'Inspecting...' : 'Explain find query'}</button></div></details><details className="border-t border-slate-200 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-700"><Save className="mr-2 inline text-indigo-500" size={15} /> Recent queries</summary><div className="mt-3">{history.length ? <ul className="space-y-2">{history.map((item, index) => <li key={index} className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">{item.collection}.{item.operation} <span className="float-right text-slate-400">{item.savedAt}</span></li>)}</ul> : <p className="text-xs text-slate-500">Completed queries are saved on this device.</p>}</div></details></div>}
        </aside>
      </main>
    </div>
  );
}
