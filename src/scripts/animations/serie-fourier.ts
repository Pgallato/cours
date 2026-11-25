/**
 * Série de Fourier du signal carré (T0 = 1, valeurs ±1) : somme partielle des
 * N premiers harmoniques impairs bn = 4/(nπ), et spectre d'amplitude unilatéral.
 * Fait apparaître le phénomène de Gibbs quand N augmente.
 * params : { n?: number }  (nombre d'harmoniques impairs au départ)
 */
import {curseur, echelle, fr, scene, svg, vider, type Cadre} from './outils';

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const c: Cadre = {L: 560, H: 300, m: {g: 34, d: 20, h: 14, b: 26}};
    const s = scene(el, c, 'Somme partielle de la série de Fourier du signal carré et spectre d’amplitude');
    const controles = document.createElement('div');
    controles.className = 'anim-controles';
    const lecture = document.createElement('p');
    lecture.className = 'anim-lecture';
    lecture.setAttribute('aria-live', 'polite');
    el.append(controles, lecture);
    const calque = svg('g', {}, s);

    const NMAX = 50;
    const nb = curseur(
        controles,
        {label: 'harmoniques impairs', min: 1, max: NMAX, pas: 1, valeur: Math.min(NMAX, Math.max(1, Number(params.n ?? 3)))},
        dessiner,
    );

    // zone haute : signal ; zone basse : spectre
    const hautB = 170;
    const Xt = echelle(-1, 1, c.m.g, c.L - c.m.d);
    const Yt = echelle(-1.45, 1.45, hautB, c.m.h);
    const basH = 200;
    const Xf = echelle(0, 26, c.m.g, c.L - c.m.d);
    const Yf = echelle(0, 1.4, c.H - c.m.b, basH);

    const carre = (t: number) => (((t % 1) + 1) % 1 < 0.5 ? 1 : -1);

    function dessiner() {
        vider(calque);
        const N = nb.valeur();

        // axes du signal
        svg('line', {x1: c.m.g, x2: c.L - c.m.d, y1: Yt(0), y2: Yt(0), stroke: 'var(--line-strong)'}, calque);
        svg('line', {x1: Xt(0), x2: Xt(0), y1: c.m.h, y2: hautB, stroke: 'var(--line-strong)'}, calque);
        for (const v of [-1, 1]) {
            svg('line', {x1: Xt(0) - 3, x2: Xt(0) + 3, y1: Yt(v), y2: Yt(v), stroke: 'var(--line-strong)'}, calque);
            svg('text', {x: Xt(0) - 6, y: Yt(v) + 4, 'text-anchor': 'end'}, calque).textContent = String(v).replace('-', '−');
            svg('text', {x: Xt(v), y: Yt(0) + 15, 'text-anchor': 'middle'}, calque).textContent = String(v).replace('-', '−');
        }
        svg('text', {x: c.L - c.m.d, y: Yt(0) - 6, 'text-anchor': 'end', 'font-style': 'italic'}, calque).textContent = 't';

        // signal carré idéal (pointillés)
        let d = '';
        for (let k = -2; k < 2; k++) {
            const a = Math.max(-1, k * 0.5);
            const b = Math.min(1, (k + 1) * 0.5);
            const v = carre(a + 0.01);
            d += `M${Xt(a)} ${Yt(v)} L${Xt(b)} ${Yt(v)} `;
        }
        svg('path', {d, fill: 'none', stroke: 'currentColor', 'stroke-opacity': 0.4, 'stroke-dasharray': '4 3'}, calque);

        // somme partielle
        const pts: string[] = [];
        let maxi = 0;
        const P = 900;
        for (let i = 0; i <= P; i++) {
            const t = -1 + (2 * i) / P;
            let v = 0;
            for (let k = 0; k < N; k++) {
                const n = 2 * k + 1;
                v += (4 / (n * Math.PI)) * Math.sin(2 * Math.PI * n * t);
            }
            maxi = Math.max(maxi, v);
            pts.push(`${i ? 'L' : 'M'}${Xt(t).toFixed(1)} ${Yt(v).toFixed(1)}`);
        }
        svg('path', {d: pts.join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2}, calque);

        // spectre d'amplitude unilatéral An = 4/(nπ), n impair
        svg('line', {x1: c.m.g, x2: c.L - c.m.d, y1: Yf(0), y2: Yf(0), stroke: 'var(--line-strong)'}, calque);
        svg('text', {x: c.m.g, y: basH - 4}, calque).textContent = 'An';
        svg('text', {x: c.L - c.m.d, y: Yf(0) - 6, 'text-anchor': 'end', 'font-style': 'italic'}, calque).textContent = 'f';
        for (let n = 1; n <= 25; n += 2) {
            const actif = n <= 2 * N - 1;
            const A = 4 / (n * Math.PI);
            svg('line', {
                x1: Xf(n), x2: Xf(n), y1: Yf(0), y2: Yf(A),
                stroke: actif ? 'var(--accent)' : 'var(--line-strong)', 'stroke-width': 2.5,
            }, calque);
            if (n <= 9) {
                svg('text', {x: Xf(n), y: Yf(0) + 15, 'text-anchor': 'middle'}, calque).textContent = n === 1 ? 'f0' : `${n}f0`;
            }
        }

        const dernier = 2 * N - 1;
        lecture.textContent =
            `${N} harmonique${N > 1 ? 's' : ''} impair${N > 1 ? 's' : ''} (jusqu’à ${dernier === 1 ? 'f0' : `${dernier}f0`}) : ` +
            `la somme partielle culmine à ${fr(maxi, 3)} au lieu de 1` +
            (N >= 10 ? ' — le dépassement près des sauts ne disparaît pas (phénomène de Gibbs).' : '.');
    }

    dessiner();
}
