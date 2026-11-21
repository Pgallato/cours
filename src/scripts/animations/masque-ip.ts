/**
 * Masque de sous-réseau IPv4 : à partir d'une adresse et d'une longueur de préfixe (CIDR),
 * calcule masque, numéro de réseau (Adresse & Masque), numéro d'hôte (Adresse & !Masque)
 * et adresse de diffusion, en décimal (blocs sur 3 chiffres comme dans le cours) et en binaire.
 * Signale les plages remarquables vues en cours.
 * params : { ip?: string, prefixe?: number }
 */
import {curseur, scene, svg, vider} from './outils';
import {zones} from './sequenceur';

const PLAGES: [string, number, string][] = [
    ['10.0.0.0', 8, 'adresse à usage privé (10.0.0.0/8)'],
    ['172.16.0.0', 12, 'adresse à usage privé (172.16.0.0/12)'],
    ['192.168.0.0', 16, 'adresse à usage privé (192.168.0.0/16)'],
    ['127.0.0.0', 8, 'loopback (127.0.0.0/8)'],
    ['169.254.0.0', 16, 'APIPA (169.254.0.0/16)'],
    ['100.64.0.0', 10, 'Carrier Grade NAT (100.64.0.0/10)'],
    ['192.0.0.0', 24, 'réservé IETF (192.0.0.0/24)'],
    ['192.0.2.0', 24, 'Test 1 / Doc (192.0.2.0/24)'],
    ['192.88.99.0', 24, '6to4 anycast (192.88.99.0/24)'],
    ['198.51.100.0', 24, 'Test 2 / Doc (198.51.100.0/24)'],
    ['203.0.113.0', 24, 'Test 3 / Doc (203.0.113.0/24)'],
];

const versEntier = (o: number[]) => ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
const versOctets = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const masqueDe = (p: number) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

function lire(texte: string): number[] | null {
    const m = texte.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const o = m.slice(1).map(Number);
    return o.every((x) => x <= 255) ? o : null;
}

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const L = 560;
    const H = 196;
    const s = scene(el, {L, H, m: {g: 0, d: 0, h: 0, b: 0}}, 'Calcul du numéro de réseau, du numéro d’hôte et de l’adresse de diffusion');
    const {controles, lecture} = zones(el);
    const calque = svg('g', {}, s);

    // champ adresse
    const lab = document.createElement('label');
    const titre = document.createElement('span');
    titre.textContent = 'Adresse IPv4';
    const champ = document.createElement('input');
    champ.type = 'text';
    champ.inputMode = 'decimal';
    champ.spellcheck = false;
    champ.value = String(params.ip ?? '192.0.2.131');
    champ.style.cssText =
        'font-family:var(--font-mono);font-size:0.95rem;padding:0.3rem 0.5rem;border:1px solid var(--line-strong);border-radius:0.45rem;background:var(--paper);color:var(--ink);width:100%';
    lab.append(titre, champ);
    controles.appendChild(lab);
    champ.addEventListener('input', dessiner);
    const pre = curseur(controles, {label: 'préfixe', min: 0, max: 32, pas: 1, valeur: Number(params.prefixe ?? 24), format: (v) => `/${v}`}, dessiner);

    const xNom = 92;
    const xDec = 100;
    const xBin = 232;
    const lBit = 9.3;

    function dessiner() {
        vider(calque);
        const o = lire(champ.value);
        champ.setAttribute('aria-invalid', String(!o));
        champ.style.borderColor = o ? 'var(--line-strong)' : 'var(--margin)';
        const p = pre.valeur();
        if (!o) {
            svg('text', {x: L / 2, y: H / 2, 'text-anchor': 'middle', style: 'fill:var(--margin);font-size:13px'}, calque).textContent =
                'Adresse invalide : 4 nombres de 0 à 255 séparés par des points.';
            lecture.textContent = 'Saisir une adresse IPv4 valide (ex. 192.0.2.131) : 265.125.9.1 n’en est pas une !';
            return;
        }
        const a = versEntier(o);
        const m = masqueDe(p);
        const reseau = (a & m) >>> 0;
        const hote = (a & ~m) >>> 0;
        const diffusion = (reseau | (~m >>> 0)) >>> 0;
        const lignes: [string, number, string?][] = [
            ['Adresse', a],
            ['Masque', m],
            ['Réseau', reseau, 'Adresse & Masque'],
            ['Hôte', hote, 'Adresse & !Masque'],
            ['Diffusion', diffusion, 'Réseau + !Masque'],
        ];
        svg('text', {x: xDec, y: 14, style: 'font-size:10px'}, calque).textContent = 'décimal';
        svg('text', {x: xBin, y: 14, style: 'font-size:10px'}, calque).textContent = `binaire (bits de réseau en couleur, préfixe /${p})`;
        lignes.forEach(([nom, v, aide], r) => {
            const y = 36 + r * 32;
            if (r === 2) svg('line', {x1: 8, x2: L - 8, y1: y - 19, y2: y - 19, stroke: 'currentColor', 'stroke-opacity': 0.25}, calque);
            svg('text', {x: xNom, y, 'text-anchor': 'end', style: 'font-weight:600;fill:var(--ink-2)'}, calque).textContent = nom;
            if (aide) svg('text', {x: xNom, y: y + 11, 'text-anchor': 'end', style: 'font-size:8.5px'}, calque).textContent = aide;
            svg('text', {x: xDec, y, style: 'font-family:var(--font-mono);fill:var(--ink)'}, calque).textContent = versOctets(v)
                .map((x) => String(x).padStart(3, '0'))
                .join('.');
            for (let k = 0; k < 32; k++) {
                const bit = (v >>> (31 - k)) & 1;
                svg('text', {
                    x: xBin + k * lBit + Math.floor(k / 8) * 6,
                    y,
                    style: `font-family:var(--font-mono);font-size:11.5px;fill:${k < p ? 'var(--accent)' : 'var(--ink-3)'};${bit ? 'font-weight:600' : ''}`,
                }, calque).textContent = String(bit);
            }
        });
        // trait de séparation réseau | hôte
        const pos = (k: number) => xBin + k * lBit + Math.floor(k / 8) * 6;
        const xs = p === 0 ? pos(0) - 3 : p === 32 ? pos(31) + 10 : (pos(p - 1) + 7 + pos(p)) / 2;
        svg('line', {x1: xs, x2: xs, y1: 20, y2: 36 + 4 * 32 + 6, stroke: 'var(--margin)', 'stroke-width': 1.5, 'stroke-dasharray': '3 2'}, calque);

        const nb = 2 ** (32 - p);
        const notes: string[] = [];
        for (const [base, pl, nom] of PLAGES) {
            const b = versEntier(lire(base)!);
            if (((a & masqueDe(pl)) >>> 0) === b) notes.push(nom);
        }
        if (o[0] >= 224 && o[0] <= 239) notes.push('multidiffusion (ancienne classe D)');
        if (o[0] >= 240) notes.push('ancienne classe E (réservée)');
        const classe = o[0] < 128 ? 'A' : o[0] < 192 ? 'B' : o[0] < 224 ? 'C' : o[0] < 240 ? 'D' : 'E';
        lecture.textContent =
            `/${p} : masque ${versOctets(m).join('.')}, soit ${nb.toLocaleString('fr-FR')} adresse${nb > 1 ? 's' : ''} dans ce réseau ` +
            `(de ${versOctets(reseau).join('.')} à ${versOctets(diffusion).join('.')}). ` +
            `Classe historique ${classe}.` +
            (notes.length ? ` Plage remarquable : ${notes.join(', ')}.` : '');
    }

    dessiner();
}
