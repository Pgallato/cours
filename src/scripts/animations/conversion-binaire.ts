/**
 * Conversion d'un octet : décimal → binaire (poids 128 … 1) → hexadécimal (deux quartets).
 * params : { valeur?: number }  (0 à 255, 202 par défaut comme dans le cours)
 */
import {curseur, scene, svg, vider} from './outils';
import {zones} from './sequenceur';

const POIDS = [128, 64, 32, 16, 8, 4, 2, 1];

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const L = 560;
    const H = 150;
    const s = scene(el, {L, H, m: {g: 0, d: 0, h: 0, b: 0}}, 'Conversion d’un nombre décimal en binaire et en hexadécimal');
    const {controles, lecture} = zones(el);
    const calque = svg('g', {}, s);
    const v0 = Math.max(0, Math.min(255, Math.round(Number(params.valeur ?? 202))));
    const c = curseur(controles, {label: 'nombre décimal', min: 0, max: 255, pas: 1, valeur: v0}, dessiner);

    const xg = 120;
    const lc = 48;
    const gap = 16; // séparation des deux quartets

    const xCase = (k: number) => xg + k * lc + (k >= 4 ? gap : 0);

    function dessiner() {
        vider(calque);
        const v = c.valeur();
        const b = POIDS.map((p) => (v & p ? 1 : 0));
        const lignes = [
            {nom: 'Décimal', y: 14},
            {nom: 'Binaire', y: 52},
            {nom: 'Hexa.', y: 96},
        ];
        for (const l of lignes) {
            svg('text', {x: xg - 12, y: l.y + 21, 'text-anchor': 'end', style: 'font-weight:600;fill:var(--ink-2)'}, calque).textContent = l.nom;
        }
        POIDS.forEach((p, k) => {
            const x = xCase(k);
            const actif = b[k] === 1;
            svg('rect', {x, y: 14, width: lc - 4, height: 30, rx: 4, fill: actif ? 'var(--accent-soft)' : 'var(--paper-2)', stroke: 'currentColor', 'stroke-opacity': 0.3}, calque);
            svg('text', {x: x + (lc - 4) / 2, y: 35, 'text-anchor': 'middle', style: `font-family:var(--font-mono);fill:${actif ? 'var(--accent-ink)' : 'var(--ink-3)'}`}, calque).textContent = String(p);
            svg('rect', {x, y: 52, width: lc - 4, height: 30, rx: 4, fill: actif ? 'var(--accent)' : 'var(--paper)', stroke: 'currentColor', 'stroke-opacity': 0.3}, calque);
            svg('text', {x: x + (lc - 4) / 2, y: 73, 'text-anchor': 'middle', style: `font-family:var(--font-mono);font-weight:600;font-size:14px;fill:${actif ? 'var(--paper)' : 'var(--ink-3)'}`}, calque).textContent = String(b[k]);
        });
        const hex = v.toString(16).toUpperCase().padStart(2, '0');
        for (const q of [0, 1]) {
            const x = xCase(q * 4);
            const l = 4 * lc - 4;
            svg('rect', {x, y: 96, width: l, height: 30, rx: 4, fill: 'var(--paper-2)', stroke: 'var(--accent)'}, calque);
            svg('text', {x: x + l / 2, y: 117, 'text-anchor': 'middle', style: 'font-family:var(--font-mono);font-weight:600;font-size:15px;fill:var(--accent-ink)'}, calque).textContent = hex[q];
        }
        const somme = POIDS.filter((_, k) => b[k]).join(' + ') || '0';
        const bin = b.join('');
        lecture.innerHTML = '';
        const st = (t: string) => {
            const e = document.createElement('strong');
            e.textContent = t;
            return e;
        };
        lecture.append(st(String(v)), ` = ${somme} = `, st(`${bin.slice(0, 4)} ${bin.slice(4)}`), ' en binaire = ', st(`0x${hex}`), ' en hexadécimal (un chiffre hexadécimal par groupe de 4 bits).');
    }

    dessiner();
}
