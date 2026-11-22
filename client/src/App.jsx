import { useEffect, useRef, useState } from 'react';
import * as turf from '@turf/turf';
import { INITIAL_PARCELS } from './data/mockParcels';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import MapCanvas from './components/MapCanvas';
import BottomInspector from './components/BottomInspector';
import MapControls from './components/MapControls';
import { fieldApi } from './services/fieldApi';

function mapBackendParcel(parcel) {
  const metrics = parcel.metrics || {};
  return {
    id: parcel.id,
    code: `Parcel #${parcel.id.replace(/\D/g, '').slice(-4) || parcel.id.slice(-4)}`,
    name: parcel.name,
    customTitle: parcel.name,
    acres: metrics.acres || 0,
    displayAcres: metrics.acres || 0,
    hectares: metrics.hectares || 0,
    sqMeters: (metrics.areaSqMeters || 0).toLocaleString(),
    perimeter: metrics.perimeterMeters || 0,
    crop: parcel.category || 'Fallow',
    geojson: parcel.geojson,
    storedGeojson: parcel.geojson,
    isSaved: true,
  };
}

function applyGeojson(parcel, geojson) {
  const area = turf.area(geojson);
  const geometry = geojson.geometry || geojson;
  const perimeter = turf.length(turf.lineString(geometry.coordinates[0]), {
    units: 'meters',
  });
  const acres = Number((area * 0.0002471053814671653).toFixed(2));
  return {
    ...parcel,
    geojson,
    acres,
    displayAcres: acres,
    hectares: Number((area / 10000).toFixed(2)),
    sqMeters: Math.round(area).toLocaleString(),
    perimeter: Math.round(perimeter),
  };
}

export default function App() {
  const [parcels, setParcels] = useState(INITIAL_PARCELS);
  const [selectedId, setSelectedId] = useState(INITIAL_PARCELS[0].id);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('Map');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const activeParcel = parcels.find((parcel) => parcel.id === selectedId) || parcels[0];

  const triggerToast = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    let mounted = true;
    fieldApi
      .getParcels()
      .then((saved) => {
        if (!mounted) return;
        if (Array.isArray(saved) && saved.length) {
          const mapped = saved.map(mapBackendParcel);
          setParcels(mapped);
          setSelectedId(mapped[0].id);
        }
      })
      .catch(() => {
        if (mounted) triggerToast('Backend unavailable; showing demo fields');
      });
    return () => {
      mounted = false;
      clearTimeout(toastTimer.current);
    };
  }, []);

  const handleUpdateField = (key, value) => {
    setParcels((previous) =>
      previous.map((parcel) =>
        parcel.id === activeParcel.id ? { ...parcel, [key]: value } : parcel
      )
    );
  };

  const handleGeojsonChange = (geojson) => {
    if (!activeParcel) return;
    setHistory((previous) => [...previous, activeParcel.geojson].slice(-30));
    setParcels((previous) =>
      previous.map((parcel) =>
        parcel.id === activeParcel.id ? applyGeojson(parcel, geojson) : parcel
      )
    );
  };

  const handleDetect = async (lat, lng) => {
    try {
      triggerToast('Detecting field boundary...');
      const result = await fieldApi.detectBoundary({ lat, lng, zoom: 17 });
      const name = `Field ${parcels.length + 1}`;
      const draft = {
        id: `draft-${Date.now()}`,
        code: `Draft #${parcels.length + 1}`,
        name,
        customTitle: name,
        crop: 'Fallow',
        geojson: result.geojson,
        storedGeojson: result.geojson,
        isSaved: false,
        acres: result.metrics.acres,
        displayAcres: result.metrics.acres,
        hectares: result.metrics.hectares,
        sqMeters: result.metrics.areaSqMeters.toLocaleString(),
        perimeter: result.metrics.perimeterMeters,
      };
      setHistory([]);
      setParcels((previous) => [draft, ...previous]);
      setSelectedId(draft.id);
      setIsEditing(true);
      triggerToast('Boundary detected; adjust it before saving');
    } catch (error) {
      triggerToast(error.message || 'Boundary detection failed');
    }
  };

  const handleNewBoundary = () => {
    setIsEditing(false);
    triggerToast('Tap a field on the map to detect its boundary');
  };

  const handleReset = () => {
    if (!activeParcel?.storedGeojson) return;
    setHistory((previous) => [...previous, activeParcel.geojson].slice(-30));
    setParcels((previous) =>
      previous.map((parcel) =>
        parcel.id === activeParcel.id
          ? applyGeojson(parcel, activeParcel.storedGeojson)
          : parcel
      )
    );
    triggerToast('Boundary reset');
  };

  const handleUndo = () => {
    if (!history.length) return;
    const previousGeojson = history[history.length - 1];
    setHistory((previous) => previous.slice(0, -1));
    setParcels((previous) =>
      previous.map((parcel) =>
        parcel.id === activeParcel.id
          ? applyGeojson(parcel, previousGeojson)
          : parcel
      )
    );
  };

  const handleSave = async () => {
    if (!activeParcel?.geojson) {
      triggerToast('Tap the map to create a field first');
      return;
    }
    if (!activeParcel.customTitle?.trim()) {
      triggerToast('Enter a field name');
      return;
    }
    try {
      const payload = {
        name: activeParcel.customTitle.trim(),
        category: activeParcel.crop,
        geojson: activeParcel.geojson,
      };
      const saved = activeParcel.isSaved
        ? await fieldApi.updateParcel(activeParcel.id, payload)
        : await fieldApi.createParcel(payload);
      const mapped = mapBackendParcel(saved);
      setParcels((previous) =>
        previous.map((parcel) =>
          parcel.id === activeParcel.id ? mapped : parcel
        )
      );
      setSelectedId(mapped.id);
      triggerToast(`Saved "${mapped.name}"`);
    } catch (error) {
      triggerToast(error.message || 'Could not save field');
    }
  };

  const filteredParcels = parcels.filter((parcel) =>
    parcel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <Sidebar
        parcels={filteredParcels}
        selectedId={activeParcel?.id}
        onSelectParcel={(parcel) => setSelectedId(parcel.id)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onNewBoundary={handleNewBoundary}
      />
      {activeParcel ? (
        <MapCanvas
          parcel={activeParcel}
          isEditing={isEditing}
          onDetect={handleDetect}
          onGeojsonChange={handleGeojsonChange}
          zoom={zoom}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
          Tap New Field Boundary to begin
        </div>
      )}
      {activeParcel && (
        <BottomInspector
          parcel={activeParcel}
          onUpdateField={handleUpdateField}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onUndo={handleUndo}
          onReset={handleReset}
          onSave={handleSave}
        />
      )}
      <MapControls
        onZoomIn={() => setZoom((value) => Math.min(1.5, value + 0.1))}
        onZoomOut={() => setZoom((value) => Math.max(1, value - 0.1))}
        onResetZoom={() => setZoom(1)}
      />
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-400 text-slate-950 text-xs font-bold shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
