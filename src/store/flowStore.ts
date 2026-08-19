import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';

export type AppNodeData = {
  label?: string;
  collection?: string;
  field?: string;
  operator?: string;
  value?: string;
  limit?: number;
  sortField?: string;
  sortDirection?: 1 | -1;
  [key: string]: any; // Allow custom data fields
};

export type AppNode = Node<AppNodeData>;

export type FlowState = {
  nodes: AppNode[];
  edges: Edge[];
  activeSchemaFields: string[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodeData: (nodeId: string, data: Partial<AppNodeData>) => void;
  setActiveSchemaFields: (fields: string[]) => void;
};

const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  activeSchemaFields: [],
  onNodesChange: (changes: NodeChange<AppNode>[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  setNodes: (nodes: AppNode[]) => {
    set({ nodes });
  },
  setEdges: (edges: Edge[]) => {
    set({ edges });
  },
  updateNodeData: (nodeId: string, data: Partial<AppNodeData>) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data },
          };
        }
        return node;
      }),
    });
  },
  setActiveSchemaFields: (fields: string[]) => {
    set({ activeSchemaFields: fields });
  },
}));

export default useFlowStore;
