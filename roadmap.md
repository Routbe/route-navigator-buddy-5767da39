# ROUT — roadmap

## Klaar
- Gratis pagina bij registratie: elk account krijgt meteen `rout.be/u/<handle>`
  (gekozen naam of automatisch, bv. `jona4827`), met vangnet bij het openen van
  de Studio.
- Tweede pagina bij verificatie: gratis `/u/`-pagina blijft, geverifieerd
  profiel verhuist naar `voornaam.achternaam` (of de eerstvolgende vrije vorm).
- Roze influencerbadge + bedrijfsbetekenis voor de zwarte badge.
- Bedrijfsverificatie: aanvraagformulier (naam, rechtsvorm, btw, adres, domein)
  met manuele goedkeuring; pagina op de officiële domeinnaam.
- Influenceraanvraag: vier naamvoorkeuren + sociale kanalen, € 70 of gratis bij
  een geverifieerd account, goedkeuring in beheer (`/admin/verifications`).

## Openstaand (wacht op jou)
- Migratie `db/41_business_influencer.sql` één keer op de Neon-database
  uitvoeren (de app maakt de tabellen anders zelf aan bij het eerste gebruik).
- Betaling van € 70 voor influenceraanvragen koppelen aan de bestaande
  betaalketen; nu blijft zo'n aanvraag op "wacht op betaling" staan.

## Nieuw verzoek — veilig verder uitwerken
- [ ] Mastodon-login afronden en foutmeldingen tonen.
- [ ] Bestaande auth/build-problemen controleren zonder regressies.
- [ ] ROUT Developer Console en OAuth/OIDC-provider veilig ontwerpen en bouwen.
- [ ] Sovereign Wallet, credential-uitgifte en publiek tonen veilig ontwerpen en bouwen.
