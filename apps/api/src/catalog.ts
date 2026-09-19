import equivalencesJson from '../../../packages/catalog/equivalences.json' with { type: 'json' };
import productsJson from '../../../packages/catalog/products.json' with { type: 'json' };
import type { Catalog, Product, ProductEquivalence } from '../../../packages/catalog/src/schema.js';

export const catalog: Catalog = {
  products: productsJson as Product[],
  equivalences: equivalencesJson as ProductEquivalence[],
};
