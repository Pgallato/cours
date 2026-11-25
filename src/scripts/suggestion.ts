/**
 * « Proposer une modification » : ouvre une issue GitHub pré-remplie (page, section,
 * fichier MDX, passage sélectionné). Aucun backend : GitHub stocke les demandes.
 */

const DEPOT = 'Pgallato/cours';
const LABEL = 'enhancement'; // appliqué seulement si l'auteur de l'issue a les droits sur le dépôt
const CITATION_MAX = 1200; // l'URL de création d'issue doit rester raisonnable (~8 ko)

export interface RefSuggestion {
    titre: string;
    numero: number;
    coursTitre: string;
    fichier: string;
}

const ICONE =
    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>';

interface Cible {
    section?: HTMLElement; // titre h2 de la section concernée
    citation?: string;
}

export function urlSuggestion(ref: RefSuggestion, {section, citation}: Cible): string {
    const page = new URL(location.pathname, location.origin);
    if (section) page.hash = section.id;
    const nomSection = section ? texteTitre(section) : undefined;

    const lignes = [
        `**Page** : ${decodeURI(page.href)}`, // ancres accentuées lisibles
        `**Cours** : ${ref.coursTitre} › Chapitre ${ref.numero} — ${ref.titre}`,
        ...(nomSection ? [`**Section** : ${nomSection}`] : []),
        `**Fichier** : \`${ref.fichier}\``,
    ];
    if (citation) {
        const court = citation.length > CITATION_MAX ? `${citation.slice(0, CITATION_MAX)} […]` : citation;
        lignes.push('', '**Passage** :', '', ...court.split('\n').map((l) => `> ${l}`));
    }
    lignes.push('', '### Demande', '', '<!-- Ajout, correction, explication à clarifier, exemple à ajouter… -->', '');

    const params = new URLSearchParams({
        title: `[Suggestion] ${ref.titre}${nomSection ? ` › ${nomSection}` : ''}`,
        body: lignes.join('\n'),
        labels: LABEL,
    });
    return `https://github.com/${DEPOT}/issues/new?${params}`;
}

function texteTitre(h: HTMLElement): string {
    const copie = h.cloneNode(true) as HTMLElement;
    copie.querySelectorAll('.suggestion-section').forEach((el) => el.remove());
    return texteAvecFormules(copie);
}

/** Texte d'un fragment où chaque formule KaTeX est remplacée par sa source `$…$`. */
function texteAvecFormules(racine: ParentNode & Node): string {
    racine.querySelectorAll?.('.katex').forEach((k) => {
        const tex = k.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
        if (tex) k.replaceWith(`$${tex.trim()}$`);
    });
    return (racine.textContent ?? '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

/** Dernier h2 situé avant le nœud (section qui le contient). */
function sectionDe(noeud: Node, titres: HTMLElement[]): HTMLElement | undefined {
    return titres.filter((t) => t.compareDocumentPosition(noeud) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
}

export function initSuggestions(ref: RefSuggestion, contenu: HTMLElement) {
    const titres = [...contenu.querySelectorAll<HTMLElement>('h2[id]')];
    const ouvrir = (cible: Cible) => window.open(urlSuggestion(ref, cible), '_blank', 'noopener');

    /* Bouton général (en-tête du chapitre) */
    document.querySelectorAll<HTMLElement>('[data-bouton-suggestion]').forEach((b) =>
        b.addEventListener('click', () => ouvrir({})),
    );

    /* Un bouton discret au bout de chaque titre de section */
    for (const h of titres) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'suggestion-section no-print';
        b.title = 'Proposer une modification de cette section';
        b.setAttribute('aria-label', `Proposer une modification de la section « ${texteTitre(h)} »`);
        b.innerHTML = ICONE;
        b.addEventListener('click', () => ouvrir({section: h}));
        h.append(b);
    }

    /* Bulle sous une sélection de texte */
    const bulle = document.createElement('button');
    bulle.type = 'button';
    bulle.className = 'suggestion-bulle no-print';
    bulle.hidden = true;
    bulle.innerHTML = `${ICONE}<span>Proposer une modification</span>`;
    document.body.append(bulle);

    let cible: Cible | undefined;

    function placer() {
        const sel = getSelection();
        const range = sel && sel.rangeCount > 0 && !sel.isCollapsed ? sel.getRangeAt(0) : undefined;
        if (!range || !contenu.contains(range.commonAncestorContainer)) {
            bulle.hidden = true;
            cible = undefined;
            return;
        }
        const citation = texteAvecFormules(range.cloneContents());
        if (!citation) {
            bulle.hidden = true;
            return;
        }
        cible = {citation, section: sectionDe(range.startContainer, titres)};
        // Sous la sélection : au-dessus, le menu natif (mobile) la recouvrirait
        const rects = range.getClientRects();
        const fin = rects[rects.length - 1] ?? range.getBoundingClientRect();
        bulle.hidden = false;
        const largeur = bulle.offsetWidth;
        const x = Math.min(Math.max(8, fin.right - largeur / 2), document.documentElement.clientWidth - largeur - 8);
        bulle.style.left = `${x + scrollX}px`;
        bulle.style.top = `${fin.bottom + scrollY + 8}px`;
    }

    let attente = 0;
    document.addEventListener('selectionchange', () => {
        clearTimeout(attente);
        attente = window.setTimeout(placer, 250);
    });
    // Évite que le clic sur la bulle n'efface la sélection avant l'ouverture
    bulle.addEventListener('pointerdown', (e) => e.preventDefault());
    bulle.addEventListener('click', () => {
        if (!cible) return;
        ouvrir(cible);
        getSelection()?.removeAllRanges();
        bulle.hidden = true;
    });
}
