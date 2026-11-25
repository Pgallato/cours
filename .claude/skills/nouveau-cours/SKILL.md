---
name: nouveau-cours
description: Ajoute un nouveau cours au site Carnet à partir des documents déposés dans sources/<cours>/ (photos de notes, PDF, diapos PPTX, Word…, numérotés ou non) — transcription fidèle en MDX, figures SVG, animation, fiche de formules, vérifications. À utiliser quand l'utilisateur veut créer ou compléter un cours (« ajoute le cours de traitement du signal », « /nouveau-cours mecanique »).
argument-hint: <dossier-du-cours> (ex. traitement-du-signal)
---

# Ajouter un cours au Carnet

Argument : `$ARGUMENTS` = nom du dossier du cours (minuscules, tirets, sans accents). S'il manque, le demander.

Lire d'abord `CLAUDE.md` (architecture, conventions de contenu, pièges connus) : ce skill en applique la procédure, il ne la remplace pas. **Règle d'or : on n'ajoute que des fichiers dans `src/content/cours/<cours>/`** — sauf nouvelle animation (voir étape 5).

## 1. Inventorier les sources

Tout ce qui concerne le cours est dans `sources/<cours>/` (à défaut à la racine de `sources/` : demander à l'utilisateur ce qui appartient à ce cours, ne jamais mélanger avec un cours existant). Formats possibles, souvent **mélangés** et **pas forcément numérotés** :

| Format | Préparation (sorties dans le scratchpad, jamais dans le projet) | Lecture |
| --- | --- | --- |
| Photos `.jpg/.png` (`.heic` : demander un export JPG) | copies réduites + rotation EXIF (script ci-dessous) | lire chaque image |
| `.pdf` | `pdfinfo` (nb de pages), `pdftotext -layout f.pdf out.txt` | texte + **rendu des pages** (`pdftoppm -r 110 -png f.pdf out/p`) ou outil Read avec `pages` |
| `.pptx/.ppt/.odp`, `.docx/.doc/.odt` | `soffice --headless --convert-to pdf --outdir <scratchpad>/conv f.pptx` | puis comme un PDF |
| `.md/.txt/.tex` | aucune | lire directement (le LaTeX existant se réutilise tel quel) |
| Autre | demander à l'utilisateur comment l'exploiter | — |

- **Toujours regarder le rendu visuel** des pages PDF/diapos, pas seulement le texte extrait : `pdftotext` perd les formules, les indices, les schémas et l'ordre des colonnes. Le texte sert à copier sans faute, l'image à comprendre.
- Script pour les photos (taille 3000×4000, rotation EXIF) :

  ```bash
  python3 -I -c "
  import glob, os, sys
  from PIL import Image, ImageOps
  out = sys.argv[1]; os.makedirs(out, exist_ok=True)
  for f in sorted(glob.glob('sources/<cours>/*.[jJpP][pPnN][gG]')):
      im = ImageOps.exif_transpose(Image.open(f)); im.thumbnail((1800, 1800))
      im.convert('RGB').save(os.path.join(out, os.path.basename(f)), quality=85)
  " <scratchpad>/img-<cours>
  ```

- Passage pâle ou ambigu (crayon, annotation en marge, diapo basse résolution) : recadrer et augmenter le contraste (`ImageEnhance.Contrast(...).enhance(1.8)`, ou `pdftoppm -r 200 -f N -l N` pour une seule page) avant de conclure qu'il est illisible.

### Établir l'ordre

Par ordre de priorité :
1. **numérotation interne** : numéro de page écrit sur les notes, numéro de diapo, pagination du PDF, numérotation des parties (« I. », « 2.3 ») ;
2. **ordre logique du contenu** : un document qui utilise une notion vient après celui qui la définit ; renvois explicites (« cf. chapitre précédent ») ;
3. indices faibles : nom de fichier, date dans le document.

Des trous de numérotation sont normaux (pages sans cours) : ne pas les réclamer. Si l'ordre reste incertain, ou si deux sources **se recoupent** (ex. diapos du prof + notes manuscrites du même chapitre), le dire dans le plan (étape 2) : proposer une fusion (une seule transcription, la source la plus complète en base, l'autre en complément) et laisser l'utilisateur trancher en cas de **contradiction** entre sources (à traiter comme un point `FOND ?`).

### Référencer la provenance

Chaque source reçoit une **référence courte** réutilisée partout (frontmatter `sources`, `FOND ?`, `TODO`, `<Figure page>`, `<Todo page>`) :
- photo de notes numérotée : le numéro seul, `4` ;
- autre document : `"<fichier> p. N"` (PDF, Word) ou `"<fichier> #N"` (diapo) ; sans numérotation, `"<fichier>"` suivi d'un repère (« section Filtrage »).

## 2. Proposer le plan, puis enchaîner

En quelques lignes à l'utilisateur : titre du cours, matière, semestre (demander si inconnu ; sinon mettre une valeur et le signaler), l'**inventaire des sources** (format, ordre retenu et sur quel indice, recoupements éventuels), et la liste des chapitres avec leurs références. **Un chapitre par grande partie du cours**, sections courtes (`##`). Enchaîner sans attendre sauf information bloquante (ordre vraiment indéterminable, sources contradictoires sur l'essentiel).

## 3. Créer les fichiers

```bash
cp -r src/content/_template src/content/cours/<cours>
```

- `_cours.json` : `titre`, `matiere`, `semestre`, `description` ; mettre `"brouillon": false`. Espace insécable avant « : » dans les titres (` :`).
- Un fichier `NN-titre-du-chapitre.mdx` par chapitre (supprimer `01-titre-du-chapitre.mdx` du gabarit copié). Frontmatter : `titre`, `resume`, `tags`, `sources` (références de provenance, voir étape 1 : `[4, 5, "cours.pdf p. 3"]`).

## 4. Transcrire — règles non négociables

- **Fidélité.** Ne rien inventer : ni énoncé, ni question, ni exemple, ni « astuce ». Un calcul intermédiaire ajouté pour expliquer un résultat des notes va dans `<Solution titre="Détail du calcul">` et doit être signalé dans le résumé final.
- **Erreur de fond repérée** (formule fausse, bornes inversées, notation incohérente) : la transcrire telle quelle, ajouter juste avant `{/* FOND ? <explication>. Signalé, non corrigé. */}`, la lister à l'utilisateur. Ne corriger qu'après son accord. Les fiches récapitulatives ne reprennent pas une formule contestée.
- **Illisible / ambigu** : `{/* TODO: illisible, <référence> — <ce qui manque> */}` (ex. `page 6`, `slides.pptx #12`). Énoncé ou figure manquants : `<Todo page={6}>…</Todo>` ou `<Todo page="slides.pptx #12">…</Todo>` (visible).
- **Exercices des notes** : demander à l'utilisateur s'il veut les garder avant de les transcrire (il peut ne pas en vouloir).
- **Structure** : `Definition`, `Theorem` (`type="À retenir"` pour un encadré important), `Property`, `Remark`, `Warning` (piège signalé dans les notes), `Example`, `Exercise` + `Solution`, `Figure`, `Animation`. Terminer chaque chapitre par `## Fiche récapitulative` avec `<Formulas>` / `<Formula label="…">`.
- **LaTeX** : `$…$` en ligne ; formules centrées avec `$$` **seul sur sa ligne** (sinon rendu en ligne). Virgule décimale `0{,}58`, pourcentage `\%`, `\operatorname{Var}`, `\mathcal{N}`…

## 5. Figures et animations

- **Figures simples** (courbes, chronogrammes, spectres, schémas-blocs simples) : SVG inline dans `<Figure legende="…" page={6}>` (ou `page="cours.pdf p. 3"`), couleurs `currentColor` / `var(--accent)`, `role="img"` + `aria-label`. Calculer les tracés de courbes avec un petit script Python plutôt qu'à la main. Ids de `<marker>` **uniques par figure**.
- **Jamais de contenu mixte texte + balise** dans le SVG (`<text>C<tspan>f</tspan></text>`) : un reformatage d'IDE le casse et fait échouer le build MDX. Utiliser deux `<text>` séparés.
- **Figure trop complexe** : `<Todo page={…}>description de la figure</Todo>`. Ne jamais copier une image extraite d'un PDF/PPTX dans le site : on redessine ou on décrit.
- **Animation** : au moins une par cours si le contenu s'y prête. Réutiliser un type existant (`src/scripts/animations/index.ts`) si possible ; sinon créer `src/scripts/animations/<nom>.ts` (export par défaut `(scene, params) => void`, outils dans `outils.ts`, sliders via `curseur()`, texte de lecture `aria-live`) et l'ajouter au registre. C'est la seule modification autorisée hors du dossier du cours ; mettre à jour la liste des types dans `CLAUDE.md`.

## 6. Vérifier

```bash
npm run check   # 0 erreur
npm test        # build + Pagefind + liens internes : 0 erreur
```

Puis `npm run preview` et contrôler dans le navigateur : catalogue (nouvelle carte, filtres), chaque chapitre, rendu des formules (pas de `$$` brut, pas de formule « en ligne » qui déborde), figures, animation, à **≈ 400 px** et en **mode sombre**. Tester la recherche (Ctrl+K) sur un mot du nouveau cours.

Si une dépendance a été ajoutée ou mise à jour : ne pas toucher à la version de Pagefind (épinglée à 1.5.2, voir `CLAUDE.md`).

## 7. Rendre compte

Résumé court à l'utilisateur :
1. ce qui est fait (chapitres, figures, animations) ;
2. **points de fond** signalés (FOND ?), y compris contradictions entre sources, avec référence et proposition de correction ;
3. **TODO** restants (référence + nature) ;
4. l'**ordre retenu** quand il a été déduit (pas de numérotation) ;
5. ajouts faits par toi (détails de calcul, animations nouvelles).

Ne jamais commit ni push : proposer un message de commit, l'utilisateur s'en charge.
