/**
 * Quiz : correction immédiate, score, « Refaire mes erreurs », tirage aléatoire (data-nombre)
 * et meilleur score mémorisé dans localStorage (« carnet:quiz:<id> »).
 */
import {ecrireStockage, lireStockage, melanger, normaliser} from './outils';

interface Historique {
    meilleur?: number;
    total?: number;
    date?: number;
}

export function monterQuiz() {
    document.querySelectorAll<HTMLElement>('[data-quiz]:not([data-pret])').forEach(monter);
}

function monter(quiz: HTMLElement) {
    quiz.dataset.pret = '';
    const cle = `carnet:${quiz.dataset.quiz}`;
    const nombre = Number(quiz.dataset.nombre) || 0;
    const liste = quiz.querySelector<HTMLElement>('.quiz-liste')!;
    const questions = [...liste.querySelectorAll<HTMLElement>('.quiz-q')];
    const score = quiz.querySelector<HTMLElement>('.quiz-score')!;
    const btnErreurs = quiz.querySelector<HTMLButtonElement>('.quiz-erreurs')!;
    const btnRecommencer = quiz.querySelector<HTMLButtonElement>('.quiz-recommencer')!;
    const compte = quiz.querySelector<HTMLElement>('.quiz-compte')!;
    const resultats = new Map<HTMLElement, boolean>();

    const visibles = () => questions.filter((q) => !q.hidden);

    function corriger(q: HTMLElement, juste: boolean, choisies: number[] = []) {
        resultats.set(q, juste);
        q.dataset.etat = juste ? 'juste' : 'faux';
        q.querySelectorAll<HTMLButtonElement>('.quiz-option').forEach((o) => {
            o.disabled = true;
            if (o.hasAttribute('data-bonne')) o.classList.add('est-bonne');
            else if (choisies.includes(Number(o.dataset.i))) o.classList.add('est-fausse');
        });
        q.querySelectorAll<HTMLInputElement | HTMLButtonElement>('.quiz-champ, .quiz-valider').forEach((e) => (e.disabled = true));
        const expl = q.querySelector<HTMLElement>('.quiz-expl')!;
        expl.hidden = false;
        expl.querySelector('.quiz-verdict')!.textContent = juste ? '✓ Bonne réponse.' : '✗ Pas tout à fait.';
        q.querySelector<HTMLElement>('.quiz-attendu')?.toggleAttribute('hidden', juste);
        maj();
    }

    function reinitialiser(q: HTMLElement) {
        resultats.delete(q);
        delete q.dataset.etat;
        q.querySelectorAll<HTMLButtonElement>('.quiz-option').forEach((o) => {
            o.disabled = false;
            o.classList.remove('est-bonne', 'est-fausse');
            if (o.hasAttribute('aria-pressed')) o.setAttribute('aria-pressed', 'false');
        });
        q.querySelectorAll<HTMLInputElement | HTMLButtonElement>('.quiz-champ, .quiz-valider').forEach((e) => (e.disabled = false));
        const champ = q.querySelector<HTMLInputElement>('.quiz-champ');
        if (champ) champ.value = '';
        q.querySelector<HTMLElement>('.quiz-expl')!.hidden = true;
        // ordre des propositions renouvelé (au-delà de deux : pas de « vrai / faux » inversé)
        const choix = q.querySelector<HTMLElement>('.quiz-choix');
        if (choix && choix.children.length > 2) choix.append(...melanger([...choix.children]));
    }

    function maj() {
        const vis = visibles();
        const repondues = vis.filter((q) => resultats.has(q));
        const justes = repondues.filter((q) => resultats.get(q)).length;
        const fini = repondues.length === vis.length;
        let texte = `${justes} / ${vis.length} bonne${justes > 1 ? 's' : ''} réponse${justes > 1 ? 's' : ''}`;
        if (!fini) texte += ` · ${vis.length - repondues.length} question(s) restante(s)`;
        else if (justes === vis.length) texte += ' : sans faute !';
        const h = lireStockage<Historique>(cle, {});
        if (fini && vis.length === (nombre || questions.length) && (h.meilleur === undefined || justes > h.meilleur)) {
            ecrireStockage(cle, {meilleur: justes, total: vis.length, date: Date.now()});
        }
        score.textContent = texte;
        btnErreurs.hidden = !(fini && justes < vis.length);
        afficherMeilleur();
    }

    function afficherMeilleur() {
        const h = lireStockage<Historique>(cle, {});
        const base = compte.dataset.base ?? (compte.dataset.base = compte.textContent ?? '');
        compte.textContent = h.meilleur === undefined ? base : `${base} · meilleur score ${h.meilleur} / ${h.total}`;
    }

    function tirer() {
        questions.forEach(reinitialiser);
        if (!nombre) {
            questions.forEach((q) => (q.hidden = false));
        } else {
            const choisies = new Set(melanger(questions).slice(0, nombre));
            questions.forEach((q) => (q.hidden = !choisies.has(q)));
            liste.append(...melanger(questions));
        }
        score.textContent = "Répondez aux questions : la correction s'affiche aussitôt.";
        btnErreurs.hidden = true;
        afficherMeilleur();
    }

    for (const q of questions) {
        const type = q.dataset.type;
        const bonnes = (q.dataset.bonnes ?? '').split(',').filter(Boolean).map(Number);
        const options = [...q.querySelectorAll<HTMLButtonElement>('.quiz-option')];
        if (type === 'qcm') {
            options.forEach((o) => o.addEventListener('click', () => {
                const i = Number(o.dataset.i);
                corriger(q, bonnes.includes(i), [i]);
            }));
        } else if (type === 'multi') {
            options.forEach((o) => o.addEventListener('click', () =>
                o.setAttribute('aria-pressed', String(o.getAttribute('aria-pressed') !== 'true'))));
            q.querySelector('.quiz-valider')!.addEventListener('click', () => {
                const choisies = options.filter((o) => o.getAttribute('aria-pressed') === 'true').map((o) => Number(o.dataset.i));
                const juste = choisies.length === bonnes.length && choisies.every((i) => bonnes.includes(i));
                corriger(q, juste, choisies);
            });
        } else {
            const champ = q.querySelector<HTMLInputElement>('.quiz-champ')!;
            const acceptees = (JSON.parse(q.dataset.saisie ?? '[]') as string[]).map(normaliser);
            const valider = () => {
                if (!champ.value.trim()) return champ.focus();
                corriger(q, acceptees.includes(normaliser(champ.value)));
            };
            q.querySelector('.quiz-valider')!.addEventListener('click', valider);
            champ.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') valider();
            });
        }
    }

    btnRecommencer.addEventListener('click', () => {
        tirer();
        quiz.scrollIntoView({behavior: 'smooth', block: 'start'});
    });
    btnErreurs.addEventListener('click', () => {
        for (const q of visibles()) {
            if (resultats.get(q)) q.hidden = true;
            else reinitialiser(q);
        }
        btnErreurs.hidden = true;
        maj();
        quiz.scrollIntoView({behavior: 'smooth', block: 'start'});
    });

    tirer();
}
