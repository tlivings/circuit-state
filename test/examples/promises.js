'use strict';

const StateMachine = require('../../index');

const circuitBreaker = function (deferred) {
    const cb = new StateMachine();

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

const breaker = circuitBreaker(async function () {
    return 'hello world';
});

breaker.run().then((result) => {
    console.log(result);
}).catch((error) => {
    console.log(error);
});

