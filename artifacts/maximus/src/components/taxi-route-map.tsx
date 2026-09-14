import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJsonLineString } from '@/lib/transport-api';

type Point = { latitude: number; longitude: number };

type TaxiRouteMapProps = {
  clientStop?: Point | null;
  destination?: Point | null;
  driver?: Point | null;
  routeGeometry?: GeoJsonLineString | null;
  pickupRouteGeometry?: GeoJsonLineString | null;
  className?: string;
};

const driverIcon = L.divIcon({
  className: 'taxi-driver-marker',
  html: '<span class="taxi-driver-marker__body" aria-label="Position du taxi"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 28l3.5-10.5A4 4 0 0 1 17.3 15h13.4a4 4 0 0 1 3.8 2.5L38 28v8H10v-8Z" fill="#0f172a"/><path d="M15.7 25h16.6l-2.2-6.1a1.5 1.5 0 0 0-1.4-1H19.3a1.5 1.5 0 0 0-1.4 1L15.7 25Z" fill="#fbbf24"/><path d="M13 27h22v6H13z" fill="#f8fafc"/><path d="M10 27h28v4H10z" fill="#fbbf24"/><circle cx="16" cy="36" r="3" fill="#0f172a"/><circle cx="32" cy="36" r="3" fill="#0f172a"/><path d="M20 27h8" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/></svg></span>',
  iconSize: [46, 46],
  iconAnchor: [23, 23],
});

const clientStopIcon = L.divIcon({
  className: 'taxi-client-stop-marker',
  html: '<span class="taxi-client-stop-marker__body" aria-label="Arrêt du client"><span></span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const destinationIcon = L.divIcon({
  className: 'taxi-destination-marker',
  html: '<span class="taxi-destination-marker__body" aria-label="Destination"><span>✓</span></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const addMarker = (group: L.LayerGroup, bounds: L.LatLngBounds, point: Point, icon: L.DivIcon, label: string) => {
  L.marker([point.latitude, point.longitude], { icon })
    .bindTooltip(label, { permanent: false, direction: 'top' })
    .addTo(group);
  bounds.extend([point.latitude, point.longitude]);
};

const addRoute = (group: L.LayerGroup, bounds: L.LatLngBounds, geometry: GeoJsonLineString, color: string) => {
  const coordinates = geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
  L.polyline(coordinates, {
    color: '#ffffff',
    weight: 9,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(group);
  const layer = L.polyline(
    coordinates,
    { color, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' },
  );
  layer.addTo(group);
  bounds.extend(layer.getBounds());
};

export function TaxiRouteMap({
  clientStop,
  destination,
  driver,
  routeGeometry,
  pickupRouteGeometry,
  className = 'h-64',
}: TaxiRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    map.setView([14.7167, -17.4677], 12);
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resizeObserver?.observe(containerRef.current);

    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();
    const bounds = L.latLngBounds([]);

    if (pickupRouteGeometry) addRoute(layers, bounds, pickupRouteGeometry, '#0284c7');
    if (routeGeometry) addRoute(layers, bounds, routeGeometry, '#f59e0b');
    if (driver) addMarker(layers, bounds, driver, driverIcon, 'Position du taxi');
    if (clientStop) addMarker(layers, bounds, clientStop, clientStopIcon, 'Arrêt du client');
    if (destination) addMarker(layers, bounds, destination, destinationIcon, 'Destination');

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.12), { maxZoom: 16, animate: true });
    }
  }, [clientStop, destination, driver, pickupRouteGeometry, routeGeometry]);

  return <div className="space-y-2">
    <div ref={containerRef} className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm ${className}`} aria-label="Carte du trajet Taxi" />
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] font-semibold text-slate-600">
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600 ring-2 ring-sky-100" />Taxi → arrêt client</span>
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100" />Arrêt → destination</span>
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-red-100" />Arrêt client</span>
    </div>
  </div>;
}