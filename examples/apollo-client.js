const { ApolloServer } = require('apollo-server');
const { HttpLink, ApolloLink, Observable, gql } = require('@apollo/client/core');
const fetch = require('cross-fetch');
const CircuitBreakerState = require('../index');

// Define a simple schema and resolver
const typeDefs = `
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello, world!'
  },
};

// Create Apollo Server
const server = new ApolloServer({ typeDefs, resolvers });

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`GraphQL server running at ${url}`);
});

// Circuit breaker Apollo Link
const createCircuitBreakerLink = ({ maxFailures = 3, resetTime = 10000 } = {}) => {
  const circuitBreaker = new CircuitBreakerState({ maxFailures, resetTime });

  circuitBreaker.events.on('succeeded', () => {
    console.log('Circuit recorded success.');
  });

  return new ApolloLink((operation, forward) => {
    return new Observable((observer) => {
      if (circuitBreaker.open) {
        observer.error(new Error('Circuit breaker is open'));
        return;
      }

      // Forward the operation to the next link
      const subscription = forward(operation).subscribe({
        next: (result) => {
          // Record success
          // This should ideally be more nuanced and detect errors in the response
          circuitBreaker.succeed();
          observer.next(result);
        },
        error: (err) => {
          circuitBreaker.fail();
          observer.error(err);
        },
        complete: () => {
          observer.complete();
        },
      });

      return () => subscription.unsubscribe();
    });
  });
};

// Client setup
const httpLink = new HttpLink({ uri: `http://localhost:4000/graphql`, fetch });
const circuitBreakerLink = createCircuitBreakerLink({ maxFailures: 2, resetTime: 5000 });
const link = ApolloLink.from([circuitBreakerLink, httpLink]);

// Test the setup by directly executing the link
const operation = {
  query: gql`
    query {
      hello
    }
  `,
  getContext: () => ({}), // Add the required method
  setContext: () => { },  // Optional, no-op implementation
};

link.request(operation).subscribe({
  next: (result) => console.log('Result:', result),
  error: (err) => console.error('Error:', err),
  complete: () => {
    console.log('Complete');
    server.stop();
  }
});
