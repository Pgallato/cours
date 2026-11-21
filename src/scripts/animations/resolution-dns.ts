/**
 * Circulation d'une requête DNS (résolution itérative de www.free.fr) : client, résolveur,
 * racine, autorité .FR, serveurs de Free. Libellés et étapes repris du cours.
 * params : {}
 */
import {scene, svg, vider} from './outils';
import {boite, doux, fleche, lerp, sequenceur, zones} from './sequenceur';

type Noeud = 'client' | 'resolveur' | 'racine' | 'fr' | 'free';

const POS: Record<Noeud, {x: number; y: number; nom: string; l: number}> = {
    client: {x: 52, y: 150, nom: 'Client', l: 80},
    resolveur: {x: 205, y: 150, nom: 'Résolveur', l: 96},
    racine: {x: 482, y: 26, nom: 'Racine', l: 120},
    fr: {x: 482, y: 150, nom: 'Autorité .FR', l: 120},
    free: {x: 482, y: 274, nom: 'Serveurs Free', l: 120},
};

const ETAPES: {de: Noeud; vers: Noeud; texte: string; note: string}[] = [
    {
        de: 'client', vers: 'resolveur', texte: 'www.free.fr ?',
        note: 'Le client se pose une question : www.free.fr ? Il envoie sa requête à son serveur de rattachement.',
    },
    {
        de: 'resolveur', vers: 'racine', texte: 'fr. ?',
        note: 'Le résolveur ne connaît pas ce nom ni cette racine. Il demande à un serveur racine qui gère ce TLD.',
    },
    {de: 'racine', vers: 'resolveur', texte: 'Goto X.X.X.X', note: 'Le serveur racine le renvoie vers un serveur autoritaire .FR.'},
    {de: 'resolveur', vers: 'fr', texte: 'free.fr. ?', note: 'Le serveur repose sa question pour le domaine de second niveau.'},
    {de: 'fr', vers: 'resolveur', texte: 'Goto Y.Y.Y.Y', note: 'Une nouvelle autorité est renvoyée, celle de Free.'},
    {de: 'resolveur', vers: 'free', texte: 'www.free.fr. ?', note: 'Le serveur interroge les DNS de Free, désormais connus.'},
    {de: 'free', vers: 'resolveur', texte: 'Is Z.Z.Z.Z', note: 'La réponse définitive est enfin obtenue…'},
    {de: 'resolveur', vers: 'client', texte: 'Is Z.Z.Z.Z', note: '…et renvoyée au client.'},
];

export default function (el: HTMLElement) {
    const L = 560;
    const H = 300;
    const s = scene(el, {L, H, m: {g: 0, d: 0, h: 0, b: 0}}, 'Circulation d’une requête DNS pour www.free.fr');
    const {controles, lecture} = zones(el);
    const calque = svg('g', {}, s);

    /** Extrémités d'un message : décalé de ±5 px selon le sens pour séparer aller et retour. */
    function segment(de: Noeud, vers: Noeud) {
        const a = POS[de];
        const b = POS[vers];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const ux = dx / d;
        const uy = dy / d;
        // sortir des boîtes (approximation par la demi-largeur projetée)
        const ra = Math.min(a.l / 2 / Math.abs(ux || 1e-6), 16 / Math.abs(uy || 1e-6)) + 3;
        const rb = Math.min(b.l / 2 / Math.abs(ux || 1e-6), 16 / Math.abs(uy || 1e-6)) + 3;
        // le décalage perpendiculaire change de côté avec le sens : aller et retour ne se superposent pas
        const ox = -uy * 5;
        const oy = ux * 5;
        return {x1: a.x + ux * ra + ox, y1: a.y + uy * ra + oy, x2: b.x - ux * rb + ox, y2: b.y - uy * rb + oy};
    }

    function dessiner(i: number, t: number) {
        vider(calque);
        for (const k of Object.keys(POS) as Noeud[]) {
            const p = POS[k];
            boite(calque, p.x - p.l / 2, p.y - 14, p.l, 28, p.nom, {gras: true});
        }
        for (let k = 1; k <= i; k++) {
            const e = ETAPES[k - 1];
            const actif = k === i;
            const av = actif ? doux(t) : 1;
            const sg = segment(e.de, e.vers);
            const x2 = lerp(sg.x1, sg.x2, av);
            const y2 = lerp(sg.y1, sg.y2, av);
            const col = actif ? 'var(--accent)' : 'var(--ink-3)';
            fleche(calque, sg.x1, sg.y1, x2, y2, col, {epaisseur: actif ? 2 : 1.2});
            if (actif && t < 1) svg('circle', {cx: x2, cy: y2, r: 5, fill: col}, calque);
            if (!actif || t > 0.5) {
                // étiquette : numéro + texte, placée à côté du milieu du segment
                const diag = Math.abs(sg.y2 - sg.y1) > 20;
                const f = diag ? (e.de === 'resolveur' ? 0.62 : 0.38) : 0.5;
                const xm = sg.x1 + (sg.x2 - sg.x1) * f;
                const ym = sg.y1 + (sg.y2 - sg.y1) * f;
                const nx = -(sg.y2 - sg.y1);
                const ny = sg.x2 - sg.x1;
                const nn = Math.hypot(nx, ny);
                const lx = xm + (nx / nn) * 15;
                const ly = ym + (ny / nn) * 15 + 4;
                svg('text', {
                    x: lx,
                    y: ly,
                    'text-anchor': 'middle',
                    style: `fill:${actif ? 'var(--accent)' : 'var(--ink-2)'};font-size:10.5px;font-family:var(--font-mono)`,
                }, calque).textContent = `${k}. ${e.texte}`;
            }
        }
    }

    const decrire = (i: number) =>
        i === 0 ? 'Résolution de www.free.fr : appuyez sur « Lire ».' : `Étape ${i} — ${ETAPES[i - 1].note}`;

    sequenceur(controles, lecture, {nb: () => ETAPES.length, dessiner, decrire, duree: 1000});
}
