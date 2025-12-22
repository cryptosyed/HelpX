import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

const DEFAULT_CENTER = { lat: 12.9716, lon: 77.5946 };

function ClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

export default function MapPickerModal({ isOpen, onClose, onConfirm, initialLat, initialLon }) {
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  const center = useMemo(() => {
    if (selected) return selected;
    if (initialLat != null && initialLon != null) return { lat: Number(initialLat), lng: Number(initialLon) };
    return { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lon };
  }, [selected, initialLat, initialLon]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          setSelected({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          /* ignore geolocation failure */
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Choose location on map</h2>
          <button onClick={onClose} className="text-sm text-slate-600 hover:text-slate-800">
            Close
          </button>
        </div>

        <div className="relative h-[420px] bg-slate-100">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm px-4">
              Map unavailable. Please enter location manually.
            </div>
          )}
          {!error && (
            <MapContainer
              center={center}
              zoom={13}
              className="h-full w-full"
              whenReady={() => setError(null)}
              errorTileUrl=""
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <ClickHandler onSelect={(latlng) => setSelected(latlng)} />
              {selected && (
                <Marker
                  position={selected}
                  draggable
                  eventHandlers={{
                    dragend: (e) => {
                      const latlng = e.target.getLatLng();
                      setSelected(latlng);
                    },
                  }}
                  icon={L.icon({
                    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                  })}
                />
              )}
            </MapContainer>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-700">
            {selected
              ? (
                <>
                  <span className="font-semibold">Selected:</span>{" "}
                  {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
                </>
              )
              : "Tap on the map to drop a pin."}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-sm">
              Cancel
            </button>
            <button
              className="btn-gradient text-sm disabled:opacity-60"
              onClick={() => {
                if (!selected) return;
                onConfirm({ lat: selected.lat, lon: selected.lng });
                onClose();
              }}
              disabled={!selected}
            >
              Confirm location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

