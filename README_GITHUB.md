# Šeimos finansai – GitHub Pages publikavimas

Šis paketas skirtas repozitorijai pavadinimu:

`seimos-finansai`

Nukopijuokite failus į projekto šakninį katalogą, kuriame yra `package.json`.

## GitHub Secrets

Repozitorijoje atidarykite:

Settings → Secrets and variables → Actions → New repository secret

Sukurkite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Įrašykite tas pačias reikšmes, kurios dabar yra vietiniame `.env` faile.

## GitHub Pages

Settings → Pages → Build and deployment → Source:

`GitHub Actions`

Po failų įkėlimo į `main` šaką atidarykite Actions ir palaukite, kol
„Deploy Šeimos finansai to GitHub Pages“ taps žalias.

Svetainės adresas bus:

`https://JUSU-GITHUB-VARDAS.github.io/seimos-finansai/`
