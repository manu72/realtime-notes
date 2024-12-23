// app.js - Main application logic and initialization
console.log('Initializing application module...');

// Import our utility modules
import { initUI, updateStatus, updateTranscription, updateSummary } from './ui.js';
import { initWebRTC, closeConnection } from './webrtc.js';
import { audioManager } from './audio.js';

class RealtimeNotes {
    constructor() {
        console.log('Creating RealtimeNotes instance');
        this.isRecording = false;
        this.connection = null;
        this.initialize();
    }

    async initialize() {
        try {
            console.log('Setting up application event handlers...');
            
            // Define our UI event handlers
            const uiHandlers = {
                onStart: async () => {
                    console.log('Start recording requested');
                    try {
                        await this.startRecording();
                    } catch (error) {
                        console.error('Recording start failed:', error);
                        updateStatus('Failed to start recording');
                    }
                },
                onStop: async () => {
                    console.log('Stop recording requested');
                    try {
                        await this.stopRecording();
                    } catch (error) {
                        console.error('Recording stop failed:', error);
                    }
                }
            };

            // Initialize the UI with our handlers
            await initUI(uiHandlers);
            console.log('UI initialization complete');

        } catch (error) {
            console.error('Application initialization failed:', error);
            updateStatus('Initialization failed');
        }
    }

    async startRecording() {
        console.log('Starting recording process...');
        updateStatus('Connecting...');

        try {
            // Initialize audio first
            await audioManager.initializeAudio();
            
            // Get session token
            const response = await fetch('/api/sessions', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to get session token');
            }

            const sessionData = await response.json();
            console.log('Session token acquired');

            // Initialize WebRTC connection
            this.connection = await initWebRTC(sessionData.client_secret.value, {
                onTranscript: (text) => updateTranscription(text),
                onSummary: (text) => updateSummary(text),
                onStatusChange: (status) => updateStatus(status)
            });

            this.isRecording = true;
            updateStatus('Connected');

        } catch (error) {
            this.isRecording = false;
            console.error('Failed to start recording:', error);
            updateStatus('Connection failed');
            throw error;
        }
    }

    async stopRecording() {
        if (!this.isRecording) return;

        console.log('Stopping recording...');
        updateStatus('Disconnecting...');

        try {
            await closeConnection();
            this.connection = null;
            this.isRecording = false;
            updateStatus('Disconnected');
        } catch (error) {
            console.error('Error stopping recording:', error);
            throw error;
        }
    }
}

// Create and export a singleton instance
export const app = new RealtimeNotes();