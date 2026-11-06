---
name: ameliorer-cours
description: Enrichit un cours déjà présent dans le site Carnet (exemples résolus, explications intuitives, schémas SVG plus clairs, pièges, exercices, animations) en repérant ce qui manque, à partir du cours MDX lui-même et non des documents de sources/. À utiliser quand l'utilisateur veut améliorer, compléter ou clarifier un cours existant (« améliore le cours de signal », « /ameliorer-cours probabilites 03 », « ajoute des exemples au chapitre 2 »).
argument-hint: <dossier-du-cours> [numéro de chapitre | thème] (ex. signal 04, ou probabilites "loi normale")
---

# Améliorer un cours du Carnet

Arguments : `$ARGUMENTS` = dossier du cours (obligatoire, sinon lister `src/content/cours/` et demander), puis éventuellement un chapitre (`NN`) ou un thème pour restreindre le travail. Sans restriction : tout le cours, chapitre par chapitre.

Lire d'abord `CLAUDE.md` (composants, conventions LaTeX/SVG, pièges MDX) : ce skill s'y ajoute, il ne le remplace pas.

## Principe : le cours publié est la base, pas `sources/`

`nouveau-cours` transcrit fidèlement les documents de `sources/`. Ici on fait l'inverse : on **enrichit** ce qui est déjà transcrit, avec du contenu pédagogique nouveau. Conséquences :

- **Ne pas relire `sources/`** par défaut (c'est ce qui ferait dériver le contenu vers une retranscription). Ne l'ouvrir que pour lever un doute précis sur une formule ou une figure du cours, et le dire.
- **Le texte transcrit est intouchable** : énoncés, formules, définitions, résultats, valeurs numériques existants ne sont ni reformulés, ni déplacés, ni « corrigés ». On **ajoute à côté**.
- **Tout ajout doit être identifiable** comme n'étant pas du prof : chaque bloc ajouté est précédé de `{/* AJOUT : <nature> */}` (ex. `{/* AJOUT : exemple résolu */}`). Cela permet `grep -rn "AJOUT" src/content/cours/<cours>` pour tout relire, filtrer ou retirer.
- **Cohérence avec le cours** : mêmes notations, mêmes conventions que le chapitre (ne pas introduire $\omega$ si le chapitre écrit $f$), même niveau (ING1), vocabulaire déjà défini avant. Ne pas utiliser une notion vue dans un chapitre ultérieur sans le signaler.
- **Exactitude avant tout** : tout calcul, valeur numérique, tracé ajouté est vérifié par un script (Python : `sympy`, `numpy`, `scipy`) dans le scratchpad, jamais « de tête ». Un exemple faux est pire qu'un exemple absent.
- **Erreur de fond repérée dans le cours existant** : ne pas corriger ; insérer `{/* FOND ? <explication>. Signalé, non corrigé. */}` juste avant, et la signaler dans le compte rendu (comme dans `nouveau-cours`). Ne pas construire un ajout sur une formule douteuse.

## 1. Auditer

Lire les chapitres concernés **en entier**, et le plan du cours (`_cours.json`, titres `##`). Pour chacun, noter ce qui manque, avec la grille suivante (ne retenir que ce qui apporte réellement quelque chose) :

| Manque | Signe dans le cours | Ajout possible |
| --- | --- | --- |
| **Intuition** | une définition ou formule posée sans dire « à quoi ça sert » ni « d'où ça vient » | `<Remark titre="Intuition">` : 2–4 phrases, analogie, lecture physique/graphique de la formule |
| **Exemple** | un théorème ou une méthode sans application numérique | `<Example>` résolu pas à pas, valeurs simples, avec `<Solution titre="Détail du calcul">` pour les étapes |
| **Méthode** | l'étudiant doit deviner l'enchaînement des étapes d'un calcul type | encadré `<Theorem type="Méthode">` : liste numérotée courte, puis un exemple qui l'applique |
| **Piège** | confusion courante (bornes, signe, $\le$ / $<$, discret/continu, unités, rad/s vs Hz) | `<Warning>` court et concret |
| **Schéma** | une notion spatiale/temporelle/fréquentielle décrite uniquement en texte ou en formules ; ou figure existante peu lisible | nouvelle `<Figure>` SVG (voir §3) |
| **Interaction** | notion qui se comprend en faisant varier un paramètre | `<Animation>` (voir §3) |
| **Lien** | notion isolée, relation avec une autre non dite | une phrase + lien vers le chapitre (`/cours/<cours>/<slug>/`) |
| **Exercice** | chapitre sans aucune application à faire soi-même | `<Exercise niveau={1..3}>` + `<Solution>` (voir §2) |
| **Récapitulatif** | fiche finale incomplète par rapport au chapitre | compléter `<Formulas>` — uniquement avec des formules **déjà présentes** dans le chapitre |

Pas de gonflement : un chapitre de 5 sections gagne en général 2 à 5 ajouts bien placés, pas 15. Préférer un seul bon exemple à trois redondants. Ne pas ajouter de contenu hors programme du cours (nouveaux théorèmes, démonstrations non demandées, extensions) : l'objectif est de mieux faire comprendre **ce que le cours dit**.

## 2. Proposer, puis appliquer

Présenter à l'utilisateur, par chapitre, la liste numérotée des ajouts envisagés : `où` (section) · `quoi` (nature) · `pourquoi` (le manque constaté) en une ligne chacun, plus les éventuels points `FOND ?`. Demander lesquels garder (« tout », « 1,3,5 », « sauf les exercices »…). Les **exercices** et le **remplacement d'une figure existante** sont toujours à valider explicitement. Si l'utilisateur a déjà dit « fais tout » ou précisé ce qu'il veut, ne pas redemander et appliquer directement.

Règles d'écriture des ajouts :

- **Placement** : l'ajout va juste après le passage qu'il éclaire, dans la même section `##` ; pas de nouvelle section `##` sauf nécessité (elle apparaît dans le plan et le sommaire). Jamais après `## Fiche récapitulative`.
- **Exemples** : chiffres simples, résultat plausible, unités. Écrire l'énoncé, puis la résolution dans `<Solution titre="Détail du calcul">` si elle dépasse 2–3 lignes. Vérifier le résultat par script.
- **Explications** : courtes, concrètes, sans jargon nouveau ; une analogie par notion au maximum. Pas de redite du texte voisin avec d'autres mots.
- **Exercices** : de difficulté croissante (`niveau` 1 à 3), énoncé autonome, solution complète repliée dans `<Solution>`, résultat vérifié par script. 2–4 par chapitre, pas plus. Ils portent sur le contenu du chapitre uniquement.
- **Fiche récapitulative** : si une formule est ajoutée au chapitre, ne la mettre dans la fiche que si elle est tirée du cours (pas d'une explication ajoutée).
- LaTeX et composants : conventions de `CLAUDE.md` (`$$` seul sur sa ligne, `0{,}58`, `\%`, espace insécable avant « : »).

## 3. Schémas et animations

- **Nouvelle figure** : SVG inline dans `<Figure legende="…">` (pas d'attribut `page`, puisqu'elle ne vient d'aucune source), `currentColor` / `var(--accent)`, `role="img"` + `aria-label` descriptif, ids de `<marker>` uniques dans tout le chapitre, **jamais de texte mixte avec balise** dans le SVG (deux `<text>` séparés pour un indice). Calculer les courbes par script Python (points d'un `<path>`) plutôt qu'à la main.
- Un bon schéma montre **une idée** : peu d'éléments, étiquettes lisibles à ≈ 400 px de large, flèches et annotations qui disent ce qu'il faut regarder (« amplitude 10 », « période $T$ »), accent coloré sur l'élément clé, le reste en gris. Vérifier aussi en mode sombre.
- **Remplacer une figure existante** (redessin plus clair) : seulement avec accord ; garder l'ancienne en commentaire n'est pas utile (git suffit) mais conserver sa `legende` et sa `page` de provenance.
- **Animation** : seulement si la notion se comprend en faisant varier un paramètre. Réutiliser un type existant (`src/scripts/animations/index.ts`, liste dans `CLAUDE.md`) quand c'est possible ; sinon créer un module comme décrit dans `nouveau-cours` §5 et mettre à jour la liste dans `CLAUDE.md` (seule modification autorisée hors du dossier du cours).

## 4. Vérifier

```bash
npm run check   # 0 erreur
npm test        # build + Pagefind + liens internes : 0 erreur
```

Puis `npm run preview` et contrôle visuel des chapitres modifiés : ajouts bien rendus (blocs, formules sans `$$` brut ni débordement), figures lisibles à ≈ 400 px et en mode sombre, solutions repliées, animation fonctionnelle.

Vérifier que le texte d'origine est intact : `git diff` ne doit montrer que des **lignes ajoutées** (le seul `-` toléré : une figure remplacée avec accord, ou une ligne de `<Formulas>` complétée). Toute suppression ou modification d'une ligne transcrite est un bug.

## 5. Rendre compte

Résumé court :
1. ajouts faits, par chapitre et par nature (nombre d'exemples, d'explications, de figures, d'exercices, d'animations) ;
2. points **`FOND ?`** repérés dans le cours existant, avec proposition de correction ;
3. ajouts refusés ou laissés de côté, et pourquoi ;
4. rappel : tout ajout est repérable par `grep -rn "AJOUT" src/content/cours/<cours>`.

Ne jamais commit ni push : proposer un message de commit, l'utilisateur s'en charge.
