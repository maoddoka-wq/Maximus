import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TransportTrip } from '@workspace/api-client-react';
import { cardRadius, space, type getPalette } from '../theme';
import {
  DRIVER_MAP_TILE_HEADERS,
  getDriverMapTileUrls,
} from '../lib/map-tiles';
import {
  invalidateDriverMapTile,
  loadDriverMapTile,
} from '../services/map-tile-loader';
import {
  geometryPoints,
  getTripNavigationUrl,
  pointFromCoordinates,
} from '../lib/trip-map-geometry';
import { useMapCamera } from '../hooks/use-map-camera';
import { fitMapCamera, project, TILE_SIZE, MIN_MAP_ZOOM, MAX_MAP_ZOOM } from '../lib/map-camera';

type Palette = ReturnType<typeof getPalette>;
type Point = { latitude: number; longitude: number };
type DriverPosition = { latitude: number | null; longitude: number | null } | null;
type PixelPoint = { x: number; y: number };
type Tile = { key: string; uris: string[]; left: number; top: number; size: number };

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
  const insets = useSafeAreaInsets();

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

  const automaticCamera = fitMapCamera([
      ...(driver ? [driver] : []),
      ...(pickup ? [pickup] : []),
      ...(destination ? [destination] : []),
      ...pickupRoute,
      ...passengerRoute,
    ], mapSize);
  const mapCamera = useMapCamera(trip.id, automaticCamera, mapSize);
  const camera = mapCamera.camera;

  const viewport = useMemo(() => {
    if (!camera || mapSize.width <= 0 || mapSize.height <= 0) return null;
    const { zoom, center } = camera;
    const worldSize = TILE_SIZE * 2 ** zoom;
    const startX = center.x * worldSize - mapSize.width / 2;
    const startY = center.y * worldSize - mapSize.height / 2;
    const tileZoom = Math.floor(zoom);
    const tileSize = TILE_SIZE * 2 ** (zoom - tileZoom);
    const firstTileX = Math.floor(startX / tileSize);
    const lastTileX = Math.floor((startX + mapSize.width) / tileSize);
    const firstTileY = Math.floor(startY / tileSize);
    const lastTileY = Math.floor((startY + mapSize.height) / tileSize);
    const tileCount = 2 ** tileZoom;
    const tiles: Tile[] = [];

    for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1) {
      if (tileY < 0 || tileY >= tileCount) continue;
      for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
        tiles.push({
          key: `${tileZoom}-${tileX}-${tileY}`,
          uris: getDriverMapTileUrls(tileZoom, tileX, tileY),
          left: tileX * tileSize - startX,
          top: tileY * tileSize - startY,
          size: tileSize,
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
  }, [camera, destination, driver, mapSize, passengerRoute, pickup, pickupRoute]);

  const tileSignature = viewport?.tiles.map((tile) => tile.key).join('|') ?? '';
  useEffect(() => {
    setFailedTileKeys([]);
  }, [tileSignature]);

  const tilesWithFallbackErrors = viewport?.tiles
    .filter((tile) => failedTileKeys.includes(tile.key)).length ?? 0;
  const allTilesFailed = !!viewport?.tiles.length && tilesWithFallbackErrors === viewport.tiles.length;
  const markTileFailed = useCallback((tileKey: string) => {
    setFailedTileKeys((current) => current.includes(tileKey) ? current : [...current, tileKey]);
  }, []);
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
        <View
          {...mapCamera.handlers}
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Déplacez la carte avec un doigt et zoomez avec deux doigts"
          testID="driver-map-gesture-surface"
        />
        {tilesWithFallbackErrors > 0 ? (
          <View style={[styles.tileUnavailable, { backgroundColor: colors.card }]}>
            <Typography colors={colors} size="xs" tone="muted" style={styles.tileUnavailableText}>
              {allTilesFailed
                ? 'Le fond OpenStreetMap est indisponible. Cette erreur est distincte du GPS. Vous pouvez ouvrir le guidage.'
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

        {viewport ? (
          <View
            style={[
              styles.mapControls,
              fullScreen
                ? { top: Math.max(insets.top + space.xl * 3, mapSize.height * 0.3), right: space.sm }
                : { bottom: space.lg, left: space.sm, flexDirection: 'row' },
            ]}
          >
            <Button
              colors={colors}
              variant="outline"
              size="icon"
              style={{ backgroundColor: colors.card }}
              accessibilityRole="button"
              accessibilityLabel="Zoomer la carte"
              disabled={!camera || camera.zoom >= MAX_MAP_ZOOM}
              onPress={() => mapCamera.zoom(1)}
              testID="button-driver-map-zoom-in"
            >
              <Ionicons name="add" size={20} color={colors.foreground} />
            </Button>
            <Button
              colors={colors}
              variant="outline"
              size="icon"
              style={{ backgroundColor: colors.card }}
              accessibilityRole="button"
              accessibilityLabel="Dézoomer la carte"
              disabled={!camera || camera.zoom <= MIN_MAP_ZOOM}
              onPress={() => mapCamera.zoom(-1)}
              testID="button-driver-map-zoom-out"
            >
              <Ionicons name="remove" size={20} color={colors.foreground} />
            </Button>
            <Button
              colors={colors}
              variant="outline"
              size="icon"
              style={{ backgroundColor: colors.card }}
              accessibilityRole="button"
              accessibilityLabel="Recentrer sur la course"
              onPress={mapCamera.recenter}
              testID="button-driver-map-recenter"
            >
              <Ionicons name="scan-outline" size={20} color={colors.foreground} />
            </Button>
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
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const uri = tile.uris[0];

  useEffect(() => {
    let mounted = true;
    setSourceUri(null);
    if (!uri) return;
    if (Platform.OS === 'web') {
      setSourceUri(uri);
      return;
    }
    void loadDriverMapTile(uri)
      .then((localUri) => {
        if (mounted) setSourceUri(localUri);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        console.warn('Driver map tile unavailable:', error);
        onFailed(tile.key);
      });
    return () => { mounted = false; };
  }, [uri, tile.key, onFailed]);

  if (!sourceUri) return null;

  return (
    <Image
      source={
        Platform.OS === 'web'
          ? { uri: sourceUri, headers: DRIVER_MAP_TILE_HEADERS, cache: 'default' }
          : { uri: sourceUri }
      }
      resizeMode="stretch"
      style={[styles.tile, { left: tile.left, top: tile.top, width: tile.size, height: tile.size }]}
      onError={() => {
        setSourceUri(null);
        if (uri && Platform.OS !== 'web') {
          void invalidateDriverMapTile(uri).catch((error: unknown) => {
            console.warn('Could not discard an unreadable map tile:', error);
          });
        }
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
  mapControls: { position: 'absolute', gap: space.xs },
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