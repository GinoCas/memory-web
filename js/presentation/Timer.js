/**
 * ==============================================================================
 * PRESENTACIÓN: COMPONENTE TEMPORIZADOR (Timer)
 * ==============================================================================
 * Gestiona cuentas regresivas con callbacks para renderizado reactivo de progreso.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Presentation = window.SpatialApp.Presentation || {};

(function (Presentation) {
  'use strict';

  class Timer {
    /**
     * @param {Object} options
     * @param {number} options.durationSeconds
     * @param {Function} options.onTick - Callback (remainingSeconds, totalSeconds, percent)
     * @param {Function} options.onComplete - Callback al finalizar
     */
    constructor({ durationSeconds, onTick, onComplete }) {
      this.totalDuration = Math.max(0, durationSeconds || 0);
      this.onTick = onTick || (() => {});
      this.onComplete = onComplete || (() => {});
      this.remainingSeconds = this.totalDuration;
      this.timerId = null;
      this.startTime = null;
      this.isCompleted = false;
    }

    start() {
      this.stop();
      this.isCompleted = false;
      this.remainingSeconds = this.totalDuration;
      this.startTime = Date.now();

      // Emitir primer tick inmediatamente
      this._notifyTick();

      if (this.totalDuration <= 0) {
        return;
      }

      this.timerId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.remainingSeconds = Math.max(0, this.totalDuration - elapsed);
        this._notifyTick();

        const finishMap = {
          true: () => {
            this.stop();
            this.isCompleted = true;
            this.onComplete();
          },
          false: () => {}
        };

        finishMap[this.remainingSeconds <= 0]();
      }, 250);
    }

    _notifyTick() {
      const percent = this.totalDuration > 0
        ? Math.round(((this.totalDuration - this.remainingSeconds) / this.totalDuration) * 100)
        : 100;
      this.onTick(this.remainingSeconds, this.totalDuration, percent);
    }

    stop() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }

    getElapsedSeconds() {
      if (!this.startTime) return 0;
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      return this.totalDuration > 0 ? Math.min(elapsed, this.totalDuration) : elapsed;
    }
  }

  Presentation.Timer = Timer;
})(window.SpatialApp.Presentation);
