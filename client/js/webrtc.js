import { audioManager } from './audio.js';
import { TranscriptManager } from './transcript-manager.js';

let peerConnection = null;
let dataChannel = null;
const transcriptManager = new TranscriptManager();
let currentTranscriptText = ''; // Store the accumulated delta text

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
    transcriptManager.initialize(null);
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
            handleRealtimeEvent(data, callbacks);
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

function handleRealtimeEvent(event, callbacks) {
    console.log('Processing event type:', event.type);

    switch (event.type) {
        case 'conversation.item.created':
            if (event.item?.content) {
                const text = extractTextFromContent(event.item.content);
                if (text) {
                    const transcriptData = {
                        text: text,
                        isPartial: false,
                        timestamp: new Date().toISOString(),
                        isUser: event.item.role === 'user'
                    };
                    transcriptManager.addEntry(text);
                    callbacks.onTranscript(transcriptData);
                }
            }
            break;

        case 'conversation.item.input_audio_transcription.completed':
            if (event.transcript) {
                const transcriptData = {
                    text: event.transcript,
                    isPartial: false,
                    timestamp: new Date().toISOString(),
                    isUser: true
                };
                transcriptManager.addEntry(event.transcript);
                callbacks.onTranscript(transcriptData);
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
                const transcriptData = {
                    text: event.delta,
                    isPartial: true,
                    timestamp: new Date().toISOString(),
                    isUser: false
                };
                callbacks.onTranscript(transcriptData);
            }
            break;

        case 'response.audio_transcript.done':
            if (currentTranscriptText) {
                // Add the accumulated text as a transcript entry
                const transcriptData = {
                    text: currentTranscriptText,
                    isPartial: false,
                    timestamp: new Date().toISOString(),
                    isUser: false
                };
                transcriptManager.addEntry(currentTranscriptText);
                callbacks.onTranscript(transcriptData);
                currentTranscriptText = ''; // Reset for next speech
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