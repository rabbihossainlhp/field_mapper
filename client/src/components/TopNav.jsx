import { MapPin, Search, Layers, Compass, User, ArrowLeftRight } from 'lucide-react';

export default function TopNav({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onSearch,
  locationName,
}) {
  const navTabs = ['Map', 'Editor', 'Layers', 'Telemetry'];

  return (
    <header className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
      {/* Left: Brand, Search Pill & Active Location Badge */}
      <div className="relative flex items-center bg-[#0f1722]/90 backdrop-blur-md border border-slate-800/80 rounded-full px-4 py-2 shadow-2xl pointer-events-auto w-[370px]">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700/70">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-white font-semibold text-sm tracking-tight">FieldBoundary</span>
        </div>

        <div className="flex items-center gap-2 pl-3 flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <form
            className="flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              onSearch();
            }}
          >
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, village, or lat, lng..."
              aria-label="Search fields, places, or coordinates"
              className="bg-transparent text-xs text-slate-200 placeholder-slate-400 focus:outline-none w-full"
            />
          </form>
        </div>

        {locationName && (
          <div
            title={locationName}
            className="absolute left-0 top-[3.1rem] max-w-[370px] truncate rounded-full border border-slate-700/80 bg-[#0f1722]/95 px-3.5 py-1.5 text-[11px] font-medium text-slate-200 shadow-lg"
          >
            <MapPin className="mr-1.5 inline h-3.5 w-3.5 text-emerald-400" />
            {locationName}
          </div>
        )}
      </div>

      {/* Center: Mode Switcher Pill */}
      <div className="hidden md:flex items-center gap-1 bg-[#0f1722]/90 backdrop-blur-md border border-slate-800/80 rounded-full p-1.5 shadow-2xl pointer-events-auto">
        {navTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === tab
                ? 'bg-emerald-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="h-4 w-[1px] bg-slate-700 mx-1" />
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white">
          <span>Points</span>
          <ArrowLeftRight className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Right: Utility & Profile Icons */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button className="w-9 h-9 rounded-full bg-[#0f1722]/90 backdrop-blur-md border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white shadow-lg">
          <Layers className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 rounded-full bg-[#0f1722]/90 backdrop-blur-md border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white shadow-lg">
          <Compass className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 rounded-full bg-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-lg hover:bg-emerald-300 transition">
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}