/**
 * Site header.
 *
 * Rebuilt to the Hertz brand handoff: logo top left at 34px with its clear space, nav at
 * a 28px gap with the active item underlined 3px yellow, the signed-in name and avatar
 * right, a 1px rule at 20% black underneath and the 3px yellow rule below that.
 *
 * ## Styling lives in css/custom.css
 *
 * The previous version carried ~20 lines of CSS in an inline `<style>` block inside the
 * template string. A directive template is injected wherever the element appears, so those
 * rules were re-declared on every render and sat outside the one file the rest of the
 * theme is styled from. Everything here is now `.hz-hd-*` in custom.css.
 *
 * ## What it carries
 *
 * Home, a Shop menu listing the top-level categories from the Four51 category tree, Orders
 * and the account menu; a search box; the signed-in name, the cart and the account
 * button. Everything account-related is gated on the user's Four51 permissions.
 *
 * ## One header at every width
 *
 * Below 768px this used to hide and the stock `hamburgernavigation` took over: a dark
 * drawer with no logo, the cart buried inside it, and links belonging to another tenant.
 * It is retired. On a phone this same header shows the logo, the cart and a Menu button,
 * and the nav below opens as a panel, so the links and their role gating are the same
 * list at every width rather than two lists that drift.
 */
angular.module('OrderCloud-HeaderNavigation', []);
angular.module('OrderCloud-HeaderNavigation')
    .directive('headernavigation', headernavigation)
;

function headernavigation() {
    return {
        restrict: 'E',
        template: template,
        controller: 'NavCtrl'
    };

    function template() {
        return [
            '<header class="hz-hd">',
              '<div class="hz-hd-bar">',

                // ---- logo. Supplied asset, never recreated or recoloured (§2.1).
                '<a class="hz-hd-logo" ng-show="Four51User.isAuthenticated()" href="catalog">',
                  '<img src="https://images.hertz.com/misc/overlay/hertz-logo-black.png" alt="Hertz" />',
                '</a>',

                // ---- primary nav. A row on desktop, the Menu panel on a phone.
                '<nav class="hz-hd-nav" id="hz-hd-nav" aria-label="Main" ng-class="{\'is-open\': hdMenuOpen}">',
                  '<a class="hz-hd-link" href="catalog" ng-class="{active: isActive([\'catalog\'])}">',
                    '{{\'Home\' | r | xlat}}',
                  '</a>',

                  // Shop: the category tree, one entry per top-level category.
                  '<span class="hz-hd-drop dropdown" ng-class="{active: isInPath(\'catalog/\') || isInPath(\'product\') || isInPath(\'search\')}">',
                    '<a class="hz-hd-link dropdown-toggle" data-toggle="dropdown" href="" aria-haspopup="true">',
                      'Shop<b class="hz-hd-caret" aria-hidden="true"></b>',
                    '</a>',
                    '<ul class="dropdown-menu hz-hd-menu">',
                      '<li ng-repeat="c in tree"><a href="catalog/{{c.InteropID}}">{{c.Name}}</a></li>',
                      '<li class="divider" ng-if="tree.length"></li>',
                      '<li><a href="search">Search the shop</a></li>',
                    '</ul>',
                  '</span>',

                  '<a class="hz-hd-link" href="order" ng-class="{active: isActive([\'order\'])}">',
                    '{{\'Orders\' | r | xlat}}',
                    '<span ng-if="waitingOrderCount > 0" class="hz-hd-badge">{{waitingOrderCount}}</span>',
                  '</a>',

                  // ---- account. Bootstrap's dropdown, so data-toggle stays.
                  '<span class="hz-hd-drop dropdown"',
                        ' ng-class="{active: isActive([\'admin\', \'addresses\', \'address\', \'messages\', \'message\'])}">',
                    '<a class="hz-hd-link dropdown-toggle" data-toggle="dropdown" href="" aria-haspopup="true">',
                      '{{\'Account\' | r | xlat}}<b class="hz-hd-caret" aria-hidden="true"></b>',
                    '</a>',
                    '<ul class="dropdown-menu hz-hd-menu">',
                      '<li ng-show="user.Permissions.contains(\'ViewSelfAdmin\')">',
                        '<a href="admin">{{\'User Information\' | r | xlat}}</a>',
                      '</li>',
                      '<li ng-show="user.Type == \'Customer\' && (user.Permissions.contains(\'CreateShipToAddress\') || user.Permissions.contains(\'CreateBillToAddress\'))">',
                        '<a href="addresses">{{\'Addresses\' | r | xlat}}</a>',
                      '</li>',
                      '<li ng-show="user.Type == \'Customer\' && user.Permissions.contains(\'ViewMessaging\')">',
                        '<a href="message">{{\'Messages\' | r | xlat}}</a>',
                      '</li>',
                      '<li ng-show="user.Type!=\'TempCustomer\' && !user.Permissions.contains(\'PunchoutUser\')">',
                        '<a href="#" neworder ng-if="user.Permissions.contains(\'MultipleShoppingCart\') && currentOrder"',
                           ' ng-click="newOrderLoadingIndicator = true;startNewOrder()">',
                          '{{"Start" | r | xlat}} {{"New" | r | xlat}} {{"Order" | r | xlat}}',
                        '</a>',
                      '</li>',
                      '<li class="divider" ng-show="user.Type!=\'TempCustomer\' || AppConst.debug"></li>',
                      '<li ng-show="user.Type!=\'TempCustomer\'" ng-hide="PunchoutUser === true">',
                        '<a href="#" ng-click="Logout()">',
                          '<i class="fa fa-power-off text-danger"></i> <span>{{\'Log Out\' | r | xlat}}</span>',
                        '</a>',
                      '</li>',
                    '</ul>',
                  '</span>',
                '</nav>',

                // ---- who is signed in, and the cart
                '<div class="hz-hd-you">',
                  // Search as you type: products after two letters, Enter for every result.
                  '<form class="hz-hd-search" role="search" ng-submit="hdSearch()">',
                    '<input type="search" ng-model="hdSearchTerm" placeholder="Search products" aria-label="Search the shop"',
                          ' autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="hz-hd-suggest"',
                          ' aria-expanded="{{hdSuggest.open ? \'true\' : \'false\'}}"',
                          ' ng-change="hdSuggestFor(hdSearchTerm)" ng-keydown="hdSuggestKey($event)"',
                          ' ng-focus="hdSuggestFor(hdSearchTerm)" ng-blur="hdSuggestClose()" />',
                    '<div class="hz-hd-suggest" id="hz-hd-suggest" role="listbox" ng-show="hdSuggest.open">',
                      '<p class="hz-hd-suggest-note" ng-if="hdSuggest.loading && !hdSuggest.items.length">Searching&hellip;</p>',
                      '<p class="hz-hd-suggest-note" ng-if="!hdSuggest.loading && !hdSuggest.items.length">No products match "{{hdSuggest.term}}".</p>',
                      '<a class="hz-hd-suggest-row" role="option" ng-repeat="f in hdSuggest.items" href="product/{{f.id}}"',
                         ' ng-class="{on: $index == hdSuggest.at}" ng-mousedown="hdSuggestGo(f, $event)">',
                        '<span class="hz-hd-suggest-img"><img ng-if="f.product | hzImage" ng-src="{{f.product | hzImage}}" alt="" /></span>',
                        '<span class="hz-hd-suggest-name">{{f.name}}<small ng-if="f.sizes.length > 1">{{f.sizes.length}} sizes</small></span>',
                        '<span class="hz-hd-suggest-price" ng-if="f.priceFrom != null && !user.Permissions.contains(\'HidePricing\')">{{f.priceFrom | culturecurrency}}</span>',
                      '</a>',
                      '<a class="hz-hd-suggest-all" href="" ng-if="hdSuggest.items.length" ng-mousedown="hdSearch(); $event.preventDefault()">',
                        'See all results for "{{hdSuggest.term}}"',
                      '</a>',
                    '</div>',
                  '</form>',
                  '<span class="hz-hd-name" ng-if="user.LastName">',
                    '<span ng-if="user.FirstName">{{user.FirstName.charAt(0)}}. </span>{{user.LastName}}',
                  '</span>',

                  '<span class="hz-hd-spend" ng-if="userSpendingAccounts">',
                    'Spending account: {{userSpendingAccounts[0].Balance | currency}}',
                  '</span>',

                  '<ul class="hz-hd-cart"><minicart></minicart></ul>',

                  // Inline SVG rather than a FontAwesome glyph: the icon is part of the
                  // brand mark area, and a webfont that fails to load leaves an empty box
                  // there rather than a missing decoration.
                  '<a class="hz-hd-avatar" href="admin" aria-label="Your account">',
                    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
                      '<circle cx="12" cy="8" r="3.6"/>',
                      '<path d="M4.5 20.5c0-4.1 3.4-6.4 7.5-6.4s7.5 2.3 7.5 6.4"/>',
                    '</svg>',
                  '</a>',

                  // Phone only. The same 38px box as the cart beside it.
                  '<button type="button" class="hz-hd-toggle" ng-click="hdMenuOpen = !hdMenuOpen"',
                         ' aria-controls="hz-hd-nav" aria-expanded="{{hdMenuOpen ? \'true\' : \'false\'}}"',
                         ' aria-label="{{hdMenuOpen ? \'Close menu\' : \'Menu\'}}">',
                    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
                      '<path ng-if="!hdMenuOpen" d="M4 7h16M4 12h16M4 17h16"/>',
                      '<path ng-if="hdMenuOpen" d="M6 6l12 12M18 6L6 18"/>',
                    '</svg>',
                  '</button>',
                '</div>',

              '</div>',
            '</header>'
        ].join('');
    }
}
