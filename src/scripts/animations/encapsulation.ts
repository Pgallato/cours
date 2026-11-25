/**
 * Encapsulation / décapsulation d'un message M : chaque niveau ajoute (à l'émission) puis retire
 * (à la réception) son en-tête H et, pour les niveaux bas, son élément de fin E.
 * Reprend le schéma du cours (H3 ; H2 + E2 ; H1 + E1).
 * params : {}
 */
import {scene, svg, vider} from './outils';
import {boite, doux, fleche, lerp, sequenceur, zones} from './sequenceur';

const RANGEES = [['M'], ['H3', 'M'], ['H2', 'H3', 'M', 'E2'], ['H1', 'H2', 'H3', 'M', 'E2', 'E1']];

const NOTES = [
    'Émission : le message M part du niveau le plus haut.',
    'Le niveau 3 ajoute son en-tête H3 devant M.',
    'Le niveau 2 encapsule le tout : en-tête H2 devant, élément de fin E2 derrière.',
    'Le niveau 1 ajoute H1 et E1 : le message complet est prêt à partir sur le support.',
    'Transmission du message sur le support.',
    'Réception : le message arrive complet (H1 … E1).',
    'Le niveau 1 retire H1 et E1 et remonte le reste.',
    'Le niveau 2 retire H2 et E2.',
    'Le niveau 3 retire H3 : le destinataire retrouve le message M d’origine.',
];

export default function (el: HTMLElement) {
    const L = 600;
    const H = 250;
    const s = scene(el, {L, H, m: {g: 0, d: 0, h: 0, b: 0}}, 'Encapsulation d’un message à l’émission puis décapsulation à la réception');
    const {controles, lecture} = zones(el);
    const calque = svg('g', {}, s);
    const lb = 40;
    const hb = 22;
    const yR = (r: number) => 28 + r * 42;
    const centreG = 150;
    const centreD = 450;

    const couleur = (c: string) => (c === 'M' ? 'var(--accent-soft)' : c.startsWith('H') ? 'var(--paper-2)' : 'var(--paper-3)');

    function rangee(cx: number, r: number, opacite = 1, nouveaux: string[] = []) {
        const cases = RANGEES[r];
        const x0 = cx - (cases.length * lb) / 2;
        const g = svg('g', {opacity: opacite}, calque);
        cases.forEach((c, k) => {
            const neuf = nouveaux.includes(c);
            boite(g, x0 + k * lb, yR(r), lb, hb, c, {
                fond: couleur(c),
                trait: neuf ? 'var(--accent)' : undefined,
                gras: neuf,
                couleurTexte: neuf ? 'var(--accent-ink)' : undefined,
            });
        });
        return {x0, x1: x0 + cases.length * lb};
    }

    function dessiner(i: number, t: number) {
        vider(calque);
        svg('text', {x: centreG, y: 16, 'text-anchor': 'middle', style: 'font-weight:600;fill:var(--ink-2)'}, calque).textContent = 'Émetteur';
        svg('text', {x: centreD, y: 16, 'text-anchor': 'middle', style: 'font-weight:600;fill:var(--ink-2)'}, calque).textContent = 'Récepteur';
        const ap = (k: number) => (k < i ? 1 : k === i ? Math.min(1, t * 1.6) : 0);
        // émission : rangées 0 à 3 (étapes 1 à 4)
        for (let r = 0; r < 4; r++) {
            const o = ap(r + 1);
            if (o > 0) {
                const nouveaux = r === i - 1 ? RANGEES[r].filter((c) => !(RANGEES[r - 1] ?? []).includes(c)) : [];
                rangee(centreG, r, o, nouveaux);
                if (r > 0 && i >= r + 1) fleche(calque, centreG, yR(r - 1) + hb, centreG, yR(r) - 1, 'currentColor', {epaisseur: 1});
            }
        }
        // transmission (étape 5) : bloc qui suit une courbe en bas
        if (i >= 5) {
            const yb = yR(3) + hb;
            const p0 = {x: centreG, y: yb};
            const p3 = {x: centreD, y: yb};
            const yc = H - 14;
            svg('path', {
                d: `M${p0.x} ${p0.y} C ${p0.x} ${yc}, ${p3.x} ${yc}, ${p3.x} ${p3.y}`,
                fill: 'none',
                stroke: 'currentColor',
                'stroke-opacity': 0.5,
            }, calque);
            const tx = svg('text', {x: (centreG + centreD) / 2, y: yc - 4, 'text-anchor': 'middle', style: 'fill:var(--ink-2)'}, calque);
            tx.textContent = 'Message';
            if (i === 5 && t < 1) {
                const u = doux(t);
                const bx = (1 - u) ** 3 * p0.x + 3 * (1 - u) ** 2 * u * p0.x + 3 * (1 - u) * u * u * p3.x + u ** 3 * p3.x;
                const by = (1 - u) ** 3 * p0.y + 3 * (1 - u) ** 2 * u * yc + 3 * (1 - u) * u * u * yc + u ** 3 * p3.y;
                svg('rect', {x: bx - 30, y: by - 9, width: 60, height: 18, rx: 4, fill: 'var(--accent)'}, calque);
            }
        }
        // réception : rangées 3 à 0 (étapes 6 à 9)
        for (let r = 3; r >= 0; r--) {
            const etape = 6 + (3 - r);
            const o = ap(etape);
            if (o > 0) {
                const retires = etape === i && r < 3 ? RANGEES[r + 1].filter((c) => !RANGEES[r].includes(c)) : [];
                rangee(centreD, r, o, []);
                if (r < 3) fleche(calque, centreD, yR(r + 1) - 1, centreD, yR(r) + hb, 'currentColor', {epaisseur: 1});
                if (retires.length && t < 1) {
                    svg('text', {
                        x: centreD + (RANGEES[r].length * lb) / 2 + 12,
                        y: lerp(yR(r + 1), yR(r), t) + 15,
                        style: 'fill:var(--margin);font-family:var(--font-mono);font-size:11px',
                    }, calque).textContent = `− ${retires.join(', ')}`;
                }
            }
        }
    }

    const decrire = (i: number) => (i === 0 ? 'Encapsulation : appuyez sur « Lire ».' : `Étape ${i} — ${NOTES[i - 1]}`);

    sequenceur(controles, lecture, {nb: () => NOTES.length, dessiner, decrire, duree: 900});
}
