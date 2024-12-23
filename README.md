{
  `path`: `C:\\GIT\\realtime-notes\\README.md`,
  `content`: `# Realtime Notes

Realtime Notes is a sophisticated web application that provides real-time audio transcription and summarization using OpenAI's Realtime API. The application captures both microphone and browser audio, delivering instant transcriptions and intelligent summaries of spoken content.

## Features

- Real-time audio capture from microphone and browser
- Live transcription using OpenAI's Realtime API
- Real-time summarization of content
- Clean and intuitive web interface
- WebRTC-based audio streaming
- Secure authentication using ephemeral tokens

## Technical Architecture

Our application follows a modern, modular architecture that ensures clean separation of concerns while maintaining high performance for real-time audio processing. Here's a detailed look at each component:

### Server-Side Components

The backend is built with Express.js and provides two essential services:

1. **Session Management (server/routes/sessions.js)**
   This component handles the secure generation of ephemeral tokens for client authentication. It communicates with OpenAI's API to create short-lived authentication tokens, ensuring secure client-side access to the Realtime API. The session manager also maintains configuration settings for transcription and summarization behavior.

2. **Static Asset Serving (server/index.js)**
   Our Express server efficiently delivers the client application while handling cross-origin resource sharing (CORS) and providing robust error management. It's designed to scale and includes comprehensive logging and error reporting.

### Client-Side Components

The frontend is structured into four main modules, each with a specific responsibility:

1. **Application Core (client/js/app.js)**
   This module serves as the application's backbone, coordinating between different components and managing the application's state. It handles:
   - Application initialization and lifecycle management
   - Coordination of recording sessions
   - Error handling and recovery
   - Clean resource management during shutdown

2. **WebRTC Implementation (client/js/webrtc.js)**
   This crucial component manages real-time communication with OpenAI's API through WebRTC. It handles:
   - Establishment of peer connections
   - Audio stream capture and transmission
   - Data channel management for event communication
   - Processing of incoming transcriptions and summaries

3. **User Interface (client/js/ui.js)**
   The UI module provides a responsive and intuitive interface for users. It manages:
   - Real-time updates of transcription and summary displays
   - Status indicators for connection and recording states
   - Button state management
   - Smooth animations and transitions

4. **HTML/CSS Structure (client/index.html, client/css/styles.css)**
   Our interface is built with modern HTML5 and CSS3, featuring:
   - Responsive grid layout for optimal viewing on any device
   - Clean, accessible design
   - Visual feedback for application states
   - Smooth scrolling and animations

### Data Flow

The application's data flows through several stages:

1. **Initialization Flow**
   - User opens the application
   - Client requests ephemeral token from server
   - Server authenticates with OpenAI and returns token
   - Client establishes WebRTC connection using token

2. **Recording Flow**
   - User starts recording
   - Audio is captured and streamed via WebRTC
   - OpenAI processes audio in real-time
   - Transcriptions and summaries are returned via data channel
   - UI updates with new content

3. **Shutdown Flow**
   - User stops recording
   - WebRTC connection is closed
   - Audio capture is stopped
   - UI returns to initial state
   - Resources are cleaned up

## Setup and Development

### Prerequisites

- Node.js (v18 or higher)
- OpenAI API key with access to Realtime API
- Modern web browser with WebRTC support

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/manu72/realtime-notes.git
   cd realtime-notes
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key
   - Configure any other necessary variables

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000` in your browser

## Security Considerations

The application implements several security best practices:

- Uses ephemeral tokens for client-side API access
- Never exposes the main OpenAI API key to clients
- Implements proper CORS policies
- Sanitizes error messages in production
- Maintains secure WebRTC connections

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to development.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.`
}