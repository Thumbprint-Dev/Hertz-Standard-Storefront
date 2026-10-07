/**
 * Checkout · billing: the payment method and the billing address the order is connected to.
 *
 * The billing address is required. It can be the shipping address, one of the shopper's
 * saved billing addresses (loaded here from Four51), or a new one typed in when the user's
 * Four51 permissions allow creating a billing address. Whatever is chosen is set on
 * `currentOrder.BillAddressID`, which is what connects it to the order when it is saved.
 *
 * Starting point, so most shoppers do nothing: an order that already has a billing address
 * keeps it; one saved billing address is used; several wait for a choice; none means the
 * shipping address.
 */
four51.app.directive('orderbilling', ['Address', 'AddressList', function(Address, AddressList) {
	var obj = {
		restrict: 'AE',
		templateUrl: 'partials/controls/orderBilling.html',
		controller: ['$scope', function($scope) {
			var fresh = function() { return { Country: 'US', IsShipping: false, IsBilling: true }; };
			$scope.billaddress = fresh();
			$scope.billing = { mode: null, loaded: false };
			$scope.billaddresses = [];
			$scope.savedBills = [];

			// Saved billing addresses other than the one the order ships to, which has its own option.
			function refreshSaved() {
				var ship = $scope.currentOrder && $scope.currentOrder.ShipAddressID;
				$scope.savedBills = ($scope.billaddresses || []).filter(function(a) {
					return a && a.ID && a.IsBilling !== false && a.ID != ship;
				});
			}

			function init() {
				var o = $scope.currentOrder;
				if (!o || !$scope.billing.loaded || $scope.billing.mode) return;
				refreshSaved();
				if (o.BillAddressID) {
					$scope.billing.mode = o.BillAddressID == o.ShipAddressID ? 'same' : 'saved';
				} else if ($scope.savedBills.length === 1) {
					o.BillAddressID = $scope.savedBills[0].ID;
					$scope.billing.mode = 'saved';
				} else if ($scope.savedBills.length > 1) {
					$scope.billing.mode = 'saved';
				} else if (o.ShipAddressID) {
					$scope.useShipping();
				}
			}

			AddressList.billing(function(list) {
				$scope.billaddresses = (list || []).filter(function(a) { return a && a.ID; });
				$scope.billing.loaded = true;
				init();
			});

			$scope.useShipping = function() {
				$scope.billing.mode = 'same';
				$scope.billaddressform = false;
				if ($scope.currentOrder) $scope.currentOrder.BillAddressID = $scope.currentOrder.ShipAddressID || null;
			};
			$scope.useSaved = function() {
				var o = $scope.currentOrder;
				$scope.billing.mode = 'saved';
				$scope.billaddressform = false;
				if (o && (!o.BillAddressID || o.BillAddressID == o.ShipAddressID)) {
					o.BillAddressID = $scope.savedBills.length ? $scope.savedBills[0].ID : null;
				}
			};
			$scope.useNew = function() {
				$scope.billing.mode = 'new';
				$scope.billaddress = fresh();
				$scope.billaddressform = true;
				// Nothing is connected until the new address is saved, so Submit waits for it.
				if ($scope.currentOrder) $scope.currentOrder.BillAddressID = null;
			};

			// The order and its shipping address arrive after this directive; start once they do,
			// and keep "same as shipping" following the shipping address when it changes.
			$scope.$watch('currentOrder.ID', init);
			$scope.$watch('currentOrder.ShipAddressID', function(ship) {
				refreshSaved();
				if (!$scope.billing.mode) { init(); return; }
				if ($scope.billing.mode === 'same' && $scope.currentOrder) $scope.currentOrder.BillAddressID = ship || null;
			});

			$scope.$on('event:AddressSaved', function(event, address) {
				if (!address || !address.IsBilling) return;
				$scope.billaddresses.push(address);
				refreshSaved();
				$scope.currentOrder.BillAddressID = address.ID;
				$scope.billing.mode = 'saved';
				$scope.billaddressform = false;
				$scope.billaddress = fresh();
			});
			$scope.$on('event:AddressCancel', function() {
				if ($scope.billing.mode !== 'new') return;
				$scope.billaddressform = false;
				if ($scope.savedBills.length) $scope.useSaved();
				else $scope.useShipping();
			});

			// The address shown under the choice, and the names Four51 wants on the order.
			$scope.$watch('currentOrder.BillAddressID', function(id) {
				if (!id) { $scope.BillAddress = null; return; }
				Address.get(id, function(add) {
					if ($scope.user.Permissions.contains('EditBillToName') && !add.IsCustEditable) {
						$scope.currentOrder.BillFirstName = add.FirstName;
						$scope.currentOrder.BillLastName = add.LastName;
					}
					$scope.BillAddress = add;
				});
			});

			// Required: the billing form is invalid, and Submit waits, until an address is set.
			$scope.$watch(function() {
				return !!($scope.currentOrder && $scope.currentOrder.BillAddressID);
			}, function(ok) {
				if ($scope.cart_billing) $scope.cart_billing.$setValidity('billAddress', ok);
			});
			$scope.$watch('cart_billing', function(form) {
				if (form) form.$setValidity('billAddress', !!($scope.currentOrder && $scope.currentOrder.BillAddressID));
			});
		}]
	};
	return obj;
}]);

four51.app.directive('billingmessage', function() {
	var obj = {
		restrict: 'E',
		templateUrl: 'partials/messages/billing.html'
	};
	return obj;
});
