# Neon Auth volledig uit de app halen, alles via ROUT's eigen Better Auth

## Wat er nu werkelijk misgaat (vastgesteld)

- De inlogserver van ROUT (Better Auth op `/api/auth/*`) draait wél: Infomaniak geeft een correcte doorstuurlink naar `login.infomaniak.com/authorize` terug.
- **Google** geeft "Provider not found": er zijn nog geen Google-sleutels opgeslagen, maar de knop staat toch zichtbaar.
- De browser praat nog via het **Neon Auth-pakket** (`@neondatabase/neon-js`) met de server: inlogscherm, sessiecontrole, uitloggen, accountpagina en het omhulsel rond de hele site.
- De server leest de sessie nog via **Neon Auth** (`getNeonAuthIdentity` → Neon-dienst). Ook na een geslaagde Better Auth-login ziet de app je dus als uitgelogd, en het dashboard laadt niet.
- In het serverlog staat herhaaldelijk `Invalid origin: http://localhost:8080`: de oorsprong van de lokale en de preview-omgeving wordt niet vertrouwd.

## Wat ik ga doen

1. **Neon Auth-client vervangen door de officiële Better Auth-client**
   - Nieuw: `src/lib/auth-client.ts` met `createAuthClient` uit `better-auth/react`, plus de plugins `genericOAuthClient` en `magicLinkClient`, altijd same-origin `/api/auth`.
   - `AuthNeon.tsx` gebruikt dan `authClient.signIn.email`, `signUp.email`, `signIn.social` (Google/GitHub/GitLab/Apple), `signIn.oauth2` (Infomaniak/OIDC) en `signIn.magicLink`. De zelfgebouwde `fetch` voor Infomaniak verdwijnt.
   - `useAuth.tsx` logt uit met `authClient.signOut()`.

2. **Neon Auth-onderdelen verwijderen**
   - `NeonAuthProvider` uit `__root.tsx` halen en het bestand verwijderen.
   - `account.$accountView.tsx` (gebruikt Neon's kant-en-klare schermen) laten doorsturen naar de bestaande instellingenpagina.
   - `neonAuth` en de Neon Auth-URL uit `src/lib/neon.ts` halen. Alleen de databaseverbinding (`sql`) blijft.
   - `src/lib/neon-auth.server.ts` hernoemen naar een bridge zonder Neon. De Neon Auth-server en de `NEON_AUTH_COOKIE_SECRET`-check gaan weg. De koppel-logica (`bridgeIdentity`, inclusief "nooit samenvoegen op onbevestigd e-mailadres") blijft ongewijzigd.
   - Het pakket `@neondatabase/neon-js` verwijderen en `VITE_NEON_AUTH_URL` uit `.env` halen.

3. **Sessie op de server via Better Auth**
   - `currentUser()` leest de sessie met `createRoutAuth(request).api.getSession({ headers })` en koppelt die via `bridgeIdentity` aan `public.users`. De Bluesky/Mastodon-cookie blijft de tweede controle.
   - Daardoor werken de middleware (`requireAuth`), de `_authenticated`-bewaking en het dashboard weer.

4. **Origin-fout oplossen**
   - In `better-auth.server.ts` de lokale origin (`localhost:8080`) en de previewdomeinen (`*.lovableproject.com`, `*.lovable.app`) toevoegen aan `trustedOrigins`, naast rout.be.

5. **Alleen knoppen tonen die echt ingesteld zijn**
   - Een kleine publieke functie geeft `enabledProviders()` terug. Het knoppenraster verbergt aanmeldwijzen zonder sleutels (nu Google, GitHub, GitLab, OIDC), zodat niemand een foutmelding krijgt. Bluesky en Mastodon blijven altijd zichtbaar.

6. **Controle (verplicht, vóór ik terugkom)**
   - Er mag niets meer verwijzen naar `neon-js`, `neonAuth` of `NeonAuth` (zoeken met `rg`).
   - In een testbrowser (Playwright) op `/auth/sign-in`:
     - Klik op het Infomaniak-icoon: de pagina gaat naar `login.infomaniak.com/authorize` met `redirect_uri=…/api/auth/oauth2/callback/infomaniak`, zonder 500.
     - Registreer met e-mail en wachtwoord (testadres): je komt op `/dashboard` en het dashboard laadt.
     - Uitloggen werkt en daarna vraagt `/dashboard` weer om in te loggen.
   - Het serverlog mag geen `Invalid origin` of 500 meer tonen.
   - Google kan ik pas testen als de Google-sleutels er zijn. Tot dan blijft die knop verborgen, en dat meld ik eerlijk.

## Wat niet verandert

- De Neon Postgres-database en alle bestaande tabellen, ook `neon_auth.user/session/account`, die Better Auth al gebruikt.
- "Login met ROUT" (Systeem B) en de Developer Hub.
- Er komen geen nieuwe aanmeldwijzen bij.

## Open punt

- Google, GitHub en GitLab werken pas als hun sleutels zijn opgeslagen (`GOOGLE_CLIENT_ID/SECRET` enz.). Daar vraag ik deze keer niet om. Als je ze toevoegt, verschijnen de knoppen vanzelf.
