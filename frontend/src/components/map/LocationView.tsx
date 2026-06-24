import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet';
import { dotIcon } from '../../lib/leaflet-setup';

const RESTAURANT_ICON = dotIcon('#2563eb');

interface Props {
  lat: number;
  lng: number;
  label?: string;
  note?: string | null;
  height?: number;
}

/** Read-only map showing a single fixed location with its name above the pin. */
export default function LocationView({ lat, lng, label, note, height = 320 }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-300">
      <MapContainer center={[lat, lng]} zoom={16} style={{ height, width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={RESTAURANT_ICON}>
          {label && (
            <Tooltip permanent direction="top" offset={[0, -8]} className="restaurant-label">
              {label}
            </Tooltip>
          )}
        </Marker>
      </MapContainer>
      {note && <p className="bg-slate-50 px-3 py-2 text-xs text-muted">{note}</p>}
    </div>
  );
}
