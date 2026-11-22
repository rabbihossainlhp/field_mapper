import { Plus, Minus, Compass, Ruler } from 'lucide-react';

export default function MapControls({ onZoomIn, onZoomOut, onResetZoom }) {
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
          onClick={onResetZoom}
          className="p-2.5 text-emerald-400 hover:bg-slate-800 cursor-pointer"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Measure Tool Button */}
      <button className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg hover:bg-emerald-300 transition cursor-pointer">
        <Ruler className="w-4 h-4" />
      </button>

      {/* Scale Bar */}
      <div className="px-3 py-1.5 rounded-lg bg-[#0d141f]/90 border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-2">
        <span>0</span>
        <div className="w-12 h-1 bg-emerald-400 rounded-full" />
        <span>100m</span>
        <span className="text-slate-500">330ft</span>
      </div>
    </div>
  );
}