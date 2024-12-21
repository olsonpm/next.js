"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DevPagesAPIRouteMatcherProvider", {
    enumerable: true,
    get: function() {
        return DevPagesAPIRouteMatcherProvider;
    }
});
const _pagesapiroutematcher = require("../../route-matchers/pages-api-route-matcher");
const _routekind = require("../../route-kind");
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
const _filecacheroutematcherprovider = require("./file-cache-route-matcher-provider");
const _pages = require("../../normalizers/built/pages");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
class DevPagesAPIRouteMatcherProvider extends _filecacheroutematcherprovider.FileCacheRouteMatcherProvider {
    constructor(pagesDir, extensions, reader, localeNormalizer){
        super(pagesDir, reader), this.pagesDir = pagesDir, this.extensions = extensions, this.localeNormalizer = localeNormalizer;
        // Match any route file that ends with `/${filename}.${extension}` under the
        // pages directory.
        this.expression = new RegExp(`\\.(?:${extensions.join('|')})$`);
        this.normalizers = new _pages.DevPagesNormalizers(pagesDir, extensions);
    }
    test(filename) {
        // If the file does not end in the correct extension it's not a match.
        if (!this.expression.test(filename)) return false;
        // Pages API routes must exist in the pages directory with the `/api/`
        // prefix. The pathnames being tested here though are the full filenames,
        // so we need to include the pages directory.
        // TODO: could path separator normalization be needed here?
        if (filename.startsWith(_path.default.join(this.pagesDir, '/api/'))) return true;
        for (const extension of this.extensions){
            // We can also match if we have `pages/api.${extension}`, so check to
            // see if it's a match.
            if (filename === _path.default.join(this.pagesDir, `api.${extension}`)) {
                return true;
            }
        }
        return false;
    }
    async transform(files) {
        const matchers = [];
        for (const filename of files){
            // If the file isn't a match for this matcher, then skip it.
            if (!this.test(filename)) continue;
            const pathname = this.normalizers.pathname.normalize(filename);
            const page = this.normalizers.page.normalize(filename);
            const bundlePath = this.normalizers.bundlePath.normalize(filename);
            if (this.localeNormalizer) {
                matchers.push(new _pagesapiroutematcher.PagesAPILocaleRouteMatcher({
                    kind: _routekind.RouteKind.PAGES_API,
                    pathname,
                    page,
                    bundlePath,
                    filename,
                    i18n: {}
                }));
            } else {
                matchers.push(new _pagesapiroutematcher.PagesAPIRouteMatcher({
                    kind: _routekind.RouteKind.PAGES_API,
                    pathname,
                    page,
                    bundlePath,
                    filename
                }));
            }
        }
        return matchers;
    }
}

//# sourceMappingURL=dev-pages-api-route-matcher-provider.js.map