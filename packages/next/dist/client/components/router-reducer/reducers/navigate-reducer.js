"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    handleExternalUrl: null,
    navigateReducer: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    handleExternalUrl: function() {
        return handleExternalUrl;
    },
    navigateReducer: function() {
        return navigateReducer;
    }
});
const _fetchserverresponse = require("../fetch-server-response");
const _createhreffromurl = require("../create-href-from-url");
const _invalidatecachebelowflightsegmentpath = require("../invalidate-cache-below-flight-segmentpath");
const _applyrouterstatepatchtotree = require("../apply-router-state-patch-to-tree");
const _shouldhardnavigate = require("../should-hard-navigate");
const _isnavigatingtonewrootlayout = require("../is-navigating-to-new-root-layout");
const _routerreducertypes = require("../router-reducer-types");
const _handlemutable = require("../handle-mutable");
const _applyflightdata = require("../apply-flight-data");
const _prefetchreducer = require("./prefetch-reducer");
const _approuter = require("../../app-router");
const _segment = require("../../../../shared/lib/segment");
const _pprnavigations = require("../ppr-navigations");
const _prefetchcacheutils = require("../prefetch-cache-utils");
const _clearcachenodedataforsegmentpath = require("../clear-cache-node-data-for-segment-path");
const _aliasedprefetchnavigations = require("../aliased-prefetch-navigations");
const _navigation = require("../../segment-cache/navigation");
function handleExternalUrl(state, mutable, url, pendingPush) {
    mutable.mpaNavigation = true;
    mutable.canonicalUrl = url;
    mutable.pendingPush = pendingPush;
    mutable.scrollableSegments = undefined;
    return (0, _handlemutable.handleMutable)(state, mutable);
}
function generateSegmentsFromPatch(flightRouterPatch) {
    const segments = [];
    const [segment, parallelRoutes] = flightRouterPatch;
    if (Object.keys(parallelRoutes).length === 0) {
        return [
            [
                segment
            ]
        ];
    }
    for (const [parallelRouteKey, parallelRoute] of Object.entries(parallelRoutes)){
        for (const childSegment of generateSegmentsFromPatch(parallelRoute)){
            // If the segment is empty, it means we are at the root of the tree
            if (segment === '') {
                segments.push([
                    parallelRouteKey,
                    ...childSegment
                ]);
            } else {
                segments.push([
                    segment,
                    parallelRouteKey,
                    ...childSegment
                ]);
            }
        }
    }
    return segments;
}
function triggerLazyFetchForLeafSegments(newCache, currentCache, flightSegmentPath, treePatch) {
    let appliedPatch = false;
    newCache.rsc = currentCache.rsc;
    newCache.prefetchRsc = currentCache.prefetchRsc;
    newCache.loading = currentCache.loading;
    newCache.parallelRoutes = new Map(currentCache.parallelRoutes);
    const segmentPathsToFill = generateSegmentsFromPatch(treePatch).map((segment)=>[
            ...flightSegmentPath,
            ...segment
        ]);
    for (const segmentPaths of segmentPathsToFill){
        (0, _clearcachenodedataforsegmentpath.clearCacheNodeDataForSegmentPath)(newCache, currentCache, segmentPaths);
        appliedPatch = true;
    }
    return appliedPatch;
}
function handleNavigationResult(state, mutable, pendingPush, result) {
    switch(result.tag){
        case _navigation.NavigationResultTag.MPA:
            {
                // Perform an MPA navigation.
                const newUrl = result.data;
                return handleExternalUrl(state, mutable, newUrl, pendingPush);
            }
        case _navigation.NavigationResultTag.NoOp:
            // The server responded with no change to the current page.
            return (0, _handlemutable.handleMutable)(state, mutable);
        case _navigation.NavigationResultTag.Success:
            {
                // Received a new result.
                mutable.cache = result.data.cacheNode;
                mutable.patchedTree = result.data.flightRouterState;
                mutable.canonicalUrl = result.data.canonicalUrl;
                // TODO: Not yet implemented
                // mutable.scrollableSegments = scrollableSegments
                // mutable.hashFragment = hash
                // mutable.shouldScroll = shouldScroll
                return (0, _handlemutable.handleMutable)(state, mutable);
            }
        case _navigation.NavigationResultTag.Async:
            {
                return result.data.then((asyncResult)=>handleNavigationResult(state, mutable, pendingPush, asyncResult), // If the navigation failed, return the current state.
                // TODO: This matches the current behavior but we need to do something
                // better here if the network fails.
                ()=>{
                    return state;
                });
            }
        default:
            const _exhaustiveCheck = result;
            return state;
    }
}
function navigateReducer(state, action) {
    const { url, isExternalUrl, navigateType, shouldScroll, allowAliasing } = action;
    const mutable = {};
    const { hash } = url;
    const href = (0, _createhreffromurl.createHrefFromUrl)(url);
    const pendingPush = navigateType === 'push';
    // we want to prune the prefetch cache on every navigation to avoid it growing too large
    (0, _prefetchcacheutils.prunePrefetchCache)(state.prefetchCache);
    mutable.preserveCustomHistoryState = false;
    mutable.pendingPush = pendingPush;
    if (isExternalUrl) {
        return handleExternalUrl(state, mutable, url.toString(), pendingPush);
    }
    // Handles case where `<meta http-equiv="refresh">` tag is present,
    // which will trigger an MPA navigation.
    if (document.getElementById('__next-page-redirect')) {
        return handleExternalUrl(state, mutable, href, pendingPush);
    }
    if (process.env.__NEXT_PPR && process.env.__NEXT_CLIENT_SEGMENT_CACHE) {
        // (Very Early Experimental Feature) Segment Cache
        //
        // Bypass the normal prefetch cache and use the new per-segment cache
        // implementation instead. This is only supported if PPR is enabled, too.
        //
        // Temporary glue code between the router reducer and the new navigation
        // implementation. Eventually we'll rewrite the router reducer to a
        // state machine.
        // TODO: Currently this always returns an async result, but in the future
        // it will return a sync result if the navigation was prefetched. Hence
        // a result type that's more complicated than you might expect.
        const result = (0, _navigation.navigate)(url, state.cache, state.tree, state.nextUrl);
        return handleNavigationResult(state, mutable, pendingPush, result);
    }
    const prefetchValues = (0, _prefetchcacheutils.getOrCreatePrefetchCacheEntry)({
        url,
        nextUrl: state.nextUrl,
        tree: state.tree,
        prefetchCache: state.prefetchCache,
        allowAliasing
    });
    const { treeAtTimeOfPrefetch, data } = prefetchValues;
    _prefetchreducer.prefetchQueue.bump(data);
    return data.then((param)=>{
        let { flightData, canonicalUrl: canonicalUrlOverride, postponed } = param;
        let isFirstRead = false;
        // we only want to mark this once
        if (!prefetchValues.lastUsedTime) {
            // important: we should only mark the cache node as dirty after we unsuspend from the call above
            prefetchValues.lastUsedTime = Date.now();
            isFirstRead = true;
        }
        // Handle case when navigating to page in `pages` from `app`
        if (typeof flightData === 'string') {
            return handleExternalUrl(state, mutable, flightData, pendingPush);
        }
        const updatedCanonicalUrl = canonicalUrlOverride ? (0, _createhreffromurl.createHrefFromUrl)(canonicalUrlOverride) : href;
        const onlyHashChange = !!hash && state.canonicalUrl.split('#', 1)[0] === updatedCanonicalUrl.split('#', 1)[0];
        // If only the hash has changed, the server hasn't sent us any new data. We can just update
        // the mutable properties responsible for URL and scroll handling and return early.
        if (onlyHashChange) {
            mutable.onlyHashChange = true;
            mutable.canonicalUrl = updatedCanonicalUrl;
            mutable.shouldScroll = shouldScroll;
            mutable.hashFragment = hash;
            mutable.scrollableSegments = [];
            return (0, _handlemutable.handleMutable)(state, mutable);
        }
        if (prefetchValues.aliased) {
            const result = (0, _aliasedprefetchnavigations.handleAliasedPrefetchEntry)(state, flightData, url, mutable);
            // We didn't return new router state because we didn't apply the aliased entry for some reason.
            // We'll re-invoke the navigation handler but ensure that we don't attempt to use the aliased entry. This
            // will create an on-demand prefetch entry.
            if (result === false) {
                return navigateReducer(state, {
                    ...action,
                    allowAliasing: false
                });
            }
            return result;
        }
        let currentTree = state.tree;
        let currentCache = state.cache;
        let scrollableSegments = [];
        for (const normalizedFlightData of flightData){
            const { pathToSegment: flightSegmentPath, seedData, head, isHeadPartial, isRootRender } = normalizedFlightData;
            let treePatch = normalizedFlightData.tree;
            // TODO-APP: remove ''
            const flightSegmentPathWithLeadingEmpty = [
                '',
                ...flightSegmentPath
            ];
            // Create new tree based on the flightSegmentPath and router state patch
            let newTree = (0, _applyrouterstatepatchtotree.applyRouterStatePatchToTree)(// TODO-APP: remove ''
            flightSegmentPathWithLeadingEmpty, currentTree, treePatch, href);
            // If the tree patch can't be applied to the current tree then we use the tree at time of prefetch
            // TODO-APP: This should instead fill in the missing pieces in `currentTree` with the data from `treeAtTimeOfPrefetch`, then apply the patch.
            if (newTree === null) {
                newTree = (0, _applyrouterstatepatchtotree.applyRouterStatePatchToTree)(// TODO-APP: remove ''
                flightSegmentPathWithLeadingEmpty, treeAtTimeOfPrefetch, treePatch, href);
            }
            if (newTree !== null) {
                if ((0, _isnavigatingtonewrootlayout.isNavigatingToNewRootLayout)(currentTree, newTree)) {
                    return handleExternalUrl(state, mutable, href, pendingPush);
                }
                if (// This is just a paranoid check. When a route is PPRed, the server
                // will send back a static response that's rendered from
                // the root. If for some reason it doesn't, we fall back to the
                // non-PPR implementation.
                // TODO: We should get rid of the else branch and do all navigations
                // via updateCacheNodeOnNavigation. The current structure is just
                // an incremental step.
                seedData && isRootRender && postponed) {
                    const task = (0, _pprnavigations.updateCacheNodeOnNavigation)(currentCache, currentTree, treePatch, seedData, head, isHeadPartial);
                    if (task !== null) {
                        // Use the tree computed by updateCacheNodeOnNavigation instead
                        // of the one computed by applyRouterStatePatchToTree.
                        // TODO: We should remove applyRouterStatePatchToTree
                        // from the PPR path entirely.
                        const patchedRouterState = task.route;
                        newTree = patchedRouterState;
                        const newCache = task.node;
                        if (newCache !== null) {
                            // We've created a new Cache Node tree that contains a prefetched
                            // version of the next page. This can be rendered instantly.
                            mutable.cache = newCache;
                        }
                        if (task.needsDynamicRequest) {
                            // The prefetched tree has dynamic holes in it. We initiate a
                            // dynamic request to fill them in.
                            //
                            // Do not block on the result. We'll immediately render the Cache
                            // Node tree and suspend on the dynamic parts. When the request
                            // comes in, we'll fill in missing data and ping React to
                            // re-render. Unlike the lazy fetching model in the non-PPR
                            // implementation, this is modeled as a single React update +
                            // streaming, rather than multiple top-level updates. (However,
                            // even in the new model, we'll still need to sometimes update the
                            // root multiple times per navigation, like if the server sends us
                            // a different response than we expected. For now, we revert back
                            // to the lazy fetching mechanism in that case.)
                            const dynamicRequest = (0, _fetchserverresponse.fetchServerResponse)(url, {
                                flightRouterState: currentTree,
                                nextUrl: state.nextUrl
                            });
                            (0, _pprnavigations.listenForDynamicRequest)(task, dynamicRequest);
                        // We store the dynamic request on the `lazyData` property of the CacheNode
                        // because we're not going to await the dynamic request here. Since we're not blocking
                        // on the dynamic request, `layout-router` will
                        // task.node.lazyData = dynamicRequest
                        } else {
                        // The prefetched tree does not contain dynamic holes — it's
                        // fully static. We can skip the dynamic request.
                        }
                    } else {
                        // Nothing changed, so reuse the old cache.
                        // TODO: What if the head changed but not any of the segment data?
                        // Is that possible? If so, we should clone the whole tree and
                        // update the head.
                        newTree = treePatch;
                    }
                } else {
                    // The static response does not include any dynamic holes, so
                    // there's no need to do a second request.
                    // TODO: As an incremental step this just reverts back to the
                    // non-PPR implementation. We can simplify this branch further,
                    // given that PPR prefetches are always static and return the whole
                    // tree. Or in the meantime we could factor it out into a
                    // separate function.
                    const cache = (0, _approuter.createEmptyCacheNode)();
                    let applied = false;
                    if (prefetchValues.status === _routerreducertypes.PrefetchCacheEntryStatus.stale && !isFirstRead) {
                        // When we have a stale prefetch entry, we only want to re-use the loading state of the route we're navigating to, to support instant loading navigations
                        // this will trigger a lazy fetch for the actual page data by nulling the `rsc` and `prefetchRsc` values for page data,
                        // while copying over the `loading` for the segment that contains the page data.
                        // We only do this on subsequent reads, as otherwise there'd be no loading data to re-use.
                        // We skip this branch if only the hash fragment has changed, as we don't want to trigger a lazy fetch in that case
                        applied = triggerLazyFetchForLeafSegments(cache, currentCache, flightSegmentPath, treePatch);
                        // since we re-used the stale cache's loading state & refreshed the data,
                        // update the `lastUsedTime` so that it can continue to be re-used for the next 30s
                        prefetchValues.lastUsedTime = Date.now();
                    } else {
                        applied = (0, _applyflightdata.applyFlightData)(currentCache, cache, normalizedFlightData, prefetchValues);
                    }
                    const hardNavigate = (0, _shouldhardnavigate.shouldHardNavigate)(// TODO-APP: remove ''
                    flightSegmentPathWithLeadingEmpty, currentTree);
                    if (hardNavigate) {
                        // Copy rsc for the root node of the cache.
                        cache.rsc = currentCache.rsc;
                        cache.prefetchRsc = currentCache.prefetchRsc;
                        (0, _invalidatecachebelowflightsegmentpath.invalidateCacheBelowFlightSegmentPath)(cache, currentCache, flightSegmentPath);
                        // Ensure the existing cache value is used when the cache was not invalidated.
                        mutable.cache = cache;
                    } else if (applied) {
                        mutable.cache = cache;
                        // If we applied the cache, we update the "current cache" value so any other
                        // segments in the FlightDataPath will be able to reference the updated cache.
                        currentCache = cache;
                    }
                }
                currentTree = newTree;
                for (const subSegment of generateSegmentsFromPatch(treePatch)){
                    const scrollableSegmentPath = [
                        ...flightSegmentPath,
                        ...subSegment
                    ];
                    // Filter out the __DEFAULT__ paths as they shouldn't be scrolled to in this case.
                    if (scrollableSegmentPath[scrollableSegmentPath.length - 1] !== _segment.DEFAULT_SEGMENT_KEY) {
                        scrollableSegments.push(scrollableSegmentPath);
                    }
                }
            }
        }
        mutable.patchedTree = currentTree;
        mutable.canonicalUrl = updatedCanonicalUrl;
        mutable.scrollableSegments = scrollableSegments;
        mutable.hashFragment = hash;
        mutable.shouldScroll = shouldScroll;
        return (0, _handlemutable.handleMutable)(state, mutable);
    }, ()=>state);
}

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  Object.assign(exports.default, exports);
  module.exports = exports.default;
}

//# sourceMappingURL=navigate-reducer.js.map