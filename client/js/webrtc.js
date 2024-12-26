import { audioManager } from './audio.js';
import { TranscriptManager } from './transcript-manager.js';

let peerConnection = null;
let dataChannel = null;
const transcriptManager = new TranscriptManager();
let currentTranscriptText = ''; // Store the accumulated delta text
let summaryLimitReached = false;

export { initWebRTC, closeConnection };

async function initWebRTC(token, callbacks) {
    try {
        peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        console.log('Creating data channel...');
        dataChannel = peerConnection.createDataChannel('oai-events');
        setupDataChannelHandlers(dataChannel, callbacks);

        const audioStream = await audioManager.startAudioCapture();
        audioStream.getAudioTracks().forEach(track => {
            peerConnection.addTrack(track, audioStream);
        });

        // Set up remote audio from model
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        peerConnection.ontrack = e => audioEl.srcObject = e.streams[0];

        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true
        });
        await peerConnection.setLocalDescription(offer);

        const response = await fetch(
            'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/sdp'
                },
                body: offer.sdp
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to establish WebRTC connection: ${response.statusText}`);
        }

        const answer = {
            type: 'answer',
            sdp: await response.text()
        };
        await peerConnection.setRemoteDescription(answer);

        // Initialize transcript manager with a unique session ID
        transcriptManager.initialize(crypto.randomUUID());
        setupTranscriptDownload();

        return peerConnection;
    } catch (error) {
        console.error('WebRTC initialization failed:', error);
        throw error;
    }
}

function setupTranscriptDownload() {
    const downloadButton = document.getElementById('downloadButton');
    
    downloadButton.addEventListener('click', async () => {
        if (transcriptManager.currentTranscript.length === 0) {
            alert('No transcript available to download');
            return;
        }

        try {
            downloadButton.disabled = true;
            const transcriptId = await transcriptManager.saveTranscript();
            await transcriptManager.downloadTranscript(transcriptId);
        } catch (error) {
            console.error('Error downloading transcript:', error);
            alert('Failed to download transcript. Please try again.');
        } finally {
            downloadButton.disabled = transcriptManager.currentTranscript.length === 0;
        }
    });
}

async function closeConnection() {
    // Get the summary content from the UI
    const summaryBox = document.getElementById('summaryContent');
    if (summaryBox && summaryBox.textContent.trim()) {
        // Add a separator and the summary to the transcript
        transcriptManager.addEntry('\n=== Final Summary ===\n' + summaryBox.textContent.trim());
    }

    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    await audioManager.stopAudioCapture();
    currentTranscriptText = ''; // Reset the accumulated text
    
    // No longer resetting the transcript manager - the transcript remains available for download
}

function setupDataChannelHandlers(channel, callbacks) {
    channel.onopen = () => {
        console.log('Data channel opened');
        sendConfiguration(channel);
    };

    channel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Received event:', data);
            handleRealtimeEvent(data, callbacks, channel);
        } catch (error) {
            console.error('Error handling message:', error);
            callbacks.onError?.(error);
        }
    };

    channel.onclose = () => {
        console.log('Data channel closed');
        callbacks.onStatusChange('Disconnected');
    };

    channel.onerror = (error) => {
        console.error('Data channel error:', error);
        callbacks.onError?.(error);
    };
}

function handleRealtimeEvent(event, callbacks, channel) {
    console.log('Processing event type:', event.type);

    switch (event.type) {
        case 'conversation.item.created':
            if (event.item?.content) {
                const text = extractTextFromContent(event.item.content);
                if (text) {
                    // Regular transcript handling for user messages
                    if (event.item.role === 'user') {
                        console.log('Received user transcript:', text);
                        const transcriptData = {
                            text: text,
                            isPartial: false,
                            timestamp: new Date().toISOString(),
                            isUser: true
                        };
                        transcriptManager.addEntry(text);
                        callbacks.onTranscript(transcriptData);
                        requestSummary(channel, transcriptManager.getCurrentTranscript());
                    }
                }
            }
            break;

        case 'conversation.item.input_audio_transcription.completed':
            if (event.transcript) {
                console.log('Audio transcription completed:', event.transcript);
                const transcriptData = {
                    text: event.transcript,
                    isPartial: false,
                    timestamp: new Date().toISOString(),
                    isUser: true
                };
                transcriptManager.addEntry(event.transcript);
                callbacks.onTranscript(transcriptData);
                requestSummary(channel, transcriptManager.getCurrentTranscript());
            }
            break;

        case 'response.done':
            if (event.response?.status === 'failed') {
                console.error('Response failed:', event.response);
                
                // Check if it's a rate limit error
                const error = event.response.status_details?.error;
                if (error?.code === 'rate_limit_exceeded') {
                    // Show user-friendly error message
                    callbacks.onError?.('API rate limit reached. Summaries are temporarily disabled, but transcription will continue.');
                    
                    // Set a flag to prevent further summary requests for this session
                    summaryLimitReached = true;
                }
            }
            break;

        case 'response.audio_transcript.done':
            if (currentTranscriptText) {
                console.log('Processing completed transcript:', currentTranscriptText);
                
                // Check if this is a summary response
                if (currentTranscriptText.toLowerCase().includes('summary:')) {
                    console.log('Processing summary response');
                    const summaryData = {
                        text: currentTranscriptText,
                        timestamp: new Date().toISOString()
                    };
                    callbacks.onSummary?.(summaryData);
                } else {
                    // Regular assistant response
                    const transcriptData = {
                        text: currentTranscriptText,
                        isPartial: false,
                        timestamp: new Date().toISOString(),
                        isUser: false
                    };
                    transcriptManager.addEntry(currentTranscriptText);
                    callbacks.onTranscript(transcriptData);
                    
                    // Only request summary if we haven't hit the limit
                    if (!summaryLimitReached) {
                        console.log('Requesting updated summary');
                        requestSummary(channel, transcriptManager.getCurrentTranscript());
                    }
                }
                
                currentTranscriptText = ''; // Reset for next speech
            }
            break;

        case 'input_audio_buffer.speech_started':
            callbacks.onStatusChange('Speaking detected');
            currentTranscriptText = ''; // Reset accumulated text when speech starts
            break;

        case 'input_audio_buffer.speech_stopped':
            callbacks.onStatusChange('Speech stopped');
            break;

        case 'response.audio_transcript.delta':
            if (event.delta) {
                // Accumulate delta text
                currentTranscriptText += event.delta;
                // Only send to transcript if not a summary
                if (!currentTranscriptText.toLowerCase().includes('summary:')) {
                    const transcriptData = {
                        text: event.delta,
                        isPartial: true,
                        timestamp: new Date().toISOString(),
                        isUser: false
                    };
                    callbacks.onTranscript(transcriptData);
                }
            }
            break;

        case 'error':
            console.error('Received error event:', event);
            callbacks.onError?.(new Error(event.error?.message || 'Unknown error'));
            break;
    }
}

function extractTextFromContent(content) {
    if (!Array.isArray(content)) return null;
    
    for (const item of content) {
        if (item.type === 'text' && item.text) {
            return item.text;
        }
        if (item.type === 'input_audio' && item.transcript) {
            return item.transcript;
        }
    }
    return null;
}

function sendConfiguration(channel) {
    const config = {
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            input_audio_transcription: {
                model: 'whisper-1'
            },
            turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500
            }
        }
    };
    channel.send(JSON.stringify(config));
}

function requestSummary(channel, transcript) {
    if (!channel || channel.readyState !== 'open') {
        console.log('Cannot request summary - channel not open');
        return;
    }

    if (!transcript || transcript.trim().length === 0) {
        console.log('Cannot request summary - no transcript available');
        return;
    }

    console.log('Requesting summary for transcript');
    const summaryRequest = {
        type: 'conversation.item.create',
        item: {
            type: 'message',
            role: 'user',
            content: [{
                type: 'input_text',
                text: `Generate a concise summary of the following conversation. Format your response as "Summary: " followed by the key points:\n\n${transcript}`
            }]
        }
    };

    try {
        channel.send(JSON.stringify(summaryRequest));
        console.log('Summary request sent');
    } catch (error) {
        console.error('Error sending summary request:', error);
    }
}

// Add getCurrentTranscript method to TranscriptManager class
TranscriptManager.prototype.getCurrentTranscript = function() {
    return this.currentTranscript.map(entry => entry.text).join('\n');
};