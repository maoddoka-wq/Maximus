import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { TransportTrip } from '@workspace/api-client-react';
import { cardRadius, space, type getPalette } from '../theme';
import {
  DRIVER_MAP_TILE_HEADERS,
  getDriverMapTileUrls,
} from '../lib/map-tiles';
import {
  geometryPoints,
  getTripNavigationUrl,
  pointFromCoordinates,
} from '../lib/trip-map-geometry';

type Palette = ReturnType<typeof getPalette>;
type Point = { latitude: number; longitude: number };
type DriverPosition = { latitude: number | null; longitude: number | null } | null;
type PixelPoint = { x: number; y: number };
type Tile = { key: string; uris: string[]; left: number; top: number };

const TILE_SIZE = 256;

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
  fullScreen = false,
}: {
  trip: TransportTrip;
  driverPosition: DriverPosition;
  colors: Palette;
  fullScreen?: boolean;
}) {
  const [mapSize, setMapSize] = useState({ width: 0, height: 220 });
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [failedTileKeys, setFailedTileKeys] = useState<string[]>([]);
  const [tileRetry, setTileRetry] = useState(0);

  const driver = driverPosition
    ? pointFromCoordinates(driverPosition.latitude, driverPosition.longitude)
    : null;
  const pickup = pointFromCoordinates(trip.pickupLatitude, trip.pickupLongitude);
  const destination = pointFromCoordinates(
    trip.destinationLatitude,
    trip.destinationLongitude,
  );
  const pickupRoute = geometryPoints(trip.pickupRouteGeometry);
  const passengerRoute = geometryPoints(trip.routeGeometry);

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
        tiles.push({
          key: `${zoom}-${tileX}-${tileY}`,
          uris: getDriverMapTileUrls(zoom, tileX, tileY),
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

  const tileSignature = viewport?.tiles.map((tile) => tile.key).join('|') ?? '';
  useEffect(() => {
    setFailedTileKeys([]);
    setTileRetry((current) => current + 1);
  }, [tileSignature]);

  const tilesWithFallbackErrors = viewport?.tiles
    .filter((tile) => failedTileKeys.includes(tile.key)).length ?? 0;
  const allTilesFailed = !!viewport?.tiles.length && tilesWithFallbackErrors === viewport.tiles.length;
  const markTileFailed = (tileKey: string) => {
    setFailedTileKeys((current) => current.includes(tileKey) ? current : [...current, tileKey]);
  };
  const retryMapTiles = () => {
    setFailedTileKeys([]);
    setTileRetry((current) => current + 1);
  };

  const navigationUrl = getTripNavigationUrl(trip);

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
    <View style={fullScreen ? styles.fullScreenRoot : styles.card}>
      {!fullScreen ? (
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
      ) : null}
      <View
        accessibilityLabel="Carte de la course avec la position du chauffeur, l’arrêt client et la destination"
        style={[
          styles.map,
          fullScreen ? styles.fullScreenMap : styles.inlineMap,
          { backgroundColor: colors.muted },
        ]}
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
          <RouteMapTile
            key={`${tile.key}-${tileRetry}`}
            tile={tile}
            onFailed={markTileFailed}
          />
        ))}
        {!viewport ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.mapPlaceholder, { backgroundColor: colors.card }]}
          >
            <Ionicons name="map-outline" size={18} color={colors.mutedForeground} />
            <Typography colors={colors} size="xs" tone="muted" style={styles.gpsNoticeText}>
              Les coordonnées de cette course ne sont pas disponibles.
            </Typography>
          </View>
        ) : null}
        {tilesWithFallbackErrors > 0 ? (
          <View style={[styles.tileUnavailable, { backgroundColor: colors.card }]}>
            <Typography colors={colors} size="xs" tone="muted" style={styles.tileUnavailableText}>
              {allTilesFailed
                ? 'Le fond de carte est indisponible. Réessayez après avoir vérifié votre connexion.'
                : 'Certaines tuiles de la carte sont indisponibles. Réessayez si le fond reste incomplet.'}
            </Typography>
            <Button
              colors={colors}
              accessibilityRole="button"
              onPress={retryMapTiles}
              style={styles.retryMapButton}
              testID="button-retry-driver-map"
            >
              Réessayer
            </Button>
          </View>
        ) : null}
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

        {!fullScreen && !driver ? (
          <View pointerEvents="none" style={[styles.gpsNotice, { backgroundColor: colors.card }]}>
            <Ionicons name="locate-outline" size={16} color={colors.mutedForeground} />
            <Typography colors={colors} size="xs" tone="muted" style={styles.gpsNoticeText}>
              Votre position apparaîtra dès que le GPS sera reçu.
            </Typography>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Licence OpenStreetMap contributors"
          onPress={() => {
            void Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {});
          }}
          style={[styles.attribution, { backgroundColor: colors.card }]}
          testID="link-openstreetmap-attribution"
        >
          <Typography colors={colors} size="xs" tone="muted">
            © OpenStreetMap contributors
          </Typography>
        </Pressable>
      </View>

      {!fullScreen ? (
        <>
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
        </>
      ) : null}
    </View>
  );
}

function RouteMapTile({
  tile,
  onFailed,
}: {
  tile: Tile;
  onFailed: (tileKey: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const uri = tile.uris[0];

  if (!uri || failed) return null;

  return (
    <Image
      source={{ uri, headers: DRIVER_MAP_TILE_HEADERS, cache: 'default' }}
      resizeMode="stretch"
      style={[styles.tile, { left: tile.left, top: tile.top }]}
      onError={() => {
        setFailed(true);
        onFailed(tile.key);
      }}
    />
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
  fullScreenRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  kicker: { letterSpacing: 0.7 },
  title: { marginTop: space.xs },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: cardRadius },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  map: { width: '100%', overflow: 'hidden', borderRadius: cardRadius },
  inlineMap: { height: 220 },
  fullScreenMap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 0,
  },
  tile: { position: 'absolute', width: TILE_SIZE, height: TILE_SIZE },
  mapPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    padding: space.md,
  },
  tileUnavailable: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    right: space.sm,
    alignItems: 'center',
    gap: space.xs,
    padding: space.sm,
    borderRadius: cardRadius / 2,
  },
  tileUnavailableText: { textAlign: 'center' },
  retryMapButton: { minHeight: 34, paddingHorizontal: space.sm },
  gpsNotice: { position: 'absolute', top: space.sm, left: space.sm, right: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs, padding: space.sm, borderRadius: cardRadius / 2 },
  gpsNoticeText: { flex: 1 },
  attribution: { position: 'absolute', right: space.xs, bottom: space.xs, paddingHorizontal: space.xs, paddingVertical: 2, borderRadius: cardRadius / 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  legendDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  navigationButton: { minHeight: 46, borderRadius: cardRadius, flexDirection: 'row', gap: space.xs, paddingHorizontal: space.md },
  errorText: { lineHeight: 18 },
});