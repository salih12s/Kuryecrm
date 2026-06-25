import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { DEFAULT_CENTER, L } from '../../lib/leaflet-setup';

const PICKER_ICON = L.divIcon({
  className: '',
  html: '<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#E4150F;border:3px solid #fff;box-shadow:0 2px 7px rgba(15,23,42,.45)"><i style="display:block;width:8px;height:8px;border-radius:9999px;background:#fff"></i></span>',
  iconSize: [30, 38],
  iconAnchor: [15, 34],
});

interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  address?: string;
  onAddressChange?: (address: string) => void;
  height?: number;
}

/** Lets the user click/drag a pin to choose a fixed location. */
function PinLayer({ value, onChange }: Pick<Props, 'value' | 'onChange'>) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  if (!value) return null;
  return (
    <Marker
      position={[value.lat, value.lng]}
      icon={PICKER_ICON}
      draggable
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = (e.target as L.Marker).getLatLng();
          onChange({ lat, lng });
        },
      }}
    />
  );
}

function FlyToLocation({ value }: { value: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.flyTo([value.lat, value.lng], 16);
  }, [map, value]);
  return null;
}

function readableAddress(result: { display_name?: string }): string {
  return result.display_name?.replace(/, Türkiye$/, '') ?? '';
}

/**
 * Nominatim often has streets and neighbourhoods but not apartment/block
 * names. We build a cascade of progressively broader queries: the precise
 * user address first, then street + neighbourhood, then neighbourhood, then
 * district + city, then city alone. The search walks the list until something
 * matches, so a detailed Turkish address always lands at least near the
 * correct area even when the exact building is unknown.
 */
function addressSearchQueries(raw: string): string[] {
  const full = raw.trim();
  const normalized = full
    .replace(/\bMah\.?/giu, 'Mahallesi')
    .replace(/\bCad\.?/giu, 'Cadde')
    .replace(/\bSok\.?/giu, 'Sokak')
    .replace(/\//g, ', ');

  const neighbourhood = normalized.match(/([\p{L}\d.\s]+?\bMahallesi)\b/iu)?.[1]?.trim();
  const road = normalized.match(/(\d+(?:\.\s*)?\s*(?:Cadde|Sokak))\b/iu)?.[1]?.trim();
  const localities = normalized
    .split(',')
    .slice(1)
    .map((part) => part.replace(/^\d{5}\s*/, '').trim())
    .filter((part) => part.length >= 3 && !/(Mahallesi|Cadde|Sokak|Blok|\bNo\b)/iu.test(part));

  // City/district usually sit at the tail of the address: ".., İlçe, İl".
  const cityRegion = localities.slice(-2);
  const cityOnly = localities.slice(-1);

  const candidates = [
    `${full}, Türkiye`,
    [road, neighbourhood, ...localities, 'Türkiye'].filter(Boolean).join(', '),
    [neighbourhood, ...cityRegion, 'Türkiye'].filter(Boolean).join(', '),
    [...cityRegion, 'Türkiye'].filter(Boolean).join(', '),
    [...cityOnly, 'Türkiye'].filter(Boolean).join(', '),
  ];
  // Walk from the most precise query to the broadest; dedupe and drop fragments
  // that are too short to be meaningful (e.g. just "Türkiye").
  return [...new Set(candidates.filter((query) => query.length > 10))];
}

export default function LocationPicker({ value, onChange, address = '', onAddressChange, height = 280 }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const skipNextAddressSearch = useRef('');
  const firstAddressEffect = useRef(true);
  const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;

  const reverseGeocode = async (position: LatLng) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(position.lat),
        lon: String(position.lng),
        addressdetails: '1',
        'accept-language': 'tr',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
      if (!response.ok) throw new Error('reverse-geocode');
      const result = (await response.json()) as { display_name?: string };
      const resolved = readableAddress(result);
      if (resolved) {
        skipNextAddressSearch.current = resolved;
        onAddressChange?.(resolved);
      }
    } catch {
      setError('Adres otomatik bulunamadı; konum yine de seçildi.');
    } finally {
      setBusy(false);
    }
  };

  const pick = (position: LatLng) => {
    onChange(position);
    void reverseGeocode(position);
  };

  const findAddress = async (rawQuery = address, signal?: AbortSignal) => {
    const query = rawQuery.trim();
    if (!query) {
      setError('Önce aranacak adresi yazın.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const queries = addressSearchQueries(query);
      let match: { lat: string; lon: string; display_name?: string } | undefined;
      let matchedQuery = '';
      for (let index = 0; index < queries.length; index += 1) {
        if (index > 0) await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        const params = new URLSearchParams({
          format: 'jsonv2', q: queries[index], limit: '1', countrycodes: 'tr', 'accept-language': 'tr',
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
        if (!response.ok) throw new Error('forward-geocode');
        const results = (await response.json()) as { lat: string; lon: string; display_name?: string }[];
        if (results[0]) {
          match = results[0];
          matchedQuery = queries[index];
          break;
        }
      }
      if (!match) {
        setError('Adres hiçbir şekilde bulunamadı. İl/ilçe seçip haritaya tıklayarak konumu işaretleyin.');
        return;
      }
      onChange({ lat: Number(match.lat), lng: Number(match.lon) });
      if (matchedQuery !== `${query}, Türkiye`) {
        setNotice('Adres birebir bulunamadı; harita en yakın bölgeye yönlendirildi. Pini sürükleyerek doğru konuma taşıyın.');
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError('Adres servisine ulaşılamadı. Haritadan seçim yapabilirsiniz.');
    } finally {
      setBusy(false);
    }
  };

  // Address typing drives the map automatically. Debouncing avoids sending a
  // request for every keystroke and the skip ref prevents reverse-geocoded
  // addresses from starting a second forward-geocode loop.
  useEffect(() => {
    if (firstAddressEffect.current) {
      firstAddressEffect.current = false;
      return;
    }
    const query = address.trim();
    if (query === skipNextAddressSearch.current) {
      skipNextAddressSearch.current = '';
      return;
    }
    if (query.length < 5) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => void findAddress(query, controller.signal), 900);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // Only changes in the address field should schedule a new search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum servisini desteklemiyor.');
      return;
    }
    setBusy(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        onChange(next);
        void reverseGeocode(next);
      },
      () => {
        setBusy(false);
        setError('Konum alınamadı. Tarayıcı konum iznini kontrol edin.');
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void findAddress()} disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          Adresi Haritada Bul
        </button>
        <button type="button" onClick={useCurrentLocation} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-text disabled:opacity-50">
          Konumumu Kullan
        </button>
        {busy && <span className="self-center text-xs text-muted">Konum aranıyor...</span>}
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-300">
        <MapContainer center={center} zoom={value ? 15 : 11} style={{ height, width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
          <PinLayer value={value} onChange={pick} />
          <FlyToLocation value={value} />
        </MapContainer>
        <p className="bg-slate-50 px-3 py-2 text-xs text-muted">
          Adresi yazdığınızda harita otomatik gider. Adres yazmadan haritaya tıklayarak da konumu seçebilirsiniz.
        </p>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {notice && <p className="text-xs font-medium text-amber-700">{notice}</p>}
    </div>
  );
}
