/**
 * ==============================================================================
 * CASO DE USO: SAVE SESSION
 * ==============================================================================
 * Guarda una sesión completada en el repositorio inyectado (DIP / SOLID).
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.UseCases = window.SpatialApp.UseCases || {};

(function (UseCases, Domain) {
  'use strict';

  class SaveSession {
    /**
     * @param {Object} repository - Implementación de SessionRepository
     */
    constructor(repository) {
      if (!repository || typeof repository.save !== 'function') {
        throw new Error('[SaveSession Fail-Fast]: Repositorio inválido suministrado.');
      }
      this.repository = repository;
    }

    /**
     * @param {Object} sessionParams
     * @returns {Domain.Session}
     */
    execute(sessionParams) {
      const session = new Domain.Session(sessionParams);
      this.repository.save(session);
      return session;
    }
  }

  UseCases.SaveSession = SaveSession;
})(window.SpatialApp.UseCases, window.SpatialApp.Domain);
