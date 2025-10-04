import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Line, ColorInfo } from '../types';

interface BufferLineProps {
  id: string;
  line: Line;
  colorMap: { [key: string]: ColorInfo };
}

export default function BufferLine({ id, line, colorMap }: BufferLineProps) {
  const getStatusIcon = () => {
    switch (line.status) {
      case 'active':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'full':
        return <AlertTriangle className="text-yellow-400" size={16} />;
      case 'unavailable':
        return <XCircle className="text-red-400" size={16} />;
    }
  };

  const getStatusColor = () => {
    switch (line.status) {
      case 'active':
        return 'border-green-500';
      case 'full':
        return 'border-yellow-500';
      case 'unavailable':
        return 'border-red-500';
    }
  };

  const fillPercentage = (line.count / line.capacity) * 100;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border-2 ${getStatusColor()} transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white font-semibold">{id}</h4>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-xs text-gray-400 uppercase">{line.status}</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{line.count} / {line.capacity}</span>
          <span>{Math.round(fillPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              line.status === 'full' ? 'bg-yellow-500' :
              line.status === 'unavailable' ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
      </div>

      <div className="min-h-[80px]">
        <div className="text-xs text-gray-400 mb-2">Cars in Buffer:</div>
        <div className="flex gap-1 flex-wrap">
          {line.cars.slice(-10).map((color, idx) => (
            <div
              key={idx}
              className="w-8 h-8 rounded border border-gray-600 shadow-sm transition-transform hover:scale-110"
              style={{ backgroundColor: colorMap[color]?.hex }}
              title={`${color} - ${colorMap[color]?.name}`}
            />
          ))}
          {line.cars.length > 10 && (
            <div className="w-8 h-8 rounded border border-gray-600 bg-gray-700 flex items-center justify-center text-xs text-gray-300">
              +{line.cars.length - 10}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
