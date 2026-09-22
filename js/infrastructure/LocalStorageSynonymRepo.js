/**
 * ==============================================================================
 * INFRAESTRUCTURA: REPOSITORIO DE SINÓNIMOS Y VARIANTES EN LOCALSTORAGE
 * ==============================================================================
 * Almacena y gestiona las equivalencias aprobadas por el administrador/investigador.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Infrastructure = window.SpatialApp.Infrastructure || {};

(function (Infrastructure, Domain) {
  'use strict';

  const STORAGE_KEY = 'spatial_memory_synonyms_v1';

  class LocalStorageSynonymRepository {
    /**
     * @param {string} [storageKey]
     */
    constructor(storageKey = STORAGE_KEY) {
      this.storageKey = storageKey;
    }

    /**
     * Obtiene el diccionario completo de sinónimos: { [palabraObjetivo]: string[] }
     * @returns {Record<string, string[]>}
     */
    getAll() {
      const rawData = localStorage.getItem(this.storageKey);
      if (!rawData) return {};

      try {
        const parsed = JSON.parse(rawData);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
      } catch (err) {
        console.error('[LocalStorageSynonymRepo] Error al parsear sinónimos:', err);
        return {};
      }
    }

    /**
     * Guarda el diccionario completo
     * @param {Record<string, string[]>} dict
     */
    _saveAll(dict) {
      localStorage.setItem(this.storageKey, JSON.stringify(dict));
    }

    /**
     * Agrega un sinónimo a una palabra objetivo
     * @param {string} targetWord - Palabra de la lista del experimento
     * @param {string} synonym - Variante o sinónimo a asociar (ej: "zapatilla")
     */
    addSynonym(targetWord, synonym) {
      const normTarget = Domain.StringUtils.normalizeWord(targetWord);
      const normSynonym = Domain.StringUtils.normalizeWord(synonym);

      // Reglas Fail-Fast
      const validationRules = [
        {
          check: () => normTarget.length > 0,
          message: 'La palabra objetivo no puede estar vacía.'
        },
        {
          check: () => normSynonym.length > 0,
          message: 'El sinónimo a agregar no puede estar vacío.'
        },
        {
          check: () => normTarget !== normSynonym,
          message: 'El sinónimo no puede ser idéntico a la palabra objetivo.'
        }
      ];

      const brokenRule = validationRules.find(rule => !rule.check());
      if (brokenRule) {
        throw new Error(`[SynonymRepo Fail-Fast]: ${brokenRule.message}`);
      }

      const dict = this.getAll();
      const existingSynonyms = dict[normTarget] || [];

      // Evitar duplicados (DRY)
      const updatedSynonyms = [...new Set([...existingSynonyms, normSynonym])];
      dict[normTarget] = updatedSynonyms;

      this._saveAll(dict);
    }

    /**
     * Elimina un sinónimo previamente aprobado
     * @param {string} targetWord
     * @param {string} synonym
     */
    removeSynonym(targetWord, synonym) {
      const normTarget = Domain.StringUtils.normalizeWord(targetWord);
      const normSynonym = Domain.StringUtils.normalizeWord(synonym);

      const dict = this.getAll();
      const existingSynonyms = dict[normTarget] || [];
      dict[normTarget] = existingSynonyms.filter(s => s !== normSynonym);

      this._saveAll(dict);
    }

    /**
     * Genera un mapa optimizado O(1): Map<normalizedSynonym, originalTargetWord>
     * @param {string[]} [targetWords] - Lista actual de palabras del experimento
     * @returns {Map<string, string>}
     */
    getMapping(targetWords = []) {
      const dict = this.getAll();
      const mapping = new Map();

      // Mapear cada palabra objetivo original
      const targetOriginalMap = new Map();
      targetWords.forEach(w => {
        targetOriginalMap.set(Domain.StringUtils.normalizeWord(w), w);
      });

      Object.entries(dict).forEach(([normTarget, synonyms]) => {
        const originalTarget = targetOriginalMap.get(normTarget) || normTarget;
        if (Array.isArray(synonyms)) {
          synonyms.forEach(syn => {
            mapping.set(Domain.StringUtils.normalizeWord(syn), originalTarget);
          });
        }
      });

      return mapping;
    }
  }

  Infrastructure.LocalStorageSynonymRepository = LocalStorageSynonymRepository;
})(window.SpatialApp.Infrastructure, window.SpatialApp.Domain);
