/**
 * PWA : enregistrement du service worker (production uniquement) et installation.
 *  - Chrome/Edge/Android : bouton « Installer » via l'événement beforeinstallprompt
 *  - iOS/Safari : pas d'événement, on affiche l'indication « Partager → Sur l'écran d'accueil »
 */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function initialiserPWA() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    });
  }

  const dejaInstallee =
    matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (dejaInstallee) return;

  const bouton = document.querySelector<HTMLButtonElement>('[data-installer]');
  const aideIos = document.querySelector<HTMLElement>('[data-aide-ios]');
  let evenement: EvenementInstallation | null = null;

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    evenement = e as EvenementInstallation;
    if (bouton) bouton.hidden = false;
  });
  bouton?.addEventListener('click', async () => {
    if (!evenement) return;
    await evenement.prompt();
    await evenement.userChoice;
    evenement = null;
    bouton.hidden = true;
  });
  addEventListener('appinstalled', () => {
    if (bouton) bouton.hidden = true;
    if (aideIos) aideIos.hidden = true;
  });

  if (aideIos && /iPhone|iPad|iPod/.test(navigator.userAgent)) aideIos.hidden = false;
}
