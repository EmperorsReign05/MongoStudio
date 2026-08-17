import { Handle, Position } from '@xyflow/react';
import useFlowStore from '@/store/flowStore';

export default function MatchNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  return (
    <div className="bg-white border-2 border-green-500 rounded-md p-4 min-w-[250px] shadow-sm">
      {/* Input from previous stage */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      
      <div className="font-bold text-green-700 mb-2 border-b pb-1">$match Filter</div>
      
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Field (e.g. age)" 
            className="border rounded p-1 text-sm w-1/2 bg-gray-50"
            value={data.field || ''}
            onChange={(e) => updateNodeData(id, { field: e.target.value })}
          />
          <select 
            className="border rounded p-1 text-sm w-1/4 bg-gray-50"
            value={data.operator || '$eq'}
            onChange={(e) => updateNodeData(id, { operator: e.target.value })}
          >
            <option value="$eq">=</option>
            <option value="$gt">&gt;</option>
            <option value="$lt">&lt;</option>
            <option value="$gte">&ge;</option>
            <option value="$lte">&le;</option>
            <option value="$ne">!=</option>
          </select>
          <input 
            type="text" 
            placeholder="Value" 
            className="border rounded p-1 text-sm w-1/4 bg-gray-50"
            value={data.value || ''}
            onChange={(e) => updateNodeData(id, { value: e.target.value })}
          />
        </div>
      </div>

      {/* Output to next stage */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
    </div>
  );
}
