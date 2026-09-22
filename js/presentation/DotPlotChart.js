/**
 * ==============================================================================
 * PRESENTACIÓN: GRÁFICO DE PUNTOS (DotPlotChart / Strip Plot)
 * ==============================================================================
 * Renderiza un gráfico científico SVG de dispersión de puntos por grupo con:
 * - Distribución de cada participante como un punto individual según su grupo.
 * - Desplazamiento horizontal (jitter/swarm) para evitar solapamientos en puntuaciones iguales.
 * - Líneas de referencia para las medias muestrales de cada grupo.
 * - Resaltado visual interactivo del participante actual ("TÚ").
 * - 100% SVG nativo sin dependencias externas (compatible con file://).
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Presentation = window.SpatialApp.Presentation || {};

(function (Presentation, Domain) {
  'use strict';

  class DotPlotChart {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.container
     * @param {Domain.Session[]} options.sessions
     * @param {string} options.currentSessionId
     * @param {number} options.targetWordsCount
     * @param {Object} options.statistics
     */
    static render({ container, sessions = [], currentSessionId = '', targetWordsCount = 12, statistics }) {
      if (!container) return;

      const width = 640;
      const height = 340;
      const margin = { top: 35, right: 40, bottom: 55, left: 60 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      const maxY = Math.max(targetWordsCount, 1);

      // Función de interpolación lineal para eje Y (DRY)
      const scaleY = (val) => {
        const clamped = Math.max(0, Math.min(val, maxY));
        return margin.top + chartHeight - (clamped / maxY) * chartHeight;
      };

      // Posiciones centrales para cada grupo en el eje X
      const groupPositions = {
        [Domain.GroupType.SPATIAL]: margin.left + chartWidth * 0.3,
        [Domain.GroupType.LIST]: margin.left + chartWidth * 0.7
      };

      const groupStyles = {
        [Domain.GroupType.SPATIAL]: {
          fill: '#059669',
          stroke: '#047857',
          lineColor: '#10b981',
          name: 'Grupo Espacial (Imagen)'
        },
        [Domain.GroupType.LIST]: {
          fill: '#d97706',
          stroke: '#b45309',
          lineColor: '#f59e0b',
          name: 'Grupo Control (Lista)'
        }
      };

      // 1. Generar líneas horizontales de cuadrícula (Grid Lines)
      const tickStep = maxY <= 10 ? 2 : (maxY <= 16 ? 3 : 4);
      const gridTicks = [];
      for (let t = 0; t <= maxY; t += tickStep) {
        gridTicks.push(t);
      }
      if (gridTicks[gridTicks.length - 1] !== maxY) {
        gridTicks.push(maxY);
      }

      const gridLinesHtml = gridTicks
        .map(tickVal => {
          const yPos = scaleY(tickVal);
          return `
            <line x1="${margin.left}" y1="${yPos}" x2="${width - margin.right}" y2="${yPos}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
            <text x="${margin.left - 12}" y="${yPos + 4}" text-anchor="end" font-size="11" fill="#64748b" font-weight="600">${tickVal}</text>
          `;
        })
        .join('');

      // 2. Generar columnas de fondo sutiles para los dos grupos
      const columnWidth = chartWidth * 0.32;
      const columnsBackgroundHtml = Object.keys(groupPositions)
        .map(groupKey => {
          const centerX = groupPositions[groupKey];
          return `
            <rect 
              x="${centerX - columnWidth / 2}" 
              y="${margin.top}" 
              width="${columnWidth}" 
              height="${chartHeight}" 
              rx="8" 
              fill="#f8fafc" 
              stroke="#e2e8f0" 
              stroke-width="1"
            />
          `;
        })
        .join('');

      // 3. Generar líneas de promedio (Media de cada grupo)
      const meanLinesHtml = Object.keys(groupPositions)
        .map(groupKey => {
          const groupStats = statistics.groups[groupKey];
          const hasParticipants = Boolean(groupStats && groupStats.count > 0);
          const style = groupStyles[groupKey];
          const centerX = groupPositions[groupKey];

          const renderMeanMap = {
            true: () => {
              const yPos = scaleY(groupStats.avgScore);
              return `
                <g class="mean-indicator">
                  <line 
                    x1="${centerX - columnWidth / 2 + 8}" 
                    y1="${yPos}" 
                    x2="${centerX + columnWidth / 2 - 8}" 
                    y2="${yPos}" 
                    stroke="${style.lineColor}" 
                    stroke-width="2.5" 
                    stroke-linecap="round"
                  />
                  <!-- Etiqueta de la Media -->
                  <rect 
                    x="${centerX - 35}" 
                    y="${yPos - 22}" 
                    width="70" 
                    height="18" 
                    rx="4" 
                    fill="#1e293b" 
                    opacity="0.85"
                  />
                  <text 
                    x="${centerX}" 
                    y="${yPos - 10}" 
                    text-anchor="middle" 
                    font-size="10" 
                    fill="#ffffff" 
                    font-weight="700"
                  >
                    Media: ${groupStats.avgScore}
                  </text>
                </g>
              `;
            },
            false: () => ''
          };

          return renderMeanMap[hasParticipants]();
        })
        .join('');

      // 4. Agrupar puntos por puntuación idéntica para aplicar dispersión horizontal (Beeswarm Jitter)
      const scoreBuckets = new Map();
      sessions.forEach(session => {
        const key = `${session.group}_${session.score}`;
        const bucket = scoreBuckets.get(key) || [];
        bucket.push(session);
        scoreBuckets.set(key, bucket);
      });

      // 5. Renderizar los puntos (dots) de cada participante
      const dotsHtml = sessions
        .map(session => {
          const centerX = groupPositions[session.group] || margin.left;
          const yPos = scaleY(session.score);
          const style = groupStyles[session.group] || { fill: '#3b82f6', stroke: '#1d4ed8' };

          // Calcular desplazamiento horizontal (jitter simétrico)
          const bucket = scoreBuckets.get(`${session.group}_${session.score}`) || [];
          const itemIndexInBucket = bucket.indexOf(session);
          const totalInBucket = bucket.length;

          // Espaciamiento simétrico: -15px, 0, +15px...
          const offsetStep = 15;
          const horizontalOffset = (itemIndexInBucket - (totalInBucket - 1) / 2) * offsetStep;
          const finalX = centerX + horizontalOffset;

          const isCurrent = session.id === currentSessionId;

          const currentDotDecorations = {
            true: `
              <!-- Halo pulsante para la prueba actual -->
              <circle cx="${finalX}" cy="${yPos}" r="14" fill="#3b82f6" opacity="0.25" class="pulsing-halo" />
              <!-- Anillo exterior destacado -->
              <circle cx="${finalX}" cy="${yPos}" r="10" fill="none" stroke="#2563eb" stroke-width="2.5" />
              <!-- Badge indicativo 'Tú' -->
              <rect x="${finalX - 14}" y="${yPos - 25}" width="28" height="15" rx="3" fill="#2563eb" />
              <text x="${finalX}" y="${yPos - 14}" text-anchor="middle" font-size="9" font-weight="800" fill="#ffffff">TÚ</text>
            `,
            false: ''
          };

          const radius = isCurrent ? 8 : 6.5;

          return `
            <g class="chart-dot-group ${isCurrent ? 'current-participant-dot' : ''}">
              ${currentDotDecorations[isCurrent]}
              <circle 
                cx="${finalX}" 
                cy="${yPos}" 
                r="${radius}" 
                fill="${style.fill}" 
                stroke="${isCurrent ? '#ffffff' : style.stroke}" 
                stroke-width="${isCurrent ? '2' : '1.5'}"
                class="chart-dot"
              >
                <title>${session.participantName} (${session.group}): ${session.score} / ${session.targetWords.length} palabras acertadas (${session.accuracy}%)\nGrupo: ${style.name}</title>
              </circle>
            </g>
          `;
        })
        .join('');

      // 6. Generar etiquetas de los grupos en el eje X
      const groupLabelsHtml = Object.keys(groupPositions)
        .map(groupKey => {
          const centerX = groupPositions[groupKey];
          const style = groupStyles[groupKey];
          const groupStats = statistics.groups[groupKey];
          const count = groupStats ? groupStats.count : 0;

          return `
            <g transform="translate(${centerX}, ${height - margin.bottom + 22})">
              <text text-anchor="middle" font-size="13" font-weight="700" fill="#1e293b">${style.name}</text>
              <text y="17" text-anchor="middle" font-size="11" font-weight="500" fill="#64748b">(${count} participantes)</text>
            </g>
          `;
        })
        .join('');

      // 7. Renderizado final del contenedor y el elemento SVG
      container.innerHTML = `
        <div class="dot-plot-card">
          <div class="dot-plot-header">
            <div class="dot-plot-titles">
              <h4 class="dot-plot-title">Distribución de Puntuaciones por Grupo (Gráfico de Puntos)</h4>
              <p class="dot-plot-desc">Cada punto representa a un participante. Pasa el cursor por encima para ver detalles.</p>
            </div>
            <div class="dot-plot-legend">
              <span class="legend-item">
                <span class="legend-circle legend-spatial"></span>
                <span>Espacial</span>
              </span>
              <span class="legend-item">
                <span class="legend-circle legend-control"></span>
                <span>Control</span>
              </span>
              <span class="legend-item">
                <span class="legend-circle legend-current"></span>
                <span>Tu Sesión</span>
              </span>
            </div>
          </div>

          <div class="svg-responsive-container">
            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="dot-plot-svg">
              <!-- Eje Y: Título rotado -->
              <text 
                transform="rotate(-90)" 
                x="${-(margin.top + chartHeight / 2)}" 
                y="${margin.left - 42}" 
                text-anchor="middle" 
                font-size="12" 
                font-weight="700" 
                fill="#475569"
              >
                Palabras Recordadas (Aciertos)
              </text>

              <!-- Fondo de columnas -->
              ${columnsBackgroundHtml}

              <!-- Cuadrícula horizontal -->
              ${gridLinesHtml}

              <!-- Líneas de Media muestral -->
              ${meanLinesHtml}

              <!-- Puntos de los participantes -->
              ${dotsHtml}

              <!-- Etiquetas del Eje X -->
              ${groupLabelsHtml}
            </svg>
          </div>
        </div>
      `;
    }
  }

  Presentation.DotPlotChart = DotPlotChart;
})(window.SpatialApp.Presentation, window.SpatialApp.Domain);
