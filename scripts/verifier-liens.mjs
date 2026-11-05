// Vérifie les liens internes et les ancres de dist/ (à lancer après « npm run build »).
import fs from 'node:fs';
import path from 'node:path';

const racine = 'dist';
const pages = [];
(function parcourir(d) {
    for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) parcourir(p);
        else if (p.endsWith('.html')) pages.push(p);
    }
})(racine);

const sansScripts = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '');
let total = 0;
const erreurs = [];
for (const page of pages) {
    const html = sansScripts(fs.readFileSync(page, 'utf8'));
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
        if (/^(https?:|mailto:|data:)/.test(href)) continue;
        total++;
        const [chemin, ancre] = href.split('#');
        if (chemin === '') {
            if (ancre && !ids.has(ancre)) erreurs.push(`${page} → ancre absente ${href}`);
            continue;
        }
        let cible = path.join(racine, chemin);
        if (chemin.endsWith('/')) cible = path.join(cible, 'index.html');
        if (!fs.existsSync(cible)) {
            erreurs.push(`${page} → lien cassé ${href}`);
            continue;
        }
        if (ancre && !fs.readFileSync(cible, 'utf8').includes(`id="${ancre}"`)) erreurs.push(`${page} → ancre absente ${href}`);
    }
}
console.log(`${pages.length} pages, ${total} liens internes vérifiés, ${erreurs.length} erreur(s).`);
erreurs.forEach((e) => console.error('  ✗ ' + e));
process.exit(erreurs.length ? 1 : 0);
