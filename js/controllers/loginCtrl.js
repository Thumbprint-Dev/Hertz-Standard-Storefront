four51.app.controller('LoginCtrl', ['$scope', '$sce', '$route', '$location', '$http', '$timeout', '$window', 'User', 'Punchout',
function ($scope, $sce, $route, $location, $http, $timeout, $window, User, Punchout) {
    $scope.PasswordReset = $location.search().token != null;
    var codes = ['PasswordSecurityException'];

    /**
     * A punchout user reaches this screen only when the handoff from their purchasing system
     * did not leave a session this app can read. Sending them to the Hertz SSO link would
     * sign them in to a different site, so login.html shows them a punchout message instead.
     * It is a punchout when Four51's punchout session cookie is there, or when the store is
     * open inside another page's frame (the Hertz Shop is never framed except by a
     * procurement system).
     */
    var framed = false;
    try { framed = $window.self !== $window.top; } catch (e) { framed = true; }
    $scope.punchoutContext = !!Punchout.punchoutSession || framed;

    $scope.loginMessage = null;
    $scope.buttonText = $scope.PasswordReset ? 'Reset Password' : "Logon";
    $scope.$on('event:auth-loginFailed', function(event, message) {
        $scope.loginMessage = message;
    });

    // build a post method for password reset
    $scope.login = function() {
        $scope.loginMessage = null;
        // need to reset any error codes that might be set so we can handle new ones
        angular.forEach(codes, function(c) {
            $scope[c] = null;
        });
        $scope.credentials = $scope.credentials || {};
        $scope.credentials.PasswordResetToken = $location.search().token;
        $scope.PasswordReset ? _reset() : _login();
    };

    var _reset = function() {
        User.reset($scope.credentials,
            function(user) {
                $timeout(function() {
                    delete $scope.PasswordReset;
                    delete $scope.credentials;
                    $scope.buttonText = "Logon";
                    $location.path('catalog');
                });
            },
            function(ex) {
                $timeout(function() {
                    $scope.loginMessage = $sce.trustAsHtml(ex.Message);
                });
            }
        );
    };

    // Username and password sign-in, as in base Storefront 2.0. (The form for it is
    // commented out in login.html; Hertz shoppers sign in through SSO.)
    var _login = function() {
        User.login($scope.credentials,
            function(data) {
                $timeout(function() {
                    if ($scope.credentials && $scope.credentials.Email) {
                        $scope.loginMessage = data.LogonInfoSent;
                        $scope.EmailNotFoundException = false;
                        $scope.showEmailHelp = false;
                    }
                    else {
                        delete $scope.credentials;
                    }
                });
            },
            function(ex) {
                $timeout(function() {
                    $scope.credentials = {};
                    $scope[ex.Code.text] = true;
                    $scope.loginMessage = ex.Message || "User name and password not found";
                    if (ex.Code.is('PasswordSecurity'))
                        $scope.loginMessage = $sce.trustAsHtml(ex.Message);
                    if (ex.Code.is('EmailNotFoundException'))
                        $scope.loginMessage = $sce.trustAsHtml(ex.Detail);
                });
            }
        );
    };
}]);
