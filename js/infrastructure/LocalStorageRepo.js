/**
 * ==============================================================================
 * INFRAESTRUCTURA: REPOSITORIO DE SESIONES EN LOCALSTORAGE
 * ==============================================================================
 * Implementa persistencia local y utilidades de exportación (CSV / JSON).
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Infrastructure = window.SpatialApp.Infrastructure || {};

(function (Infrastructure, Domain) {
  'use strict';

  class LocalStorageSessionRepository {
    /**
     * @param {string} [storageKey]
     */
    constructor(storageKey = Domain.StorageKeys.SESSIONS) {
      this.storageKey = storageKey;
      this._ensureStorageAvailable();
    }

    _ensureStorageAvailable() {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
      } catch (err) {
        throw new Error('[LocalStorageSessionRepository Fail-Fast]: LocalStorage no está disponible en este navegador o entorno.');
      }
    }

    /**
     * @returns {Domain.Session[]}
     */
    getAll() {
      const rawData = localStorage.getItem(this.storageKey);
      if (!rawData) return [];

      try {
        const parsed = JSON.parse(rawData);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(item => Domain.Session.fromJSON(item));
      } catch (err) {
        console.error('[LocalStorageSessionRepository] Error al deserializar sesiones:', err);
        return [];
      }
    }

    /**
     * @param {Domain.Session} session
     */
    save(session) {
      if (!(session instanceof Domain.Session)) {
        throw new Error('[LocalStorageSessionRepository Fail-Fast]: La entidad a guardar debe ser una instancia de Session.');
      }

      const existingSessions = this.getAll();
      const updatedSessions = [...existingSessions, session];
      localStorage.setItem(this.storageKey, JSON.stringify(updatedSessions.map(s => s.toJSON())));
    }

    /**
     * Guarda o reemplaza la lista completa de sesiones (usado en recálculos por el admin)
     * @param {Domain.Session[]} sessions
     */
    saveAll(sessions) {
      if (!Array.isArray(sessions)) {
        throw new Error('[LocalStorageSessionRepository Fail-Fast]: sessions debe ser un arreglo.');
      }
      localStorage.setItem(this.storageKey, JSON.stringify(sessions.map(s => s.toJSON())));
    }

    /**
     * Limpia todas las sesiones guardadas
     */
    clear() {
      localStorage.removeItem(this.storageKey);
    }

    /**
     * Exporta los datos a formato CSV para análisis en Excel, SPSS, R o Python
     * @returns {string}
     */
    exportCSV() {
      const sessions = this.getAll();
      const headers = [
        'ID',
        'Participante',
        'Grupo',
        'Aciertos (Score)',
        'Total Palabras',
        'Precision (%)',
        'Tiempo Estudio (s)',
        'Tiempo Recuerdo (s)',
        'Palabras Acertadas',
        'Palabras Omitidas',
        'Falsas Alarmas',
        'Fecha y Hora'
      ];

      const escapeCSV = (val) => `"${String(val).replace(/"/g, '""')}"`;

      const rows = sessions.map(s => [
        escapeCSV(s.id),
        escapeCSV(s.participantName),
        escapeCSV(s.group),
        s.score,
        s.targetWords.length,
        s.accuracy,
        s.studyTimeSeconds,
        s.recallTimeSeconds,
        escapeCSV(s.hits.join('; ')),
        escapeCSV(s.misses.join('; ')),
        escapeCSV(s.falseAlarms.join('; ')),
        escapeCSV(s.completedAt)
      ].join(','));

      return [headers.join(','), ...rows].join('\r\n');
    }

    /**
     * Exporta los datos a JSON estructurado
     * @returns {string}
     */
    exportJSON() {
      const sessions = this.getAll();
      return JSON.stringify(sessions.map(s => s.toJSON()), null, 2);
    }
  }

  Infrastructure.LocalStorageSessionRepository = LocalStorageSessionRepository;
})(window.SpatialApp.Infrastructure, window.SpatialApp.Domain);
