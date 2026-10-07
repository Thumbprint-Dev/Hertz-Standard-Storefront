# Hertz Shop: standard ordering storefront

A Four51 storefront theme (AngularJS) for ordinary ordering: browse the catalog, choose a
size, add to cart, check out and pay. It has the Hertz look (Open Sans, black type, the
yellow rule, 2px corners) and **no allocation logic of any kind**: no entitlement service,
no cart gate, no Uniform Champion features. Prices, stock, shipping, tax and payment all come
from Four51.

It is a separate project from the Hertz uniform allocation storefront and shares no code or
services with it at runtime.

## What a shopper gets

| Page | Route | What it does |
|---|---|---|
| Home | `/catalog` | Hero, a tile per top-level category (photo from its range), help band |
| Category | `/catalog/:id` | Grid of products, one card per garment, sort by name or price, other categories beside it |
| Search | `/search/:term` | Products as you type: a dropdown under the header search box (arrows and Enter work), and live results on the search page |
| Product | `/product/:id` | Image, category, name, price, size buttons, quantity and add to cart with a confirmation; Four51 variant and personalisation specs when a product has them; more from the same category |
| Cart | `/cart` | Quantity changes in place (saved automatically), remove, unit and line prices, totals |
| Checkout | `/checkout` | Order details and custom order fields, shipping address and method, payment method, a required billing address (same as shipping, a saved one, or a new one), submit |
| Orders | `/order`, `/order/:id` | History with totals and status; order detail with addresses, totals and order again |
| Account | `/admin`, `/addresses` | Edit name, email, phone, username, password; saved addresses |
| Contact | `/contactus` | Support email, support hours, headquarters |

### Sizes: one card per garment

Hertz's Four51 catalog holds a garment as **one product per size**, named
`<garment>-<brand>-<size>`: `HTZ-POLOSS-M-HZ-L`, `HTZ-CARGOPANT-M-UV-32x30`, with
`HTZ-RFHAT-HZ` for a one-size item. Listed as they come, a polo in seven sizes would be seven
identical cards. `js/services/catalogService.js` folds products that share a base ID into one
card, with its sizes in order (XS before S, 30x30 before 32x30, 2 before 10), and the product
page's size buttons choose which Four51 product goes in the cart. The ID rules are in
`js/hzFilters.js` (`hzSkuParts`). A product that uses Four51 variants instead works too: the
page shows Four51's spec controls and Four51 resolves the variant.

### Payment

The payment options are the methods the signed-in user's Four51 permissions allow:
`PayByCreditCard` (with the card types in `AvailableCreditCards`), `PayByPO`,
`PayByBudgetAccount` (spending accounts), and `SubmitForApproval` for orders that need an
approver. The first one allowed is preselected.

## Deploying to Four51

The repository root **is** the theme. In the Four51 admin for the store's site, point Git
File Deployment at this repository and branch, then press **Redeploy** after each push.
Changes in the Four51 admin that do not appear on the site are usually the storefront's
`localStorage` cache: clear it before assuming a code problem.

### Four51 setup the store needs

- A site with its own catalog and categories (top-level categories become the home tiles,
  the Shop menu and the footer list).
- Price schedules on every product (Standard order type). Products without one cannot be
  added to the cart.
- User permissions: `StandardOrder`, the payment permissions above, `CreateShipToAddress` and
  `CreateBillToAddress` if shoppers may type a new shipping or billing address, `ViewSelfAdmin`
  for the account page. Billing addresses assigned to a user in Four51 appear at checkout as
  saved billing addresses.
- A ship method with `ShipperSelectionType` = `UserDropDown`, so the shopper chooses the
  shipping method at checkout.
- Product images in Four51 (`LargeImageURL`). Where a Hertz product has none, the theme
  falls back to the renderings in `css/img/products`.

## Decide before launch

These carry values from the original Hertz theme and need a decision for this store:

1. **How shoppers reach a person.** The contact page offers email
   (`hertzsupport@thumbprint.com`, the address checkout already shows), support hours and the
   headquarters address. Add a phone number or a chat widget if Hertz and Thumbprint want one.
2. **Returns.** This store has no returns flow or policy page. If it needs one, it is a new
   page and a link from the order detail page.
3. **Support email:** on the contact page and at checkout, `hertzsupport@thumbprint.com` (`partials/Messages/contactus.html`, `partials/checkOutView.html`).
4. **Google Maps key** for address lookup, in `index.html`. It is the key the original theme
   used; give this store its own.
5. **Analytics.** The original's Microsoft Clarity tag was removed (it reported to the other
   site's project). Four51's Google Analytics still runs if the company has a code set.

## Local preview

```bash
python3 preview/server.py        # then open http://localhost:8200/hertz/
```

`preview/server.py` serves the theme the way Four51 does (under `/<site>/`, with the base
tag and sign-in cookie injected) and stands in for the Four51 API with an in-memory store, so
browsing, cart, checkout, order history and the account page all work. The catalog in
`preview/catalog.py` is **placeholder data** for the preview only (real Hertz product IDs
and photos, made-up names and prices); the live site gets everything from Four51, and nothing
under `preview/` is used by it. State resets when the server stops.

The theme loads about 150 scripts, so a cold start takes a few seconds even locally.

## Layout

| Path | What |
|---|---|
| `index.html` | The shell: stylesheets, scripts, header, view, footer |
| `js/routing.js` | Every route |
| `js/controllers/storeCtrl.js` | Home, category, search and product pages, and the product grid directive |
| `js/services/catalogService.js` | Grouping sizes into one product; loading a category, a search, a product's sizes |
| `js/hzFilters.js` | Product ID parsing, size order, image fallback, dates |
| `js/controllers/cartCtrl.js`, `checkOutViewCtrl.js` | Cart and checkout (stock Four51, trimmed) |
| `css/custom.css` | The Hertz theme: header, footer, cart, checkout, account pages |
| `css/store.css` | The shopping pages, plus the cart and checkout additions |
| `partials/` | Page templates; `partials/controls/` holds the checkout steps and shared pieces |
| `lib/oc/` | Four51 OrderCloud plugins (header, mini cart, address search, spec forms) |
| `preview/` | Local preview server and placeholder catalog; not part of the site |
