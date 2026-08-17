import { Handle, Position } from '@xyflow/react';
import useFlowStore from '@/store/flowStore';

export default function LimitNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  return (
    <div className="bg-white border-2 border-orange-500 rounded-md p-4 min-w-[150px] shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      
      <div className="font-bold text-orange-700 mb-2 border-b pb-1">$limit</div>
      
      <input 
        type="number" 
        placeholder="Number" 
        className="border rounded p-1 text-sm w-full bg-gray-50"
        value={data.limit || 10}
        onChange={(e) => updateNodeData(id, { limit: parseInt(e.target.value) || 0 })}
      />

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-500" />
    </div>
  );
}
