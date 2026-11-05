# CLAUDE.md — Carnet (site de révision ING1)

Site **100 % statique** de fiches de révision. Astro 7 + MDX, Tailwind v4, KaTeX, Pagefind, servi par nginx (Docker / Dokploy).

## Commandes

- `npm run dev` — serveur de dev (la recherche n'y fonctionne pas : index généré au build)
- `npm run build` — `astro build` puis `pagefind --site dist`
- `npm run preview` — sert `dist/` (tester la recherche ici)
- `npm run check` — types + schéma de contenu (doit rester à 0 erreur)
- `npm test` — build + vérification des liens/ancres internes (`scripts/verifier-liens.mjs`)
- `docker build -t carnet . && docker run -p 8080:80 carnet`

## Architecture

```
src/
  content.config.ts         schéma des collections « cours » et « chapitres » (zod)
  content/cours/<cours>/    UN DOSSIER PAR COURS
    _cours.json             métadonnées (titre, matiere, semestre, description, [teinte, enseignant, brouillon])
    NN-titre.mdx            un chapitre par fichier ; NN = ordre, le reste = slug d'URL
  content/_template/        gabarit à copier (hors collection, jamais publié)
  lib/cours.ts              tousLesCours() : assemble cours + chapitres triés, slugs, durées, teinte
  pages/index.astro         catalogue (filtres matière/semestre, reprise, favoris, avancement)
  pages/cours/[cours]/index.astro        sommaire d'un cours
  pages/cours/[cours]/[chapitre].astro   page chapitre (plan latéral/tiroir, sommaire, préc./suiv., fil d'Ariane)
  components/pedago/        composants MDX ; index.ts = carte injectée dans <Content components>
  components/layout/Recherche.astro      modale Pagefind (Ctrl/⌘+K, « / »)
  scripts/suivi.ts          localStorage « carnet:suivi:v1 » : vus, favoris, positions (reprise)
  scripts/animations/       animations SVG en TS ; index.ts = registre (imports dynamiques)
  styles/global.css         jetons de couleur (clair/sombre), prose, blocs, impression
  scripts/pwa.ts            enregistrement du service worker + bouton « Installer »
public/manifest.webmanifest, icon-*.png, apple-touch-icon.png   PWA (icônes : lettre « c » Fraunces sur réglure)
scripts/generer-sw.mjs      génère dist/sw.js après le build (précache de tout le site, version = hash du contenu)
scripts/verifier-liens.mjs  contrôle des liens/ancres internes
```

URL : `/cours/<dossier>/<fichier-sans-NN>/` (trailing slash obligatoire, `trailingSlash: 'always'`).

## Règle d'or : ajouter un cours = ajouter un dossier

Ne jamais modifier pages/lib/composants pour ajouter du contenu. Procédure :

1. `cp -r src/content/_template src/content/cours/<nom-dossier>` (minuscules, tirets, sans accents)
2. Remplir `_cours.json` (mettre `"brouillon": false`)
3. Un fichier `NN-titre.mdx` par chapitre ; frontmatter : `titre`, `resume`, `tags`, `sources` (n° de pages photo) ; `duree`/`ordre` facultatifs
4. `npm run check && npm test`

## Conventions de contenu (transcription des documents de `sources/<cours>/`)

Procédure complète d'ajout : skill **`/nouveau-cours <dossier>`** (`.claude/skills/nouveau-cours/SKILL.md`). Sources possibles : photos de notes, PDF, diapos (PPTX/ODP), Word… mélangés et pas forcément numérotés ; outils : `pdftotext`/`pdftoppm` (poppler) et `soffice --headless --convert-to pdf`. Les photos du cours de probabilités sont à la racine de `sources/` (historique) ; les suivants vont dans un sous-dossier par cours.

- Ordre : numérotation interne (page des notes, n° de diapo, pagination PDF) sinon ordre logique du contenu ; des numéros peuvent manquer. Provenance notée par une référence courte : `4` (page de notes) ou `"cours.pdf p. 3"`, `"slides.pptx #12"` — dans `sources`, `FOND ?`, `TODO`, `<Figure page>`, `<Todo page>`.
- **Transcription fidèle.** Ne rien inventer (ni énoncé, ni question). Erreur de fond repérée → la laisser telle quelle, ajouter `{/* FOND ? … Signalé, non corrigé. */}` juste avant, et la signaler à l'utilisateur. Corriger seulement après son accord.
- Passage illisible/ambigu : `{/* TODO: illisible, <référence> */}` ; énoncé ou figure manquant : `<Todo page={…}>…</Todo>` (visible). Contradiction entre deux sources = point `FOND ?`. Lister les TODO en fin de travail.
- Formules en LaTeX : `$…$` en ligne ; **les formules centrées s'écrivent `$$` seul sur sa ligne** (un `$$x$$` sur une seule ligne est rendu *en ligne* par remark-math). Décimales françaises : `0{,}58`. Pourcentages dans KaTeX : `\%`.
- Une section = un `##` (apparaît dans le plan et le sommaire) ; sections courtes ; `###` pour les sous-parties.
- Composants : `Definition`, `Theorem` (prop `type` pour changer l'étiquette, ex. « À retenir »), `Property`, `Remark`, `Warning`, `Example`, `Exercise` (+ `<Solution>` repliée, `niveau={1..3}`), `Solution` (aussi pour « Détail du calcul »), `Formulas` + `Formula label`, `Figure` (SVG inline), `Animation`, `Todo`. Terminer chaque chapitre par `## Fiche récapitulative` avec `<Formulas>`.
- Figures : redessiner en SVG inline (`currentColor`, `var(--accent)`), `role="img"` + `aria-label` ; ids de `<marker>` uniques par figure.
- **Pas de contenu mixte texte + balise dans le SVG** (ex. `<text>C<tspan>f</tspan></text>`) : si un formateur (IDE) le coupe sur plusieurs lignes, MDX lit le texte comme un paragraphe Markdown et le build casse (« Expected a closing tag for `<text>` »). Utiliser deux `<text>` séparés (indice décalé en x/y).
- Animations : au moins une par cours si pertinent. Types existants : `loi-discrete`, `binomiale-poisson`, `densite` (`loi`: normale|exponentielle|uniforme|toutes), `serie-fourier` (`n` : harmoniques impairs du signal carré, Gibbs), `poles-stabilite` (`p` : pôle d'un système discret du 1er ordre). Nouvelle animation = nouveau module dans `src/scripts/animations/` + entrée dans le registre.

## PWA (installable + hors ligne)

- `npm run build` = `astro build` → `pagefind` → `scripts/generer-sw.mjs`, qui écrit `dist/sw.js` : **tout** le site est précaché (pages, `/_astro/*` en woff2 seulement, index Pagefind). Aucun fichier à tenir à jour : un nouveau cours est précaché automatiquement.
- Stratégie : pages réseau d'abord (3,5 s de délai si une copie existe) puis cache ; assets et recherche cache d'abord. Chaque déploiement change le nom du cache (`carnet-<hash>`), l'ancien est supprimé à l'activation.
- Le worker n'est enregistré qu'en production (`import.meta.env.PROD`) : `npm run dev` ne l'installe pas. HTTPS obligatoire hors `localhost` (Dokploy/Let's Encrypt).
- Pièges rencontrés : (1) **ne jamais précacher `/404.html`** (nginx la déclare `internal` → 404 en accès direct → `cache.addAll` échoue et le worker ne s'installe pas) ; (2) le cache doit être lu avec `ignoreVary: true` (une requête de module envoie un en-tête `Origin` absent de la requête de précache, sinon l'import de Pagefind échoue hors ligne) ; (3) nginx:alpine ne connaît pas `.webmanifest` (type forcé dans `nginx.conf`) et `/sw.js` doit rester en `Cache-Control: no-cache`.
- Test hors ligne : construire l'image Docker, lancer le conteneur, ouvrir le site, attendre l'installation (≈ 3 s), couper le conteneur, recharger. Dans le navigateur intégré de Claude Code, les requêtes d'un service worker ne passent que pour un serveur déclaré dans `.claude/launch.json` (`{"name":"nginx","url":"http://localhost:8089","port":8089}`) ; sinon l'enregistrement échoue sans message clair.
- Changer le logo : régénérer les 5 PNG de `public/` (carré arrondi `#3b4bc8`, « c » italique Fraunces 700 blanc, marge rouge à 20 %) ; les versions *maskable* gardent la lettre dans la zone centrale (≈ 60 %).

## Design (« Carnet »)

Papier chaud + encre bleue, réglure Seyès (`.seyes`) en accent visuel. Titres Fraunces, texte IBM Plex Sans (polices auto-hébergées via @fontsource). Toutes les couleurs passent par les variables CSS de `global.css` (`--paper`, `--ink`, `--accent`… redéfinies sous `[data-theme='dark']`) ; la teinte `--h` vient du cours. Thème : `data-theme` posé avant rendu (script inline dans `Base.astro`), bascule auto → clair → sombre stockée sous `carnet:theme`.

Pièges connus : **Pagefind est épinglé à 1.5.2 exactement** — à partir de 1.6.0 le binaire exige AVX2 et plante (`Illegal instruction`, exit 132, sans message) sur le serveur Dokploy (Xeon E3-1220 V2, sans AVX2). Avant toute montée de version, tester `npx pagefind --version` dans `node:lts-alpine` sur le serveur. Tailwind v4 utilise la propriété CSS `translate` (pas `transform`) ; la CSP nginx impose `'wasm-unsafe-eval'` pour Pagefind ; KaTeX est exclu de l'index Pagefind (`pagefind.yml`).

## Déploiement

Dokploy, build type **Dockerfile**, port **80**, auto-deploy sur push `main`. `sources/` est exclu par `.gitignore` et `.dockerignore` : ne jamais l'inclure dans l'image.
