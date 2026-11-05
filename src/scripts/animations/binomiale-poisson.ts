/**
 * Loi binomiale B(n, p) comparée à la loi de Poisson P(np).
 * Montre quand l'approximation est valable (n ≥ 30, p ≤ 0,1, np ≤ 15).
 * params : { n?: number, p?: number }
 */
import {axes, binomiale, curseur, echelle, fr, poisson, scene, svg, vider, type Cadre} from './outils';

export default function binomialePoisson (el: HTMLElement, params: Record<string, unknown>) {
    const c: Cadre = {L: 560, H: 270, m: {g: 36, d: 16, h: 20, b: 32}};
    const s = scene(el, c, 'Comparaison loi binomiale et loi de Poisson');
    const controles = document.createElement('div');
    controles.className = 'anim-controles';
    const lecture = document.createElement('div');
    lecture.className = 'anim-lecture';
    lecture.setAttribute('aria-live', 'polite');
    el.append(controles, lecture);

    const calque = svg('g', {}, s);
    const cn = curseur(controles, {label: 'n', min: 1, max: 100, pas: 1, valeur: (params.n as number) ?? 40}, dessiner);
    const cp = curseur(
        controles,
        {label: 'p', min: 0.01, max: 0.9, pas: 0.01, valeur: (params.p as number) ?? 0.05, format: (v) => fr(v, 2)},
        dessiner,
    );

    function dessiner() {
        vider(calque);
        const n = cn.valeur();
        const p = cp.valeur();
        const l = n * p;
        // fenêtre utile : autour de la moyenne
        const sd = Math.sqrt(Math.max(l, n * p * (1 - p), 1));
        const kMax = Math.min(n, Math.max(10, Math.ceil(l + 4 * sd)));
        const kMin = Math.max(0, Math.floor(Math.min(l - 4 * sd, n * p - 4 * sd)));
        const ks = Array.from({length: kMax - kMin + 1}, (_, i) => kMin + i);
        const pb = ks.map((k) => binomiale(n, p, k));
        const pp = ks.map((k) => poisson(l, k));
        const yMax = Math.max(...pb, ...pp) * 1.15;

        const pas = (c.L - c.m.g - c.m.d) / ks.length;
        const X = (i: number) => c.m.g + pas * (i + 0.5);
        const Y = echelle(0, yMax, c.H - c.m.b, c.m.h);
        const saut = Math.ceil(ks.length / 14);
        axes(calque, c, {
            xTicks: ks.map((v, i) => ({v, x: X(i)})).filter((_, i) => i % saut === 0),
        });

        const larg = Math.max(2, Math.min(22, pas * 0.6));
        ks.forEach((_, i) => {
            svg('rect', {
                x: X(i) - larg / 2,
                y: Y(pb[i]),
                width: larg,
                height: Y(0) - Y(pb[i]),
                rx: 2,
                fill: 'var(--accent)',
                opacity: 0.75
            }, calque);
        });
        let d = '';
        ks.forEach((_, i) => {
            d += `${i ? 'L' : 'M'} ${X(i)} ${Y(pp[i])} `;
        });
        svg('path', {d, fill: 'none', stroke: 'var(--margin)', 'stroke-width': 1.5}, calque);
        ks.forEach((_, i) => svg('circle', {cx: X(i), cy: Y(pp[i]), r: 3, fill: 'var(--margin)'}, calque));

        // légende
        const lg = svg('g', {transform: `translate(${c.L - c.m.d - 170}, ${c.m.h})`}, calque);
        svg('rect', {x: 0, y: -8, width: 12, height: 10, fill: 'var(--accent)', opacity: 0.75, rx: 2}, lg);
        svg('text', {x: 18, y: 1}, lg).textContent = `B(${n} ; ${fr(p, 2)})`;
        svg('circle', {cx: 6, cy: 13, r: 3.5, fill: 'var(--margin)'}, lg);
        svg('text', {x: 18, y: 17}, lg).textContent = `P(λ = ${fr(l, 2)})`;

        const ecart = ks.reduce((m, _, i) => Math.max(m, Math.abs(pb[i] - pp[i])), 0);
        const cond = [
            {ok: n >= 30, t: `n = ${n} ≥ 30`},
            {ok: p <= 0.1, t: `p = ${fr(p, 2)} ≤ 0,1`},
            {ok: l <= 15, t: `np = ${fr(l, 2)} ≤ 15`},
        ];
        const toutes = cond.every((x) => x.ok);
        lecture.innerHTML =
            cond.map((x) => `<span style="margin-right:1rem">${x.ok ? '✅' : '❌'} ${x.t}</span>`).join('') +
            `<br>Écart maximal entre les deux lois : <strong>${fr(ecart, 4)}</strong> — ` +
            (toutes ? 'approximation par Poisson justifiée.' : 'conditions non réunies : approximation risquée.');
    }

    dessiner();
}
