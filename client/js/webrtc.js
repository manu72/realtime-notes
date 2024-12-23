// webrtc.js - WebRTC connection management and audio streaming
let peerConnection = null;
let dataChannel = null;

export async function initWebRTC(token, callbacks) {
    try {
        // Create and configure the peer connection
        peerConnection = new RTCPeerConnection();
        
        // Create a data channel for sending and receiving events
        dataChannel = peerConnection.createDataChannel('oai-events');
        setupDataChannelHandlers(dataChannel, callbacks);

        // Set up audio handling
        const audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Add audio track to the peer connection
        audioStream.getAudioTracks().forEach(track => {
            peerConnection.addTrack(track, audioStream);
        });

        // Set up remote audio playback
        const audioElement = document.createElement('audio');
        audioElement.autoplay = true;
        peerConnection.ontrack = (event) => {
            audioElement.srcObject = event.streams[0];
        };

        // Create and set local description
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send the offer to OpenAI's Realtime API
        const sdpResponse = await fetch(
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

        if (!sdpResponse.ok) {
            throw new Error('Failed to establish WebRTC connection');
        }

        // Set the remote description
        const answer = {
            type: 'answer',
            sdp: await sdpResponse.text()
        };
        await peerConnection.setRemoteDescription(answer);

        // Send initial configuration
        sendConfiguration();

        return peerConnection;
    } catch (error) {
        console.error('WebRTC initialization failed:', error);
        throw error;
    }
}

function setupDataChannelHandlers(channel, callbacks) {
    channel.onopen = () => {
        console.log('Data channel opened');
        callbacks.onStatusChange('Connected');
    };

    channel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleRealtimeEvent(data, callbacks);
    };

    channel.onclose = () => {
        console.log('Data channel closed');
        callbacks.onStatusChange('Disconnected');
    };
}

function handleRealtimeEvent(event, callbacks) {
    switch (event.type) {
        case 'transcript.partial':
        case 'transcript.complete':
            callbacks.onTranscript(event.transcript.text);
            break;
        case 'summary.update':
            callbacks.onSummary(event.summary.text);
            break;
        default:
            console.log('Received event:', event);
    }
}

function sendConfiguration() {
    if (!dataChannel) return;

    const config = {
        type: 'response.create',
        response: {
            modalities: ['text', 'audio'],
            instructions: 'Please transcribe the audio and provide periodic summaries of the key points discussed.',
        }
    };

    dataChannel.send(JSON.stringify(config));
}

export async function closeConnection() {
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
}