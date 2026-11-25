/**
 * Entraînement au calcul de sous-réseau IPv4 : une adresse et un préfixe CIDR tirés au hasard,
 * l'élève saisit masque, numéro de réseau, adresse de diffusion et nombre d'adresses d'hôtes,
 * puis la correction détaille le calcul en binaire (Adresse & Masque, Réseau + !Masque).
 * params : { min?: number, max?: number }  (bornes du préfixe tiré, 8 et 30 par défaut)
 */
import {bouton, zones} from './sequenceur';
import {normaliser} from '../revision/outils';

const versOctets = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const pointee = (n: number) => versOctets(n).join('.');
const masqueDe = (p: number) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
/** 32 bits groupés par octets ; « | » remplace le séparateur à la frontière réseau / hôte. */
function binaire(n: number, p: number) {
    let s = '';
    for (let k = 0; k < 32; k++) {
        if (k === p && p > 0) s += '|';
        else if (k > 0 && k % 8 === 0) s += '.';
        s += (n >>> (31 - k)) & 1;
    }
    return s;
}
const alea = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** Adresse plausible : privée la plupart du temps, sinon « publique » hors plages spéciales. */
function tirerAdresse(): number {
    const r = Math.random();
    const o =
        r < 0.35 ? [192, 168, alea(0, 255), alea(1, 254)]
            : r < 0.6 ? [10, alea(0, 255), alea(0, 255), alea(1, 254)]
                : r < 0.8 ? [172, alea(16, 31), alea(0, 255), alea(1, 254)]
                    : [alea(1, 223), alea(0, 255), alea(0, 255), alea(1, 254)];
    if (o[0] === 127 || o[0] === 0) o[0] = 81;
    return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}

export default function (el: HTMLElement, params: Record<string, unknown>) {
    const min = Number(params.min ?? 8);
    const max = Number(params.max ?? 30);
    const enonce = document.createElement('p');
    enonce.style.cssText = 'font-size:1.05rem;margin-bottom:0.6rem';
    const grille = document.createElement('div');
    grille.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:0.6rem 1rem';
    const correction = document.createElement('pre');
    correction.style.cssText =
        'margin-top:0.8rem;font-family:var(--font-mono);font-size:0.78rem;line-height:1.55;padding:0.6rem 0.8rem;border-radius:0.5rem;background:var(--paper-2);overflow-x:auto;white-space:pre';
    correction.hidden = true;
    el.append(enonce, grille, correction);
    const {controles, lecture} = zones(el);

    const champs = [
        {cle: 'masque', titre: 'Masque (notation décimale pointée)', aide: 'ex. 255.255.255.0'},
        {cle: 'reseau', titre: 'Numéro (adresse) de réseau', aide: 'Adresse & Masque'},
        {cle: 'diffusion', titre: 'Adresse de diffusion (broadcast)', aide: 'Réseau + !Masque'},
        {cle: 'hotes', titre: "Nombre d'adresses utilisables pour les hôtes", aide: 'sans le réseau ni la diffusion'},
    ].map((c) => {
        const lab = document.createElement('label');
        lab.style.cssText = 'display:grid;gap:0.2rem;font-size:0.88rem;color:var(--ink-2)';
        const t = document.createElement('span');
        t.textContent = c.titre;
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.placeholder = c.aide;
        input.style.cssText =
            'font-family:var(--font-mono);font-size:0.95rem;padding:0.35rem 0.55rem;border:1px solid var(--line-strong);border-radius:0.45rem;background:var(--paper);color:var(--ink);width:100%';
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') verifier();
        });
        lab.append(t, input);
        grille.appendChild(lab);
        return {...c, input};
    });

    let adresse = 0;
    let prefixe = 24;
    let reussis = 0;
    let faits = 0;

    const attendu = () => {
        const m = masqueDe(prefixe);
        const reseau = (adresse & m) >>> 0;
        const diffusion = (reseau | (~m >>> 0)) >>> 0;
        const hotes = prefixe >= 31 ? 0 : 2 ** (32 - prefixe) - 2;
        return {m, reseau, diffusion, hotes};
    };

    function nouveau() {
        adresse = tirerAdresse();
        prefixe = alea(min, max);
        enonce.innerHTML = `Adresse : <strong style="font-family:var(--font-mono)">${pointee(adresse)}/${prefixe}</strong>`;
        for (const c of champs) {
            c.input.value = '';
            c.input.disabled = false;
            c.input.style.borderColor = 'var(--line-strong)';
            c.input.style.background = 'var(--paper)';
        }
        correction.hidden = true;
        lecture.textContent = 'Calculez les quatre valeurs, puis « Vérifier » (ou Entrée).';
    }

    function verifier() {
        const a = attendu();
        const bonnes: Record<string, string[]> = {
            masque: [pointee(a.m), `/${prefixe}`],
            reseau: [pointee(a.reseau), `${pointee(a.reseau)}/${prefixe}`],
            diffusion: [pointee(a.diffusion)],
            hotes: [String(a.hotes), a.hotes.toLocaleString('fr-FR')],
        };
        let justes = 0;
        for (const c of champs) {
            const ok = bonnes[c.cle].map(normaliser).includes(normaliser(c.input.value));
            if (ok) justes++;
            c.input.style.borderColor = ok ? 'oklch(55% 0.14 150)' : 'var(--margin)';
            c.input.style.background = ok ? 'oklch(55% 0.14 150 / 0.1)' : 'oklch(66% 0.14 22 / 0.08)';
            c.input.setAttribute('aria-invalid', String(!ok));
        }
        faits++;
        if (justes === champs.length) reussis++;
        lecture.textContent =
            (justes === champs.length ? '✓ Tout est juste !' : `${justes} / ${champs.length} valeur(s) juste(s).`) +
            ` Exercices réussis : ${reussis} / ${faits}.`;
        afficherCorrection();
    }

    function afficherCorrection() {
        const a = attendu();
        const n = 32 - prefixe;
        correction.textContent = [
            `Adresse    ${pointee(adresse).padEnd(16)} ${binaire(adresse, prefixe)}`,
            `Masque /${String(prefixe).padEnd(2)} ${pointee(a.m).padEnd(16)} ${binaire(a.m, prefixe)}`,
            `Réseau     ${pointee(a.reseau).padEnd(16)} ${binaire(a.reseau, prefixe)}   (Adresse & Masque)`,
            `Diffusion  ${pointee(a.diffusion).padEnd(16)} ${binaire(a.diffusion, prefixe)}   (bits d'hôte à 1)`,
            '',
            `Bits d'hôte : 32 − ${prefixe} = ${n} → 2^${n} = ${(2 ** n).toLocaleString('fr-FR')} adresses dans le réseau,`,
            prefixe >= 31
                ? '  (cas particulier /31 et /32 : pas d’adresse de réseau ni de diffusion à retirer.)'
                : `  dont ${a.hotes.toLocaleString('fr-FR')} pour les hôtes (on retire le réseau et la diffusion) :`,
            prefixe >= 31 ? '' : `  de ${pointee(a.reseau + 1)} à ${pointee(a.diffusion - 1)}.`,
            '',
            'Le « | » sépare la partie réseau (à gauche) de la partie hôte.',
        ].join('\n');
        correction.hidden = false;
    }

    bouton(controles, 'Vérifier', 'Vérifier mes réponses', verifier);
    bouton(controles, 'Correction', 'Afficher la correction détaillée', () => {
        for (const c of champs) c.input.disabled = true;
        afficherCorrection();
    });
    bouton(controles, 'Nouvel exercice', 'Tirer une nouvelle adresse', nouveau);

    nouveau();
}
