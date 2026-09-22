/**
 * ==============================================================================
 * DOMINIO: CONSTANTES Y UTILIDADES PURAS
 * ==============================================================================
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Domain = window.SpatialApp.Domain || {};

(function (Domain) {
  'use strict';

  Domain.GroupType = Object.freeze({
    SPATIAL: 'SPATIAL',
    LIST: 'LIST'
  });

  Domain.GroupLabels = Object.freeze({
    [Domain.GroupType.SPATIAL]: {
      name: 'Grupo Espacial (Imagen / Escena)',
      shortName: 'Espacial',
      badgeClass: 'badge-spatial',
      description: 'Estímulo con palabras distribuidas espacialmente en un escenario.'
    },
    [Domain.GroupType.LIST]: {
      name: 'Grupo Control (Lista de Texto)',
      shortName: 'Lista Control',
      badgeClass: 'badge-control',
      description: 'Estímulo con palabras presentadas en lista secuencial ordenada al azar.'
    }
  });

  Domain.ScreenId = Object.freeze({
    WELCOME: 'WELCOME',
    STIMULUS: 'STIMULUS',
    DISTRACTOR: 'DISTRACTOR',
    RECALL: 'RECALL',
    RESULTS: 'RESULTS'
  });

  Domain.StorageKeys = Object.freeze({
    SESSIONS: 'spatial_memory_sessions_v1'
  });

  /**
   * Utilidades puras reutilizables (DRY)
   */
  Domain.ArrayUtils = Object.freeze({
    /**
     * Algoritmo Fisher-Yates inmutable para barajar arreglos sin modificar el original
     */
    shuffle(array) {
      if (!Array.isArray(array)) return [];
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }
  });

  /**
   * Utilidad pura de normalización de cadenas de texto (DRY).
   * Elimina tildes, signos diacríticos, mayúsculas y espacios innecesarios.
   */
  Domain.StringUtils = Object.freeze({
    normalizeWord(word) {
      if (typeof word !== 'string') return '';
      return word
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '');
    }
  });
})(window.SpatialApp.Domain);
