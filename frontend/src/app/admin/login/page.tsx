"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { ADMIN_TOKEN_KEY } from "@/lib/auth/session";
import { STITCH_LOGO_SRC } from "@/lib/stitch/brand";

type AdminLoginResponse = {
  token: string;
  admin: { id: string; email: string; name: string; role: string };
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<AdminLoginResponse>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center px-margin-mobile py-12">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-xl ambient-shadow p-8 md:p-10 border border-outline-variant/30">
          <div className="text-center mb-8">
            <Image alt="RoofStead Admin" className="h-14 w-auto mx-auto mb-4" height={56} src={STITCH_LOGO_SRC} width={140} />
            <p className="font-label-md text-on-surface-variant tracking-widest uppercase">Internal Admin</p>
            <h1 className="font-headline-md text-headline-md text-primary mt-4">Admin sign in</h1>
          </div>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label className="font-label-md text-on-surface-variant uppercase block mb-2" htmlFor="admin-email">
                Email
              </label>
              <input
                className="w-full border border-outline-variant rounded-lg p-3 focus-ring"
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant uppercase block mb-2" htmlFor="admin-password">
                Password
              </label>
              <input
                className="w-full border border-outline-variant rounded-lg p-3 focus-ring"
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <p className="text-xs text-on-surface-variant">
              Dev: use <span className="font-mono">SUPER_ADMIN_EMAIL</span> and{" "}
              <span className="font-mono">SUPER_ADMIN_PASSWORD</span> from{" "}
              <span className="font-mono">backend/.env</span> (default email{" "}
              <span className="font-mono">admin@roofstead.local</span>). Buyer accounts cannot sign in here.
            </p>
            <button
              className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export { ADMIN_TOKEN_KEY };
