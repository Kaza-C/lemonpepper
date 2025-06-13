import traceback
try:
    from flask import Flask, request, jsonify, Response
    from flask_cors import CORS
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
except Exception:
    print("IMPORT ERROR:")
    traceback.print_exc()
    exit(1)

print("Python path:", sys.path)
print("Python executable:", sys.executable)

# Configure logging
logging.basicConfig(level=logging.DEBUG, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
logger.debug("Flask app created")

CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5000", "http://127.0.0.1:5000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
logger.debug("CORS configured")

# Global state
transcriber = None
ollama_api = None
audio_queue = queue.Queue(maxsize=100)
transcription_buffer = []
audio_levels = [float('-inf')] * 2
peak_levels = [float('-inf')] * 2
audio_lock = threading.Lock()
is_transcribing = False
transcription_thread = None
processing_thread = None
stop_event = threading.Event()
settings = {
    'ollama_host': 'http://localhost:11434',
    'ollama_model': 'llama3.2',
    'transcription_method': 'whisper',
    'whisper_model_path': None,
    'device_index': None,
    'gain': 1.0,
    'prompt_template': 'default',
    'picovoice_access_key': ''
}

def get_settings_path():
    app_data_dir = appdirs.user_data_dir("lemonpepper-web", "lemonpepper")
    os.makedirs(app_data_dir, exist_ok=True)
    return os.path.join(app_data_dir, "settings.json")

def save_settings():
    settings_path = get_settings_path()
    with open(settings_path, 'w') as f:
        json.dump(settings, f)
    logger.info(f"Settings saved to {settings_path}")

def load_settings():
    settings_path = get_settings_path()
    if os.path.exists(settings_path):
        try:
            with open(settings_path, 'r') as f:
                loaded_settings = json.load(f)
                settings.update(loaded_settings)
            logger.info(f"Settings loaded from {settings_path}")
        except Exception as e:
            logger.error(f"Error loading settings: {e}")

def audio_callback(indata, frames, time, status):
    if status:
        logger.warning(f"Audio callback status: {status}")
    
    # Calculate RMS for each channel
    rms_levels = [np.sqrt(np.mean(indata[:, i]**2)) for i in range(indata.shape[1])]
    # Convert to dB, avoiding log(0)
    db_levels = [20 * np.log10(max(level, 1e-7)) for level in rms_levels]
    
    with audio_lock:
        global audio_levels, peak_levels
        audio_levels = db_levels
        peak_levels = [max(current, peak) for current, peak in zip(db_levels, peak_levels)]
    
    # Add audio data to queue for processing
    audio_queue.put(np.frombuffer(indata, dtype=np.float32))

def transcription_worker():
    global transcription_buffer
    
    while not stop_event.is_set():
        if transcriber and is_transcribing:
            try:
                # Process audio in the queue
                if not audio_queue.empty():
                    audio_data = audio_queue.get(timeout=0.1)
                    # This would be handled differently based on the transcription method
                    # For now, we're simulating the transcription
                    if ollama_api:
                        ollama_api.add_transcription("Simulated transcription")
            except queue.Empty:
                pass
            except Exception as e:
                logger.error(f"Error in transcription worker: {e}")
        time.sleep(0.1)

def processing_worker():
    while not stop_event.is_set():
        if ollama_api:
            should_process, metrics = ollama_api.should_process()
            if should_process:
                try:
                    logger.info("Processing transcription")
                    ollama_api.process_transcription()
                except Exception as e:
                    logger.error(f"Error processing transcription: {e}")
        time.sleep(1)  # Check every second

def initialize_transcriber():
    global transcriber
    
    if settings['transcription_method'] == 'whisper':
        model_dir = get_model_directory()
        model_path = os.path.join(model_dir, f"{settings['whisper_model_path']}.bin")
        
        if os.path.exists(model_path):
            logger.info(f"Initializing WhisperStreamTranscriber with model: {model_path}")
            transcriber = WhisperStreamTranscriber(model_path)
        else:
            logger.error(f"Whisper model not found at {model_path}")
    else:
        # Handle other transcription methods
        logger.warning("Only whisper transcription is currently supported")

def initialize_ollama_api():
    global ollama_api
    
    try:
        logger.info(f"Initializing OllamaAPI with host: {settings['ollama_host']} and model: {settings['ollama_model']}")
        ollama_api = OllamaAPI(host=settings['ollama_host'], model=settings['ollama_model'])
        logger.info("OllamaAPI initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize OllamaAPI: {e}", exc_info=True)
        # Don't raise the exception, just log it and continue
        ollama_api = None

def start_services():
    global transcription_thread, processing_thread, is_transcribing
    
    if not transcription_thread or not transcription_thread.is_alive():
        stop_event.clear()
        transcription_thread = threading.Thread(target=transcription_worker, daemon=True)
        transcription_thread.start()
    
    if not processing_thread or not processing_thread.is_alive():
        processing_thread = threading.Thread(target=processing_worker, daemon=True)
        processing_thread.start()
    
    is_transcribing = True

def stop_services():
    global is_transcribing
    
    is_transcribing = False
    stop_event.set()
    
    if transcription_thread and transcription_thread.is_alive():
        transcription_thread.join(timeout=2)
    
    if processing_thread and processing_thread.is_alive():
        processing_thread.join(timeout=2)

# API Routes
@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify(settings)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    new_settings = request.json
    settings.update(new_settings)
    save_settings()
    
    # Reinitialize components if necessary
    if 'ollama_host' in new_settings or 'ollama_model' in new_settings:
        initialize_ollama_api()
    
    if 'transcription_method' in new_settings or 'whisper_model_path' in new_settings:
        initialize_transcriber()
    
    return jsonify({"status": "success", "settings": settings})

@app.route('/api/audio/devices', methods=['GET'])
def get_audio_devices():
    try:
        devices = sd.query_devices()
        return jsonify({
            "devices": [
                {
                    "id": i,
                    "name": device['name'],
                    "input_channels": device['max_input_channels'],
                    "output_channels": device['max_output_channels']
                }
                for i, device in enumerate(devices)
            ]
        })
    except Exception as e:
        logger.error(f"Error getting audio devices: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/audio/start', methods=['POST'])
def start_audio():
    try:
        device_index = request.json.get('device_index', None)
        if device_index is not None:
            settings['device_index'] = device_index
            save_settings()
        
        # Initialize components if not already done
        if not transcriber:
            initialize_transcriber()
        
        if not ollama_api:
            initialize_ollama_api()
        
        # Start the input stream
        input_stream = sd.InputStream(
            callback=audio_callback,
            channels=2,
            samplerate=16000,
            blocksize=4096,
            device=settings['device_index']
        )
        input_stream.start()
        
        # Start background workers
        start_services()
        
        return jsonify({"status": "started"})
    except Exception as e:
        logger.error(f"Error starting audio: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/audio/stop', methods=['POST'])
def stop_audio():
    try:
        stop_services()
        return jsonify({"status": "stopped"})
    except Exception as e:
        logger.error(f"Error stopping audio: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/audio/levels', methods=['GET'])
def get_audio_levels():
    with audio_lock:
        return jsonify({
            "levels": audio_levels,
            "peak_levels": peak_levels
        })

@app.route('/api/transcription', methods=['GET'])
def get_transcription():
    if ollama_api:
        return jsonify({
            "transcription": ollama_api.get_transcription()
        })
    return jsonify({"transcription": ""})

@app.route('/api/transcription/clear', methods=['POST'])
def clear_transcription():
    if ollama_api:
        ollama_api.clear_transcription()
    return jsonify({"status": "cleared"})

@app.route('/api/llm/response', methods=['GET'])
def get_llm_response():
    if ollama_api:
        return jsonify({
            "response": ollama_api.get_responses()
        })
    return jsonify({"response": ""})

@app.route('/api/llm/process', methods=['POST'])
def process_transcription():
    if ollama_api:
        response = ollama_api.process_transcription(force=True)
        return jsonify({"response": response})
    return jsonify({"error": "Ollama API not initialized"}), 500

@app.route('/api/ollama/models', methods=['GET'])
def get_ollama_models():
    try:
        client = ollama.Client(host=settings['ollama_host'])
        models = client.list()
        return jsonify(models)
    except Exception as e:
        logger.error(f"Error getting Ollama models: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/whisper/models', methods=['GET'])
def get_whisper_models():
    model_dir = get_model_directory()
    models = []
    
    if os.path.exists(model_dir):
        for file in os.listdir(model_dir):
            if file.endswith('.bin'):
                models.append(file.replace('.bin', ''))
    
    return jsonify({"models": models})

@app.route('/api/whisper/download', methods=['POST'])
def download_whisper_model():
    model_name = request.json.get('model_name')
    # This would be a placeholder for the actual download logic
    # In a real implementation, you'd download the model asynchronously
    return jsonify({"status": "downloading", "model": model_name})

if __name__ == '__main__':
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
        
        logger.info("Starting Flask server...")
        # Run the Flask app with explicit host and port
        app.run(host='127.0.0.1', port=5000, debug=True)
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
    except Exception as e:
        logger.error(f"Critical error starting server: {e}", exc_info=True)
        raise
    finally:
        logger.info("Stopping services...")
        stop_services()
        # Clean up any remaining resources
        if transcriber:
            try:
                transcriber.cleanup()
            except:
                pass
        if ollama_api:
            try:
                ollama_api.cleanup()
            except:
                pass 