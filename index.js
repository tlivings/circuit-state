'use strict';

const { EventEmitter } = require('events');

const OPEN = Symbol('open');
const CLOSED = Symbol('closed');
const HALF_OPEN = Symbol('half_open');

const FAILURE = Symbol('failure');
const SUCCESS = Symbol('success');


class CircuitBreakerOpenException extends Error {
    constructor() {
        super('Circuit breaker is open');
        this.name = 'CircuitBreakerOpenException';
        this.code = 'EPERM';
    }
}

class Stats {
    constructor(stateMachine) {
        this._stateMachine = stateMachine;
        this._counts = {
            executions: 0,
            successes: 0,
            failures: 0
        };

        stateMachine.on(SUCCESS, () => {
            this.increment('executions');
            this.increment('successes');
        });
        stateMachine.on(FAILURE, () => {
            this.increment('executions');
            this.increment('failures');
        });
    }

    increment(key) {
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
        return Object.assign({ open : this._stateMachine.isOpen(), ...this._counts });
    }
}

class StateMachine extends EventEmitter {
    constructor({ maxFailures = 3, resetTimeout = 10000 } = {}) {
        super();
        this._state = CLOSED;
        this._maxFailures = maxFailures;
        this._failures = 0;
        this._resetTimer = undefined;
        this._resetTimeout = resetTimeout;
        this._stats = new Stats(this);
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
        this.emit(OPEN);
    }

    _halfOpen() {
        this._state = HALF_OPEN;
        this.emit(HALF_OPEN);
    }

    _close() {
        clearTimeout(this._resetTimer);
        this._state = CLOSED;
        this.emit(CLOSED);
    }

    failure() {
        ++this._failures;
        if (this.isHalfOpen()) {
            this._open();
            return;
        }
        if (this._failures === this._maxFailures) {
            this._open();
        }
        this.emit(FAILURE);
    }

    success() {
        this._failures = 0;
        if (this.isHalfOpen()) {
            this._close();
        }
        this.emit(SUCCESS);
    }

    isOpen() {
        return this._state === OPEN;
    }

    isHalfOpen() {
        return this._state === HALF_OPEN;
    }

    test() {
        if (this.isOpen()) {
            return new CircuitBreakerOpenException();
        }
    }
}

module.exports = StateMachine;