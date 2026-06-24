// Central Leaflet setup: loads the CSS once and fixes the default marker icon
// URLs, which otherwise break under bundlers like Vite.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** Default map center (Istanbul) when nothing else is known. */
export const DEFAULT_CENTER: [number, number] = [41.0082, 28.9784];

/** Small colored circle marker, used to distinguish courier states / restaurants. */
export function dotIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'kurye-dot-icon',
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.3)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export { L };
