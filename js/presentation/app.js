/**
 * ==============================================================================
 * PRESENTACIÓN: COMPOSITION ROOT Y CONTROLADOR PRINCIPAL (app.js)
 * ==============================================================================
 * Orquesta los casos de uso, repositorios, ciclo de vida de pantallas y estado.
 */

window.SpatialApp = window.SpatialApp || {};

(function () {
  'use strict';

  const { Domain, UseCases, Infrastructure, Presentation } = window.SpatialApp;

  class App {
    constructor() {
      this.rootElement = document.getElementById('app');
      this.config = null;
      this.repository = null;
      this.useCases = {};
      this.appState = {
        config: null,
        currentScreen: Domain.ScreenId.WELCOME,
        currentSession: null,
        lastCompletedSession: null,
        statsReport: null
      };
    }

    /**
     * Inicialización temprana Fail-Fast
     */
    init() {
      try {
        // 1. Validar configuración tempranamente
        this.config = Infrastructure.ConfigValidator.validate(window.EXPERIMENT_CONFIG);
        this.appState.config = this.config;

        // 2. Instanciar Repositorios e Inyectar Dependencias
        const localRepo = new Infrastructure.LocalStorageSessionRepository();
        const sheetsRepo = new Infrastructure.GoogleSheetsRepo(this.config.googleSheetsWebAppUrl);
        
        // CompositeRepo guardará en local (para el historial admin) y en Google Sheets
        this.repository = new Infrastructure.CompositeRepo([localRepo, sheetsRepo]);
        this.synonymRepository = new Infrastructure.LocalStorageSynonymRepository();

        this.useCases = {
          startSession: new UseCases.StartSession(),
          evaluateRecall: new UseCases.EvaluateRecall(),
          saveSession: new UseCases.SaveSession(this.repository),
          getStatistics: new UseCases.GetStatistics(this.repository),
          reevaluateSessions: new UseCases.ReevaluateSessions(
            this.repository,
            this.synonymRepository,
            new UseCases.EvaluateRecall()
          )
        };

        // Recalcular sesiones al arranque con los sinónimos vigentes
        this.useCases.reevaluateSessions.execute({ targetWords: this.config.words });

        // 3. Renderizar pantalla inicial
        this.navigateTo(Domain.ScreenId.WELCOME);
      } catch (err) {
        this._renderFatalError(err.message);
      }
    }

    /**
     * Renderizador de errores fatales en caso de fallo temprano (Fail-Fast)
     */
    _renderFatalError(errorMessage) {
      if (!this.rootElement) return;
      this.rootElement.innerHTML = `
        <div class="fatal-error-card">
          <div class="error-icon">⚠️</div>
          <h2>Error de Inicialización (Fail-Fast)</h2>
          <p class="error-text">${errorMessage}</p>
          <div class="error-hint">
            Por favor, revisa el archivo <code>config.js</code> y verifica que las variables y valores sean correctos.
          </div>
        </div>
      `;
    }

    /**
     * Transición entre pantallas mediante diccionario (sin cadenas if-else)
     */
    navigateTo(screenId) {
      const screen = Presentation.ScreenRegistry[screenId];
      if (!screen) {
        throw new Error(`[App Fail-Fast]: La pantalla "${screenId}" no está registrada.`);
      }

      this.appState.currentScreen = screenId;

      // Eventos pasados a las vistas
      const events = {
        onStartSession: (participantName) => this._handleStartSession(participantName),
        onStimulusCompleted: (data) => this._handleStimulusCompleted(data),
        onDistractorCompleted: () => this._handleDistractorCompleted(),
        onRecallSubmitted: (data) => this._handleRecallSubmitted(data),
        onResetToWelcome: () => this._handleResetToWelcome()
      };

      screen.render({
        rootElement: this.rootElement,
        appState: this.appState,
        events
      });

      // Asegurar scroll al inicio
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    _handleStartSession(participantName) {
      const sessionData = this.useCases.startSession.execute({
        participantName,
        targetWords: this.config.words
      });

      this.appState.currentSession = {
        ...sessionData,
        studyStartTime: Date.now()
      };

      this.navigateTo(Domain.ScreenId.STIMULUS);
    }

    _handleStimulusCompleted({ studyTimeSeconds }) {
      this.appState.currentSession.studyTimeSeconds = studyTimeSeconds;
      this.navigateTo(Domain.ScreenId.DISTRACTOR);
    }

    _handleDistractorCompleted() {
      this.navigateTo(Domain.ScreenId.RECALL);
    }

    _handleRecallSubmitted({ submittedWords, recallTimeSeconds }) {
      const current = this.appState.currentSession;

      // 1. Evaluar aciertos y fallos considerando sinónimos aprobados
      const synonymMap = this.synonymRepository.getMapping(current.targetWords);
      const evaluation = this.useCases.evaluateRecall.execute({
        targetWords: current.targetWords,
        submittedWords,
        synonymMap
      });

      // 2. Guardar sesión
      const savedSession = this.useCases.saveSession.execute({
        participantName: current.participantName,
        group: current.group,
        targetWords: current.targetWords,
        submittedWords,
        hits: evaluation.hits,
        misses: evaluation.misses,
        falseAlarms: evaluation.falseAlarms,
        score: evaluation.score,
        accuracy: evaluation.accuracy,
        studyTimeSeconds: current.studyTimeSeconds || 0,
        recallTimeSeconds: recallTimeSeconds || 0
      });

      // 3. Obtener reporte estadístico actualizado
      const statsReport = this.useCases.getStatistics.execute();

      this.appState.lastCompletedSession = savedSession;
      this.appState.statsReport = statsReport;

      // 4. Mostrar pantalla final
      this.navigateTo(Domain.ScreenId.RESULTS);
    }

    _handleResetToWelcome() {
      this.appState.currentSession = null;
      this.navigateTo(Domain.ScreenId.WELCOME);
    }


  }

  // Arranque al cargar el DOM
  document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
  });
})();
