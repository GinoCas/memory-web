/**
 * ==============================================================================
 * INFRAESTRUCTURA: REPOSITORIO DE GOOGLE SHEETS (Lectura y Escritura)
 * ==============================================================================
 * Sincroniza bidireccionalmente las sesiones y moderaciones con Google Sheets
 * a través de Google Apps Script (doGet y doPost).
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Infrastructure = window.SpatialApp.Infrastructure || {};

(function (Infrastructure, Domain) {
  'use strict';

  class GoogleSheetsRepo {
    /**
     * @param {string} webAppUrl La URL de despliegue del Web App de Google Apps Script
     */
    constructor(webAppUrl) {
      this.webAppUrl = webAppUrl ? webAppUrl.trim() : '';
    }

    /**
     * Verifica si existe una URL configurada válida
     * @returns {boolean}
     */
    isConfigured() {
      return Boolean(this.webAppUrl && this.webAppUrl.startsWith('http'));
    }

    /**
     * Envía de forma asíncrona una nueva sesión completada a Google Sheets.
     * @param {Domain.Session} session
     */
    save(session) {
      if (!this.isConfigured()) return;

      const payload = {
        action: 'save_session',
        id: session.id,
        completedAt: session.completedAt,
        participantName: session.participantName,
        group: session.group,
        score: session.score,
        targetWordsCount: session.targetWords.length,
        accuracy: session.accuracy,
        studyTimeSeconds: session.studyTimeSeconds,
        recallTimeSeconds: session.recallTimeSeconds,
        hits: session.hits,
        misses: session.misses,
        falseAlarms: session.falseAlarms,
        submittedWords: session.submittedWords,
        targetWords: session.targetWords
      };

      this._postPayload(payload);
    }

    /**
     * Sincroniza el estado de administración (sinónimos, descartadas y sesiones recalculadas)
     * hacia Google Sheets para que todos los gráficos reflejen el control del investigador.
     * @param {Object} params
     */
    syncAdminState({ sessions, synonyms, dismissed }) {
      if (!this.isConfigured()) return;

      const payload = {
        action: 'sync_admin',
        synonyms: synonyms || {},
        dismissed: dismissed || [],
        sessions: (sessions || []).map(s => ({
          id: s.id,
          completedAt: s.completedAt,
          participantName: s.participantName,
          group: s.group,
          score: s.score,
          targetWordsCount: s.targetWords.length,
          accuracy: s.accuracy,
          studyTimeSeconds: s.studyTimeSeconds,
          recallTimeSeconds: s.recallTimeSeconds,
          hits: s.hits,
          misses: s.misses,
          falseAlarms: s.falseAlarms,
          submittedWords: s.submittedWords,
          targetWords: s.targetWords
        }))
      };

      this._postPayload(payload);
    }

    /**
     * Descarga todas las sesiones y configuraciones directamente desde Google Sheets (doGet).
     * @param {string[]} defaultTargetWords Palabras objetivo por defecto desde config.js
     * @returns {Promise<{sessions: Domain.Session[], synonyms: Object|null, dismissed: string[]|null}|null>}
     */
    async fetchCloudData(defaultTargetWords = []) {
      if (!this.isConfigured()) return null;

      try {
        const separator = this.webAppUrl.includes('?') ? '&' : '?';
        const urlWithCacheBuster = `${this.webAppUrl}${separator}t=${Date.now()}`;
        const response = await fetch(urlWithCacheBuster, {
          method: 'GET',
          redirect: 'follow'
        });

        const rawJson = await response.json();
        if (!rawJson || !Array.isArray(rawJson.sessions)) {
          return null;
        }

        const sessions = rawJson.sessions
          .map(row => this._mapRowToSession(row, defaultTargetWords))
          .filter(Boolean);

        return {
          sessions,
          synonyms: rawJson.synonyms || null,
          dismissed: Array.isArray(rawJson.dismissed) ? rawJson.dismissed : null
        };
      } catch (err) {
        console.warn('[GoogleSheetsRepo] No se pudo leer desde Google Sheets (verifica que doGet esté implementado):', err);
        return null;
      }
    }

    /**
     * Convierte un registro proveniente de Google Sheets en una entidad Domain.Session
     * @private
     */
    _mapRowToSession(row, defaultTargetWords) {
      try {
        const parseList = (val) => Domain.StringUtils.tokenizeWords(val);

        const hits = parseList(row.hits);
        const misses = parseList(row.misses);
        const falseAlarms = parseList(row.falseAlarms);
        const submittedFromRow = parseList(row.submittedWords);
        const submittedWords = submittedFromRow.length > 0 ? submittedFromRow : [...hits, ...falseAlarms];

        const targetsFromRow = parseList(row.targetWords);
        const reconstructedTargets = [...hits, ...misses];
        const targetWords = targetsFromRow.length > 0
          ? targetsFromRow
          : (reconstructedTargets.length > 0 ? reconstructedTargets : defaultTargetWords);

        // Normalizar grupo (soporta 'spatial', 'list' o nombres descriptivos)
        const rawGroup = String(row.group || '').toLowerCase().trim();
        const groupNormalizationMap = {
          spatial: Domain.GroupType.SPATIAL,
          list: Domain.GroupType.LIST,
          'memoria espacial': Domain.GroupType.SPATIAL,
          'espacial': Domain.GroupType.SPATIAL,
          'grupo 1': Domain.GroupType.SPATIAL
        };
        const normalizedGroup = groupNormalizationMap[rawGroup] || Domain.GroupType.LIST;

        const parsedTimestamp = Number(row.completedAt) || Date.parse(row.completedAt) || Date.now();

        return new Domain.Session({
          id: String(row.id || `sheet_${parsedTimestamp}_${Math.random().toString(36).slice(2, 6)}`),
          participantName: String(row.participantName || 'Anónimo').trim(),
          group: normalizedGroup,
          targetWords,
          submittedWords,
          hits,
          misses,
          falseAlarms,
          score: Number(row.score ?? hits.length),
          accuracy: Number(row.accuracy ?? 0),
          studyTimeSeconds: Number(row.studyTimeSeconds || 0),
          recallTimeSeconds: Number(row.recallTimeSeconds || 0),
          completedAt: parsedTimestamp
        });
      } catch (err) {
        console.warn('[GoogleSheetsRepo] Fila ignorada por formato inválido:', row, err);
        return null;
      }
    }

    /**
     * Envío POST sin bloqueo CORS
     * @private
     */
    _postPayload(payload) {
      fetch(this.webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(payload)
      }).catch(err => {
        console.error('[GoogleSheetsRepo] Error enviando datos a Sheets:', err);
      });
    }

    getAll() {
      return [];
    }

    clear() {
      // No-op local
    }

    saveAll(sessions) {
      // No-op automático para evitar duplicar filas en doPost
    }
  }

  Infrastructure.GoogleSheetsRepo = GoogleSheetsRepo;
})(window.SpatialApp.Infrastructure, window.SpatialApp.Domain);
