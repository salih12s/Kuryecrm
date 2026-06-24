import { MapContainer, Marker, Popup, TileLayer, Tooltip } from 'react-leaflet';
import { DEFAULT_CENTER, dotIcon } from '../../lib/leaflet-setup';
import type { LiveMapData } from '../../types';
import { secondsAgoLabel } from '../../lib/tracking';

const RESTAURANT_ICON = dotIcon('#dc2626'); // red
const ONLINE_ICON = dotIcon('#2563eb'); // blue (courier online)
const OFFLINE_ICON = dotIcon('#94a3b8'); // gray (courier offline / no recent ping)

export default function LiveMap({ data, height = 520 }: { data: LiveMapData; height?: number }) {
  const firstCourier = data.couriers.find((c) => c.latitude != null && c.longitude != null);
  const center: [number, number] = firstCourier
    ? [firstCourier.latitude as number, firstCourier.longitude as number]
    : data.restaurants[0]
      ? [data.restaurants[0].latitude, data.restaurants[0].longitude]
      : DEFAULT_CENTER;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <MapContainer center={center} zoom={12} style={{ height, width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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
