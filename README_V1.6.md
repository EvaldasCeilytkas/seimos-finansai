# Šeimos finansai V1.6 – Supabase

## 1. Sukurkite Supabase projektą

Supabase Dashboard pasirinkite **New project**.

## 2. Sukurkite duomenų bazės lenteles

Supabase Dashboard atidarykite:

**SQL Editor → New query**

Įklijuokite visą failo:

`supabase/schema.sql`

turinį ir spauskite **Run**.

## 3. Įrašykite projekto raktus

Projekto šakniniame aplanke (ten, kur yra package.json) sukurkite failą:

`.env`

Jo turinys:

```env
VITE_SUPABASE_URL=https://JUSU-PROJEKTAS.supabase.co
VITE_SUPABASE_ANON_KEY=JUSU_PUBLISHABLE_ARBA_ANON_KEY
```

Reikšmes rasite Supabase projekto **Connect** arba **Settings → API** lange.

Nenaudokite `service_role` rakto naršyklėje.

## 4. Paleiskite

```bash
npm install
npm run dev
```

## 5. Pirmasis prisijungimas

1. Evaldas užsiregistruoja.
2. Sukuria šeimą.
3. Viršuje matomą 8 simbolių kodą perduoda Rimai.
4. Rima užsiregistruoja savo el. paštu.
5. Pasirenka „Prisijungti prie esamos“ ir įveda kodą.

## 6. Esamų localStorage duomenų perkėlimas

Prisijungus viršuje yra mygtukas:

**Importuoti šios naršyklės duomenis**

Jis į Supabase perkelia:
- operacijas;
- turtą ir indėlius;
- biudžetus;
- finansines paskyras.

Importą atlikite vieną kartą iš naršyklės, kurioje yra tikrieji duomenys.

## Saugumas

Visoms lentelėms įjungtas Row Level Security. Šeimos duomenis gali skaityti ir keisti tik tos šeimos nariai.
