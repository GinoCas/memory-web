/**
 * ==============================================================================
 * INFRAESTRUCTURA: REPOSITORIO DE PALABRAS DESCARTADAS (Intrusiones de Memoria)
 * ==============================================================================
 * Almacena las palabras que el investigador descartó como falsas alarmas confirmadas
 * (palabras inventadas o intrusiones de memoria que no estaban en la lista).
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Infrastructure = window.SpatialApp.Infrastructure || {};

(function (Infrastructure, Domain) {
  'use strict';

  const STORAGE_KEY = 'spatial_memory_dismissed_v1';

  class LocalStorageDismissedRepository {
    /**
     * @param {string} [storageKey]
     */
    constructor(storageKey = STORAGE_KEY) {
      this.storageKey = storageKey;
    }

    /**
     * Obtiene el conjunto de palabras descartadas
     * @returns {string[]}
     */
    getAll() {
      const rawData = localStorage.getItem(this.storageKey);
      if (!rawData) return [];

      try {
        const parsed = JSON.parse(rawData);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.error('[LocalStorageDismissedRepo] Error al parsear descartadas:', err);
        return [];
      }
    }

    /**
     * @param {string[]} list
     */
    _saveAll(list) {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    }

    /**
     * Sincroniza/reemplaza la lista completa de palabras descartadas
     * @param {string[]} list
     */
    saveAll(list) {
      if (Array.isArray(list)) {
        this._saveAll(list);
      }
    }

    /**
     * Marca una palabra como descartada (falsa alarma confirmada)
     * @param {string} word
     */
    dismiss(word) {
      const norm = Domain.StringUtils.normalizeWord(word);
      if (!norm) {
        throw new Error('[LocalStorageDismissedRepo Fail-Fast]: La palabra a descartar no puede estar vacía.');
      }

      const current = this.getAll();
      const updated = [...new Set([...current, norm])];
      this._saveAll(updated);
    }

    /**
     * Restaura una palabra descartada devolviéndola a la bandeja de moderación
     * @param {string} word
     */
    restore(word) {
      const norm = Domain.StringUtils.normalizeWord(word);
      const current = this.getAll();
      const updated = current.filter(w => w !== norm);
      this._saveAll(updated);
    }

    /**
     * Comprueba si una palabra está en la lista de descartadas
     * @param {string} word
     * @returns {boolean}
     */
    has(word) {
      const norm = Domain.StringUtils.normalizeWord(word);
      const current = this.getAll();
      return current.includes(norm);
    }

    /**
     * Limpia la lista de descartadas
     */
    clear() {
      localStorage.removeItem(this.storageKey);
    }
  }

  Infrastructure.LocalStorageDismissedRepository = LocalStorageDismissedRepository;
})(window.SpatialApp.Infrastructure, window.SpatialApp.Domain);
