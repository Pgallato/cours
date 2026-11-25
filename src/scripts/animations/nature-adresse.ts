/**
 * « Quelle est la nature de cette adresse ? » : une adresse IPv4 ou IPv6 tirée au hasard dans les
 * plages remarquables du cours (indéfinie, bouclage, privée / Unique-Local, locale au lien,
 * multicast, broadcast, publique / Global-Unicast) ; on clique la catégorie, la plage est rappelée.
 * params : { version?: 4 | 6 }  (les deux par défaut)
 */
import {bouton, zones} from './sequenceur';

type Categorie = 'indefinie' | 'bouclage' | 'privee' | 'lien' | 'multicast' | 'broadcast' | 'publique';

const NOMS: Record<Categorie, string> = {
    indefinie: 'Indéfinie',
    bouclage: 'Bouclage (loopback)',
    privee: 'Privée / Unique-Local',
    lien: 'Locale au lien (APIPA / Link-Local)',
    multicast: 'Multicast',
    broadcast: 'Broadcast (diffusion)',
    publique: 'Publique / Global-Unicast',
};

const a = (x: number, y: number) => x + Math.floor(Math.random() * (y - x + 1));
const h = (n = 4) => a(0, 16 ** n - 1).toString(16);
const choisir = <T, >(t: T[]) => t[Math.floor(Math.random() * t.length)];

interface Tirage {
    adresse: string;
    cat: Categorie;
    plage: string;
}

const GENERATEURS: Record<4 | 6, (() => Tirage)[]> = {
    4: [
        () => ({adresse: '0.0.0.0', cat: 'indefinie', plage: '0.0.0.0/0 : adresse indéfinie (aussi la route par défaut)'}),
        () => ({adresse: '255.255.255.255', cat: 'broadcast', plage: '255.255.255.255/32 : broadcast général'}),
        () => ({adresse: `127.${a(0, 255)}.${a(0, 255)}.${a(1, 254)}`, cat: 'bouclage', plage: '127.0.0.0/8 : boucle locale'}),
        () => ({adresse: `10.${a(0, 255)}.${a(0, 255)}.${a(1, 254)}`, cat: 'privee', plage: '10.0.0.0/8 : plage privée'}),
        () => ({adresse: `172.${a(16, 31)}.${a(0, 255)}.${a(1, 254)}`, cat: 'privee', plage: '172.16.0.0/12 (172.16 à 172.31) : plage privée'}),
        () => ({adresse: `192.168.${a(0, 255)}.${a(1, 254)}`, cat: 'privee', plage: '192.168.0.0/16 : plage privée'}),
        () => ({adresse: `169.254.${a(1, 254)}.${a(1, 254)}`, cat: 'lien', plage: '169.254.0.0/16 : adressage automatique APIPA'}),
        () => ({adresse: choisir(['224.0.0.1', '224.0.0.2', '224.0.0.5', '224.0.0.9', '224.0.0.18', '224.0.0.22', `239.${a(0, 255)}.${a(0, 255)}.${a(1, 254)}`]), cat: 'multicast', plage: '224.0.0.0 à 239.255.255.255 (ancienne classe D) : multicast'}),
        () => {
            // publique : on évite les plages spéciales (et 172.16/12 par prudence sur 172)
            const o1 = choisir([8, 31, 45, 51, 62, 77, 81, 90, 104, 141, 151, 185, 193, 212]);
            return {adresse: `${o1}.${a(0, 255)}.${a(0, 255)}.${a(1, 254)}`, cat: 'publique', plage: 'hors des plages réservées : adresse publique, routable sur Internet'};
        },
        () => {
            const o = [choisir([10, 172, 192]), 0, 0];
            if (o[0] === 10) return {adresse: `10.${a(0, 255)}.${a(0, 255)}.255`, cat: 'privee', plage: '10.0.0.0/8 : privée (attention, sans masque on ne peut pas dire si c’est une diffusion)'};
            if (o[0] === 172) return {adresse: `172.${choisir([15, 32])}.${a(0, 255)}.${a(1, 254)}`, cat: 'publique', plage: 'piège : 172.16.0.0/12 ne va que de 172.16 à 172.31 → adresse publique'};
            return {adresse: `192.169.${a(0, 255)}.${a(1, 254)}`, cat: 'publique', plage: 'piège : 192.169 n’est pas dans 192.168.0.0/16 → adresse publique'};
        },
    ],
    6: [
        () => ({adresse: '::', cat: 'indefinie', plage: '::/128 : adresse indéfinie'}),
        () => ({adresse: '::1', cat: 'bouclage', plage: '::1/128 : bouclage (équivalent de 127.0.0.1)'}),
        () => ({adresse: `fe80::${h()}:${h()}:${h()}:${h()}`, cat: 'lien', plage: 'fe80::/10 : Link-Local, indispensable mais non routable'}),
        () => ({adresse: `fd${h(2)}:${h()}:${h()}::${h()}`, cat: 'privee', plage: 'fd00::/8 (dans fc00::/7) : Unique-Local attribuée localement ≈ adresse privée'}),
        () => ({adresse: `fc${h(2)}:${h()}::${h()}`, cat: 'privee', plage: 'fc00::/8 (dans fc00::/7) : Unique-Local à affectation centralisée'}),
        () => ({adresse: choisir(['ff02::1', 'ff02::2', 'ff02::5', 'ff02::9', 'ff02::1:2']), cat: 'multicast', plage: 'ff00::/8 : multicast (ff02:: = portée lien)'}),
        () => ({adresse: `${choisir(['2001', '2a01', '2a00', '2600', '2c0f', '3fff'])}:${h()}:${h()}::${h()}`, cat: 'publique', plage: '2000::/3 : Global-Unicast, adresse publique'}),
        () => ({adresse: `2001:db8:${h()}::${h()}`, cat: 'publique', plage: '2001:db8::/32 : dans 2000::/3, mais réservé à la documentation'}),
    ],
};

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const versions: (4 | 6)[] = params.version === 4 ? [4] : params.version === 6 ? [6] : [4, 6];
    const carte = document.createElement('p');
    carte.style.cssText =
        'text-align:center;font-family:var(--font-mono);font-size:clamp(1.1rem,4vw,1.6rem);font-weight:600;color:var(--ink);padding:0.9rem 0.5rem;border:1px solid var(--line-strong);border-radius:0.7rem;background:var(--paper-2);overflow-wrap:anywhere';
    const choix = document.createElement('div');
    choix.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr));gap:0.45rem;margin-top:0.7rem';
    el.append(carte, choix);
    const {controles, lecture} = zones(el);

    let tirage: Tirage;
    let repondu = false;
    let justes = 0;
    let total = 0;
    let serie = 0;

    const boutons = (Object.keys(NOMS) as Categorie[]).map((cat) => {
        const b = bouton(choix, NOMS[cat], NOMS[cat], () => repondre(cat));
        b.style.textAlign = 'left';
        b.dataset.cat = cat;
        return b;
    });

    function nouveau() {
        tirage = choisir(GENERATEURS[choisir(versions)])();
        carte.textContent = tirage.adresse;
        repondu = false;
        boutons.forEach((b) => {
            b.disabled = false;
            b.style.borderColor = 'var(--line-strong)';
            b.style.background = 'var(--paper-2)';
            b.style.opacity = '1';
        });
        lecture.textContent = `Quelle est la nature de cette adresse${versions.length > 1 ? ' (IPv4 ou IPv6)' : ''} ?`;
    }

    function repondre(cat: Categorie) {
        if (repondu) return;
        repondu = true;
        total++;
        const ok = cat === tirage.cat;
        if (ok) {
            justes++;
            serie++;
        } else serie = 0;
        boutons.forEach((b) => {
            b.disabled = true;
            if (b.dataset.cat === tirage.cat) {
                b.style.borderColor = 'oklch(55% 0.14 150)';
                b.style.background = 'oklch(55% 0.14 150 / 0.12)';
            } else if (b.dataset.cat === cat) {
                b.style.borderColor = 'var(--margin)';
                b.style.background = 'oklch(66% 0.14 22 / 0.1)';
            } else b.style.opacity = '0.55';
        });
        lecture.innerHTML = `${ok ? '✓ Exact' : `✗ C’est « ${NOMS[tirage.cat]} »`} — <strong>${tirage.plage}</strong>. ` +
            `Score : ${justes} / ${total}${serie > 2 ? ` · série de ${serie} !` : ''}`;
    }

    bouton(controles, 'Adresse suivante', 'Tirer une nouvelle adresse', nouveau);
    nouveau();
}
