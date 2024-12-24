import { audioManager } from './audio.js';

let peerConnection = null;
let dataChannel = null;

export { initWebRTC, closeConnection };

async function initWebRTC(token, callbacks) {
    try {
        const configuration = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            // Add audio processing configuration
            sdpSemantics: 'unified-plan',
            // Enable audio processing
            encodedInsertableStreams: true
        };

        peerConnection = new RTCPeerConnection(configuration);

        console.log('Creating data channel...');
        dataChannel = peerConnection.createDataChannel('oai-events', {
            ordered: true
        });
        setupDataChannelHandlers(dataChannel, callbacks);

        // Initialize and add audio track with specific constraints
        const audioStream = await audioManager.startAudioCapture();
        audioStream.getAudioTracks().forEach(track => {
            const sender = peerConnection.addTrack(track, audioStream);
            // Set encoding parameters for better audio quality
            const params = sender.getParameters();
            params.encodings = [{
                maxBitrate: 128000,
                priority: 'high',
                networkPriority: 'high'
            }];
            sender.setParameters(params);
        });

        // Add audio level monitoring
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(audioStream);
        const analyzer = audioContext.createAnalyser();
        source.connect(analyzer);
        monitorAudioLevels(analyzer, callbacks);

        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            voiceActivityDetection: true
        });
        await peerConnection.setLocalDescription(offer);

        const response = await fetch(
            'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&input_audio_transcription=true&audio_quality=high',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/sdp',
                    'X-Audio-Config': JSON.stringify({
                        sampleRate: 48000,
                        channels: 1,
                        format: 'opus'
                    })
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

        // Add connection state monitoring
        peerConnection.onconnectionstatechange = () => {
            callbacks.onStatusChange(`Connection state: ${peerConnection.connectionState}`);
        };

        return peerConnection;
    } catch (error) {
        console.error('WebRTC initialization failed:', error);
        throw error;
    }
}

function monitorAudioLevels(analyzer, callbacks) {
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    function checkLevel() {
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > 0) {
            callbacks.onAudioLevel?.(average);
        }
        requestAnimationFrame(checkLevel);
    }
    checkLevel();
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
    console.log('Processing event:', event.type);

    switch (event.type) {
        case 'input_audio_buffer.transcription.partial':
            if (event.transcript) {
                callbacks.onTranscript({
                    text: event.transcript,
                    isPartial: true,
                    timestamp: new Date().toISOString(),
                    isUser: true
                });
            }
            break;

        case 'input_audio_buffer.transcription.final':
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
            console.log('Speech detected - audio input working');
            callbacks.onStatusChange('Speaking detected');
            break;

        case 'input_audio_buffer.speech_stopped':
            console.log('Speech stopped');
            callbacks.onStatusChange('Speech stopped');
            break;

        case 'input_audio_buffer.committed':
            if (event.transcript) {
                callbacks.onTranscript({
                    text: event.transcript,
                    isPartial: false,
                    timestamp: new Date().toISOString(),
                    isUser: true
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
                            timestamp: new Date().toISOString(),
                            isUser: event.item.role === 'user'
                        });
                    }
                }
            }
            break;

        case 'error':
            console.error('Received error event:', event);
            callbacks.onError?.(new Error(event.message || 'Unknown error'));
            break;
        case 'input_audio_buffer.speech_started':
            console.log('Speech detected - audio input working');
            break;

        case 'input_audio_buffer.speech_stopped':
            console.log('Speech stopped');
            break;

        case 'input_audio_buffer.committed':
            if (event.transcript) {
                callbacks.onTranscript({
                    text: event.transcript,
                    isPartial: false,
                    timestamp: new Date().toISOString(),
                    isUser: true
                });
            }
            break;
        default:
            console.log('Unhandled event type:', event.type);
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
        if (item.type === 'input_audio' && item.transcript) {
            return item.transcript;
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
            stream: true,
            input_audio_transcription: {
                enabled: true,
                model: 'whisper-1',
                language: 'en',
                prompt: 'Transcribe the following audio accurately',
                response_format: 'text'
            },
            audio_output: {
                format: 'opus',
                sampleRate: 48000,
                channels: 1
            }
        }
    };
    channel.send(JSON.stringify(config));
}