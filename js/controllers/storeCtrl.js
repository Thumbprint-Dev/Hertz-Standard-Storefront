/**
 * The shopping pages: home, a category, search results and a product.
 *
 * Built on the stock Four51 services (Product, Category, Order, User, ProductDisplayService)
 * plus `Catalog`, which folds a garment's per-size products into one card. Prices, order
 * rules and stock all come from Four51; nothing here decides what anything costs.
 */

/** Home: the hero and a tile per top-level category, each with a photo from its range. */
four51.app.controller('HomeCtrl', ['$scope', 'Product', 'hzImageFilter', function($scope, Product, hzImage) {
  $scope.home = { categories: [], loading: true };

  function build(tree) {
    if (!tree) return;
    $scope.home.loading = false;
    $scope.home.categories = (tree || []).map(function(c) {
      var tile = { id: c.InteropID, name: c.Name, description: c.Description, image: c.Image || c.ImageURL || null };
      if (!tile.image) {
        Product.search(c.InteropID, null, null, function(list) {
          var withImage = (list || []).filter(function(p) { return p && hzImage(p); })[0];
          tile.image = withImage ? hzImage(withImage) : null;
        }, 1, 12);
      }
      return tile;
    });
  }
  build($scope.tree);
  $scope.$on('treeComplete', function(e, tree) { build(tree); });

  $scope.scrollToShop = function() {
    var el = document.getElementById('shop');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}]);

/** A category: its products as a grid of garments, sortable, with the other categories beside it. */
four51.app.controller('CategoryCtrl', ['$scope', '$routeParams', 'Category', 'Catalog', function($scope, $routeParams, Category, Catalog) {
  var id = $routeParams.categoryInteropID;
  $scope.listing = { loading: true, families: [], shown: [], sort: 'featured', id: id };

  Category.get(id, function(c) { $scope.listing.category = c; });
  Catalog.category(id).then(function(fams) {
    $scope.listing.families = fams;
    $scope.listing.loading = false;
    resort();
  });

  // Kept as a list on scope, re-sorted when the choice changes, rather than a function the
  // template calls: a new array on every digest never settles.
  function resort() {
    var list = $scope.listing.families.slice();
    var s = $scope.listing.sort;
    if (s === 'name') list.sort(function(a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
    if (s === 'low') list.sort(function(a, b) { return (a.priceFrom || 0) - (b.priceFrom || 0); });
    if (s === 'high') list.sort(function(a, b) { return (b.priceFrom || 0) - (a.priceFrom || 0); });
    $scope.listing.shown = list;
  }
  $scope.$watch('listing.sort', resort);
}]);

/** The product grid shared by the category and search pages. */
four51.app.directive('productgrid', function() {
  return {
    restrict: 'E',
    scope: { families: '=', loading: '=', hidePrices: '=' },
    templateUrl: 'partials/controls/productGrid.html'
  };
});

/** Search results, the same grid as a category. */
four51.app.controller('ProductSearchCtrl', ['$scope', '$routeParams', '$location', '$timeout', 'Catalog', function($scope, $routeParams, $location, $timeout, Catalog) {
  $scope.listing = { term: $routeParams.searchTerm || '', shown: '', loading: false, families: [] };

  // Results follow the box as it is typed in, a moment after typing pauses. Only the latest
  // answer is shown, so a slow reply for an earlier word never replaces a newer one.
  var timer = null, asked = 0;
  function run(term) {
    var t = (term || '').trim();
    if (timer) $timeout.cancel(timer);
    if (t.length < 2) { $scope.listing.families = []; $scope.listing.shown = ''; $scope.listing.loading = false; return; }
    $scope.listing.loading = true;
    timer = $timeout(function() {
      var mine = ++asked;
      Catalog.search(t).then(function(fams) {
        if (mine !== asked) return;
        $scope.listing.families = fams;
        $scope.listing.shown = t;
        $scope.listing.loading = false;
      });
    }, 250);
  }
  $scope.$watch('listing.term', run);

  // Enter keeps the address in step with what is shown, for the back button and for sharing.
  $scope.searchAgain = function() {
    var t = ($scope.listing.term || '').trim();
    if (t) $location.path('search/' + encodeURIComponent(t)).replace();
  };
}]);

/**
 * A product. For a Hertz garment, every size is its own Four51 product, so choosing a size
 * swaps the product the line is for; for a product that uses Four51 variants, the stock
 * spec controls choose the variant. Either way the line, its price schedule and its checks
 * come from ProductDisplayService, exactly as the stock product page did.
 */
four51.app.controller('StoreProductCtrl', ['$scope', '$routeParams', '$location', '$timeout', 'Catalog', 'Category', 'Order', 'User', 'ProductDisplayService', 'hzSkuParts',
function($scope, $routeParams, $location, $timeout, Catalog, Category, Order, User, ProductDisplayService, hzSkuParts) {
  var asked = $routeParams.productInteropID;
  $scope.page = { loading: true, family: null, size: null, added: null, adding: false, missing: false };
  $scope.LineItem = {};
  $scope.settings = { currentPage: 1, pageSize: 100 };

  function use(product) {
    $scope.LineItem = { Product: product, Variant: null, Quantity: ($scope.LineItem && $scope.LineItem.Quantity) || 1 };
    ProductDisplayService.setNewLineItemScope($scope);
    ProductDisplayService.setProductViewScope($scope);
    var ps = $scope.LineItem.PriceSchedule;
    if (ps && ps.DefaultQuantity && !$scope.page.touchedQty) $scope.LineItem.Quantity = ps.DefaultQuantity;
    ProductDisplayService.calculateLineTotal($scope.LineItem);
    $scope.setAddToOrderErrors && $scope.setAddToOrderErrors();
  }

  Catalog.family(asked).then(function(fam) {
    $scope.page.loading = false;
    if (!fam) { $scope.page.missing = true; return; }
    $scope.page.family = fam;
    // Where it sits and what is beside it, when it was reached from a category.
    $scope.page.related = Catalog.neighbours(fam, 4);
    if (fam.categoryId) Category.get(fam.categoryId, function(c) { $scope.page.category = c; });
    // A size in the link is preselected; a base link waits for a choice.
    var size = hzSkuParts(asked).size;
    var chosen = size && fam.sizes.filter(function(s) { return s.size === size; })[0];
    $scope.page.size = chosen ? chosen.size : null;
    use(chosen ? chosen.product : fam.product);
  });

  $scope.chooseSize = function(s) {
    $scope.page.size = s.size;
    $scope.page.added = null;
    use(s.product);
  };

  $scope.step = function(by) {
    var q = (parseInt($scope.LineItem.Quantity, 10) || 0) + by;
    $scope.LineItem.Quantity = Math.max(1, q);
    $scope.page.touchedQty = true;
    ProductDisplayService.calculateLineTotal($scope.LineItem);
  };

  $scope.needsSize = function() {
    return $scope.page.family && $scope.page.family.sizes.length > 0 && !$scope.page.size;
  };

  $scope.unitPrice = function() {
    var li = $scope.LineItem;
    if (li.UnitPrice != null) return li.UnitPrice;
    var ps = li.PriceSchedule, pb = ps && ps.PriceBreaks && ps.PriceBreaks[0];
    return pb ? pb.Price : null;
  };

  $scope.addToCart = function() {
    if ($scope.needsSize() || $scope.page.adding) return;
    if ($scope.lineItemErrors && $scope.lineItemErrors.length) { $scope.showAddToCartErrors = true; return; }
    var qty = parseInt($scope.LineItem.Quantity, 10);
    if (!(qty > 0)) { $scope.page.error = 'Enter a quantity.'; return; }
    $scope.page.error = null;
    $scope.page.adding = true;

    var order = $scope.currentOrder || { LineItems: [] };
    if (!order.LineItems) order.LineItems = [];
    var line = angular.copy($scope.LineItem);
    line.Quantity = qty;
    order.LineItems.push(line);
    order.Type = (line.PriceSchedule && line.PriceSchedule.OrderType) || order.Type || 'Standard';

    // Shipping rates are not recalculated when a line is added, so the shipper is cleared to
    // force a fresh choice at checkout, as the stock product page did.
    Order.clearshipping(order).save(order, function(saved) {
      // Order.save broadcasts event:orderUpdate, which Four51Ctrl takes as the current cart.
      $scope.currentOrder = saved;
      $scope.user.CurrentOrderID = saved.ID;
      User.save($scope.user, function() {});
      $scope.page.adding = false;
      $scope.page.added = { name: $scope.page.family.name, size: $scope.page.size, qty: qty };
    }, function(ex) {
      order.LineItems.pop();
      $scope.page.adding = false;
      $scope.page.error = (ex && (ex.Detail || ex.Message)) || 'That could not be added to your cart.';
    });
  };

  $scope.goToCart = function() { $location.path('cart'); };
}]);
