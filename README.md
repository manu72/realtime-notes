# Realtime Notes

A real-time audio transcription and note-taking application that captures both microphone and browser audio using OpenAI's Realtime API. The application provides live transcription and summarization of audio content.

## Features

- Real-time audio capture from microphone and browser
- Live transcription using OpenAI's Realtime API
- Real-time summarization of content
- Simple and intuitive web interface

## Prerequisites

- Node.js (v18 or higher)
- OpenAI API key with access to Realtime API

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and add your OpenAI API key
3. Install dependencies with `npm install`
4. Start the server with `npm start`
5. Open `http://localhost:3000` in your browser

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
OPENAI_API_KEY=your_api_key_here
PORT=3000
```

## Development

Run the development server with hot reload:

```bash
npm run dev
```

## Architecture

The application uses a Node.js/Express backend to handle API key management and serve the static frontend. The frontend uses WebRTC to establish a direct connection with OpenAI's Realtime API for audio streaming and transcription.