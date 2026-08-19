import { Handle, Position } from '@xyflow/react';
import useFlowStore from '@/store/flowStore';

export default function MethodNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  return (
    <div className="bg-white border-2 border-red-500 rounded-md p-4 min-w-[200px] shadow-sm text-center">
      {/* Input from Collection */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      
      <div className="font-mono font-bold text-red-700 mb-2 border-b pb-1 flex items-center justify-center gap-1">
        <span>.</span>
        <select 
          className="border-none outline-none bg-transparent cursor-pointer text-lg font-bold"
          value={data.method || 'find'}
          onChange={(e) => updateNodeData(id, { method: e.target.value })}
        >
          <option value="find">find()</option>
          <option value="aggregate">aggregate()</option>
        </select>
      </div>

      <div className="text-xs text-gray-500 text-left">Connect Arguments:</div>

      {/* Output to Stages/Filters */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-red-500" />
    </div>
  );
}
