'use strict';

const CircuitBreakerState = require('../index');

class Circuit {
    constructor(func, options) {
        this._func = func;
        this._cb = new CircuitBreakerState(options);
    }
    run(...args) {
        const callback = args[args.length - 1];

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

        return this._func.call(null, ...args);
    }
}

const circuit = new Circuit(function (callback) {
    callback(null, 'hello world');
});

circuit.run((error, result) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log(result);
});

