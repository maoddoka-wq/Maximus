import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoJsonLineString } from '@/lib/transport-api';

type Point = { latitude: number; longitude: number };

type TaxiRouteMapProps = {
  pickup?: Point | null;
  destination?: Point | null;
  driver?: Point | null;
  routeGeometry?: GeoJsonLineString | null;
  pickupRouteGeometry?: GeoJsonLineString | null;
  className?: string;
};

const addPoint = (group: L.LayerGroup, bounds: L.LatLngBounds, point: Point, color: string, label: string) => {
  const marker = L.circleMarker([point.latitude, point.longitude], {
    radius: 8,
    color,
    fillColor: color,
    fillOpacity: 0.95,
    weight: 3,
  }).bindTooltip(label, { permanent: false, direction: 'top' });
  marker.addTo(group);
  bounds.extend([point.latitude, point.longitude]);
};

const addRoute = (group: L.LayerGroup, bounds: L.LatLngBounds, geometry: GeoJsonLineString, color: string) => {
  const layer = L.polyline(
    geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]),
    { color, weight: 5, opacity: 0.85 },
  );
  layer.addTo(group);
  bounds.extend(layer.getBounds());
};

export function TaxiRouteMap({
  pickup,
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

    return () => {
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

    if (routeGeometry) addRoute(layers, bounds, routeGeometry, '#d69e2e');
    if (pickupRouteGeometry) addRoute(layers, bounds, pickupRouteGeometry, '#0ea5e9');
    if (pickup) addPoint(layers, bounds, pickup, '#16a34a', 'Prise en charge');
    if (destination) addPoint(layers, bounds, destination, '#dc2626', 'Destination');
    if (driver) addPoint(layers, bounds, driver, '#0284c7', 'Taxi');

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.12), { maxZoom: 16, animate: true });
    }
  }, [destination, driver, pickup, pickupRouteGeometry, routeGeometry]);

  return <div ref={containerRef} className={`overflow-hidden rounded-xl border bg-slate-100 ${className}`} aria-label="Carte du trajet Taxi" />;
}