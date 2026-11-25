/** « Remettre dans l'ordre » : mélange initial, déplacement ↑ ↓, vérification position par position. */
import {melanger} from './outils';

export function monterOrdonner() {
    document.querySelectorAll<HTMLElement>('[data-ordonner]:not([data-pret])').forEach(monter);
}

function monter(bloc: HTMLElement) {
    bloc.dataset.pret = '';
    const liste = bloc.querySelector<HTMLOListElement>('.ordo-liste')!;
    const items = () => [...liste.querySelectorAll<HTMLLIElement>('.ordo-item')];
    const message = bloc.querySelector<HTMLElement>('.quiz-score')!;

    const effacer = () => {
        items().forEach((li) => delete li.dataset.etat);
        message.textContent = '';
    };

    function brasser() {
        const n = items().length;
        let ordre = items();
        // jamais l'ordre exact de départ
        for (let essai = 0; essai < 10 && ordre.every((li, k) => Number(li.dataset.rang) === k); essai++) ordre = melanger(ordre);
        if (n > 1 && ordre.every((li, k) => Number(li.dataset.rang) === k)) ordre.reverse();
        liste.append(...ordre);
        effacer();
    }

    liste.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.ordo-fleche');
        if (!b) return;
        const li = b.closest<HTMLLIElement>('.ordo-item')!;
        if (b.dataset.sens === '-1' && li.previousElementSibling) liste.insertBefore(li, li.previousElementSibling);
        else if (b.dataset.sens === '1' && li.nextElementSibling) liste.insertBefore(li.nextElementSibling, li);
        effacer();
        b.focus();
    });

    bloc.querySelector('.ordo-verifier')!.addEventListener('click', () => {
        const l = items();
        let justes = 0;
        l.forEach((li, k) => {
            const ok = Number(li.dataset.rang) === k;
            li.dataset.etat = ok ? 'juste' : 'faux';
            if (ok) justes++;
        });
        message.textContent =
            justes === l.length ? '✓ Tout est dans le bon ordre !' : `${justes} / ${l.length} étape(s) à la bonne place.`;
    });
    bloc.querySelector('.ordo-solution')!.addEventListener('click', () => {
        liste.append(...items().sort((a, b) => Number(a.dataset.rang) - Number(b.dataset.rang)));
        items().forEach((li) => (li.dataset.etat = 'juste'));
        message.textContent = 'Voici le bon ordre.';
    });
    bloc.querySelector('.ordo-melanger')!.addEventListener('click', brasser);

    brasser();
}
