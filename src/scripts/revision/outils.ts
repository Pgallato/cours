/** Outils partagés des composants de révision : mélange et stockage local (sans compte). */

export function melanger<T>(t: T[]): T[] {
    const r = [...t];
    for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
}

export function lireStockage<T>(cle: string, defaut: T): T {
    try {
        const brut = localStorage.getItem(cle);
        return brut ? {...defaut, ...JSON.parse(brut)} : defaut;
    } catch {
        return defaut;
    }
}

export function ecrireStockage(cle: string, valeur: unknown) {
    try {
        localStorage.setItem(cle, JSON.stringify(valeur));
    } catch {
        /* navigation privée / stockage plein : on ignore */
    }
}

/** Casse, accents, espaces et ponctuation finale ignorés (réponses saisies). */
export const normaliser = (s: string) =>
    s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[.;]+$/, '');
