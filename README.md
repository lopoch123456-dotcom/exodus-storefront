# Exodus storefront

Original Shopify native theme and its public design preview.

- Website: https://lopoch123456-dotcom.github.io/exodus-storefront/
- Native Shopify source: theme/
- GitHub Pages output: docs/ (main branch, no Jekyll)
- Collection: 14 style cards / 18 color records after owner removals and color grouping; not confirmed production inventory.
- Garment covers precede model/styling views. AI views retain their labels.
- Silver original 3D emblem, controls and reduced-motion support are retained.

This is a static preview. Checkout, payments, inventory and form delivery require
Shopify integration and acceptance; this publication does not claim live commerce.

## Daily updates

The authorized daily Exodus development task exports from the local working source:
C:/Users/geige/Desktop/exodus
into C:/Users/geige/Documents/GitHub/exodus-storefront, then commits and pushes
with tools/sync-github.py --source <source> --repo <checkout> --push.
Only the native theme and approved preview assets are exported. Raw originals,
retired model media, private reports, mail receipts, ZIP archives and dependencies
are not included. The exporter checks the approved media SHA list and strips test
fixture routes. It refuses unexpected remotes or uncommitted checkout changes.
Never force-push or commit credentials.
