import { useState } from "react";
import { X, MapPin, Navigation, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteLocation } from "@/types/note";

interface Props {
  onSelect: (location: NoteLocation) => void;
  onClose: () => void;
}

const POPULAR_LOCATIONS: NoteLocation[] = [
  { name: "Amman, Jordan", lat: 31.9454, lng: 35.9284 },
  { name: "Dubai, UAE", lat: 25.2048, lng: 55.2708 },
  { name: "Riyadh, Saudi Arabia", lat: 24.7136, lng: 46.6753 },
  { name: "Cairo, Egypt", lat: 30.0444, lng: 31.2357 },
  { name: "London, UK", lat: 51.5074, lng: -0.1278 },
  { name: "New York, USA", lat: 40.7128, lng: -74.0060 },
  { name: "Paris, France", lat: 48.8566, lng: 2.3522 },
  { name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
  { name: "Istanbul, Turkey", lat: 41.0082, lng: 28.9784 },
];

export function LocationPickerModal({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let placeName = `Near Lat ${latitude.toFixed(2)}, Lng ${longitude.toFixed(2)}`;

        // Attempt reverse geocoding via OpenStreetMap Nominatim
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`,
            { headers: { "Accept-Language": "en" } }
          );
          if (resp.ok) {
            const data = await resp.json();
            const city = data.address?.city || data.address?.town || data.address?.state || data.address?.country;
            const country = data.address?.country;
            if (city && country && city !== country) {
              placeName = `${city}, ${country}`;
            } else if (city || country) {
              placeName = city || country;
            }
          }
        } catch {
          // Fallback to coords
        }

        setLocating(false);
        onSelect({ name: placeName, lat: latitude, lng: longitude });
        onClose();
      },
      (err) => {
        setLocating(false);
        setErrorMsg(err.code === 1 ? "Location permission denied" : "Unable to retrieve location");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSelect({ name: query.trim() });
    onClose();
  };

  const filtered = POPULAR_LOCATIONS.filter(l =>
    l.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-3 bg-card border border-border rounded-2xl shadow-xl w-72 flex flex-col gap-2.5 select-none" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between pb-1 border-b border-border/70">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">Add Location</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <form onSubmit={handleCustomSubmit} className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search city or place…"
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary rounded-lg border border-transparent focus:outline-none focus:border-primary/40"
        />
      </form>

      {/* Button to request current location */}
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={locating}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        {locating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Finding your location…</span>
          </>
        ) : (
          <>
            <Navigation className="w-3.5 h-3.5 fill-current" />
            <span>Use current location</span>
          </>
        )}
      </button>

      {errorMsg && (
        <p className="text-[10px] text-destructive text-center px-1 font-medium">{errorMsg}</p>
      )}

      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
        Suggested Places
      </div>

      <div className="max-h-36 overflow-y-auto space-y-0.5 p-1 rounded-lg bg-secondary/20">
        {filtered.map(loc => (
          <button
            key={loc.name}
            type="button"
            onClick={() => {
              onSelect(loc);
              onClose();
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium hover:bg-secondary transition-colors"
          >
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate">{loc.name}</span>
          </button>
        ))}

        {query.trim() && !filtered.some(f => f.name.toLowerCase() === query.toLowerCase()) && (
          <button
            type="button"
            onClick={() => {
              onSelect({ name: query.trim() });
              onClose();
            }}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">Use &quot;{query.trim()}&quot;</span>
          </button>
        )}
      </div>
    </div>
  );
}
