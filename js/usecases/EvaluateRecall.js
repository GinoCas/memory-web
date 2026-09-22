/**
 * ==============================================================================
 * CASO DE USO: EVALUATE RECALL
 * ==============================================================================
 * Evalúa las palabras recordadas frente a las palabras objetivo.
 * Clasifica en Aciertos (Hits), Omisiones (Misses) y Falsas Alarmas (False Alarms).
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.UseCases = window.SpatialApp.UseCases || {};

(function (UseCases, Domain) {
  'use strict';

  class EvaluateRecall {
    /**
     * @param {Object} params
     * @param {string[]} params.targetWords
     * @param {string[]} params.submittedWords
     * @param {Map<string, string>} [params.synonymMap] - Mapa normalizado: sinónimo -> palabra objetivo
     * @returns {{ hits: string[], directHits: string[], synonymHits: Array<{targetWord: string, submittedWord: string}>, misses: string[], falseAlarms: string[], score: number, accuracy: number }}
     */
    execute({ targetWords, submittedWords, synonymMap = new Map() }) {
      if (!Array.isArray(targetWords) || !Array.isArray(submittedWords)) {
        throw new Error('[EvaluateRecall Fail-Fast]: targetWords y submittedWords deben ser arreglos.');
      }

      const normalize = Domain.StringUtils.normalizeWord;

      // Mapa de normalizado -> palabra original objetivo
      const targetMap = new Map();
      targetWords.forEach(word => {
        targetMap.set(normalize(word), word);
      });

      // Deduplicar palabras enviadas por el usuario
      const uniqueSubmitted = [...new Set(
        submittedWords
          .map(w => w.trim())
          .filter(w => w.length > 0)
      )];

      const matchedNormalizedTargets = new Set();
      const hits = [];
      const directHits = [];
      const synonymHits = [];
      const falseAlarms = [];

      uniqueSubmitted.forEach(word => {
        const norm = normalize(word);
        const directTarget = targetMap.get(norm);
        const synonymTarget = synonymMap ? synonymMap.get(norm) : null;
        const normSynTarget = synonymTarget ? normalize(synonymTarget) : null;

        const isDirectHit = Boolean(directTarget && !matchedNormalizedTargets.has(norm));
        const isSynonymHit = Boolean(!isDirectHit && synonymTarget && !matchedNormalizedTargets.has(normSynTarget));

        // Resolución de estado sin cadenas if-else
        const statusKey = isDirectHit 
          ? 'DIRECT' 
          : (isSynonymHit ? 'SYNONYM' : 'FALSE_ALARM');

        const resolutionMap = {
          DIRECT: () => {
            matchedNormalizedTargets.add(norm);
            hits.push(directTarget);
            directHits.push(directTarget);
          },
          SYNONYM: () => {
            matchedNormalizedTargets.add(normSynTarget);
            hits.push(synonymTarget);
            synonymHits.push({ targetWord: synonymTarget, submittedWord: word });
          },
          FALSE_ALARM: () => {
            falseAlarms.push(word);
          }
        };

        resolutionMap[statusKey]();
      });

      // Calcular omisiones (palabras objetivo que no se recordaron)
      const misses = targetWords.filter(targetWord => {
        const norm = normalize(targetWord);
        return !matchedNormalizedTargets.has(norm);
      });

      const score = hits.length;
      const accuracy = targetWords.length > 0 
        ? Math.round((hits.length / targetWords.length) * 1000) / 10 
        : 0;

      return {
        hits,
        directHits,
        synonymHits,
        misses,
        falseAlarms,
        score,
        accuracy
      };
    }
  }

  UseCases.EvaluateRecall = EvaluateRecall;
})(window.SpatialApp.UseCases, window.SpatialApp.Domain);
