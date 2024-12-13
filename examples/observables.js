'use strict';

const { Observable } = require('rxjs');
const CircuitBreakerState = require('../index');

class MyObservable extends Observable {
  constructor(options) {
    super((observer) => {
      const error = this._cb.test();
      if (error) {
        observer.error(error);
        return;
      }
      observer.next('hello world');
      observer.complete();
      this._cb.succeed();
    });
    this._cb = new CircuitBreakerState(options);
  }
}

const observable = new MyObservable();

observable.subscribe(
  (x) => {
    console.log(x);
  },
  (error) => {
    console.log(error);
  },
  () => {
    console.log('done');
  }
);