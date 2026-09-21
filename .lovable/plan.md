# ROUT login, Identity Provider en Sovereign Wallet

## Doel
De bestaande app veilig uitbreiden zonder de huidige Neon Auth-login, profielen, API-sleutels of SecureShield-betaalwallet te vervangen. De nieuwe Sovereign Wallet wordt een aparte credential-kluis.

## 1. Eerst stabiliseren
- Mastodon-login afwerken met een serverveld op de inlogpagina, duidelijke foutmeldingen en veilige terugkeer naar de oorspronkelijke pagina.
- Bluesky-, Mastodon- en Neon-sessies samen controleren, inclusief uitloggen en veilige `next`-paden.
- De bestaande buildfout reproduceren en alleen de concrete oorzaken herstellen.
- De vijf bestaande technische vertrouwenszegels behouden; geen ISO-, SOC- of NIS2-claims toevoegen.

## 2. Developer Console en “Login met ROUT”
- Developer Hub uitsluitend via de beveiligde route aanbieden; serverfuncties controleren daarnaast dat de gebruiker ingelogd én geverifieerd is.
- Een vlakke console toevoegen met tabs: Overzicht, Branding, Credentials, Redirect-URI’s, Scopes en Credential-uitgifte.
- OAuth-apps opslaan met eigenaar, status, naam, logo, website, privacyvoorwaarden, gebruiksvoorwaarden, exacte redirect-URI-whitelist en toegestane scopes.
- Client IDs willekeurig genereren. Client secrets alleen één keer tonen, uitsluitend gehasht bewaren en veilig kunnen roteren/intrekken.
- Geen geheime sleutel of sessietoken naar browseropslag schrijven.

## 3. OAuth 2.1 / OIDC-provider
- Publieke discovery-, authorize-, token- en JWKS-routes bouwen volgens Authorization Code + verplichte PKCE S256.
- Redirect-URI’s exact vergelijken; bij een onbekende URI nooit terugsturen naar die URI maar een lokale foutpagina tonen.
- Autorisatiecodes kortlevend, eenmalig en gehasht opslaan; hergebruik en verlopen codes weigeren.
- Toestemmingspagina toont ROUT, app-logo, ingelogde persoon en elke scope in gewone taal, met Toestaan, Weigeren en wisselen van account.
- OIDC `sub` gebruikt uitsluitend het bestaande willekeurige interne gebruikers-ID; e-mail wordt alleen meegegeven als `email` is toegestaan.
- Tokens asymmetrisch ondertekenen en via JWKS verifieerbaar maken; signing secrets blijven server-side.

## 4. Sovereign Wallet
- Aparte tabellen toevoegen voor geverifieerde uitgevers, credential-aanbiedingen en gebruikerscredentials. De SecureShield-geldwallet blijft onaangeraakt.
- Credential-data standaard privé opslaan; publieke zichtbaarheid is een aparte expliciete keuze.
- Native ROUT-badges zijn niet verwijderbaar en, wanneer verdiend, altijd zichtbaar; externe certificaten kunnen worden verborgen of definitief verwijderd.
- “Mijn Wallet / Credentials” toevoegen aan accountinstellingen met uitgever-, hash- en geldigheidsinformatie.
- In de profielstudio een “Badges & diploma’s”-keuze toevoegen die alleen bestaande kluisitems toont en zichtbaarheid schakelt.
- Publieke profielen tonen uitsluitend `is_public = true`, met een gecontroleerde uitgeversmarkering.

## 5. Veilige credential-uitgifte
- Alleen geverifieerde ontwikkelaars kunnen een uitgever registreren; partnerstatus vereist handmatige beheergoedkeuring.
- Een externe app maakt server-side een korte, eenmalige uitgifteaanbieding aan; de embedknop bevat nooit een credential of geheim.
- `/credentials/claim` controleert sessie, uitgever, vervaldatum, ontvanger en anti-CSRF-waarde voordat opslaan mogelijk is.
- Het toestemmingsscherm toont uitgever, titel en publieke-keuze (standaard uit); annuleren wijzigt niets.
- Een “Add to ROUT Wallet”-snippet toevoegen die licht/donker werkt en de bestaande ROUT-vormgeving gebruikt.

## 6. Database en controle
- Nieuwe migraties zijn herhaalbaar, bevatten indexes, constraints en server-side eigendomscontroles; bestaande tabellen worden niet destructief aangepast.
- Kritieke flows krijgen gerichte tests: redirect-whitelist, PKCE, code-hergebruik, clientsecret-rotatie, credential-acceptatie, privacyfiltering en rechten.
- Daarna build, relevante tests en desktop/mobiele weergave controleren. Functies die zonder ontbrekende productiegeheimen niet end-to-end kunnen draaien worden duidelijk als niet geconfigureerd gemarkeerd, niet onveilig omzeild.

## Technische details
- Bestaande TanStack serverroutes en Neon-querylaag blijven leidend.
- Publieke OAuth- en uitgifteroutes authenticeren en valideren elke aanvraag zelf.
- URL’s accepteren alleen `https` in productie; localhost mag uitsluitend voor ontwikkeling.
- Ondersteunde initiële OIDC-scopes: `openid`, `profile`, `email`; app-rechten blijven apart van identiteitsclaims.
