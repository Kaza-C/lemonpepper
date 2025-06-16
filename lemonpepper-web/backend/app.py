from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
import os
import json
import threading
import time
import logging
import sounddevice as sd
import numpy as np
import ollama
import queue
import appdirs
import sys
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..'))
from lemonpepper.transcribe_audio_whisper import WhisperStreamTranscriber
from lemonpepper.ollama_api import OllamaAPI
from lemonpepper.utils import get_model_directory
import whisper
import pvcheetah

# Configure logging
logging.basicConfig(level=logging.DEBUG, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create FastAPI app with CORS configuration
app = FastAPI(
    title="LemonPepper API",
    description="API for LemonPepper audio transcription and LLM processing",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return Response(
        content='{"message": "Welcome to LemonPepper API", "docs": "/docs"}',
        media_type="application/json",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Global state
transcriber = None
ollama_api = None
audio_queue = queue.Queue()
is_recording = False
current_transcription = ""
current_llm_response = ""
model = None
cheetah = None

# Pydantic models for request/response validation
class Settings(BaseModel):
    ollama_host: Optional[str] = None
    ollama_model: Optional[str] = None
    device_index: Optional[int] = None
    transcription_method: Optional[str] = None
    whisper_model_path: Optional[str] = None
    gain: Optional[float] = None
    prompt_template: Optional[str] = None
    picovoice_access_key: Optional[str] = None

class AudioStartRequest(BaseModel):
    device_index: int

def get_settings_path():
    app_data_dir = appdirs.user_data_dir("lemonpepper", "lemonpepper")
    os.makedirs(app_data_dir, exist_ok=True)
    return os.path.join(app_data_dir, "settings.json")

def save_settings(new_settings: dict):
    settings_path = get_settings_path()
    with open(settings_path, 'w') as f:
        json.dump(new_settings, f)
    logger.info(f"Settings saved to {settings_path}")

def load_settings() -> dict:
    settings_path = get_settings_path()
    if os.path.exists(settings_path):
        try:
            with open(settings_path, 'r') as f:
                loaded_settings = json.load(f)
                logger.info(f"Settings loaded from {settings_path}")
                return loaded_settings
        except Exception as e:
            logger.error(f"Error loading settings: {e}")
            return {}
    return {}

def audio_callback(indata, frames, time, status):
    if status:
        logger.warning(f"Audio callback status: {status}")
    if is_recording:
        try:
            # Convert to mono if needed
            if indata.shape[1] > 1:
                audio_data = np.mean(indata, axis=1)
            else:
                audio_data = indata.flatten()
            
            # Check if audio data is not silent
            if np.abs(audio_data).mean() > 0.01:  # Adjust threshold as needed
                logger.info(f"Received audio data, mean amplitude: {np.abs(audio_data).mean()}")
                audio_queue.put(audio_data.copy())
            else:
                logger.debug("Silent audio frame received")
        except Exception as e:
            logger.error(f"Error in audio callback: {str(e)}")

def initialize_ollama_api():
    global ollama_api
    settings = load_settings()
    if not settings.get('ollama_host') or not settings.get('ollama_model'):
        logger.warning("Ollama settings not configured")
        return
    
    try:
        ollama_api = OllamaAPI(
            host=settings['ollama_host'],
            model=settings['ollama_model']
        )
        logger.info("Ollama API initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Ollama API: {e}")
        raise

def initialize_transcriber():
    global transcriber
    settings = load_settings()
    if not settings.get('transcription_method'):
        logger.warning("Transcription method not configured")
        return
    
    try:
        if settings['transcription_method'] == 'whisper':
            model_path = settings.get('whisper_model_path')
            if not model_path:
                model_path = os.path.join(get_model_directory(), "whisper", "base.en")
            
            transcriber = WhisperStreamTranscriber(
                model_path=model_path,
                device="cpu"
            )
            logger.info("Whisper transcriber initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize transcriber: {e}")
        raise

def start_services():
    global is_recording
    settings = load_settings()
    
    if settings.get('device_index') is not None:
        try:
            sd.InputStream(
                device=settings['device_index'],
                channels=2,
                callback=audio_callback,
                blocksize=1024,
                samplerate=16000
            ).start()
            is_recording = True
            logger.info("Audio recording started")
        except Exception as e:
            logger.error(f"Failed to start audio recording: {e}")
            raise

def stop_services():
    global is_recording
    is_recording = False
    logger.info("Services stopped")

# API Routes
@app.get("/api/settings")
async def get_settings():
    try:
        settings = load_settings()
        logger.debug(f"Returning settings: {settings}")
        return settings
    except Exception as e:
        logger.error(f"Error loading settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings")
async def update_settings(settings: Settings):
    try:
        current_settings = load_settings()
        new_settings = settings.dict(exclude_unset=True)
        current_settings.update(new_settings)
        save_settings(current_settings)
        
        # Reinitialize components if necessary
        if 'ollama_host' in new_settings or 'ollama_model' in new_settings:
            initialize_ollama_api()
        
        if 'transcription_method' in new_settings or 'whisper_model_path' in new_settings:
            initialize_transcriber()
        
        return {"message": "Settings updated successfully"}
    except Exception as e:
        logger.error(f"Error saving settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/audio/devices")
async def get_audio_devices():
    try:
        devices = sd.query_devices()
        return {"devices": [
            {
                "id": i,
                "name": device["name"],
                "input_channels": device["max_input_channels"],
                "output_channels": device["max_output_channels"]
            }
            for i, device in enumerate(devices)
            if device["max_input_channels"] > 0
        ]}
    except Exception as e:
        logger.error(f"Error getting audio devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audio/start")
async def start_audio(request: AudioStartRequest):
    try:
        global is_recording, model, cheetah
        if is_recording:
            return {"message": "Already recording"}
        
        logger.info(f"Starting audio recording with device index: {request.device_index}")
        logger.info(f"Current settings: {settings.dict()}")
        
        # Validate device index
        devices = sd.query_devices()
        if request.device_index >= len(devices):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid device index. Available devices: {len(devices)}"
            )
        
        # Check if device has input channels
        device = devices[request.device_index]
        if device['max_input_channels'] == 0:
            raise HTTPException(
                status_code=400,
                detail=f"Selected device has no input channels"
            )
        
        try:
            # Initialize transcription model first
            if not settings.transcription_method:
                raise HTTPException(
                    status_code=400,
                    detail="No transcription method selected"
                )
                
            logger.info(f"Using transcription method: {settings.transcription_method}")
            
            if settings.transcription_method == "whisper":
                if not settings.whisper_model_path:
                    raise HTTPException(
                        status_code=400,
                        detail="Whisper model path not set in settings"
                    )
                    
                if not model:
                    logger.info("Initializing Whisper model...")
                    try:
                        initialize_whisper()
                        logger.info("Whisper model initialized successfully")
                    except Exception as e:
                        logger.error(f"Failed to initialize Whisper model: {str(e)}")
                        raise HTTPException(
                            status_code=500,
                            detail=f"Failed to initialize Whisper model: {str(e)}"
                        )
            elif settings.transcription_method == "picovoice":
                if not settings.picovoice_access_key:
                    raise HTTPException(
                        status_code=400,
                        detail="Picovoice access key not set in settings"
                    )
                    
                if not cheetah:
                    logger.info("Initializing Picovoice...")
                    try:
                        initialize_picovoice()
                        logger.info("Picovoice initialized successfully")
                    except Exception as e:
                        logger.error(f"Failed to initialize Picovoice: {str(e)}")
                        raise HTTPException(
                            status_code=500,
                            detail=f"Failed to initialize Picovoice: {str(e)}"
                        )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid transcription method: {settings.transcription_method}"
                )
            
            # Use the device's actual number of input channels
            channels = device['max_input_channels']
            logger.info(f"Using {channels} input channels for device {device['name']}")
            
            # Start the audio stream
            try:
                stream = sd.InputStream(
                    device=request.device_index,
                    channels=channels,
                    callback=audio_callback,
                    blocksize=1024,
                    samplerate=16000
                )
                stream.start()
                is_recording = True
                logger.info("Audio recording started successfully")
                return {"message": "Recording started"}
            except Exception as e:
                logger.error(f"Error starting audio stream: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to start audio stream: {str(e)}"
                )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in start_audio: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected error: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in start_audio: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.post("/api/audio/stop")
async def stop_audio():
    try:
        global is_recording
        is_recording = False
        return {"message": "Recording stopped"}
    except Exception as e:
        logger.error(f"Error stopping audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/transcription")
async def get_transcription():
    return {"transcription": current_transcription}

@app.post("/api/transcription/clear")
async def clear_transcription():
    global current_transcription, current_llm_response
    current_transcription = ""
    current_llm_response = ""
    return {"message": "Transcription cleared"}

@app.get("/api/llm/response")
async def get_llm_response():
    return {"response": current_llm_response}

@app.post("/api/llm/process")
async def process_transcription():
    try:
        global current_llm_response
        if not current_transcription:
            raise HTTPException(status_code=400, detail="No transcription to process")
        
        if not ollama_api:
            raise HTTPException(status_code=500, detail="Ollama API not initialized")
        
        response = ollama_api.generate(current_transcription)
        current_llm_response = response
        return {"message": "Transcription processed"}
    except Exception as e:
        logger.error(f"Error processing transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def initialize_whisper():
    global model
    try:
        if not settings.whisper_model_path:
            raise ValueError("Whisper model path not set in settings")
        
        logger.info(f"Loading Whisper model from {settings.whisper_model_path}")
        model = whisper.load_model(settings.whisper_model_path)
        logger.info("Whisper model loaded successfully")
    except Exception as e:
        logger.error(f"Error initializing Whisper: {str(e)}")
        raise

def initialize_picovoice():
    global cheetah
    try:
        if not settings.picovoice_access_key:
            raise ValueError("Picovoice access key not set in settings")
        
        logger.info("Initializing Picovoice Cheetah")
        cheetah = pvcheetah.create(access_key=settings.picovoice_access_key)
        logger.info("Picovoice Cheetah initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing Picovoice: {str(e)}")
        raise

if __name__ == '__main__':
    import uvicorn
    try:
        # Load settings on startup
        logger.info("Loading settings...")
        load_settings()
        
        # Initialize components
        logger.info("Initializing Ollama API...")
        try:
            initialize_ollama_api()
        except Exception as e:
            logger.error(f"Failed to initialize Ollama API: {e}")
            # Continue without Ollama for now
            ollama_api = None
        
        logger.info("Initializing transcriber...")
        try:
            initialize_transcriber()
        except Exception as e:
            logger.error(f"Failed to initialize transcriber: {e}")
            # Continue without transcriber for now
            transcriber = None
        
        # Start background workers
        logger.info("Starting background workers...")
        try:
            start_services()
        except Exception as e:
            logger.error(f"Failed to start services: {e}")
            # Continue without background workers for now
        
        logger.info("Starting FastAPI server...")
        uvicorn.run(app, host="127.0.0.1", port=5000)
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
    except Exception as e:
        logger.error(f"Critical error starting server: {e}", exc_info=True)
        raise
    finally:
        logger.info("Stopping services...")
        stop_services() 