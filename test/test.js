'use strict';

const Test = require('tape');
const CircuitBreakerState = require('../index');

Test('initial state', (t) => {
    t.plan(10);

    const cb = new CircuitBreakerState();

    t.ok(cb.closed, 'starts closed.');
    t.ok(!cb.open, 'not open.');
    t.ok(!cb.halfOpen, 'not half open.');
    t.equal(cb._failures,0, 'no failures.');
    t.ok(cb._stats, 'stats exists.');
    t.equal(cb.maxFailures,3, 'maxFailures 3.');
    t.equal(cb.resetTime,10000, 'resetTime 10000.');

    const stats = cb.stats.snapshot();

    t.equals(stats.executions, 0, 'executions 0.');
    t.equal(stats.failures, 0, 'failures 0.');
    t.equal(stats.successes, 0, 'successes 0.');
});

Test('initial state with factory', (t) => {
    t.plan(10);

    const cb = CircuitBreakerState.create();

    t.ok(cb.closed, 'starts closed.');
    t.ok(!cb.open, 'not open.');
    t.ok(!cb.halfOpen, 'not half open.');
    t.equal(cb._failures,0, 'no failures.');
    t.ok(cb._stats, 'stats exists.');
    t.equal(cb.maxFailures,3, 'maxFailures 3.');
    t.equal(cb.resetTime,10000, 'resetTime 10000.');

    const stats = cb.stats.snapshot();

    t.equals(stats.executions, 0, 'executions 0.');
    t.equal(stats.failures, 0, 'failures 0.');
    t.equal(stats.successes, 0, 'successes 0.');
});

Test('stats', (t) => {
    t.plan(4);

    const cb = new CircuitBreakerState();
    const stats = cb.stats;

    stats.increment('successes');
    t.equal(stats._counts['successes'], 1, 'incremented successes.');
    stats.increment('failures');
    t.equal(stats._counts['failures'], 1, 'incremented failures.');
    stats.reset('successes');
    t.equal(stats._counts['successes'], 0, 'reset successes.');
    stats.resetAll();
    t.equal(stats._counts['failures'], 0, 'resetAll.');
});

Test('configure', (t) => {
    t.plan(2);

    const cb = new CircuitBreakerState({ maxFailures: 1, resetTime: 10 });

    t.equal(cb.maxFailures, 1, 'maxFailures set.');
    t.equal(cb.resetTime, 10, 'resetTime set.');
});

Test('configure with factory', (t) => {
    t.plan(2);

    const cb = CircuitBreakerState.create({ maxFailures: 1, resetTime: 10 });

    t.equal(cb.maxFailures, 1, 'maxFailures set.');
    t.equal(cb.resetTime, 10, 'resetTime set.');
});

Test('failure', (t) => {
    t.plan(4);

    const cb = new CircuitBreakerState();

    cb.fail();

    const stats = cb.stats.snapshot();

    t.ok(!stats.open, 'not open.');
    t.equal(stats.executions, 1, 'executions 1.');
    t.equal(stats.failures, 1, 'failures 1.');
    t.equal(stats.successes, 0, 'successes 0.');
});

Test('success', (t) => {
    t.plan(4);

    const cb = new CircuitBreakerState();

    cb.succeed();

    const stats = cb.stats.snapshot();

    t.ok(!stats.open, 'not open.');
    t.equal(stats.executions, 1, 'executions 1.');
    t.equal(stats.failures, 0, 'failures 0.');
    t.equal(stats.successes, 1, 'successes 1.');
});

Test('flip open', (t) => {
    t.plan(2);

    const cb = new CircuitBreakerState({ maxFailures: 1 });

    cb.fail();

    t.ok(cb.open, 'is open.');
    t.equal(cb._failures, 0, 'current failures count reset.');
});

Test('half open', (t) => {
    t.plan(2);

    const cb = new CircuitBreakerState({ maxFailures: 1, resetTime: 10 });

    cb.fail();

    t.ok(cb.open, 'is open.');

    setTimeout(() => {
        t.ok(cb.halfOpen, 'half open now.');
    }, 15);
});

Test('half open to open', (t) => {
    t.plan(3);
    const cb = new CircuitBreakerState({ maxFailures: 2, resetTime: 10 });

    cb.fail();
    cb.fail();

    t.ok(cb.open, 'is open.');

    setTimeout(() => {
        t.ok(cb.halfOpen, 'half open now.');
        cb.fail();
        t.ok(cb.open, 'is open again.');
    }, 15);
});

Test('half open to closed', (t) => {
    t.plan(4);
    const cb = new CircuitBreakerState({ maxFailures: 1, resetTime: 10 });

    cb.fail();

    t.true(cb.open, 'is open.');

    setTimeout(() => {
        t.ok(cb.halfOpen, 'half open now.');
        cb.succeed();
        t.ok(!cb.open, 'is not open again.');
        t.ok(!cb.halfOpen, 'is not half open again.');
    }, 15);
});

Test('half open manual reset enabled', (t) => {
    t.plan(3);

    const cb = new CircuitBreakerState({ maxFailures: 1, resetTime: 0 });

    cb.fail();

    t.ok(cb.open, 'is open.');

    setTimeout(() => {
        t.ok(cb.open, 'still open.');
        cb.tryReset();
        t.ok(cb.halfOpen, 'half open now.');
    }, 15);
});

Test('half open manual reset enabled < 0', (t) => {
    t.plan(3);

    const cb = new CircuitBreakerState({ maxFailures: 1, resetTime: -1 });

    cb.fail();

    t.ok(cb.open, 'is open.');

    setTimeout(() => {
        t.ok(cb.open, 'still open.');
        cb.tryReset();
        t.ok(cb.halfOpen, 'half open now.');
    }, 15);
});


Test('half open manual reset not enabled try anyway', (t) => {
    t.plan(2);

    const cb = new CircuitBreakerState({ maxFailures: 1, resetTime: 10 });

    cb.fail();

    t.ok(cb.open, 'is open.');

    cb.tryReset();

    cb.succeed();

    setTimeout(() => {
        t.ok(cb.closed, 'closed.');
    }, 15);
});

Test('when open increment failures', (t) => {
    t.plan(3);

    const cb = new CircuitBreakerState({ maxFailures: 1, resetTime: 10 });

    cb.fail();

    t.ok(cb.open, 'is open.');

    cb.succeed();

    t.equal(cb.stats._counts.executions, 2, '2 executions.');
    t.equal(cb.stats._counts.failures, 2, '2 failures.');
});

Test('test returns error when open', (t) => {
    t.plan(4);

    const cb = new CircuitBreakerState({ maxFailures: 1 });

    cb.fail();

    t.ok(cb.open, 'is open.');

    const error = cb.test();

    if (!error) {
        t.fail('did not get error.');
    }

    t.equal(error.message, 'Circuit breaker is open', 'error.message is correct.');
    t.equal(error.name, 'CircuitBreakerOpenError', 'error.name is correct.');
    t.equal(error.code, 'EPERM', 'error.code is correct.');
});

Test('test does not return error when closed', (t) => {
    t.plan(1);

    const cb = new CircuitBreakerState();

    const error = cb.test();

    t.error(error, 'should not be an error.');
});

Test('reset increment to 0 when Number.MAX_SAFE_INTEGER exceeded', (t) => {
    t.plan(1);

    const cb = new CircuitBreakerState();

    const stats = cb.stats;

    stats._counts.executions = Number.MAX_SAFE_INTEGER;

    stats.increment('executions');

    t.equal(stats._counts.executions, 1, 'reset to 0 and then incremented.');
});

Test('incremenet some other value', (t) => {
    t.plan(1);

    const cb = new CircuitBreakerState();

    const stats = cb.stats;

    stats.increment('timeouts');

    t.equal(stats._counts.timeouts, 1, 'unknown name set to 0 and incremented.');
});

Test('incremenet protected name (open)', (t) => {
    t.plan(1);

    const cb = new CircuitBreakerState();

    const stats = cb.stats;

    stats.increment('open');

    t.ok(!stats._counts.open, '\"open\" name not set.');
});
