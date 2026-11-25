import {getCollection, type CollectionEntry} from 'astro:content';

export type Cours = CollectionEntry<'cours'>;
export type ChapitreEntry = CollectionEntry<'chapitres'>;

export interface Chapitre {
    entry: ChapitreEntry;
    coursId: string;
    /** Segment d'URL : nom de fichier sans le préfixe « NN- ». */
    slug: string;
    /** Clé stable pour le suivi local : « <cours>/<slug> ». */
    cle: string;
    ordre: number;
    titre: string;
    resume: string;
    duree: number;
    tags: string[];
    url: string;
}

export interface CoursComplet {
    entry: Cours;
    id: string;
    titre: string;
    matiere: string;
    semestre: string;
    description: string;
    teinte: number;
    url: string;
    chapitres: Chapitre[];
    dureeTotale: number;
}

/** Teinte déterministe à partir d'un texte (matière) — les nouveaux cours ont une couleur sans configuration. */
export function teinteDepuis(texte: string): number {
    const connues: Record<string, number> = {
        mathematiques: 262,
        maths: 262,
        probabilites: 262,
        physique: 28,
        informatique: 155,
        chimie: 330,
        electronique: 200,
        mecanique: 55,
    };
    const cle = normaliser(texte);
    if (cle in connues) return connues[cle];
    let h = 0;
    for (const c of cle) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
}

export function normaliser(texte: string): string {
    return texte
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function estimerDuree(corps: string | undefined): number {
    if (!corps) return 5;
    const mots = corps.replace(/\$[^$]*\$/g, ' formule ').split(/\s+/).filter(Boolean).length;
    // ~150 mots/min pour un texte scientifique dense
    return Math.max(3, Math.round(mots / 150));
}

let cache: CoursComplet[] | undefined;

export async function tousLesCours(): Promise<CoursComplet[]> {
    if (cache) return cache;
    const [coursEntries, chapEntries] = await Promise.all([
        getCollection('cours', (c) => !c.data.brouillon),
        getCollection('chapitres'),
    ]);

    const resultat = coursEntries.map((c): CoursComplet => {
        const url = `/cours/${c.id}/`;
        const chapitres = chapEntries
            .filter((ch) => ch.id.startsWith(`${c.id}/`))
            .map((ch): Chapitre => {
                const fichier = ch.id.split('/')[1];
                const prefixe = Number.parseInt(fichier, 10);
                const slug = fichier.replace(/^\d+[-_]/, '');
                return {
                    entry: ch,
                    coursId: c.id,
                    slug,
                    cle: `${c.id}/${slug}`,
                    ordre: ch.data.ordre ?? (Number.isNaN(prefixe) ? 999 : prefixe),
                    titre: ch.data.titre,
                    resume: ch.data.resume,
                    duree: ch.data.duree ?? estimerDuree(ch.body),
                    tags: ch.data.tags,
                    url: `${url}${slug}/`,
                };
            })
            .sort((a, b) => a.ordre - b.ordre || a.slug.localeCompare(b.slug));

        return {
            entry: c,
            id: c.id,
            titre: c.data.titre,
            matiere: c.data.matiere,
            semestre: c.data.semestre,
            description: c.data.description,
            teinte: c.data.teinte ?? teinteDepuis(c.data.matiere),
            url,
            chapitres,
            dureeTotale: chapitres.reduce((s, ch) => s + ch.duree, 0),
        };
    });

    cache = resultat.sort(
        (a, b) => a.semestre.localeCompare(b.semestre, 'fr') || a.titre.localeCompare(b.titre, 'fr'),
    );
    return cache;
}
