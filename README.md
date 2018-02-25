
# circuit-state

A flexible circuit breaker state machine.

### Usage

```javascript
const StateMachine = require('circuit-state');

const cb = new StateMachine(/* options */);

cb.failure(); // Record a failure
cb.success(); // Record a success
cb.test(); // Returns an error if circuit is open.
cb.stats; // Stats on the circuit breaker.
cb.stats.snapshot(); // Take a snapshot of the current stats.
```

### Options

- `maxFailures` - How many failures to accept before circuit opens.
- `resetTimeout` - How long to wait before returning the circuit to half-open.
