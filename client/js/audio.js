/**
 * Manages audio capture and processing for the application
 */
class AudioManager {
    constructor() {
        this.audioStream = null;
        this.audioContext = null;
    }

    /**
     * Initialize audio capture with optimal settings for speech recognition
     */
    async initializeAudio() {
        try {
            // Request microphone access with specific constraints for speech
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 48000
                }
            });

            // Initialize Web Audio API context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 48000,
                latencyHint: 'interactive'
            });

            return this.audioStream;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            throw new Error('Failed to initialize audio: ' + error.message);
        }
    }

    /**
     * Start or resume audio capture
     */
    async startAudioCapture() {
        if (!this.audioStream) {
            await this.initializeAudio();
        }
        
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        return this.audioStream;
    }

    /**
     * Stop audio capture and clean up resources
     */
    async stopAudioCapture() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }
    }

    /**
     * Check if audio capture is currently active
     */
    isAudioActive() {
        return !!this.audioStream && 
               this.audioStream.active && 
               this.audioStream.getAudioTracks().some(track => track.enabled);
    }

    /**
     * Get current audio settings and status
     */
    getAudioStatus() {
        if (!this.audioStream) return { active: false };

        const track = this.audioStream.getAudioTracks()[0];
        return {
            active: this.isAudioActive(),
            settings: track?.getSettings(),
            contextState: this.audioContext?.state
        };
    }
}

// Export a singleton instance
export const audioManager = new AudioManager();