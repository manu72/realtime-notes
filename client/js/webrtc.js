import { audioManager } from './audio.js';

let peerConnection = null;
let dataChannel = null;

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

        return peerConnection;
    } catch (error) {
        console.error('WebRTC initialization failed:', error);
        throw error;
    }
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
                    callbacks.onTranscript({
                        text: text,
                        isPartial: false,
                        timestamp: new Date().toISOString(),
                        isUser: event.item.role === 'user'
                    });
                }
            }
            break;

        case 'conversation.item.input_audio_transcription.completed':
            if (event.transcript) {
                callbacks.onTranscript({
                    text: event.transcript,
                    isPartial: false,
                    timestamp: new Date().toISOString(),
                    isUser: true
                });
            }
            break;

        case 'input_audio_buffer.speech_started':
            callbacks.onStatusChange('Speaking detected');
            break;

        case 'input_audio_buffer.speech_stopped':
            callbacks.onStatusChange('Speech stopped');
            break;

        case 'response.audio_transcript.delta':
            if (event.delta) {
                callbacks.onTranscript({
                    text: event.delta,
                    isPartial: true,
                    timestamp: new Date().toISOString(),
                    isUser: false
                });
            }
            break;

        case 'response.audio_transcript.done':
            if (event.transcript) {
                callbacks.onTranscript({
                    text: event.transcript,
                    isPartial: false,
                    timestamp: new Date().toISOString(),
                    isUser: false
                });
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