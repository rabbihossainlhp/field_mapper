import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';

const DEFAULT_CENTER = [90.412, 23.81];
const BOUNDARY_SOURCE = 'field-boundary';
const MEASURE_SOURCE = 'measure-scale-line';

function featureFromParcel(parcel) {
  if (parcel?.geojson) {
    return parcel.geojson.type === 'Feature'
      ? parcel.geojson
      : { type: 'Feature', properties: {}, geometry: parcel.geojson };
  }

  if (parcel?.vertices?.length) {
    const [centerLng, centerLat] = DEFAULT_CENTER;
    const coordinates = parcel.vertices.map((vertex) => [
      centerLng + (vertex.x - 50) * 0.00025,
      centerLat - (vertex.y - 50) * 0.00025,
    ]);
    coordinates.push(coordinates[0]);
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [coordinates] },
    };
  }
  return null;
}

function openRing(feature) {
  const geometry = feature?.geometry;
  if (geometry?.type !== 'Polygon' || !geometry.coordinates[0]) return [];
  const ring = geometry.coordinates[0];
  return ring.length > 1 ? ring.slice(0, -1) : ring;
}

function polygonWithRing(feature, ring) {
  const closedRing = [...ring, ring[0]];
  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      type: 'Polygon',
      coordinates: [closedRing],
    },
  };
}

function createHandle(className, text) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = text;
  element.style.cssText =
    'display:flex;align-items:center;justify-content:center;border-radius:9999px;cursor:grab;box-shadow:0 3px 12px rgba(0,0,0,0.75);z-index:15;';
  return element;
}

export default function MapCanvas({
  parcel,
  isEditing,
  isDetectMode,
  isMeasuring,
  showPlaceLabels = true,
  onDetect,
  onMapClick,
  onGeojsonChange,
  zoom,
  flyTarget,
}) {
  const [mapReady, setMapReady] = useState(false);
  const [measureDistance, setMeasureDistance] = useState(null);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const measureMarkersRef = useRef([]);
  const measurePointsRef = useRef(null);
  const lastFittedIdRef = useRef(null);

  const parcelRef = useRef(parcel);
  const detectModeRef = useRef(isDetectMode);
  const detectRef = useRef(onDetect);
  const mapClickRef = useRef(onMapClick);
  const geojsonChangeRef = useRef(onGeojsonChange);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    parcelRef.current = parcel;
    detectModeRef.current = isDetectMode;
    detectRef.current = onDetect;
    mapClickRef.current = onMapClick;
    geojsonChangeRef.current = onGeojsonChange;
    zoomRef.current = zoom;
  }, [parcel, isDetectMode, onDetect, onMapClick, onGeojsonChange, zoom]);

  // Initialize MapLibre + Satellite Imagery + Place Labels Overlay
  useEffect(() => {
    if (!mapContainerRef.current) return undefined;

    const feature = featureFromParcel(parcelRef.current);
    const center = feature
      ? turf.center(feature).geometry.coordinates
      : DEFAULT_CENTER;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'esri-world-imagery': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution:
              'Tiles © Esri | Labels © Carto / OpenStreetMap',
          },
          'carto-labels-only': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: 'esri-world-imagery',
            type: 'raster',
            source: 'esri-world-imagery',
          },
          {
            id: 'carto-labels-layer',
            type: 'raster',
            source: 'carto-labels-only',
            paint: { 'raster-opacity': 0.92 },
          },
        ],
      },
      center,
      zoom: zoomRef.current,
      attributionControl: true,
    });

    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }),
      'bottom-left'
    );

    map.on('click', (event) => {
      if (detectModeRef.current) {
        detectRef.current(event.lngLat.lat, event.lngLat.lng);
      } else {
        mapClickRef.current?.(event.lngLat.lat, event.lngLat.lng);
      }
    });

    map.on('load', () => {
      map.addSource(BOUNDARY_SOURCE, {
        type: 'geojson',
        data: feature || { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'field-boundary-fill',
        type: 'fill',
        source: BOUNDARY_SOURCE,
        paint: { 'fill-color': '#34d399', 'fill-opacity': 0.2 },
        filter: ['==', '$type', 'Polygon'],
      });
      map.addLayer({
        id: 'field-boundary-outline',
        type: 'line',
        source: BOUNDARY_SOURCE,
        paint: { 'line-color': '#34d399', 'line-width': 3 },
        filter: ['==', '$type', 'Polygon'],
      });

      map.addSource(MEASURE_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'measure-scale-line-layer',
        type: 'line',
        source: MEASURE_SOURCE,
        paint: {
          'line-color': '#fbbf24',
          'line-width': 3.5,
          'line-dasharray': [2, 1.5],
        },
      });

      if (feature) {
        const bounds = turf.bbox(feature);
        map.fitBounds(
          [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
          { padding: 100, maxZoom: 17, duration: 600 }
        );
        lastFittedIdRef.current = parcelRef.current?.id;
      }
      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      measureMarkersRef.current.forEach((marker) => marker.remove());
      measureMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle place names label layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.getLayer('carto-labels-layer')) return;
    map.setLayoutProperty(
      'carto-labels-layer',
      'visibility',
      showPlaceLabels ? 'visible' : 'none'
    );
  }, [showPlaceLabels, mapReady]);

  // Render active parcel polygon & draggable vertices
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.isStyleLoaded() || !map.getSource(BOUNDARY_SOURCE)) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const feature = featureFromParcel(parcel);
    map.getSource(BOUNDARY_SOURCE).setData(
      feature || { type: 'FeatureCollection', features: [] }
    );
    if (!feature) return;

    if (parcel?.id !== lastFittedIdRef.current) {
      const bounds = turf.bbox(feature);
      map.fitBounds(
        [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
        { padding: 100, maxZoom: 17, duration: 500 }
      );
      lastFittedIdRef.current = parcel?.id;
    }
    if (!isEditing) return;

    const ring = openRing(feature);
    const createUpdatedFeature = (index, coordinate) => {
      const currentRing = openRing(feature);
      currentRing[index] = coordinate;
      geojsonChangeRef.current(polygonWithRing(feature, currentRing));
    };

    ring.forEach(([lng, lat], index) => {
      const vertex = createHandle('field-map-vertex', '');
      vertex.setAttribute('aria-label', `Move boundary point ${index + 1}`);
      vertex.title = 'Drag to adjust boundary';
      vertex.style.cssText +=
        'width:18px;height:18px;padding:0;background:#fff;border:3px solid #064e3b;';
      const marker = new maplibregl.Marker({ element: vertex, draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);
      marker.on('dragend', () => {
        const point = marker.getLngLat();
        createUpdatedFeature(index, [point.lng, point.lat]);
      });
      markersRef.current.push(marker);
    });

    ring.forEach((point, index) => {
      const next = ring[(index + 1) % ring.length];
      const midpoint = [(point[0] + next[0]) / 2, (point[1] + next[1]) / 2];
      const addButton = createHandle('field-map-midpoint', '+');
      addButton.setAttribute('aria-label', 'Add boundary point');
      addButton.title = 'Add a boundary point';
      addButton.style.cssText +=
        'width:24px;height:24px;padding:0;color:#34d399;background:#0f172a;border:1px solid #475569;font-size:18px;line-height:1;cursor:pointer;';
      addButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const currentRing = openRing(feature);
        currentRing.splice(index + 1, 0, midpoint);
        geojsonChangeRef.current(polygonWithRing(feature, currentRing));
      });
      markersRef.current.push(
        new maplibregl.Marker({ element: addButton })
          .setLngLat(midpoint)
          .addTo(map)
      );
    });
  }, [parcel, isEditing, mapReady]);

  // Render & update Draggable 2-Point Measurement Scale (Pins A & B)
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.isStyleLoaded() || !map.getSource(MEASURE_SOURCE)) return;

    measureMarkersRef.current.forEach((marker) => marker.remove());
    measureMarkersRef.current = [];

    if (!isMeasuring) {
      map.getSource(MEASURE_SOURCE).setData({
        type: 'FeatureCollection',
        features: [],
      });
      measurePointsRef.current = null;
      return;
    }

    const center = map.getCenter();
    const initialPoints = [
      [center.lng - 0.0012, center.lat],
      [center.lng + 0.0012, center.lat],
    ];
    measurePointsRef.current = initialPoints;

    const syncMeasureLine = () => {
      const pts = measurePointsRef.current;
      if (!pts || !map.getSource(MEASURE_SOURCE)) return;

      map.getSource(MEASURE_SOURCE).setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: pts,
        },
      });

      const meters = turf.distance(turf.point(pts[0]), turf.point(pts[1]), {
        units: 'meters',
      });
      setMeasureDistance({
        meters: Math.round(meters),
        feet: Math.round(meters * 3.28084),
        km: (meters / 1000).toFixed(2),
      });
    };

    initialPoints.forEach((lngLat, idx) => {
      const pin = createHandle('measure-scale-pin', idx === 0 ? 'A' : 'B');
      pin.title = `Drag pin ${idx === 0 ? 'A' : 'B'} to measure distance`;
      pin.style.cssText +=
        'width:30px;height:30px;background:#fbbf24;color:#0f172a;font-weight:800;font-size:12px;border:2.5px solid #ffffff;';

      const marker = new maplibregl.Marker({ element: pin, draggable: true })
        .setLngLat(lngLat)
        .addTo(map);

      const handleMove = () => {
        const pos = marker.getLngLat();
        measurePointsRef.current[idx] = [pos.lng, pos.lat];
        syncMeasureLine();
      };

      marker.on('drag', handleMove);
      marker.on('dragend', handleMove);

      measureMarkersRef.current.push(marker);
    });

    syncMeasureLine();
  }, [isMeasuring, mapReady]);

  useEffect(() => {
    mapRef.current?.setZoom(zoom);
  }, [zoom]);

  useEffect(() => {
    if (!flyTarget) return;
    mapRef.current?.flyTo({
      center: [flyTarget.lng, flyTarget.lat],
      zoom: flyTarget.zoom || 16,
      essential: true,
    });
  }, [flyTarget]);

  return (
    <div className="relative h-screen w-full">
      <div
        ref={mapContainerRef}
        className="absolute inset-0 h-screen w-full bg-slate-900"
      />

      {/* Live Draggable Scale Readout Pill */}
      {isMeasuring && measureDistance && (
        <div className="fixed top-20 right-4 z-30 rounded-2xl border border-amber-400/60 bg-[#0d141f]/95 px-4 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Drag Pin A or B to Measure
          </div>
          <div className="mt-0.5 flex items-baseline gap-2 font-mono text-sm font-bold">
            <span>{measureDistance.meters.toLocaleString()} m</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">{measureDistance.feet.toLocaleString()} ft</span>
            {measureDistance.meters >= 1000 && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-amber-300">{measureDistance.km} km</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}