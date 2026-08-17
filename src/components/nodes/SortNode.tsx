import { Handle, Position } from '@xyflow/react';
import useFlowStore from '@/store/flowStore';

export default function SortNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  return (
    <div className="bg-white border-2 border-purple-500 rounded-md p-4 min-w-[200px] shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      
      <div className="font-bold text-purple-700 mb-2 border-b pb-1">$sort</div>
      
      <div className="flex gap-2">
        <input 
          type="text" 
          placeholder="Field" 
          className="border rounded p-1 text-sm w-2/3 bg-gray-50"
          value={data.sortField || ''}
          onChange={(e) => updateNodeData(id, { sortField: e.target.value })}
        />
        <select 
          className="border rounded p-1 text-sm w-1/3 bg-gray-50"
          value={data.sortDirection || 1}
          onChange={(e) => updateNodeData(id, { sortDirection: parseInt(e.target.value) as 1 | -1 })}
        >
          <option value={1}>ASC</option>
          <option value={-1}>DESC</option>
        </select>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500" />
    </div>
  );
}
