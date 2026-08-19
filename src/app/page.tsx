'use client';

import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Panel,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useFlowStore from '@/store/flowStore';
import DBNode from '@/components/nodes/DBNode';
import CollectionNode from '@/components/nodes/CollectionNode';
import MethodNode from '@/components/nodes/MethodNode';
import LogicNode from '@/components/nodes/LogicNode';
import MatchNode from '@/components/nodes/MatchNode';
import SortNode from '@/components/nodes/SortNode';
import LimitNode from '@/components/nodes/LimitNode';

import { parseGraphToAST } from '@/lib/parser';
import { generateMongoCode } from '@/lib/codeGenerator';
import { useState } from 'react';

const nodeTypes = {
  db: DBNode,
  collection: CollectionNode,
  method: MethodNode,
  logic: LogicNode,
  match: MatchNode,
  sort: SortNode,
  limit: LimitNode,
};

function RightPanel() {
  const { nodes, edges } = useFlowStore();
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ast = useMemo(() => parseGraphToAST(nodes, edges), [nodes, edges]);
  const code = useMemo(() => generateMongoCode(ast), [ast]);

  const runQuery = async () => {
    if (!ast) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ast)
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setResults(null);
      } else {
        setResults(data.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="w-96 bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden text-sm">
      <div className="flex-1 border-b flex flex-col overflow-hidden">
        <div className="p-3 bg-gray-100 border-b font-semibold text-gray-700 flex justify-between items-center">
          Generated Code
          <button 
            onClick={runQuery}
            disabled={!ast || loading}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Query'}
          </button>
        </div>
        <div className="p-4 flex-1 overflow-auto bg-gray-900 text-green-400 font-mono text-xs whitespace-pre-wrap">
          {code}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 bg-gray-100 border-b font-semibold text-gray-700">
          Results
        </div>
        <div className="p-4 flex-1 overflow-auto bg-white">
          {error && <div className="text-red-500 mb-2 font-mono">{error}</div>}
          {!error && results && (
            <pre className="font-mono text-xs text-gray-800">
              {JSON.stringify(results, null, 2)}
            </pre>
          )}
          {!error && !results && !loading && (
            <div className="text-gray-400 text-center mt-10">Run a query to see results</div>
          )}
        </div>
      </div>
    </aside>
  );
}

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes } = useFlowStore();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 50,
      };
      
      let defaultData = {};
      if (type === 'db') defaultData = {};
      if (type === 'collection') defaultData = { collection: 'students' };
      if (type === 'method') defaultData = { method: 'find' };
      if (type === 'logic') defaultData = { operator: '$or' };
      if (type === 'match') defaultData = { field: '', operator: '$eq', value: '' };
      if (type === 'sort') defaultData = { sortField: '', sortDirection: 1 };
      if (type === 'limit') defaultData = { limit: 10 };

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: defaultData,
      };

      setNodes(nodes.concat(newNode));
    },
    [nodes, setNodes]
  );

  return (
    <div className="flex-grow h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto">
      <h2 className="font-bold text-lg text-gray-700 border-b pb-2">Syntax Blocks</h2>
      
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase">1. Database Root</h3>
        <div 
          className="bg-gray-800 text-white rounded p-2 text-center cursor-grab hover:shadow-md transition-shadow font-mono"
          onDragStart={(event) => onDragStart(event, 'db')}
          draggable
        >
          db
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase">2. Collections</h3>
        <div 
          className="bg-white border border-blue-300 rounded p-2 text-center cursor-grab hover:shadow-md transition-shadow font-mono text-blue-700"
          onDragStart={(event) => onDragStart(event, 'collection')}
          draggable
        >
          .collection
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase">3. Methods</h3>
        <div 
          className="bg-white border border-red-300 rounded p-2 text-center cursor-grab hover:shadow-md transition-shadow font-mono text-red-700"
          onDragStart={(event) => onDragStart(event, 'method')}
          draggable
        >
          .method()
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase">4. Stages & Logic</h3>
        <div 
          className="bg-white border border-indigo-300 rounded p-2 text-center cursor-grab hover:shadow-md transition-shadow font-mono text-indigo-700"
          onDragStart={(event) => onDragStart(event, 'logic')}
          draggable
        >
          $or / $and Branch
        </div>
        <div 
          className="bg-white border border-green-300 rounded p-2 text-center cursor-grab hover:shadow-md transition-shadow"
          onDragStart={(event) => onDragStart(event, 'match')}
          draggable
        >
          $match Filter
        </div>
        <div 
          className="bg-white border border-purple-300 rounded p-2 text-center cursor-grab hover:shadow-md transition-shadow"
          onDragStart={(event) => onDragStart(event, 'sort')}
          draggable
        >
          $sort Modifier
        </div>
        <div 
          className="bg-white border border-orange-300 rounded p-2 text-center cursor-grab hover:shadow-md transition-shadow"
          onDragStart={(event) => onDragStart(event, 'limit')}
          draggable
        >
          $limit Modifier
        </div>
      </div>
    </aside>
  );
}

export default function MongoBlocksApp() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-black">
      <Sidebar />
      <main className="flex-1 h-full flex">
        <ReactFlowProvider>
          <Flow />
          <RightPanel />
        </ReactFlowProvider>
      </main>
    </div>
  );
}
