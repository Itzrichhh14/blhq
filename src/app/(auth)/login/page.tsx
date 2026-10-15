"use client";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/src/components/ui/Spinner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [callbackError, setCallbackError] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackError(params.get("error") ?? "");
    const requestedUrl = params.get("callbackUrl");
    if (requestedUrl?.startsWith("/") && !requestedUrl.startsWith("//") && !requestedUrl.includes("\\")) {
      setCallbackUrl(requestedUrl);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        callbackUrl,
        redirect: false,
      });
      if (res?.error) {
        setError(
          res.error === "PLAYER_SUSPENDED"
            ? "This account is suspended. Contact staff for help."
            : "Email or password is incorrect."
        );
      } else {
        router.replace(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Sign in is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bl-card p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-brand-accent tracking-widest mb-1">BLOODLINE</h1>
          <p className="text-brand-dim text-sm">Sign in to your account</p>
        </div>

        {(callbackError || error) && (
          <div className="bl-alert-error mb-5">
            {error || "Authentication failed. Please try again."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="bl-form-group">
            <label htmlFor="login-email" className="bl-label">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
              className="bl-input"
              autoComplete="email"
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="bl-form-group">
            <label htmlFor="login-password" className="bl-label">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="bl-input"
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bl-btn bl-btn-primary w-full py-2.5 mt-1"
          >
            {loading ? <Spinner className="h-4 w-4" /> : "Sign In"}
          </button>
        </form>

        <p className="text-center text-brand-dim text-sm mt-6">
          No account?{" "}
          <Link href="/register" className="text-brand-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>

    </div>
  );
}
