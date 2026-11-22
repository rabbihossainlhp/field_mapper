import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';

const DEFAULT_CENTER = [90.412, 23.81];
const BOUNDARY_SOURCE = 'field-boundary';

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
    'display:flex;align-items:center;justify-content:center;border-radius:9999px;cursor:pointer;box-shadow:0 2px 8px #0008;';
  return element;
}

export default function MapCanvas({
  parcel,
  isEditing,
  onDetect,
  onGeojsonChange,
  zoom,
}) {
  const [mapReady, setMapReady] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const parcelRef = useRef(parcel);
  const editingRef = useRef(isEditing);
  const detectRef = useRef(onDetect);
  const geojsonChangeRef = useRef(onGeojsonChange);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    parcelRef.current = parcel;
    editingRef.current = isEditing;
    detectRef.current = onDetect;
    geojsonChangeRef.current = onGeojsonChange;
    zoomRef.current = zoom;
  }, [parcel, isEditing, onDetect, onGeojsonChange, zoom]);

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
              'Tiles © Esri — Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
          },
        },
        layers: [
          {
            id: 'esri-world-imagery',
            type: 'raster',
            source: 'esri-world-imagery',
          },
        ],
      },
      center,
      zoom: 13 + (zoomRef.current - 1) * 10,
      attributionControl: true,
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      'bottom-right'
    );
    map.on('click', (event) => {
      if (!editingRef.current) {
        detectRef.current(event.lngLat.lat, event.lngLat.lng);
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
        paint: { 'fill-color': '#34d399', 'fill-opacity': 0.18 },
        filter: ['==', '$type', 'Polygon'],
      });
      map.addLayer({
        id: 'field-boundary-outline',
        type: 'line',
        source: BOUNDARY_SOURCE,
        paint: { 'line-color': '#34d399', 'line-width': 3 },
        filter: ['==', '$type', 'Polygon'],
      });

      if (feature) {
        const bounds = turf.bbox(feature);
        map.fitBounds(
          [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
          { padding: 100, maxZoom: 17, duration: 600 }
        );
      }
      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

    const bounds = turf.bbox(feature);
    map.fitBounds(
      [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
      { padding: 100, maxZoom: 17, duration: 500 }
    );
    if (!isEditing) return;

    const ring = openRing(feature);
    const createUpdatedFeature = (index, coordinate) => {
      const currentRing = openRing(feature);
      currentRing[index] = coordinate;
      geojsonChangeRef.current(polygonWithRing(feature, currentRing));
    };

    ring.forEach(([lng, lat], index) => {
      const vertex = createHandle(
        'field-map-vertex',
        ''
      );
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
        'width:24px;height:24px;padding:0;color:#34d399;background:#0f172a;border:1px solid #475569;font-size:18px;line-height:1;';
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

  useEffect(() => {
    mapRef.current?.setZoom(13 + (zoom - 1) * 10);
  }, [zoom]);

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0 h-screen w-full bg-slate-900"
    />
  );
}
