import { Handle, Position } from '@xyflow/react';
import useFlowStore from '@/store/flowStore';

export default function LogicNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  return (
    <div className="bg-white border-2 border-indigo-500 rounded-md p-4 min-w-[200px] shadow-sm text-center">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      
      <div className="font-mono font-bold text-indigo-700 mb-2 border-b pb-1 flex items-center justify-center gap-1">
        <select 
          className="border-none outline-none bg-transparent cursor-pointer text-lg font-bold"
          value={data.operator || '$or'}
          onChange={(e) => updateNodeData(id, { operator: e.target.value })}
        >
          <option value="$or">$or</option>
          <option value="$and">$and</option>
        </select>
      </div>

      <div className="text-xs text-gray-500">Connect multiple filters below:</div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500" />
    </div>
  );
}
