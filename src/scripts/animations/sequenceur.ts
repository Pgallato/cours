/**
 * Lecteur « pas à pas » commun aux animations de protocoles (échanges, encapsulation,
 * traceroute, DNS…). Fournit les boutons |◀ ◀ ▶/❚❚ ▶| et l'avancement animé de chaque étape.
 *
 *   dessiner(i, t) : état après l'étape i (0 = état initial), t ∈ [0, 1] = avancement de l'étape i.
 *   decrire(i)     : texte lu (aria-live) pour l'étape i.
 *
 * L'animation démarre sur l'état final (schéma complet, utile à l'impression et sans clic),
 * « Lire » repart du début. Avec prefers-reduced-motion, les étapes s'affichent sans mouvement.
 */
import {svg} from './outils';

export interface Lecteur {
    aller: (i: number) => void;
    etape: () => number;
    /** À appeler quand les données changent (ex. changement de mode) : arrête et redessine. */
    rafraichir: (i?: number) => void;
}

const STYLE_BOUTON =
    'font:inherit;font-size:0.85rem;line-height:1.2;padding:0.35rem 0.7rem;border:1px solid var(--line-strong);' +
    'border-radius:0.5rem;background:var(--paper-2);color:var(--ink);cursor:pointer;min-width:2.5rem';

export function bouton(parent: HTMLElement, texte: string, titre: string, action: () => void) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = texte;
    b.title = titre;
    b.setAttribute('aria-label', titre);
    b.style.cssText = STYLE_BOUTON;
    b.addEventListener('click', action);
    parent.appendChild(b);
    return b;
}

/** Crée la zone de contrôles et la ligne de lecture sous la scène. */
export function zones(el: HTMLElement) {
    const controles = document.createElement('div');
    controles.className = 'anim-controles';
    const lecture = document.createElement('p');
    lecture.className = 'anim-lecture';
    lecture.setAttribute('aria-live', 'polite');
    el.append(controles, lecture);
    return {controles, lecture};
}

export function sequenceur(
    controles: HTMLElement,
    lecture: HTMLElement,
    o: {
        nb: () => number;
        dessiner: (i: number, t: number) => void;
        decrire: (i: number) => string;
        duree?: number;
        depart?: 'debut' | 'fin';
    },
): Lecteur {
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const duree = o.duree ?? 1100;
    let i = o.depart === 'debut' ? 0 : o.nb();
    let enLecture = false;
    let rafId = 0;
    let minuteur = 0;

    const groupe = document.createElement('div');
    groupe.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem';
    controles.appendChild(groupe);

    const bDebut = bouton(groupe, '|◀', 'Revenir au début', () => {
        arreter();
        afficher(0);
    });
    const bPrec = bouton(groupe, '◀', 'Étape précédente', () => {
        arreter();
        afficher(Math.max(0, i - 1));
    });
    const bLire = bouton(groupe, '▶ Lire', 'Lire l’animation', () => (enLecture ? arreter() : lire()));
    const bSuiv = bouton(groupe, '▶|', 'Étape suivante', () => {
        arreter();
        if (i < o.nb()) animerEtape(i + 1, false);
    });
    const compteur = document.createElement('span');
    compteur.style.cssText = 'font-family:var(--font-mono);font-size:0.8rem;color:var(--ink-3);margin-left:0.3rem';
    groupe.appendChild(compteur);
    bDebut.style.minWidth = bPrec.style.minWidth = bSuiv.style.minWidth = '2.5rem';

    function majBoutons() {
        const n = o.nb();
        compteur.textContent = `${i} / ${n}`;
        bLire.textContent = enLecture ? '❚❚ Pause' : '▶ Lire';
        bLire.setAttribute('aria-label', enLecture ? 'Mettre en pause' : 'Lire l’animation');
        bPrec.disabled = i === 0;
        bSuiv.disabled = i >= n;
        for (const b of [bPrec, bSuiv]) b.style.opacity = b.disabled ? '0.45' : '1';
    }

    function afficher(k: number, t = 1) {
        i = k;
        o.dessiner(i, t);
        if (t === 1) lecture.textContent = o.decrire(i);
        majBoutons();
    }

    function animerEtape(k: number, enchainer: boolean) {
        i = k;
        lecture.textContent = o.decrire(k);
        majBoutons();
        if (reduit) {
            o.dessiner(k, 1);
            if (enchainer) minuteur = window.setTimeout(suite, 1400);
            return;
        }
        const t0 = performance.now();
        const pas = (now: number) => {
            const t = Math.min(1, (now - t0) / duree);
            o.dessiner(k, t);
            if (t < 1) rafId = requestAnimationFrame(pas);
            else if (enchainer) minuteur = window.setTimeout(suite, 650);
        };
        rafId = requestAnimationFrame(pas);
    }

    function suite() {
        if (!enLecture) return;
        if (i < o.nb()) animerEtape(i + 1, true);
        else {
            enLecture = false;
            majBoutons();
        }
    }

    function lire() {
        enLecture = true;
        if (i >= o.nb()) {
            afficher(0);
            enLecture = true;
            majBoutons();
            minuteur = window.setTimeout(suite, 400);
        } else animerEtape(i + 1, true);
    }

    function arreter() {
        enLecture = false;
        cancelAnimationFrame(rafId);
        clearTimeout(minuteur);
        majBoutons();
    }

    afficher(i);

    return {
        aller: (k) => {
            arreter();
            afficher(Math.max(0, Math.min(o.nb(), k)));
        },
        etape: () => i,
        rafraichir: (k) => {
            arreter();
            afficher(Math.max(0, Math.min(o.nb(), k ?? i)));
        },
    };
}

/** Interpolation linéaire entre deux points. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Courbe d'accélération douce pour les déplacements. */
export const doux = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Segment fléché (pointe dessinée en polygone : pas de <marker> à identifiant unique à gérer). */
export function fleche(
    g: SVGElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    couleur: string,
    o: {epaisseur?: number; pointe?: boolean; pointilles?: boolean} = {},
) {
    svg('line', {
        x1, y1, x2, y2,
        stroke: couleur,
        'stroke-width': o.epaisseur ?? 1.4,
        ...(o.pointilles ? {'stroke-dasharray': '3 3'} : {}),
    }, g);
    if (o.pointe === false) return;
    const a = Math.atan2(y2 - y1, x2 - x1);
    const L = 8;
    const l = 3.8;
    const p = (dx: number, dy: number) =>
        `${x2 + dx * Math.cos(a) - dy * Math.sin(a)},${y2 + dx * Math.sin(a) + dy * Math.cos(a)}`;
    svg('polygon', {points: `${p(0, 0)} ${p(-L, l)} ${p(-L, -l)}`, fill: couleur}, g);
}

/** Boîte avec texte centré (participant, champ de trame…). */
export function boite(
    g: SVGElement,
    x: number,
    y: number,
    l: number,
    h: number,
    texte: string,
    o: {fond?: string; trait?: string; couleurTexte?: string; gras?: boolean; mono?: boolean; taille?: number} = {},
) {
    svg('rect', {
        x, y, width: l, height: h, rx: 4,
        fill: o.fond ?? 'var(--paper-2)',
        stroke: o.trait ?? 'currentColor',
        'stroke-opacity': o.trait ? 1 : 0.55,
    }, g);
    const t = svg('text', {
        x: x + l / 2,
        y: y + h / 2 + 4,
        'text-anchor': 'middle',
        style: `fill:${o.couleurTexte ?? 'var(--ink)'};${o.gras ? 'font-weight:600;' : ''}${o.mono ? 'font-family:var(--font-mono);' : ''}${o.taille ? `font-size:${o.taille}px;` : ''}`,
    }, g);
    t.textContent = texte;
    return t;
}
