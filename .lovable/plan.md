# Login-knoppen en centrale openbare profielstructuur

## Doel
Alle bestaande inlogopties blijven zichtbaar zonder kapotte aanvragen. Elk account behoudt precies twee mogelijke publieke weergaven van dezelfde gegevens: de privacy-alias op `/u/[alias]` en, uitsluitend na verificatie, de identiteit op `/[handle]`.

## Uitvoering

1. **Alle inlogopties zichtbaar houden**
   - Het volledige bestaande iconenraster altijd tonen, ook wanneer Google, GitHub, GitLab, Apple, OIDC of Infomaniak nog niet geconfigureerd is.
   - Bij een niet-geconfigureerde provider geen loginverzoek versturen, maar een duidelijke melding tonen dat deze optie nog niet actief is.
   - Geconfigureerde providers, e-mail, Bluesky en Mastodon blijven via hun huidige Better Auth/native flow werken.

2. **Eén profielbron, twee publieke weergaven**
   - De bestaande routering behouden: `/u/[alias]` leest het privacy-aliasprofiel; `/[handle]` leest de geverifieerde identiteit van dezelfde gebruiker.
   - Geen extra `/u/`-route, publieke leden-ID of `/member/`-route toevoegen.
   - Badges, certificaten, status en toegestane tijdlijngegevens vanuit één centrale gebruikersbron laden, met de juiste alias- of identiteitsgegevens voor de geopende URL.

3. **Openbaar profiel uitbreiden**
   - De bestaande badgeweergave uitbreiden tot één rustig onderdeel voor badges, certificaten en actuele status.
   - Een openbare chronologische tijdlijn toevoegen, nieuwste eerst, voor publiek toegestane mijlpalen en activiteiten.
   - Dezelfde centrale onderdelen gebruiken op zowel de alias- als geverifieerde profielweergave, zodat er geen dubbele of uiteenlopende geschiedenis ontstaat.

4. **Privacy & Openbaar Profiel in accountinstellingen**
   - Een duidelijke sectie toevoegen met schakelaars voor:
     - openbaar profiel aan/uit;
     - tijdlijn openbaar tonen/verbergen.
   - Een privé profiel toont geen profielinhoud of tijdlijn aan bezoekers; de eigenaar kan het eigen profiel wel blijven beheren.
   - De bestaande instelling voor het tonen van badges blijft gerespecteerd.

5. **Datastructuur toekomstbestendig maken**
   - Een centrale activiteit/mijlpaalstructuur toevoegen die badges, certificaten en statuswijzigingen kan bevatten zonder gevoelige gegevens publiek te maken.
   - Voorbereidende velden/relaties opnemen voor toekomstige Bluesky- en Mastodon-activiteiten en volgers, zonder nu feeds op te halen of een volgfunctie te bouwen.
   - Bestaande badgegebeurtenissen hergebruiken en veilig combineren met nieuwe publieke activiteiten.

6. **Opruimen en controleren**
   - Het per ongeluk genoemde onderdeel “Mijn Hooi” volledig buiten deze wijziging laten.
   - Controleren dat er geen losse Trofeeënkast in de instellingen staat; er wordt dus niets dubbel toegevoegd.
   - In de browser testen: alle providericonen zichtbaar, melding bij ontbrekende sleutel, werkende providerflow onaangetast, privacy aan/uit, tijdlijn aan/uit, `/u/[alias]` en `/[handle]` tonen elk de juiste weergave.

## Technische details
- Bestaande TanStack-routes `u.$username.tsx` en `$username.tsx` blijven leidend.
- Privacyvoorkeuren sluiten aan op `profiles.display_prefs`; publieke serverfuncties handhaven deze voorkeuren vóórdat gegevens worden teruggegeven.
- Tijdlijnresultaten zijn publiek alleen met expliciete toestemming en bevatten geen e-mailadressen, interne account-ID's of privé-inloggegevens.
- Nieuwe structurele databasewijzigingen worden als idempotente Neon-migratie toegevoegd en gekoppeld aan de bestaande gebruiker.
