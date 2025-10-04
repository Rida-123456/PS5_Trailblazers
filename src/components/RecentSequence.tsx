import { ColorInfo } from '../types';

interface RecentSequenceProps {
  sequence: string[];
  colorMap: { [key: string]: ColorInfo };
}

export default function RecentSequence({ sequence, colorMap }: RecentSequenceProps) {
  return (
    <div className="px-6 py-4 bg-gray-800 border-b border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-3">Recent Released Car Sequence</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sequence.length === 0 ? (
          <div className="text-gray-500 text-sm">No cars released yet</div>
        ) : (
          sequence.map((color, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 transition-all duration-300 hover:scale-110"
              style={{ animation: `slideIn 0.3s ease-out` }}
            >
              <div
                className="w-12 h-12 rounded-lg shadow-lg border-2 border-gray-600"
                style={{ backgroundColor: colorMap[color]?.hex }}
                title={colorMap[color]?.name}
              />
              <div className="text-xs text-center text-gray-400 mt-1">{color}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
