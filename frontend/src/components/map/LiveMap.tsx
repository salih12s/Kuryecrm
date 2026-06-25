import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { DEFAULT_CENTER, dotIcon, L } from '../../lib/leaflet-setup';
import type { LiveMapData } from '../../types';
import { secondsAgoLabel } from '../../lib/tracking';

/**
 * Frames the map to show all points without fighting the user. It fits once on
 * first load, and re-fits once when courier locations first appear (so a
 * courier that comes online later is brought into view automatically). After
 * that it never moves the map, so background refreshes don't disturb panning.
 */
function AutoFit({ points, courierCount }: { points: [number, number][]; courierCount: number }) {
  const map = useMap();
  const fitted = useRef(false);
  const fittedCouriers = useRef(false);

  useEffect(() => {
    if (points.length === 0) return;
    const firstCouriers = courierCount > 0 && !fittedCouriers.current;
    if (fitted.current && !firstCouriers) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    }
    fitted.current = true;
    if (courierCount > 0) fittedCouriers.current = true;
  }, [map, points, courierCount]);

  return null;
}

const RESTAURANT_ICON = dotIcon('#dc2626'); // red
const ONLINE_ICON = dotIcon('#2563eb'); // blue (courier online)
const OFFLINE_ICON = dotIcon('#94a3b8'); // gray (courier offline / no recent ping)

export default function LiveMap({ data, height = 520 }: { data: LiveMapData; height?: number }) {
  const courierPoints = data.couriers
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => [c.latitude as number, c.longitude as number] as [number, number]);
  const restaurantPoints = data.restaurants.map((r) => [r.latitude, r.longitude] as [number, number]);
  const allPoints = [...courierPoints, ...restaurantPoints];
  const center: [number, number] = allPoints[0] ?? DEFAULT_CENTER;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <MapContainer center={center} zoom={12} style={{ height, width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoFit points={allPoints} courierCount={courierPoints.length} />

        {data.restaurants.map((r) => (
          <Marker key={`r-${r.id}`} position={[r.latitude, r.longitude]} icon={RESTAURANT_ICON}>
            <Tooltip permanent direction="top" offset={[0, -8]} className="restaurant-label">
              {r.name}
            </Tooltip>
            <Popup>
              <b>{r.name}</b>
              <br />
              {r.address || '—'}
              {r.locationNote && (
                <>
                  <br />
                  <span className="text-muted">{r.locationNote}</span>
                </>
              )}
            </Popup>
          </Marker>
        ))}

        {data.couriers
          .filter((c) => c.latitude != null && c.longitude != null)
          .map((c) => (
            <Marker
              key={`c-${c.courierId}`}
              position={[c.latitude as number, c.longitude as number]}
              icon={c.online ? ONLINE_ICON : OFFLINE_ICON}
            >
              <Tooltip permanent direction="top" offset={[0, -8]} className="courier-label">
                {c.courierName}
              </Tooltip>
              <Popup>
                <b>{c.courierName}</b> ({c.courierUsername ?? '—'})
                <br />
                Plaka: {c.courierPlate ?? '—'}
                <br />
                Restoran: {c.restaurantName}
                <br />
                Durum: {c.online ? 'Çevrim içi' : 'Çevrim dışı'}
                <br />
                Son konum: {secondsAgoLabel(c.secondsAgo)}
                {c.isLate && (
                  <>
                    <br />
                    <span style={{ color: '#b45309' }}>{c.lateMinutes} dk geç başladı</span>
                  </>
                )}
                {c.overtimeHours > 0 && (
                  <>
                    <br />
                    <span style={{ color: '#4338ca' }}>{c.overtimeHours} sa ek mesai</span>
                  </>
                )}
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
