import { Bookmark, ChevronsLeft, ChevronsRight, Plus, Trash2 } from 'lucide-react';

export default function Sidebar({
  parcels,
  selectedId,
  onSelectParcel,
  isOpen,
  setIsOpen,
  onNewBoundary,
  onDeleteParcel,
}) {
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 left-4 z-20 p-2.5 rounded-xl bg-[#0d141f]/95 border border-slate-800 text-slate-300 hover:text-white shadow-xl"
      >
        <ChevronsRight className="w-4 h-4" />
      </button>
    );
  }

  return (
    <aside className="fixed top-20 bottom-4 left-4 w-64 z-20 bg-[#0d141f]/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-2xl">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Bookmark className="w-4 h-4 text-slate-400" />
            <span>Saved Fields</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Registry Subheader */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
            Active Registry
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {parcels.length} Parcels
          </span>
        </div>

        {/* Parcel List */}
        <div className="space-y-1.5">
          {parcels.map((parcel) => {
            const isSelected = parcel.id === selectedId;
            return (
              <div
                key={parcel.id}
                className={`flex items-center rounded-xl text-xs transition-all ${
                  isSelected
                    ? 'bg-emerald-400 text-slate-950 font-semibold shadow-md shadow-emerald-500/10'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <button
                  onClick={() => onSelectParcel(parcel)}
                  className="flex min-w-0 flex-1 items-center justify-between px-3 py-2.5 text-left"
                >
                  <span className="truncate">{parcel.name}</span>
                  <span
                    className={`ml-2 shrink-0 font-mono text-[11px] ${
                      isSelected ? 'text-slate-900 font-bold' : 'text-emerald-400'
                    }`}
                  >
                    {parcel.acres.toFixed(1)} ac
                  </span>
                </button>
                <button
                  onClick={() => onDeleteParcel(parcel)}
                  aria-label={`Delete ${parcel.name}`}
                  title={`Delete ${parcel.name}`}
                  className={`mr-1 rounded-lg p-2 transition hover:bg-red-500/20 hover:text-red-300 ${
                    isSelected ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Primary CTA */}
      <button
        onClick={onNewBoundary}
        className="w-full py-3 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>New Field Boundary</span>
      </button>
    </aside>
  );
}