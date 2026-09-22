/**
 * ==============================================================================
 * PRESENTACIÓN: ESTRATEGIAS DE ESTÍMULO (Strategy Pattern / Open-Closed)
 * ==============================================================================
 * Renderiza el estímulo visual correspondiente al grupo asignado sin if-else.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Presentation = window.SpatialApp.Presentation || {};

(function (Presentation, Domain) {
  'use strict';

  const StimulusStrategies = {
    /**
     * ESTRATEGIA GRUPO ESPACIAL:
     * Intenta cargar la imagen configurada. Si no existe o falla la carga,
     * muestra el texto "Image not found" y la lista de palabras a continuación.
     */
    [Domain.GroupType.SPATIAL]: {
      render({ container, config }) {
        const wordsListHtml = config.words
          .map((word, index) => `<li class="spatial-fallback-item"><span class="word-number">${index + 1}.</span> ${word}</li>`)
          .join('');

        container.innerHTML = `
          <div class="stimulus-card stimulus-spatial">
            <div class="stimulus-header">
              <h3>Observa y memoriza las palabras</h3>
              <p class="stimulus-instruction">
                Presta atención a las palabras y trata de retener la mayor cantidad posible.
              </p>
            </div>

            <div class="spatial-viewport" id="spatialViewport">
              <!-- Contenedor de imagen dinámica con detector de carga -->
              <img 
                id="spatialImage" 
                src="${config.imagePath}" 
                alt="Escenario con palabras" 
                class="spatial-image hidden"
              />

              <!-- Fallback solicitado: 'Image not found' y lista de palabras -->
              <div id="spatialFallback" class="spatial-fallback-container">
                <div class="not-found-banner">
                  <div class="not-found-icon">🖼️</div>
                  <div class="not-found-text">Image not found</div>
                  <p class="not-found-subtext">Ruta configurada: <code>${config.imagePath}</code></p>
                </div>

                <div class="fallback-words-section">
                  <p class="fallback-instructions-label">Lista de palabras para la prueba:</p>
                  <ul class="spatial-words-grid">
                    ${wordsListHtml}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        `;

        const imgElement = container.querySelector('#spatialImage');
        const fallbackElement = container.querySelector('#spatialFallback');

        // Manejador reactivo de imagen sin if-else
        imgElement.onload = () => {
          imgElement.classList.remove('hidden');
          fallbackElement.classList.add('hidden');
        };

        imgElement.onerror = () => {
          imgElement.classList.add('hidden');
          fallbackElement.classList.remove('hidden');
        };
      }
    },

    /**
     * ESTRATEGIA GRUPO CONTROL (LISTA):
     * Muestra las palabras en formato de lista secuencial de texto plano ordenadas aleatoriamente.
     */
    [Domain.GroupType.LIST]: {
      render({ container, config }) {
        const shuffledWords = Domain.ArrayUtils.shuffle(config.words);
        const wordsListHtml = shuffledWords
          .map((word, index) => `
            <li class="list-word-item">
              <span class="word-index">${index + 1}</span>
              <span class="word-text">${word}</span>
            </li>
          `)
          .join('');

        container.innerHTML = `
          <div class="stimulus-card stimulus-list">
            <div class="stimulus-header">
              <h3>Observa y memoriza las palabras</h3>
              <p class="stimulus-instruction">
                Presta atención a las palabras y trata de retener la mayor cantidad posible.
              </p>
            </div>

            <div class="list-viewport">
              <ul class="text-words-list">
                ${wordsListHtml}
              </ul>
            </div>
          </div>
        `;
      }
    }
  };

  Presentation.StimulusStrategies = StimulusStrategies;
})(window.SpatialApp.Presentation, window.SpatialApp.Domain);
