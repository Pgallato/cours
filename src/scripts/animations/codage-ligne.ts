/**
 * Codages de ligne : NRZ (RS232 : 0 → +12 V, 1 → −12 V), NRZI façon USB (un 0 provoque un
 * changement d'état, un 1 aucun) et Manchester IEEE 802.3 (front montant = 1, front descendant = 0).
 * Les bits se basculent d'un clic.
 * params : { bits?: string }  (ex. '010111111100')
 */
import {scene, svg, vider} from './outils';
import {bouton, zones} from './sequenceur';

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const init = String(params.bits ?? '010111111100').replace(/[^01]/g, '').slice(0, 16) || '10110010';
    const bits = init.split('').map(Number);
    const n = bits.length;
    const L = 560;
    const H = 268;
    const s = scene(el, {L, H, m: {g: 0, d: 0, h: 0, b: 0}}, 'Chronogrammes des codages NRZ, NRZI et Manchester pour une suite de bits');
    const {controles, lecture} = zones(el);
    const calque = svg('g', {}, s);
    const xg = 96;
    const xd = L - 12;
    const lb = (xd - xg) / n;

    // boutons des bits
    const ligne = document.createElement('div');
    ligne.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.25rem;align-items:center;flex-basis:100%';
    const titre = document.createElement('span');
    titre.textContent = 'Bits (cliquer pour basculer) :';
    titre.style.cssText = 'color:var(--ink-2);margin-right:0.4rem';
    ligne.appendChild(titre);
    const boutons = bits.map((_, k) =>
        bouton(ligne, '', `Bit ${k + 1}`, () => {
            bits[k] ^= 1;
            dessiner();
        }),
    );
    for (const b of boutons) {
        b.style.minWidth = '1.9rem';
        b.style.padding = '0.25rem 0.4rem';
        b.style.fontFamily = 'var(--font-mono)';
    }
    controles.appendChild(ligne);

    const pistes = [
        {nom: 'NRZ', sous: '(RS232)', y: 60},
        {nom: 'NRZI', sous: '(USB, 0 = transition)', y: 140},
        {nom: 'Manchester', sous: '(↑ = 1, ↓ = 0)', y: 220},
    ];
    const amp = 20;

    function dessiner() {
        vider(calque);
        boutons.forEach((b, k) => {
            b.textContent = String(bits[k]);
            b.setAttribute('aria-pressed', String(bits[k] === 1));
            b.setAttribute('aria-label', `Bit ${k + 1} : ${bits[k]}`);
            b.style.background = bits[k] ? 'var(--accent-soft)' : 'var(--paper-2)';
        });
        // grille et bits
        for (let k = 0; k <= n; k++) {
            svg('line', {x1: xg + k * lb, x2: xg + k * lb, y1: 22, y2: H - 8, stroke: 'currentColor', 'stroke-opacity': 0.15, 'stroke-dasharray': '2 3'}, calque);
        }
        bits.forEach((b, k) => {
            svg('text', {x: xg + (k + 0.5) * lb, y: 16, 'text-anchor': 'middle', style: 'font-family:var(--font-mono);font-weight:600;fill:var(--ink)'}, calque).textContent = String(b);
        });
        for (const p of pistes) {
            svg('text', {x: 6, y: p.y - 2, style: 'font-weight:600;fill:var(--ink-2)'}, calque).textContent = p.nom;
            svg('text', {x: 6, y: p.y + 12, style: 'font-size:8.5px'}, calque).textContent = p.sous;
            svg('line', {x1: xg, x2: xd, y1: p.y, y2: p.y, stroke: 'currentColor', 'stroke-opacity': 0.25}, calque);
        }
        // NRZ RS232 : 0 → +12 V (haut), 1 → −12 V (bas)
        const yN = pistes[0].y;
        let d = '';
        bits.forEach((b, k) => {
            const y = b ? yN + amp : yN - amp;
            d += `${k === 0 ? 'M' : 'L'}${xg + k * lb} ${y} L${xg + (k + 1) * lb} ${y} `;
        });
        svg('path', {d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2}, calque);
        svg('text', {x: xg - 4, y: yN - amp + 4, 'text-anchor': 'end', style: 'font-size:9px'}, calque).textContent = '+12 V';
        svg('text', {x: xg - 4, y: yN + amp + 4, 'text-anchor': 'end', style: 'font-size:9px'}, calque).textContent = '−12 V';

        // NRZI (USB) : un 0 provoque un changement d'état, un 1 aucun ; départ au niveau bas
        const yI = pistes[1].y;
        let niveau = -1;
        d = `M${xg} ${yI - niveau * amp}`;
        let plusLongueSansTransition = 0;
        let courant = 0;
        bits.forEach((b, k) => {
            if (!b) {
                niveau = -niveau;
                courant = 0;
            } else {
                courant++;
                plusLongueSansTransition = Math.max(plusLongueSansTransition, courant);
            }
            d += ` L${xg + k * lb} ${yI - niveau * amp} L${xg + (k + 1) * lb} ${yI - niveau * amp}`;
        });
        svg('path', {d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2}, calque);
        // repérage des longues suites de 1 (aucune transition)
        let debut = -1;
        for (let k = 0; k <= n; k++) {
            if (k < n && bits[k] === 1) {
                if (debut < 0) debut = k;
            } else if (debut >= 0) {
                if (k - debut >= 4) {
                    svg('rect', {x: xg + debut * lb, y: yI - amp - 6, width: (k - debut) * lb, height: 2 * amp + 12, fill: 'var(--margin)', opacity: 0.12}, calque);
                }
                debut = -1;
            }
        }

        // Manchester (IEEE 802.3) : transition au milieu du bit ; 1 = front montant, 0 = front descendant
        const yM = pistes[2].y;
        d = '';
        bits.forEach((b, k) => {
            const x0 = xg + k * lb;
            const xm = x0 + lb / 2;
            const avant = b ? yM + amp : yM - amp;
            const apres = b ? yM - amp : yM + amp;
            d += `${k === 0 ? 'M' : 'L'}${x0} ${avant} L${xm} ${avant} L${xm} ${apres} L${x0 + lb} ${apres} `;
        });
        svg('path', {d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2}, calque);

        const transitionsM = n + bits.slice(1).filter((b, k) => b === bits[k]).length;
        lecture.textContent =
            `Manchester : ${transitionsM} transitions pour ${n} bits (au moins une par bit : le signal porte son horloge, ` +
            `mais il faut émettre au moins 2 fois plus vite que les données). ` +
            (plusLongueSansTransition >= 4
                ? `NRZI : ${plusLongueSansTransition} « 1 » consécutifs sans aucune transition (zone surlignée) — l’horloge portée par les données peut être perdue ; USB insère un 0 après six 1.`
                : 'NRZI : pas de longue suite de 1 ici.');
    }

    dessiner();
}
