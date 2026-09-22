/**
 * ==============================================================================
 * CASO DE USO: GET STATISTICS
 * ==============================================================================
 * Obtiene todas las sesiones registradas y calcula las métricas estadísticas
 * globales y por grupo experimental.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.UseCases = window.SpatialApp.UseCases || {};

(function (UseCases, Domain) {
  'use strict';

  class GetStatistics {
    /**
     * @param {Object} repository - Implementación de SessionRepository
     */
    constructor(repository) {
      if (!repository || typeof repository.getAll !== 'function') {
        throw new Error('[GetStatistics Fail-Fast]: Repositorio inválido suministrado.');
      }
      this.repository = repository;
    }

    /**
     * @returns {{ statistics: Object, sessions: Domain.Session[] }}
     */
    execute() {
      const sessions = this.repository.getAll();
      const statistics = Domain.Statistics.calculate(sessions);
      return {
        statistics,
        sessions
      };
    }
  }

  UseCases.GetStatistics = GetStatistics;
})(window.SpatialApp.UseCases, window.SpatialApp.Domain);
