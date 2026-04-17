"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  profile: { id: string; display_name: string; avatar_color: string; household_id: string | null } | null;
  household: { id: string; name: string; invite_code: string } | null;
  partner: { display_name: string; avatar_color: string } | null;
  userEmail: string;
}

const AVATAR_COLORS = ["#22c55e", "#6366f1", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6"];

export default function SettingsClient({ profile, household, partner, userEmail }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color ?? AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [householdLoading, setHouseholdLoading] = useState(false);
  const [householdError, setHouseholdError] = useState("");
  const [copied, setCopied] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ display_name: displayName, avatar_color: avatarColor }).eq("id", profile!.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  async function createHousehold(e: React.FormEvent) {
    e.preventDefault();
    setHouseholdLoading(true);
    setHouseholdError("");
    const supabase = createClient();
    const { data: hh, error } = await supabase
      .from("households")
      .insert({ name: householdName })
      .select()
      .single();
    if (error || !hh) {
      setHouseholdError("Kunde inte skapa hushåll");
      setHouseholdLoading(false);
      return;
    }
    await supabase.from("profiles").update({ household_id: hh.id }).eq("id", profile!.id);
    setHouseholdLoading(false);
    router.refresh();
  }

  async function joinHousehold(e: React.FormEvent) {
    e.preventDefault();
    setHouseholdLoading(true);
    setHouseholdError("");
    const supabase = createClient();
    const { data: hh, error } = await supabase
      .from("households")
      .select("id")
      .eq("invite_code", inviteCode.trim().toLowerCase())
      .single();
    if (error || !hh) {
      setHouseholdError("Ogiltig inbjudningskod");
      setHouseholdLoading(false);
      return;
    }
    await supabase.from("profiles").update({ household_id: hh.id }).eq("id", profile!.id);
    setHouseholdLoading(false);
    router.refresh();
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
    if (household?.invite_code) {
      navigator.clipboard.writeText(household.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="px-4 pt-6 max-w-lg mx-auto space-y-5 pb-6">
      <h1 className="text-2xl font-bold text-gray-900">Inställningar</h1>

      {/* Profile */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Din profil</h2>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white font-bold"
            style={{ backgroundColor: avatarColor }}
          >
            {displayName ? displayName[0].toUpperCase() : "?"}
          </div>
          <div>
            <p className="font-medium text-gray-800">{displayName || "Inget namn"}</p>
            <p className="text-sm text-gray-400">{userEmail}</p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Visningsnamn</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Avatarfärg</label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${avatarColor === color ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {saved ? "Sparat! ✓" : saving ? "Sparar..." : "Spara profil"}
          </button>
        </form>
      </div>

      {/* Household */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Hushåll</h2>

        {household ? (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm font-medium text-green-800">{household.name}</p>
              <p className="text-xs text-green-600 mt-0.5">Du är med i detta hushåll</p>
            </div>

            {partner ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: partner.avatar_color }}
                >
                  {partner.display_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{partner.display_name}</p>
                  <p className="text-xs text-gray-400">Din partner</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-2">Ingen partner ansluten ännu. Dela inbjudningskoden:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest text-gray-800">
                    {household.invite_code}
                  </code>
                  <button
                    onClick={copyCode}
                    className="bg-green-500 text-white rounded-lg px-3 py-2 text-sm font-medium"
                  >
                    {copied ? "Kopierat!" : "Kopiera"}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={leaveHousehold}
              className="w-full border border-red-200 text-red-500 font-medium rounded-xl py-2.5 text-sm hover:bg-red-50 transition-colors"
            >
              Lämna hushåll
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {householdError && (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">{householdError}</div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Skapa nytt hushåll</h3>
              <form onSubmit={createHousehold} className="flex gap-2">
                <input
                  type="text"
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  required
                  placeholder="Hushållets namn"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="submit"
                  disabled={householdLoading}
                  className="bg-green-500 text-white rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap"
                >
                  Skapa
                </button>
              </form>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">eller</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Gå med via inbjudningskod</h3>
              <form onSubmit={joinHousehold} className="flex gap-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  required
                  placeholder="8-siffrig kod"
                  maxLength={8}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="submit"
                  disabled={householdLoading}
                  className="bg-green-500 text-white rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap"
                >
                  Gå med
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full bg-white border border-gray-200 text-gray-600 font-medium rounded-2xl py-4 shadow-sm hover:bg-gray-50 transition-colors"
      >
        Logga ut
      </button>
    </div>
  );
}
