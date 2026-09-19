// Injected by scripts/build.mjs (true only for `PINKLESS_EXTENSION_DEV=1` builds). Undefined
// under test and in plain type-checking, hence the typeof guard.
declare const __PINKLESS_DEV__: boolean | undefined;

const DEV = typeof __PINKLESS_DEV__ !== 'undefined' && __PINKLESS_DEV__ === true;

/**
 * Development-only diagnostic (REQUIREMENTS §7: "log a development-only diagnostic"). Production
 * builds are silent: a retailer's console is not ours to write to, and the page must never see an
 * error caused by Pinkless.
 */
export function diagnostic(message: string, detail?: unknown): void {
  if (!DEV) return;
  console.debug(`[Pinkless] ${message}`, detail ?? '');
}
