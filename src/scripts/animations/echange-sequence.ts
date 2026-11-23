/**
 * Diagramme d'échange (diagramme de séquence) joué pas à pas : chaque message part d'un
 * participant et arrive à l'autre, avec perte éventuelle. Scénarios repris du cours de réseaux.
 * params : { scenario: string }  (voir la table SCENARIOS)
 */
import {scene, svg, vider} from './outils';
import {boite, doux, fleche, lerp, sequenceur, zones} from './sequenceur';

interface Message {
    /** 'd' : de gauche à droite ; 'g' : de droite à gauche. */
    sens: 'd' | 'g';
    texte: string;
    /** Message perdu en route (croix rouge). */
    perdu?: boolean;
    /** Couleur particulière : 'alerte' (rouge) ou 'ok' (accent). */
    ton?: 'alerte' | 'ok';
    /** Attente dessinée avant ce message, côté émetteur (ex. « Timeout delay »). */
    attente?: string;
    /** Explication lue sous la scène. */
    note?: string;
}

interface Scenario {
    titre: string;
    gauche: string;
    droite: string;
    messages: Message[];
}

const SYN = 'demande d’établissement de connexion.';
const ACK = 'acquittement de segments.';
const FIN = 'demande de fin de connexion.';
const RST = 'fermeture anormale de la connexion.';

const SCENARIOS: Record<string, Scenario> = {
    'poignee-de-main': {
        titre: 'Poignée de main générique (exemple du 3-way handshake)',
        gauche: 'Client',
        droite: 'Service',
        messages: [
            {sens: 'd', texte: '', note: 'Premier message de la poignée de main.'},
            {sens: 'g', texte: '', note: 'Réponse du service : la partie distante est bien présente.'},
            {sens: 'd', texte: '', note: 'Troisième message : la connexion est établie (état de connexion suivi des deux côtés).'},
            {sens: 'g', texte: 'Data', note: 'Échange de données.'},
            {sens: 'd', texte: 'Data', note: 'Échange de données.'},
        ],
    },
    'tcp-ouverture': {
        titre: 'Ouvrir une connexion TCP',
        gauche: 'Client',
        droite: 'Service',
        messages: [
            {sens: 'd', texte: 'SYN', note: `SYN : ${SYN}`},
            {sens: 'g', texte: 'SYN + ACK', note: `SYN + ACK : le service accepte (SYN) et acquitte (ACK).`},
            {sens: 'd', texte: 'ACK', note: `ACK : ${ACK} Connexion établie (ESTABLISHED).`},
        ],
    },
    'tcp-echange': {
        titre: 'Échange simple',
        gauche: 'Client',
        droite: 'Service',
        messages: [
            {sens: 'd', texte: 'DATA seq 257-512'},
            {sens: 'g', texte: 'ACK 513', note: 'Le service a reçu jusqu’à l’octet 512 : il attend désormais l’octet 513.'},
            {sens: 'd', texte: 'DATA seq 513-768'},
            {sens: 'g', texte: 'ACK 769', note: 'Le service a reçu jusqu’à l’octet 768 : il attend l’octet 769.'},
        ],
    },
    'tcp-fenetre': {
        titre: 'Acquittements multiples (fenêtre TCP = 1024)',
        gauche: 'Client',
        droite: 'Service',
        messages: [
            {sens: 'd', texte: 'DATA seq 257-512', note: 'La fenêtre permet d’envoyer sans attendre d’acquittement.'},
            {sens: 'd', texte: 'DATA seq 513-768', note: 'Deuxième segment, toujours sans attendre.'},
            {sens: 'd', texte: 'DATA seq 769-1024', note: 'Troisième segment.'},
            {sens: 'g', texte: 'ACK 1025', note: 'Un seul acquittement couvre les trois segments ; la fenêtre « avance ».'},
        ],
    },
    'tcp-perte': {
        titre: 'Perte d’un segment (sans optimisation)',
        gauche: 'Client',
        droite: 'Service',
        messages: [
            {sens: 'd', texte: 'DATA seq 257-512', perdu: true, note: 'Le segment est perdu en route.'},
            {
                sens: 'd',
                texte: 'DATA seq 257-512',
                attente: 'Timeout delay',
                note: 'Sans acquittement avant l’expiration du délai, le client réémet le segment.',
            },
            {sens: 'g', texte: 'ACK 513', note: 'Le segment réémis est acquitté : le service attend l’octet 513.'},
        ],
    },
    'tcp-3ack': {
        titre: 'Perte d’un segment : 3 acquittements dupliqués',
        gauche: 'Client',
        droite: 'Service',
        messages: [
            {sens: 'd', texte: 'DATA seq 257-512'},
            {sens: 'd', texte: 'DATA seq 513-768', perdu: true, note: 'Le segment 513-768 est perdu.'},
            {sens: 'd', texte: 'DATA seq 769-1024'},
            {sens: 'd', texte: 'DATA seq 1025-1280'},
            {sens: 'd', texte: 'DATA seq 1281-1536'},
            {sens: 'd', texte: 'DATA seq 1537-1792'},
            {sens: 'g', texte: 'ACK 513', ton: 'alerte', note: 'Il manque l’octet 513 : le service réclame toujours 513…'},
            {sens: 'g', texte: 'ACK 513', ton: 'alerte', note: '…ACK 513 dupliqué…'},
            {sens: 'g', texte: 'ACK 513', ton: 'alerte', note: '…3 acquittements dupliqués : le segment 513-768 semble perdu.'},
            {sens: 'd', texte: 'DATA seq 513-768', note: 'Le client renvoie rapidement le segment manquant (fast retransmit).'},
            {sens: 'g', texte: 'ACK 1793', ton: 'ok', note: 'Tout est reçu jusqu’à l’octet 1792 : le service attend 1793.'},
        ],
    },
    'tcp-fermeture': {
        titre: 'Fermer une connexion',
        gauche: 'Client',
        droite: 'Service',
        messages: [
            {sens: 'd', texte: 'FIN', note: `FIN : ${FIN}`},
            {sens: 'g', texte: 'FIN + ACK', note: 'FIN + ACK : le service acquitte et demande lui aussi la fin.'},
            {sens: 'd', texte: 'ACK', note: `ACK : ${ACK} La connexion est fermée.`},
        ],
    },
    'tcp-port-ferme': {
        titre: 'Connexion à un port fermé',
        gauche: 'Client',
        droite: 'Service',
        messages: [
            {sens: 'd', texte: 'SYN', note: `SYN : ${SYN}`},
            {sens: 'g', texte: 'RST', ton: 'alerte', note: `RST : ${RST}`},
        ],
    },
    'tcp-rst': {
        titre: 'Retour sur connexion inexistante ou erreur',
        gauche: 'Client',
        droite: 'Service',
        messages: [
            {sens: 'd', texte: 'SYN', note: `SYN : ${SYN}`},
            {sens: 'g', texte: 'SYN + ACK'},
            {sens: 'd', texte: 'RST', ton: 'alerte', note: `RST : ${RST}`},
        ],
    },
    tls: {
        titre: 'Poignée de main TLS',
        gauche: 'Client',
        droite: 'Service',
        messages: [
            {sens: 'd', texte: 'SYN', note: 'Ouverture de la connexion TCP.'},
            {sens: 'g', texte: 'SYN + ACK'},
            {sens: 'd', texte: 'ACK + ClientHello', note: 'Fin de la poignée de main TCP et début de celle de TLS.'},
            {sens: 'g', texte: 'ServerHello + Cert', note: 'Le service répond et présente son certificat.'},
            {sens: 'd', texte: 'ClientKeyExch + ChangeCipher'},
            {sens: 'g', texte: 'ChangeCipher', note: 'Le canal est désormais chiffré.'},
            {sens: 'd', texte: 'Data', ton: 'ok'},
            {sens: 'g', texte: 'Data', ton: 'ok'},
        ],
    },
    dhcp: {
        titre: 'Acquisition d’une adresse via DHCP',
        gauche: 'Client',
        droite: 'DHCP',
        messages: [
            {sens: 'd', texte: 'DHCPDISCOVER', note: 'DHCPDISCOVER : recherche d’un serveur par un client.'},
            {sens: 'g', texte: 'DHCPOFFER', note: 'DHCPOFFER : réponse d’un serveur à une requête initiale.'},
            {sens: 'd', texte: 'DHCPREQUEST', note: 'DHCPREQUEST : réservation d’une adresse.'},
            {
                sens: 'g',
                texte: 'DHCPACK',
                ton: 'ok',
                note: 'DHCPACK : confirmation de la réservation et informations supplémentaires.',
            },
        ],
    },
    dhcpv6: {
        titre: 'Acquisition via DHCPv6 avec état',
        gauche: 'Client',
        droite: 'DHCPv6',
        messages: [
            {sens: 'd', texte: 'SOLICIT'},
            {sens: 'g', texte: 'ADVERTISE'},
            {sens: 'd', texte: 'REQUEST'},
            {sens: 'g', texte: 'REPLY', ton: 'ok'},
        ],
    },
    ping: {
        titre: 'Utilitaire ping',
        gauche: 'Source',
        droite: 'Destination',
        messages: [
            {sens: 'd', texte: 'echo-request', note: 'ICMP Echo Request (type 8, code 0).'},
            {sens: 'g', texte: 'echo-reply', ton: 'ok', note: 'ICMP Echo Reply (type 0, code 0).'},
        ],
    },
};

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const sc = SCENARIOS[String(params.scenario ?? 'tcp-ouverture')] ?? SCENARIOS['tcp-ouverture'];
    const n = sc.messages.length;
    const pasY = 34;
    const hautTete = 30;
    const y0 = 14 + hautTete + 16;
    // disposition resserrée sur petit écran : le texte reste lisible une fois le SVG réduit
    const etroit = el.clientWidth > 0 && el.clientWidth < 500;
    const L = etroit ? 380 : 560;
    const H = y0 + n * pasY + 24;
    const s = scene(el, {L, H, m: {g: 0, d: 0, h: 0, b: 0}}, `Diagramme d’échange : ${sc.titre}`);
    const {controles, lecture} = zones(el);
    const calque = svg('g', {}, s);

    const xG = etroit ? 62 : 120;
    const xD = etroit ? 318 : 440;
    const lTete = etroit ? 96 : 104;
    const pente = 20;

    const couleur = (m: Message, actif: boolean) =>
        m.ton === 'alerte' ? 'var(--margin)' : m.ton === 'ok' || actif ? 'var(--accent)' : 'currentColor';

    function dessiner(i: number, t: number) {
        vider(calque);
        // participants et lignes de vie
        for (const [x, nom] of [[xG, sc.gauche], [xD, sc.droite]] as const) {
            boite(calque, x - lTete / 2, 14, lTete, hautTete, nom, {gras: true});
            fleche(calque, x, 14 + hautTete, x, H - 8, 'currentColor', {epaisseur: 1.1});
        }
        for (let k = 1; k <= i; k++) {
            const m = sc.messages[k - 1];
            const actif = k === i;
            const avance = actif ? doux(t) : 1;
            const y = y0 + (k - 1) * pasY;
            const [xa, xb] = m.sens === 'd' ? [xG, xD] : [xD, xG];
            const fin = m.perdu ? 0.72 : 1;
            const xf = lerp(xa, xb, fin * avance);
            const yf = lerp(y, y + pente, fin * avance);
            const col = couleur(m, actif);
            if (m.attente) {
                const yA = y - pasY + pente + 4;
                fleche(calque, xa, yA, xa, y - 2, 'var(--ink-3)', {epaisseur: 1, pointilles: true});
                svg('text', {x: xa + (m.sens === 'd' ? 10 : -10), y: (yA + y) / 2 + 4, 'text-anchor': m.sens === 'd' ? 'start' : 'end', 'font-style': 'italic'}, calque).textContent = m.attente;
            }
            fleche(calque, xa, y, xf, yf, col, {epaisseur: actif ? 2 : 1.4, pointe: !(m.perdu && avance === 1)});
            if (m.perdu && avance === 1) {
                for (const sg of [1, -1]) {
                    svg('line', {x1: xf - 5, y1: yf - 5 * sg, x2: xf + 5, y2: yf + 5 * sg, stroke: 'var(--margin)', 'stroke-width': 2}, calque);
                }
            }
            if (actif && t < 1) {
                svg('rect', {x: xf - 7, y: yf - 5, width: 14, height: 10, rx: 2, fill: col}, calque);
            }
            if (m.texte) {
                // angle mesuré de gauche à droite : le texte reste lisible quel que soit le sens
                const [yGauche, yDroite] = m.sens === 'd' ? [y, y + pente] : [y + pente, y];
                const ang = (Math.atan2(yDroite - yGauche, xD - xG) * 180) / Math.PI;
                const xm = (xa + xb) / 2;
                const ym = y + pente / 2 - 6;
                const tx = svg('text', {
                    x: xm,
                    y: ym,
                    'text-anchor': 'middle',
                    transform: `rotate(${ang} ${xm} ${ym})`,
                    style: `fill:${col === 'currentColor' ? 'var(--ink-2)' : col};font-size:12px;opacity:${actif ? Math.min(1, t * 2 + 0.2) : 1}`,
                }, calque);
                tx.textContent = m.texte;
            }
        }
    }

    function decrire(i: number) {
        if (i === 0) return `${sc.titre} : appuyez sur « Lire » ou avancez étape par étape.`;
        const m = sc.messages[i - 1];
        const de = m.sens === 'd' ? sc.gauche : sc.droite;
        const vers = m.sens === 'd' ? sc.droite : sc.gauche;
        const quoi = m.texte ? ` : ${m.texte}` : '';
        const perte = m.perdu ? ' (perdu)' : '';
        return `Étape ${i} — ${de} → ${vers}${quoi}${perte}.${m.note ? ' ' + m.note : ''}`;
    }

    sequenceur(controles, lecture, {nb: () => n, dessiner, decrire});
}
