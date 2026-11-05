/**
 * Loi d'une variable aléatoire discrète : diagramme en bâtons de P(X = x),
 * fonction de répartition F (escalier) et espérance.
 * params : { valeurs: number[], probas: number[], nom?: string }
 */
import {axes, curseur, echelle, fr, pct, scene, svg, vider, type Cadre} from './outils';

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const xs = (params.valeurs as number[]) ?? [0, 1, 2, 3, 4];
    const ps = (params.probas as number[]) ?? xs.map(() => 1 / xs.length);
    const nom = (params.nom as string) ?? 'X';

    const c: Cadre = {L: 560, H: 260, m: {g: 40, d: 40, h: 20, b: 32}};
    const s = scene(el, c, `Loi de probabilité et fonction de répartition de ${nom}`);
    const controles = document.createElement('div');
    controles.className = 'anim-controles';
    const lecture = document.createElement('p');
    lecture.className = 'anim-lecture';
    lecture.setAttribute('aria-live', 'polite');
    el.append(controles, lecture);

    const pas = (c.L - c.m.g - c.m.d) / xs.length;
    const X = (i: number) => c.m.g + pas * (i + 0.5);
    const xVal = echelle(xs[0] - 0.5, xs[xs.length - 1] + 0.5, c.m.g, c.L - c.m.d);
    const Y = echelle(0, 1, c.H - c.m.b, c.m.h);
    const esperance = xs.reduce((s, x, i) => s + x * ps[i], 0);

    axes(s, c, {xTicks: xs.map((v, i) => ({v, x: X(i)})), yLabel: '1'});
    svg('line', {x1: c.m.g - 4, x2: c.m.g, y1: Y(1), y2: Y(1), stroke: 'var(--line-strong)'}, s);
    const calque = svg('g', {}, s);

    const choix = curseur(
        controles,
        {label: 'x', min: xs[0], max: xs[xs.length - 1], pas: 1, valeur: xs[Math.floor(xs.length / 2)]},
        dessiner,
    );
    const caseF = document.createElement('label');
    caseF.style.cssText = 'display:flex;align-items:center;gap:.4rem;flex:0 0 auto;min-width:0';
    caseF.innerHTML = '<input type="checkbox" checked> Fonction de répartition F';
    controles.appendChild(caseF);
    caseF.querySelector('input')!.addEventListener('change', dessiner);

    function dessiner() {
        vider(calque);
        const seuil = choix.valeur();
        const voirF = caseF.querySelector('input')!.checked;
        let cumul = 0;
        xs.forEach((x, i) => {
            const actif = x <= seuil;
            if (actif) cumul += ps[i];
            const larg = Math.min(46, pas * 0.55);
            svg(
                'rect',
                {
                    x: X(i) - larg / 2,
                    y: Y(ps[i]),
                    width: larg,
                    height: Y(0) - Y(ps[i]),
                    rx: 3,
                    fill: actif ? 'var(--accent)' : 'var(--line-strong)',
                    opacity: actif ? 0.9 : 0.6,
                },
                calque,
            );
            const t = svg('text', {x: X(i), y: Y(ps[i]) - 5, 'text-anchor': 'middle'}, calque);
            t.textContent = pct(ps[i], 0);
        });

        if (voirF) {
            // escalier : F constante entre deux valeurs, sauts de P(X = x_i)
            let F = 0;
            let d = `M ${c.m.g} ${Y(0)}`;
            xs.forEach((x, i) => {
                d += ` H ${xVal(x)}`;
                F += ps[i];
                d += ` M ${xVal(x)} ${Y(F)}`;
                svg('circle', {cx: xVal(x), cy: Y(F), r: 3, fill: 'var(--ink)'}, calque);
            });
            d += ` H ${c.L - c.m.d}`;
            svg('path', {d, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6}, calque);
        }

        const xe = xVal(esperance);
        svg('line', {x1: xe, x2: xe, y1: c.m.h, y2: Y(0), stroke: 'var(--margin)', 'stroke-dasharray': '4 4'}, calque);
        const te = svg('text', {x: xe + 4, y: c.m.h + 10}, calque);
        te.textContent = `E(${nom}) = ${fr(esperance, 3)}`;

        lecture.innerHTML = `F(${seuil}) = P(${nom} ≤ ${seuil}) = <strong>${pct(cumul, 1)}</strong> — somme des bâtons colorés.`;
    }

    dessiner();
}
