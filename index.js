'use strict';

const OPEN = Symbol('open'); //eslint-disable-line no-undef
const CLOSED = Symbol('closed'); //eslint-disable-line no-undef
const HALF_OPEN = Symbol('half_open'); //eslint-disable-line no-undef

class CircuitBreakerOpenError extends Error {
    constructor() {
        super('Circuit breaker is open');
        this.name = 'CircuitBreakerOpenError';
        this.code = 'EPERM';
    }
}

class Stats {
    constructor(CircuitBreakerState) {
        this._CircuitBreakerState = CircuitBreakerState;
        this._counts = {
            executions: 0,
            successes: 0,
            failures: 0
        };
    }

    increment(key) {
        if (!this._counts[key]) {
            this._counts[key] = 0;
        }
        if (this._counts[key] === Number.MAX_SAFE_INTEGER) {
            this._counts[key] = 0;
        }
        this._counts[key] += 1;
    }

    reset(key) {
        this._counts[key] = 0;
    }

    resetAll() {
        Object.keys(this._counts).forEach((key) => {
            this.reset(key);
        });
    }

    snapshot() {
        return Object.assign({ open : this._CircuitBreakerState.open, ...this._counts });
    }
}

class CircuitBreakerState {
    constructor({ maxFailures = 3, resetTimeout = 10000 } = {}) {
        this._state = CLOSED;
        this._maxFailures = maxFailures;
        this._failures = 0;
        this._resetTimer = undefined;
        this._resetTimeout = resetTimeout;
        this._stats = new Stats(this);
    }

    static create(options) {
        return new CircuitBreakerState(options);
    }

    get maxFailures() {
        return this._maxFailures;
    }

    get resetTimeout() {
        return this._resetTimeout;
    }

    get stats() {
        return this._stats;
    }

    _open() {
        clearTimeout(this._resetTimer);
        this._state = OPEN;
        this._resetTimer = setTimeout(() => {
            this._halfOpen();
        }, this._resetTimeout);
        this._resetTimer.unref();
        this._failures = 0;
    }

    _halfOpen() {
        this._state = HALF_OPEN;
    }

    _close() {
        clearTimeout(this._resetTimer);
        this._state = CLOSED;
    }

    fail() {
        ++this._failures;
        if (this.halfOpen) {
            this._open();
            return;
        }
        if (this._failures === this._maxFailures) {
            this._open();
        }
        this._stats.increment('executions');
        this._stats.increment('failures');
    }

    succeed() {
        this._failures = 0;
        if (this.halfOpen) {
            this._close();
        }
        this._stats.increment('executions');
        this._stats.increment('successes');
    }

    get open() {
        return this._state === OPEN;
    }

    get halfOpen() {
        return this._state === HALF_OPEN;
    }

    get closed() {
        return this._state == CLOSED;
    }

    test() {
        if (this.open) {
            return new CircuitBreakerOpenError();
        }
    }
}

module.exports = CircuitBreakerState;
