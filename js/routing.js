four51.app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true);

    // Four51's own server-rendered spec form, for products with personalisation fields that
    // are edited on their own page. The shopping pages themselves are this theme's partials.
    var concatSpecFormView = function(routeParams){
        return 'specform.hcf?id=' + routeParams.productInteropID;
    };

    $routeProvider.
        // `/catalog` is the front door: sign-in lands here and `otherwise` sends everything here.
        when('/catalog', { templateUrl: 'partials/homeView.html', controller: 'HomeCtrl' }).
        when('/home', { templateUrl: 'partials/homeView.html', controller: 'HomeCtrl' }).
        when('/catalog/:categoryInteropID', { templateUrl: 'partials/categoryView.html', controller: 'CategoryCtrl' }).

        // A product, by any one size's ID or by the garment's base ID.
        when('/product/:productInteropID', { templateUrl: 'partials/productView.html', controller: 'StoreProductCtrl' }).
        when('/product/:productInteropID/:variantInteropID/edit', { templateUrl: concatSpecFormView, controller: 'SpecFormCtrl' }).

        // Four51 kits, if the catalog ever carries one.
        when('/kit/:id', { templateUrl: 'partials/kitView.html', controller: 'KitCtrl' }).
        when('/kit/:id/:lineitemid', { templateUrl: 'partials/kitView.html', controller: 'KitCtrl' }).

        when('/search', { templateUrl: 'partials/searchView.html', controller: 'ProductSearchCtrl' }).
        when('/search/:searchTerm', { templateUrl: 'partials/searchView.html', controller: 'ProductSearchCtrl' }).

        when('/cart', { templateUrl: 'partials/cartView.html', controller: 'CartViewCtrl' }).
        when('/cart/:id', { templateUrl: 'partials/cartView.html', controller: 'CartViewCtrl' }).
        when('/checkout', { templateUrl: 'partials/checkOutView.html', controller: 'CheckOutViewCtrl' }).
        when('/checkout/:id', { templateUrl: 'partials/checkOutView.html', controller: 'CheckOutViewCtrl' }).

        when('/order', { templateUrl: 'partials/orderSearchView.html', controller: 'OrderSearchCtrl' }).
        when('/order/:id', { templateUrl: 'partials/Reporting/orderHistoryView.html', controller: 'OrderViewCtrl' }).
        when('/order/new/:id', { templateUrl: 'partials/Reporting/orderHistoryView.html', controller: 'OrderViewCtrl' }).
        when('/order/:orderid/:lineitemindex/', { templateUrl: 'partials/Reporting/lineItemHistoryView.html', controller: 'LineItemViewCtrl' }).

        when('/admin', { templateUrl: 'partials/userView.html', controller: 'UserEditCtrl' }).
        when('/addresses', { templateUrl: 'partials/addressListView.html', controller: 'AddressListCtrl' }).
        when('/address', { templateUrl: 'partials/addressView.html', controller: 'AddressViewCtrl' }).
        when('/address/:id', { templateUrl: 'partials/addressView.html', controller: 'AddressViewCtrl' }).
        when('/message', { templateUrl: 'partials/messageListView.html', controller: 'MessageListCtrl' }).
        when('/message/:id', { templateUrl: 'partials/messageView.html', controller: 'MessageViewCtrl' }).

        when('/login', { templateUrl: 'partials/controls/login.html', controller: 'LoginCtrl' }).
        when('/security', { templateUrl: 'partials/Security/security.html', controller: 'SecurityCtrl' }).
        when('/conditions', { templateUrl: 'partials/Conditions/conditions.html', controller: 'ConditionsCtrl' }).
        when('/reports', { templateUrl: 'partials/reportsView.html', controller: 'ReportsCtrl' }).
        when('/report/:id', { templateUrl: 'partials/Reporting/reportView.html', controller: 'ReportCtrl' }).

        when('/contactus', { templateUrl: 'partials/Messages/contactus.html' }).

        otherwise({ redirectTo: '/catalog' });
}]);
