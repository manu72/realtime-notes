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

        const offer = await peerConnection.createOffer();
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
            throw new Error('Failed to establish WebRTC connection');
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
            console.log('Raw event:', JSON.stringify(data, null, 2));
            handleRealtimeEvent(data, callbacks);
        } catch (error) {
            console.error('Error handling message:', error);
        }
    };

    channel.onclose = () => {
        console.log('Data channel closed');
        callbacks.onStatusChange('Disconnected');
    };
}

function handleRealtimeEvent(event, callbacks) {
    console.log('Processing event:', event.type);

    switch (event.type) {
        case 'response.audio_transcript.done':
            if (event.transcript) {
                callbacks.onTranscript({
                    text: event.transcript,
                    isPartial: false,
                    timestamp: new Date().toISOString()
                });
            }
            break;

        case 'conversation.item.created':
            if (event.item?.content) {
                const text = extractTextFromContent(event.item.content);
                if (text) {
                    if (text.toLowerCase().includes('summary:')) {
                        callbacks.onSummary({
                            text: text,
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        callbacks.onTranscript({
                            text: text,
                            isPartial: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }
            break;

        case 'input_audio_buffer.speech_started':
            console.log('Speech detected - audio input working');
            break;

        case 'input_audio_buffer.speech_stopped':
            console.log('Speech stopped');
            break;
    }
}

function extractTextFromContent(content) {
    if (!Array.isArray(content)) return null;
    
    for (const item of content) {
        if (item.type === 'text' && item.text) {
            return item.text;
        }
        if (item.type === 'message' && item.content) {
            return extractTextFromContent(item.content);
        }
    }
    return null;
}

function sendConfiguration(channel) {
    const config = {
        type: 'response.create',
        response: {
            modalities: ['text', 'audio'],
            instructions: 'Please transcribe the audio and provide periodic summaries.',
            stream: true
        }
    };
    channel.send(JSON.stringify(config));
}