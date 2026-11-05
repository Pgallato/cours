# Carnet — site de révision ING1

Site statique de révision pour les cours de première année d'école d'ingénieur :
un chapitre par page, formules en LaTeX (KaTeX), recherche plein texte (Pagefind),
suivi de progression local (sans compte), thème clair/sombre, impression propre.

**Stack :** Astro + MDX · Tailwind CSS v4 · KaTeX · Pagefind · nginx (Docker).

---

## Lancer en local

Prérequis : Node.js ≥ 22 (LTS).

```bash
npm install          # une seule fois
npm run dev          # http://localhost:4321 — rechargement à chaud
```

La recherche (Ctrl/⌘ + K) utilise l'index généré au build. Pour la tester :

```bash
npm run build        # astro build + indexation Pagefind → dist/
npm run preview      # sert dist/ sur http://localhost:4321
```

Autres commandes :

| Commande          | Rôle                                              |
| ----------------- | ------------------------------------------------- |
| `npm run check`   | Vérifie les types et le schéma du contenu         |
| `docker build -t carnet .` puis `docker run -p 8080:80 carnet` | Teste l'image de production sur http://localhost:8080 |

---

## Ajouter un cours (pas à pas)

**Règle d'or : un cours = un dossier. Aucun autre fichier à modifier.**
Catalogue, filtres, navigation, pages et recherche se mettent à jour tout seuls.

1. **Copier le gabarit** :

   ```bash
   cp -r src/content/_template src/content/cours/mecanique
   ```

   Le nom du dossier (`mecanique`) devient l'URL : `/cours/mecanique/`.

2. **Renseigner `_cours.json`** :

   ```json
   {
     "titre": "Mécanique du point",
     "matiere": "Physique",
     "semestre": "S2",
     "description": "Cinématique, dynamique et énergie du point matériel.",
     "brouillon": false
   }
   ```

   Facultatif : `"enseignant"`, `"annee"`, `"teinte"` (0–360, couleur d'accent ;
   sinon déduite de la matière). `"brouillon": true` cache le cours du catalogue.

3. **Écrire un fichier par chapitre**, nommé `NN-titre-du-chapitre.mdx` :

   ```mdx
   ---
   titre: Cinématique du point
   resume: Position, vitesse et accélération dans différents repères.
   tags: [vitesse, accélération]
   sources: [1, 2, 3]
   ---

   ## Vecteur vitesse

   <Definition titre="Vitesse">
   $$\vec v = \frac{d\vec{OM}}{dt}$$
   </Definition>

   <Exercise titre="Exercice 1" niveau={1}>
   Un point se déplace selon $x(t) = 3t^2$. Calculer sa vitesse.

   <Solution>
   $v(t) = 6t$.
   </Solution>
   </Exercise>
   ```

   - le préfixe `01-`, `02-`… donne l'ordre ; l'URL est le reste du nom (`/cours/mecanique/cinematique-du-point/`) ;
   - chaque `##` devient une section du plan latéral et du sommaire ;
   - formules : `$…$` en ligne, `$$…$$` centrées.

4. **Vérifier** : `npm run dev`, puis `npm run build` (le build échoue si le frontmatter est invalide).

5. **Publier** : `git add . && git commit -m "Cours : mécanique" && git push` → Dokploy redéploie.

### Composants disponibles (sans import)

| Composant | Usage |
| --- | --- |
| `<Definition titre="…">` | Définition |
| `<Theorem titre="…">` | Théorème (`type="À retenir"` pour changer l'étiquette) |
| `<Property titre="…">` | Propriété |
| `<Remark>` | Remarque |
| `<Warning titre="…">` | Piège / erreur classique |
| `<Example titre="…">` | Exemple avec calcul détaillé |
| `<Exercise titre="…" niveau={1-3}>` | Exercice ; correction dans `<Solution>` (repliée) |
| `<Solution titre="…">` | Bloc dépliable (correction, détail d'un calcul) |
| `<Formulas>` + `<Formula label="…">` | Fiche récapitulative des formules |
| `<Figure legende="…" page={N}>` | Figure SVG inline |
| `<Animation type="…" params={{…}}>` | Visualisation interactive : `loi-discrete`, `binomiale-poisson`, `densite` |
| `<Todo page={N}>` | Passage à compléter (visible à l'écran, masqué à l'impression) |

Un exemple de chaque composant se trouve dans `src/content/_template/01-titre-du-chapitre.mdx`.

### Ajouter une animation

Créer `src/scripts/animations/mon-anim.ts` (export par défaut `(scene, params) => void`),
puis l'ajouter au registre de `src/scripts/animations/index.ts`. Elle n'est chargée que sur
les pages qui l'utilisent.

---

## Déployer sur Dokploy (depuis GitHub)

1. Pousser le dépôt sur GitHub (`sources/` est ignoré par git **et** par Docker).
2. Dans Dokploy : **Create Application** → source **GitHub** → choisir le dépôt et la branche `main`.
3. **Build Type : `Dockerfile`** (chemin `./Dockerfile`, contexte `.`).
4. Onglet **Domains** : ajouter le domaine, **port du conteneur : `80`**, activer HTTPS (Let's Encrypt).
5. Onglet **General** → activer **Auto Deploy** : chaque `git push` sur `main` reconstruit et redéploie.
6. **Deploy**. Le conteneur expose un `HEALTHCHECK` sur `/healthz`.

Pensez à mettre votre domaine dans `site` de `astro.config.mjs` (URL canonique).

L'image finale ne contient que `nginx` et le dossier `dist/` (≈ quelques Mo) :
gzip, cache long sur `/_astro/*` (fichiers hashés), cache court sur le HTML,
page 404 personnalisée et en-têtes de sécurité (CSP, nosniff, etc.).

---

## Suivi personnel

« Vu », favoris et « reprendre là où je me suis arrêté » sont enregistrés dans le
`localStorage` du navigateur : rien n'est envoyé à un serveur, et la progression est
propre à chaque appareil/navigateur.
