// Génère dist/sw.js après le build : un service worker qui met en cache TOUT le site
// (pages, assets, index Pagefind) pour une lecture hors ligne complète.
// La version du cache est un hash du contenu : chaque déploiement invalide l'ancien cache.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const racine = 'dist';
const fichiers = [];
(function parcourir(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) parcourir(p);
    else fichiers.push(p);
  }
})(racine);

// 404.html : nginx ne la sert qu'en interne (error_page), un précache direct renverrait 404 et ferait échouer l'installation
const ignores = new Set(['sw.js', 'robots.txt', '404.html']);
const urls = [];
const empreinte = crypto.createHash('sha1');
for (const fichier of fichiers.sort()) {
  const rel = path.relative(racine, fichier).split(path.sep).join('/');
  // KaTeX fournit aussi .woff/.ttf en repli : tout navigateur avec service worker lit le woff2
  if (ignores.has(rel) || /\.(map|ttf|woff)$/.test(rel)) continue;
  let url = '/' + rel;
  if (rel === 'index.html') url = '/';
  else if (rel.endsWith('/index.html')) url = '/' + rel.slice(0, -'index.html'.length);
  urls.push(url);
  empreinte.update(url).update(fs.readFileSync(fichier));
}
const version = empreinte.digest('hex').slice(0, 12);

const sw = `// Généré par scripts/generer-sw.mjs — ne pas modifier à la main.
const CACHE = 'carnet-${version}';
const PRECACHE = ${JSON.stringify(urls, null, 1)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith('carnet-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// ignoreVary : une requête de module (import dynamique de Pagefind) envoie un en-tête Origin
// que la requête de précache n'avait pas ; sans cela, le cache ne la reconnaît pas.
const OPTIONS = { ignoreSearch: true, ignoreVary: true };

async function chercherEnCache(req) {
  const cache = await caches.open(CACHE);
  const url = new URL(req.url);
  return (
    (await cache.match(req, OPTIONS)) ||
    (await cache.match(url.pathname.replace(/\\/?$/, '/'), OPTIONS)) ||
    undefined
  );
}

// Pages : réseau d'abord (contenu à jour), cache si hors ligne ou réseau trop lent.
async function page(req) {
  const enCache = await chercherEnCache(req);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rejeter) => setTimeout(rejeter, enCache ? 3500 : 30000)),
    ]);
    if (res.ok && !res.redirected) {
      const copie = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copie));
    }
    return res;
  } catch {
    return enCache || (await chercherEnCache(new Request('/'))) || Response.error();
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(page(req));
    return;
  }
  // Assets (hashés) et index de recherche : cache d'abord.
  e.respondWith(chercherEnCache(req).then((r) => r || fetch(req)));
});
`;
fs.writeFileSync(path.join(racine, 'sw.js'), sw);
console.log(`sw.js : ${urls.length} URL précachées, version ${version}`);
