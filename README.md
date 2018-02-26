
# circuit-state

A flexible circuit breaker state machine.

The intent of this module is to provide a means of tracking a circuit breaker without forming opinions about how something is called. Use this API to blend circuit breaking into anything.

### API

- `CircuitBreakerState(options)` - Constructor. Options:
    - `maxFailures` - Maximum number of failures before circuit breaker flips open. Default `3`.
    - `resetTimeout` - Time in ms before an open circuit breaker returns to a half-open state. Default `10000`.
- `CircuitBreakerState.create(options)` - Creates a new `CircuitBreakerState` instance.

Instance functions:

- `succeed()` - Record a success.
- `fail()` - Record a failure. This may trip open the circuit breaker.
- `test()` - Tests for the state being open. If so, returns an error (may be returned to user).
- `isOpen()` - Returns `true` if this circuit breaker is open.
- `isClosed()` - Returns `true` if this circuit breaker is closed.
- `isHalfOpen()` - Returns `true` if this circuit breaker is half-open.
- `stats` - The stats tracker object.
- `maxFailures` - Read-only.
- `resetTimeout` - Read-only.

Stats object:

- `increment(name)` - Increment the given `name` count.
- `reset(name)` - Reset the given `name` count.
- `resetAll()` - Reset all counts.
- `snapshot()` - Take a snapshot of the stats object.


### Example Usage

Wrapping a callback based function.

```javascript
const CircuitBreakerState = require('circuit-state');

class Circuit {
    constructor(func) {
        this._func = func;
        this._cb = new CircuitBreakerState();
    }
    run(...args) {
        const callback = args[args.length - 1];

        const error = this._cb.test();

        // Fail fast
        if (error) {
            callback(error);
            return;
        }

        // Wrap original callback
        args[args.length - 1] = (error, ...result) => {
            if (error) {
                // Record a failure
                this._cb.fail();
                callback(error);
                return;
            }
            // Record a success
            this._cb.succeed();
            callback(null, ...result);
        };

        return this._func.call(null, ...args);
    }
}
```

Here's an example with wrapping promises.

```javascript
class Circuit {
    constructor(promise) {
        this._promise = promise;
        this._cb = new CircuitBreakerState();
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
```