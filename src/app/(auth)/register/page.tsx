"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Registrering misslyckades");
      setLoading(false); return;
    }
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", data.user.id);
    router.push("/settings"); router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Skapa konto</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Kom igång med din hushållsbudget</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-xl p-3">{error}</div>}
          {[
            { label: "Ditt namn", value: displayName, setter: setDisplayName, type: "text", placeholder: "Förnamn" },
            { label: "E-post", value: email, setter: setEmail, type: "email", placeholder: "din@epost.se" },
            { label: "Lösenord", value: password, setter: setPassword, type: "password", placeholder: "Minst 6 tecken" },
          ].map(({ label, value, setter, type, placeholder }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{label}</label>
              <input type={type} value={value} onChange={e => setter(e.target.value)} required
                minLength={type === "password" ? 6 : undefined}
                className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={placeholder} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors">
            {loading ? "Skapar konto..." : "Skapa konto"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-4">
          Har du redan ett konto?{" "}
          <Link href="/login" className="text-green-600 font-medium">Logga in</Link>
        </p>
      </div>
    </div>
  );
}
