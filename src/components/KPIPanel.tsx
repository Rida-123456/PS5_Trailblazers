import { TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { KPIs } from '../types';

interface KPIPanelProps {
  kpis: KPIs;
}

export default function KPIPanel({ kpis }: KPIPanelProps) {
  return (
    <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-gray-800 border-b border-gray-700">
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-900 rounded-full">
            <TrendingUp className="text-blue-400" size={20} />
          </div>
          <div className="text-sm text-gray-400">Jobs per Hour</div>
        </div>
        <div className="text-3xl font-bold text-white">{kpis.jph.toFixed(1)}</div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-900 rounded-full">
            <Package className="text-green-400" size={20} />
          </div>
          <div className="text-sm text-gray-400">Total Cars Processed</div>
        </div>
        <div className="text-3xl font-bold text-white">{kpis.total_cars_processed}</div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-full ${kpis.active_alerts > 0 ? 'bg-red-900' : 'bg-gray-800'}`}>
            <AlertTriangle className={kpis.active_alerts > 0 ? 'text-red-400' : 'text-gray-600'} size={20} />
          </div>
          <div className="text-sm text-gray-400">Active Alerts</div>
        </div>
        <div className={`text-3xl font-bold ${kpis.active_alerts > 0 ? 'text-red-400' : 'text-white'}`}>
          {kpis.active_alerts}
        </div>
      </div>
    </div>
  );
}
