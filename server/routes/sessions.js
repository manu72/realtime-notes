import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

/**
 * Generates an ephemeral token for client-side Realtime API access.
 * This token is short-lived (1 minute) and meant for secure client-side usage.
 */
router.post('/sessions', async (req, res, next) => {
    try {
    // Validate that we have an API key
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
        }

    // Define the configuration for our Realtime session
    // This configuration is based on the OpenAI Realtime API requirements
        const sessionConfig = {
            model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy'  // Using alloy voice as default
        };

    // Request an ephemeral token from OpenAI
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sessionConfig)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            throw new Error(errorData.error?.message || 'Failed to create session');
        }

        // Send the session data back to the client
        const sessionData = await response.json();
        res.json(sessionData);

    } catch (error) {
        console.error('Session creation error:', error);
        // Forward any errors to our error handling middleware
        next(error);
    }
});

/**
 * Get the current session configuration.
 * Useful for client-side initialization and state management.
 */
router.get('/session-config', (req, res) => {
    res.json({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        supportedVoices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        defaultVoice: 'alloy'
    });
});

export default router;