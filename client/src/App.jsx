import { useEffect, useRef, useState } from 'react';
import * as turf from '@turf/turf';
import { INITIAL_PARCELS } from './data/mockParcels';
import TopNav from './components/TopNav';
import Sidebar from './components/Sidebar';
import MapCanvas from './components/MapCanvas';
import BottomInspector from './components/BottomInspector';
import MapControls from './components/MapControls';
import { fieldApi } from './services/fieldApi';
import {
  parseCoordinates,
  reverseGeocode,
  searchLocation,
} from './services/geocodingApi';

const DEMO_CENTER = [90.412, 23.81];

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
    locationName: parcel.locationName || '',
  };
}

function getParcelFeature(parcel) {
  if (parcel?.geojson) {
    return parcel.geojson.type === 'Feature'
      ? parcel.geojson
      : { type: 'Feature', properties: {}, geometry: parcel.geojson };
  }
  if (!parcel?.vertices?.length) return null;

  const [centerLng, centerLat] = DEMO_CENTER;
  const ring = parcel.vertices.map((vertex) => [
    centerLng + (vertex.x - 50) * 0.00025,
    centerLat - (vertex.y - 50) * 0.00025,
  ]);
  ring.push(ring[0]);
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
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
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [showPlaceLabels, setShowPlaceLabels] = useState(true);
  const [mapMode, setMapMode] = useState('satellite');
  const [zoom, setZoom] = useState(16);
  const [toast, setToast] = useState(null);
  const [isDetectMode, setIsDetectMode] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [searchedLocationName, setSearchedLocationName] = useState('');

  const toastTimer = useRef(null);
  const parcelsRef = useRef(parcels);
  const lookedUpParcelIdsRef = useRef(new Set());

  const activeParcel = parcels.find((parcel) => parcel.id === selectedId) || parcels[0];
  const activeFeature = getParcelFeature(activeParcel);
  const activeCenter = activeFeature
    ? turf.center(activeFeature).geometry.coordinates
    : DEMO_CENTER;
  const fallbackCoordLabel = `${activeCenter[1].toFixed(4)}, ${activeCenter[0].toFixed(4)}`;

  const activeLocationName =
    searchedLocationName ||
    activeParcel?.locationName ||
    fallbackCoordLabel;

  useEffect(() => {
    parcelsRef.current = parcels;
  }, [parcels]);

  const triggerToast = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
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

  useEffect(() => {
    if (!activeParcel?.id || activeParcel.locationName) return;
    if (lookedUpParcelIdsRef.current.has(activeParcel.id)) return;

    const feature = getParcelFeature(activeParcel);
    if (!feature) return;

    lookedUpParcelIdsRef.current.add(activeParcel.id);
    const [lng, lat] = turf.center(feature).geometry.coordinates;

    reverseGeocode(lat, lng)
      .then((label) => {
        setParcels((previous) =>
          previous.map((parcel) =>
            parcel.id === activeParcel.id
              ? { ...parcel, locationName: label }
              : parcel
          )
        );
      })
      .catch(() => {
        lookedUpParcelIdsRef.current.delete(activeParcel.id);
      });
  }, [activeParcel]);

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

  const updateLocationName = async (id, lat, lng) => {
    const coordFallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const label = await reverseGeocode(lat, lng);
      const displayLabel = label ? `${label} (${coordFallback})` : coordFallback;
      setSearchedLocationName(displayLabel);
      setParcels((previous) =>
        previous.map((parcel) =>
          parcel.id === id ? { ...parcel, locationName: displayLabel } : parcel
        )
      );
    } catch {
      setSearchedLocationName(coordFallback);
    }
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
        locationName: '',
        acres: result.metrics.acres,
        displayAcres: result.metrics.acres,
        hectares: result.metrics.hectares,
        sqMeters: result.metrics.areaSqMeters.toLocaleString(),
        perimeter: result.metrics.perimeterMeters,
      };
      setHistory([]);
      setParcels((previous) => [draft, ...previous]);
      setSelectedId(draft.id);
      setIsDetectMode(false);
      setIsEditing(true);
      updateLocationName(draft.id, lat, lng);
      triggerToast('Boundary outlined; drag white vertices to adjust');
    } catch (error) {
      triggerToast(error.message || 'Boundary detection failed');
    }
  };

  const handleNewBoundary = () => {
    setSearchedLocationName('');
    setIsDetectMode(true);
    setIsEditing(false);
    triggerToast('Tap any field on the map to auto-outline its boundary');
  };

  const handleSelectParcel = (parcel) => {
    setSelectedId(parcel.id);
    setHistory([]);
    setIsDetectMode(false);
    setIsEditing(true);
    setSearchedLocationName('');
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    const coordinates = parseCoordinates(query);
    if (coordinates) {
      setFlyTarget({ ...coordinates, zoom: 16 });
      setZoom(16);
      reverseGeocode(coordinates.lat, coordinates.lng)
        .then((label) => {
          setSearchedLocationName(label);
          triggerToast(label);
        })
        .catch(() => triggerToast('Moved to coordinates'));
      return;
    }

    const matchingParcel = parcelsRef.current.find((parcel) =>
      parcel.name.toLowerCase().includes(query.toLowerCase())
    );
    if (matchingParcel) {
      handleSelectParcel(matchingParcel);
      return;
    }

    try {
      const results = await searchLocation(query);
      if (!results.length) {
        triggerToast('No matching places found');
        return;
      }
      const result = results[0];
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      setSearchedLocationName(result.display_name);
      setFlyTarget({ lat, lng, zoom: 16 });
      setZoom(16);
      triggerToast(result.display_name);
    } catch (error) {
      triggerToast(error.message || 'Place search failed');
    }
  };

  const handleMapClick = (lat, lng) => {
    if (activeParcel) {
      updateLocationName(activeParcel.id, lat, lng);
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      triggerToast('Location services are not available in this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFlyTarget({ lat: coords.latitude, lng: coords.longitude, zoom: 16 });
        setZoom(16);
        reverseGeocode(coords.latitude, coords.longitude)
          .then((label) => {
            setSearchedLocationName(label);
            triggerToast(label);
          })
          .catch(() => triggerToast('Moved to your current location'));
      },
      (error) => {
        const messages = {
          1: 'Allow location access in your browser to use GPS',
          2: 'Your current location could not be determined',
          3: 'Location request timed out',
        };
        triggerToast(messages[error.code] || 'Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleDeleteParcel = async (parcel) => {
    try {
      if (parcel.isSaved) await fieldApi.deleteParcel(parcel.id);
      const remaining = parcelsRef.current.filter((item) => item.id !== parcel.id);
      setParcels(remaining);
      if (selectedId === parcel.id) {
        setSelectedId(remaining[0]?.id);
        setHistory([]);
        if (remaining[0]) handleSelectParcel(remaining[0]);
      }
      triggerToast(`Deleted "${parcel.name}"`);
    } catch (error) {
      triggerToast(error.message || 'Could not delete field');
    }
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
        locationName: activeParcel.locationName || activeLocationName,
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
        onSearch={handleSearch}
        locationName={activeLocationName}
      />
      <Sidebar
        parcels={filteredParcels}
        selectedId={activeParcel?.id}
        onSelectParcel={handleSelectParcel}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onNewBoundary={handleNewBoundary}
        onDeleteParcel={handleDeleteParcel}
      />
      {activeParcel ? (
        <MapCanvas
          parcel={activeParcel}
          isEditing={isEditing}
          isDetectMode={isDetectMode}
          isMeasuring={isMeasuring}
          showPlaceLabels={showPlaceLabels}
          mapMode={mapMode}
          onDetect={handleDetect}
          onMapClick={handleMapClick}
          onGeojsonChange={handleGeojsonChange}
          zoom={zoom}
          flyTarget={flyTarget}
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
          locationName={activeLocationName}
        />
      )}
      <MapControls
        onZoomIn={() => setZoom((value) => Math.min(19, value + 1))}
        onZoomOut={() => setZoom((value) => Math.max(3, value - 1))}
        onLocate={handleLocate}
        isMeasuring={isMeasuring}
        onToggleMeasure={() => setIsMeasuring((prev) => !prev)}
        showPlaceLabels={showPlaceLabels}
        onTogglePlaceLabels={() => setShowPlaceLabels((prev) => !prev)}
        mapMode={mapMode}
        onToggleMapMode={() =>
          setMapMode((prev) => (prev === 'satellite' ? 'street' : 'satellite'))
        }
      />
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-400 text-slate-950 text-xs font-bold shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}