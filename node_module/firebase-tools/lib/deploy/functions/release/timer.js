"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timer = void 0;
class Timer {
    constructor() {
        this.start = process.hrtime.bigint();
    }
    stop() {
        const stop = process.hrtime.bigint();
        const elapsedNanos = stop - this.start;
        return Number(elapsedNanos / BigInt(1e6));
    }
}
exports.Timer = Timer;
