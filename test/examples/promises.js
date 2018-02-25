'use strict';

const StateMachine = require('../../index');

const circuitBreaker = function (deferred) {
    const cb = new StateMachine({ maxFailures: 1, resetTimeout: 100 });

    return {
        run: async function (...args) {
            const error = cb.test();

            if (error) {
                throw error;
            }

            try {
                const result = await deferred(...args);
                cb.success();
                return result;
            }
            catch (error) {
                cb.failure();
                throw error;
            }
        }
    }
};

let failCounter = 0;

const breaker = circuitBreaker(async function () {
    if (failCounter < 1) {
        ++failCounter;
        throw new Error('failed.');
    }
    return 'hello world';
});

const timer = function (t) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), t);
    });
};

const run = async function () {
    for (let i = 0; i < 4; i++) {
        try {
            if (i === 3) {
                await timer(150);
            }
            console.log(await breaker.run());
        }
        catch (error) {
            console.log(error.message);
        }
    }
};

run().then(() => console.log('done.')).catch((e) => console.log(e));
