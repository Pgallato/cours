/**
 * Suivi personnel, stocké uniquement dans le navigateur (localStorage), sans compte.
 *  - vus      : chapitres marqués comme « vu »
 *  - favoris  : chapitres mis en favori (avec titre pour l'affichage)
 *  - positions: dernier chapitre ouvert, par cours et globalement
 */

const CLE = 'carnet:suivi:v1';

export interface RefChapitre {
    cle: string; // « <cours>/<chapitre> »
    url: string;
    titre: string;
    coursId: string;
    coursTitre: string;
}

interface Etat {
    vus: Record<string, number>;
    favoris: Record<string, RefChapitre & { ajoute: number }>;
    positions: Record<string, RefChapitre & { date: number; section?: string }>;
    derniere?: RefChapitre & { date: number; section?: string };
}

const vide = (): Etat => ({vus: {}, favoris: {}, positions: {}});

export function lire(): Etat {
    try {
        const brut = localStorage.getItem(CLE);
        if (!brut) return vide();
        return {...vide(), ...JSON.parse(brut)} as Etat;
    } catch {
        return vide();
    }
}

function ecrire(etat: Etat) {
    try {
        localStorage.setItem(CLE, JSON.stringify(etat));
    } catch {
        /* navigation privée / stockage plein : on ignore */
    }
    document.dispatchEvent(new CustomEvent('suivi:change'));
}

export const estVu = (cle: string) => cle in lire().vus;
export const estFavori = (cle: string) => cle in lire().favoris;

export function definirVu(cle: string, vu: boolean) {
    const e = lire();
    if (vu) e.vus[cle] = Date.now();
    else delete e.vus[cle];
    ecrire(e);
}

export function basculerFavori(ref: RefChapitre): boolean {
    const e = lire();
    const actif = !(ref.cle in e.favoris);
    if (actif) e.favoris[ref.cle] = {...ref, ajoute: Date.now()};
    else delete e.favoris[ref.cle];
    ecrire(e);
    return actif;
}

/** Mémorise le chapitre (et la section) en cours de lecture. */
export function enregistrerPosition(ref: RefChapitre, section?: string) {
    const e = lire();
    const date = Date.now();
    e.positions[ref.coursId] = {...ref, date, section};
    e.derniere = {...ref, date, section};
    ecrire(e);
}

export function positionCours(coursId: string) {
    return lire().positions[coursId];
}

export function compterVus(cles: string[]): number {
    const vus = lire().vus;
    return cles.filter((c) => c in vus).length;
}

export function toutEffacer() {
    try {
        localStorage.removeItem(CLE);
    } catch {
        /* ignore */
    }
    document.dispatchEvent(new CustomEvent('suivi:change'));
}

/** URL de reprise : chapitre + ancre de la dernière section lue. */
export const urlReprise = (p: { url: string; section?: string }) => (p.section ? `${p.url}#${p.section}` : p.url);
