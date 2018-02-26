'use strict';

const CircuitBreakerState = require('../index');

class Circuit {
    constructor(promise, options) {
        this._promise = promise;
        this._cb = new CircuitBreakerState(options);
    }
    async run(...args) {
        const error = this._cb.test();

        if (error) {
            throw error;
        }

        try {
            const result = await this._promise(...args);
            this._cb.succeed();
            return result;
        }
        catch (error) {
            this._cb.fail();
            throw error;
        }
    }
}

let failCounter = 0;

const circuit = new Circuit(async function () {
    if (failCounter < 1) {
        ++failCounter;
        throw new Error('failed.');
    }
    return 'hello world';
}, { maxFailures: 1, resetTimeout: 100 });

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
            console.log(await circuit.run());
        }
        catch (error) {
            console.log(error.message);
        }
    }
};

run().then(() => console.log('done.')).catch((e) => console.log(e));
