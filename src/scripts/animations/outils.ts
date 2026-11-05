/** Outils communs aux animations : SVG, échelles, curseurs, maths. */

const NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string | number> = {},
    parent?: Element,
): SVGElementTagNameMap[K] {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    parent?.appendChild(el);
    return el;
}

export function vider(el: Element) {
    while (el.firstChild) el.removeChild(el.firstChild);
}

export interface Cadre {
    L: number;
    H: number;
    m: { g: number; d: number; h: number; b: number };
}

export function echelle(d0: number, d1: number, r0: number, r1: number) {
    return (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
}

/** Crée le SVG de la scène avec un viewBox responsive. */
export function scene(conteneur: HTMLElement, cadre: Cadre, label: string) {
    const s = svg('svg', {
        viewBox: `0 0 ${cadre.L} ${cadre.H}`,
        role: 'img',
        'aria-label': label,
    });
    conteneur.appendChild(s);
    return s;
}

export function axes(
    parent: SVGElement,
    c: Cadre,
    opts: { xTicks?: { v: number; x: number; t?: string }[]; yMax?: number; yLabel?: string } = {},
) {
    const g = svg('g', {}, parent);
    const y0 = c.H - c.m.b;
    svg('line', {x1: c.m.g, x2: c.L - c.m.d, y1: y0, y2: y0, stroke: 'var(--line-strong)', 'stroke-width': 1}, g);
    svg('line', {x1: c.m.g, x2: c.m.g, y1: c.m.h, y2: y0, stroke: 'var(--line-strong)', 'stroke-width': 1}, g);
    for (const t of opts.xTicks ?? []) {
        svg('line', {x1: t.x, x2: t.x, y1: y0, y2: y0 + 4, stroke: 'var(--line-strong)'}, g);
        const tx = svg('text', {x: t.x, y: y0 + 16, 'text-anchor': 'middle'}, g);
        tx.textContent = t.t ?? String(t.v);
    }
    if (opts.yLabel) {
        const ty = svg('text', {x: c.m.g + 6, y: c.m.h + 4}, g);
        ty.textContent = opts.yLabel;
    }
    return g;
}

export interface Curseur {
    input: HTMLInputElement;
    valeur: () => number;
}

/** Crée un curseur accessible (label + output) dans la zone de contrôles. */
export function curseur(
    zone: HTMLElement,
    o: { label: string; min: number; max: number; pas: number; valeur: number; format?: (v: number) => string },
    surChange: () => void,
): Curseur {
    const label = document.createElement('label');
    const titre = document.createElement('span');
    const out = document.createElement('output');
    const input = document.createElement('input');
    Object.assign(input, {type: 'range', min: o.min, max: o.max, step: o.pas, value: o.valeur});
    const fmt = o.format ?? ((v: number) => String(v));
    const maj = () => {
        out.textContent = fmt(Number(input.value));
        input.setAttribute('aria-valuetext', `${o.label} ${out.textContent}`);
    };
    titre.append(`${o.label} = `, out);
    label.append(titre, input);
    zone.appendChild(label);
    input.addEventListener('input', () => {
        maj();
        surChange();
    });
    maj();
    return {input, valeur: () => Number(input.value)};
}

export const fr = (v: number, d = 4) =>
    v.toLocaleString('fr-FR', {maximumFractionDigits: d, minimumFractionDigits: 0});
export const pct = (v: number, d = 1) => `${fr(v * 100, d)}\u202f%`;

/* ---------- Mathématiques ---------- */

export function lnFact(n: number): number {
    let s = 0;
    for (let i = 2; i <= n; i++) s += Math.log(i);
    return s;
}

export function binomiale(n: number, p: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    return Math.exp(lnFact(n) - lnFact(k) - lnFact(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

export function poisson(l: number, k: number): number {
    if (k < 0) return 0;
    return Math.exp(-l + k * Math.log(l) - lnFact(k));
}

/** Fonction d'erreur (Abramowitz & Stegun 7.1.26, erreur < 1.5e-7). */
export function erf(x: number): number {
    const s = Math.sign(x);
    x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y =
        1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
}

export const phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
