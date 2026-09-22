/**
 * ==============================================================================
 * DOMINIO: AGREGADO ESTADÍSTICO (Statistics)
 * ==============================================================================
 * Procesa colecciones de sesiones y calcula métricas científicas comparativas.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Domain = window.SpatialApp.Domain || {};

(function (Domain) {
  'use strict';

  class Statistics {
    /**
     * @param {Domain.Session[]} sessions
     */
    static calculate(sessions = []) {
      const initialGroupStats = () => ({
        count: 0,
        totalScore: 0,
        totalAccuracy: 0,
        totalStudyTime: 0,
        totalRecallTime: 0,
        scores: []
      });

      const groupBuckets = {
        [Domain.GroupType.SPATIAL]: initialGroupStats(),
        [Domain.GroupType.LIST]: initialGroupStats()
      };

      // Acumular métricas sin if-else usando el diccionario de grupos
      sessions.forEach(session => {
        const bucket = groupBuckets[session.group];
        if (!bucket) return;

        bucket.count += 1;
        bucket.totalScore += session.score;
        bucket.totalAccuracy += session.accuracy;
        bucket.totalStudyTime += session.studyTimeSeconds;
        bucket.totalRecallTime += session.recallTimeSeconds;
        bucket.scores.push(session.score);
      });

      const computeGroupAverages = (bucket) => {
        const hasData = bucket.count > 0;
        const avgScore = hasData ? bucket.totalScore / bucket.count : 0;
        const avgAccuracy = hasData ? bucket.totalAccuracy / bucket.count : 0;
        const avgStudyTime = hasData ? bucket.totalStudyTime / bucket.count : 0;
        const avgRecallTime = hasData ? bucket.totalRecallTime / bucket.count : 0;

        // Desviación estándar muestral
        const variance = hasData && bucket.count > 1
          ? bucket.scores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / (bucket.count - 1)
          : 0;
        const standardDeviation = Math.sqrt(variance);

        return {
          count: bucket.count,
          avgScore: Math.round(avgScore * 100) / 100,
          avgAccuracy: Math.round(avgAccuracy * 10) / 10,
          avgStudyTime: Math.round(avgStudyTime * 10) / 10,
          avgRecallTime: Math.round(avgRecallTime * 10) / 10,
          standardDeviation: Math.round(standardDeviation * 100) / 100
        };
      };

      const spatialMetrics = computeGroupAverages(groupBuckets[Domain.GroupType.SPATIAL]);
      const listMetrics = computeGroupAverages(groupBuckets[Domain.GroupType.LIST]);

      const totalParticipants = sessions.length;
      const globalAvgScore = totalParticipants > 0
        ? Math.round((sessions.reduce((acc, s) => acc + s.score, 0) / totalParticipants) * 100) / 100
        : 0;
      const globalAvgAccuracy = totalParticipants > 0
        ? Math.round((sessions.reduce((acc, s) => acc + s.accuracy, 0) / totalParticipants) * 10) / 10
        : 0;

      // Comparativa entre grupos: diferencia absoluta y relativa
      const scoreDifference = Math.round((spatialMetrics.avgScore - listMetrics.avgScore) * 100) / 100;
      const percentageImprovement = listMetrics.avgScore > 0
        ? Math.round(((spatialMetrics.avgScore - listMetrics.avgScore) / listMetrics.avgScore) * 1000) / 10
        : (spatialMetrics.avgScore > 0 ? 100 : 0);

      return {
        totalParticipants,
        globalAvgScore,
        globalAvgAccuracy,
        groups: {
          [Domain.GroupType.SPATIAL]: spatialMetrics,
          [Domain.GroupType.LIST]: listMetrics
        },
        comparison: {
          scoreDifference,
          percentageImprovement,
          hasBothGroups: spatialMetrics.count > 0 && listMetrics.count > 0
        }
      };
    }
  }

  Domain.Statistics = Statistics;
})(window.SpatialApp.Domain);
