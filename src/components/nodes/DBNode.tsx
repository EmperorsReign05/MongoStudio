import { Handle, Position } from '@xyflow/react';

export default function DBNode({ id, data }: { id: string, data: any }) {
  return (
    <div className="bg-gray-800 text-white border-2 border-gray-900 rounded-md p-4 min-w-[150px] shadow-lg text-center font-mono">
      <div className="font-bold text-xl">db</div>
      <div className="text-xs text-gray-400 mt-1">Database Root</div>
      
      {/* Output handle to connect to a Collection */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-900" />
    </div>
  );
}
