/**
 * Display filters for the Hertz store: how a product ID, a size and a date read on the page.
 *
 * Hertz's Four51 catalog has one product per size, named by convention: the garment, the
 * brand segment (HZ, DT, UV, THFT), then the size. `HTZ-POLOSS-M-HZ-L` is a men's short
 * sleeve polo in large; `HTZ-CARGOPANT-M-UV-32x30` a cargo pant; `HTZ-RFHAT-HZ` a cap with no
 * size at all. A trailing `-CIN` marks the same garment from Cintas stock.
 */

/** An InteropID's parts: the base product it belongs to, and its size (null for one size). */
four51.app.factory('hzSkuParts', function() {
  var BRANDS = ['HZ', 'DT', 'UV', 'THFT'];
  return function(id) {
    var raw = String(id || '');
    var parts = raw.toUpperCase().replace(/-CIN$/, '').split('-');
    var at = -1;
    for (var i = parts.length - 1; i >= 0; i--) {
      if (BRANDS.indexOf(parts[i]) > -1) { at = i; break; }
    }
    if (at < 0 || at === parts.length - 1) return { base: raw, stem: stemOf(parts), size: null };
    var size = parts.slice(at + 1).join('-').replace(/(\d)X(\d)/, '$1x$2');
    return { base: parts.slice(0, at + 1).join('-'), stem: stemOf(parts.slice(0, at + 1)), size: size };

    function stemOf(p) {
      var q = p.slice();
      if (q[0] === 'HTZ') q.shift();
      var b = -1;
      for (var j = q.length - 1; j >= 0; j--) if (BRANDS.indexOf(q[j]) > -1) { b = j; break; }
      return (b < 0 ? q : q.slice(0, b)).join('-').toLowerCase();
    }
  };
});

/**
 * Sizes in the order people expect them: XS before S before M, 30x30 before 30x32 before
 * 32x30, 2 before 10. Anything unrecognised goes last, alphabetically.
 */
four51.app.factory('hzSizeOrder', function() {
  var LETTERS = ['XXS', '2XS', 'XS', 'S', 'S/M', 'M', 'M/L', 'L', 'L/XL', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', '5XL', '6XL', 'OS'];
  function key(size) {
    var s = String(size || '').toUpperCase();
    var li = LETTERS.indexOf(s);
    if (li > -1) return [0, li, 0, s];
    var wi = /^(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)$/.exec(s);
    if (wi) return [1, parseFloat(wi[1]), parseFloat(wi[2]), s];
    var n = /^(\d+(?:\.\d+)?)/.exec(s);
    if (n) return [2, parseFloat(n[1]), 0, s];
    return [3, 0, 0, s];
  }
  return function(a, b) {
    var ka = key(a), kb = key(b);
    for (var i = 0; i < 3; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return ka[3] < kb[3] ? -1 : ka[3] > kb[3] ? 1 : 0;
  };
});

/**
 * A product photo from this theme for a Hertz product ID, or null.
 *
 * The vendor renderings in css/img/products, used only where Four51 has no image for the
 * product, so nothing ever shows a broken image. Listed rather than probed: a browser cannot
 * ask whether a file exists without requesting it.
 */
four51.app.filter('hzPhoto', ['hzSkuParts', function(hzSkuParts) {
  var PHOTOS = [
    'beanie', 'cargopant-m', 'cargopant-w', 'cargoshort-m', 'cargoshort-w',
    'flzip-w', 'lskirt-w', 'matpant-w', 'mattop', 'parka-us', 'perfpant-m',
    'perfpant-w', 'polols-m', 'polols-w', 'poloss-m', 'poloss-w', 'qtzip-m',
    'rfhat', 'sshell-us'
  ];
  return function(id) {
    var stem = hzSkuParts(id).stem;
    return PHOTOS.indexOf(stem) === -1 ? null : 'css/img/products/' + stem + '.png';
  };
}]);

/** The best image for a product: Four51's own, then the theme's photo, then nothing. */
four51.app.filter('hzImage', ['hzPhotoFilter', function(hzPhotoFilter) {
  return function(product, variant) {
    if (!product) return null;
    return (variant && (variant.LargeImageUrl || variant.LargeImageURL)) ||
      product.LargeImageURL || product.LargeImageUrl || product.SmallImageURL || product.SmallImageUrl ||
      hzPhotoFilter(product.InteropID);
  };
}]);

/** The size in an InteropID ("L", "32x30"), or null for a one-size item. */
four51.app.filter('hzSize', ['hzSkuParts', function(hzSkuParts) {
  return function(id) { return hzSkuParts(id).size; };
}]);

/** Items in a list of line items: five polos on one line are five. */
four51.app.filter('hzUnits', function() {
  return function(lineItems) {
    var n = 0;
    angular.forEach(lineItems || [], function(li) { n += (li && +li.Quantity) || 0; });
    return n;
  };
});

/** "2026-10-07" or an ISO timestamp as "October 7, 2026". */
four51.app.filter('hzDate', function() {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return function(value) {
    if (!value) return value;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
    if (!m) return value;
    return MONTHS[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
  };
});

/** How many keys an object has: Four51 keeps a line's specs as an object, not a list. */
four51.app.filter('objLength', function() {
  return function(obj) { return obj ? Object.keys(obj).length : 0; };
});
