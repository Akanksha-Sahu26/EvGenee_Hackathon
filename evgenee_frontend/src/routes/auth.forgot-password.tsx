import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AuthAPI, tokenStore } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle2, Lock, Mail, KeyRound } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChargingStation } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { getApiError } from "@/lib/utils";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth/forgot-password")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && tokenStore.get()) {
      throw redirect({ to: "/" });
    }
  },
  component: ForgotPasswordPage,
});

type Step = "REQUEST" | "VERIFY" | "RESET" | "SUCCESS";

function ForgotPasswordPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("REQUEST");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await AuthAPI.forgotPassword({ email });
      toast.success("OTP sent to your email!");
      setStep("VERIFY");
    } catch (err) {
      toast.error(getApiError(err, "Failed to send OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await AuthAPI.verifyOTP({ email, otp });
      toast.success("OTP verified!");
      setStep("RESET");
    } catch (err) {
      toast.error(getApiError(err, "Invalid OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await AuthAPI.resetPassword({ email, otp, password });
      toast.success("Password reset successful!");
      setStep("SUCCESS");
    } catch (err) {
      toast.error(getApiError(err, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000814] flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/auth/login" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Link>
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-green-600 to-green-400 items-center justify-center mb-4 shadow-lg shadow-green-500/20">
            <FontAwesomeIcon icon={faChargingStation} className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            {step === "REQUEST" && "Forgot Password?"}
            {step === "VERIFY" && "Verify OTP"}
            {step === "RESET" && "Set New Password"}
            {step === "SUCCESS" && "All Set!"}
          </h1>
          <p className="text-white/40 text-sm max-w-[280px] mx-auto">
            {step === "REQUEST" && "Enter your email to receive a 6-digit verification code."}
            {step === "VERIFY" && `We've sent a code to ${email}`}
            {step === "RESET" && "Choose a strong password to secure your account."}
            {step === "SUCCESS" && "Your password has been successfully updated."}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white/[0.04] border border-white/8 rounded-[2rem] p-8 backdrop-blur-xl relative overflow-hidden">
          {/* Step 1: Request */}
          {step === "REQUEST" && (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="h-3 w-3" /> Email Address
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="bg-white/5 border-white/10 h-12 text-white placeholder:text-white/20 rounded-2xl focus:ring-green-500/50"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-14 bg-gradient-to-r from-green-600 to-green-400 text-white font-bold rounded-2xl text-base hover:shadow-lg hover:shadow-green-500/20 transition-all active:scale-[0.98]"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Send Code"}
              </Button>
            </form>
          )}

          {/* Step 2: Verify */}
          {step === "VERIFY" && (
            <form onSubmit={handleVerifyOTP} className="space-y-8 flex flex-col items-center">
              <div className="space-y-4 w-full flex flex-col items-center">
                <Label className="text-xs font-bold text-white/40 uppercase tracking-widest self-start flex items-center gap-2">
                  <KeyRound className="h-3 w-3" /> 6-Digit Code
                </Label>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(val) => setOtp(val)}
                  pattern={REGEXP_ONLY_DIGITS}
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="w-12 h-14 bg-white/5 border-white/10 text-xl font-bold rounded-xl text-green-400"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="w-full space-y-4">
                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-14 bg-gradient-to-r from-green-600 to-green-400 text-white font-bold rounded-2xl text-base"
                >
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Verify Code"}
                </Button>
                <button
                  type="button"
                  onClick={handleRequestOTP}
                  className="w-full text-center text-sm text-green-400 hover:text-green-300 font-medium"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Reset */}
          {step === "RESET" && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Lock className="h-3 w-3" /> New Password
                  </Label>
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-white/5 border-white/10 h-12 text-white placeholder:text-white/20 rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" /> Confirm Password
                  </Label>
                  <Input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-white/5 border-white/10 h-12 text-white placeholder:text-white/20 rounded-2xl"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || !password || password !== confirmPassword}
                className="w-full h-14 bg-gradient-to-r from-green-600 to-green-400 text-white font-bold rounded-2xl text-base"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Reset Password"}
              </Button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === "SUCCESS" && (
            <div className="space-y-8 text-center py-4">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
              <Button
                onClick={() => nav({ to: "/auth/login" })}
                className="w-full h-14 bg-gradient-to-r from-green-600 to-green-400 text-white font-bold rounded-2xl text-base"
              >
                Sign In Now
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-white/20 mt-8">
          Secure and private charging network by <span className="text-white/40 font-bold">EvGenee</span>
        </p>
      </div>
    </div>
  );
}
