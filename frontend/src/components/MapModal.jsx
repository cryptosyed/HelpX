import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

/**
 * Leaflet map modal with automatic re-centering once visible.
 */
export default function MapModal({ lat, lon, onClose, title }) {
  const mapRef = useRef(null);

  if (lat == null || lon == null) return null;

  function handleMapReady(map) {
    mapRef.current = map;
    setTimeout(() => {
      try {
        map.invalidateSize({ reset: true });
        map.setView([lat, lon], 15, { animate: true });
      } catch (err) {
        console.warn("Map sizing failed", err);
      }
    }, 150);
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setTimeout(() => {
      try {
        map.invalidateSize({ reset: true });
        map.setView([lat, lon], 15);
      } catch (err) {
        console.warn("Map recenter failed", err);
      }
    }, 150);
  }, [lat, lon]);

  useEffect(() => {
    return () => {
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-5 z-50 animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-label="Map preview"
      onClick={onClose}
    >
      <div className="glass-strong rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/50" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <span className="font-semibold text-slate-800">{title}</span>
          <button 
            type="button" 
            className="btn-gradient text-sm" 
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex-1 min-h-[500px]">
          <MapContainer
            key={`${lat}-${lon}`}
            center={[lat, lon]}
            zoom={15}
            whenCreated={handleMapReady}
            className="w-full h-full rounded-b-2xl"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lon]}>
              <Popup>{title}</Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
