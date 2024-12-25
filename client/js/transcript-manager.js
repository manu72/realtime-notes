export class TranscriptManager {
    constructor() {
        this.currentTranscript = [];
        this.sessionId = null;
        console.log('TranscriptManager initialized');
    }

    initialize(sessionId) {
        console.log('TranscriptManager initialize called with sessionId:', sessionId);
        this.sessionId = sessionId;
        this.currentTranscript = [];
        this._updateDownloadButtonState();
    }

    addEntry(text) {
        console.log('TranscriptManager addEntry called with text:', text);
        this.currentTranscript.push({
            timestamp: new Date().toISOString(),
            text: text
        });
        console.log('Current transcript length:', this.currentTranscript.length);
        this._updateDownloadButtonState();
    }

    _updateDownloadButtonState() {
        const downloadButton = document.getElementById('downloadButton');
        console.log('Updating download button state. Transcript length:', this.currentTranscript.length);
        if (downloadButton) {
            if (this.currentTranscript.length > 0) {
                console.log('Enabling download button');
                downloadButton.removeAttribute('disabled');
            } else {
                console.log('Disabling download button');
                downloadButton.setAttribute('disabled', 'true');
            }
        } else {
            console.log('Download button not found in DOM');
        }
    }

    async saveTranscript() {
        try {
            console.log('Saving transcript:', this.currentTranscript);
            const response = await fetch('/api/transcripts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    content: JSON.stringify(this.currentTranscript),
                    metadata: {
                        totalEntries: this.currentTranscript.length,
                        savedAt: new Date().toISOString()
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save transcript');
            }

            const result = await response.json();
            console.log('Transcript saved successfully:', result);
            return result.id;
        } catch (error) {
            console.error('Error saving transcript:', error);
            throw error;
        }
    }

    async downloadTranscript(transcriptId) {
        try {
            console.log('Downloading transcript:', transcriptId);
            const response = await fetch(`/api/transcripts/${transcriptId}/download`);
            if (!response.ok) {
                throw new Error('Failed to download transcript');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transcript-${transcriptId}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            console.log('Transcript downloaded successfully');
        } catch (error) {
            console.error('Error downloading transcript:', error);
            throw error;
        }
    }

    async getAllTranscripts() {
        try {
            const response = await fetch('/api/transcripts');
            if (!response.ok) {
                throw new Error('Failed to fetch transcripts');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching transcripts:', error);
            throw error;
        }
    }
}