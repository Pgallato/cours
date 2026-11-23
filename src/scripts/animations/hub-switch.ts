/**
 * Diffusion (hub / répéteur) contre commutation (switch) : les stations A et C émettent
 * en même temps vers D. Le hub répète tout sur tous ses ports (collision, semi-duplex) ;
 * le switch stocke les trames, lit l'adresse destination et n'envoie que vers D, l'une après l'autre.
 * params : { mode?: 'hub' | 'switch' }
 */
import {scene, svg, vider} from './outils';
import {boite, doux, lerp, sequenceur, zones} from './sequenceur';

type Station = 'A' | 'B' | 'C' | 'D';
const POS: Record<Station, {x: number; y: number}> = {
    A: {x: 70, y: 40},
    B: {x: 70, y: 180},
    C: {x: 490, y: 40},
    D: {x: 490, y: 180},
};
const CENTRE = {x: 280, y: 110};

interface Trame {
    /** Couleur de la trame : celle de son émetteur. */
    de: 'A' | 'C' | 'X';
    /** true : de la station vers l'équipement ; false : de l'équipement vers la station. */
    montee: boolean;
    station: Station;
}

interface Etape {
    trames: Trame[];
    note: string;
    collision?: boolean;
    file?: ('A' | 'C')[];
}

const HUB: Etape[] = [
    {
        trames: [{de: 'A', montee: true, station: 'A'}, {de: 'C', montee: true, station: 'C'}],
        note: 'Les stations A et C veulent émettre vers D et émettent en même temps.',
    },
    {
        trames: (['A', 'B', 'C', 'D'] as Station[]).map((s) => ({de: 'X' as const, montee: false, station: s})),
        collision: true,
        note: 'Le hub sert de répéteur : il réémet le signal sur tous ses ports. Les deux trames se mélangent : collision (semi-duplex) ; tout le monde la reçoit.',
    },
    {
        trames: [{de: 'A', montee: true, station: 'A'}],
        note: 'Après un délai aléatoire, A réémet sa trame.',
    },
    {
        trames: (['B', 'C', 'D'] as Station[]).map((s) => ({de: 'A' as const, montee: false, station: s})),
        note: 'Diffusion : B, C et D reçoivent la trame de A. Seul D est concerné (« recevoir » ne signifie pas « être concerné »).',
    },
    {
        trames: [{de: 'C', montee: true, station: 'C'}],
        note: 'C réémet à son tour.',
    },
    {
        trames: (['A', 'B', 'D'] as Station[]).map((s) => ({de: 'C' as const, montee: false, station: s})),
        note: 'Nouvelle diffusion à tous les ports : A, B et D reçoivent la trame de C.',
    },
];

const SWITCH: Etape[] = [
    {
        trames: [{de: 'A', montee: true, station: 'A'}, {de: 'C', montee: true, station: 'C'}],
        note: 'Les stations A et C veulent émettre vers D. Les trames peuvent partir en même temps : pas de collision grâce au switch.',
    },
    {
        trames: [],
        file: ['A', 'C'],
        note: 'Le switch stocke les trames et lit les adresses destination : les deux trames sont pour D.',
    },
    {
        trames: [{de: 'A', montee: false, station: 'D'}],
        file: ['C'],
        note: 'Le switch envoie uniquement sur le port où D est connecté : d’abord la trame de A…',
    },
    {
        trames: [{de: 'C', montee: false, station: 'D'}],
        note: '…puis celle de C (l’une après l’autre). B n’a rien reçu.',
    },
];

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const L = 560;
    const H = 220;
    const s = scene(el, {L, H, m: {g: 0, d: 0, h: 0, b: 0}}, 'Hub contre switch : deux stations émettent vers D');
    const {controles, lecture} = zones(el);
    const calque = svg('g', {}, s);
    let mode: 'hub' | 'switch' = params.mode === 'switch' ? 'switch' : 'hub';
    const etapes = () => (mode === 'hub' ? HUB : SWITCH);

    // choix du mode
    const choix = document.createElement('fieldset');
    choix.style.cssText = 'border:0;padding:0;margin:0;display:flex;gap:1rem;align-items:center;flex-basis:100%';
    const leg = document.createElement('legend');
    leg.textContent = 'Équipement :';
    leg.style.cssText = 'float:left;margin-right:0.6rem;color:var(--ink-2)';
    choix.appendChild(leg);
    for (const [v, t] of [['hub', 'Hub (diffusion)'], ['switch', 'Switch (commutation)']] as const) {
        const lab = document.createElement('label');
        lab.style.cssText = 'display:flex;gap:0.35rem;align-items:center;min-width:0;flex:0 0 auto;cursor:pointer';
        const r = document.createElement('input');
        r.type = 'radio';
        r.name = `equipement-${Math.random().toString(36).slice(2)}`;
        r.value = v;
        r.checked = v === mode;
        r.style.accentColor = 'var(--accent)';
        r.addEventListener('change', () => {
            mode = v;
            for (const x of choix.querySelectorAll('input')) (x as HTMLInputElement).checked = x === r;
            lecteur.rafraichir(0);
        });
        lab.append(r, t);
        choix.appendChild(lab);
    }
    controles.appendChild(choix);
    // même nom pour les deux boutons radio
    const radios = choix.querySelectorAll('input');
    radios[1].name = radios[0].name;

    const teinte = (de: Trame['de']) => (de === 'A' ? 'var(--accent)' : de === 'C' ? 'oklch(60% 0.15 150)' : 'var(--margin)');

    function dessiner(i: number, t: number) {
        vider(calque);
        for (const st of Object.keys(POS) as Station[]) {
            svg('line', {x1: POS[st].x, y1: POS[st].y, x2: CENTRE.x, y2: CENTRE.y, stroke: 'currentColor', 'stroke-opacity': 0.35, 'stroke-width': 2}, calque);
        }
        boite(calque, CENTRE.x - 50, CENTRE.y - 16, 100, 32, mode === 'hub' ? 'Hub' : 'Switch', {gras: true});
        for (const st of Object.keys(POS) as Station[]) {
            boite(calque, POS[st].x - 34, POS[st].y - 14, 68, 28, st, {gras: true, fond: 'var(--paper)'});
        }
        if (i === 0) return;
        const e = etapes()[i - 1];
        const u = doux(t);
        for (const tr of e.trames) {
            const p = POS[tr.station];
            const [a, b] = tr.montee ? [p, CENTRE] : [CENTRE, p];
            const x = lerp(a.x, b.x, u);
            const y = lerp(a.y, b.y, u);
            svg('rect', {x: x - 9, y: y - 7, width: 18, height: 14, rx: 2, fill: teinte(tr.de)}, calque);
            if (!tr.montee && t === 1) {
                svg('text', {x: p.x, y: p.y + (p.y < CENTRE.y ? -20 : 32), 'text-anchor': 'middle', style: `fill:${teinte(tr.de)};font-size:10.5px`}, calque)
                    .textContent = tr.de === 'X' ? 'collision' : tr.station === 'D' ? 'reçue (concerné)' : 'reçue';
            }
        }
        if (e.collision) {
            const r = 8 + 10 * u;
            svg('polygon', {
                points: Array.from({length: 16}, (_, k) => {
                    const ang = (k * Math.PI) / 8;
                    const rr = k % 2 ? r * 0.5 : r;
                    return `${CENTRE.x + rr * Math.cos(ang)},${CENTRE.y - 30 + rr * Math.sin(ang)}`;
                }).join(' '),
                fill: 'var(--margin)',
                opacity: 0.85,
            }, calque);
        }
        if (e.file) {
            e.file.forEach((de, k) => {
                svg('rect', {x: CENTRE.x - 20 + k * 24, y: CENTRE.y + 22, width: 18, height: 14, rx: 2, fill: teinte(de), opacity: Math.min(1, t * 2)}, calque);
            });
            svg('text', {x: CENTRE.x, y: CENTRE.y + 52, 'text-anchor': 'middle', style: 'font-size:10px'}, calque).textContent = 'mémoire du switch';
        }
    }

    const decrire = (i: number) =>
        i === 0
            ? `${mode === 'hub' ? 'Hub' : 'Switch'} : A et C vont émettre vers D. Appuyez sur « Lire ».`
            : `Étape ${i} — ${etapes()[i - 1].note}`;

    const lecteur = sequenceur(controles, lecture, {nb: () => etapes().length, dessiner, decrire, depart: 'debut', duree: 1000});
}
