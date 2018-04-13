import {
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
  NativeAppEventEmitter,
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
        const callback = this.callbacks[id].callback;
        if (!this.callbacks[id].interval) {
          delete this.callbacks[id];
        } else {
          RNBackgroundTimer.setTimeout(id, this.callbacks[id].timeout);
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

  runBackgroundTimer = (callback, delay) => {
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
      }
    );
  };

  backgroundClockMethod(callback, delay) {
    this.backgroundTimer = setTimeout(() => {
      callback();
      this.backgroundClockMethod(callback, delay);
    }, delay);
  }

  stopBackgroundTimer = () => {
    this.stop();
    clearTimeout(this.backgroundTimer);
  };

  // New API, allowing for multiple timers
  setTimeout(callback, timeout) {
    const timeoutId = ++this.uniqueId;
    this.callbacks[timeoutId] = {
      callback: callback,
      interval: false,
      timeout: timeout,
    };
    RNBackgroundTimer.setTimeout(timeoutId, timeout);
    return timeoutId;
  }

  clearTimeout(timeoutId) {
    if (this.callbacks[timeoutId]) {
      delete this.callbacks[timeoutId];
    }
  }

  setInterval(callback, timeout) {
    const intervalId = ++this.uniqueId;
    let expected = Date.now() + timeout;

    this.callbacks[intervalId] = {
      callback: step,
      interval: true,
      timeout: timeout,
    };

    const step = () => {
      if (!this.callbacks[intervalId]) {
        return;
      }

      const delta = Date.now() - expected;
      const ticks = Math.max(1, 1 + Math.round(delta / timeout));
      callback(ticks);
      const addToExpected = timeout * ticks;
      expected += addToExpected;

      RNBackgroundTimer.setTimeout(intervalId, addToExpected - delta);
    };

    RNBackgroundTimer.setTimeout(intervalId, timeout);

    return intervalId;
  }

  clearInterval(intervalId) {
    if (this.callbacks[intervalId]) {
      delete this.callbacks[intervalId];
    }
  }
}

export default new BackgroundTimer();
