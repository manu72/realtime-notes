let startButton;
let stopButton;
let transcriptionBox;
let summaryBox;
let connectionStatus;
let audioStatus;
let errorModal;
let errorMessage;
let closeModalBtn;

export function initUI(handlers) {
    startButton = document.getElementById('startButton');
    stopButton = document.getElementById('stopButton');
    transcriptionBox = document.getElementById('liveTranscription');
    summaryBox = document.getElementById('summaryContent');
    connectionStatus = document.getElementById('connectionStatus');
    audioStatus = document.getElementById('audioStatus');
    errorModal = document.getElementById('errorModal');
    errorMessage = document.getElementById('errorMessage');
    closeModalBtn = document.querySelector('.close-modal');

    stopButton.disabled = true;

    startButton.addEventListener('click', async () => {
        startButton.disabled = true;
        stopButton.disabled = false;
        clearDisplays();
        await handlers.onStart();
    });

    stopButton.addEventListener('click', async () => {
        stopButton.disabled = true;
        await handlers.onStop();
        startButton.disabled = false;
    });

    // Add modal close handler
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            errorModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === errorModal) {
            errorModal.style.display = 'none';
        }
    });

    updateStatus('Disconnected');
}

export function updateTranscription(transcriptData) {
    if (!transcriptionBox) return;
    
    let existingEntry = null;
    if (transcriptData.isPartial) {
        existingEntry = transcriptionBox.querySelector('.partial');
        if (existingEntry) {
            existingEntry.textContent = `${transcriptData.isUser ? 'You' : 'Assistant'}: ${transcriptData.text}`;
            return;
        }
    }
    
    const entry = document.createElement('p');
    entry.className = `transcription-entry ${transcriptData.isUser ? 'user' : 'assistant'}`;
    if (transcriptData.isPartial) {
        entry.className += ' partial';
    }
    
    entry.textContent = `${transcriptData.isUser ? 'You' : 'Assistant'}: ${transcriptData.text}`;
    
    const time = document.createElement('small');
    time.className = 'timestamp';
    time.textContent = new Date(transcriptData.timestamp).toLocaleTimeString();
    entry.appendChild(time);
    
    transcriptionBox.appendChild(entry);
    transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
}

export function updateSummary(summaryData) {
    if (!summaryBox) return;
    
    const entry = document.createElement('div');
    entry.className = 'summary-entry';
    entry.textContent = summaryData.text;
    
    const time = document.createElement('small');
    time.className = 'timestamp';
    time.textContent = new Date(summaryData.timestamp).toLocaleTimeString();
    entry.appendChild(time);
    
    summaryBox.appendChild(entry);
}

export function updateStatus(status) {
    if (!connectionStatus || !audioStatus) return;
    
    connectionStatus.textContent = `Connection state: ${status}`;
    connectionStatus.className = 'status-text ' + 
        (status.toLowerCase().includes('connect') ? 'connected' : 'disconnected');
    
    if (status.toLowerCase().includes('speaking')) {
        updateAudioStatus(true);
    } else if (status.toLowerCase().includes('disconnect')) {
        updateAudioStatus(false);
    }
}

function updateAudioStatus(isActive) {
    if (!audioStatus) return;
    audioStatus.textContent = `Microphone: ${isActive ? 'Active' : 'Off'}`;
    audioStatus.className = 'status-text ' + (isActive ? 'active' : 'inactive');
}

function clearDisplays() {
    if (transcriptionBox) transcriptionBox.innerHTML = '';
    if (summaryBox) summaryBox.innerHTML = '';
}

export function showError(message) {
    if (!errorModal || !errorMessage) return;
    
    errorMessage.textContent = message;
    errorModal.style.display = 'block';
    
    // Add warning to summary box
    if (summaryBox) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'summary-warning';
        warningDiv.textContent = '⚠️ Summary temporarily unavailable due to API limits. Transcription will continue.';
        summaryBox.appendChild(warningDiv);
    }
}