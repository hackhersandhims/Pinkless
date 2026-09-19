# Retailer page fixtures

These are sanitized, minimal snapshots of public product-page semantics observed
on CVS, Kroger, and Walmart product pages on 2026-09-18. They preserve only the
fields the extension is allowed to read: canonical product identity, schema.org
`Product`/`Offer` data, the selected variant, and the selected fulfillment mode.

Reference pages inspected while defining the adapters:

- CVS: `https://www.cvs.com/shop/gillette-venus-extra-smooth-5-blade-disposable-razors-2-ct-prodid-624894`
- Kroger: `https://www.kroger.com/p/gillette-venus-extra-smooth-razor-and-refills/0004740009896`
- Walmart: `https://www.walmart.com/ip/1226680578`

Fixture prices and IDs are deliberately synthetic. Tests must use these files,
not live network requests. Each retailer includes happy, unknown, promotional,
out-of-stock, variant-switched, and incomplete states. Promotional and
incomplete states must fail closed.
