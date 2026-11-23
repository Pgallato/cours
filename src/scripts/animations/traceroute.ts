/**
 * Principe de traceroute : des Echo Request envoyés avec un TTL croissant ; chaque routeur
 * décrémente le TTL et, à zéro, renvoie un ICMP « Time Exceeded » (TTL initial 64).
 * params : {}
 */
import {scene, svg, vider} from './outils';
import {boite, doux, fleche, lerp, sequenceur, zones} from './sequenceur';

interface Saut {
    de: number;
    vers: number;
    texte: string;
    ttl: number;
    retour?: boolean;
    /** Ligne ajoutée au résultat de traceroute quand ce saut arrive. */
    resultat?: string;
    note: string;
}

const NOEUDS = ['Source', 'R1', 'R2', 'Destination'];

const SAUTS: Saut[] = [
    {de: 0, vers: 1, texte: 'Echo Req.', ttl: 1, note: 'La source émet un Echo Request avec TTL = 1.'},
    {
        de: 1, vers: 0, texte: 'Time Ex.', ttl: 64, retour: true, resultat: '1  R1',
        note: 'R1 décrémente le TTL : 1 → 0. Il renvoie un ICMP « time exceeded » (TTL = 64) : traceroute connaît le 1er routeur.',
    },
    {de: 0, vers: 1, texte: 'Echo Req.', ttl: 2, note: 'Nouvel essai avec TTL = 2.'},
    {de: 1, vers: 2, texte: 'Echo Req.', ttl: 1, note: 'R1 décrémente le TTL (2 → 1) et transmet à R2.'},
    {
        de: 2, vers: 1, texte: 'Time Ex.', ttl: 64, retour: true,
        note: 'R2 décrémente le TTL : 1 → 0. Il renvoie un « time exceeded » avec TTL = 64.',
    },
    {
        de: 1, vers: 0, texte: 'Time Ex.', ttl: 63, retour: true, resultat: '2  R2',
        note: 'R1 relaie la réponse en décrémentant son TTL (64 → 63) : traceroute connaît le 2e routeur.',
    },
    {de: 0, vers: 1, texte: 'Echo Req.', ttl: 3, note: 'Nouvel essai avec TTL = 3.'},
    {de: 1, vers: 2, texte: 'Echo Req.', ttl: 2, note: 'R1 : TTL 3 → 2.'},
    {de: 2, vers: 3, texte: 'Echo Req.', ttl: 1, note: 'R2 : TTL 2 → 1, le paquet atteint la destination.'},
    {de: 3, vers: 2, texte: 'Echo Reply', ttl: 64, retour: true, note: 'La destination répond par un Echo Reply.'},
    {de: 2, vers: 1, texte: 'Echo Reply', ttl: 63, retour: true, note: 'R2 relaie (TTL 64 → 63).'},
    {
        de: 1, vers: 0, texte: 'Echo Reply', ttl: 62, retour: true, resultat: '3  Destination',
        note: 'R1 relaie (TTL 63 → 62). La destination est atteinte : traceroute s’arrête.',
    },
];

export default function (el: HTMLElement) {
    const L = 560;
    const H = 210;
    const s = scene(el, {L, H, m: {g: 0, d: 0, h: 0, b: 0}}, 'Principe de traceroute : TTL croissant et messages ICMP time exceeded');
    const {controles, lecture} = zones(el);
    const calque = svg('g', {}, s);
    const X = [55, 205, 355, 495];
    const yN = 70;
    const yAller = yN - 26;
    const yRetour = yN + 26;

    function dessiner(i: number, t: number) {
        vider(calque);
        for (let k = 0; k < 3; k++) {
            svg('line', {x1: X[k], y1: yN, x2: X[k + 1], y2: yN, stroke: 'currentColor', 'stroke-opacity': 0.35, 'stroke-width': 3}, calque);
        }
        for (let k = 0; k < NOEUDS.length; k++) {
            const l = k === 0 || k === 3 ? 92 : 56;
            boite(calque, X[k] - l / 2, yN - 14, l, 28, NOEUDS[k], {gras: true});
        }
        // résultat affiché par traceroute
        svg('text', {x: 20, y: 140, style: 'font-family:var(--font-mono);fill:var(--ink-2)'}, calque).textContent = '$ traceroute destination';
        let ligne = 0;
        for (let k = 1; k <= i; k++) {
            const r = SAUTS[k - 1].resultat;
            if (r && (k < i || t === 1)) {
                ligne++;
                svg('text', {x: 20, y: 140 + ligne * 17, style: 'font-family:var(--font-mono);fill:var(--accent)'}, calque).textContent = r;
            }
        }
        if (i === 0) return;
        const sp = SAUTS[i - 1];
        const y = sp.retour ? yRetour : yAller;
        const avance = doux(t);
        const xa = X[sp.de];
        const xb = X[sp.vers];
        const col = sp.texte === 'Time Ex.' ? 'var(--margin)' : 'var(--accent)';
        const dx = Math.sign(xb - xa) * 40;
        fleche(calque, xa + dx, y, lerp(xa + dx, xb - dx, avance), y, col, {epaisseur: 1.6});
        const xp = lerp(xa + dx, xb - dx, avance);
        const gp = svg('g', {}, calque);
        svg('rect', {x: xp - 44, y: y - 11, width: 88, height: 22, rx: 5, fill: 'var(--paper)', stroke: col}, gp);
        svg('text', {x: xp, y: y - 0.5, 'text-anchor': 'middle', style: `fill:${col};font-size:10px`}, gp).textContent = sp.texte;
        svg('text', {x: xp, y: y + 8.5, 'text-anchor': 'middle', style: `fill:${col};font-size:9px;font-family:var(--font-mono)`}, gp).textContent = `TTL=${sp.ttl}`;
    }

    const decrire = (i: number) =>
        i === 0 ? 'Traceroute : appuyez sur « Lire » pour suivre les paquets.' : `Étape ${i} — ${SAUTS[i - 1].note}`;

    sequenceur(controles, lecture, {nb: () => SAUTS.length, dessiner, decrire, duree: 1000});
}
