"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { Poppins } from "next/font/google";

import {
  signInWithGoogle,
  signInWithEmailPassword,
  signUpWithEmail,
  sendPasswordReset,
} from "@/lib/auth-client";
import { analytics } from "@/lib/analytics";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

type AuthMode = "signin" | "signup";

export function SignInClient() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      resetMessages();
      const credential = await signInWithGoogle();
      analytics.track("signin_google");
      const isNewUser =
        credential?.user?.metadata?.creationTime ===
        credential?.user?.metadata?.lastSignInTime;
      router.push(isNewUser ? "/onboarding/start" : "/dashboard");
    } catch (err) {
      console.error("Error signing in with Google", err);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();
    setIsEmailLoading(true);

    try {
      if (mode === "signin") {
        await signInWithEmailPassword({ email: email.trim(), password });
        analytics.track("signin_email");
      } else {
        await signUpWithEmail({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        analytics.track("signup_email");
      }

      router.push(mode === "signup" ? "/onboarding/start" : "/dashboard");
    } catch (err) {
      console.error("Error handling email auth", err);
      setError(getFriendlyAuthError(err));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    resetMessages();
    if (!email.trim()) {
      setError("Enter your email so we know where to send the reset link.");
      return;
    }

    try {
      await sendPasswordReset(email.trim());
      setInfo("Reset link sent. Check your inbox in a moment.");
    } catch (err) {
      console.error("Error sending password reset email", err);
      setError(getFriendlyAuthError(err));
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setError(null);
    setInfo(null);
  };

  const isEmailFormDisabled =
    isEmailLoading ||
    !email.trim() ||
    !password ||
    (mode === "signup" && !name.trim());

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-slate-900 text-white ${poppins.className}`}
      style={{
        background:
          "radial-gradient(circle at 20% 20%, #0f172a, #000000), radial-gradient(circle at 80% 80%, #1e293b, #0f172a)",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="flex min-h-full items-center justify-center p-4 py-10">
        {/* Abstract glowing elements */}
        <div className="fixed left-[15%] top-[10%] -z-10 h-[300px] w-[300px] rounded-full bg-primary opacity-40 blur-[100px]" />
        <div className="fixed bottom-[15%] right-[20%] -z-10 h-[400px] w-[400px] rounded-full bg-[#00d2ff] opacity-40 blur-[100px]" />

        <div className="w-full max-w-[494px] overflow-hidden rounded-[25px] border border-white/10 bg-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-[20px]">
          <div className="flex w-full flex-col justify-center p-6">
            <h2 className="mb-2 text-center text-2xl font-semibold text-white/70">
              Imagine Humans
            </h2>
            <h3 className="mb-6 mt-0 text-center text-sm font-normal text-white/70">
              {mode === "signin"
                ? "Sign in to your space"
                : "Create your account"}
            </h3>

            {(error || info) && (
              <div className="mb-6 space-y-3">
                {error && (
                  <div
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
                {info && (
                  <div
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                    role="status"
                  >
                    {info}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleEmailSubmit}>
              {mode === "signup" && (
                <div className="mb-4">
                  <label className="mb-2 block text-sm text-white">Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full rounded-xl border border-white/10 bg-transparent p-3 text-base text-white outline-none transition-all placeholder:text-white focus:border-primary focus:shadow-[0_0_10px_rgba(78,140,255,0.3)]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="mb-2 block text-sm text-white">Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/10 bg-transparent p-3 text-base text-white outline-none transition-all placeholder:text-white focus:border-primary focus:shadow-[0_0_10px_rgba(78,140,255,0.3)]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm text-white">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/10 bg-transparent p-3 pr-10 text-base text-white outline-none transition-all placeholder:text-white focus:border-primary focus:shadow-[0_0_10px_rgba(78,140,255,0.3)]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="mb-6 block w-full text-right text-sm text-primary transition-colors hover:text-[#70a5ff]"
                >
                  Forgot Password?
                </button>
              )}

              <button
                type="submit"
                disabled={isEmailFormDisabled}
                className="w-full rounded-xl border-none bg-gradient-to-r from-primary to-[#00d2ff] p-3 text-base font-semibold text-white shadow-[0_4px_15px_rgba(0,210,255,0.3)] transition-all hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,210,255,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isEmailLoading
                  ? "Working..."
                  : mode === "signin"
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>

            <div className="my-6 flex items-center text-center text-white/70 before:mr-4 before:flex-1 before:border-b before:border-white/10 after:ml-4 after:flex-1 after:border-b after:border-white/10">
              <span className="px-4 text-sm">Or continue with</span>
            </div>

            <div className="mb-6 flex gap-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-white transition-all hover:border-primary hover:bg-white/10"
              >
                {/* Google Icon SVG from design */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                  className="h-5 w-5 fill-current"
                >
                  <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                </svg>
                {isGoogleLoading ? "Signing in..." : "Google"}
              </button>
            </div>

            <div className="text-center text-sm text-white/70">
              {mode === "signin"
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                onClick={toggleMode}
                className="font-semibold text-primary decoration-inherit hover:underline"
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </div>

            <div className="mt-8 text-center text-xs text-white/50">
              <div className="mb-4 flex justify-center gap-4">
                <a href="#" className="hover:text-white">
                  Support
                </a>
                <a href="#" className="hover:text-white">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-white">
                  Terms of Service
                </a>
              </div>
              <p className="mb-2">
                &copy; 2025 ImagineHumans. All rights reserved.
              </p>
              <p>
                Your data stays yours. We keep your space safe, private, and
                human-first.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFriendlyAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "That email doesn’t look right. Try again.";
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "We couldn’t find a match for that email and password.";
      case "auth/weak-password":
        return "Pick a stronger password (at least 8 characters, ideally more).";
      case "auth/email-already-in-use":
        return "Looks like you already have an account. Try signing in instead.";
      case "auth/too-many-requests":
        return "Too many attempts right now. Please wait a moment and try again.";
      default:
        return "Something went wrong. Please try again in a moment.";
    }
  }

  return "Something went wrong. Please try again.";
}
