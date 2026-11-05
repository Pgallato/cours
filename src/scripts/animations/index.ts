/**
 * Registre des animations. Chaque animation est un module chargé à la demande
 * (code-splitting) uniquement sur les pages qui l'utilisent.
 *
 * Pour en ajouter une : créer `mon-anim.ts` exportant `default (el, params) => void`,
 * puis l'ajouter ici. Dans le MDX : <Animation type="mon-anim" params={{ ... }} />
 */
export type Monteur = (scene: HTMLElement, params: Record<string, unknown>) => void;

const registre: Record<string, () => Promise<{ default: Monteur }>> = {
    'loi-discrete': () => import('./loi-discrete'),
    'binomiale-poisson': () => import('./binomiale-poisson'),
    densite: () => import('./densite'),
};

export function animationsDisponibles() {
    return Object.keys(registre);
}

export async function monterTout() {
    const figures = document.querySelectorAll<HTMLElement>('[data-animation]:not([data-montee])');
    for (const fig of figures) {
        fig.dataset.montee = '';
        const type = fig.dataset.animation!;
        const scene = fig.querySelector<HTMLElement>('.anim-scene')!;
        const charger = registre[type];
        if (!charger) {
            scene.textContent = `Animation inconnue : « ${type} ».`;
            continue;
        }
        try {
            const params = JSON.parse(fig.dataset.params || '{}');
            const mod = await charger();
            scene.replaceChildren();
            mod.default(scene, params);
        } catch (e) {
            console.error(e);
            scene.textContent = "Impossible d'afficher cette animation.";
        }
    }
}
