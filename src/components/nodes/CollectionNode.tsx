import { Handle, Position } from '@xyflow/react';
import useFlowStore from '@/store/flowStore';
import { useEffect } from 'react';

const SCHEMA_FIELDS = {
  students: ['name', 'age', 'major', 'gpa', 'contact.email', 'contact.phone', 'courses'],
  movies: ['title', 'year', 'director', 'genres', 'imdb.rating', 'imdb.votes']
};

export default function CollectionNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const setActiveSchemaFields = useFlowStore((state) => state.setActiveSchemaFields);

  const collection = data.collection || 'students';

  useEffect(() => {
    setActiveSchemaFields(SCHEMA_FIELDS[collection as keyof typeof SCHEMA_FIELDS] || []);
  }, [collection, setActiveSchemaFields]);

  return (
    <div className="bg-white border-2 border-blue-500 rounded-md p-4 min-w-[200px] shadow-sm">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400" />
      <div className="font-bold text-blue-700 mb-2 border-b pb-1">.collection</div>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 font-semibold">Select Dataset</label>
        <select 
          className="border rounded p-1 text-sm bg-gray-50"
          value={collection}
          onChange={(e) => updateNodeData(id, { collection: e.target.value })}
        >
          <option value="students">Students</option>
          <option value="movies">Movies</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}
