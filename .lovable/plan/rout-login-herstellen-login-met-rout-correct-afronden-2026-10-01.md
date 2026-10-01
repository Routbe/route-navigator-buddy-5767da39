# ROUT-login herstellen + "Login met ROUT" correct afronden

## Wat je bedoelt (bevestigd)
- Gewone leden: niets verandert. Inloggen/registreren via e-mail, Google, GitHub, GitLab, Mastodon, Bluesky blijft zoals vroeger, en ze kunnen extra accounts (Google, GitHub...) aan hun ROUT-account koppelen.
- Nieuw, naast profielhub en QR-generator: een ontwikkelaarsomgeving waar bedrijven/devs API-koppelingen maken en een "Login met ROUT"-knop op hun eigen site zetten (zoals "Login met Google").
- Externe sites krijgen via ROUT een vast gebruikers-ID plus, als de gebruiker toestemming geeft, de gekoppelde accounts (bv. Google, GitHub). Zo kan hun systeem zien of die persoon al een account heeft en dubbele accounts voorkomen.

De richting van wat gebouwd is klopt. De provider-onderdelen zijn nieuw en vervangen de bestaande login niet. Het probleem zit in de bestaande login die stuk is gegaan, en dat lossen we eerst op.

## 1. Bestaande login eerst herstellen (hoogste prioriteit)
- Elke knop op de inlogpagina in een testbrowser nalopen: e-mail, Google, GitHub, GitLab, Mastodon, Bluesky. Per knop de echte fout vastleggen.
- Waarschijnlijke oorzaken eerst controleren (nog niet bevestigd):
  - De koppeling met de inlogdienst (Neon Auth): het adres van de dienst, de sessiesleutel en de toegestane terugkeeradressen voor de preview en rout.be.
  - De nieuwe eigen sessiecookie voor Bluesky/Mastodon mag de gewone Neon-sessie niet verstoren. Bij uitloggen en bij "wie is ingelogd" moet de volgorde kloppen.
  - Het koppelen van ingelogde gebruikers aan hun ROUT-account (bridgeIdentity), zodat bestaande leden hun eigen account terugkrijgen en er geen nieuw account voor hen wordt aangemaakt.
  - De terugkeer na het inloggen (`next`/`/dashboard`) en de beveiligde pagina's.
- Alleen de concrete oorzaken herstellen. Geen herschrijving.
- "Account koppelen" in de instellingen weer laten werken: Google, GitHub en andere accounts toevoegen of verwijderen, met de bestaande beveiliging tegen het verwijderen van de laatste inlogmethode.

## 2. Bestaand account herkennen, geen dubbele accounts in ROUT
- Bij inloggen via Google, GitHub, Mastodon of Bluesky zoekt ROUT eerst of dat externe account al gekoppeld is. Daarna zoekt het een geverifieerd e-mailadres dat al bekend is. Pas als beide niets opleveren, maakt het een nieuw account aan.
- Een niet-geverifieerd e-mailadres wordt nooit automatisch samengevoegd.

## 3. "Login met ROUT" voor ontwikkelaars afmaken
- Console in de Developer Hub (bestaat al): apps, terugkeeradressen, scopes, client secret. Nalopen en testen met een echt account.
- Nieuwe toestemming (scope) `linked_accounts`. Met toestemming van de gebruiker krijgt de app per gekoppeld account de dienst (google/github/...) en het account-ID bij die dienst. E-mail alleen met de scope `email`.
- Uitleg in de console met kant-en-klare code voor de knop, en een voorbeeld van "bestaat deze gebruiker al?" aan de kant van de ontwikkelaar: eerst zoeken op het ROUT-ID, dan op een gekoppeld account, en dan het ROUT-ID aan het bestaande account koppelen.
- Het toestemmingsscherm toont in gewone taal welke gekoppelde accounts gedeeld worden.

## 4. Controle
- In een testbrowser: inloggen met e-mail en elke sociale knop (voor zover de diensten zijn ingesteld), uitloggen, en een account koppelen.
- De volledige "Login met ROUT"-stroom testen met een testapp: toestemming, code, token, userinfo.
- Diensten waarvoor een sleutel of instelling ontbreekt, worden duidelijk gemeld. Ze worden niet stilletjes omzeild.

## Technische details
- Het onderzoek begint bij `neon-auth.server.ts` (getBridgedUser/bridgeIdentity), `session.server.ts`, `api_.auth.$.ts`, `AuthNeon.tsx`, `useAuth.tsx` en de console-logs en netwerklogs van de preview.
- `identityClaims` krijgt `linked_accounts` uit `public.user_identities`: provider + provider_account_id, alleen met die scope. Ook toevoegen aan `SUPPORTED_SCOPES` en aan de discovery-pagina.
- Accounts worden gezocht met eerst `user_identities(provider, provider_account_id)`, daarna een geverifieerd e-mailadres in `users`.
- De bestaande Neon Auth-setup blijft de hoofdingang. Bluesky en Mastodon blijven een aparte ondertekende cookie gebruiken.
