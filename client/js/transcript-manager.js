export class TranscriptManager {
    constructor() {
        this.currentTranscript = [];
        this.sessionId = null;
    }

    initialize(sessionId) {
        this.sessionId = sessionId;
        this.currentTranscript = [];
        this._updateDownloadButtonState();
    }

    addEntry(text) {
        this.currentTranscript.push({
            timestamp: new Date().toISOString(),
            text: text
        });
        this._updateDownloadButtonState();
    }

    _updateDownloadButtonState() {
        const downloadButton = document.getElementById('downloadButton');
        if (downloadButton) {
            if (this.currentTranscript.length > 0) {
                downloadButton.removeAttribute('disabled');
            } else {
                downloadButton.setAttribute('disabled', 'true');
            }
        }
    }

    async saveTranscript() {
        try {
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
            return result.id;
        } catch (error) {
            console.error('Error saving transcript:', error);
            throw error;
        }
    }

    async downloadTranscript(transcriptId) {
        try {
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