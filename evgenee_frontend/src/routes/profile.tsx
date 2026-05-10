import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AuthAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  LogOut,
  Mail,
  Shield,
  User,
  Zap,
  Car,
  BatteryCharging,
  Plug,
  CheckCircle2,
  Pencil,
  Plus,
  X,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { getApiError } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

// Helper – basic Indian vehicle number format, e.g. "MH 01 AB 1234"
function formatVehicleNumber(raw: string) {
  return raw.toUpperCase().trim();
}

function ProfilePage() {
  const { user, loading, isAuthed, logout, refresh } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    vehicleType: "EV",
    connectorType: "Type2",
    batteryCapacity: "",
  });
  const [vehicleNumbers, setVehicleNumbers] = useState<string[]>([]);
  const [newVehicleNum, setNewVehicleNum] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? "",
        vehicleType: user.vehicle?.type ?? "EV",
        connectorType: user.vehicle?.connectorType ?? "Type2",
        batteryCapacity: user.vehicle?.batteryCapacity?.toString() ?? "",
      });
      setVehicleNumbers(user.vehicleNumbers ?? []);
    }
  }, [user]);

  if (loading)
    return (
      <div className="h-screen grid place-items-center bg-[#000814]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-green-500/20 border-t-green-400 animate-spin" />
            <Zap className="h-5 w-5 text-green-400 absolute inset-0 m-auto" />
          </div>
          <p className="text-white/40 text-sm">Loading profile…</p>
        </div>
      </div>
    );
  if (!isAuthed || !user) return <Navigate to="/auth/login" />;

  const addVehicleNumber = () => {
    const val = formatVehicleNumber(newVehicleNum);
    if (!val) return;
    if (vehicleNumbers.includes(val)) {
      toast.error("This vehicle number is already added");
      return;
    }
    setVehicleNumbers((prev) => [...prev, val]);
    setNewVehicleNum("");
  };

  const removeVehicleNumber = (num: string) => {
    setVehicleNumbers((prev) => prev.filter((v) => v !== num));
  };

  const save = async () => {
    setSaving(true);
    try {
      await AuthAPI.updateProfile({
        name: form.name,
        vehicle: {
          type: form.vehicleType as "EV" | "Hybrid" | "Petrol" | "Diesel",
          connectorType: form.connectorType as "CCS2" | "CHAdeMO" | "Type2",
          batteryCapacity: form.batteryCapacity
            ? Number(form.batteryCapacity)
            : undefined,
        },
        vehicleNumbers,
      });
      await refresh();
      toast.success("Profile updated successfully");
    } catch (e) {
      toast.error(getApiError(e, "Update failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    nav({ to: "/auth/login" });
  };

  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="min-h-screen bg-[#000814] text-white overflow-x-hidden"
      style={{ paddingBottom: "5.5rem", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Background glows */}
      <div
        className="fixed top-0 left-0 w-[600px] h-[400px] pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at 0% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        className="fixed bottom-0 right-0 w-[500px] h-[400px] pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at 100% 100%, rgba(59,130,246,0.06) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative z-10 max-w-lg mx-auto px-4"
        style={{ paddingTop: "calc(var(--safe-top, 0px) + 1.5rem)" }}
      >
        {/* ── Hero Header ─────────────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden mb-5">
          <div
            style={{
              background:
                "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 70%, #10b981 100%)",
            }}
            className="absolute inset-0"
          />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -bottom-12 left-1/4 w-48 h-48 bg-white/[0.03] rounded-full" />
          <div className="absolute top-4 right-16 w-6 h-6 bg-white/10 rounded-full" />
          <div className="absolute bottom-8 right-8 w-3 h-3 bg-green-300/30 rounded-full" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, white 0px, white 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, white 0px, white 1px, transparent 1px, transparent 40px)",
            }}
          />

          <div className="relative z-10 p-6 pb-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="relative">
                <div className="h-[72px] w-[72px] rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-black text-white shadow-xl">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-400 rounded-full border-2 border-[#065f46] flex items-center justify-center">
                  <div className="h-1.5 w-1.5 bg-white rounded-full" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h1
                  className="text-xl font-extrabold text-white leading-tight truncate"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {user.name}
                </h1>
                <p className="text-white/65 text-xs flex items-center gap-1.5 mt-0.5 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  {user.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-0.5 border border-white/20">
                    <Shield className="h-3 w-3 text-green-200" />
                    <span className="text-[11px] font-semibold text-white/90 capitalize">
                      {user.role ?? "User"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 bg-green-400/20 rounded-full px-2.5 py-0.5 border border-green-300/20">
                    <CheckCircle2 className="h-3 w-3 text-green-300" />
                    <span className="text-[11px] font-semibold text-green-200">
                      Verified
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Vehicle", value: form.vehicleType || "—", icon: Car },
                {
                  label: "Connector",
                  value: form.connectorType || "—",
                  icon: Plug,
                },
                {
                  label: "Battery",
                  value: form.batteryCapacity
                    ? `${form.batteryCapacity} kWh`
                    : "—",
                  icon: BatteryCharging,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/10 text-center"
                >
                  <Icon className="h-3.5 w-3.5 text-green-200 mx-auto mb-1" />
                  <p className="text-white font-bold text-xs leading-none mb-0.5">
                    {value}
                  </p>
                  <p className="text-white/50 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Account Section ──────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5 mb-3 border"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            borderColor: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-lg bg-green-500/15 border border-green-500/20 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-green-400" />
            </div>
            <span className="text-sm font-bold text-white">Account</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
              Full Name
            </Label>
            <div className="relative">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-green-500/50 focus:ring-green-500/10 pr-10 h-11"
              />
              <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20 pointer-events-none" />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <Label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
              Email Address
            </Label>
            <div className="relative">
              <Input
                value={user.email}
                disabled
                className="bg-white/[0.03] border-white/5 text-white/40 rounded-xl h-11 cursor-not-allowed"
              />
              <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/15 pointer-events-none" />
            </div>
            <p className="text-[10px] text-white/25 pl-1">
              Email cannot be changed
            </p>
          </div>
        </div>

        {/* ── Vehicle Spec Section ─────────────────────────────────── */}
        {user.role === "user" && (
          <div
            className="rounded-2xl p-5 mb-3 border"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
              borderColor: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                <Car className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="text-sm font-bold text-white">Vehicle</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
                  Type
                </Label>
                <Select
                  value={form.vehicleType}
                  onValueChange={(v) => setForm({ ...form, vehicleType: v })}
                >
                  <SelectTrigger className="bg-white/[0.05] border-white/10 text-white rounded-xl h-11 focus:border-blue-500/50 focus:ring-blue-500/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1628] border-white/10 text-white rounded-xl">
                    {["EV", "Hybrid", "Petrol", "Diesel"].map((v) => (
                      <SelectItem
                        key={v}
                        value={v}
                        className="text-white hover:bg-white/10 focus:bg-white/10 rounded-lg"
                      >
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
                  Connector
                </Label>
                <Select
                  value={form.connectorType}
                  onValueChange={(v) => setForm({ ...form, connectorType: v })}
                >
                  <SelectTrigger className="bg-white/[0.05] border-white/10 text-white rounded-xl h-11 focus:border-blue-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1628] border-white/10 text-white rounded-xl">
                    {["CCS2", "CHAdeMO", "Type2"].map((v) => (
                      <SelectItem
                        key={v}
                        value={v}
                        className="text-white hover:bg-white/10 focus:bg-white/10 rounded-lg"
                      >
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <BatteryCharging className="h-3 w-3" />
                Battery Capacity (kWh)
              </Label>
              <Input
                type="number"
                value={form.batteryCapacity}
                onChange={(e) =>
                  setForm({ ...form, batteryCapacity: e.target.value })
                }
                className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 rounded-xl h-11 focus:border-blue-500/50 focus:ring-blue-500/10"
                placeholder="e.g. 75"
              />
            </div>
          </div>
        )}

        {/* ── Vehicle Numbers Section (users only) ─────────────────── */}
        {user.role === "user" && (
          <div
            className="rounded-2xl p-5 mb-4 border"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
              borderColor: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
                  <Hash className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white">My Vehicles</span>
                  <span className="ml-2 text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full border border-white/8">
                    {vehicleNumbers.length} registered
                  </span>
                </div>
              </div>
            </div>

            {vehicleNumbers.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {vehicleNumbers.map((num) => (
                  <div
                    key={num}
                    className="group flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-1.5 transition-all hover:bg-purple-500/15"
                  >
                    <Car className="h-3 w-3 text-purple-400 shrink-0" />
                    <span className="text-sm font-bold text-purple-200 tracking-wider font-mono">
                      {num}
                    </span>
                    <button
                      onClick={() => removeVehicleNumber(num)}
                      className="ml-1 h-4 w-4 rounded-full bg-white/10 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                      aria-label={`Remove ${num}`}
                    >
                      <X className="h-2.5 w-2.5 text-white/60 hover:text-red-300" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 mb-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-2">
                  <Car className="h-5 w-5 text-white/20" />
                </div>
                <p className="text-white/30 text-xs">No vehicles registered yet</p>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={newVehicleNum}
                  onChange={(e) => setNewVehicleNum(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addVehicleNumber();
                    }
                  }}
                  placeholder="e.g. MH 01 AB 1234"
                  className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 rounded-xl h-11 focus:border-purple-500/50 focus:ring-purple-500/10 pr-3 font-mono uppercase"
                />
              </div>
              <button
                onClick={addVehicleNumber}
                disabled={!newVehicleNum.trim()}
                className="h-11 px-4 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)",
                  boxShadow: newVehicleNum.trim()
                    ? "0 0 16px rgba(124,58,237,0.3)"
                    : "none",
                }}
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            <p className="text-[10px] text-white/25 mt-2 pl-1">
              Press Enter or tap Add · Vehicle number will be auto-uppercased
            </p>
          </div>
        )}

        {/* ── Save Button ──────────────────────────────────────────── */}
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-2xl font-bold text-sm text-white mb-3 relative overflow-hidden transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          style={{
            background: saving
              ? "linear-gradient(90deg, #065f46, #047857)"
              : "linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)",
            boxShadow: saving
              ? "none"
              : "0 0 24px rgba(16,185,129,0.35), 0 4px 12px rgba(0,0,0,0.3)",
            height: "48px",
          }}
        >
          {!saving && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)",
              }}
            />
          )}
          <span className="relative z-10 flex items-center justify-center gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Save Changes
              </>
            )}
          </span>
        </button>

        {/* ── Sign Out ─────────────────────────────────────────────── */}
        <button
          onClick={handleLogout}
          className="w-full h-12 rounded-2xl font-semibold text-sm text-red-400 border flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] hover:bg-red-500/10 group"
          style={{
            borderColor: "rgba(239,68,68,0.2)",
            background: "rgba(239,68,68,0.05)",
          }}
        >
          <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Sign out
        </button>

        <p className="text-center text-white/15 text-[10px] mt-5 tracking-widest uppercase">
          EvGenee · v1.0
        </p>
      </div>
    </div>
  );
}
