// app.js - Main application logic and initialization
import { initUI, updateStatus, updateTranscription, updateSummary } from './ui.js';
import { initWebRTC, closeConnection } from './webrtc.js';

class RealtimeNotes {
    constructor() {
        this.isRecording = false;
        this.connection = null;
        this.initializeApp();
    }

    async initializeApp() {
        // Initialize UI and attach event listeners
        initUI({
            onStart: () => this.startRecording(),
            onStop: () => this.stopRecording()
        });

        // Handle page unload to clean up resources
        window.addEventListener('beforeunload', () => {
            if (this.connection) {
                closeConnection();
            }
        });
    }

    async startRecording() {
        try {
            // Request an ephemeral token from our server
            const response = await fetch('/api/sessions', {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to get session token');
            }

            const sessionData = await response.json();
            
            // Initialize WebRTC connection with the token
            this.connection = await initWebRTC(sessionData.client_secret.value, {
                onTranscript: (text) => updateTranscription(text),
                onSummary: (text) => updateSummary(text),
                onStatusChange: (status) => updateStatus(status)
            });

            this.isRecording = true;
            updateStatus('Connected');

        } catch (error) {
            console.error('Failed to start recording:', error);
            updateStatus(`Error: ${error.message}`);
        }
    }

    async stopRecording() {
        if (this.connection) {
            await closeConnection();
            this.connection = null;
        }
        this.isRecording = false;
        updateStatus('Disconnected');
    }
}

// Initialize the application
window.app = new RealtimeNotes();