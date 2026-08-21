'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Blockly from 'blockly/core';
import { BlocklyWorkspace } from 'react-blockly';
import 'blockly/blocks';
import { defineBlocks } from '@/lib/blocks';
import { parseWorkspaceToAST } from '@/lib/blocklyParser';
import { generateMongoCode } from '@/lib/codeGenerator';

// Register custom blocks
if (typeof window !== 'undefined') {
  defineBlocks();
}

const toolboxCategories = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Roots',
      colour: '230',
      contents: [
        { kind: 'block', type: 'db_root' },
        { kind: 'block', type: 'collection' }
      ]
    },
    {
      kind: 'category',
      name: 'Methods',
      colour: '345',
      contents: [
        { kind: 'block', type: 'method_find' }
      ]
    },
    {
      kind: 'category',
      name: 'Filters & Logic',
      colour: '120',
      contents: [
        { kind: 'block', type: 'match_filter' },
        { kind: 'block', type: 'logic_branch' }
      ]
    }
  ]
};

export default function MongoBlocksApp() {
  const [workspace, setWorkspace] = useState<Blockly.WorkspaceSvg | null>(null);
  const [ast, setAst] = useState<any | null>(null);
  const [code, setCode] = useState<string>('{}');
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onWorkspaceChange = React.useCallback((ws: Blockly.WorkspaceSvg) => {
    const newAst = parseWorkspaceToAST(ws);
    
    setAst((prevAst: any) => {
      // Prevent infinite update loops by only updating if the parsed AST actually changed
      if (JSON.stringify(newAst) !== JSON.stringify(prevAst)) {
        setCode(generateMongoCode(newAst));
        return newAst;
      }
      return prevAst;
    });
  }, []);

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
    <div className="flex h-screen w-full bg-gray-50 flex-col font-sans">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white font-bold text-xl">
            M
          </div>
          <h1 className="font-bold text-xl text-gray-800 tracking-tight">MongoBlocks <span className="text-sm font-normal text-gray-500 ml-2">Blockly Edition</span></h1>
        </div>
      </header>
      
      <main className="flex-grow flex overflow-hidden">
        {/* Workspace Container */}
        <div className="flex-grow relative h-full">
          <BlocklyWorkspace
            toolboxConfiguration={toolboxCategories}
            initialXml={`<xml xmlns="https://developers.google.com/blockly/xml"><block type="db_root" x="50" y="50"></block></xml>`}
            className="w-full h-full"
            workspaceConfiguration={{
              renderer: 'zelos',
              grid: {
                spacing: 20,
                length: 3,
                colour: '#ccc',
                snap: true
              }
            }}
            onWorkspaceChange={onWorkspaceChange}
            onInject={(ws) => setWorkspace(ws)}
          />
        </div>

        {/* Right Panel */}
        <aside className="w-[450px] bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden text-sm shadow-xl z-20">
          <div className="flex-1 border-b flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-50 border-b font-semibold text-gray-800 flex justify-between items-center shadow-sm">
              Generated MongoDB Code
              <button 
                onClick={runQuery}
                disabled={!ast || loading}
                className="bg-green-600 text-white px-4 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm font-medium"
              >
                {loading ? 'Running...' : 'Run Query'}
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-gray-900 text-green-400 font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {code}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-50 border-b font-semibold text-gray-800 shadow-sm">
              Execution Results
            </div>
            <div className="p-4 flex-1 overflow-auto bg-white">
              {error && <div className="text-red-600 mb-2 font-mono bg-red-50 p-3 rounded border border-red-200">{error}</div>}
              {!error && results && (
                <pre className="font-mono text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-100">
                  {JSON.stringify(results, null, 2)}
                </pre>
              )}
              {!error && !results && !loading && (
                <div className="text-gray-400 text-center mt-12 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
                  Snap blocks together and hit Run Query to see results here.
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
