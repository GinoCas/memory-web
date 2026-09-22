/**
 * ==============================================================================
 * INFRAESTRUCTURA: REPOSITORIO COMPUESTO (Composite Pattern + Cloud Sync)
 * ==============================================================================
 * Permite guardar sesiones en múltiples repositorios simultáneamente
 * y sincronizar la caché local (LocalStorage) con la fuente de verdad en Google Sheets.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Infrastructure = window.SpatialApp.Infrastructure || {};

(function (Infrastructure) {
  'use strict';

  class CompositeRepo {
    /**
     * @param {Object[]} repos Arreglo de instancias de repositorios ([localRepo, sheetsRepo])
     */
    constructor(repos) {
      this.repos = repos;
    }

    save(session) {
      this.repos.forEach(repo => repo.save(session));
    }

    saveAll(sessions) {
      this.repos.forEach(repo => {
        if (typeof repo.saveAll === 'function') {
          repo.saveAll(sessions);
        }
      });
    }

    getAll() {
      const primaryRepo = this.repos[0];
      return primaryRepo ? primaryRepo.getAll() : [];
    }

    clear() {
      this.repos.forEach(repo => repo.clear && repo.clear());
    }

    /**
     * Sincroniza la base local con los datos actuales de Google Sheets (doGet).
     * Si borras filas en Google Sheets, desaparecen automáticamente de los gráficos y del admin.
     * @param {Object} options
     * @returns {Promise<boolean>} true si sincronizó con éxito desde la nube
     */
    async syncFromCloud({ defaultTargetWords = [], synonymRepo = null, dismissedRepo = null, preserveSession = null } = {}) {
      const primaryRepo = this.repos[0];
      const cloudRepo = this.repos.find(r => typeof r.fetchCloudData === 'function');

      if (!cloudRepo || !cloudRepo.isConfigured()) {
        return false;
      }

      const cloudData = await cloudRepo.fetchCloudData(defaultTargetWords);
      if (!cloudData) {
        return false;
      }

      // Actualizar sinónimos y descartadas si existen en la nube
      if (synonymRepo && cloudData.synonyms && Object.keys(cloudData.synonyms).length > 0) {
        synonymRepo.saveAll(cloudData.synonyms);
      }
      if (dismissedRepo && Array.isArray(cloudData.dismissed)) {
        dismissedRepo.saveAll(cloudData.dismissed);
      }

      let mergedSessions = cloudData.sessions;

      // Si un participante acaba de terminar su prueba hace milisegundos, asegurar que su sesión esté presente
      if (preserveSession) {
        const existsInCloud = mergedSessions.some(s => s.id === preserveSession.id);
        const mergeAction = {
          true: () => mergedSessions,
          false: () => [...mergedSessions, preserveSession]
        };
        mergedSessions = mergeAction[existsInCloud]();
      }

      if (primaryRepo && typeof primaryRepo.saveAll === 'function') {
        primaryRepo.saveAll(mergedSessions);
      }

      return true;
    }
  }

  Infrastructure.CompositeRepo = CompositeRepo;
})(window.SpatialApp.Infrastructure);
