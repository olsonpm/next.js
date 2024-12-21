"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "scheduleInSequentialTasks", {
    enumerable: true,
    get: function() {
        return scheduleInSequentialTasks;
    }
});
const _invarianterror = require("../../shared/lib/invariant-error");
function scheduleInSequentialTasks(render, followup) {
    if (process.env.NEXT_RUNTIME === 'edge') {
        throw new _invarianterror.InvariantError('`scheduleInSequentialTasks` should not be called in edge runtime.');
    } else {
        return new Promise((resolve, reject)=>{
            let pendingResult;
            setImmediate(()=>{
                try {
                    pendingResult = render();
                } catch (err) {
                    reject(err);
                }
            });
            setImmediate(()=>{
                followup();
                resolve(pendingResult);
            });
        });
    }
}

//# sourceMappingURL=app-render-render-utils.js.map