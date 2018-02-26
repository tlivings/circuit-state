'use strict';

const CircuitBreakerState = require('../index');

const once = function (fn) {
    let called = false;
    return function (...args) {
        if (called) {
            return;
        }
        called++;
        fn(...args);
    };
};

class Circuit {
    constructor(func, options) {
        this._func = func;
        this._cb = new CircuitBreakerState(options);
        this._timeout = options.timeout;
    }
    run(...args) {
        let timer = undefined;
        const callback = once(args[args.length - 1]);

        const error = this._cb.test();

        if (error) {
            callback(error);
            return;
        }

        args[args.length - 1] = (error, ...result) => {
            if (error) {
                this._cb.fail();
                callback(error);
                return;
            }
            this._cb.succeed();
            callback(null, ...result);
        };

        if (this._timeout) {
            timer = setTimeout(() => {
                const error = new Error('Command timed out');
                error.code = 'ETIMEDOUT';
                this._cb.fail();
                this._cb.stats.increment('timeout');
                callback(error);
                return;
            }, this._timeout);
            timer.unref();
        }

        return this._func.call(null, ...args);
    }
}

const circuit = new Circuit(function (callback) {
    setTimeout(() => {
        callback(null, 'hello world');
    }, 100);
}, { timeout: 10 });

circuit.run((error, result) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log(result);
});
