# Šeimos finansai V1.0

Pradinis veikiantis React + Vite šeimos finansų dashboardas.

## Paleidimas

1. Išarchyvuokite projektą.
2. Atidarykite projekto aplanką terminale.
3. Paleiskite:

```bash
npm install
npm run dev
```

## Dabartinis veikimas

- Dashboardas veikia iš karto.
- Pradiniai demonstraciniai duomenys yra `src/data/demo.js`.
- Naujos operacijos saugomos naršyklės `localStorage`.
- Supabase struktūra paruošta faile `supabase/schema.sql`.
- Supabase prisijungimo kintamųjų pavyzdys yra `.env.example`.

## Supabase prijungimas

1. Sukurkite Supabase projektą.
2. SQL Editor lange paleiskite `supabase/schema.sql`.
3. Nukopijuokite `.env.example` į `.env`.
4. Įrašykite savo projekto URL ir anon key.
5. Kitame etape pakeisime `localStorage` operacijas realiomis Supabase užklausomis.
