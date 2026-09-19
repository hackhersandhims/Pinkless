import { observePageChanges } from '../adapters/page-change.js';
import { loadSettings } from '../shared/settings.js';
import { requestComparison } from './api.js';
import { BADGE_ROOT_ID } from './badge.js';
import { ContentController } from './controller.js';

type RunningContentScript = {
  controller: ContentController;
  stop: () => void;
};

const CONTENT_SCRIPT_KEY = '__pinklessContentScript';
const pageWindow = window as Window & { [CONTENT_SCRIPT_KEY]?: RunningContentScript };

function developmentDiagnostic(message: string): void {
  if (!chrome.runtime.getManifest().update_url) console.debug(`[pinkless] ${message}`);
}

function startContentScript(): RunningContentScript {
  pageWindow[CONTENT_SCRIPT_KEY]?.stop();

  const controller = new ContentController({
    document,
    location,
    loadSettings,
    requestComparison,
    diagnostic: developmentDiagnostic,
  });
  const disconnectObserver = observePageChanges(
    document,
    () => void controller.recompute(),
    undefined,
    BADGE_ROOT_ID,
  );
  const storageListener = (
    _changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === 'local') void controller.recompute();
  };
  chrome.storage.onChanged.addListener(storageListener);

  const running = {
    controller,
    stop: () => {
      disconnectObserver();
      chrome.storage.onChanged.removeListener(storageListener);
      controller.stop();
    },
  };
  pageWindow[CONTENT_SCRIPT_KEY] = running;
  void controller.recompute();
  return running;
}

startContentScript();

export { BADGE_ROOT_ID, clearBadge, getBadgeShadowRoot, renderBadge } from './badge.js';
export { ContentController } from './controller.js';
