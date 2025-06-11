class UIManager {
    constructor(callbacks) {
        this.loginScreen = document.getElementById('login-screen');
        this.inGameUI = document.getElementById('in-game-ui');
        this.pauseMenu = document.getElementById('pause-menu');
        this.startButton = document.getElementById('start-button');
        this.continueButton = document.getElementById('continue-button');
        this.exitButton = document.getElementById('exit-button');
        this.levelElement = document.getElementById('level');
        this.speedElement = document.getElementById('speed');
        this.timeElement = document.getElementById('time');
        this.scoreElement = document.getElementById('score');

        this.isGamePaused = false;
        this.isGameStarted = false;

        this.callbacks = callbacks;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.continueButton.addEventListener('click', () => this.togglePauseMenu());
        this.exitButton.addEventListener('click', () => this.exitGame());

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isGameStarted) {
                this.togglePauseMenu();
            }
        });
    }

    showLoginScreen() {
        this.loginScreen.style.display = 'flex';
        this.inGameUI.style.display = 'none';
        this.pauseMenu.style.display = 'none';
    }

    showInGameUI() {
        this.loginScreen.style.display = 'none';
        this.inGameUI.style.display = 'block';
        this.pauseMenu.style.display = 'none';
    }

    showPauseMenu() {
        this.pauseMenu.style.display = 'flex';
    }

    hidePauseMenu() {
        this.pauseMenu.style.display = 'none';
    }

    togglePauseMenu() {
        this.isGamePaused = !this.isGamePaused;
        if (this.isGamePaused) {
            this.showPauseMenu();
        } else {
            this.hidePauseMenu();
            this.callbacks.onResumeGame?.();
        }
    }

    startGame() {
        this.isGameStarted = true;
        this.isGamePaused = false;
        this.showInGameUI();
        this.callbacks.onStartGame?.();
    }

    exitGame() {
        this.isGameStarted = false;
        this.isGamePaused = false;
        this.showLoginScreen();
        this.callbacks.onExitGame?.();
    }

    updateInGameUI(level, speed, time, score) {
        this.levelElement.textContent = `Level: ${level}`;
        this.speedElement.textContent = `Speed: ${speed.toFixed(2)}`;
        this.timeElement.textContent = `Time: ${time.toFixed(2)}s`;
        this.scoreElement.textContent = `Score: ${score}`;
    }
}

export default UIManager; 