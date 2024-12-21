"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    AwaiterMulti: null,
    AwaiterOnce: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    AwaiterMulti: function() {
        return AwaiterMulti;
    },
    AwaiterOnce: function() {
        return AwaiterOnce;
    }
});
const _invarianterror = require("../../shared/lib/invariant-error");
class AwaiterMulti {
    constructor({ onError } = {}){
        this.promises = new Set();
        this.waitUntil = (promise)=>{
            // if a promise settles before we await it, we can drop it.
            const cleanup = ()=>{
                this.promises.delete(promise);
            };
            this.promises.add(promise.then(cleanup, (err)=>{
                cleanup();
                this.onError(err);
            }));
        };
        this.onError = onError ?? console.error;
    }
    async awaiting() {
        while(this.promises.size > 0){
            const promises = Array.from(this.promises);
            this.promises.clear();
            await Promise.all(promises);
        }
    }
}
class AwaiterOnce {
    constructor(options = {}){
        this.done = false;
        this.waitUntil = (promise)=>{
            if (this.done) {
                throw new _invarianterror.InvariantError('Cannot call waitUntil() on an AwaiterOnce that was already awaited');
            }
            return this.awaiter.waitUntil(promise);
        };
        this.awaiter = new AwaiterMulti(options);
    }
    async awaiting() {
        if (!this.pending) {
            this.pending = this.awaiter.awaiting().finally(()=>{
                this.done = true;
            });
        }
        return this.pending;
    }
}

//# sourceMappingURL=awaiter.js.map