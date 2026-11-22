import { Plus, Minus, Compass, Ruler, MapPin, Satellite } from 'lucide-react';

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onLocate,
  isMeasuring,
  onToggleMeasure,
  showPlaceLabels,
  onTogglePlaceLabels,
  mapMode = 'satellite',
  onToggleMapMode,
}) {
  return (
    <div className="fixed bottom-4 right-4 z-20 flex flex-col items-end gap-3">
      <div className="flex flex-col bg-[#0d141f]/95 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom in"
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 border-b border-slate-800 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom out"
          className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 border-b border-slate-800 cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onLocate}
          title="Go to my location"
          className="p-2.5 text-emerald-400 hover:bg-slate-800 cursor-pointer"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Switch Satellite / Street Map */}
      <button
        type="button"
        onClick={onToggleMapMode}
        title={mapMode === 'satellite' ? 'Switch to Street Map' : 'Switch to Satellite + Labels'}
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition cursor-pointer ${
          mapMode === 'satellite'
            ? 'bg-emerald-500 text-slate-950'
            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
        }`}
      >
        <Satellite className="w-4 h-4" />
      </button>

      {/* Toggle Place Labels */}
      <button
        type="button"
        onClick={onTogglePlaceLabels}
        title={showPlaceLabels ? 'Hide place labels' : 'Show place labels'}
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition cursor-pointer ${
          showPlaceLabels
            ? 'bg-sky-400 text-slate-950'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
      >
        <MapPin className="w-4 h-4" />
      </button>

      {/* Draggable Measurement Scale Toggle */}
      <button
        type="button"
        onClick={onToggleMeasure}
        title={isMeasuring ? 'Hide measurement scale' : 'Show draggable measurement scale'}
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition cursor-pointer ${
          isMeasuring
            ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-200'
            : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
        }`}
      >
        <Ruler className="w-4 h-4" />
      </button>
    </div>
  );
}