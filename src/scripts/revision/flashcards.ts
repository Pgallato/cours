/**
 * Flashcards : une carte à la fois, retournement, filtre (thème, « à revoir »), mélange.
 * Suivi « su » / « à revoir » par carte dans localStorage (« carnet:<id> »), clé = empreinte du recto.
 */
import {ecrireStockage, lireStockage, melanger} from './outils';

interface DonneeCarte {
    t: string;
    r: string;
    v: string;
    k: string;
}

type Suivi = Record<string, 'su' | 'revoir'>;

export function monterFlashcards() {
    document.querySelectorAll<HTMLElement>('[data-flashcards]:not([data-pret])').forEach(monter);
}

function monter(fc: HTMLElement) {
    fc.dataset.pret = '';
    const cle = `carnet:${fc.dataset.flashcards}`;
    const toutes = JSON.parse(fc.querySelector('.fc-donnees')!.textContent ?? '[]') as DonneeCarte[];
    const $ = <T extends Element>(s: string) => fc.querySelector<T>(s);
    $<HTMLElement>('.fc-corps')!.hidden = false;

    const carte = $<HTMLButtonElement>('.fc-carte')!;
    const recto = $<HTMLElement>('.fc-recto')!;
    const verso = $<HTMLElement>('.fc-verso')!;
    const etat = $<HTMLElement>('.fc-etat')!;
    const theme = $<HTMLSelectElement>('.fc-theme');
    const revoir = $<HTMLInputElement>('.fc-revoir')!;
    const inverse = $<HTMLInputElement>('.fc-inverse')!;

    let suivi = lireStockage<Suivi>(cle, {});
    let ordre = [...toutes];
    let paquet: DonneeCarte[] = [];
    let i = 0;

    function filtrer(garder?: DonneeCarte) {
        paquet = ordre.filter((c) => (!theme?.value || c.t === theme.value) && (!revoir.checked || suivi[c.k] === 'revoir'));
        i = garder ? Math.max(0, paquet.indexOf(garder)) : 0;
        afficher();
    }

    function afficher() {
        carte.classList.remove('est-retournee');
        const c = paquet[i];
        carte.disabled = !c;
        if (!c) {
            recto.innerHTML = revoir.checked ? 'Aucune carte à revoir ici : bravo !' : 'Aucune carte.';
            verso.innerHTML = '';
        } else {
            [recto.innerHTML, verso.innerHTML] = inverse.checked ? [c.v, c.r] : [c.r, c.v];
        }
        carte.dataset.statut = c ? (suivi[c.k] ?? '') : '';
        recto.setAttribute('aria-hidden', 'false');
        verso.setAttribute('aria-hidden', 'true');
        const sues = toutes.filter((x) => suivi[x.k] === 'su').length;
        const aRevoir = toutes.filter((x) => suivi[x.k] === 'revoir').length;
        etat.textContent =
            (c ? `Carte ${i + 1} / ${paquet.length}` : '0 carte') +
            ` · ${sues} sue${sues > 1 ? 's' : ''} · ${aRevoir} à revoir · ${toutes.length - sues - aRevoir} jamais vue${toutes.length - sues - aRevoir > 1 ? 's' : ''}`;
    }

    function retourner() {
        if (!paquet[i]) return;
        const face = carte.classList.toggle('est-retournee');
        recto.setAttribute('aria-hidden', String(face));
        verso.setAttribute('aria-hidden', String(!face));
    }

    const aller = (d: number) => {
        if (!paquet.length) return;
        i = (i + d + paquet.length) % paquet.length;
        afficher();
    };

    function marquer(s: 'su' | 'revoir') {
        const c = paquet[i];
        if (!c) return;
        suivi[c.k] = s;
        ecrireStockage(cle, suivi);
        // en mode « à revoir », une carte sue sort du paquet
        if (revoir.checked && s === 'su') {
            paquet.splice(i, 1);
            if (i >= paquet.length) i = 0;
            afficher();
        } else aller(1);
    }

    carte.addEventListener('click', retourner);
    $('.fc-prec')!.addEventListener('click', () => aller(-1));
    $('.fc-suiv')!.addEventListener('click', () => aller(1));
    $('.fc-oui')!.addEventListener('click', () => marquer('su'));
    $('.fc-non')!.addEventListener('click', () => marquer('revoir'));
    $('.fc-melanger')!.addEventListener('click', () => {
        ordre = melanger(toutes);
        filtrer();
    });
    theme?.addEventListener('change', () => filtrer());
    revoir.addEventListener('change', () => filtrer());
    inverse.addEventListener('change', () => afficher());
    $('.fc-reinit')!.addEventListener('click', () => {
        if (!confirm('Effacer le suivi « su / à revoir » de toutes les cartes de ce paquet ?')) return;
        suivi = {};
        ecrireStockage(cle, suivi);
        filtrer(paquet[i]);
    });
    fc.addEventListener('keydown', (e) => {
        const cible = e.target as HTMLElement;
        if (cible.closest('select, input') || e.ctrlKey || e.metaKey || e.altKey) return;
        // Espace sur un bouton : laisser le clic natif (sinon double retournement)
        if (e.key === ' ' && cible.closest('button')) return;
        const actions: Record<string, () => void> = {
            ArrowLeft: () => aller(-1),
            ArrowRight: () => aller(1),
            '1': () => marquer('revoir'),
            '2': () => marquer('su'),
            ' ': retourner,
        };
        const action = actions[e.key];
        if (!action) return;
        e.preventDefault();
        action();
    });

    filtrer();
}
