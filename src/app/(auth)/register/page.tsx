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

    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: form.username,
        email: form.email,
        password: form.password,
        displayName: form.displayName || form.username,
      }),
    });

    if ("error" in res) {
      setLoading(false);
      if (res.error.code === "VALIDATION_ERROR" && (res.error as any).details?.fieldErrors) {
        setFieldErrors((res.error as any).details.fieldErrors);
      } else if (res.error.code === "EMAIL_TAKEN") {
        setError("That email is already registered.");
      } else if (res.error.code === "USERNAME_TAKEN") {
        setError("That username is taken.");
      } else {
        setError(res.error.message);
      }
      return;
    }

    // Auto-sign-in after successful registration
    const signInRes = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);
    if (signInRes?.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      router.push("/login");
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
            <label className="bl-label">Username <span className="text-red-500">*</span></label>
            <input
              value={form.username}
              onChange={e => set("username", e.target.value)}
              required
              autoFocus
              placeholder="kazeshiro"
              className="bl-input"
            />
            {fieldErrors.username?.map(e => (
              <p key={e} className="bl-error">{e}</p>
            ))}
            <p className="text-xs text-brand-dim/60 mt-0.5">Letters, numbers, underscores. 3–24 chars.</p>
          </div>

          <div className="bl-form-group">
            <label className="bl-label">Display Name</label>
            <input
              value={form.displayName}
              onChange={e => set("displayName", e.target.value)}
              placeholder="Kazeshiro (optional)"
              className="bl-input"
            />
          </div>

          <div className="bl-form-group">
            <label className="bl-label">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              required
              placeholder="you@example.com"
              className="bl-input"
            />
            {fieldErrors.email?.map(e => (
              <p key={e} className="bl-error">{e}</p>
            ))}
          </div>

          <div className="bl-form-group">
            <label className="bl-label">Password <span className="text-red-500">*</span></label>
            <input
              type="password"
              value={form.password}
              onChange={e => set("password", e.target.value)}
              required
              placeholder="Min 8 characters"
              className="bl-input"
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
