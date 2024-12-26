# Realtime Notes

A real-time speech-to-text application with live transcription and automatic summarization capabilities. The app captures audio input, provides instant transcription, and generates concise summaries of the conversation.

## Features

- 🎤 **Real-time Speech Recognition**: Instantly converts spoken words to text using OpenAI's Whisper model
- 📝 **Live Transcription**: Displays transcribed text in real-time as you speak
- 📋 **Automatic Summarization**: Generates concise summaries of the conversation highlighting key points
- 💾 **Transcript Downloads**: Save and download your conversation transcripts
- 🔄 **WebRTC Integration**: Reliable real-time communication using WebRTC technology
- 🎯 **Turn Detection**: Smart speech detection with customizable silence thresholds
- 📱 **Responsive Design**: Works seamlessly across different devices and screen sizes

## Project Structure

```
realtime-notes/
├── client/
│   ├── css/
│   │   └── styles.css          # Application styling
│   ├── js/
│   │   ├── app.js             # Main application logic
│   │   ├── audio-manager.js   # Audio capture and processing
│   │   ├── transcript-manager.js # Transcript handling and storage
│   │   └── webrtc.js         # WebRTC and real-time communication
│   └── index.html            # Main application interface
├── server/
│   └── [Server components]    # Server-side implementation
└── README.md                 # Project documentation
```

## Getting Started

### Prerequisites

- Modern web browser with WebRTC support
- OpenAI API access
- Node.js and npm (for development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/realtime-notes.git
   cd realtime-notes
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your OpenAI API credentials

4. Start the application:
   ```bash
   npm start
   ```

## Usage

1. Click the "Start Recording" button to begin capturing audio
2. Speak naturally - your words will appear in the Live Transcription box
3. View automatically generated summaries in the Summary box
4. Click "Stop" to end the recording session
5. Use "Download Transcript" to save the conversation

## Technical Details

### Key Components

- **Audio Manager**: Handles audio capture and processing using WebRTC
- **Transcript Manager**: Manages conversation transcripts and downloads
- **WebRTC Handler**: Manages real-time communication and data channels
- **UI Components**: Responsive interface with real-time updates

### API Integration

The application integrates with OpenAI's APIs for:
- Speech-to-text conversion using Whisper
- Real-time transcription processing
- Conversation summarization

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for their Whisper model and real-time APIs
- WebRTC for enabling real-time communication
- Contributors and maintainers

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
