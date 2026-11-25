/**
 * Système discret du premier ordre H(z) = z / (z − p), h[n] = pⁿ u[n] :
 * position du pôle dans le plan des z (disque unité) et réponse impulsionnelle.
 * Stable si et seulement si |p| < 1.
 * params : { p?: number }
 */
import {curseur, echelle, fr, scene, svg, vider, type Cadre} from './outils';

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const c: Cadre = {L: 560, H: 250, m: {g: 20, d: 20, h: 16, b: 26}};
    const s = scene(el, c, 'Pôle dans le plan des z et réponse impulsionnelle correspondante');
    const controles = document.createElement('div');
    controles.className = 'anim-controles';
    const lecture = document.createElement('p');
    lecture.className = 'anim-lecture';
    lecture.setAttribute('aria-live', 'polite');
    el.append(controles, lecture);
    const calque = svg('g', {}, s);

    const pole = curseur(
        controles,
        {label: 'pôle p', min: -1.3, max: 1.3, pas: 0.05, valeur: Number(params.p ?? 0.8), format: (v) => fr(v, 2)},
        dessiner,
    );

    // plan des z (à gauche)
    const cx = 120;
    const cy = 120;
    const R = 72;
    // réponse impulsionnelle (à droite)
    const NMAX = 15;
    const Xn = echelle(-0.5, NMAX + 0.5, 250, c.L - c.m.d);
    const Yh = echelle(-2.2, 2.2, c.H - c.m.b, c.m.h);

    function dessiner() {
        vider(calque);
        const p = pole.valeur();
        const stable = Math.abs(p) < 1;

        svg('circle', {cx, cy, r: R, fill: 'var(--accent)', 'fill-opacity': 0.12, stroke: 'currentColor', 'stroke-opacity': 0.6}, calque);
        svg('line', {x1: cx - 1.5 * R, x2: cx + 1.5 * R, y1: cy, y2: cy, stroke: 'var(--line-strong)'}, calque);
        svg('line', {x1: cx, x2: cx, y1: cy - 1.4 * R, y2: cy + 1.4 * R, stroke: 'var(--line-strong)'}, calque);
        svg('text', {x: cx + R + 3, y: cy + 14}, calque).textContent = '1';
        svg('text', {x: cx + 1.5 * R, y: cy - 6, 'text-anchor': 'end', 'font-style': 'italic'}, calque).textContent = 'Re(z)';
        svg('text', {x: cx + 5, y: cy - 1.4 * R + 10, 'font-style': 'italic'}, calque).textContent = 'Im(z)';
        // zéro en 0, pôle en p
        svg('circle', {cx, cy, r: 5, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2}, calque);
        const px = cx + p * R;
        const col = stable ? 'var(--accent)' : 'var(--margin)';
        for (const sg of [1, -1]) {
            svg('line', {x1: px - 6, x2: px + 6, y1: cy - 6 * sg, y2: cy + 6 * sg, stroke: col, 'stroke-width': 2.5}, calque);
        }

        // h[n] = pⁿ u[n]
        svg('line', {x1: Xn(-0.5), x2: c.L - c.m.d, y1: Yh(0), y2: Yh(0), stroke: 'var(--line-strong)'}, calque);
        svg('text', {x: Xn(0), y: c.m.h + 4}, calque).textContent = 'h[n] = pⁿ u[n]';
        for (let n = 0; n <= NMAX; n++) {
            const v = Math.pow(p, n);
            const vc = Math.max(-2.2, Math.min(2.2, v));
            svg('line', {x1: Xn(n), x2: Xn(n), y1: Yh(0), y2: Yh(vc), stroke: col, 'stroke-width': 1.6}, calque);
            svg('circle', {cx: Xn(n), cy: Yh(vc), r: 3, fill: col}, calque);
            if (n % 5 === 0) svg('text', {x: Xn(n), y: Yh(0) + 15, 'text-anchor': 'middle'}, calque).textContent = String(n);
        }

        lecture.textContent = stable
            ? `|p| = ${fr(Math.abs(p), 2)} < 1 : le pôle est dans le disque unité, h[n] tend vers 0 — système stable.`
            : `|p| = ${fr(Math.abs(p), 2)} ≥ 1 : le pôle n’est pas à l’intérieur du disque unité, h[n] ne tend pas vers 0 — système non stable.`;
    }

    dessiner();
}
