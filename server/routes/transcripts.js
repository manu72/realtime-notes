import express from 'express';
import { getDb } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all transcripts
router.get('/transcripts', async (req, res) => {
    try {
        const db = await getDb();
        const transcripts = await db.all('SELECT * FROM transcripts ORDER BY created_at DESC');
        res.json(transcripts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save transcript
router.post('/transcripts', async (req, res) => {
    try {
        const { session_id, content, metadata } = req.body;
        const db = await getDb();
        const id = uuidv4();
        
        await db.run(
            'INSERT INTO transcripts (id, session_id, content, metadata) VALUES (?, ?, ?, ?)',
            [id, session_id, content, JSON.stringify(metadata)]
        );
        
        res.status(201).json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transcript by ID
router.get('/transcripts/:id', async (req, res) => {
    try {
        const db = await getDb();
        const transcript = await db.get(
            'SELECT * FROM transcripts WHERE id = ?',
            [req.params.id]
        );
        
        if (!transcript) {
            return res.status(404).json({ error: 'Transcript not found' });
        }
        
        res.json(transcript);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download transcript
router.get('/transcripts/:id/download', async (req, res) => {
    try {
        const db = await getDb();
        const transcript = await db.get(
            'SELECT * FROM transcripts WHERE id = ?',
            [req.params.id]
        );
        
        if (!transcript) {
            return res.status(404).json({ error: 'Transcript not found' });
        }
        
        // Format the content for download
        const formattedContent = JSON.parse(transcript.content);
        const downloadContent = formattedContent.map(item => 
            `${new Date(item.timestamp).toISOString()}: ${item.text}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=transcript-${transcript.id}.txt`);
        res.send(downloadContent);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;