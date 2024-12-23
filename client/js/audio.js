// audio.js - Handles audio stream capture and processing
class AudioManager {
    constructor() {
        this.audioStream = null;
        this.audioContext = null;
        this.mediaRecorder = null;
    }

    async initializeAudio() {
        try {
            // Request access to the microphone with specific constraints for better audio quality
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
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            return this.audioStream;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            throw new Error('Failed to initialize audio: ' + error.message);
        }
    }

    async startAudioCapture() {
        if (!this.audioStream) {
            await this.initializeAudio();
        }
        return this.audioStream;
    }

    stopAudioCapture() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    isAudioActive() {
        return !!this.audioStream && this.audioStream.active;
    }
}

// Export a singleton instance
export const audioManager = new AudioManager();