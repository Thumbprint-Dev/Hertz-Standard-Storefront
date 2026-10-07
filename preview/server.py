#!/usr/bin/env python3
"""
Local preview of the storefront, with a stand-in for the Four51 API.

    python3 preview/server.py            # http://localhost:8200/hertz/
    python3 preview/server.py 8300       # another port

Four51 serves a site at /<site>/ and its API at /api/<site>/, and injects two things into
index.html: a <base> tag and the anonymous-user flag. This does the same, signs a preview
user in through the cookie the Security service reads, and answers the API calls the theme
makes from an in-memory store: catalog, cart, checkout, order history. Everything resets
when the server stops.

The catalog is PREVIEW-ONLY placeholder data (preview/catalog.py). None of this folder is
used by the live site; Four51 never serves it because nothing links to it.
"""
import json
import os
import sys
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

sys.path.insert(0, os.path.dirname(__file__))
from catalog import build  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "hertz"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8200

CATEGORIES, PRODUCTS = build()
BY_ID = {p["InteropID"].upper(): p for p in PRODUCTS}
LOCK = threading.Lock()

ADDRESS = {
    "ID": "preview-addr", "AddressName": "Preview location", "FirstName": "Preview", "LastName": "Shopper",
    "Street1": "8501 Williams Rd", "Street2": "", "City": "Estero", "State": "FL", "Zip": "33928",
    "Country": "US", "Phone": "", "IsShipping": True, "IsBilling": True, "Editable": True,
}

USER = {
    "ID": "preview-user", "InteropID": "preview-user", "Username": "preview", "FirstName": "Preview",
    "LastName": "Shopper", "Email": "preview@example.com", "Type": "Customer", "TermsAccepted": True,
    "CurrentOrderID": None, "SiteID": SITE, "Groups": [], "CostCenters": [], "CustomFields": [],
    "Permissions": ["StandardOrder", "ViewSelfAdmin", "ViewContactUs", "PayByCreditCard", "PayByPO",
                    "PayByVisa", "PayByMasterCard", "CreateShipToAddress"],
    "AvailableCreditCards": [{"Type": "Visa", "DisplayName": "Visa"}, {"Type": "MasterCard", "DisplayName": "MasterCard"}],
    "Culture": {"Name": "en-US", "CurrencyPrefix": "$", "DateFormat": "MM/dd/yyyy"}, "CultureUI": "en-US",
    "Company": {"Name": "Hertz", "GoogleAnalyticsCode": None},
    "ShipMethod": {"ShipperSelectionType": "UserDropDown"},
    "DefaultShipAddressID": ADDRESS["ID"], "DefaultBillAddressID": ADDRESS["ID"],
}

SHIPPERS = [
    {"ID": "ground", "Name": "UPS Ground", "Rates": [{"Price": 9.95}], "ShippingRate": 9.95},
    {"ID": "twoday", "Name": "UPS 2nd Day Air", "Rates": [{"Price": 24.5}], "ShippingRate": 24.5},
]

ORDERS = {}
SEQ = {"order": 1000, "line": 0}


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def unit_price(line):
    ps = line.get("PriceSchedule") or (line.get("Product") or {}).get("StandardPriceSchedule") or {}
    price = 0.0
    for pb in ps.get("PriceBreaks") or []:
        if (line.get("Quantity") or 0) >= pb.get("Quantity", 1):
            price = pb.get("Price", 0.0)
    return price


def priced(order):
    sub = 0.0
    for li in order.get("LineItems") or []:
        if not li.get("ID"):
            SEQ["line"] += 1
            li["ID"] = "li-%d" % SEQ["line"]
        li["Quantity"] = int(li.get("Quantity") or 0)
        li["UnitPrice"] = unit_price(li)
        li["LineTotal"] = round(li["UnitPrice"] * li["Quantity"], 2)
        li.setdefault("ShipAddressID", ADDRESS["ID"])
        sub += li["LineTotal"]
    shipper = next((s for s in SHIPPERS if any(li.get("ShipperName") == s["Name"] for li in order.get("LineItems") or [])), None)
    order["Subtotal"] = round(sub, 2)
    order["ShippingCost"] = shipper["ShippingRate"] if shipper else 0.0
    order["TaxCost"] = round(sub * 0.07, 2)
    order["Total"] = round(order["Subtotal"] + order["ShippingCost"] + order["TaxCost"], 2)
    order["LineItemCount"] = len(order.get("LineItems") or [])
    return order


def summary(o):
    return {k: o.get(k) for k in ("ID", "ExternalID", "Status", "StatusText", "DateCreated", "DateSubmitted", "Total", "Subtotal", "Type", "LineItemCount", "FromUserFirstName", "FromUserLastName")}


class Handler(SimpleHTTPRequestHandler):
    # Keep-alive. The page loads ~150 files from here; under HTTP/1.0 every one is a new
    # connection, and a browser queueing six at a time took half a minute to start the app.
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        if "/api/" in self.path:
            sys.stderr.write("%s %s\n" % (self.command, self.path))

    # ---------------------------------------------------------------- plumbing
    def send_json(self, body, status=200):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"null") if n else None

    def route(self):
        u = urlparse(self.path)
        return u.path, {k: v[0] for k, v in parse_qs(u.query).items()}

    def serve_index(self):
        with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
            html = f.read()
        cookie = quote(json.dumps({"SiteID": SITE, "Username": "preview", "FirstName": "Preview", "LastName": "Shopper", "Auth": "preview"}))
        html = html.replace("<!--baseTagToken-->", '<base href="/%s/">' % SITE)
        html = html.replace(
            "<!--headscriptToken-->",
            "<script>var four51IsAnonUser=false;document.cookie='user.%s=%s; path=/';</script>" % (SITE, cookie),
        )
        # The theme loads its CDN scripts protocol-relative ("//host/..."). Four51 serves the
        # site over https, so they load over https there; under this http preview they would
        # go over plain http, which is slow or blocked, so make them https here as well.
        html = html.replace('src="//', 'src="https://').replace('href="//', 'href="https://')
        data = html.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def static(self, rel):
        full = os.path.normpath(os.path.join(ROOT, rel))
        if not full.startswith(ROOT) or not os.path.isfile(full):
            return False
        self.path = "/" + rel
        SimpleHTTPRequestHandler.do_GET(self)
        return True

    def translate_path(self, path):
        return os.path.join(ROOT, urlparse(path).path.lstrip("/"))

    # ---------------------------------------------------------------- HTTP verbs
    def do_GET(self):
        path, q = self.route()
        if path.startswith("/api/%s/" % SITE):
            return self.api("GET", path[len("/api/%s/" % SITE):], q)
        if path in ("/", "/%s" % SITE):
            self.send_response(302)
            self.send_header("Location", "/%s/" % SITE)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if path.startswith("/%s/" % SITE):
            rel = path[len("/%s/" % SITE):]
            if rel and self.static(rel):
                return
            return self.serve_index()
        self.send_error(404)

    def do_POST(self):
        path, q = self.route()
        return self.api("POST", path[len("/api/%s/" % SITE):], q, self.body())

    def do_PUT(self):
        path, q = self.route()
        return self.api("PUT", path[len("/api/%s/" % SITE):], q, self.body())

    def do_DELETE(self):
        path, q = self.route()
        return self.api("DELETE", path[len("/api/%s/" % SITE):], q)

    # ---------------------------------------------------------------- the API
    def api(self, method, path, q, body=None):
        p = path.strip("/")
        low = p.lower()
        with LOCK:
            if low == "user" and method == "GET":
                return self.send_json(USER)
            if low == "user" and method in ("POST", "PUT"):
                USER["CurrentOrderID"] = (body or {}).get("CurrentOrderID")
                return self.send_json(USER)
            if low == "categories":
                return self.send_json(CATEGORIES)
            if low.startswith("categories/"):
                cid = p.split("/", 1)[1]
                cat = next((c for c in CATEGORIES if c["InteropID"].lower() == cid.lower()), None)
                return self.send_json(cat) if cat else self.send_json({"Message": "not found"}, 404)
            if low == "products":
                cat = (q.get("CategoryInteropID") or "").lower()
                terms = (q.get("SearchTerms") or "").lower().strip()
                hits = [x for x in PRODUCTS if (not cat or x["_category"] == cat)
                        and (not terms or all(t in (x["Name"] + " " + x["InteropID"]).lower() for t in terms.split()))]
                page, size = int(q.get("Page") or 1), int(q.get("PageSize") or 10)
                return self.send_json({"List": hits[(page - 1) * size: page * size], "Count": len(hits)})
            if low.startswith("products/"):
                prod = BY_ID.get(p.split("/", 1)[1].upper())
                return self.send_json(prod) if prod else self.send_json({"Message": "Product not found"}, 404)
            if low == "shipper":
                return self.send_json(SHIPPERS)
            if low in ("address/shipping", "address/billing"):
                return self.send_json({"List": [ADDRESS], "Count": 1})
            if low == "address":
                return self.send_json({"List": [ADDRESS], "Count": 1})
            if low.startswith("address/"):
                return self.send_json(ADDRESS)
            if low in ("spendingaccount", "savedcreditcard", "message"):
                return self.send_json([])
            if low == "orderstats":
                placed = [o for o in ORDERS.values() if o["Status"] != "Unsubmitted"]
                return self.send_json([{"DisplayName": "Open", "Status": "Open", "Count": len(placed), "Type": "Standard"}])
            if low == "order" and method == "GET":
                placed = sorted((o for o in ORDERS.values() if o["Status"] != "Unsubmitted"), key=lambda o: o["DateSubmitted"], reverse=True)
                return self.send_json({"List": [summary(o) for o in placed], "Count": len(placed)})
            if low == "order" and method == "POST":
                order = body or {}
                if not order.get("ID"):
                    SEQ["order"] += 1
                    order["ID"] = "preview-%d" % SEQ["order"]
                    order["DateCreated"] = now()
                order.setdefault("Status", "Unsubmitted")
                order["StatusText"] = order["Status"]
                order.setdefault("Type", "Standard")
                order.setdefault("ShipAddressID", ADDRESS["ID"])
                order.setdefault("BillAddressID", ADDRESS["ID"])
                order["ShipAddress"] = ADDRESS
                order["BillAddress"] = ADDRESS
                order.setdefault("PaymentMethod", "PurchaseOrder")
                order.setdefault("OrderFields", [])
                order["FromUserID"] = USER["ID"]
                order["FromUserFirstName"], order["FromUserLastName"] = USER["FirstName"], USER["LastName"]
                order.setdefault("RequireCVN", True)
                ORDERS[order["ID"]] = priced(order)
                USER["CurrentOrderID"] = order["ID"]
                return self.send_json(order)
            if low == "order" and method == "PUT":
                order = priced(body or {})
                order["PaymentMethodText"] = {"CreditCard": "Credit Card", "PurchaseOrder": "Purchase Order", "BudgetAccount": "Spending Account"}.get(order.get("PaymentMethod"), order.get("PaymentMethod"))
                order["Status"] = "Open"
                order["StatusText"] = "Open"
                order["DateSubmitted"] = now()
                order["ExternalID"] = "%dPREVIEW" % SEQ["order"]
                order["FromUserFirstName"], order["FromUserLastName"] = USER["FirstName"], USER["LastName"]
                ORDERS[order["ID"]] = order
                USER["CurrentOrderID"] = None
                return self.send_json(order)
            if low == "order" and method == "DELETE":
                ORDERS.pop(USER.get("CurrentOrderID"), None)
                USER["CurrentOrderID"] = None
                return self.send_json({})
            if low.startswith("order/") and "/lineitem/" in low and method == "DELETE":
                oid, lid = p.split("/")[1], p.split("/")[3]
                order = ORDERS.get(oid)
                if order:
                    order["LineItems"] = [li for li in order["LineItems"] if li.get("ID") != lid]
                    if not order["LineItems"]:
                        ORDERS.pop(oid)
                        USER["CurrentOrderID"] = None
                        return self.send_json(None)
                    priced(order)
                return self.send_json(order)
            if low.startswith("order/") and low.endswith("/shipments"):
                return self.send_json([])
            if low.startswith("order/"):
                order = ORDERS.get(p.split("/")[1])
                return self.send_json(order) if order else self.send_json({"Message": "Order not found"}, 404)
        sys.stderr.write("  (no mock for %s %s; answered {})\n" % (method, path))
        return self.send_json({})


if __name__ == "__main__":
    print("Preview: http://localhost:%d/%s/   (placeholder catalog; Ctrl-C to stop)" % (PORT, SITE))
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
