// audio.js - Handles audio stream capture and processing
class AudioManager {
    constructor() {
        this.audioStream = null;
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioProcessor = null;
        this.gainNode = null;
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
                    sampleRate: 48000,
                    latency: 0.1,
                    volume: 1.0
                }
            });

            // Initialize Web Audio API context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 48000,
                latencyHint: 'interactive'
            });
            
            // Create audio processing pipeline
            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            
            // Add gain control
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 1.0;
            
            // Create audio processor for monitoring
            this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
            this.audioProcessor.onaudioprocess = this.handleAudioProcess.bind(this);
            
            // Connect the audio pipeline
            source.connect(this.gainNode);
            this.gainNode.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);
            
            // Quality check
            await this.checkAudioQuality();
            
            return this.audioStream;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            throw new Error('Failed to initialize audio: ' + error.message);
        }
    }

    async checkAudioQuality() {
        const track = this.audioStream.getAudioTracks()[0];
        const capabilities = track.getCapabilities();
        const settings = track.getSettings();
        
        console.log('Audio capabilities:', capabilities);
        console.log('Current settings:', settings);
        
        // Verify audio quality meets minimum requirements
        if (settings.sampleRate < 44100) {
            console.warn('Sample rate below recommended minimum');
        }
        
        if (settings.channelCount !== 1) {
            console.warn('Unexpected channel count:', settings.channelCount);
        }
        
        // Return audio quality metrics
        return {
            sampleRate: settings.sampleRate,
            channelCount: settings.channelCount,
            autoGainControl: settings.autoGainControl,
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            latency: settings.latency
        };
    }

    handleAudioProcess(event) {
        const input = event.inputBuffer.getChannelData(0);
        let sum = 0;
        
        // Calculate RMS volume
        for (let i = 0; i < input.length; i++) {
            sum += input[i] * input[i];
        }
        
        const rms = Math.sqrt(sum / input.length);
        const db = 20 * Math.log10(rms);
        
        // Emit audio level event if volume is above threshold
        if (db > -50) {
            const event = new CustomEvent('audio-level', { 
                detail: { 
                    db: db,
                    rms: rms 
                } 
            });
            window.dispatchEvent(event);
        }
    }

    setVolume(value) {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, value));
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
        
        if (this.audioProcessor) {
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }
        
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    isAudioActive() {
        return !!this.audioStream && this.audioStream.active;
    }

    getAudioMetrics() {
        if (!this.audioStream) return null;
        
        const track = this.audioStream.getAudioTracks()[0];
        return {
            ...track.getSettings(),
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
        };
    }
}

// Export a singleton instance
export const audioManager = new AudioManager();