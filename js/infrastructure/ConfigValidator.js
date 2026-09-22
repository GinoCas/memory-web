/**
 * ==============================================================================
 * INFRAESTRUCTURA: VALIDADOR DE CONFIGURACIÓN (Fail-Fast)
 * ==============================================================================
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Infrastructure = window.SpatialApp.Infrastructure || {};

(function (Infrastructure) {
  'use strict';

  class ConfigValidator {
    /**
     * Valida de manera estricta y temprana (Fail-Fast) la configuración del experimento.
     * @param {Object} config
     * @throws {Error} Si alguna regla de configuración no se cumple.
     * @returns {Object} Configuración saneada y congelada.
     */
    static validate(config) {
      // Reglas de validación declarativas (evitando if-else chains)
      const rules = [
        {
          check: () => Boolean(config && typeof config === 'object'),
          message: 'El objeto de configuración "EXPERIMENT_CONFIG" no está definido o no es un objeto válido.'
        },
        {
          check: () => Array.isArray(config.words),
          message: 'La propiedad "words" debe ser un arreglo de palabras.'
        },
        {
          check: () => config.words && config.words.length >= 3,
          message: `La lista de palabras debe contener al menos 3 palabras (actual: ${config.words?.length || 0}).`
        },
        {
          check: () => config.words && config.words.every(w => typeof w === 'string' && w.trim().length > 0),
          message: 'Todas las entradas en la lista "words" deben ser textos no vacíos.'
        },
        {
          check: () => typeof config.studyDurationSeconds === 'number' && config.studyDurationSeconds > 0,
          message: 'La propiedad "studyDurationSeconds" debe ser un número entero mayor que 0.'
        },
        {
          check: () => typeof config.mathTaskDurationSeconds === 'number' && config.mathTaskDurationSeconds > 0,
          message: 'La propiedad "mathTaskDurationSeconds" debe ser un número entero mayor que 0.'
        },
        {
          check: () => Array.isArray(config.mathProblems) && config.mathProblems.length >= 12,
          message: `La propiedad "mathProblems" debe ser un arreglo con al menos 12 cálculos matemáticos (actual: ${config.mathProblems?.length || 0}).`
        },
        {
          check: () => Array.isArray(config.mathProblems) && config.mathProblems.every(
            p => p && typeof p.question === 'string' && typeof p.answer === 'number'
          ),
          message: 'Cada elemento en "mathProblems" debe ser un objeto con "question" (texto) y "answer" (número).'
        },
        {
          check: () => typeof config.recallDurationSeconds === 'number' && config.recallDurationSeconds >= 0,
          message: 'La propiedad "recallDurationSeconds" debe ser un número mayor o igual a 0.'
        },
        {
          check: () => typeof config.imagePath === 'string' && config.imagePath.trim().length > 0,
          message: 'La propiedad "imagePath" debe ser una cadena de texto no vacía con la ruta de la imagen.'
        }
      ];

      const brokenRule = rules.find(rule => !rule.check());
      if (brokenRule) {
        throw new Error(`[ConfigValidator Fail-Fast]: ${brokenRule.message}`);
      }

      // Normalizar duplicados en palabras de estudio (DRY + consistencia)
      const sanitizedWords = [...new Set(config.words.map(w => w.trim()))];
      const sanitizedMathProblems = config.mathProblems.map(p => ({
        question: p.question.trim(),
        answer: Number(p.answer)
      }));

      return Object.freeze({
        words: sanitizedWords,
        imagePath: config.imagePath.trim(),
        googleSheetsWebAppUrl: config.googleSheetsWebAppUrl ? config.googleSheetsWebAppUrl.trim() : "",
        studyDurationSeconds: Math.floor(config.studyDurationSeconds),
        mathTaskDurationSeconds: Math.floor(config.mathTaskDurationSeconds),
        mathProblems: Object.freeze(sanitizedMathProblems),
        recallDurationSeconds: Math.floor(config.recallDurationSeconds),
        allowEarlyFinish: Boolean(config.allowEarlyFinish ?? true)
      });
    }
  }

  Infrastructure.ConfigValidator = ConfigValidator;
})(window.SpatialApp.Infrastructure);
