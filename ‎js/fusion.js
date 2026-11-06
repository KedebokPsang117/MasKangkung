/**
 * fusion.js - Kelingking Anchor & Mode Fusi
 * Pinky bend = tension, Pinky-Thumb touch = fusion
 */

const FusionSystem = {
    // State
    currentMode: 'normal',  // 'normal', 'tension', 'fusion'
    fusionActive: false,
    tensionActive: false,
    
    // Timing
    fusionTriggerTime: 0,
    FUSION_TRIGGER_DELAY: 200, // ms - harus aktif <200ms
    
    // Visual
    pulseIntensity: 0,
    pulsePhase: 0,
    
    init() {
        // Nothing to init, state only
    },
    
    update(handTracker, block, threads, deltaTime) {
        if (!handTracker.isHandDetected) {
            this.deactivate();
            return;
        }
        
        const wasFusion = this.fusionActive;
        const wasTension = this.tensionActive;
        
        // Check fusion mode (pinky-thumb touch)
        if (handTracker.isFusionMode()) {
            if (!this.fusionActive) {
                this.fusionTriggerTime = Date.now();
            }
            
            // Fusion aktif jika sudah >200ms (untuk debounce)
            if (Date.now() - this.fusionTriggerTime >= this.FUSION_TRIGGER_DELAY) {
                this.activateFusion(block, threads);
            }
        } else {
            if (this.fusionActive) {
                this.deactivateFusion(block);
            }
            this.fusionTriggerTime = 0;
        }
        
        // Check tension mode (pinky bend) - hanya jika tidak fusion
        if (!this.fusionActive && handTracker.isTensionMode()) {
            this.activateTension(block, threads);
        } else if (!handTracker.isTensionMode()) {
            this.deactivateTension(block, threads);
        }
        
        // Update pulse animation
        if (this.fusionActive) {
            this.pulsePhase += deltaTime * 5;
            this.pulseIntensity = 0.5 + 0.5 * Math.sin(this.pulsePhase);
        } else {
            this.pulseIntensity = 0;
        }
        
        // Update mode indicator
        this.updateModeIndicator();
    },
    
    activateFusion(block, threads) {
        if (this.fusionActive) return;
        
        this.fusionActive = true;
        this.currentMode = 'fusion';
        
        // Lock ukuran balok
        // Balok follow kelingking saja
        threads.setFusionMode(true);
        
        // Haptic feedback (jika supported)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    },
    
    deactivateFusion(block) {
        if (!this.fusionActive) return;
        
        this.fusionActive = false;
        this.currentMode = 'normal';
        
        // Balok mulai mengambang
        block.startFloat();
        
        DimensionalThreads.setFusionMode(false);
    },
    
    activateTension(block, threads) {
        if (this.tensionActive) return;
        
        this.tensionActive = true;
        this.currentMode = 'tension';
        
        // Semua benang mengencang, balok mengecil dan solid
        if (block.mesh) {
            block.mesh.material.opacity = 0.6; // Lebih solid
        }
    },
    
    deactivateTension(block, threads) {
        if (!this.tensionActive) return;
        
        this.tensionActive = false;
        if (!this.fusionActive) {
            this.currentMode = 'normal';
        }
        
        // Kembali normal
        if (block.mesh) {
            block.mesh.material.opacity = 0.3;
        }
    },
    
    deactivate() {
        this.fusionActive = false;
        this.tensionActive = false;
        this.currentMode = 'normal';
    },
    
    updateModeIndicator() {
        const indicator = document.getElementById('mode-indicator');
        if (!indicator) return;
        
        switch (this.currentMode) {
            case 'fusion':
                indicator.textContent = 'Mode: FUSI ✨';
                indicator.style.color = '#ffd700';
                break;
            case 'tension':
                indicator.textContent = 'Mode: TENSION';
                indicator.style.color = '#ff6600';
                break;
            default:
                indicator.textContent = 'Mode: Normal';
                indicator.style.color = '#00d4ff';
        }
    },
    
    getMode() {
        return this.currentMode;
    }
};
