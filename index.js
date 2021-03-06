import {
  DeviceEventEmitter,
  NativeAppEventEmitter,
  NativeEventEmitter,
  NativeModules,
  Platform,
} from 'react-native';

const { RNBackgroundTimer } = NativeModules;
const Emitter = new NativeEventEmitter(RNBackgroundTimer);

class BackgroundTimer {
  constructor() {
    this.uniqueId = 0;
    this.callbacks = {};

    Emitter.addListener('backgroundTimer.timeout', id => {
      if (this.callbacks[id]) {
        const callbackById = this.callbacks[id];
        const { callback } = callbackById;
        if (!this.callbacks[id].interval) {
          delete this.callbacks[id];
        } else {
          const delta = Date.now() - timeout.expected;

          const ticks = Math.max(1, 1 + Math.round(delta / timeout.timeout));
          const addToExpected = timeout.timeout * ticks;
          timeout.expected += addToExpected;
          RNBackgroundTimer.setTimeout(id, addToExpected - delta);
        }
        callback();
      }
    });
  }

  // Original API
  start(delay = 0) {
    return RNBackgroundTimer.start(delay);
  }

  stop() {
    return RNBackgroundTimer.stop();
  }

  runBackgroundTimer(callback, delay) {
    const EventEmitter = Platform.select({
      ios: () => NativeAppEventEmitter,
      android: () => DeviceEventEmitter,
    })();
    this.start(0);
    this.backgroundListener = EventEmitter.addListener(
      'backgroundTimer',
      () => {
        this.backgroundListener.remove();
        this.backgroundClockMethod(callback, delay);
      },
    );
  }

  backgroundClockMethod(callback, delay) {
    this.backgroundTimer = this.setTimeout(() => {
      callback();
      this.backgroundClockMethod(callback, delay);
    }, delay);
  }

  stopBackgroundTimer() {
    this.stop();
    this.clearTimeout(this.backgroundTimer);
  }

  // New API, allowing for multiple timers
  setTimeout(callback, timeout) {
    this.uniqueId += 1;
    const timeoutId = this.uniqueId;
    this.callbacks[timeoutId] = {
      callback,
      interval: false,
      timeout,
    };
    RNBackgroundTimer.setTimeout(timeoutId, timeout);
    return timeoutId;
  }

  clearTimeout(timeoutId) {
    if (this.callbacks[timeoutId]) {
      delete this.callbacks[timeoutId];
      // RNBackgroundTimer.clearTimeout(timeoutId);
    }
  }

  setInterval(callback, timeout) {
    this.uniqueId += 1;
    const intervalId = this.uniqueId;
    let expected = Date.now() + timeout;

    this.callbacks[intervalId] = {
      callback: callback,
      interval: true,
      timeout: timeout,
      expected: Date.now() + timeout,
    };

    RNBackgroundTimer.setTimeout(intervalId, timeout);

    return intervalId;
  }

  clearInterval(intervalId) {
    if (this.callbacks[intervalId]) {
      delete this.callbacks[intervalId];
      // RNBackgroundTimer.clearTimeout(intervalId);
    }
  }
}

export default new BackgroundTimer();
