/**
 * ==============================================================================
 * CASO DE USO: START SESSION
 * ==============================================================================
 * Valida el nombre del participante y asigna aleatoriamente el grupo experimental.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.UseCases = window.SpatialApp.UseCases || {};

(function (UseCases, Domain) {
  'use strict';

  class StartSession {
    /**
     * @param {Object} params
     * @param {string} params.participantName
     * @param {string[]} params.targetWords
     * @returns {{ participantName: string, group: string, targetWords: string[] }}
     */
    execute({ participantName, targetWords }) {
      // Reglas de validación declarativas Fail-Fast
      const trimmedName = (participantName || '').trim();
      const validationRules = [
        {
          check: () => trimmedName.length >= 2,
          message: 'El apodo o nombre debe tener al menos 2 caracteres.'
        },
        {
          check: () => Array.isArray(targetWords) && targetWords.length > 0,
          message: 'No hay palabras configuradas para iniciar la prueba.'
        }
      ];

      const brokenRule = validationRules.find(r => !r.check());
      if (brokenRule) {
        throw new Error(brokenRule.message);
      }

      // Asignación aleatoria de grupo 50/50 sin if-else
      const availableGroups = [Domain.GroupType.SPATIAL, Domain.GroupType.LIST];
      const randomIndex = Math.floor(Math.random() * availableGroups.length);
      const assignedGroup = availableGroups[randomIndex];

      return {
        participantName: trimmedName,
        group: assignedGroup,
        targetWords: [...targetWords]
      };
    }
  }

  UseCases.StartSession = StartSession;
})(window.SpatialApp.UseCases, window.SpatialApp.Domain);
