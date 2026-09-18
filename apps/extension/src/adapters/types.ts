/**
 * Browser-build copy of the shared matcher boundary. A compile-time equality
 * assertion in adapters.test.ts prevents this shape from drifting.
 */
export type ProductView = {
  retailer: 'cvs' | 'kroger' | 'walmart';
  canonicalUrl: string;
  productId?: string;
  upc?: string;
  title: string;
  selectedVariant?: string;
  currentPriceCents?: number;
  currency?: string;
  priceContext?: 'online' | 'store-pickup' | 'in-store';
  locationId?: string;
  availability: 'in-stock' | 'out-of-stock' | 'unknown';
};

export type PageLocation = Pick<Location, 'href'>;

/** Extracts only trusted product-page data; ambiguous pages return null. */
export interface RetailerAdapter {
  readonly retailer: ProductView['retailer'];
  canHandle(url: URL): boolean;
  extract(document: Document, location: PageLocation): ProductView | null;
}
