import { useMemo, useState } from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { TransportTrip } from '@workspace/api-client-react';
import { cardRadius, space, type getPalette } from '../theme';

type Palette = ReturnType<typeof getPalette>;
type Point = { latitude: number; longitude: number };
type DriverPosition = { latitude: number | null; longitude: number | null } | null;
type PixelPoint = { x: number; y: number };
type Tile = { key: string; uri: string; left: number; top: number };

const TILE_SIZE = 256;
const TILE_HOSTS = ['a', 'b', 'c', 'd'] as const;

function pointFrom(latitude: unknown, longitude: unknown): Point | null {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function geometryPoints(value: unknown): Point[] {
  if (!value || typeof value !== 'object') return [];
  const coordinates = (value as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates)) return [];

  return coordinates.flatMap((coordinate): Point[] => {
    if (!Array.isArray(coordinate)) return [];
    const [longitude, latitude] = coordinate;
    const point = pointFrom(latitude, longitude);
    return point ? [point] : [];
  });
}

function project(point: Point, zoom: number): PixelPoint {
  const latitude = Math.max(-85.05112878, Math.min(85.05112878, point.latitude));
  const sin = Math.sin((latitude * Math.PI) / 180);
  const worldSize = TILE_SIZE * 2 ** zoom;

  return {
    x: ((point.longitude + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize,
  };
}

function fitZoom(points: Point[], width: number, height: number): number {
  for (let zoom = 17; zoom >= 9; zoom -= 1) {
    const pixels = points.map((point) => project(point, zoom));
    const horizontalSpan = Math.max(...pixels.map((point) => point.x)) - Math.min(...pixels.map((point) => point.x));
    const verticalSpan = Math.max(...pixels.map((point) => point.y)) - Math.min(...pixels.map((point) => point.y));
    if (horizontalSpan <= width - 56 && verticalSpan <= height - 56) return zoom;
  }
  return 9;
}

function screenPoint(
  point: Point,
  zoom: number,
  startX: number,
  startY: number,
): PixelPoint {
  const projected = project(point, zoom);
  return { x: projected.x - startX, y: projected.y - startY };
}

function lineString(points: PixelPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

export function TripRouteMap({
  trip,
  driverPosition,
  colors,
}: {
  trip: TransportTrip;
  driverPosition: DriverPosition;
  colors: Palette;
}) {
  const [mapSize, setMapSize] = useState({ width: 0, height: 220 });
  const [navigationError, setNavigationError] = useState<string | null>(null);

  const driver = driverPosition
    ? pointFrom(driverPosition.latitude, driverPosition.longitude)
    : null;
  const tripFields = trip as unknown as Record<string, unknown>;
  const pickup = pointFrom(tripFields.pickupLatitude, tripFields.pickupLongitude);
  const destination = pointFrom(
    tripFields.destinationLatitude,
    tripFields.destinationLongitude,
  );
  const pickupRoute = geometryPoints(tripFields.pickupRouteGeometry);
  const passengerRoute = geometryPoints(tripFields.routeGeometry);

  const viewport = useMemo(() => {
    if (mapSize.width <= 0 || mapSize.height <= 0) return null;

    const allPoints = [
      ...(driver ? [driver] : []),
      ...(pickup ? [pickup] : []),
      ...(destination ? [destination] : []),
      ...pickupRoute,
      ...passengerRoute,
    ];
    if (allPoints.length === 0) return null;

    const zoom = fitZoom(allPoints, mapSize.width, mapSize.height);
    const projected = allPoints.map((point) => project(point, zoom));
    const minX = Math.min(...projected.map((point) => point.x));
    const maxX = Math.max(...projected.map((point) => point.x));
    const minY = Math.min(...projected.map((point) => point.y));
    const maxY = Math.max(...projected.map((point) => point.y));
    const startX = (minX + maxX) / 2 - mapSize.width / 2;
    const startY = (minY + maxY) / 2 - mapSize.height / 2;
    const firstTileX = Math.floor(startX / TILE_SIZE);
    const lastTileX = Math.floor((startX + mapSize.width) / TILE_SIZE);
    const firstTileY = Math.floor(startY / TILE_SIZE);
    const lastTileY = Math.floor((startY + mapSize.height) / TILE_SIZE);
    const tileCount = 2 ** zoom;
    const tiles: Tile[] = [];

    for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1) {
      if (tileY < 0 || tileY >= tileCount) continue;
      for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
        const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
        const host = TILE_HOSTS[Math.abs(tileX + tileY) % TILE_HOSTS.length];
        tiles.push({
          key: `${zoom}-${tileX}-${tileY}`,
          uri: `https://${host}.basemaps.cartocdn.com/light_all/${zoom}/${wrappedX}/${tileY}@2x.png`,
          left: tileX * TILE_SIZE - startX,
          top: tileY * TILE_SIZE - startY,
        });
      }
    }

    const toScreen = (point: Point) => screenPoint(point, zoom, startX, startY);

    return {
      tiles,
      driver: driver ? toScreen(driver) : null,
      pickup: pickup ? toScreen(pickup) : null,
      destination: destination ? toScreen(destination) : null,
      pickupRoute: pickupRoute.map(toScreen),
      passengerRoute: passengerRoute.map(toScreen),
      width: mapSize.width,
      height: mapSize.height,
    };
  }, [destination, driver, mapSize, passengerRoute, pickup, pickupRoute]);

  const navigationTarget = trip.status === 'IN_PROGRESS' ? destination : pickup;
  const navigationUrl = navigationTarget
    ? `https://www.google.com/maps/dir/?api=1&destination=${navigationTarget.latitude},${navigationTarget.longitude}&travelmode=driving`
    : null;

  const openGuidance = async () => {
    if (!navigationUrl) return;
    try {
      setNavigationError(null);
      await Linking.openURL(navigationUrl);
    } catch {
      setNavigationError('Impossible d’ouvrir l’application de navigation.');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={{ flex: 1 }}>
          <Typography colors={colors} size="xs" weight="bold" tone="muted" style={styles.kicker}>
            GUIDAGE DE LA COURSE
          </Typography>
          <Typography colors={colors} size="base" weight="bold" style={styles.title}>
            {trip.status === 'IN_PROGRESS' ? 'Rejoindre la destination' : 'Rejoindre le client'}
          </Typography>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: colors.muted }]}>
          <View style={[styles.liveDot, { backgroundColor: driver ? colors.chart3 : colors.mutedForeground }]} />
          <Typography colors={colors} size="xs" weight="semibold" tone="muted">
            {driver ? 'Position reçue' : 'GPS en attente'}
          </Typography>
        </View>
      </View>

      <View
        accessibilityLabel="Carte de la course avec la position du chauffeur, l’arrêt client et la destination"
        style={[styles.map, { backgroundColor: colors.muted }]}
        testID="driver-trip-map"
        onLayout={({ nativeEvent }) => {
          const { width, height } = nativeEvent.layout;
          setMapSize((current) =>
            current.width === width && current.height === height
              ? current
              : { width, height },
          );
        }}
      >
        {viewport?.tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.uri }}
            resizeMode="stretch"
            style={[styles.tile, { left: tile.left, top: tile.top }]}
          />
        ))}
        {viewport ? (
          <Svg
            pointerEvents="none"
            width={viewport.width}
            height={viewport.height}
            style={StyleSheet.absoluteFill}
          >
            {viewport.pickupRoute.length > 1 ? (
              <>
                <Polyline
                  points={lineString(viewport.pickupRoute)}
                  fill="none"
                  stroke={colors.card}
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Polyline
                  points={lineString(viewport.pickupRoute)}
                  fill="none"
                  stroke={colors.chart2}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : null}
            {viewport.passengerRoute.length > 1 ? (
              <>
                <Polyline
                  points={lineString(viewport.passengerRoute)}
                  fill="none"
                  stroke={colors.card}
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Polyline
                  points={lineString(viewport.passengerRoute)}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : null}
            {viewport.pickup ? (
              <Circle
                cx={viewport.pickup.x}
                cy={viewport.pickup.y}
                r={10}
                fill={colors.chart4}
                stroke={colors.card}
                strokeWidth={3}
              />
            ) : null}
            {viewport.destination ? (
              <Circle
                cx={viewport.destination.x}
                cy={viewport.destination.y}
                r={9}
                fill={colors.chart3}
                stroke={colors.card}
                strokeWidth={3}
              />
            ) : null}
            {viewport.driver ? (
              <>
                <Circle
                  cx={viewport.driver.x}
                  cy={viewport.driver.y}
                  r={13}
                  fill={colors.primary}
                  fillOpacity={0.24}
                />
                <Circle
                  cx={viewport.driver.x}
                  cy={viewport.driver.y}
                  r={7}
                  fill={colors.primary}
                  stroke={colors.card}
                  strokeWidth={3}
                />
              </>
            ) : null}
          </Svg>
        ) : null}

        {!driver ? (
          <View pointerEvents="none" style={[styles.gpsNotice, { backgroundColor: colors.card }]}>
            <Ionicons name="locate-outline" size={16} color={colors.mutedForeground} />
            <Typography colors={colors} size="xs" tone="muted" style={styles.gpsNoticeText}>
              Votre position apparaîtra dès que le GPS sera reçu.
            </Typography>
          </View>
        ) : null}

        <View pointerEvents="none" style={[styles.attribution, { backgroundColor: colors.card }]}>
          <Typography colors={colors} size="xs" tone="muted">
            © OpenStreetMap · CARTO
          </Typography>
        </View>
      </View>

      <View style={styles.legend}>
        <LegendItem color={colors.primary} label="Votre position" colors={colors} />
        <LegendItem color={colors.chart4} label="Arrêt client" colors={colors} />
        <LegendItem color={colors.chart3} label="Destination" colors={colors} />
      </View>

      <Button
        colors={colors}
        accessibilityRole="button"
        accessibilityLabel={trip.status === 'IN_PROGRESS' ? 'Ouvrir le guidage vers la destination' : 'Ouvrir le guidage vers le client'}
        disabled={!navigationUrl}
        onPress={() => void openGuidance()}
        style={styles.navigationButton}
        testID="button-open-trip-guidance"
      >
        <Ionicons name="navigate" size={18} color={colors.primaryForeground} />
        <Typography colors={colors} size="xs" weight="bold">
          Ouvrir le guidage
        </Typography>
      </Button>
      {navigationError ? (
        <Typography colors={colors} tone="destructive" size="xs" style={styles.errorText}>
          {navigationError}
        </Typography>
      ) : null}
    </View>
  );
}

function LegendItem({
  color,
  label,
  colors,
}: {
  color: string;
  label: string;
  colors: Palette;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderColor: colors.card }]} />
      <Typography colors={colors} size="xs" tone="muted">
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: cardRadius,
    padding: space.sm,
    gap: space.sm,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  kicker: { letterSpacing: 0.7 },
  title: { marginTop: space.xs },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: cardRadius },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  map: { height: 220, width: '100%', overflow: 'hidden', borderRadius: cardRadius },
  tile: { position: 'absolute', width: TILE_SIZE, height: TILE_SIZE },
  gpsNotice: { position: 'absolute', top: space.sm, left: space.sm, right: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs, padding: space.sm, borderRadius: cardRadius / 2 },
  gpsNoticeText: { flex: 1 },
  attribution: { position: 'absolute', right: space.xs, bottom: space.xs, paddingHorizontal: space.xs, paddingVertical: 2, borderRadius: cardRadius / 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  legendDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  navigationButton: { minHeight: 46, borderRadius: cardRadius, flexDirection: 'row', gap: space.xs, paddingHorizontal: space.md },
  errorText: { lineHeight: 18 },
});