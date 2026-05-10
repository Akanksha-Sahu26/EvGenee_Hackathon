import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { BookingsAPI, StationsAPI, type Booking, type Station } from "@/lib/api";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MapPin,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Calendar,
  Zap,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, getApiError } from "@/lib/utils";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/owner/stations/$stationId")({
  component: StationOwnerDashboard,
});

function StationOwnerDashboard() {
  const { stationId } = Route.useParams();
  const { isOwner, loading: authLoading, isAuthed } = useAuth();
  const nav = useNavigate();

  const [station, setStation] = useState<Station | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [otpFor, setOtpFor] = useState<Booking | null>(null);
  const [otp, setOtp] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const sr = await StationsAPI.details(stationId);
      setStation(sr.data?.data);
      const br = await BookingsAPI.station(stationId, { limit: 100 });
      setBookings(br.data?.data ?? []);
    } catch (e) {
      toast.error(getApiError(e, "Failed to load station data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      load();
      socket.emit("station:subscribe", stationId);
      const reload = () => load();
      socket.on("booking:created", reload);
      socket.on("booking:cancelled", reload);
      socket.on("booking:checkedIn", reload);
      socket.on("booking:completed", reload);
      return () => {
        socket.emit("station:unsubscribe", stationId);
        socket.off("booking:created", reload);
        socket.off("booking:cancelled", reload);
        socket.off("booking:checkedIn", reload);
        socket.off("booking:completed", reload);
      };
    }
  }, [isOwner, stationId]);

  const handleComplete = async (bookingId: string) => {
    setBusyId(bookingId);
    try {
      await BookingsAPI.complete(bookingId);
      toast.success("Session completed!");
      load();
    } catch (e) {
      toast.error(getApiError(e, "Completion failed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleCheckIn = async () => {
    if (!otpFor) return;
    setBusyId(otpFor._id);
    try {
      await BookingsAPI.checkIn(otpFor._id, { otp });
      toast.success("Checked in! Session started.");
      setOtpFor(null);
      setOtp("");
      load();
    } catch (e) {
      toast.error(getApiError(e, "Invalid OTP"));
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const inProgress = bookings.filter((b) => b.status === "in-progress").length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const revenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((s, b) => s + b.grandTotal, 0);
    return { confirmed, inProgress, completed, revenue };
  }, [bookings]);

  if (authLoading)
    return (
      <div className="h-screen grid place-items-center bg-[#000814]">
        <Loader2 className="h-7 w-7 animate-spin text-green-400" />
      </div>
    );
  if (!isAuthed) return <Navigate to="/auth/login" />;
  if (!isOwner) return <Navigate to="/" />;

  return (
    <div
      className="min-h-screen bg-[#000814] text-white"
      style={{
        paddingBottom: "5.5rem",
        fontFamily: "'DM Sans', sans-serif",
        paddingTop: "calc(var(--safe-top, 0px) + 1rem)",
      }}
    >
      {/* Background glows */}
      <div
        className="fixed top-0 left-0 w-[500px] h-[350px] pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at 0% 0%, rgba(16,185,129,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => nav({ to: "/owner" })}
            className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-white/70" />
          </button>
          <div className="min-w-0">
            <h1
              className="text-xl font-black text-white leading-tight truncate"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              {station?.name || "Station Dashboard"}
            </h1>
            {station && (
              <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0 text-green-400" />
                {station.address.city}, {station.address.street}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-24 grid place-items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-2 border-green-500/20 border-t-green-400 animate-spin" />
                <Zap className="h-5 w-5 text-green-400 absolute inset-0 m-auto" />
              </div>
              <p className="text-white/40 text-sm">Loading bookings…</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Stats Strip ── */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { label: "Confirmed", value: stats.confirmed, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                { label: "Active", value: stats.inProgress, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                { label: "Done", value: stats.completed, color: "text-white", bg: "bg-white/5 border-white/10" },
                { label: "Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
              ].map(({ label, value, color, bg }) => (
                <div
                  key={label}
                  className={cn("rounded-xl p-2.5 border text-center", bg)}
                >
                  <p className={cn("font-black text-base leading-none mb-1", color)}>
                    {value}
                  </p>
                  <p className="text-white/40 text-[10px] font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Bookings List ── */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                borderColor: "rgba(255,255,255,0.07)",
                backdropFilter: "blur(10px)",
              }}
            >
              {/* List header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="text-sm font-bold text-white">Bookings</span>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-white/40 uppercase tracking-widest font-bold border border-white/8">
                  Latest {bookings.length}
                </span>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-14">
                  <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-white/20" />
                  </div>
                  <p className="text-white/30 text-sm font-medium">No bookings yet</p>
                  <p className="text-white/20 text-xs mt-1">Bookings will appear here in real-time</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {bookings.map((b) => {
                    // Safely resolve user name — handle string id or populated object
                    const userName =
                      b.user && typeof b.user === "object" && "name" in b.user
                        ? (b.user as { name: string }).name
                        : typeof b.user === "string"
                        ? "User"
                        : "Unknown";

                    const isConfirmed = b.status === "confirmed";
                    const isInProgress = b.status === "in-progress";
                    const isCompleted = b.status === "completed";
                    const isCancelled = b.status === "cancelled";

                    return (
                      <div
                        key={b._id}
                        className="px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Row 1: name + badge */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-white/50" />
                            </div>
                            <span className="font-bold text-white text-sm truncate">
                              {userName}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0",
                              isConfirmed && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20",
                              isInProgress && "bg-blue-500/20 text-blue-400 border border-blue-500/20",
                              isCompleted && "bg-white/10 text-white/50 border border-white/10",
                              isCancelled && "bg-red-500/20 text-red-400 border border-red-500/20",
                              !isConfirmed && !isInProgress && !isCompleted && !isCancelled &&
                                "bg-white/10 text-white/40 border border-white/10",
                            )}
                          >
                            {b.status}
                          </span>
                        </div>

                        {/* Row 2: date/time + connector */}
                        <div className="flex items-center gap-3 mb-2.5 pl-9">
                          <span className="text-xs text-white/40 flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-white/30 shrink-0" />
                            {format(new Date(b.date), "MMM d, yyyy")} · {b.startTime}–{b.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pl-9 mb-2.5">
                          <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">
                            {b.connectorType}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-white/20" />
                          <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider">
                            {b.estimatedKWh} kWh
                          </span>
                        </div>

                        {/* Row 3: amount + action */}
                        <div className="flex items-center justify-between pl-9">
                          <span className="font-black text-green-400 text-sm">
                            {formatCurrency(b.grandTotal)}
                          </span>
                          <div className="flex gap-2">
                            {isConfirmed && (
                              <button
                                onClick={() => setOtpFor(b)}
                                className="h-8 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                                style={{ boxShadow: "0 0 12px rgba(16,185,129,0.25)" }}
                              >
                                <KeyRound className="h-3 w-3" />
                                Check-in
                              </button>
                            )}
                            {isInProgress && (
                              <button
                                onClick={() => handleComplete(b._id)}
                                disabled={busyId === b._id}
                                className="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{ boxShadow: "0 0 12px rgba(59,130,246,0.25)" }}
                              >
                                {busyId === b._id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Complete
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── OTP Dialog ── */}
      <Dialog open={!!otpFor} onOpenChange={(o) => !o && setOtpFor(null)}>
        <DialogContent className="bg-[#0a1628] border border-white/10 text-white rounded-2xl max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white font-bold">Verify Check-in OTP</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/40">
            Enter the 6-digit OTP provided by the customer.
          </p>
          <Input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setOtpFor(null); setOtp(""); }}
              className="border-white/10 text-white/60 hover:bg-white/5 rounded-xl flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={otp.length !== 6 || busyId === otpFor?._id}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex-1"
            >
              {busyId === otpFor?._id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Verify & Start"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
