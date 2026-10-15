"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Spinner } from "@/src/components/ui/Spinner";
import { apiFetch } from "@/src/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "", email: "", password: "", displayName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          displayName: form.displayName.trim() || undefined,
        }),
      });

      if ("error" in res) {
        if (res.error.code === "VALIDATION_ERROR") {
          const details = res.error.details as { fieldErrors?: Record<string, string[]> } | undefined;
          setFieldErrors(details?.fieldErrors ?? {});
        }
        setError(
          res.error.code === "EMAIL_TAKEN"
            ? "That email is already registered."
            : res.error.code === "USERNAME_TAKEN"
              ? "That username is taken."
              : res.error.message
        );
        return;
      }

      const signInRes = await signIn("credentials", {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
      });
      if (signInRes?.ok) {
        router.replace("/dashboard");
        router.refresh();
      } else {
        router.replace("/login?registered=1");
      }
    } catch {
      setError("Registration is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bl-card p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-brand-accent tracking-widest mb-1">BLOODLINE</h1>
          <p className="text-brand-dim text-sm">Create your account</p>
        </div>

        {error && <div className="bl-alert-error mb-5">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="bl-form-group">
            <label htmlFor="register-username" className="bl-label">Username <span className="text-red-500">*</span></label>
            <input
              id="register-username"
              value={form.username}
              onChange={e => set("username", e.target.value)}
              required
              autoFocus
              placeholder="kazeshiro"
              className="bl-input"
              autoComplete="username"
              aria-invalid={Boolean(fieldErrors.username?.length)}
            />
            {fieldErrors.username?.map(e => (
              <p key={e} className="bl-error">{e}</p>
            ))}
            <p className="text-xs text-brand-dim/60 mt-0.5">Letters, numbers, underscores. 3–24 chars.</p>
          </div>

          <div className="bl-form-group">
            <label htmlFor="register-display-name" className="bl-label">Display Name</label>
            <input
              id="register-display-name"
              value={form.displayName}
              onChange={e => set("displayName", e.target.value)}
              placeholder="Kazeshiro (optional)"
              className="bl-input"
            />
          </div>

          <div className="bl-form-group">
            <label htmlFor="register-email" className="bl-label">Email <span className="text-red-500">*</span></label>
            <input
              id="register-email"
              type="email"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              required
              placeholder="you@example.com"
              className="bl-input"
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email?.length)}
            />
            {fieldErrors.email?.map(e => (
              <p key={e} className="bl-error">{e}</p>
            ))}
          </div>

          <div className="bl-form-group">
            <label htmlFor="register-password" className="bl-label">Password <span className="text-red-500">*</span></label>
            <input
              id="register-password"
              type="password"
              value={form.password}
              onChange={e => set("password", e.target.value)}
              required
              placeholder="Min 8 characters"
              className="bl-input"
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password?.length)}
            />
            {fieldErrors.password?.map(e => (
              <p key={e} className="bl-error">{e}</p>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bl-btn bl-btn-primary w-full py-2.5 mt-1"
          >
            {loading ? <Spinner className="h-4 w-4" /> : "Create Account"}
          </button>
        </form>

        <p className="text-center text-brand-dim text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
