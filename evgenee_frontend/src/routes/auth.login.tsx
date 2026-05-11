import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChargingStation } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { getApiError } from "@/lib/utils";
import { tokenStore } from "@/lib/api";

export const Route = createFileRoute("/auth/login")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && tokenStore.get()) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      nav({ to: "/" });
    } catch (err) {
      toast.error(getApiError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000814] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-green-600 to-green-400 items-center justify-center mb-4">
            <FontAwesomeIcon icon={faChargingStation} className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">EvGenee</h1>
          <p className="text-white/40 text-sm">Sign in to find chargers near you</p>
        </div>

        {/* Form */}
        <form
          onSubmit={submit}
          className="bg-white/[0.04] border border-white/8 rounded-3xl p-6 space-y-4"
        >
          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-white/40 uppercase tracking-wide">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-primary/50"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-white/40 uppercase tracking-wide">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-primary/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Link
                to="/auth/forgot-password"
                className="text-xs font-semibold text-green-400 hover:text-green-300 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-green-600 to-green-400 text-white font-bold rounded-xl text-base hover:opacity-90 transition-opacity"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
          </Button>

          <p className="text-center text-sm text-white/40">
            No account?{" "}
            <Link to="/auth/register" className="text-primary font-semibold hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
