import { ArrowRight, Truck } from 'lucide-react';
import { MainLine, ColorInfo } from '../types';

interface MainConveyorProps {
  mainLine: MainLine;
  colorMap: { [key: string]: ColorInfo };
}

export default function MainConveyor({ mainLine, colorMap }: MainConveyorProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Main Conveyor</h3>

      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-400 mb-2">Feeding From:</div>
          <div className="text-2xl font-bold text-green-400">
            {mainLine.feeding_from || 'None'}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 py-6">
          {mainLine.current_car ? (
            <>
              <div className="text-center">
                <div
                  className="w-20 h-20 rounded-lg shadow-xl border-4 border-gray-600 mx-auto mb-2 animate-pulse"
                  style={{ backgroundColor: colorMap[mainLine.current_car]?.hex }}
                />
                <div className="text-sm font-semibold text-white">
                  {mainLine.current_car}
                </div>
                <div className="text-xs text-gray-400">
                  {colorMap[mainLine.current_car]?.name}
                </div>
              </div>

              <ArrowRight className="text-green-400 animate-pulse" size={32} />

              <div className="text-center">
                <Truck className="text-blue-400 w-20 h-20 mx-auto mb-2" />
                <div className="text-xs text-gray-400">Processing</div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Truck className="text-gray-600 w-20 h-20 mx-auto mb-2" />
              <div className="text-gray-500">Waiting for next car...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
