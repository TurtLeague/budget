# Hushållsbudget

Mobilanpassad budgetapp för två användare — byggd med Next.js 15, TypeScript, Tailwind CSS och Supabase.

## Funktioner

- **Dashboard** — månadssaldo, budget- och sparmålsöversikt
- **Transaktioner** — lägg till inkomster och utgifter, filtrera, ta bort
- **Budget** — kategorier med månadsbudget och förbrukningsindikator
- **Sparmål** — skapa mål, sätt in pengar, följ progress
- **Inställningar** — profil, avatarfärg, skapa/gå med i hushåll via inbjudningskod

## Kom igång

### 1. Supabase-projekt

1. Gå till [supabase.com](https://supabase.com) och skapa ett nytt projekt.
2. Gå till **SQL Editor** och klistra in innehållet från `supabase/schema.sql`. Kör det.
3. Kopiera dina nycklar från **Project Settings → API**:
   - `Project URL`
   - `anon public` key

### 2. Miljövariabler

```bash
cp .env.local.example .env.local
```

Fyll i `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://ditt-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din-anon-nyckel
```

### 3. Installera och starta

```bash
cd budget-app
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) i webbläsaren.

## Hushållsmodell

- En **household** är delad ekonomi för upp till två användare.
- Användare 1 skapar ett hushåll i **Inställningar → Hushåll**.
- Användare 2 anger den 8-siffriga **inbjudningskoden** för att gå med.
- All data (transaktioner, budget, sparmål) är kopplad till hushållet och visas för båda.

## Teknisk struktur

```
src/
├── app/
│   ├── (auth)/login          # Inloggningssida
│   ├── (auth)/register       # Registreringssida
│   ├── (app)/dashboard       # Startsida med översikt
│   ├── (app)/transactions    # Transaktionshantering
│   ├── (app)/budget          # Budgetkategorier
│   ├── (app)/savings         # Sparmål
│   └── (app)/settings        # Profil och hushållsinbjudan
├── lib/
│   ├── supabase/client.ts    # Klientside-klient
│   ├── supabase/server.ts    # Serverside-klient
│   ├── types.ts              # TypeScript-typer
│   └── utils.ts              # Hjälpfunktioner
└── middleware.ts             # Auth-routing
```

## Databasschema

Se `supabase/schema.sql` för fullständigt schema med RLS-policies.

Tabeller: `households`, `profiles`, `budget_categories`, `transactions`, `savings_goals`
