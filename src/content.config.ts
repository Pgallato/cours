import {defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';
import {z} from 'astro/zod';

/**
 * Un cours = un dossier dans src/content/cours/<cours>/
 *   - _cours.json            → métadonnées du cours (collection « cours »)
 *   - NN-titre-chapitre.mdx  → un chapitre par fichier (collection « chapitres »)
 * Rien d'autre à déclarer : pages, catalogue, navigation et recherche se génèrent seuls.
 */

const cours = defineCollection({
    loader: glob({
        pattern: '*/_cours.json',
        base: './src/content/cours',
        // id = nom du dossier (ex. « probabilites »)
        generateId: ({entry}) => entry.split('/')[0],
    }),
    schema: z.object({
        titre: z.string(),
        matiere: z.string(),
        semestre: z.string(),
        description: z.string(),
        enseignant: z.string().optional(),
        annee: z.string().optional(),
        /** Teinte OKLCH (0–360) de l'accent du cours ; calculée depuis la matière si absente. */
        teinte: z.number().min(0).max(360).optional(),
        /** Brouillon : le cours n'apparaît pas dans le catalogue. */
        brouillon: z.boolean().default(false),
    }),
});

const chapitres = defineCollection({
    loader: glob({
        pattern: '*/[0-9]*.mdx',
        base: './src/content/cours',
        // id = « <cours>/<fichier sans extension> » (ex. « probabilites/01-variables-aleatoires-discretes »)
        generateId: ({entry}) => entry.replace(/\.mdx$/, ''),
    }),
    schema: z.object({
        titre: z.string(),
        /** Ordre dans le cours ; par défaut le préfixe numérique du fichier. */
        ordre: z.number().int().optional(),
        resume: z.string(),
        /** Durée de lecture estimée en minutes ; calculée si absente. */
        duree: z.number().int().positive().optional(),
        tags: z.array(z.string()).default([]),
        /** Hérités du cours si absents. */
        matiere: z.string().optional(),
        semestre: z.string().optional(),
        /**
         * Provenance du contenu (traçabilité) : numéro de page des notes photographiées,
         * ou référence libre pour un autre document (« cours.pdf p. 4 », « slides.pptx #12 »).
         */
        sources: z.array(z.union([z.number().int(), z.string()])).default([]),
    }),
});

export const collections = {cours, chapitres};
