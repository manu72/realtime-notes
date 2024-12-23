// ... previous code remains the same ...

function sendConfiguration(channel) {
    console.log('Sending initial configuration...');
    const config = {
        type: 'response.create',
        response: {
            modalities: ['text', 'audio'],
            instructions: `Please perform two tasks:
                1. Provide real-time transcription of the audio input
                2. Generate periodic summaries of the key points discussed.
                Format summaries with "Summary:" prefix.`,
            stream: true,  // Enable streaming for real-time updates
            temperature: 0.7,  // Balance between creativity and accuracy
            transcription: {
                language: 'en',  // Set to English
                partial_results: true  // Enable partial results for more responsive UI
            }
        }
    };

    try {
        const configString = JSON.stringify(config);
        console.log('Sending configuration:', configString);
        channel.send(configString);
        console.log('Configuration sent successfully');
    } catch (error) {
        console.error('Failed to send configuration:', error);
    }
}

// ... rest of the code remains the same ...