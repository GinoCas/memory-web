/**
 * ==============================================================================
 * CASO DE USO: REEVALUATE SESSIONS
 * ==============================================================================
 * Recalcula todas las sesiones previas aplicando el diccionario actual de sinónimos
 * y actualiza la persistencia y estadísticas en tiempo real.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.UseCases = window.SpatialApp.UseCases || {};

(function (UseCases, Domain) {
  'use strict';

  class ReevaluateSessions {
    /**
     * @param {Object} sessionRepository
     * @param {Object} synonymRepository
     * @param {Object} evaluateRecallUseCase
     */
    constructor(sessionRepository, synonymRepository, evaluateRecallUseCase) {
      if (!sessionRepository || !synonymRepository || !evaluateRecallUseCase) {
        throw new Error('[ReevaluateSessions Fail-Fast]: Dependencias requeridas no provistas.');
      }
      this.sessionRepository = sessionRepository;
      this.synonymRepository = synonymRepository;
      this.evaluateRecallUseCase = evaluateRecallUseCase;
    }

    /**
     * @param {Object} [params]
     * @param {string[]} [params.targetWords]
     * @returns {{ updatedSessions: Domain.Session[], statistics: Object }}
     */
    execute(params = {}) {
      const existingSessions = this.sessionRepository.getAll();
      const targetWords = params.targetWords || (existingSessions[0]?.targetWords) || [];
      const synonymMap = this.synonymRepository.getMapping(targetWords);

      const updatedSessions = existingSessions.map(session => {
        const tokenizedSubmitted = Domain.StringUtils.tokenizeWords(session.submittedWords);
        const evalResult = this.evaluateRecallUseCase.execute({
          targetWords: session.targetWords,
          submittedWords: tokenizedSubmitted,
          synonymMap
        });

        return new Domain.Session({
          id: session.id,
          participantName: session.participantName,
          group: session.group,
          targetWords: session.targetWords,
          submittedWords: tokenizedSubmitted,
          hits: evalResult.hits,
          misses: evalResult.misses,
          falseAlarms: evalResult.falseAlarms,
          score: evalResult.score,
          accuracy: evalResult.accuracy,
          studyTimeSeconds: session.studyTimeSeconds,
          recallTimeSeconds: session.recallTimeSeconds,
          completedAt: session.completedAt
        });
      });

      this.sessionRepository.saveAll(updatedSessions);
      const statistics = Domain.Statistics.calculate(updatedSessions);

      return {
        updatedSessions,
        statistics
      };
    }
  }

  UseCases.ReevaluateSessions = ReevaluateSessions;
})(window.SpatialApp.UseCases, window.SpatialApp.Domain);
