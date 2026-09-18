import productsJson from '../../../packages/catalog/products.json';
import type { Product } from '../../../packages/catalog/src/schema.js';

export const products = productsJson as Product[];
