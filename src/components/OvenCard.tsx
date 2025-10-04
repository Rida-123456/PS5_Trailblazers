import { Flame, AlertCircle } from 'lucide-react';
import { Oven } from '../types';

interface OvenCardProps {
  id: string;
  oven: Oven;
  lines: string[];
}

export default function OvenCard({ id, oven, lines }: OvenCardProps) {
  const isActive = oven.status === 'active';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{id}</h3>
        <div className={`p-2 rounded-full ${isActive ? 'bg-green-900' : 'bg-red-900'}`}>
          {isActive ? (
            <Flame className="text-green-400" size={24} />
          ) : (
            <AlertCircle className="text-red-400" size={24} />
          )}
        </div>
      </div>

      <div className={`text-sm font-medium mb-2 ${isActive ? 'text-green-400' : 'text-red-400'}`}>
        {isActive ? 'Active' : 'Stopped'}
      </div>

      <div className="text-xs text-gray-400">
        <div className="mb-1">Feeds Lines:</div>
        <div className="flex gap-1 flex-wrap">
          {lines.map(line => (
            <span key={line} className="px-2 py-1 bg-gray-700 rounded text-gray-300">
              {line}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
