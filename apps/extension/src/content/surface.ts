import { createBadgeElement } from './badge/view.js';
import { BADGE_CSS } from './badge/styles.js';
import type { BadgeModel } from './badge/model.js';
import { BADGE_ROOT_ID, mountBadgeRoot } from './shadow-root.js';

/** The one place badge markup reaches the page. Everything else talks to this interface. */
export type BadgeSurface = {
  /** Renders (replacing any existing badge). No-op if a newer script instance owns the root. */
  show(model: BadgeModel, onDismiss: () => void): void;
  /** Removes the badge and its host from the page. */
  hide(): void;
  /** True while the host element is attached to the document. */
  isVisible(): boolean;
  /** True once a newer instance of this script has taken over the host. */
  isReplaced(): boolean;
};

const OWNER_ATTRIBUTE = 'data-pinkless-owner';

/**
 * The host lives in the retailer's light DOM, where page CSS can reach it, and a shadow root
 * inherits from its host. `all: initial` cuts inherited retailer styles (font, color, direction
 * quirks); the rest keeps the host out of layout. Inline `!important` outranks any stylesheet
 * rule the page could aim at a generic element. The z-index must be on the host: a fixed
 * element is its own stacking context, so a z-index inside the shadow tree would not lift the
 * badge above the page's positioned content.
 *
 * 10000 sits above typical sticky headers/drawers but not above the very top of the page's
 * layers, so a retailer's own modal or consent dialog still wins.
 */
const HOST_STYLE_Z_INDEX = '10000';

function isolateHost(host: HTMLElement): void {
  const rules: ReadonlyArray<readonly [string, string]> = [
    ['all', 'initial'],
    ['position', 'fixed'],
    ['width', '0'],
    ['height', '0'],
    ['z-index', HOST_STYLE_Z_INDEX],
  ];
  for (const [property, value] of rules) host.style.setProperty(property, value, 'important');
}

let instanceCounter = 0;

export function createBadgeSurface(doc: Document = document): BadgeSurface {
  // Distinguishes this script instance from any other that runs in the same page (double
  // injection). Not a secret: it only decides who may write to the root.
  instanceCounter += 1;
  const token = `${instanceCounter}-${Math.random().toString(36).slice(2)}`;

  const findHost = (): HTMLElement | null => doc.getElementById(BADGE_ROOT_ID);

  // Take over any host a previous instance left behind; that instance sees the new owner on its
  // next check and stops itself.
  findHost()?.setAttribute(OWNER_ATTRIBUTE, token);

  const isReplaced = (): boolean => {
    const owner = findHost()?.getAttribute(OWNER_ATTRIBUTE);
    return owner !== undefined && owner !== null && owner !== token;
  };

  return {
    isReplaced,

    isVisible: () => findHost()?.isConnected === true,

    show(model, onDismiss) {
      if (isReplaced()) return;
      const { shadowRoot, container } = mountBadgeRoot(BADGE_CSS, doc);
      const host = shadowRoot.host as HTMLElement;
      isolateHost(host);
      host.setAttribute(OWNER_ATTRIBUTE, token);
      // Replace, never append: one badge, ever.
      container.replaceChildren(createBadgeElement(doc, model, { onDismiss }));
    },

    hide() {
      if (isReplaced()) return;
      findHost()?.remove();
    },
  };
}
