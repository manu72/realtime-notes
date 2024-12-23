// ui.js - User interface management and updates
let startButton;
let stopButton;
let transcriptionBox;
let summaryBox;
let connectionStatus;
let audioStatus;

// Keep track of the current partial transcription
let currentPartialTranscription = null;

export function initUI(handlers) {
    console.log('Initializing UI components...');
    
    // Initialize UI elements
    startButton = document.getElementById('startButton');
    stopButton = document.getElementById('stopButton');
    transcriptionBox = document.getElementById('liveTranscription');
    summaryBox = document.getElementById('summaryContent');
    connectionStatus = document.getElementById('connectionStatus');
    audioStatus = document.getElementById('audioStatus');

    // Validate all UI elements are present
    if (!validateUIElements()) {
        throw new Error('Missing UI elements');
    }

    // Set up event listeners
    setupEventListeners(handlers);
    
    // Set initial states
    updateStatus('Disconnected');
    clearDisplays();
}

function validateUIElements() {
    const elements = {
        startButton,
        stopButton,
        transcriptionBox,
        summaryBox,
        connectionStatus,
        audioStatus
    };
    
    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Missing UI element: ${name}`);
            return false;
        }
    }
    
    return true;
}

function setupEventListeners(handlers) {
    startButton.addEventListener('click', async (event) => {
        event.preventDefault();
        startButton.disabled = true;
        stopButton.disabled = false;
        clearDisplays(); // Clear previous content when starting new recording
        
        try {
            await handlers.onStart();
        } catch (error) {
            console.error('Start recording failed:', error);
            startButton.disabled = false;
            stopButton.disabled = true;
            updateStatus('Failed to start');
        }
    });

    stopButton.addEventListener('click', async (event) => {
        event.preventDefault();
        stopButton.disabled = true;
        
        try {
            await handlers.onStop();
        } catch (error) {
            console.error('Stop recording failed:', error);
        } finally {
            startButton.disabled = false;
            finalizeTranscription(); // Ensure any partial transcription is finalized
        }
    });
}

export function updateTranscription(transcriptData) {
    if (!transcriptionBox) return;
    
    const { text, isPartial, timestamp } = transcriptData;
    
    if (isPartial) {
        // Handle partial transcription updates
        if (currentPartialTranscription) {
            // Update existing partial transcription
            currentPartialTranscription.textContent = text;
        } else {
            // Create new partial transcription element
            const partialElement = document.createElement('p');
            partialElement.className = 'transcription-entry partial';
            partialElement.textContent = text;
            transcriptionBox.appendChild(partialElement);
            currentPartialTranscription = partialElement;
        }
    } else {
        // Handle complete transcription
        finalizeTranscription();
        
        // Create new completed transcription entry
        const transcriptElement = document.createElement('p');
        transcriptElement.className = 'transcription-entry complete';
        transcriptElement.textContent = text;
        
        // Add timestamp
        const timeElement = document.createElement('small');
        timeElement.className = 'timestamp';
        timeElement.textContent = new Date(timestamp).toLocaleTimeString();
        transcriptElement.appendChild(timeElement);
        
        transcriptionBox.appendChild(transcriptElement);
    }
    
    // Scroll to the bottom to show latest content
    transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
}

function finalizeTranscription() {
    // If there's a partial transcription, mark it as complete
    if (currentPartialTranscription) {
        currentPartialTranscription.classList.remove('partial');
        currentPartialTranscription.classList.add('complete');
        currentPartialTranscription = null;
    }
}

export function updateSummary(summaryData) {
    if (!summaryBox) return;
    
    const { text, timestamp } = summaryData;
    
    // Create summary content
    const summaryElement = document.createElement('div');
    summaryElement.className = 'summary-entry';
    
    // Add timestamp
    const timeElement = document.createElement('div');
    timeElement.className = 'summary-timestamp';
    timeElement.textContent = new Date(timestamp).toLocaleTimeString();
    summaryElement.appendChild(timeElement);
    
    // Add summary text
    const textElement = document.createElement('div');
    textElement.className = 'summary-text';
    textElement.textContent = text;
    summaryElement.appendChild(textElement);
    
    // Update the display
    summaryBox.innerHTML = ''; // Clear previous summary
    summaryBox.appendChild(summaryElement);
}

export function updateStatus(status) {
    if (!connectionStatus || !audioStatus) return;
    
    console.log('Updating connection status:', status);
    connectionStatus.textContent = status;
    
    // Update visual state
    connectionStatus.className = 'status-text ' + 
        (status.toLowerCase() === 'connected' ? 'connected' : 'disconnected');
    
    // Update audio status based on connection state
    updateAudioStatus(status.toLowerCase() === 'connected');
}

function updateAudioStatus(isActive) {
    if (!audioStatus) return;
    
    audioStatus.textContent = `Microphone: ${isActive ? 'Active' : 'Off'}`;
    audioStatus.className = 'status-text ' + (isActive ? 'active' : 'inactive');
}

function clearDisplays() {
    // Clear transcription box
    if (transcriptionBox) {
        transcriptionBox.innerHTML = '';
        currentPartialTranscription = null;
    }
    
    // Clear summary box
    if (summaryBox) {
        summaryBox.innerHTML = '';
    }
}