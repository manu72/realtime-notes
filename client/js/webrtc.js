import { audioManager } from './audio.js';

let peerConnection = null;
let dataChannel = null;

export { initWebRTC, closeConnection };

async function initWebRTC(token, callbacks) {
    try {
        peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        dataChannel = peerConnection.createDataChannel('oai-events');
        setupDataChannelHandlers(dataChannel, callbacks);

        const audioStream = await audioManager.startAudioCapture();
        audioStream.getAudioTracks().forEach(track => {
            peerConnection.addTrack(track, audioStream);
        });

        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true
        });
        await peerConnection.setLocalDescription(offer);

        const response = await fetch(
            'https://api.openai.com/v1/realtime',
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
        }
    };

    channel.onclose = () => {
        console.log('Data channel closed');
        callbacks.onStatusChange('Disconnected');
    };
}

function handleRealtimeEvent(event, callbacks) {
    console.log('Processing event type:', event.type);

    switch (event.type) {
        case 'conversation.item.created':
            if (event.item?.role === 'user' && event.item?.content) {
                // Handle user message content
                for (const contentItem of event.item.content) {
                    if (contentItem.type === 'text' && contentItem.text) {
                        callbacks.onTranscript({
                            text: contentItem.text,
                            isPartial: false,
                            timestamp: new Date().toISOString(),
                            isUser: true
                        });
                    }
                }
            } else if (event.item?.role === 'assistant' && event.item?.content) {
                // Handle assistant response
                for (const contentItem of event.item.content) {
                    if (contentItem.type === 'text' && contentItem.text) {
                        callbacks.onTranscript({
                            text: contentItem.text,
                            isPartial: false,
                            timestamp: new Date().toISOString(),
                            isUser: false
                        });
                    }
                }
            }
            break;

        case 'response.audio_transcript.done':
            callbacks.onTranscript({
                text: event.transcript,
                isPartial: false,
                timestamp: new Date().toISOString(),
                isUser: false
            });
            break;
    }
}

function sendConfiguration(channel) {
    const config = {
        type: 'response.create',
        response: {
            modalities: ['text'],
            instructions: 'Please transcribe all audio input and provide summaries periodically.'
        }
    };
    channel.send(JSON.stringify(config));
}