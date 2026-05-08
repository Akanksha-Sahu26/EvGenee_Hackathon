import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { StationsAPI, type Station } from "@/lib/api";
import { StationsMap } from "@/components/StationsMap";
import { Search, Zap, Loader2, LocateFixed, Plug, X, ChevronRight, MapPin } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChargingStation } from "@fortawesome/free-solid-svg-icons";
import { getApiError } from "@/lib/utils";
import { toast } from "sonner";
import { LandingPage } from "@/components/LandingPage";
import { Drawer } from "vaul";
import { useNavigate } from "@tanstack/react-router";

/** Returns distance in meters between two [lat, lng] pairs using Haversine */
function distanceMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Haversine formula — returns distance in kilometres between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Attach accurate distanceKm to every station based on the user's real GPS location */
function attachDistances(stations: Station[], userLoc: [number, number] | null): Station[] {
  if (!userLoc) return stations;
  return stations.map((s) => {
    const [sLng, sLat] = s.location.coordinates; // GeoJSON is [lng, lat]
    return { ...s, distanceKm: haversineKm(userLoc[0], userLoc[1], sLat, sLng) };
  });
}

// ─── UPDATE 4: Helper to format a distance value for display ────────────────
function formatDistance(km: number): string {
  return km < 1 ? `${(km * 1000).toFixed(0)}m` : `${km.toFixed(1)}km`;
}

export const Route = createFileRoute("/")({ component: HomePage });

const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
const NAV_H = 64;

function HomePage() {
  const { isAuthed, loading, isOwner } = useAuth();
  const navigate = useNavigate();

  const [center, setCenter] = useState<[number, number]>(() => {
    if (typeof window !== "undefined") {
      const s = sessionStorage.getItem("mapCenter");
      if (s) {
        try {
          return JSON.parse(s) as [number, number];
        } catch {}
      }
    }
    return DEFAULT_CENTER;
  });

  const [rawStations, setRawStations] = useState<Station[]>(() => {
    if (typeof window !== "undefined") {
      const s = sessionStorage.getItem("stationsCache");
      if (s) {
        try {
          return JSON.parse(s) as Station[];
        } catch {}
      }
    }
    return [];
  });

  const [loadingStations, setLoadingStations] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(() => {
    if (typeof window !== "undefined") {
      const s = sessionStorage.getItem("userLocation");
      if (s) {
        try {
          return JSON.parse(s) as [number, number];
        } catch {}
      }
    }
    return null;
  });
  const [locating, setLocating] = useState(false);
  const [snap, setSnap] = useState<string | number | null>("35vh");

  const stations = useMemo(
    () => attachDistances(rawStations, userLocation),
    [rawStations, userLocation],
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Continuous GPS tracking ──────────────────────────────────────────────────
  const lastKnownLocRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!isAuthed || !navigator.geolocation) return;
    setLocating(true);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const prev = lastKnownLocRef.current;
        const moved = !prev || distanceMeters(prev, c) > 15;
        lastKnownLocRef.current = c;
        sessionStorage.setItem("userLocation", JSON.stringify(c));
        if (moved) setUserLocation(c);
        if (!sessionStorage.getItem("mapCenter")) {
          setCenter(c);
          sessionStorage.setItem("mapCenter", JSON.stringify(c));
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) toast.error("Location permission denied");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isAuthed]);

  // ── Locate FAB ──────────────────────────────────────────────────────────────
  const locate = useCallback(() => {
    if (userLocation) {
      setCenter(userLocation);
      sessionStorage.setItem("mapCenter", JSON.stringify(userLocation));
    } else {
      toast.error("Waiting for location — please allow GPS access");
    }
  }, [userLocation]);

  // ── Station fetch — only re-fetches when map panned > 5 km ─────────────────
  const fetchCenterRef = useRef<[number, number]>(center);
  const stationFetchTrigger = useRef(0);
  const [fetchTick, setFetchTick] = useState(0);

  const handleMapMove = useCallback((c: [number, number]) => {
    setCenter(c);
    sessionStorage.setItem("mapCenter", JSON.stringify(c));
    const moved = distanceMeters(fetchCenterRef.current, c) > 5000;
    if (moved) {
      fetchCenterRef.current = c;
      stationFetchTrigger.current += 1;
      setFetchTick(stationFetchTrigger.current);
    }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    let cancel = false;
    (async () => {
      if (!sessionStorage.getItem("stationsCache")) setLoadingStations(true);
      try {
        const fc = fetchCenterRef.current;
        const r = isOwner
          ? await StationsAPI.myStations()
          : await StationsAPI.nearby({ lat: fc[0], lng: fc[1], maxDistance: 50000 });
        if (!cancel) {
          const newStations = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
          setRawStations(newStations);
          sessionStorage.setItem("stationsCache", JSON.stringify(newStations));
        }
      } catch (e) {
        if (!cancel && !sessionStorage.getItem("stationsCache")) {
          toast.error(getApiError(e, "Failed to load stations"));
        }
      } finally {
        if (!cancel) setLoadingStations(false);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTick, isAuthed, isOwner]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address?.city?.toLowerCase().includes(q) ||
        s.address?.street?.toLowerCase().includes(q),
    );
  }, [stations, search]);

  // ─── UPDATE 4: Road distances via OSRM ──────────────────────────────────────
  const [roadDistances, setRoadDistances] = useState<Record<string, number>>({});

  useEffect(() => {
    const top = filtered.slice(0, 8);
    if (!userLocation || top.length === 0) return;

    // Only fetch for stations not yet in the cache
    const missing = top.filter((s) => !roadDistances[s._id]);
    if (missing.length === 0) return;

    const controller = new AbortController();
    (async () => {
      try {
        const coords = [
          `${userLocation[1]},${userLocation[0]}`,
          ...top.map((s) => `${s.location.coordinates[0]},${s.location.coordinates[1]}`),
        ].join(";");

        const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=distance`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();

        if (data.distances?.[0]) {
          const newDists: Record<string, number> = { ...roadDistances };
          data.distances[0].forEach((d: number, i: number) => {
            if (i === 0) return; // skip self-distance
            const station = top[i - 1];
            if (station && d !== null) {
              newDists[station._id] = d / 1000; // metres → km
            }
          });
          setRoadDistances(newDists);
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError")
          console.error("Road distance fetch failed", e);
      }
    })();
    return () => controller.abort();
  }, [filtered, userLocation]); // roadDistances intentionally excluded to avoid loop

  // ─── UPDATE 4: Pick the best distance value + know which type it is ─────────
  function getDistanceInfo(
    stationId: string,
    haversineKmVal: number | undefined,
  ): { km: number; isRoad: boolean } | null {
    if (roadDistances[stationId] !== undefined) {
      return { km: roadDistances[stationId], isRoad: true };
    }
    if (haversineKmVal !== undefined) {
      return { km: haversineKmVal, isRoad: false };
    }
    return null;
  }

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleSelect = useCallback((s: Station) => {
    setSelectedId(s._id);
    setShowDropdown(false);
  }, []);

  const handleDeselect = useCallback(() => setSelectedId(null), []);

  if (loading)
    return (
      <div className="fixed inset-0 grid place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!isAuthed) return <LandingPage />;

  const fabBottom = `calc(${NAV_H}px + 37vh)`;

  return (
    <>
      {/* ── FULL-SCREEN MAP ── */}
      <div className="fixed inset-0 z-0">
        <StationsMap
          center={center}
          stations={filtered}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
          selectedId={selectedId}
          onCenterChange={handleMapMove}
          userLocation={userLocation}
          navigate={navigate}
        />
      </div>

      {/* ── FLOATING SEARCH BAR ── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 12px 0",
          pointerEvents: "none",
        }}
      >
        <div
          ref={dropdownRef}
          style={{
            maxWidth: 600,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            pointerEvents: "auto",
          }}
        >
          {/* Search pill + nearby chip row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Search pill */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(0,8,20,0.90)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                padding: "0 12px 0 16px",
                height: 48,
                cursor: "text",
              }}
              onClick={() => {
                const input = dropdownRef.current?.querySelector("input");
                input?.focus();
              }}
            >
              <Search size={16} color="rgba(255,255,255,0.4)" style={{ flexShrink: 0 }} />
              <input
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Search charging stations…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(e.target.value.trim().length > 0);
                }}
                onFocus={() => {
                  if (search.trim()) setShowDropdown(true);
                  setSnap("70px");
                }}
                onBlur={() => {
                  setTimeout(() => setSnap("35vh"), 250);
                }}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 15,
                  color: "#ffffff",
                  minWidth: 0,
                  WebkitAppearance: "none",
                  touchAction: "manipulation",
                  cursor: "text",
                  pointerEvents: "auto",
                }}
              />
              {search ? (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearch("");
                    setShowDropdown(false);
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    padding: 6,
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.4)",
                    display: "flex",
                    borderRadius: 8,
                    flexShrink: 0,
                    pointerEvents: "auto",
                  }}
                >
                  <X size={16} />
                </button>
              ) : loadingStations ? (
                <Loader2
                  size={16}
                  className="animate-spin text-primary"
                  style={{ flexShrink: 0 }}
                />
              ) : null}
            </div>

            {/* Nearby chip */}
            <div
              style={{
                flexShrink: 0,
                background: "rgba(0,8,20,0.90)",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: 16,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                height: 48,
                fontSize: 13,
                fontWeight: 700,
                color: "#22c55e",
                whiteSpace: "nowrap",
              }}
            >
              <Zap size={13} color="#22c55e" fill="#22c55e" />
              {loadingStations ? "…" : `${stations.length} nearby`}
            </div>
          </div>

          {/* Dropdown */}
          {showDropdown && search.trim() && (
            <div
              style={{
                background: "rgba(10,22,40,0.97)",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                overflow: "hidden",
                maxHeight: 280,
                overflowY: "auto",
                pointerEvents: "auto",
              }}
            >
              {filtered.length === 0 ? (
                <div
                  style={{
                    padding: "24px 16px",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  <Plug
                    size={28}
                    style={{ margin: "0 auto 8px", opacity: 0.4, display: "block" }}
                  />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>No stations found</p>
                </div>
              ) : (
                filtered.slice(0, 8).map((s) => {
                  const avail = s.isOpen && s.availablePorts > 0;
                  // ─── UPDATE 4: Prioritize road distance, fall back to haversine ──
                  const distInfo = getDistanceInfo(s._id, s.distanceKm);

                  return (
                    <button
                      key={s._id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(s);
                        setSearch(s.name);
                        setShowDropdown(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        background: "none",
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                      }
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: avail ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faChargingStation}
                          style={{
                            fontSize: 16,
                            color: avail ? "#22c55e" : "rgba(255,255,255,0.3)",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            fontSize: 13,
                            color: "white",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.name}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 11,
                            color: "rgba(255,255,255,0.35)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.address?.street}, {s.address?.city}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 2,
                          flexShrink: 0,
                        }}
                      >
                        {/* ─── UPDATE 4: Green = road distance, Gray = map distance ── */}
                        {distInfo && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              // Green for road distance (accurate), gray for haversine (approximate)
                              color: distInfo.isRoad ? "#22c55e" : "rgba(255,255,255,0.45)",
                              background: distInfo.isRoad
                                ? "rgba(34,197,94,0.1)"
                                : "rgba(255,255,255,0.07)",
                              padding: "1px 6px",
                              borderRadius: 6,
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            {formatDistance(distInfo.km)}
                            {/* Label shows which type of distance */}
                            <span
                              style={{
                                fontSize: 8,
                                opacity: 0.7,
                                fontWeight: 800,
                                letterSpacing: "0.03em",
                              }}
                            >
                              {distInfo.isRoad ? "ROAD" : "MAP"}
                            </span>
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: avail ? "#22c55e" : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {avail ? `${s.availablePorts} free` : s.isOpen ? "Full" : "Closed"}
                        </span>
                      </div>
                      <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── FAB: LOCATE ── */}
      <button
        onClick={locate}
        aria-label="My location"
        style={{
          position: "fixed",
          right: 16,
          bottom: fabBottom,
          zIndex: 600,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "rgba(0,8,20,0.90)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "transform 0.15s",
          pointerEvents: "auto",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.93)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {locating ? (
          <Loader2 size={20} className="animate-spin text-primary" />
        ) : (
          <LocateFixed size={20} color="#22c55e" />
        )}
      </button>

      {/* ── MOBILE BOTTOM DRAWER ── */}
      <div className="md:hidden">
        <Drawer.Root
          open={true}
          dismissible={false}
          modal={false}
          snapPoints={["70px", "35vh", "75vh"]}
          activeSnapPoint={snap}
          setActiveSnapPoint={setSnap}
        >
          <Drawer.Portal>
            <Drawer.Content
              className="outline-none"
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: NAV_H,
                zIndex: 999,
                maxHeight: "82vh",
                background: "rgba(10,22,40,0.97)",
                borderRadius: "24px 24px 0 0",
                boxShadow: "0 -4px 32px rgba(0,0,0,0.3)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.15)",
                  margin: "10px auto 4px",
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  padding: "4px 16px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "white" }}>
                    Nearby Stations
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                    Swipe up to browse all
                  </p>
                </div>
                <span
                  style={{
                    background: "rgba(34,197,94,0.15)",
                    color: "#22c55e",
                    border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: 20,
                    padding: "2px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {filtered.length} found
                </span>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "0 12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {loadingStations ? (
                  <div
                    style={{
                      padding: "32px 0",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    <Loader2 size={28} className="animate-spin text-primary" />
                    <p style={{ margin: 0, fontSize: 13 }}>Finding stations…</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div
                    style={{
                      padding: "32px 0",
                      textAlign: "center",
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    <Plug
                      size={28}
                      style={{ margin: "0 auto 8px", opacity: 0.4, display: "block" }}
                    />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>No stations found</p>
                  </div>
                ) : (
                  filtered.map((s) => (
                    <MobileCard
                      key={s._id}
                      station={s}
                      isSelected={selectedId === s._id}
                      // ─── UPDATE 4: Pass road distance down to card ───────────
                      roadDistanceKm={roadDistances[s._id]}
                      onSelect={() => {
                        handleSelect(s);
                        setSnap("70px");
                      }}
                    />
                  ))
                )}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </>
  );
}

function MobileCard({
  station,
  isSelected,
  onSelect,
  roadDistanceKm,
}: {
  station: Station;
  isSelected: boolean;
  onSelect: () => void;
  // ─── UPDATE 4: New prop for road distance ──────────────────────────────────
  roadDistanceKm?: number;
}) {
  const avail = station.isOpen && station.availablePorts > 0;
  const minPrice = station.pricing?.length
    ? Math.min(...station.pricing.map((p) => p.priceperKWh))
    : 0;
  const sym = station.pricing?.[0]?.currency === "INR" ? "₹" : "$";
  const avgRating = station.reviews?.length
    ? (station.reviews.reduce((a, r) => a + r.rating, 0) / station.reviews.length).toFixed(1)
    : null;

  // ─── UPDATE 4: Prefer road distance over haversine in card ─────────────────
  const distInfo =
    roadDistanceKm !== undefined
      ? { km: roadDistanceKm, isRoad: true }
      : station.distanceKm !== undefined
        ? { km: station.distanceKm, isRoad: false }
        : null;

  return (
    <button
      onClick={onSelect}
      style={{
        width: "100%",
        textAlign: "left",
        padding: 12,
        background: isSelected ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${isSelected ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        transition: "all 0.15s",
        boxShadow: isSelected ? "0 0 0 3px rgba(34,197,94,0.1)" : "none",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: avail ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {station.Images?.[0] ? (
          <img
            src={station.Images[0]}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <FontAwesomeIcon
            icon={faChargingStation}
            style={{
              fontSize: 22,
              color: avail ? "#22c55e" : "rgba(255,255,255,0.3)",
            }}
          />
        )}
        <span
          style={{
            position: "absolute",
            top: 3,
            right: 3,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: avail ? "#22c55e" : station.isOpen ? "#fbbf24" : "rgba(255,255,255,0.2)",
            border: "2px solid rgba(10,22,40,0.9)",
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: 13,
            color: "white",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {station.name}
        </p>
        <p
          style={{
            margin: "3px 0 0",
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <MapPin size={10} style={{ flexShrink: 0 }} /> {station.address?.street},{" "}
          {station.address?.city}
        </p>
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e" }}>
            {sym}
            {minPrice}/kWh
          </span>
          {avgRating && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>★ {avgRating}</span>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: avail ? "#22c55e" : "rgba(255,255,255,0.3)",
            }}
          >
            {avail ? `${station.availablePorts} free` : station.isOpen ? "Full" : "Closed"}
          </span>

          {/* ─── UPDATE 4: Green badge = road, Gray badge = map distance ────── */}
          {distInfo && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                // Green for road distance (accurate), gray for haversine (approximate)
                color: distInfo.isRoad ? "#22c55e" : "rgba(255,255,255,0.45)",
                background: distInfo.isRoad
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(255,255,255,0.07)",
                padding: "1px 6px",
                borderRadius: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              {formatDistance(distInfo.km)}
              <span style={{ fontSize: 8, opacity: 0.7, fontWeight: 800 }}>
                {distInfo.isRoad ? "ROAD" : "MAP"}
              </span>
            </span>
          )}
        </div>
      </div>
      <ChevronRight
        size={16}
        color={isSelected ? "#22c55e" : "rgba(255,255,255,0.2)"}
        style={{ flexShrink: 0 }}
      />
    </button>
  );
}
