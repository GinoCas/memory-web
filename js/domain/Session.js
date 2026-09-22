/**
 * ==============================================================================
 * DOMINIO: ENTIDAD DE SESIÓN (Session)
 * ==============================================================================
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Domain = window.SpatialApp.Domain || {};

(function (Domain) {
  'use strict';

  class Session {
    /**
     * @param {Object} params
     * @param {string} params.id
     * @param {string} params.participantName
     * @param {string} params.group
     * @param {string[]} params.targetWords
     * @param {string[]} params.submittedWords
     * @param {string[]} params.hits
     * @param {string[]} params.misses
     * @param {string[]} params.falseAlarms
     * @param {number} params.score
     * @param {number} params.accuracy
     * @param {number} params.studyTimeSeconds
     * @param {number} params.recallTimeSeconds
     * @param {string} [params.completedAt]
     */
    constructor(params) {
      // Fail-fast assertions
      const requiredFields = ['participantName', 'group', 'targetWords', 'hits'];
      const missingField = requiredFields.find(field => !params || params[field] === undefined);
      if (missingField) {
        throw new Error(`[Session Entity] Campo obligatorio faltante: ${missingField}`);
      }

      this.id = params.id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      this.participantName = params.participantName;
      this.group = params.group;
      this.targetWords = Object.freeze([...(params.targetWords || [])]);
      this.submittedWords = Object.freeze([...(params.submittedWords || [])]);
      this.hits = Object.freeze([...(params.hits || [])]);
      this.misses = Object.freeze([...(params.misses || [])]);
      this.falseAlarms = Object.freeze([...(params.falseAlarms || [])]);
      this.score = typeof params.score === 'number' ? params.score : this.hits.length;
      this.accuracy = typeof params.accuracy === 'number' 
        ? Math.round(params.accuracy * 10) / 10
        : (this.targetWords.length > 0 ? Math.round((this.hits.length / this.targetWords.length) * 1000) / 10 : 0);
      this.studyTimeSeconds = params.studyTimeSeconds || 0;
      this.recallTimeSeconds = params.recallTimeSeconds || 0;
      this.completedAt = params.completedAt || new Date().toISOString();

      Object.freeze(this);
    }

    /**
     * Serialización a objeto plano para almacenamiento seguro
     */
    toJSON() {
      return {
        id: this.id,
        participantName: this.participantName,
        group: this.group,
        targetWords: this.targetWords,
        submittedWords: this.submittedWords,
        hits: this.hits,
        misses: this.misses,
        falseAlarms: this.falseAlarms,
        score: this.score,
        accuracy: this.accuracy,
        studyTimeSeconds: this.studyTimeSeconds,
        recallTimeSeconds: this.recallTimeSeconds,
        completedAt: this.completedAt
      };
    }

    static fromJSON(data) {
      return new Session(data);
    }
  }

  Domain.Session = Session;
})(window.SpatialApp.Domain);
