import { Plus, Minus, Compass } from 'lucide-react';

export default function MapControls({ onZoomIn, onZoomOut, onLocate }) {
  return (
    <div className="fixed bottom-4 right-4 z-20 flex flex-col items-end gap-3">
      {/* Vertical Control Stack */}
      <div className="flex flex-col bg-[#0d141f]/95 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <button
          onClick={onZoomIn}
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 border-b border-slate-800 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 border-b border-slate-800 cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onLocate}
          title="Go to my location"
          className="p-2.5 text-emerald-400 hover:bg-slate-800 cursor-pointer"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}