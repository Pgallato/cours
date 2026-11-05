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
```

URL : `/cours/<dossier>/<fichier-sans-NN>/` (trailing slash obligatoire, `trailingSlash: 'always'`).

## Règle d'or : ajouter un cours = ajouter un dossier

Ne jamais modifier pages/lib/composants pour ajouter du contenu. Procédure :

1. `cp -r src/content/_template src/content/cours/<nom-dossier>` (minuscules, tirets, sans accents)
2. Remplir `_cours.json` (mettre `"brouillon": false`)
3. Un fichier `NN-titre.mdx` par chapitre ; frontmatter : `titre`, `resume`, `tags`, `sources` (n° de pages photo) ; `duree`/`ordre` facultatifs
4. `npm run check && npm test`

## Conventions de contenu (transcription des photos `sources/page-XX.jpg`)

- Le numéro en bas à droite de la photo donne l'ordre ; des numéros peuvent manquer (pages sans cours).
- **Transcription fidèle.** Ne rien inventer (ni énoncé, ni question). Erreur de fond repérée → la laisser telle quelle, ajouter `{/* FOND ? … Signalé, non corrigé. */}` juste avant, et la signaler à l'utilisateur. Corriger seulement après son accord.
- Passage illisible/ambigu : `{/* TODO: illisible, page XX */}` ; énoncé ou figure manquant : `<Todo page={XX}>…</Todo>` (visible). Lister les TODO en fin de travail.
- Formules en LaTeX : `$…$` en ligne ; **les formules centrées s'écrivent `$$` seul sur sa ligne** (un `$$x$$` sur une seule ligne est rendu *en ligne* par remark-math). Décimales françaises : `0{,}58`. Pourcentages dans KaTeX : `\%`.
- Une section = un `##` (apparaît dans le plan et le sommaire) ; sections courtes ; `###` pour les sous-parties.
- Composants : `Definition`, `Theorem` (prop `type` pour changer l'étiquette, ex. « À retenir »), `Property`, `Remark`, `Warning`, `Example`, `Exercise` (+ `<Solution>` repliée, `niveau={1..3}`), `Solution` (aussi pour « Détail du calcul »), `Formulas` + `Formula label`, `Figure` (SVG inline), `Animation`, `Todo`. Terminer chaque chapitre par `## Fiche récapitulative` avec `<Formulas>`.
- Figures : redessiner en SVG inline (`currentColor`, `var(--accent)`), `role="img"` + `aria-label` ; ids de `<marker>` uniques par figure.
- **Pas de contenu mixte texte + balise dans le SVG** (ex. `<text>C<tspan>f</tspan></text>`) : si un formateur (IDE) le coupe sur plusieurs lignes, MDX lit le texte comme un paragraphe Markdown et le build casse (« Expected a closing tag for `<text>` »). Utiliser deux `<text>` séparés (indice décalé en x/y).
- Animations : au moins une par cours si pertinent. Types existants : `loi-discrete`, `binomiale-poisson`, `densite` (`loi`: normale|exponentielle|uniforme|toutes). Nouvelle animation = nouveau module dans `src/scripts/animations/` + entrée dans le registre.

## Design (« Carnet »)

Papier chaud + encre bleue, réglure Seyès (`.seyes`) en accent visuel. Titres Fraunces, texte IBM Plex Sans (polices auto-hébergées via @fontsource). Toutes les couleurs passent par les variables CSS de `global.css` (`--paper`, `--ink`, `--accent`… redéfinies sous `[data-theme='dark']`) ; la teinte `--h` vient du cours. Thème : `data-theme` posé avant rendu (script inline dans `Base.astro`), bascule auto → clair → sombre stockée sous `carnet:theme`.

Pièges connus : Tailwind v4 utilise la propriété CSS `translate` (pas `transform`) ; la CSP nginx impose `'wasm-unsafe-eval'` pour Pagefind ; KaTeX est exclu de l'index Pagefind (`pagefind.yml`).

## Déploiement

Dokploy, build type **Dockerfile**, port **80**, auto-deploy sur push `main`. `sources/` est exclu par `.gitignore` et `.dockerignore` : ne jamais l'inclure dans l'image.
