/**
 * ==============================================================================
 * INFRAESTRUCTURA: REPOSITORIO DE GOOGLE SHEETS
 * ==============================================================================
 * Envía los datos de las sesiones completadas a un Web App de Google Apps Script.
 * Implementa el mismo contrato "save(session)" para respetar Dependency Inversion.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Infrastructure = window.SpatialApp.Infrastructure || {};

(function (Infrastructure) {
  'use strict';

  class GoogleSheetsRepo {
    /**
     * @param {string} webAppUrl La URL de despliegue del script de Google
     */
    constructor(webAppUrl) {
      this.webAppUrl = webAppUrl;
    }

    /**
     * Envía de forma asíncrona (fire-and-forget) la sesión a Google Sheets.
     * Al usar mode: 'no-cors' se previenen problemas de CORS en GitHub Pages.
     * @param {Domain.Session} session
     */
    save(session) {
      if (!this.webAppUrl || !this.webAppUrl.startsWith('http')) {
        return;
      }

      // Preparar payload a enviar
      const payload = {
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
        falseAlarms: session.falseAlarms
      };

      // Enviar por fetch en background (no interrumpe el flujo si falla)
      fetch(this.webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain', // Usar text/plain evita el preflight OPTIONS
        },
        body: JSON.stringify(payload)
      }).catch(err => {
        console.error('[GoogleSheetsRepo] Error enviando datos a Sheets:', err);
      });
    }

    // Los métodos getAll() y clear() no aplican para este repositorio de solo-escritura
    getAll() {
      return [];
    }

    clear() {
      // No-op
    }
  }

  Infrastructure.GoogleSheetsRepo = GoogleSheetsRepo;
})(window.SpatialApp.Infrastructure);
