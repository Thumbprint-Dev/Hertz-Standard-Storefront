/**
 * Who is signed in: the auth token in the `user.<apiName>` cookie.
 *
 * This theme used to carry the pre-2019 Storefront 2.0 version, which read the cookie with
 * Angular's $cookieStore. $cookieStore only reads JSON (`{"Auth":"..."}`, the shape this
 * file used to write). Four51 now sets the cookie itself on SSO and punchout handoffs, and
 * since COMTOOLS-1266 / COMTOOLS-1724 (Four51/Four51Storefront) it is the bare token. On a
 * bare token $cookieStore.get throws inside `isAuthenticated()`, index.html reads that as
 * "not signed in", and a punchout user lands on the login screen.
 *
 * This reads both shapes, never throws, and writes the cookie the way current Four51 does:
 * the bare token, `SameSite=None; Secure`, so it also works when a procurement system opens
 * the store in a frame.
 */
four51.app.factory('Security', ['$451', function($451) {
    var _cookieName = 'user.' + $451.apiName;
    var logout = false;

    // The raw value of a cookie. An exact name match first; then, case-insensitively, the
    // same name, because the app name in the URL and the one Four51 named the cookie after
    // have been known to differ in case after a TEST restore.
    function readCookie(cname) {
        var parts = (document.cookie || '').split(';');
        var loose = null;
        for (var i = 0; i < parts.length; i++) {
            var c = parts[i].replace(/^\s+/, '');
            var eq = c.indexOf('=');
            if (eq < 0) continue;
            var name = c.substring(0, eq).replace(/\s+$/, '');
            var value = c.substring(eq + 1).replace(/^\s+/, '');
            if (name === cname) return value;
            if (loose === null && name.toLowerCase() === cname.toLowerCase()) loose = value;
        }
        return loose || '';
    }

    function decode(v) {
        try { return decodeURIComponent(v); } catch (e) { return v; }
    }

    // The token, from any shape Four51 has used (Four51/Four51Storefront history):
    //   2015: {"Username":...,"Auth":"tok"}  JSON user, via $cookieStore
    //   2019: "tok"                          JSON string, via $cookieStore (COMTOOLS-1266)
    //   2021: tok                            bare token (COMTOOLS-1724, the current base)
    function token() {
        var raw = decode(readCookie(_cookieName));
        if (!raw) return null;
        var first = raw.charAt(0);
        if (first === '{' || first === '"') {
            try {
                var parsed = JSON.parse(raw);
                if (typeof parsed === 'string') return parsed || null;
                return parsed && parsed.Auth ? parsed.Auth : null;
            } catch (e) {
                return null;
            }
        }
        return raw;
    }

    function expire(name) {
        var gone = '=; expires=Thu, 01 Jan 1970 00:00:00 UTC';
        document.cookie = name + gone + '; path=/' + $451.apiName;
        document.cookie = name + gone + '; path=/' + $451.apiName + '/';
    }

    return {
        init: function(user, auth) {
            logout = false;
            // Raw, as current Four51 writes it (Four51/Four51Storefront securityService.js).
            document.cookie = _cookieName + '=' + auth +
                '; path=/' + $451.apiName + '/; SameSite=None; Secure';
        },
        clear: function() {
            expire(_cookieName);
        },
        auth: function() {
            return token();
        },
        isAuthenticated: function() {
            if (logout) return false;
            return !!token();
        },
        logout: function() {
            logout = true;
            expire(_cookieName);
        }
    };
}]);
