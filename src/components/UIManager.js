class UIManager {
    constructor(callbacks) {
        this.loginScreen = document.getElementById('login-screen');
        this.inGameUI = document.getElementById('in-game-ui');
        this.pauseMenu = document.getElementById('pause-menu');
        this.winningScreen = document.getElementById('winning-screen');
        this.losingScreen = document.getElementById('losing-screen');
        this.howToPlayModal = document.getElementById('how-to-play-modal');
        this.settingsModal = document.getElementById('settings-modal');

        this.startButton = document.getElementById('start-button');
        this.howToPlayButton = document.getElementById('how-to-play-button');
        this.settingsButton = document.getElementById('settings-button');
        this.closeHowToPlayButton = document.getElementById('close-how-to-play-button');
        this.closeSettingsButton = document.getElementById('close-settings-button');
        this.applySettingsButton = document.getElementById('apply-settings-button');
        this.continueButton = document.getElementById('continue-button');
        this.exitButton = document.getElementById('exit-button');
        this.toggleMusicButton = document.getElementById('toggle-music-button');
        this.playAgainButton = document.getElementById('play-again-button');
        this.retryButton = document.getElementById('retry-button');

        this.levelElement = document.getElementById('level');
        this.timeElement = document.getElementById('time');
        this.healthBarElement = document.getElementById('health-bar');
        this.healthTextElement = document.getElementById('health-text');
        
        // Performance radio buttons
        this.performanceRadios = document.querySelectorAll('input[name="performance"]');
        
        // Final stats elements
        this.finalHealthElement = document.getElementById('final-health');
        this.finalScoreElement = document.getElementById('final-score');
        this.finalScoreLoseElement = document.getElementById('final-score-lose');

        this.isGamePaused = false;
        this.isGameStarted = false;
        this.currentLevel = 0; // Store current level

        this.callbacks = callbacks;

        this.setupEventListeners();
        this.initPerformanceSettings();
    }

    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.howToPlayButton.addEventListener('click', () => this.showHowToPlayModal());
        this.settingsButton.addEventListener('click', () => this.showSettingsModal());
        this.closeHowToPlayButton.addEventListener('click', () => this.hideHowToPlayModal());
        this.closeSettingsButton.addEventListener('click', () => this.hideSettingsModal());
        this.applySettingsButton.addEventListener('click', () => this.applySettings());
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
        this.howToPlayModal.style.display = 'none';
    }

    showInGameUI() {
        this.loginScreen.style.display = 'none';
        this.inGameUI.style.display = 'block';
        this.pauseMenu.style.display = 'none';
        this.winningScreen.style.display = 'none';
        this.losingScreen.style.display = 'none';
        this.howToPlayModal.style.display = 'none';
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
            // this.finalScoreElement.textContent = stats.score;
        }

        document.exitPointerLock();
    }

    showLosingScreen(stats) {
        this.isGamePaused = true;
        this.inGameUI.style.display = 'none';
        this.losingScreen.style.display = 'flex';
        
        if (stats) {
            this.finalScoreLoseElement.textContent = stats.score;
        }
        
        document.exitPointerLock();
    }

    updateInGameUI(data) {
        if (data.level !== undefined) {
            if (data.level > this.currentLevel) {
                this.levelElement.classList.add('level-up-animation');
                // Remove the class after the animation completes
                setTimeout(() => {
                    this.levelElement.classList.remove('level-up-animation');
                }, 500); // Duration of the animation in ms
            }
            this.currentLevel = data.level;
            this.levelElement.textContent = `Level: ${data.level}`;
        }
        if (data.time !== undefined) {
            this.timeElement.textContent = `Time: ${data.time.toFixed(2)}s`;
        }
        if (data.health !== undefined) {
            this.healthBarElement.style.width = `${data.health}%`;
            this.healthTextElement.textContent = data.health;
        }
    }

    showHowToPlayModal() {
        this.howToPlayModal.style.display = 'flex';
    }

    hideHowToPlayModal() {
        this.howToPlayModal.style.display = 'none';
    }

    initPerformanceSettings() {
        // Import performanceConfig và set radio button hiện tại
        import('./PerformanceConfig.js').then(({ performanceConfig }) => {
            const currentLevel = performanceConfig.performanceLevel;
            const radio = document.getElementById(`performance-${currentLevel}`);
            if (radio) {
                radio.checked = true;
            }
        });
    }

    showSettingsModal() {
        this.settingsModal.classList.remove('hidden');
    }

    hideSettingsModal() {
        this.settingsModal.classList.add('hidden');
    }

    applySettings() {
        const selectedPerformance = document.querySelector('input[name="performance"]:checked');
        if (selectedPerformance) {
            import('./PerformanceConfig.js').then(({ performanceConfig }) => {
                const success = performanceConfig.setPerformanceLevel(selectedPerformance.value);
                if (success) {
                    console.log(`Performance level changed to: ${selectedPerformance.value}`);
                    // Có thể thêm notification cho user
                }
            });
        }
        this.hideSettingsModal();
    }
}

export default UIManager;