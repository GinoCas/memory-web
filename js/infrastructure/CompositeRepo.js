/**
 * ==============================================================================
 * INFRAESTRUCTURA: REPOSITORIO COMPUESTO (Composite Pattern)
 * ==============================================================================
 * Permite guardar la misma sesión en múltiples repositorios simultáneamente
 * (ej. LocalStorage y GoogleSheets) sin modificar la capa de Casos de Uso.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Infrastructure = window.SpatialApp.Infrastructure || {};

(function (Infrastructure) {
  'use strict';

  class CompositeRepo {
    /**
     * @param {Object[]} repos Arreglo de instancias de repositorios
     */
    constructor(repos) {
      this.repos = repos;
    }

    save(session) {
      // Guardar en todos los repositorios configurados
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
      // Devolver los datos del primer repositorio (generalmente el local)
      const primaryRepo = this.repos[0];
      return primaryRepo ? primaryRepo.getAll() : [];
    }

    clear() {
      this.repos.forEach(repo => repo.clear && repo.clear());
    }
  }

  Infrastructure.CompositeRepo = CompositeRepo;
})(window.SpatialApp.Infrastructure);
