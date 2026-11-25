/**
 * Exécution pas à pas d'un petit programme Z80 : pour chaque instruction, recherche (opcode fetch :
 * PC sur le bus d'adresses, octet lu dans le RI, PC + 1), décodage, puis exécution (lecture des
 * opérandes éventuels, mise à jour des registres ou du PC).
 * params : {}
 */
import {scene, svg, vider} from './outils';
import {boite, doux, fleche, lerp, sequenceur, zones} from './sequenceur';

const MEMOIRE = [0x3e, 0x3a, 0x06, 0x05, 0x80, 0x3c, 0x00, 0xc3, 0x00, 0x00];

interface Instr {
    adr: number;
    taille: number;
    texte: string;
    effet: string;
    executer: (r: Regs) => void;
}

interface Regs {
    pc: number;
    ri: number | null;
    a: number | null;
    b: number | null;
}

const PROGRAMME: Instr[] = [
    {adr: 0, taille: 2, texte: 'LD A,3Ah', effet: 'A ← 3Ah', executer: (r) => (r.a = 0x3a)},
    {adr: 2, taille: 2, texte: 'LD B,05h', effet: 'B ← 05h', executer: (r) => (r.b = 0x05)},
    {adr: 4, taille: 1, texte: 'ADD A,B', effet: 'A ← A + B', executer: (r) => (r.a = ((r.a ?? 0) + (r.b ?? 0)) & 0xff)},
    {adr: 5, taille: 1, texte: 'INC A', effet: 'A ← A + 1', executer: (r) => (r.a = ((r.a ?? 0) + 1) & 0xff)},
    {adr: 6, taille: 1, texte: 'NOP', effet: 'aucune opération', executer: () => {}},
    {adr: 7, taille: 3, texte: 'JP 0000h', effet: 'PC ← 0000h', executer: (r) => (r.pc = 0)},
];

type Phase = 'fetch' | 'decode' | 'execute';

interface Etape {
    phase: Phase;
    instr: number;
    regs: Regs;
    /** Octets lus en mémoire pendant l'étape (indices). */
    lus: number[];
    adresse: number | null;
    note: string;
}

const hex2 = (v: number | null) => (v === null ? '??' : v.toString(16).toUpperCase().padStart(2, '0'));
const hex4 = (v: number) => v.toString(16).toUpperCase().padStart(4, '0');

function construire(): Etape[] {
    const etapes: Etape[] = [];
    const r: Regs = {pc: 0, ri: null, a: null, b: null};
    PROGRAMME.forEach((ins, k) => {
        const adr = r.pc;
        r.ri = MEMOIRE[adr];
        r.pc = adr + 1;
        etapes.push({
            phase: 'fetch', instr: k, regs: {...r}, lus: [adr], adresse: adr,
            note: `Recherche : le PC (${hex4(adr)}h) est envoyé sur le bus d’adresses, RD/ est activé, l’octet ${hex2(r.ri)}h arrive dans le RI ; le PC passe à ${hex4(r.pc)}h.`,
        });
        const suite = ins.taille > 1 ? ` Il faut lire ${ins.taille - 1} octet${ins.taille > 2 ? 's' : ''} d’opérande en plus.` : ' Pas d’opérande.';
        etapes.push({
            phase: 'decode', instr: k, regs: {...r}, lus: [], adresse: null,
            note: `Décodage : l’unité de contrôle reconnaît ${hex2(r.ri)}h = ${ins.texte}.${suite}`,
        });
        const lus = Array.from({length: ins.taille - 1}, (_, j) => adr + 1 + j);
        r.pc = adr + ins.taille;
        ins.executer(r);
        const ops = lus.length ? `lecture de ${lus.map((j) => hex2(MEMOIRE[j]) + 'h').join(' ')}${lus.length > 1 ? ' (octet de poids faible en premier)' : ''}, puis ` : '';
        etapes.push({
            phase: 'execute', instr: k, regs: {...r}, lus, adresse: lus.length ? lus[0] : null,
            note: `Exécution : ${ops}${ins.effet}. PC = ${hex4(r.pc)}h.`,
        });
    });
    return etapes;
}

const PHASES: Record<Phase, string> = {fetch: '1 · Recherche', decode: '2 · Décodage', execute: '3 · Exécution'};

export default function (el: HTMLElement) {
    const L = 560;
    const H = 300;
    const s = scene(el, {L, H, m: {g: 0, d: 0, h: 0, b: 0}}, 'Exécution pas à pas d’un programme Z80 : recherche, décodage et exécution de chaque instruction');
    const {controles, lecture} = zones(el);
    const calque = svg('g', {}, s);
    const ETAPES = construire();
    const yMem = 30;
    const hMem = 24;
    const xMem = 400;
    const yBusA = 110;
    const yBusD = 190;

    const texte = (x: number, y: number, t: string, style = '', ancre = 'start') => {
        const e = svg('text', {x, y, 'text-anchor': ancre, style: `fill:var(--ink);${style}`}, calque);
        e.textContent = t;
        return e;
    };

    function dessiner(i: number, t: number) {
        vider(calque);
        const et = i > 0 ? ETAPES[i - 1] : null;
        const prec: Regs = i > 1 ? ETAPES[i - 2].regs : {pc: 0, ri: null, a: null, b: null};
        const regs = et ? (t === 1 ? et.regs : {...prec, ...(et.phase === 'fetch' && t > 0.6 ? {ri: et.regs.ri} : {})}) : prec;

        // microprocesseur
        svg('rect', {x: 10, y: 20, width: 230, height: 270, rx: 8, fill: 'var(--accent)', 'fill-opacity': 0.07, stroke: 'currentColor', 'stroke-opacity': 0.5}, calque);
        texte(20, 40, 'Z80', 'font-weight:600');
        const reg = (x: number, y: number, nom: string, val: string, actif: boolean) => {
            texte(x, y + 16, nom, 'font-size:12px');
            boite(calque, x + 28, y, 70, 24, val, {mono: true, gras: actif, fond: actif ? 'var(--accent-soft, var(--paper-2))' : 'var(--paper)', trait: actif ? 'var(--accent)' : undefined});
        };
        const ex = et?.phase === 'execute' && t === 1;
        reg(20, 60, 'PC', hex4(regs.pc) + 'h', !!et && t === 1 && (et.phase === 'fetch' || ex));
        reg(20, 100, 'RI', hex2(regs.ri) + 'h', !!et && et.phase !== 'execute');
        reg(20, 160, 'A', hex2(regs.a) + 'h', ex && /A/.test(PROGRAMME[et!.instr].effet.split('←')[0]));
        reg(20, 200, 'B', hex2(regs.b) + 'h', ex && /B/.test(PROGRAMME[et!.instr].effet.split('←')[0]));
        // unité de contrôle
        boite(calque, 140, 60, 90, 64, '', {fond: et?.phase === 'decode' ? 'var(--accent)' : 'var(--paper-2)'});
        texte(185, 82, 'Unité de', `font-size:11px;${et?.phase === 'decode' ? 'fill:var(--paper)' : ''}`, 'middle');
        texte(185, 96, 'contrôle', `font-size:11px;${et?.phase === 'decode' ? 'fill:var(--paper)' : ''}`, 'middle');
        if (et && et.phase !== 'fetch') {
            texte(185, 115, PROGRAMME[et.instr].texte, `font-size:11px;font-family:var(--font-mono);${et.phase === 'decode' ? 'fill:var(--paper)' : ''}`, 'middle');
        }
        if (et) {
            texte(185, 150, PHASES[et.phase], 'font-size:12px;font-weight:600;fill:var(--accent)', 'middle');
            texte(185, 168, `Instruction ${et.instr + 1} / ${PROGRAMME.length}`, 'font-size:11px;fill:var(--ink-3)', 'middle');
        }

        // bus
        svg('line', {x1: 240, y1: yBusA, x2: xMem - 10, y2: yBusA, stroke: 'currentColor', 'stroke-opacity': 0.35, 'stroke-width': 4}, calque);
        svg('line', {x1: 240, y1: yBusD, x2: xMem - 10, y2: yBusD, stroke: 'currentColor', 'stroke-opacity': 0.35, 'stroke-width': 4}, calque);
        texte(250, yBusA - 8, 'Bus d’adresses', 'font-size:11px;fill:var(--ink-3)');
        texte(250, yBusD + 18, 'Bus de données', 'font-size:11px;fill:var(--ink-3)');

        // mémoire programme
        texte(xMem + 60, yMem - 10, 'Mémoire programme', 'font-size:11px;font-weight:600', 'middle');
        MEMOIRE.forEach((v, k) => {
            const lu = !!et && et.lus.includes(k);
            const y = yMem + k * hMem;
            svg('rect', {x: xMem, y, width: 120, height: hMem, fill: lu ? 'var(--accent)' : 'var(--paper-2)', 'fill-opacity': lu ? 0.25 : 1, stroke: 'currentColor', 'stroke-opacity': 0.4}, calque);
            texte(xMem + 8, y + 16, hex4(k) + 'h', 'font-size:11px;font-family:var(--font-mono);fill:var(--ink-3)');
            texte(xMem + 92, y + 16, hex2(v), `font-size:12px;font-family:var(--font-mono);${lu ? 'font-weight:700' : ''}`);
        });
        // repère du PC
        const yPc = yMem + Math.min(regs.pc, MEMOIRE.length - 1) * hMem + hMem / 2;
        svg('polygon', {points: `${xMem + 124},${yPc} ${xMem + 134},${yPc - 6} ${xMem + 134},${yPc + 6}`, fill: 'var(--accent)'}, calque);
        texte(xMem + 137, yPc + 4, 'PC', 'font-size:10px;fill:var(--accent)');

        if (!et || et.adresse === null) return;
        // adresse : µP → mémoire, puis données : mémoire → µP
        const tA = doux(Math.min(1, t * 2));
        const tD = doux(Math.max(0, t * 2 - 1));
        const yCible = yMem + et.adresse * hMem + hMem / 2;
        fleche(calque, 250, yBusA, lerp(250, xMem - 14, tA), yBusA, 'var(--accent)', {epaisseur: 2});
        texte(lerp(270, xMem - 70, tA), yBusA + 18, hex4(et.adresse) + 'h', 'font-size:12px;font-family:var(--font-mono);fill:var(--accent)');
        texte(250, yBusA + 36, 'RD/ actif', 'font-size:10px;fill:var(--margin)');
        if (t > 0.5) {
            svg('line', {x1: xMem - 10, y1: yBusA, x2: xMem, y2: yCible, stroke: 'var(--accent)', 'stroke-dasharray': '3 3'}, calque);
            const octets = et.lus.map((k) => hex2(MEMOIRE[k])).join(' ');
            fleche(calque, xMem - 14, yBusD, lerp(xMem - 14, 250, tD), yBusD, 'var(--margin)', {epaisseur: 2});
            texte(lerp(xMem - 60, 280, tD), yBusD - 8, octets, 'font-size:12px;font-family:var(--font-mono);fill:var(--margin)');
        }
    }

    const decrire = (i: number) =>
        i === 0
            ? 'Programme LD A,3Ah · LD B,05h · ADD A,B · INC A · NOP · JP 0000h : appuyez sur « Lire ».'
            : `Étape ${i} — ${ETAPES[i - 1].note}`;

    sequenceur(controles, lecture, {nb: () => ETAPES.length, dessiner, decrire, duree: 1300});
}
