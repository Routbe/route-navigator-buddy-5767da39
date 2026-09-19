# ROUT roadmap

## Refactor pass (component decomposition & tech debt)

- [ ] Split `src/pages/Admin.tsx` into `src/components/admin/` (AdminUserTable, AdminVerificationQueue, AdminAnalyticsSummary, AdminSettings)
- [ ] Split `src/components/dashboard/ProfileEditor.tsx` into `src/components/dashboard/editor/` (ProfileBasicInfoForm, ProfileLinksManager, ProfileThemePicker, ProfileHeaderPreview)
- [ ] Flatten `src/pages/routes/*` into `src/routes/*` (remove 16 wrapper files)
- [ ] Fix 50x `react-refresh/only-export-components` (move helpers/constants/types to `src/lib` / `src/types`)
- [ ] Fix 5x `react-hooks/exhaustive-deps` (QRPreview, QRInputFields, Index)
- [ ] Replace `any` in server/API functions with strict types
- [ ] Verify: 293 tests pass + `tsgo --noEmit` clean
- [ ] Keep /tmp/observability/build-errors.log clean (typecheck must pass before finishing)

## Rondleiding (/tour)
- [x] TourDesignStep + TourAccountStep
- [x] src/pages/Tour.tsx + src/routes/tour.tsx (mobile-first, sticky nav, autosave)
- [x] tour.* vertaalsleutels in nl/en/fr/de
- [x] CTA "Start de rondleiding" op About + startpagina
- [x] Onboarding voorvullen uit concept + concept opruimen
- [ ] Rondleiding op mobiel testen

## Open werk (nieuw gemeld)
- [x] Studio-preview: vaste framemaat (krimpt niet meer bij weinig tekst) + echt 390px telefoonviewport
- [x] Studio-preview matcht de publieke route (alias `/u/<handle>` toont mens-badge "Gekoppeld aan een geverifieerd account")
- [x] Hub-instellingen gratis account: dubbele "Identiteit, URL & badge" naast de profielkeuze bovenaan verwijderen
- [x] Hub-instellingen opgesplitst in losse secties (Betalingen, Data & domein, Handle/URL, Badges, Steunpagina, Verificatie, SEO)
- [ ] Meer Pagina Bezoek Effects toevoegen
- [x] Verified-badge (hand-met-keurmerk) tonen op u/-pagina van verified leden, per lid uitschakelbaar (schakelaars in de studio)
- [ ] Mens-badge-tekst volledig meertalig maken (nl/en/fr/de, fallback Engels)
- [x] Badgeverzameling toont eigen vorm + logo per badge (BadgeMedallion) en werkt publiek
- [ ] Verified accounts: hun publieke pagina wordt niet echt aangemaakt — onderzoeken en fixen
- [ ] Routeplanner met kaart
- [ ] Admin-herbedraden voltooien

## Profielhub-naamruimte (gedaan)
- [x] Eén gedeelde handle-naamruimte (root, alias, root-domein) — src/lib/handle-namespace.server.ts + db/39
- [x] /u/<handle> valt niet meer terug op andermans rootprofiel
- [x] /api/claim-root weigert namen van andere accounts
- [x] Domeinenpaneel: expliciet "extra webadres, geen derde profiel"
- [ ] Later: e-mailalias (alias_status/alias_sync_*) in admin hernoemen naar "E-mailalias" om verwarring met profielalias te vermijden

## Neon & rootprofiel (nieuw gemeld 31-08)
- [x] Naamwijziging/claim van geverifieerde naam wordt in één transactie in Neon opgeslagen (username + subdomain_alias + status)
- [x] "Bekijk live profiel" komt uit één bron (src/lib/live-profile.ts)
- [ ] rout.be/<voornaam.achternaam> bestaat niet na claim: rootprofielpagina echt aanmaken
- [x] Root-claim + domeinenpaneel meertalig (root.* in nl/en/fr/de)
- [x] Bezoekerspaneel: bezoeken, in tijd, per taal, bezoekenlijst (VisitorPanel + db/40)
- [x] Hub/Studio-analytics: bezoekerslijst van je u/-pagina met tijd en taal

## Infrastructuur
- [x] Neon-database gekoppeld (DATABASE_URL) + alle db/*.sql migraties uitgevoerd
- [x] Preview-typecheck: incrementele .tsbuildinfo-cache verwijderd (veroorzaakte time-out)

## Rondleiding herbouw (gevraagd)
- [ ] Voortgangsbalk start op 0% bij de intro
- [ ] Eerste adres is rout.be/u/<handle> (min. 5 tekens, 3 letters, 2 cijfers)
- [ ] Twee kolommen: vragen links, live voorbeeld rechts (mobiel gestapeld)
- [ ] Stappen: profiel → mediakanalen → achtergrond & visual FX → typografie → footer & branding → profielfoto → registratie
- [ ] Concept tijdelijk in Neon (anoniem token) en toepassen na registratie
- [ ] Registratie via het gewone /auth-venster i.p.v. eigen magic-link stap

## Nieuw gemeld (admin, studio, footer)
- [ ] Studio → Design & styling: map "🎨 Thema & Kleurenschema" volledig verwijderen (overlapt met 🖼️ Achtergrond & Visual FX)
- [ ] Adminportaal: geverifieerde naam wijzigen met schakelaar "username mee wijzigen" → voornaam.achternaam volgens de bestaande handleregels, achteraf aanpasbaar
- [x] Footer: "© 2026 ROUT • Open Source (AGPLv3)" gecentreerd zodat de footer smaller kan

## Nieuwe taken (about + profiel)
- [x] About-pagina: "claim je handle" CTA's (boven en onder) starten de tour (/tour)
- [x] About-pagina: dubbele claim-knoppen onderaan samenvoegen tot 1 sterke CTA
- [ ] About-pagina visueel opwaarderen + volledig 4-talig (nl/en/fr/de)
- [x] Tour-pagina volledig 4-talig (alle stapteksten via tour.* sleutels in nl/en/fr/de)
- [ ] Profiel: knop "Contact opslaan" (vCard) met schakelaars per veld in de Studio

## Auth-domeinsoevereiniteit (nieuw gemeld 13-09)
- [x] Eén canonieke origin voor alle OAuth-callbacks (src/lib/app-url.ts): NEXT_PUBLIC_APP_URL / VITE_NEXT_PUBLIC_APP_URL, preview-hosts geweerd
- [x] Callbackpad vast op /api/auth/callback/<provider> via de eigen proxy (Google, GitHub, Mastodon, Keycloak, GitLab)
- [ ] Redirect-URI's in elke providerconsole (Google, GitHub, ...) zetten op https://rout.be/api/auth/callback/<provider>
