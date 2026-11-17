four51.app.factory('Punchout', ['$resource', '$451', '$http', '$cookieStore', 'Error', function($resource, $451, $http, $cookieStore, Error) {
    function _then(fn, data) {
        if (angular.isFunction(fn))
            fn(data);
    }

    // Never throw here. Four51Ctrl injects this service, so an exception while reading the
    // cookie (one $cookieStore cannot parse as JSON) would stop Four51Ctrl from starting,
    // leave `Four51User` undefined, and index.html would show the login screen even to a
    // signed-in punchout user.
    var _punchoutSession = null;
    try {
        _punchoutSession = $cookieStore.get('punchoutSession.' + $451.apiName) || null;
    } catch (e) {
        if (window.console) console.warn('punchoutSession cookie could not be read', e);
    }

    var _getForm = function(success, error){
        var url = $451.api('punchoutin/returnform/' + _punchoutSession.PunchoutTemplateName) + '?PunchoutBuyerCookie=' + _punchoutSession.PunchoutBuyerCookie;

        $resource(url).get().$promise.then(function(form){
                success(form);
            },
            function(err){
                error(err);
            });
    }

    var _save = function(id, success, error){
        $resource($451.api('order/punchout/:id'), {'id': id}, { submitpunchout: { method: 'PUT'}}).submitpunchout().$promise.then(
            function() {
                _then(success);
            },
            function(ex) {
                error(Error.format(ex));
            }
        );
    };

    return {
        getForm: _getForm,
        punchoutSession: _punchoutSession,
        save: _save
    }
}]);
