/**
 * ==============================================================================
 * PRESENTACIÓN: CONTROLADOR DEL PANEL DE ADMINISTRACIÓN (adminApp.js)
 * ==============================================================================
 * Permite al investigador:
 * 1. Moderar falsas alarmas y vincularlas a palabras objetivo como sinónimos válidos.
 * 2. Administrar el diccionario de sinónimos aprobados.
 * 3. Recalcular automáticamente todas las sesiones y observar el impacto en tiempo real.
 */

window.SpatialApp = window.SpatialApp || {};

(function () {
  'use strict';

  const { Domain, UseCases, Infrastructure } = window.SpatialApp;

  class AdminApp {
    constructor() {
      this.rootElement = document.getElementById('adminApp');
      this.config = null;
      this.sessionRepo = null;
      this.synonymRepo = null;
      this.useCases = {};
    }

    init() {
      try {
        this.config = Infrastructure.ConfigValidator.validate(window.EXPERIMENT_CONFIG);
        const localRepo = new Infrastructure.LocalStorageSessionRepository();
        this.sheetsRepo = new Infrastructure.GoogleSheetsRepo(this.config.googleSheetsWebAppUrl);
        this.sessionRepo = new Infrastructure.CompositeRepo([localRepo, this.sheetsRepo]);
        this.synonymRepo = new Infrastructure.LocalStorageSynonymRepository();
        this.dismissedRepo = new Infrastructure.LocalStorageDismissedRepository();

        this.useCases = {
          evaluateRecall: new UseCases.EvaluateRecall(),
          getStatistics: new UseCases.GetStatistics(this.sessionRepo),
          reevaluateSessions: new UseCases.ReevaluateSessions(
            this.sessionRepo,
            this.synonymRepo,
            new UseCases.EvaluateRecall()
          )
        };

        // Reevaluación inicial con datos locales y renderizado inmediato
        this.useCases.reevaluateSessions.execute({ targetWords: this.config.words });
        this.render();

        // Sincronizar automáticamente desde Google Sheets (fuente de verdad)
        this.syncWithGoogleSheets();
      } catch (err) {
        this._renderError(err.message);
      }
    }

    async syncWithGoogleSheets() {
      const synced = await this.sessionRepo.syncFromCloud({
        defaultTargetWords: this.config.words,
        synonymRepo: this.synonymRepo,
        dismissedRepo: this.dismissedRepo
      });

      const refreshMap = {
        true: () => {
          this.useCases.reevaluateSessions.execute({ targetWords: this.config.words });
          this._pushAdminChangesToCloud();
          this.render();
        },
        false: () => {}
      };
      refreshMap[Boolean(synced)]();
    }

    _pushAdminChangesToCloud() {
      this.sheetsRepo.syncAdminState({
        sessions: this.sessionRepo.getAll(),
        synonyms: this.synonymRepo.getAll(),
        dismissed: this.dismissedRepo.getAll()
      });
    }

    _renderError(msg) {
      if (!this.rootElement) return;
      this.rootElement.innerHTML = `
        <div class="fatal-error-card">
          <div class="error-icon">⚠️</div>
          <h2>Error en Panel de Administración</h2>
          <p class="error-text">${msg}</p>
        </div>
      `;
    }

    render() {
      const sessions = this.sessionRepo.getAll();
      const synonymsDict = this.synonymRepo.getAll();
      const statistics = Domain.Statistics.calculate(sessions);

      // Extraer y agrupar palabras no reconocidas (falsas alarmas) entre todos los participantes
      const falseAlarmFrequency = new Map();
      sessions.forEach(session => {
        session.falseAlarms.forEach(word => {
          const norm = Domain.StringUtils.normalizeWord(word);
          const currentCount = falseAlarmFrequency.get(norm) || { word, count: 0, participants: [] };
          currentCount.count += 1;
          currentCount.participants.push(session.participantName);
          falseAlarmFrequency.set(norm, currentCount);
        });
      });

      const uniqueUnrecognized = Array.from(falseAlarmFrequency.values());

      // Separar entre pendientes de moderación y descartadas (intrusiones confirmadas)
      const pendingModeration = uniqueUnrecognized.filter(item => !this.dismissedRepo.has(item.word));
      const confirmedIntrusions = uniqueUnrecognized.filter(item => this.dismissedRepo.has(item.word));

      // Opciones para el desplegable de palabras objetivo
      const targetOptionsHtml = this.config.words
        .map(w => `<option value="${w}">${w}</option>`)
        .join('');

      // 1. Filas de la bandeja de moderación pendiente
      const moderationListHtml = pendingModeration.length === 0
        ? `<div class="empty-moderation-msg">✨ No hay palabras dudosas pendientes de moderar. Todas han sido aprobadas o descartadas.</div>`
        : pendingModeration
            .map(item => `
              <div class="moderation-item" data-word="${item.word}">
                <div class="moderation-word-info">
                  <span class="unrecognized-word">"${item.word}"</span>
                  <span class="word-freq-badge">${item.count} ${item.count === 1 ? 'mención' : 'menciones'}</span>
                  <span class="word-participants-sub">(${item.participants.slice(0, 3).join(', ')}${item.participants.length > 3 ? '...' : ''})</span>
                </div>
                <div class="moderation-actions-row">
                  <label class="select-label">Asociar como sinónimo de:</label>
                  <select class="target-select" id="select_${Domain.StringUtils.normalizeWord(item.word)}">
                    ${targetOptionsHtml}
                  </select>
                  <button type="button" class="btn btn-success btn-sm btn-approve" data-synonym="${item.word}">
                    ✓ Aprobar como Sinónimo
                  </button>
                  <button type="button" class="btn btn-outline btn-sm btn-dismiss" data-word="${item.word}" title="Descartar de la bandeja (conservar en datos crudos como falsa alarma)">
                    ✗ Descartar
                  </button>
                </div>
              </div>
            `)
            .join('');

      // 2. Filas de palabras descartadas (Intrusiones de memoria confirmadas)
      const intrusionsListHtml = confirmedIntrusions.length === 0
        ? `<div class="empty-moderation-msg">No hay palabras en la lista de descartadas.</div>`
        : confirmedIntrusions
            .map(item => `
              <div class="moderation-item intrusion-item" data-word="${item.word}">
                <div class="moderation-word-info">
                  <span class="intrusion-word">"${item.word}"</span>
                  <span class="word-freq-badge badge-intrusion">${item.count} ${item.count === 1 ? 'mención' : 'menciones'}</span>
                  <span class="word-participants-sub">(${item.participants.slice(0, 3).join(', ')}${item.participants.length > 3 ? '...' : ''})</span>
                </div>
                <div class="moderation-actions-row">
                  <span class="status-pill status-pill-discarded">Falsa Alarma Confirmada</span>
                  <button type="button" class="btn btn-outline btn-sm btn-restore-dismissed" data-word="${item.word}" title="Devolver a la bandeja de moderación">
                    ↩ Restaurar a Moderación
                  </button>
                </div>
              </div>
            `)
            .join('');

      // 2. Diccionario de sinónimos aprobados
      const synonymCardsHtml = this.config.words
        .map(targetWord => {
          const norm = Domain.StringUtils.normalizeWord(targetWord);
          const syns = synonymsDict[norm] || [];

          const chipsHtml = syns.length === 0
            ? `<span class="empty-chips">Sin variantes asignadas</span>`
            : syns
                .map(syn => `
                  <span class="synonym-chip">
                    <span>${syn}</span>
                    <button type="button" class="btn-remove-syn" data-target="${targetWord}" data-synonym="${syn}" title="Eliminar sinónimo">×</button>
                  </span>
                `)
                .join('');

          return `
            <div class="synonym-target-card">
              <div class="synonym-target-name">${targetWord}</div>
              <div class="synonym-chips-container">${chipsHtml}</div>
            </div>
          `;
        })
        .join('');

      // 3. Tabla de participantes recalculada
      const tableRowsHtml = sessions.length === 0
        ? `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #94a3b8;">No hay sesiones registradas.</td></tr>`
        : sessions
            .slice()
            .reverse()
            .map((s, idx) => `
              <tr>
                <td>#${sessions.length - idx}</td>
                <td><strong>${s.participantName}</strong></td>
                <td><span class="badge-mini ${Domain.GroupLabels[s.group].badgeClass}">${Domain.GroupLabels[s.group].shortName}</span></td>
                <td><strong>${s.score}</strong> / ${s.targetWords.length}</td>
                <td>${s.accuracy}%</td>
                <td>
                  <span class="text-success">${s.hits.length} aciertos</span> | 
                  <span class="text-danger">${s.falseAlarms.length} falsas alarmas</span>
                </td>
                <td>${new Date(s.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            `)
            .join('');

      const spatialStats = statistics.groups[Domain.GroupType.SPATIAL];
      const listStats = statistics.groups[Domain.GroupType.LIST];

      this.rootElement.innerHTML = `
        <div class="admin-dashboard">
          <!-- Banner de estadísticas resumidas -->
          <div class="admin-kpi-row">
            <div class="admin-kpi-card">
              <div class="admin-kpi-title">Total Participantes</div>
              <div class="admin-kpi-val">${statistics.totalParticipants}</div>
            </div>
            <div class="admin-kpi-card">
              <div class="admin-kpi-title">Media Grupo Espacial</div>
              <div class="admin-kpi-val text-spatial">${spatialStats.avgScore} <span class="kpi-sub">palabras</span></div>
            </div>
            <div class="admin-kpi-card">
              <div class="admin-kpi-title">Media Grupo Control</div>
              <div class="admin-kpi-val text-control">${listStats.avgScore} <span class="kpi-sub">palabras</span></div>
            </div>
            <div class="admin-kpi-card">
              <div class="admin-kpi-title">Sinónimos Aprobados</div>
              <div class="admin-kpi-val text-primary">${Object.values(synonymsDict).reduce((acc, arr) => acc + arr.length, 0)}</div>
            </div>
          </div>

          <!-- SECCIÓN 1: BANDEJA DE MODERACIÓN DE FALSAS ALARMAS -->
          <section class="admin-section">
            <div class="admin-section-header">
              <div>
                <h3 class="admin-section-title">🔍 Bandeja de Moderación de Respuestas no Reconocidas</h3>
                <p class="admin-section-desc">
                  Aquí aparecen las palabras ingresadas por participantes que el sistema marcó como "falsa alarma". 
                  Si consideras que corresponden a una palabra del experimento (ej: "zapatilla" → "zapato"), apruébalas para convertirlas en aciertos.
                </p>
              </div>
            </div>
            <div class="moderation-box">
              ${moderationListHtml}
            </div>
          </section>

          <!-- SECCIÓN 2: INTRUSIONES DE MEMORIA CONFIRMADAS (Descartadas) -->
          <section class="admin-section">
            <div class="admin-section-header">
              <div>
                <h3 class="admin-section-title">🚫 Intrusiones de Memoria Confirmadas (Falsas Alarmas Reales)</h3>
                <p class="admin-section-desc">
                  Estas palabras fueron escritas por los participantes pero se descartaron como sinónimos (falsas alarmas reales o recuerdos ilusorios).
                  Permanecen registradas intactas en los datos crudos de las sesiones. Puedes devolverlas a moderación en cualquier momento.
                </p>
              </div>
            </div>
            <div class="moderation-box">
              ${intrusionsListHtml}
            </div>
          </section>

          <!-- SECCIÓN 3: DICCIONARIO DE SINÓNIMOS APROBADOS -->
          <section class="admin-section">
            <div class="admin-section-header">
              <div>
                <h3 class="admin-section-title">📚 Diccionario de Sinónimos y Variantes Activas</h3>
                <p class="admin-section-desc">
                  Toda palabra listada aquí será automáticamente contabilizada como un acierto válido para su respectiva palabra objetivo.
                </p>
              </div>
            </div>

            <!-- Formulario manual para agregar sinónimos -->
            <form id="formManualSynonym" class="manual-synonym-form" autocomplete="off">
              <div class="form-row-inline">
                <select id="manualTargetWord" class="target-select" required>
                  ${targetOptionsHtml}
                </select>
                <input 
                  type="text" 
                  id="manualSynonymInput" 
                  placeholder="Nueva variante o sinónimo (ej: zapatilla)..." 
                  required
                />
                <button type="submit" class="btn btn-primary btn-sm">Añadir Sinónimo</button>
              </div>
              <span id="manualFeedback" class="word-feedback-msg hidden"></span>
            </form>

            <div class="synonyms-grid">
              ${synonymCardsHtml}
            </div>
          </section>

          <!-- SECCIÓN 4: TABLA EN TIEMPO REAL DE PARTICIPANTES -->
          <section class="admin-section">
            <div class="admin-section-header">
              <div>
                <h3 class="admin-section-title">📋 Pruebas Registradas (Sincronizadas con Google Sheets)</h3>
                <p class="admin-section-desc">Puntuaciones actualizadas de acuerdo con tu planilla de Google Sheets y los sinónimos actuales.</p>
              </div>
              <div class="export-buttons">
                <button type="button" id="btnAdminSyncSheets" class="btn btn-outline btn-sm">
                  🔄 Sincronizar con Google Sheets
                </button>
                <button type="button" id="btnAdminClearHistory" class="btn btn-danger-outline btn-sm">
                  🗑️ Borrar Caché Local
                </button>
              </div>
            </div>

            <div class="table-responsive">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Participante</th>
                    <th>Grupo</th>
                    <th>Puntuación</th>
                    <th>Precisión</th>
                    <th>Desglose</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      `;

      this._attachEvents();
    }

    _attachEvents() {
      // 1. Aprobar sinónimo desde la bandeja de moderación
      this.rootElement.querySelectorAll('.btn-approve').forEach(btn => {
        btn.onclick = () => {
          const synonymWord = btn.getAttribute('data-synonym');
          const normSyn = Domain.StringUtils.normalizeWord(synonymWord);
          const selectEl = this.rootElement.querySelector(`#select_${normSyn}`);
          const targetWord = selectEl ? selectEl.value : null;

          const actionMap = {
            true: () => {
              this.synonymRepo.addSynonym(targetWord, synonymWord);
              this.useCases.reevaluateSessions.execute({ targetWords: this.config.words });
              this._pushAdminChangesToCloud();
              this.render();
            },
            false: () => {}
          };

          actionMap[Boolean(targetWord && synonymWord)]();
        };
      });

      // 2. Descartar palabra de la bandeja de moderación (confirmar como falsa alarma)
      this.rootElement.querySelectorAll('.btn-dismiss').forEach(btn => {
        btn.onclick = () => {
          const word = btn.getAttribute('data-word');
          this.dismissedRepo.dismiss(word);
          this._pushAdminChangesToCloud();
          this.render();
        };
      });

      // 3. Restaurar palabra descartada a la bandeja de moderación
      this.rootElement.querySelectorAll('.btn-restore-dismissed').forEach(btn => {
        btn.onclick = () => {
          const word = btn.getAttribute('data-word');
          this.dismissedRepo.restore(word);
          this._pushAdminChangesToCloud();
          this.render();
        };
      });

      // 4. Eliminar sinónimo existente
      this.rootElement.querySelectorAll('.btn-remove-syn').forEach(btn => {
        btn.onclick = () => {
          const targetWord = btn.getAttribute('data-target');
          const synonymWord = btn.getAttribute('data-synonym');

          this.synonymRepo.removeSynonym(targetWord, synonymWord);
          this.useCases.reevaluateSessions.execute({ targetWords: this.config.words });
          this._pushAdminChangesToCloud();
          this.render();
        };
      });

      // 5. Agregar sinónimo manualmente
      const manualForm = this.rootElement.querySelector('#formManualSynonym');
      if (manualForm) {
        manualForm.onsubmit = (e) => {
          e.preventDefault();
          const targetEl = this.rootElement.querySelector('#manualTargetWord');
          const inputEl = this.rootElement.querySelector('#manualSynonymInput');
          const feedbackEl = this.rootElement.querySelector('#manualFeedback');

          const targetWord = targetEl.value;
          const newSynonym = inputEl.value.trim();

          const validateAction = {
            true: () => {
              this.synonymRepo.addSynonym(targetWord, newSynonym);
              this.useCases.reevaluateSessions.execute({ targetWords: this.config.words });
              this._pushAdminChangesToCloud();
              this.render();
            },
            false: () => {
              feedbackEl.textContent = 'Por favor ingresa una palabra válida.';
              feedbackEl.className = 'word-feedback-msg feedback-error';
              feedbackEl.classList.remove('hidden');
            }
          };

          validateAction[newSynonym.length > 0]();
        };
      }

      // 6. Sincronizar manualmente desde Google Sheets
      const btnSync = this.rootElement.querySelector('#btnAdminSyncSheets');
      if (btnSync) {
        btnSync.onclick = async () => {
          btnSync.textContent = '⏳ Sincronizando...';
          btnSync.disabled = true;
          await this.syncWithGoogleSheets();
        };
      }

      // 7. Borrar historial de pruebas locales desde el panel de administrador
      const btnClear = this.rootElement.querySelector('#btnAdminClearHistory');
      if (btnClear) {
        btnClear.onclick = () => {
          const confirmClear = window.confirm(
            '¿Estás seguro de que deseas borrar la caché local de este navegador? Si aún tienes filas en Google Sheets, vuelve a hacer clic en "Sincronizar con Google Sheets" para traerlas.'
          );

          const clearActionMap = {
            true: () => {
              this.sessionRepo.clear();
              this.dismissedRepo.clear();
              this.render();
            },
            false: () => {}
          };

          clearActionMap[confirmClear]();
        };
      }
    }
  }

  // Inicializar al cargar
  document.addEventListener('DOMContentLoaded', () => {
    const adminApp = new AdminApp();
    adminApp.init();
  });
})();
