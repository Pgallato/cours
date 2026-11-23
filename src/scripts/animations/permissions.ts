/**
 * Permissions Linux : on coche les droits (r, w, x pour U, G, O + SUID, SGID, sticky bit)
 * et on lit en même temps la notation de `ls -l` et la notation octale de `chmod`.
 * params : { octal?: string, type?: 'fichier' | 'repertoire' }  (ex. octal: '4755')
 */
import {scene, svg, vider} from './outils';
import {zones} from './sequenceur';

type Bit = {nom: string; titre: string; poids: number; groupe: 0 | 1 | 2 | 3};

/** Groupe 0 = permissions spéciales, 1 = U, 2 = G, 3 = O. */
const BITS: Bit[] = [
    {nom: 'SUID', titre: 'Set User ID', poids: 4, groupe: 0},
    {nom: 'SGID', titre: 'Set Group ID', poids: 2, groupe: 0},
    {nom: 'sticky', titre: 'Sticky bit', poids: 1, groupe: 0},
    ...([1, 2, 3] as const).flatMap((g) =>
        (['r', 'w', 'x'] as const).map((d, k) => ({
            nom: d,
            titre: `${['', 'utilisateur', 'groupe', 'autres'][g]} : ${d}`,
            poids: [4, 2, 1][k],
            groupe: g,
        })),
    ),
];

const NOMS_GROUPES = ['spécial', 'U (user)', 'G (group)', 'O (other)'];

function lireOctal(v: unknown): boolean[] {
    const s = String(v ?? '0755').replace(/[^0-7]/g, '').padStart(4, '0').slice(-4);
    const chiffres = s.split('').map(Number);
    return BITS.map((b) => (chiffres[b.groupe] & b.poids) !== 0);
}

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const L = 560;
    const H = 168;
    const s = scene(el, {L, H, m: {g: 0, d: 0, h: 0, b: 0}}, 'Permissions d’un fichier : notation ls et notation octale');
    const {controles, lecture} = zones(el);
    const calque = svg('g', {}, s);
    const etat = lireOctal(params.octal);
    const typeCar = params.type === 'repertoire' ? 'd' : '-';

    const boutons: HTMLButtonElement[] = [];
    for (let g = 0; g < 4; g++) {
        const bloc = document.createElement('div');
        bloc.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:0.3rem';
        const t = document.createElement('span');
        t.textContent = NOMS_GROUPES[g];
        t.style.cssText = 'font-size:0.8rem;color:var(--ink-2);min-width:4.6rem';
        bloc.appendChild(t);
        BITS.forEach((b, i) => {
            if (b.groupe !== g) return;
            const bt = document.createElement('button');
            bt.type = 'button';
            bt.className = 'bouton';
            bt.textContent = b.nom;
            bt.title = b.titre;
            bt.setAttribute('aria-label', `${b.titre}`);
            bt.style.cssText = 'font-family:var(--font-mono);font-size:0.8rem;padding:0.25rem 0.55rem;min-width:2.2rem';
            bt.addEventListener('click', () => {
                etat[i] = !etat[i];
                dessiner();
            });
            boutons[i] = bt;
            bloc.appendChild(bt);
        });
        controles.appendChild(bloc);
    }

    /** Caractère affiché par ls pour la position k (0..8) de r w x r w x r w x. */
    function caractere(k: number): string {
        const g = Math.floor(k / 3) + 1;
        const d = k % 3;
        const actif = etat[3 + k];
        if (d < 2) return actif ? 'rw'[d] : '-';
        const special = etat[g - 1]; // SUID pour U, SGID pour G, sticky pour O
        if (!special) return actif ? 'x' : '-';
        const lettre = g === 3 ? 't' : 's';
        return actif ? lettre : lettre.toUpperCase();
    }

    function chiffre(g: number): number {
        return BITS.reduce((acc, b, i) => acc + (b.groupe === g && etat[i] ? b.poids : 0), 0);
    }

    function dessiner() {
        vider(calque);
        boutons.forEach((b, i) => b.setAttribute('aria-pressed', String(etat[i])));

        // Ligne 1 : notation ls (type + 9 caractères)
        const lc = 38;
        const x0 = 60;
        const xCase = (k: number) => x0 + k * lc + (k > 0 ? 10 * Math.floor((k - 1) / 3) : 0);
        svg('text', {x: x0 - 10, y: 36, 'text-anchor': 'end', style: 'font-weight:600;fill:var(--ink-2)'}, calque).textContent = 'ls';
        const cars = [typeCar, ...Array.from({length: 9}, (_, k) => caractere(k))];
        cars.forEach((c, k) => {
            const x = xCase(k);
            const majuscule = c === 'S' || c === 'T';
            svg('rect', {x, y: 14, width: lc - 4, height: 32, rx: 4, fill: c === '-' ? 'var(--paper)' : 'var(--accent-soft)', stroke: 'currentColor', 'stroke-opacity': 0.3}, calque);
            svg('text', {x: x + (lc - 4) / 2, y: 36, 'text-anchor': 'middle', style: `font-family:var(--font-mono);font-weight:600;font-size:16px;fill:${majuscule ? 'var(--margin)' : c === '-' ? 'var(--ink-3)' : 'var(--accent-ink)'}`}, calque).textContent = c;
        });
        // Accolades U / G / O
        ['U', 'G', 'O'].forEach((n, g) => {
            const xa = xCase(1 + 3 * g);
            const xb = xCase(3 + 3 * g) + lc - 4;
            svg('path', {d: `M${xa} 52 v6 H${xb} v-6`, fill: 'none', stroke: 'var(--line-strong)'}, calque);
            svg('text', {x: (xa + xb) / 2, y: 72, 'text-anchor': 'middle', style: 'font-size:12px;fill:var(--ink-2)'}, calque).textContent = n;
        });

        // Ligne 2 : notation octale (4 chiffres)
        svg('text', {x: x0 - 10, y: 122, 'text-anchor': 'end', style: 'font-weight:600;fill:var(--ink-2)'}, calque).textContent = 'octal';
        const larg = 3 * lc - 4;
        const xOct = [x0 - 2, xCase(1), xCase(4), xCase(7)];
        [0, 1, 2, 3].forEach((g) => {
            const x = g === 0 ? x0 : xOct[g];
            const w = g === 0 ? lc - 4 : larg;
            svg('rect', {x, y: 98, width: w, height: 34, rx: 4, fill: 'var(--paper-2)', stroke: g === 0 ? 'var(--line-strong)' : 'var(--accent)'}, calque);
            svg('text', {x: x + w / 2, y: 121, 'text-anchor': 'middle', style: 'font-family:var(--font-mono);font-weight:700;font-size:17px;fill:var(--accent-ink)'}, calque).textContent = String(chiffre(g));
            const detail =
                g === 0
                    ? 'spécial'
                    : BITS.filter((b) => b.groupe === g)
                          .map((b) => (etat[BITS.indexOf(b)] ? String(b.poids) : '0'))
                          .join(' + ');
            svg('text', {x: x + w / 2, y: 150, 'text-anchor': 'middle', style: 'font-size:11px;fill:var(--ink-3)'}, calque).textContent = detail;
        });

        const octal = [0, 1, 2, 3].map(chiffre).join('');
        const ls = cars.join('');
        lecture.innerHTML = '';
        const st = (t: string) => {
            const e = document.createElement('strong');
            e.textContent = t;
            return e;
        };
        const notes: string[] = [];
        if (cars.some((c) => c === 'S' || c === 'T')) notes.push('Une majuscule (S ou T) signale une permission spéciale posée sans le droit x correspondant.');
        if (etat[0] || etat[1]) notes.push('SUID/SGID : le processus prend les droits du propriétaire ou du groupe ; à limiter.');
        if (etat[2]) notes.push('Sticky bit : seul le propriétaire d’un fichier peut le supprimer (ex. /tmp).');
        lecture.append('chmod ', st(octal), ' ⇔ ', st(ls), '. ', notes.join(' '));
    }

    dessiner();
}
