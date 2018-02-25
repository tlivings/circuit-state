'use strict';

const StateMachine = require('../../index');

const circuitBreaker = function (func) {
    const cb = new StateMachine();

    return {
        run: function (...args) {
            const callback = args[args.length - 1];
            const error = cb.test();

            if (error) {
                callback(error);
                return;
            }

            args[args.length - 1] = function (error, ...result) {
                if (error) {
                    cb.failure();
                    callback(error);
                    return;
                }
                cb.success();
                callback(null, ...result);
            };

            return func(...args);
        }
    }
};

const breaker = circuitBreaker(function (callback) {
    callback(null, 'hello world');
});

breaker.run((error, result) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log(result);
});

