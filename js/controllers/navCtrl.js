four51.app.controller('NavCtrl', ['$location', '$route', '$scope', '$451', '$timeout', 'User', 'OrderSearchCriteria', 'Catalog',
    function ($location, $route, $scope, $451, $timeout, User, OrderSearchCriteria, Catalog) {
      $scope.openOrderCount = 0;
      OrderSearchCriteria.query(function(orders) {
          angular.forEach(orders, function(order){
              if(order.DisplayName == "Open"){
                  $scope.openOrderCount = order.Count;
              }
          });
      });

      $scope.waitingOrderCount = 0;
      OrderSearchCriteria.query(function(orders) {
          angular.forEach(orders, function(order){
              if(order.DisplayName == "Awaiting Approval"){
                  $scope.waitingOrderCount = order.Count;
              }
          });
      });
      

 
        // Four51 2.0 (COMTOOLS-1947): log out on the server as well, so the token stops
        // working, then sign in again as the anonymous user on an anonymous site.
        $scope.Logout = function(){
            User.logout($scope.user, function(u){
                if ($scope.isAnon) {
                    $timeout(function () {
                        $location.path("/catalog");
                        location.reload(true);
                    }, 500);
                }
            }, function(ex){
                console.log(ex.Message);
            });
        };

        $scope.Clear = function() {
            localStorage.clear();
        }

        // The phone menu closes once a link has taken you somewhere, including Back.
        $scope.hdMenuOpen = false;
        $scope.$on('$routeChangeStart', function() { $scope.hdMenuOpen = false; });

        // The header's search box: Enter opens every result on the search page.
        $scope.hdSearch = function() {
            var hit = $scope.hdSuggest.at > -1 && $scope.hdSuggest.items[$scope.hdSuggest.at];
            if (hit) return $scope.hdSuggestGo(hit);
            var t = ($scope.hdSearchTerm || '').trim();
            if (!t) return;
            $scope.hdSearchTerm = '';
            $scope.hdSuggest.open = false;
            $location.path('search/' + encodeURIComponent(t));
        };

        /**
         * Products as you type, from two letters on, a moment after typing pauses so a word
         * is one search rather than one per letter. Only the latest answer is shown: a slow
         * reply for "po" must not replace the one for "polo".
         */
        $scope.hdSuggest = { open: false, loading: false, items: [], term: '', at: -1 };
        var suggestTimer = null, asked = 0;
        $scope.hdSuggestFor = function(text) {
            var t = (text || '').trim();
            if (suggestTimer) $timeout.cancel(suggestTimer);
            if (t.length < 2) { $scope.hdSuggest.open = false; $scope.hdSuggest.items = []; return; }
            $scope.hdSuggest.open = true;
            $scope.hdSuggest.loading = true;
            $scope.hdSuggest.term = t;
            suggestTimer = $timeout(function() {
                var mine = ++asked;
                Catalog.search(t, 40).then(function(fams) {
                    if (mine !== asked) return;
                    $scope.hdSuggest.items = fams.slice(0, 6);
                    $scope.hdSuggest.at = -1;
                    $scope.hdSuggest.loading = false;
                });
            }, 220);
        };
        $scope.hdSuggestGo = function(f, ev) {
            if (ev) ev.preventDefault();
            $scope.hdSuggest.open = false;
            $scope.hdSearchTerm = '';
            $location.path('product/' + f.id);
        };
        $scope.hdSuggestKey = function(ev) {
            var s = $scope.hdSuggest, n = s.items.length;
            if (ev.keyCode === 27) { s.open = false; return; }                       // Escape
            if (!s.open || !n) return;
            if (ev.keyCode === 40) { ev.preventDefault(); s.at = (s.at + 1) % n; }      // Down
            if (ev.keyCode === 38) { ev.preventDefault(); s.at = (s.at - 1 + n) % n; }  // Up
        };
        // Closed a moment after the box loses focus, so a click on a suggestion still lands.
        $scope.hdSuggestClose = function() {
            $timeout(function() { $scope.hdSuggest.open = false; }, 150);
        };
        $scope.$on('$routeChangeStart', function() { $scope.hdSuggest.open = false; });

        $scope.$on('event:orderUpdate', function(event, order) {
            // Units, not lines, so the badge matches the cart and checkout: five polos in
            // one line are five items (Trevor, 5 Oct 2026).
            var units = null;
            if (order && order.Status == 'Unsubmitted') {
                units = 0;
                angular.forEach(order.LineItems || [], function(li) { units += (+li.Quantity || 0); });
            }
            $scope.cartCount = units;
        });
    }]);
