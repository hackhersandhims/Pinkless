import { adapterForUrl } from '../adapters/index.js';
import type { ProductView } from '../adapters/types.js';
import type { ExtensionSettings } from '../shared/settings.js';
import type { ComparisonApiResponse } from '../shared/types.js';
import { clearBadge, renderBadge } from './badge.js';

export type ComparisonRequester = (
  current: ProductView,
  locations: ExtensionSettings['locations'],
  signal?: AbortSignal,
) => Promise<ComparisonApiResponse | null>;

export type ContentControllerDependencies = {
  document: Document;
  location: Pick<Location, 'href'>;
  loadSettings: () => Promise<ExtensionSettings>;
  requestComparison: ComparisonRequester;
  diagnostic?: (message: string) => void;
};

export class ContentController {
  private generation = 0;
  private request?: AbortController;
  private dismissedUrl?: string;

  constructor(private readonly dependencies: ContentControllerDependencies) {}

  dismiss(): void {
    this.dismissedUrl = this.dependencies.location.href;
    clearBadge(this.dependencies.document);
  }

  stop(): void {
    this.generation += 1;
    this.request?.abort();
    clearBadge(this.dependencies.document);
  }

  async recompute(): Promise<void> {
    const generation = ++this.generation;
    this.request?.abort();
    this.request = new AbortController();
    clearBadge(this.dependencies.document);

    const href = this.dependencies.location.href;
    if (this.dismissedUrl && this.dismissedUrl !== href) this.dismissedUrl = undefined;

    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return;
    }
    const adapter = adapterForUrl(url);
    if (!adapter) return;
    const current = adapter.extract(this.dependencies.document, this.dependencies.location);
    if (!current) {
      this.dependencies.diagnostic?.('Product data was incomplete or ambiguous.');
      return;
    }

    const settings = await this.dependencies.loadSettings();
    if (generation !== this.generation) return;
    if (
      current.priceContext !== 'online' &&
      settings.locations[current.retailer] !== current.locationId
    ) {
      this.dependencies.diagnostic?.('The current retailer store has not been selected.');
      return;
    }

    const outcome = await this.dependencies.requestComparison(
      current,
      settings.locations,
      this.request.signal,
    );
    if (generation !== this.generation || this.dependencies.location.href !== href) return;
    if (outcome?.status !== 'show' || this.dismissedUrl === href) return;

    renderBadge(this.dependencies.document, outcome, () => this.dismiss());
  }
}
