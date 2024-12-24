let startButton;
let stopButton;
let transcriptionBox;
let summaryBox;
let connectionStatus;
let audioStatus;

export function initUI(handlers) {
    startButton = document.getElementById('startButton');
    stopButton = document.getElementById('stopButton');
    transcriptionBox = document.getElementById('liveTranscription');
    summaryBox = document.getElementById('summaryContent');
    connectionStatus = document.getElementById('connectionStatus');
    audioStatus = document.getElementById('audioStatus');

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

    updateStatus('Disconnected');
}

export function updateTranscription(transcriptData) {
    if (!transcriptionBox) return;
    console.log('Updating transcription:', transcriptData);
    
    const p = document.createElement('p');
    p.className = `transcription-entry ${transcriptData.isUser ? 'user' : 'assistant'}`;
    
    const prefix = transcriptData.isUser ? 'You: ' : 'Assistant: ';
    p.textContent = prefix + transcriptData.text;
    
    if (!transcriptData.isPartial) {
        const timeElement = document.createElement('small');
        timeElement.className = 'timestamp';
        timeElement.textContent = new Date(transcriptData.timestamp).toLocaleTimeString();
        p.appendChild(timeElement);
    }
    
    if (transcriptData.isPartial) {
        p.classList.add('partial');
        const existingPartial = transcriptionBox.querySelector('.partial');
        if (existingPartial) {
            existingPartial.remove();
        }
    }
    
    transcriptionBox.appendChild(p);
    transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
}

export function updateSummary(summaryData) {
    if (!summaryBox) return;
    
    const div = document.createElement('div');
    div.className = 'summary-entry';
    div.textContent = summaryData.text;
    
    const timeElement = document.createElement('small');
    timeElement.className = 'timestamp';
    timeElement.textContent = new Date(summaryData.timestamp).toLocaleTimeString();
    div.appendChild(timeElement);
    
    summaryBox.appendChild(div);
}

export function updateStatus(status) {
    if (!connectionStatus || !audioStatus) return;
    
    connectionStatus.textContent = `Connection state: ${status}`;
    connectionStatus.className = 'status-text ' + 
        (status.toLowerCase().includes('connect') ? 'connected' : 'disconnected');
    
    if (status.toLowerCase().includes('speech')) {
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