import { X, Check, SlidersHorizontal, Undo2, CheckCircle2 } from 'lucide-react';

const CROP_TYPES = ['Barley', 'Wheat', 'Hay / Pasture', 'Fallow'];

export default function BottomInspector({
  parcel,
  onUpdateField,
  isEditing,
  setIsEditing,
  onUndo,
  onReset,
  onSave,
}) {
  return (
    <div className="fixed bottom-4 left-72 right-24 z-20 flex justify-center pointer-events-none">
      <div className="w-full max-w-2xl bg-[#0d141f]/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-5 shadow-2xl pointer-events-auto">
        {/* Top Row: Area & Unit Pills */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1">
              Total Computed Area
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400 tracking-tight">
                {parcel.displayAcres}
              </span>
              <span className="text-sm font-medium text-slate-300">Acres</span>
            </div>
          </div>

          {/* Metric Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
              Hectares: <span className="text-slate-200 font-semibold">{parcel.hectares} ha</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
              Metric: <span className="text-slate-200 font-semibold">{parcel.sqMeters} m²</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
              Perimeter: <span className="text-slate-200 font-semibold">{parcel.perimeter} m</span>
            </div>
          </div>
        </div>

        {/* Middle Row: Field Name Input & Crop Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={parcel.customTitle}
              onChange={(e) => onUpdateField('customTitle', e.target.value)}
              className="bg-transparent text-xs text-white font-medium focus:outline-none w-full"
            />
            {parcel.customTitle && (
              <button
                onClick={() => onUpdateField('customTitle', '')}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {CROP_TYPES.map((crop) => {
              const active = parcel.crop === crop;
              return (
                <button
                  key={crop}
                  onClick={() => onUpdateField('crop', crop)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    active
                      ? 'bg-emerald-400 text-slate-950 font-semibold'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {active && <Check className="w-3 h-3 stroke-[2.5]" />}
                  <span>{crop}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Row: Vertex Controls & Save Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 border transition cursor-pointer ${
                isEditing
                  ? 'bg-emerald-400/15 border-emerald-400 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isEditing ? 'Done Adjusting' : 'Adjust Vertices'}</span>
            </button>
            <button
              onClick={onUndo}
              title="Undo vertex move"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onSave}
              className="px-5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Field</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}