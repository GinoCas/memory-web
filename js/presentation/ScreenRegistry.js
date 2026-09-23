/**
 * ==============================================================================
 * PRESENTACIÓN: REGISTRO DE PANTALLAS (ScreenRegistry / State Pattern)
 * ==============================================================================
 * Renderiza cada fase del experimento sin condicionales if-else encadenados.
 */

window.SpatialApp = window.SpatialApp || {};
window.SpatialApp.Presentation = window.SpatialApp.Presentation || {};

(function (Presentation, Domain) {
  'use strict';

  const ScreenRegistry = {
    /**
     * PANTALLA 1: BIENVENIDA Y REGISTRO DE PARTICIPANTE
     */
    [Domain.ScreenId.WELCOME]: {
      render({ rootElement, appState, events }) {
        rootElement.innerHTML = `
          <div class="screen-card welcome-card">
            <header class="card-header">
              <div class="app-icon">🧠</div>
              <h2>Prueba de Memoria</h2>
              <p class="subtitle">Evaluación de retención de palabras</p>
            </header>

            <div class="card-body">
              <div class="info-callout">
                <ol class="instructions-list">
                  <li>Ingresa tu nombre o apodo para registrar tu prueba.</li>
                  <li>Se te presentará un conjunto de palabras durante <strong>${appState.config.studyDurationSeconds} segundos</strong>. Concéntrate en memorizarlas.</li>
                  <li>Posteriormente, deberás escribir todas las palabras que recuerdes.</li>
                </ol>
              </div>

              <form id="welcomeForm" class="welcome-form" autocomplete="off">
                <div class="form-group">
                  <label for="participantInput">Nombre o Apodo:</label>
                  <div class="input-wrapper">
                    <input 
                      type="text" 
                      id="participantInput" 
                      name="participantName"
                      placeholder="Ej: Laura, Alex23..." 
                      maxlength="30"
                      autofocus
                      required
                    />
                  </div>
                  <div id="welcomeError" class="input-error-msg hidden"></div>
                </div>

                <div class="form-actions">
                  <button type="submit" id="btnStart" class="btn btn-primary btn-lg">
                    <span>Comenzar Prueba</span>
                    <span class="btn-arrow">→</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        `;

        const form = rootElement.querySelector('#welcomeForm');
        const input = rootElement.querySelector('#participantInput');
        const errorEl = rootElement.querySelector('#welcomeError');

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = input.value.trim();

          const validationAction = {
            true: () => {
              errorEl.textContent = '';
              errorEl.classList.add('hidden');
              events.onStartSession(name);
            },
            false: () => {
              errorEl.textContent = 'Por favor ingresa un nombre o apodo de al menos 2 caracteres.';
              errorEl.classList.remove('hidden');
              input.focus();
            }
          };

          validationAction[name.length >= 2]();
        });
      }
    },

    /**
     * PANTALLA 2: EXPOSICIÓN AL ESTÍMULO (Espacial vs Lista)
     */
    [Domain.ScreenId.STIMULUS]: {
      render({ rootElement, appState, events }) {
        rootElement.innerHTML = `
          <div class="screen-card stimulus-container-card">
            <!-- Barra superior con temporizador -->
            <div class="timer-bar-container">
              <div class="timer-info">
                <span class="timer-label">⏱️ Tiempo restante para memorizar:</span>
                <span id="stimulusTimerValue" class="timer-number">${appState.config.studyDurationSeconds}s</span>
              </div>
              <div class="progress-track">
                <div id="stimulusProgressFill" class="progress-fill" style="width: 0%"></div>
              </div>
            </div>

            <!-- Contenedor dinámico del estímulo -->
            <div id="stimulusMountPoint" class="stimulus-mount"></div>

            <!-- Botón opcional de avance temprano -->
            <div class="stimulus-footer" id="stimulusFooter"></div>
          </div>
        `;

        const mountPoint = rootElement.querySelector('#stimulusMountPoint');
        const timerValue = rootElement.querySelector('#stimulusTimerValue');
        const progressFill = rootElement.querySelector('#stimulusProgressFill');
        const footer = rootElement.querySelector('#stimulusFooter');

        // Renderizado del estímulo según estrategia (sin if-else)
        const strategy = Presentation.StimulusStrategies[appState.currentSession.group];
        strategy.render({ container: mountPoint, config: appState.config });

        // Temporizador de estudio
        const studyTimer = new Presentation.Timer({
          durationSeconds: appState.config.studyDurationSeconds,
          onTick: (remaining, total, percent) => {
            timerValue.textContent = `${remaining}s`;
            progressFill.style.width = `${percent}%`;
          },
          onComplete: () => {
            events.onStimulusCompleted({ studyTimeSeconds: studyTimer.getElapsedSeconds() });
          }
        });

        const earlyFinishMap = {
          true: () => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.innerHTML = 'Ya memoricé las palabras (Continuar) →';
            btn.onclick = () => {
              studyTimer.stop();
              events.onStimulusCompleted({ studyTimeSeconds: studyTimer.getElapsedSeconds() });
            };
            footer.appendChild(btn);
          },
          false: () => {}
        };

        earlyFinishMap[Boolean(appState.config.allowEarlyFinish)]();

        studyTimer.start();
      }
    },

    /**
     * PANTALLA INTERMEDIA: TAREA DISTRACTORA DE CÁLCULOS MATEMÁTICOS
     * 12 cálculos matemáticos en orden aleatorio con límite de 60 segundos.
     */
    [Domain.ScreenId.DISTRACTOR]: {
      render({ rootElement, appState, events }) {
        const shuffledProblems = Domain.ArrayUtils.shuffle(appState.config.mathProblems);
        const totalProblems = shuffledProblems.length;
        let currentIndex = 0;
        let isCompleted = false;

        rootElement.innerHTML = `
          <div class="screen-card distractor-card">
            <header class="distractor-header">
              <div class="distractor-icon">🧮</div>
              <h2>Fase Intermedia: Cálculo Mental</h2>
              <p class="subtitle">Resuelve los siguientes ejercicios matemáticos rápidos antes de la prueba de recuerdo.</p>
            </header>

            <!-- Temporizador de 60 segundos -->
            <div class="timer-bar-container">
              <div class="timer-info">
                <span class="timer-label">⏱️ Tiempo restante:</span>
                <span id="distractorTimerValue" class="timer-number">${appState.config.mathTaskDurationSeconds}s</span>
              </div>
              <div class="progress-track">
                <div id="distractorProgressFill" class="progress-fill" style="width: 0%"></div>
              </div>
            </div>

            <!-- Área de ejercicio matemático -->
            <div class="math-challenge-container">
              <div class="math-progress-badge">
                Cálculo <span id="mathCurrentIndex">1</span> de ${totalProblems}
              </div>

              <div class="math-question-box">
                <span id="mathQuestionText" class="math-question-text"></span>
                <span class="math-equals">=</span>
                <span class="math-placeholder">?</span>
              </div>

              <form id="mathForm" class="math-form" autocomplete="off">
                <div class="math-input-row">
                  <input 
                    type="number" 
                    id="mathAnswerInput" 
                    class="math-input" 
                    placeholder="Escribe el resultado..." 
                    autofocus 
                    required
                  />
                  <button type="submit" class="btn btn-primary btn-lg" id="btnSubmitMath">
                    <span>Siguiente</span>
                    <span class="btn-arrow">→</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        `;

        const timerValue = rootElement.querySelector('#distractorTimerValue');
        const progressFill = rootElement.querySelector('#distractorProgressFill');
        const questionText = rootElement.querySelector('#mathQuestionText');
        const currentIndexEl = rootElement.querySelector('#mathCurrentIndex');
        const form = rootElement.querySelector('#mathForm');
        const input = rootElement.querySelector('#mathAnswerInput');

        const finishDistractor = () => {
          const finishActionMap = {
            true: () => {},
            false: () => {
              isCompleted = true;
              distractorTimer.stop();
              events.onDistractorCompleted();
            }
          };
          finishActionMap[isCompleted]();
        };

        const distractorTimer = new Presentation.Timer({
          durationSeconds: appState.config.mathTaskDurationSeconds,
          onTick: (remaining, total, percent) => {
            timerValue.textContent = `${remaining}s`;
            progressFill.style.width = `${percent}%`;
          },
          onComplete: () => {
            finishDistractor();
          }
        });

        const showCurrentProblem = () => {
          const current = shuffledProblems[currentIndex];
          questionText.textContent = current.question;
          currentIndexEl.textContent = currentIndex + 1;
          input.value = '';
          input.focus();
        };

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          currentIndex += 1;

          // Sin if-else encadenado: mapa de avance según si se completaron los 12 cálculos
          const advanceMap = {
            true: () => finishDistractor(),
            false: () => showCurrentProblem()
          };

          advanceMap[currentIndex >= totalProblems]();
        });

        // Mostrar primer ejercicio e iniciar cronómetro
        showCurrentProblem();
        distractorTimer.start();
      }
    },

    /**
     * PANTALLA 4: RECUERDO / ESCRITURA DE PALABRAS (Recall)
     */
    [Domain.ScreenId.RECALL]: {
      render({ rootElement, appState, events }) {
        const hasTimeLimit = appState.config.recallDurationSeconds > 0;
        const enteredWords = new Set();
        const currentGroup = appState.currentSession ? appState.currentSession.group : Domain.GroupType.LIST;

        // Estrategia de pista visual según grupo asignado (sin cadenas if-else)
        const recallCueStrategyMap = {
          [Domain.GroupType.SPATIAL]: () => `
            <div class="spatial-recall-cue">
              <div class="spatial-viewport recall-spatial-viewport">
                <img
                  id="recallSpatialImage"
                  src="${appState.config.recallImagePath}"
                  alt="Escenario visual sin palabras"
                  class="spatial-image"
                />
              </div>
            </div>
          `,
          [Domain.GroupType.LIST]: () => ''
        };

        const spatialCueHtml = (recallCueStrategyMap[currentGroup] || recallCueStrategyMap[Domain.GroupType.LIST])();

        rootElement.innerHTML = `
          <div class="screen-card recall-card">
            <header class="recall-header">
              <h2>Fase de Recuerdo</h2>
              <p class="subtitle">Escribe todas las palabras que recuerdes. El orden no importa.</p>
            </header>

            ${hasTimeLimit ? `
              <div class="timer-bar-container">
                <div class="timer-info">
                  <span class="timer-label">⏱️ Tiempo restante para responder:</span>
                  <span id="recallTimerValue" class="timer-number">${appState.config.recallDurationSeconds}s</span>
                </div>
                <div class="progress-track">
                  <div id="recallProgressFill" class="progress-fill" style="width: 0%"></div>
                </div>
              </div>
            ` : ''}

            <div class="recall-body">
              ${spatialCueHtml}

              <form id="wordInputForm" class="word-input-form" autocomplete="off">
                <div class="input-row">
                  <input 
                    type="text" 
                    id="singleWordInput" 
                    placeholder="Escribe una palabra y presiona Enter..." 
                    autofocus
                  />
                  <button type="submit" class="btn btn-primary" id="btnAddWord">Añadir</button>
                </div>
                <span id="wordFeedbackMsg" class="word-feedback-msg hidden"></span>
              </form>

              <div class="words-summary-bar">
                <span class="summary-label">Palabras registradas:</span>
                <span id="wordCountBadge" class="badge-count">0</span>
              </div>

              <div id="enteredWordsList" class="entered-words-container">
                <div class="empty-words-placeholder">Aún no has añadido ninguna palabra.</div>
              </div>

              <div class="recall-actions">
                <button type="button" id="btnFinishRecall" class="btn btn-success btn-lg">
                  <span>Finalizar y Enviar Resultados</span>
                  <span class="btn-check">✓</span>
                </button>
              </div>
            </div>
          </div>
        `;

        const wordForm = rootElement.querySelector('#wordInputForm');
        const wordInput = rootElement.querySelector('#singleWordInput');
        const feedbackMsg = rootElement.querySelector('#wordFeedbackMsg');
        const wordsListContainer = rootElement.querySelector('#enteredWordsList');
        const wordCountBadge = rootElement.querySelector('#wordCountBadge');
        const btnFinish = rootElement.querySelector('#btnFinishRecall');

        let recallTimer = null;

        const updateWordsUI = () => {
          wordCountBadge.textContent = enteredWords.size;

          const renderEmptyMap = {
            true: () => {
              wordsListContainer.innerHTML = `<div class="empty-words-placeholder">Aún no has añadido ninguna palabra.</div>`;
            },
            false: () => {
              wordsListContainer.innerHTML = Array.from(enteredWords)
                .map(word => `
                  <span class="word-chip" data-word="${word}">
                    <span class="chip-text">${word}</span>
                    <button type="button" class="btn-remove-chip" aria-label="Eliminar ${word}">×</button>
                  </span>
                `)
                .join('');

              // Delegación de eventos para eliminar palabras
              wordsListContainer.querySelectorAll('.btn-remove-chip').forEach(btn => {
                btn.onclick = (e) => {
                  const chip = e.target.closest('.word-chip');
                  const wordToRemove = chip.getAttribute('data-word');
                  enteredWords.delete(wordToRemove);
                  updateWordsUI();
                  wordInput.focus();
                };
              });
            }
          };

          renderEmptyMap[enteredWords.size === 0]();
        };

        const showFeedback = (message, isError = true) => {
          feedbackMsg.textContent = message;
          feedbackMsg.className = `word-feedback-msg ${isError ? 'feedback-error' : 'feedback-success'}`;
          feedbackMsg.classList.remove('hidden');
          setTimeout(() => feedbackMsg.classList.add('hidden'), 2500);
        };

        wordForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const rawWord = wordInput.value.trim();

          const submissionRules = [
            {
              check: () => rawWord.length > 0,
              message: 'Escribe una palabra antes de presionar Añadir.'
            },
            {
              check: () => !enteredWords.has(rawWord.toLowerCase()),
              message: `La palabra "${rawWord}" ya fue añadida.`
            }
          ];

          const failedRule = submissionRules.find(rule => !rule.check());

          const addActionMap = {
            true: () => {
              showFeedback(failedRule.message, true);
            },
            false: () => {
              enteredWords.add(rawWord.toLowerCase());
              wordInput.value = '';
              showFeedback(`"${rawWord}" añadida`, false);
              updateWordsUI();
            }
          };

          addActionMap[Boolean(failedRule)]();
          wordInput.focus();
        });

        const finishRecall = () => {
          if (recallTimer) recallTimer.stop();
          const elapsed = recallTimer ? recallTimer.getElapsedSeconds() : 0;
          events.onRecallSubmitted({
            submittedWords: Array.from(enteredWords),
            recallTimeSeconds: elapsed
          });
        };

        btnFinish.onclick = finishRecall;

        // Temporizador de recall si está configurado
        const timerSetupMap = {
          true: () => {
            const timerValue = rootElement.querySelector('#recallTimerValue');
            const progressFill = rootElement.querySelector('#recallProgressFill');
            recallTimer = new Presentation.Timer({
              durationSeconds: appState.config.recallDurationSeconds,
              onTick: (remaining, total, percent) => {
                timerValue.textContent = `${remaining}s`;
                progressFill.style.width = `${percent}%`;
              },
              onComplete: finishRecall
            });
            recallTimer.start();
          },
          false: () => {
            recallTimer = new Presentation.Timer({ durationSeconds: 0 });
            recallTimer.start();
          }
        };

        timerSetupMap[hasTimeLimit]();
      }
    },

    /**
     * PANTALLA 4: RESULTADOS INDIVIDUALES Y PROMEDIO GENERAL DE TODOS LOS PARTICIPANTES
     */
    [Domain.ScreenId.RESULTS]: {
      render({ rootElement, appState, events }) {
        const session = appState.lastCompletedSession;
        const { statistics, sessions } = appState.statsReport;

        const totalWordsCount = session.targetWords.length;

        // Formato de listas de aciertos, fallos y falsas alarmas
        const renderChips = (words, className) => {
          const emptyMap = {
            true: () => `<span class="empty-tag">Ninguna</span>`,
            false: () => words.map(w => `<span class="result-tag ${className}">${w}</span>`).join('')
          };
          return emptyMap[words.length === 0]();
        };

        // Generar filas de tabla histórica (sin exponer grupos a los participantes)
        const historyRows = sessions
          .slice()
          .reverse()
          .map((s, idx) => `
            <tr>
              <td>#${sessions.length - idx}</td>
              <td><strong>${s.participantName}</strong></td>
              <td><strong>${s.score}</strong> / ${s.targetWords.length}</td>
              <td>${s.accuracy}%</td>
              <td>${s.recallTimeSeconds}s</td>
              <td>${new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
          `)
          .join('');

        // Conclusión neutral del rendimiento individual frente a la media general
        const buildConclusion = () => {
          const singleParticipant = statistics.totalParticipants <= 1;
          const diff = session.score - statistics.globalAvgScore;
          
          const statusKey = singleParticipant 
            ? 'first_session'
            : (diff > 0 ? 'above_average' : (diff < 0 ? 'below_average' : 'on_average'));

          const conclusionMap = {
            first_session: () => `¡Primer registro completado! Has recordado <strong>${session.score} de ${totalWordsCount} palabras</strong>. A medida que más participantes realicen la prueba, se consolidará la media general de rendimiento.`,
            above_average: () => `<strong>¡Excelente desempeño!</strong> Has recordado <strong>${session.score} palabras</strong>, superando en <strong>+${diff.toFixed(1)} palabras</strong> el promedio general de los participantes (${statistics.globalAvgScore} palabras).`,
            below_average: () => `Has recordado <strong>${session.score} palabras</strong>. El promedio general de los participantes se sitúa actualmente en <strong>${statistics.globalAvgScore} palabras</strong>.`,
            on_average: () => `Tu resultado (<strong>${session.score} palabras</strong>) coincide exactamente con el promedio general registrado por todos los participantes (${statistics.globalAvgScore} palabras).`
          };

          return conclusionMap[statusKey]();
        };

        rootElement.innerHTML = `
          <div class="screen-card results-card">
            <header class="results-header">
              <div class="success-icon">📊</div>
              <h2>Resultados de la Prueba</h2>
              <p class="subtitle">Análisis individual y comparativa agregada con todos los participantes</p>
            </header>

            <!-- SECCIÓN 1: RESULTADOS DEL PARTICIPANTE ACTUAL -->
            <section class="results-section individual-results">
              <h3 class="section-title">Tu Rendimiento (${session.participantName})</h3>
              
              <div class="score-cards-grid">
                <div class="score-card primary-score">
                  <div class="score-card-label">Palabras Acertadas</div>
                  <div class="score-card-value">${session.score} <span class="score-total">/ ${totalWordsCount}</span></div>
                  <div class="score-card-footer">Precisión: <strong>${session.accuracy}%</strong></div>
                </div>

                <div class="score-card">
                  <div class="score-card-label">Palabras Omitidas</div>
                  <div class="score-card-value text-warning">${session.misses.length} <span class="score-total">/ ${totalWordsCount}</span></div>
                  <div class="score-card-footer">${session.misses.length === 0 ? '¡Recordaste todas!' : 'No recordadas'}</div>
                </div>

                <div class="score-card">
                  <div class="score-card-label">Tiempos Registrados</div>
                  <div class="time-metrics">
                    <div>Estudio: <strong>${session.studyTimeSeconds}s</strong></div>
                    <div>Recuerdo: <strong>${session.recallTimeSeconds}s</strong></div>
                  </div>
                </div>
              </div>

              <!-- Detalle de palabras evaluadas -->
              <div class="word-breakdown-card">
                <div class="breakdown-group">
                  <div class="breakdown-title text-success">✓ Aciertos (${session.hits.length}):</div>
                  <div class="tags-container">${renderChips(session.hits, 'tag-hit')}</div>
                </div>

                <div class="breakdown-group">
                  <div class="breakdown-title text-warning">✗ No recordadas (${session.misses.length}):</div>
                  <div class="tags-container">${renderChips(session.misses, 'tag-miss')}</div>
                </div>

                <div class="breakdown-group">
                  <div class="breakdown-title text-danger">⚠️ Palabras no presentes / extra (${session.falseAlarms.length}):</div>
                  <div class="tags-container">${renderChips(session.falseAlarms, 'tag-false-alarm')}</div>
                </div>
              </div>
            </section>

            <!-- SECCIÓN 2: COMPARATIVA GENERAL DE TODOS LOS PARTICIPANTES -->
            <section class="results-section global-comparison">
              <h3 class="section-title">Distribución General de Resultados</h3>
              <p class="section-desc">
                Comparativa de tu puntuación respecto a la distribución total de participantes evaluados.
              </p>

              <div class="global-kpi-summary">
                <div class="global-kpi-box">
                  <div class="kpi-number">${statistics.totalParticipants}</div>
                  <div class="kpi-label">Participantes Totales</div>
                </div>
                <div class="global-kpi-box">
                  <div class="kpi-number text-primary">${statistics.globalAvgScore}</div>
                  <div class="kpi-label">Media de Aciertos</div>
                </div>
                <div class="global-kpi-box">
                  <div class="kpi-number">${statistics.globalAvgAccuracy}%</div>
                  <div class="kpi-label">Precisión Media Global</div>
                </div>
              </div>

              <!-- GRÁFICO CIENTÍFICO DE PUNTOS (Dot Plot) -->
              <div id="dotPlotContainer" class="dot-plot-mount"></div>

              <!-- Comparativa individual frente a la media -->
              <div class="neutral-conclusion-card">
                <div class="conclusion-icon">📈</div>
                <div class="conclusion-text">
                  ${buildConclusion()}
                </div>
              </div>
            </section>

            <!-- SECCIÓN 3: TABLA DE HISTORIAL DE SESIONES -->
            <section class="results-section history-section">
              <div class="history-header">
                <h3 class="section-title">Historial de Pruebas Recopiladas</h3>
              </div>

              <div class="table-responsive">
                <table class="history-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Participante</th>
                      <th>Aciertos</th>
                      <th>Precisión</th>
                      <th>Tiempo</th>
                      <th>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${historyRows}
                  </tbody>
                </table>
              </div>
            </section>

            <!-- Botón para nuevo participante -->
            <div class="results-footer">
              <button type="button" id="btnNewSession" class="btn btn-primary btn-lg">
                <span>Realizar Nueva Prueba con Otro Participante</span>
                <span class="btn-arrow">↻</span>
              </button>
            </div>
          </div>
        `;

        // Renderizado del Gráfico Científico de Puntos (Dot Plot)
        const dotPlotMount = rootElement.querySelector('#dotPlotContainer');
        Presentation.DotPlotChart.render({
          container: dotPlotMount,
          sessions,
          currentSessionId: session.id,
          targetWordsCount: totalWordsCount,
          statistics
        });

        // Eventos de la pantalla de resultados
        rootElement.querySelector('#btnNewSession').onclick = events.onResetToWelcome;
      }
    }
  };

  Presentation.ScreenRegistry = ScreenRegistry;
})(window.SpatialApp.Presentation, window.SpatialApp.Domain);
