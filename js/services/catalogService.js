/**
 * The catalog as people shop it: one card per garment, not one per size.
 *
 * Four51 holds a Hertz garment as a product per size (see js/hzFilters.js). Listed as they
 * come, a polo in seven sizes is seven identical cards. `families` folds products that share
 * a base ID into one family carrying its sizes in order; anything else (a one-size item, a
 * product that uses Four51 variants) is a family of one.
 *
 * Families seen in a listing are remembered, so the product page can offer every size at
 * once. A product page reached directly (a link, a refresh) asks Four51 for the family by
 * searching on the base ID.
 */
four51.app.factory('Catalog', ['$q', 'Product', 'hzSkuParts', 'hzSizeOrder', function($q, Product, hzSkuParts, hzSizeOrder) {
  var known = {}, byCategory = {};

  function priceOf(p) {
    var ps = p && (p.StandardPriceSchedule || p.ReplenishmentPriceSchedule);
    var pb = ps && ps.PriceBreaks && ps.PriceBreaks[0];
    return pb ? pb.Price : null;
  }

  function families(products) {
    var order = [], byBase = {};
    angular.forEach(products || [], function(p) {
      if (!p || typeof p !== 'object') return;
      var parts = hzSkuParts(p.InteropID);
      var key = (parts.size ? parts.base : p.InteropID).toUpperCase();
      var fam = byBase[key];
      if (!fam) {
        fam = byBase[key] = { id: parts.size ? parts.base : p.InteropID, name: p.Name, sizes: [], products: [] };
        order.push(fam);
      }
      fam.products.push(p);
      if (parts.size) fam.sizes.push({ size: parts.size, product: p });
    });
    angular.forEach(order, function(fam) {
      fam.sizes.sort(function(a, b) { return hzSizeOrder(a.size, b.size); });
      // A base ID with exactly one product and no siblings stays a plain product.
      if (fam.sizes.length === 1 && fam.products.length === 1) {
        fam.id = fam.products[0].InteropID;
        fam.sizes = [];
      }
      fam.product = fam.sizes.length ? fam.sizes[0].product : fam.products[0];
      var prices = fam.products.map(priceOf).filter(function(x) { return x !== null; });
      fam.priceFrom = prices.length ? Math.min.apply(null, prices) : null;
      fam.priceTo = prices.length ? Math.max.apply(null, prices) : null;
      known[fam.id.toUpperCase()] = fam;
    });
    return order;
  }

  /** Every product in a category, all pages, as families. */
  function category(interopID) {
    var d = $q.defer(), all = [], size = 100;
    function page(n) {
      Product.search(interopID, null, null, function(list, count) {
        all = all.concat(list || []);
        if (list && list.length === size && all.length < (count || 0)) page(n + 1);
        else {
          var fams = families(all);
          // Remembered by category, so a product page can say where it sits and show its neighbours.
          angular.forEach(fams, function(f) { f.categoryId = interopID; });
          byCategory[interopID] = fams;
          d.resolve(fams);
        }
      }, n, size);
    }
    page(1);
    return d.promise;
  }

  /** Search results, as families. `size` caps how many products Four51 returns. */
  function search(term, size) {
    var d = $q.defer();
    Product.search(null, term, null, function(list) { d.resolve(families(list || [])); }, 1, size || 100);
    return d.promise;
  }

  /**
   * The family a product page is for, from a base ID or any one size's ID.
   * Remembered from a listing when we have it; otherwise found by searching on the base.
   */
  function family(id) {
    var d = $q.defer();
    var parts = hzSkuParts(id);
    var key = (parts.size ? parts.base : id).toUpperCase();
    if (known[key]) {
      d.resolve(known[key]);
      return d.promise;
    }
    Product.search(null, parts.size ? parts.base : id, null, function(list) {
      var fams = families((list || []).filter(function(p) {
        var pp = hzSkuParts(p.InteropID);
        return (pp.size ? pp.base : p.InteropID).toUpperCase() === key;
      }));
      if (fams.length) { d.resolve(fams[0]); return; }
      // Not found by search (a product with no Hertz-style ID): load it on its own.
      Product.get(id, function(p) { d.resolve(p ? families([p])[0] : null); });
    }, 1, 100);
    return d.promise;
  }

  /** Other garments from the category a family was listed in, when it was. */
  function neighbours(fam, count) {
    var list = (fam && fam.categoryId && byCategory[fam.categoryId]) || [];
    return list.filter(function(f) { return f !== fam; }).slice(0, count || 4);
  }

  return { families: families, category: category, search: search, family: family, neighbours: neighbours, priceOf: priceOf };
}]);
