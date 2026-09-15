import { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Maximize2, X } from 'lucide-react';
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
  const viewportKeyRef = useRef<string | null>(null);
  const viewportBoundsRef = useRef<L.LatLngBounds | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
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
      viewportKeyRef.current = null;
      viewportBoundsRef.current = null;
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

    const viewportKey = JSON.stringify({ clientStop, destination, routeGeometry, pickupRouteGeometry });
    if (bounds.isValid() && viewportKeyRef.current !== viewportKey) {
      viewportBoundsRef.current = bounds;
      map.fitBounds(bounds.pad(0.12), { maxZoom: 16, animate: true });
      viewportKeyRef.current = viewportKey;
    }
  }, [clientStop, destination, driver, pickupRouteGeometry, routeGeometry]);

  const recenter = () => {
    const map = mapRef.current;
    const bounds = viewportBoundsRef.current;
    if (!map) return;
    if (bounds?.isValid()) {
      map.fitBounds(bounds.pad(0.12), { maxZoom: 16, animate: true });
    } else {
      map.setView([14.7167, -17.4677], 12, { animate: true });
    }
  };

  useEffect(() => {
    if (!expanded) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const frame = window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    const timer = window.setTimeout(() => map.invalidateSize({ pan: false }), 220);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [expanded]);

  return <div className={expanded ? 'fixed inset-0 z-[70] flex flex-col bg-slate-950/80 p-3 sm:p-6' : 'space-y-2'}>
     {expanded && <div className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 shadow-lg sm:px-4"><div><p className="text-sm font-black text-slate-900">GPS Taxi</p><p className="text-[11px] text-slate-500">Chauffeur → arrêt client → destination</p></div><div className="flex items-center gap-2"><button type="button" onClick={recenter} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100" aria-label="Recentrer la carte"><LocateFixed size={15} />Recentrer</button><button type="button" onClick={() => setExpanded(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-slate-700 hover:bg-slate-100" aria-label="Réduire la carte"><X size={18} /></button></div></div>}
    <div className={expanded ? 'relative min-h-0 flex-1' : 'relative'}>
      <div ref={containerRef} className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm ${expanded ? 'h-full min-h-[20rem]' : className}`} aria-label="Carte du trajet Taxi" />
       {!expanded && <div className="absolute right-3 top-3 flex items-center gap-1.5"><button type="button" onClick={recenter} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-800 shadow-md backdrop-blur hover:bg-white" aria-label="Recentrer la carte"><LocateFixed size={15} /></button><button type="button" onClick={() => setExpanded(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2 text-[11px] font-black text-slate-800 shadow-md backdrop-blur hover:bg-white" aria-label="Agrandir la carte"><Maximize2 size={14} />Agrandir</button></div>}
    </div>
    <div className={`flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] font-semibold text-slate-600 ${expanded ? 'rounded-xl bg-white px-3 py-2.5 shadow-lg' : ''}`}>
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600 ring-2 ring-sky-100" />Taxi → arrêt client</span>
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100" />Arrêt → destination</span>
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-red-100" />Arrêt client</span>
    </div>
  </div>;
}