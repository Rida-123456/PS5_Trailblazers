import { User, LogOut } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold text-white">TATA MOTORS</div>

        <div className="text-2xl font-bold text-white tracking-wide">
          Color Sequencing Dashboard
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <User size={20} />
            <span className="text-sm">Admin</span>
          </button>
          <button className="flex items-center gap-2 text-gray-300 hover:text-red-400 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
