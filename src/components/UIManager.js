class UIManager {
    constructor(callbacks) {
        this.loginScreen = document.getElementById('login-screen');
        this.inGameUI = document.getElementById('in-game-ui');
        this.pauseMenu = document.getElementById('pause-menu');
        this.winningScreen = document.getElementById('winning-screen');
        this.losingScreen = document.getElementById('losing-screen');

        this.startButton = document.getElementById('start-button');
        this.continueButton = document.getElementById('continue-button');
        this.exitButton = document.getElementById('exit-button');
        this.toggleMusicButton = document.getElementById('toggle-music-button');
        this.playAgainButton = document.getElementById('play-again-button');
        this.retryButton = document.getElementById('retry-button');

        this.levelElement = document.getElementById('level');
        this.timeElement = document.getElementById('time');
        this.healthBarElement = document.getElementById('health-bar');
        this.healthTextElement = document.getElementById('health-text');
        
        // Final stats elements
        this.finalHealthElement = document.getElementById('final-health');

        this.isGamePaused = false;
        this.isGameStarted = false;

        this.callbacks = callbacks;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.continueButton.addEventListener('click', () => this.togglePauseMenu());
        this.exitButton.addEventListener('click', () => this.exitGame());
        this.playAgainButton.addEventListener('click', () => this.startGame());
        this.retryButton.addEventListener('click', () => this.startGame());
        this.toggleMusicButton.addEventListener('click', () => this.toggleMusic());

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
        this.winningScreen.style.display = 'none';
        this.losingScreen.style.display = 'none';
    }

    showInGameUI() {
        this.loginScreen.style.display = 'none';
        this.inGameUI.style.display = 'block';
        this.pauseMenu.style.display = 'none';
        this.winningScreen.style.display = 'none';
        this.losingScreen.style.display = 'none';
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
            // Update button text when menu is shown
            this.updateToggleMusicButtonText(); 
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
        // Reset music button text when exiting
        this.updateToggleMusicButtonText(true); 
    }

    // New method to toggle music
    toggleMusic() {
        this.callbacks.onToggleMusic?.();
        this.updateToggleMusicButtonText();
    }

    // New method to update button text
    updateToggleMusicButtonText(forceMutedText = false) {
        if (this.callbacks.isMusicPlaying && !forceMutedText && this.callbacks.isMusicPlaying()) {
            this.toggleMusicButton.textContent = 'Mute Music';
        } else {
            this.toggleMusicButton.textContent = 'Unmute Music';
        }
    }

    showWinningScreen(stats) {
        this.isGamePaused = true;
        this.inGameUI.style.display = 'none';
        this.winningScreen.style.display = 'flex';
        
        if (stats) {
            this.finalHealthElement.textContent = stats.health;
        }

        document.exitPointerLock();
    }

    showLosingScreen() {
        this.isGamePaused = true;
        this.inGameUI.style.display = 'none';
        this.losingScreen.style.display = 'flex';
        document.exitPointerLock();
    }

    updateInGameUI(data) {
        this.levelElement.textContent = `Level: ${data.level}`;
        this.timeElement.textContent = `Time: ${data.time.toFixed(2)}s`;
        this.healthBarElement.style.width = `${data.health}%`;
        this.healthTextElement.textContent = data.health;
    }
}

export default UIManager;