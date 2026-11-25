/**
 * Prépare les tableaux du contenu à l'affichage mobile (voir « Tableaux » dans global.css).
 *
 * - Chaque cellule reçoit `data-label` = en-tête de sa colonne.
 * - Un tableau large et peu profond (au moins 7 colonnes, au plus 3 lignes : loi de
 *   probabilité, poids binaires…) reçoit `tableau-transpose` : sur petit écran, lignes et
 *   colonnes sont échangées (`--colonnes` = nombre de colonnes d'origine).
 * - Un tableau « de texte » (au moins 3 colonnes, cellules longues en moyenne) ou une
 *   grande grille (au moins 4 colonnes et 7 lignes) reçoit `tableau-cartes` : sur petit
 *   écran, chaque ligne devient une carte. Les autres restent en grille.
 * - Avec une seule ligne de données, la première cellule n'est pas un titre de ligne :
 *   classe `cartes-sans-titre`, toutes les cellules gardent leur étiquette.
 */

const COLONNES_MIN = 3;
const LONGUEUR_MOYENNE_MIN = 10;
const LONGUEUR_ENTETE_MIN = 8;
const COLONNES_TRANSPOSEE_MIN = 7;

/** Texte visible d'un nœud (sans la copie MathML de KaTeX). */
function texte(noeud) {
    if (noeud.type === 'text') return noeud.value;
    const classes = noeud.properties?.className ?? [];
    if (classes.includes('katex-mathml')) return '';
    return (noeud.children ?? []).map(texte).join('');
}

const elements = (noeud, nom) => (noeud.children ?? []).filter((n) => n.type === 'element' && n.tagName === nom);
const cellules = (ligne) => (ligne.children ?? []).filter((n) => n.type === 'element' && (n.tagName === 'td' || n.tagName === 'th'));

function preparer(table) {
    const [thead] = elements(table, 'thead');
    const [tbody] = elements(table, 'tbody');
    if (!thead || !tbody) return;
    const entetes = cellules(elements(thead, 'tr')[0] ?? {}).map((c) => texte(c).replace(/\s+/g, ' ').trim());
    const lignes = elements(tbody, 'tr');

    let total = 0;
    let nombre = 0;
    for (const ligne of lignes) {
        cellules(ligne).forEach((cellule, i) => {
            const t = texte(cellule).trim();
            total += t.length;
            nombre++;
            if (entetes[i]) cellule.properties = { ...cellule.properties, dataLabel: entetes[i] };
        });
    }

    // Une seule ligne sous des en-têtes courts (0, 1, 2…) : tableau de valeurs horizontal, à garder en grille
    const enteteMoyen = entetes.join('').length / Math.max(entetes.length, 1);
    const valeursHorizontales = lignes.length === 1 && enteteMoyen < LONGUEUR_ENTETE_MIN;

    const texteLong = nombre > 0 && total / nombre >= LONGUEUR_MOYENNE_MIN && !valeursHorizontales;
    const grandeGrille = entetes.length >= 4 && lignes.length >= 7;
    const classes = [...(table.properties?.className ?? [])];

    if (entetes.length >= COLONNES_TRANSPOSEE_MIN && lignes.length >= 1 && lignes.length <= 3) {
        classes.push('tableau-transpose');
        table.properties = { ...table.properties, style: `--colonnes: ${entetes.length}` };
    } else if (entetes.length >= COLONNES_MIN && (texteLong || grandeGrille)) {
        classes.push('tableau-cartes');
        if (lignes.length === 1) classes.push('cartes-sans-titre');
    }
    if (classes.length) table.properties = { ...table.properties, className: classes };
}

function parcourir(noeud) {
    if (noeud.type === 'element' && noeud.tagName === 'table') preparer(noeud);
    for (const enfant of noeud.children ?? []) parcourir(enfant);
}

export default function rehypeTableaux() {
    return (arbre) => parcourir(arbre);
}
