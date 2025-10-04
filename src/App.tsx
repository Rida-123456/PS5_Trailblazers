import { useEffect, useState } from 'react';
import Header from './components/Header';
import Controls from './components/Controls';
import RecentSequence from './components/RecentSequence';
import OvenCard from './components/OvenCard';
import BufferLine from './components/BufferLine';
import MainConveyor from './components/MainConveyor';
import KPIPanel from './components/KPIPanel';
import { LiveStatus, ColorInfo } from './types';

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [colorMap, setColorMap] = useState<{ [key: string]: ColorInfo }>({});

  useEffect(() => {
    fetch(`${API_BASE}/colors`)
      .then(res => res.json())
      .then(data => setColorMap(data))
      .catch(err => console.error('Failed to fetch colors:', err));
  }, []);

  useEffect(() => {
    const fetchStatus = () => {
      fetch(`${API_BASE}/live_status`)
        .then(res => res.json())
        .then(data => setStatus(data))
        .catch(err => console.error('Failed to fetch status:', err));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    try {
      await fetch(`${API_BASE}/start`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to start simulation:', err);
    }
  };

  const handlePause = async () => {
    try {
      await fetch(`${API_BASE}/pause`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to pause simulation:', err);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${API_BASE}/reset`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    }
  };

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const oven1Lines = ['L1', 'L2', 'L3', 'L4'];
  const oven2Lines = ['L5', 'L6', 'L7', 'L8', 'L9'];

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <Controls
        isRunning={status.is_running}
        isPaused={status.is_paused}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
      />

      <RecentSequence sequence={status.recent_sequence} colorMap={colorMap} />

      <KPIPanel kpis={status.kpis} />

      <div className="p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-2 space-y-4">
            <OvenCard id="Oven 1" oven={status.ovens.O1} lines={oven1Lines} />
            <OvenCard id="Oven 2" oven={status.ovens.O2} lines={oven2Lines} />
          </div>

          <div className="col-span-7">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white mb-4">Buffer Lines</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm text-gray-400 mb-2">Oven 1 Lines</h4>
                  <div className="space-y-3">
                    {oven1Lines.map(lineId => (
                      <BufferLine
                        key={lineId}
                        id={lineId}
                        line={status.lines[lineId]}
                        colorMap={colorMap}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm text-gray-400 mb-2">Oven 2 Lines</h4>
                  <div className="space-y-3">
                    {oven2Lines.map(lineId => (
                      <BufferLine
                        key={lineId}
                        id={lineId}
                        line={status.lines[lineId]}
                        colorMap={colorMap}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-3">
            <MainConveyor mainLine={status.main_line} colorMap={colorMap} />
          </div>
        </div>
      </div>
    </div>
  );
}
