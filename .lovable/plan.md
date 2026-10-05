# Login afronden en echt testen in een browser

## Wat ik ga doen

1. **"Invalid origin" oplossen**
   - In de inlogserver de lijst met vertrouwde adressen uitbreiden met `http://localhost:8080`, `http://localhost:*`, `https://*.lovableproject.com` en `https://*.lovable.app`, naast rout.be en de eigen domeinen.
   - Andere adressen blijven geweigerd.

2. **Alleen werkende knoppen tonen**
   - De inlogpagina vraagt aan de server welke aanmeldwijzen sleutels hebben (`enabledProviders`).
   - Google, GitHub, GitLab, Apple en Keycloak/OIDC worden verborgen zolang hun sleutels ontbreken.
   - Infomaniak, Bluesky, Mastodon en e-mail blijven altijd zichtbaar.
   - Ik controleer of dit al volledig werkt en vul aan waar het ontbreekt.

3. **Opruimen**
   - Het pakket `@neondatabase/neon-js` verwijderen. Ik controleer daarna dat niets er nog naar verwijst en dat de site nog zonder fouten opstart.

4. **Verplichte browsertest (Playwright, op localhost:8080)**
   - Registreren met een testadres (e-mail + wachtwoord): ik moet op `/dashboard` uitkomen en het dashboard moet laden.
   - Uitloggen: daarna moet `/dashboard` weer naar de inlogpagina sturen.
   - Opnieuw inloggen met hetzelfde adres werkt. Een fout wachtwoord geeft een nette melding, geen 500.
   - Klik op Infomaniak: de browser moet naar `login.infomaniak.com/authorize` gaan, met `redirect_uri` die eindigt op `/api/auth/oauth2/callback/infomaniak`.
   - Daarna controleer ik het serverlog: geen `Invalid origin` en geen 500 meer.
   - Faalt een stap, dan zoek ik de oorzaak, los ik die op en test ik opnieuw tot alles slaagt.

## Wat niet verandert
- Database, bestaande accounts, Bluesky/Mastodon-login, "Login met ROUT" en de Developer Hub.
- Er komen geen nieuwe aanmeldwijzen bij.

## Eerlijke grens
- Google/GitHub kan ik pas testen als jij hun sleutels opslaat. Tot dan blijven die knoppen verborgen.
- Bij Infomaniak test ik tot hun inlogpagina. Echt inloggen met een Infomaniak-account kan ik niet zelf.
