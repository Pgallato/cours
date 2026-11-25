/**
 * Types et outils des composants de révision (Quiz, Flashcards, Ordonner, Checklist).
 * Les données vivent dans le dossier du cours (ex. src/content/cours/reseaux/revision/donnees.ts)
 * et sont passées en props depuis le MDX.
 */

export interface Question {
    /** Thème (sert au filtrage, ex. « ipv4 »). */
    theme?: string;
    /** Énoncé. Balisage court accepté : `code`, **gras**. */
    q: string;
    /** QCM : propositions ; mélangées à l'affichage si plus de deux. */
    choix?: string[];
    /** QCM : indice (ou indices, s'il y a plusieurs bonnes réponses) des bonnes propositions. */
    bonne?: number | number[];
    /** Question à saisir : réponses acceptées (casse, espaces et accents ignorés). */
    saisie?: string[];
    /** Explication affichée après la réponse. */
    explication: string;
}

export interface Carte {
    theme?: string;
    recto: string;
    verso: string;
}

export interface ElementChecklist {
    texte: string;
    /** Lien vers la fiche ou le chapitre correspondant. */
    lien?: string;
}

const ECHAPPE: Record<string, string> = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'};

/** Texte court → HTML sûr : échappe, puis `code` et **gras**. */
export function enLigne(texte: string): string {
    return texte
        .replace(/[&<>"]/g, (c) => ECHAPPE[c])
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

/** Identifiant stable (clé localStorage) à partir d'un texte. */
export function empreinte(texte: string): string {
    let h = 5381;
    for (let i = 0; i < texte.length; i++) h = ((h << 5) + h + texte.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}
