# Twee profielen per account + badges voor bedrijven en influencers

## Wat ik in het project heb nagekeken

- Het gratis profiel `rout.be/u/naam00` leest **uitsluitend** uit de aparte tabel `alias_profiles`. Bij registratie wordt daar **geen rij aangemaakt** — die ontstaat pas als iemand in de Studio het aliastabblad opslaat. Gevolg: een nieuw lid heeft vandaag géén werkende `/u/`-pagina.
- De naamregel voor gratis handles klopt al: minstens 5 tekens, 3 letters, 2 cijfers.
- De naambouwer voor geverifieerde leden (jdelplanche / delplanchej / jona.d / scheidingsteken naar keuze) bestaat en werkt.
- Bij het activeren van een betaling wordt het account wel op betaald/geverifieerd gezet, maar er wordt **geen tweede pagina aangemaakt**: geen standaardnaam `voornaam.achternaam`, en de oude gratis naam wordt niet als `/u/`-pagina bewaard. Dat gebeurt nu alleen via de aparte claim-flow of door een beheerder.
- De Studio kan al wisselen tussen "Geverifieerd profiel" en "Gratis aliasprofiel" en bewerkt ze los van elkaar.
- Badges: blauw vinkje, wit privacy-schild (handjes/mens) en zwarte domeinbadge bestaan. **Roze influencerbadge bestaat niet.**
- Bedrijfsverificatie (bedrijfsgegevens, btw-nummer, manuele goedkeuring, `rout.be/rout.be`) bestaat **niet**; er is alleen een technische domeinclaim via DNS.
- Influencer-aanvraag (4 naamvoorkeuren, sociale links, €70 of €0, goedkeuring in beheer) bestaat **niet**.

## Wat ik ga bouwen

### 1. Gratis pagina werkt vanaf de eerste seconde
- Bij registratie wordt meteen een gratis profielpagina aangemaakt op de gekozen naam.
- Wordt er geen naam gekozen (overslaan), dan krijgt het lid automatisch een langere vrije naam die aan de regels voldoet (bv. `jona4827`), gecontroleerd op vrij zijn.
- Bestaande leden zonder gratis pagina krijgen die alsnog (eenmalige aanvulling + een vangnet bij inloggen).

### 2. Tweede pagina bij verificatie
- Zodra de betaling binnen is én de wettelijke naam bekend is: de gratis naam blijft bestaan op `/u/`, en er komt automatisch een tweede pagina `rout.be/voornaam.achternaam`.
- Is die naam al bezet, dan schuift het door naar een variant uit de bestaande naambouwer; het lid kan achteraf altijd zelf een andere vorm kiezen.
- Beide pagina's blijven apart bewerkbaar in de Studio (naam, thema, blokken, avatar).

### 3. Badges
- Roze influencerbadge toevoegen naast blauw, wit en zwart, met eigen uitlegtekst.
- Zwarte badge krijgt de bedrijfsbetekenis met bedrijfsnaam en btw-nummer in de uitleg.
- De juiste badge wordt automatisch gekozen op basis van het accounttype; het lid mag hem nog steeds verbergen.

### 4. Bedrijfsverificatie
- Op de verificatiepagina een kleine, rustige knop "Verifieer als bedrijf" onder de gewone verificatie.
- Formulier: bedrijfsnaam, rechtsvorm, btw-nummer, adres, website/domein, contactpersoon.
- Aanvraag gaat naar een wachtrij; goedkeuring gebeurt handmatig in het beheerdersgedeelte.
- Bij goedkeuring krijgt het bedrijf zijn officiële domeinnaam als pagina (`rout.be/rout.be`, `rout.be/lovable.dev`) en de zwarte badge.

### 5. Influencerstatus
- Aanvraagformulier: vier naamvoorkeuren in volgorde (1 t/m 4) en sociale-medialinks.
- Kost €70, of €0 wanneer het account al geverifieerd is.
- Beheerder kan goedkeuren, een van de vier namen toekennen en de roze badge geven; ik kan hem ook rechtstreeks toekennen zonder aanvraag.

## Technische details

- Nieuwe SQL-bestanden in `db/`: `41_business_verification.sql` (aanvragen + bedrijfsvelden op `profiles`), `42_influencer.sql` (aanvragen, naamvoorkeuren, `is_influencer`), en een aanvulling die ontbrekende `alias_profiles`-rijen aanmaakt.
- `applySignupProfile` (`src/lib/signup-profile.server.ts`) maakt voortaan ook de `alias_profiles`-rij aan; een generator levert de willekeurige naam als er geen gekozen is.
- `activateVerification` (`src/lib/verification.server.ts`) roept `preserveFreeAliasHandle` aan en zet daarna de roothandle via de bestaande naambouwerlogica (`verified-handle-builder.ts`), met botsingscontrole via `handle-namespace.server.ts`.
- `BadgeType` in `src/lib/profile-display.ts` krijgt `influencer`; `ProfileBadge.tsx` krijgt het roze pictogram en de teksten.
- Nieuwe serverfuncties + panelen: `business-verification.{server,functions}.ts` met paneel bij `VerificationPanel.tsx`, en `influencer.{server,functions}.ts` met aanvraagformulier; beide met een beheerderswachtrij naast de bestaande admin-pagina's.
- De influencerbetaling van €70 loopt via de bestaande betaalketen; bij een geverifieerd account wordt het bedrag overgeslagen.

## Volgorde

1. Gratis pagina bij registratie (blokkerende bug).
2. Tweede pagina automatisch bij verificatie.
3. Roze badge + badgeteksten.
4. Bedrijfsverificatie met manuele goedkeuring.
5. Influenceraanvraag met betaling en goedkeuring.
