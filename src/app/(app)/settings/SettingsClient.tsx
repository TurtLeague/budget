"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import Avatar from "@/components/ui/Avatar";

interface Props {
  profile: { id: string; display_name: string; avatar_color: string; avatar_url?: string | null; household_id: string | null } | null;
  household: { id: string; name: string; invite_code: string } | null;
  partner: { display_name: string; avatar_color: string; avatar_url?: string | null } | null;
  userEmail: string;
}

const AVATAR_COLORS = ["#22c55e","#6366f1","#f59e0b","#ef4444","#3b82f6","#ec4899","#14b8a6"];

export default function SettingsClient({ profile, household, partner, userEmail }: Props) {
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color ?? AVATAR_COLORS[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [householdError, setHouseholdError] = useState("");
  const [copied, setCopied] = useState(false);

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${profile.id}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
      setAvatarUrl(url);
    }
    setUploading(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ display_name: displayName, avatar_color: avatarColor }).eq("id", profile!.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function createHousehold(e: React.FormEvent) {
    e.preventDefault(); setHouseholdLoading(true); setHouseholdError("");
    const supabase = createClient();
    const { data: hh, error } = await supabase.from("households").insert({ name: householdName }).select().single();
    if (error || !hh) { setHouseholdError("Kunde inte skapa hushåll"); setHouseholdLoading(false); return; }
    await supabase.from("profiles").update({ household_id: hh.id }).eq("id", profile!.id);
    setHouseholdLoading(false); router.refresh();
  }

  async function joinHousehold(e: React.FormEvent) {
    e.preventDefault(); setHouseholdLoading(true); setHouseholdError("");
    const supabase = createClient();
    const { data: hh, error } = await supabase.from("households").select("id").eq("invite_code", inviteCode.trim().toLowerCase()).single();
    if (error || !hh) { setHouseholdError("Ogiltig inbjudningskod"); setHouseholdLoading(false); return; }
    await supabase.from("profiles").update({ household_id: hh.id }).eq("id", profile!.id);
    setHouseholdLoading(false); router.refresh();
  }

  async function leaveHousehold() {
    if (!confirm("Är du säker på att du vill lämna hushållet?")) return;
    const supabase = createClient();
    await supabase.from("profiles").update({ household_id: null }).eq("id", profile!.id);
    router.refresh();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function copyCode() {
    if (household?.invite_code) { navigator.clipboard.writeText(household.invite_code); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  const inputCls = "w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";
  const cardCls = "bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm";

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto space-y-5 pb-6">
      <h1 className="text-2xl font-bold dark:text-slate-100">Inställningar</h1>

      {/* Profile */}
      <div className={cardCls}>
        <h2 className="font-semibold text-gray-800 dark:text-slate-200 mb-4">Din profil</h2>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <Avatar displayName={displayName} avatarColor={avatarColor} avatarUrl={avatarUrl} size="lg" />
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow">
              {uploading ? "…" : "📷"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
          </div>
          <div>
            <p className="font-medium dark:text-slate-100">{displayName || "Inget namn"}</p>
            <p className="text-sm text-gray-400 dark:text-slate-400">{userEmail}</p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Visningsnamn</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Avatarfärg</label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setAvatarColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${avatarColor===color?"scale-125 ring-2 ring-offset-2 ring-gray-400":""}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors">
            {saved ? "Sparat! ✓" : saving ? "Sparar..." : "Spara profil"}
          </button>
        </form>
      </div>

      {/* Theme */}
      <div className={cardCls}>
        <h2 className="font-semibold text-gray-800 dark:text-slate-200 mb-4">Utseende</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium dark:text-slate-200">{theme === "dark" ? "🌙 Mörkt läge" : "☀️ Ljust läge"}</p>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Växla mellan ljust och mörkt</p>
          </div>
          <button onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${theme==="dark" ? "bg-green-500" : "bg-gray-200"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${theme==="dark" ? "translate-x-6" : ""}`} />
          </button>
        </div>
      </div>

      {/* Household */}
      <div className={cardCls}>
        <h2 className="font-semibold text-gray-800 dark:text-slate-200 mb-4">Hushåll</h2>

        {household ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">{household.name}</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Du är med i detta hushåll</p>
            </div>

            {partner ? (
              <div className="flex items-center gap-3">
                <Avatar displayName={partner.display_name} avatarColor={partner.avatar_color} avatarUrl={partner.avatar_url} size="md" />
                <div>
                  <p className="text-sm font-medium dark:text-slate-200">{partner.display_name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-400">Din partner</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
                <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">Ingen partner ansluten ännu. Dela inbjudningskoden:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest dark:text-slate-100">
                    {household.invite_code}
                  </code>
                  <button onClick={copyCode} className="bg-green-500 text-white rounded-lg px-3 py-2 text-sm font-medium">
                    {copied ? "Kopierat!" : "Kopiera"}
                  </button>
                </div>
              </div>
            )}

            <button onClick={leaveHousehold}
              className="w-full border border-red-200 dark:border-red-800 text-red-500 font-medium rounded-xl py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              Lämna hushåll
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {householdError && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-xl p-3">{householdError}</div>}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Skapa nytt hushåll</h3>
              <form onSubmit={createHousehold} className="flex gap-2">
                <input type="text" value={householdName} onChange={e => setHouseholdName(e.target.value)} required placeholder="Hushållets namn"
                  className="flex-1 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <button type="submit" disabled={householdLoading} className="bg-green-500 text-white rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap">Skapa</button>
              </form>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-600" />
              <span className="text-xs text-gray-400 dark:text-slate-500">eller</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Gå med via inbjudningskod</h3>
              <form onSubmit={joinHousehold} className="flex gap-2">
                <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required placeholder="8-siffrig kod" maxLength={8}
                  className="flex-1 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500" />
                <button type="submit" disabled={householdLoading} className="bg-green-500 text-white rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap">Gå med</button>
              </form>
            </div>
          </div>
        )}
      </div>

      <button onClick={signOut}
        className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-medium rounded-2xl py-4 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
        Logga ut
      </button>
    </div>
  );
}
