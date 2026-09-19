import { products } from './catalog.js';
import { ComparisonService } from './core/comparison-service.js';
import { ProviderGateway } from './core/gateway.js';
import { createProviderRegistry } from './providers/registry.js';

const gateway = new ProviderGateway(createProviderRegistry());

export const runtime = {
  gateway,
  comparisonService: new ComparisonService(products, gateway),
};
