// ui.js - User interface management and updates
let startButton;
let stopButton;
let transcriptionBox;
let summaryBox;
let connectionStatus;
let audioStatus;

export function initUI(handlers) {
    // Get DOM elements
    startButton = document.getElementById('startButton');
    stopButton = document.getElementById('stopButton');
    transcriptionBox = document.getElementById('liveTranscription');
    summaryBox = document.getElementById('summaryContent');
    connectionStatus = document.getElementById('connectionStatus');
    audioStatus = document.getElementById('audioStatus');

    // Attach event listeners
    startButton.addEventListener('click', () => {
        startButton.disabled = true;
        stopButton.disabled = false;
        handlers.onStart();
    });

    stopButton.addEventListener('click', () => {
        startButton.disabled = false;
        stopButton.disabled = true;
        handlers.onStop();
    });
}

export function updateTranscription(text) {
    if (!transcriptionBox) return;
    
    // Create a new paragraph for the transcription
    const p = document.createElement('p');
    p.textContent = text;
    
    // Add the new transcription
    transcriptionBox.appendChild(p);
    
    // Scroll to the bottom
    transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
}

export function updateSummary(text) {
    if (!summaryBox) return;
    summaryBox.textContent = text;
}

export function updateStatus(status) {
    if (!connectionStatus) return;
    
    connectionStatus.textContent = status;
    connectionStatus.className = status.toLowerCase() === 'connected' 
        ? 'connected' 
        : 'disconnected';
    
    if (status === 'Connected') {
        audioStatus.textContent = 'Microphone: Active';
    } else {
        audioStatus.textContent = 'Microphone: Off';
    }
}