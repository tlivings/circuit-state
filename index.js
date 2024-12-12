(function (global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } 
  else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } 
  else {
    global.CircuitBreakerState = factory().CircuitBreakerState;
    global.CircuitBreakerOpenError = factory().CircuitBreakerOpenError;
  }
}(typeof window !== 'undefined' ? window : this, function () {

  const OPEN = Symbol('open');
  const CLOSED = Symbol('closed');
  const HALF_OPEN = Symbol('half_open');

  const SUCCEEDED_EVENT = 'succeeded';
  const FAILED_EVENT = 'failed';
  const CLOSED_EVENT = 'closed';
  const OPEN_EVENT = 'opened';
  const HALF_OPEN_EVENT = 'half_opened';

  const EXECUTIONS = 'executions';
  const SUCCESSES = 'successes';
  const FAILURES = 'failures';

  class CircuitBreakerOpenError extends Error {
    constructor() {
      super('Circuit breaker is open');
      this.name = 'CircuitBreakerOpenError';
      this.code = 'EPERM';
    }
  }

  class CircuitBreakerEventEmitter {
    constructor() {
      this._events = {};
    }

    on(event, listener) {
      if (!this._events[event]) {
        this._events[event] = [];
      }
      this._events[event].push(listener);
      return this; 
    }

    once(event, listener) {
      const onceWrapper = (...args) => {
        listener(...args);
        this.removeListener(event, onceWrapper);
      };
      this.on(event, onceWrapper);
      return this;
    }

    removeListener(event, listener) {
      if (!this._events[event]) return this;
      this._events[event] = this._events[event].filter((l) => l !== listener);
      return this;
    }

    off(event, listener) {
      return this.removeListener(event, listener);
    }

    emit(event, ...args) {
      if (!this._events[event]) return false;
      this._events[event].forEach((listener) => listener(...args));
      return true;
    }

    removeAllListeners(event) {
      if (event) {
        delete this._events[event];
      } else {
        this._events = {};
      }
      return this;
    }
  }

  class Stats {
    constructor(cbState) {
      this._cbState = cbState;
      this._counts = {
        executions: 0,
        successes: 0,
        failures: 0
      };
    }

    increment(key) {
      if (key === 'open') {
        return;
      }
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
      return Object.assign({ open: this._cbState.open, ...this._counts });
    }
  }

  class CircuitBreakerState {
    constructor({ maxFailures = 3, resetTime = 10000 } = {}) {
      this._state = CLOSED;
      this._maxFailures = maxFailures;
      this._failures = 0;
      this._resetTimer = undefined;
      this._resetTime = resetTime;
      this._resetManually = resetTime <= 0 ? true : false;
      this._stats = new Stats(this);
      this._events = new CircuitBreakerEventEmitter();
    }

    static create(options) {
      return new CircuitBreakerState(options);
    }

    get maxFailures() {
      return this._maxFailures;
    }

    get resetTime() {
      return this._resetTime;
    }

    get stats() {
      return this._stats;
    }

    get events() {
      return this._events;
    }

    _open() {
      clearTimeout(this._resetTimer);
      this._state = OPEN;
      this._events.emit(OPEN_EVENT, this._stats.snapshot());
      if (!this._resetManually) {
        this._resetTimer = setTimeout(() => {
          this._halfOpen();
        }, this._resetTime);
        if (this._resetTimer.unref) {
          this._resetTimer.unref();
        }
      }
      this._failures = 0;
    }

    _halfOpen() {
      this._state = HALF_OPEN;
      this._events.emit(HALF_OPEN_EVENT, this._stats.snapshot());
    }

    _close() {
      clearTimeout(this._resetTimer);
      this._state = CLOSED;
      this._events.emit(CLOSED_EVENT, this._stats.snapshot());
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
      this._stats.increment(EXECUTIONS);
      this._stats.increment(FAILURES);

      this._events.emit(FAILED_EVENT, this._stats.snapshot());
    }

    succeed() {
      this._failures = 0;
      if (this.halfOpen) {
        this._close();
      }
      this._stats.increment(EXECUTIONS);
      if (this.closed) {
        this._stats.increment(SUCCESSES);
      } 
      else {
        this._stats.increment(FAILURES);
      }

      this._events.emit(this.closed ? SUCCEEDED_EVENT : FAILED_EVENT, this._stats.snapshot());
    }

    tryReset() {
      clearTimeout(this._resetTimer);
      this._halfOpen();
    }

    get open() {
      return this._state === OPEN;
    }

    get halfOpen() {
      return this._state === HALF_OPEN;
    }

    get closed() {
      return this._state === CLOSED;
    }

    test() {
      if (this.open) {
        return new CircuitBreakerOpenError();
      }
    }
  }

  return CircuitBreakerState;

}));
