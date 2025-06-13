# LemonPepper Web

A web-based version of LemonPepper, providing real-time audio transcription and LLM-powered analysis through a modern web interface.

## Overview

LemonPepper Web is a web application that captures audio input, transcribes it using Whisper, and processes the transcription through an LLM (via Ollama) to generate intelligent responses. The system is designed for various use cases, including interview assistance, coding help, and general question-answering.

## Features

- Real-time audio transcription using Whisper
- Integration with Ollama API for LLM-powered responses
- Customizable prompts for different types of interactions
- Dynamic audio visualization with level monitoring
- User-friendly web interface built with React and Material UI
- Adjustable audio settings including device selection and gain control
- Copy-to-clipboard functionality for easy sharing of transcriptions and LLM responses
- Experimental Text to Speech (TTS) support

## Project Structure

- `backend/`: Flask backend providing REST APIs
- `frontend/`: React frontend application

## Prerequisites

- Python 3.7+
- Node.js and npm
- Ollama (for local LLM integration)
- Headset/microphone
- Software audio loopback for mixing microphone and other audio source (optional)

## Installation and Setup

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd lemonpepper-web/backend
   ```

2. Create and activate a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the Flask server:
   ```
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd lemonpepper-web/frontend
   ```

2. Install the required dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Settings Tab**: Configure the application
   - Set Ollama server location and select an LLM model
   - Download and select a Whisper model for transcription
   - Choose an audio input device
   - Select a prompt template based on your use case
   - Optionally configure TTS with a Picovoice Orca access key

2. **Home Tab**: Use the application
   - Start speaking or playing audio, and the application will transcribe your audio in real-time
   - The LLM will process the transcription and provide responses
   - Use the buttons to control the application, including starting/stopping transcription, clearing data, and copying responses

3. **Log Tab**: Monitor application logs for troubleshooting

## Audio Mixing (Optional)

For optimal results, you might want to mix audio from multiple sources. This can be done using tools like:

- Mac: BlackHole or Loopback
- Windows: Jack Audio Connection Kit or VB Audio
- Linux: PulseAudio

## License

Licensed under the Apache License, Version 2.0.

## Acknowledgements

- Whisper for offline speech recognition
- Ollama for local LLM integration
- React and Material UI for the frontend framework
- Flask for the backend API
- pywhispercpp for python bindings to whisper.cpp 