# Retailer page fixtures

Sanitized, minimal Kroger product pages. They preserve only the fields the
extension is allowed to read: the canonical product URL, schema.org
`Product`/`Offer` data, and the selected package option. The selected Kroger
store never comes from the page — it is the store chosen in the extension
popup.

The happy fixture is the reviewed women's product in the catalog, BIC Soleil
Smooth Scented Disposable 3-Blade Razors (Kroger productId `0007033071417`,
$6.79). Its `gtin13` deliberately echoes the Kroger productId, which is not a
check-digit-valid GTIN; the adapter must ignore it rather than fail.

Other states: unknown item, promotional/membership price, out of stock,
switched package option (a synthetic 8-count id), and incomplete (no price).
Promotional and incomplete states must fail closed. Tests must use these files,
not live network requests.
