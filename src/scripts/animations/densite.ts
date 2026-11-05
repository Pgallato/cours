/**
 * Densité d'une variable aléatoire continue : aire sous la courbe = probabilité.
 * P(c ≤ X ≤ d) = F(d) − F(c), visualisée comme une aire colorée.
 * params : { loi?: 'normale' | 'exponentielle' | 'uniforme' | 'toutes', c?: number, d?: number }
 */
import {curseur, echelle, fr, phi, scene, svg, vider, type Cadre, type Curseur} from './outils';

type NomLoi = 'normale' | 'exponentielle' | 'uniforme';

interface Loi {
    nom: string;
    domaine: [number, number];
    params: { cle: string; label: string; min: number; max: number; pas: number; valeur: number }[];
    f: (x: number, q: Record<string, number>) => number;
    F: (x: number, q: Record<string, number>) => number;
    notation: (q: Record<string, number>) => string;
}

const LOIS: Record<NomLoi, Loi> = {
    normale: {
        nom: 'Loi normale',
        domaine: [-6, 6],
        params: [
            {cle: 'mu', label: 'μ', min: -3, max: 3, pas: 0.1, valeur: 0},
            {cle: 'sigma', label: 'σ', min: 0.3, max: 3, pas: 0.1, valeur: 1},
        ],
        f: (x, {mu, sigma}) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI)),
        F: (x, {mu, sigma}) => phi((x - mu) / sigma),
        notation: ({mu, sigma}) => `X ~ N(${fr(mu, 1)} ; ${fr(sigma, 1)})`,
    },
    exponentielle: {
        nom: 'Loi exponentielle',
        domaine: [-0.5, 6],
        params: [{cle: 'lambda', label: 'λ', min: 0.2, max: 3, pas: 0.1, valeur: 1}],
        f: (x, {lambda}) => (x < 0 ? 0 : lambda * Math.exp(-lambda * x)),
        F: (x, {lambda}) => (x < 0 ? 0 : 1 - Math.exp(-lambda * x)),
        notation: ({lambda}) => `X ~ E(${fr(lambda, 1)})`,
    },
    uniforme: {
        nom: 'Loi uniforme',
        domaine: [-1, 7],
        params: [
            {cle: 'a', label: 'a', min: -1, max: 3, pas: 0.5, valeur: 0},
            {cle: 'b', label: 'b', min: 3.5, max: 7, pas: 0.5, valeur: 5},
        ],
        f: (x, {a, b}) => (x >= a && x <= b ? 1 / (b - a) : 0),
        F: (x, {a, b}) => (x < a ? 0 : x > b ? 1 : (x - a) / (b - a)),
        notation: ({a, b}) => `X ~ U(${fr(a, 1)} ; ${fr(b, 1)})`,
    },
};

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const demande = (params.loi as string) ?? 'normale';
    const choixPossibles: NomLoi[] = demande === 'toutes' ? ['normale', 'exponentielle', 'uniforme'] : [demande as NomLoi];

    const c: Cadre = {L: 560, H: 260, m: {g: 34, d: 34, h: 18, b: 30}};
    const s = scene(el, c, 'Densité de probabilité et aire sous la courbe');
    const selecteur = document.createElement('div');
    const controles = document.createElement('div');
    controles.className = 'anim-controles';
    const lecture = document.createElement('p');
    lecture.className = 'anim-lecture';
    lecture.setAttribute('aria-live', 'polite');
    el.append(selecteur, controles, lecture);
    const calque = svg('g', {}, s);

    let loi: Loi;
    let curseursLoi: Record<string, Curseur> = {};
    let cc: Curseur;
    let cd: Curseur;
    let voirF: HTMLInputElement;

    if (choixPossibles.length > 1) {
        selecteur.className = 'mb-2 flex flex-wrap gap-2';
        selecteur.setAttribute('role', 'group');
        selecteur.setAttribute('aria-label', 'Choix de la loi');
        for (const nom of choixPossibles) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'bouton !py-1 !text-sm';
            b.textContent = LOIS[nom].nom;
            b.addEventListener('click', () => installer(nom));
            b.dataset.loi = nom;
            selecteur.appendChild(b);
        }
    }

    function installer(nom: NomLoi) {
        loi = LOIS[nom];
        selecteur.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.loi === nom)));
        controles.replaceChildren();
        curseursLoi = {};
        for (const p of loi.params) {
            curseursLoi[p.cle] = curseur(controles, {...p, format: (v) => fr(v, 1)}, dessiner);
        }
        const [d0, d1] = loi.domaine;
        const cDefaut = (params.c as number) ?? (nom === 'exponentielle' ? 0.5 : nom === 'uniforme' ? 1 : -1);
        const dDefaut = (params.d as number) ?? (nom === 'exponentielle' ? 2 : nom === 'uniforme' ? 3 : 1);
        cc = curseur(controles, {
            label: 'c',
            min: d0,
            max: d1,
            pas: 0.1,
            valeur: cDefaut,
            format: (v) => fr(v, 1)
        }, dessiner);
        cd = curseur(controles, {
            label: 'd',
            min: d0,
            max: d1,
            pas: 0.1,
            valeur: dDefaut,
            format: (v) => fr(v, 1)
        }, dessiner);
        const lab = document.createElement('label');
        lab.style.cssText = 'display:flex;align-items:center;gap:.4rem;flex:0 0 auto;min-width:0';
        lab.innerHTML = '<input type="checkbox"> Afficher F';
        voirF = lab.querySelector('input')!;
        voirF.addEventListener('change', dessiner);
        controles.appendChild(lab);
        dessiner();
    }

    function dessiner() {
        vider(calque);
        const q: Record<string, number> = {};
        for (const [k, cur] of Object.entries(curseursLoi)) q[k] = cur.valeur();
        let a = cc.valeur();
        let b = cd.valeur();
        if (a > b) [a, b] = [b, a];

        const [d0, d1] = loi.domaine;
        const N = 240;
        const xsN = Array.from({length: N + 1}, (_, i) => d0 + ((d1 - d0) * i) / N);
        const fs = xsN.map((x) => loi.f(x, q));
        const yMax = Math.max(...fs, 0.05) * 1.12;
        const X = echelle(d0, d1, c.m.g, c.L - c.m.d);
        const Y = echelle(0, yMax, c.H - c.m.b, c.m.h);
        const YF = echelle(0, 1, c.H - c.m.b, c.m.h);

        // axes + graduations entières
        const y0 = Y(0);
        svg('line', {x1: c.m.g, x2: c.L - c.m.d, y1: y0, y2: y0, stroke: 'var(--line-strong)'}, calque);
        for (let t = Math.ceil(d0); t <= d1; t++) {
            svg('line', {x1: X(t), x2: X(t), y1: y0, y2: y0 + 4, stroke: 'var(--line-strong)'}, calque);
            svg('text', {x: X(t), y: y0 + 16, 'text-anchor': 'middle'}, calque).textContent = String(t);
        }
        if (d0 < 0) svg('line', {x1: X(0), x2: X(0), y1: c.m.h, y2: y0, stroke: 'var(--line-strong)'}, calque);

        // aire P(a ≤ X ≤ b)
        let aire = `M ${X(a)} ${y0}`;
        const pas = (b - a) / 120;
        for (let i = 0; i <= 120; i++) {
            const x = a + i * pas;
            aire += ` L ${X(x)} ${Y(loi.f(x, q))}`;
        }
        aire += ` L ${X(b)} ${y0} Z`;
        svg('path', {d: aire, fill: 'var(--accent)', opacity: 0.28}, calque);

        // courbe de densité (segments verticaux évités pour la loi uniforme : tracé point par point)
        let d = '';
        xsN.forEach((x, i) => (d += `${i ? 'L' : 'M'} ${X(x)} ${Y(fs[i])} `));
        svg('path', {
            d,
            fill: 'none',
            stroke: 'var(--accent)',
            'stroke-width': 2.2,
            'stroke-linejoin': 'round'
        }, calque);

        if (voirF.checked) {
            let dF = '';
            xsN.forEach((x, i) => (dF += `${i ? 'L' : 'M'} ${X(x)} ${YF(loi.F(x, q))} `));
            svg('path', {
                d: dF,
                fill: 'none',
                stroke: 'var(--ink-2)',
                'stroke-width': 1.5,
                'stroke-dasharray': '5 4'
            }, calque);
            svg('text', {x: c.L - c.m.d + 4, y: YF(1) + 4}, calque).textContent = '1';
            svg('line', {
                x1: c.m.g,
                x2: c.L - c.m.d,
                y1: YF(1),
                y2: YF(1),
                stroke: 'var(--line)',
                'stroke-dasharray': '2 4'
            }, calque);
        }

        for (const [v, nom] of [
            [a, 'c'],
            [b, 'd'],
        ] as const) {
            svg('line', {
                x1: X(v),
                x2: X(v),
                y1: c.m.h,
                y2: y0,
                stroke: 'var(--ink-3)',
                'stroke-dasharray': '3 3'
            }, calque);
            svg('text', {x: X(v), y: c.m.h + 2, 'text-anchor': 'middle'}, calque).textContent = nom;
        }

        const p = loi.F(b, q) - loi.F(a, q);
        lecture.innerHTML =
            `${loi.notation(q)} : P(${fr(a, 1)} ≤ X ≤ ${fr(b, 1)}) = F(${fr(b, 1)}) − F(${fr(a, 1)}) = <strong>${fr(p, 4)}</strong>` +
            ` <span style="opacity:.75">— l'aire colorée sous la courbe.</span>`;
    }

    installer(choixPossibles[0]);
}
