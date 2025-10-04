import { Play, Pause, RotateCcw } from 'lucide-react';

interface ControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export default function Controls({ isRunning, isPaused, onStart, onPause, onReset }: ControlsProps) {
  return (
    <div className="flex gap-4 px-6 py-4 bg-gray-800">
      <button
        onClick={onStart}
        disabled={isRunning && !isPaused}
        className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        <Play size={20} />
        {isRunning && !isPaused ? 'Running' : 'Start Simulation'}
      </button>

      <button
        onClick={onPause}
        disabled={!isRunning || isPaused}
        className="flex items-center gap-2 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        <Pause size={20} />
        {isPaused ? 'Paused' : 'Pause'}
      </button>

      <button
        onClick={onReset}
        className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
      >
        <RotateCcw size={20} />
        Reset
      </button>
    </div>
  );
}
