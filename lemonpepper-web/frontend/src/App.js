import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

// Configure axios
axios.defaults.baseURL = 'http://localhost:8000';

function App() {
  const [settings, setSettings] = useState({
    ollama_host: 'http://localhost:11434',
    ollama_model: 'llama2',
    device_index: '',
    transcription_method: 'whisper',
    whisper_model_path: 'base',
    gain: 1.0,
    prompt_template: '',
    picovoice_access_key: ''
  });
  const [audioDevices, setAudioDevices] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [activeTab, setActiveTab] = useState('settings');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchAudioDevices();
  }, []);

  // Poll for transcription and LLM response when transcribing
  useEffect(() => {
    if (!isTranscribing) return;

    const interval = setInterval(() => {
      fetchTranscription();
      fetchLlmResponse();
    }, 1000);

    return () => clearInterval(interval);
  }, [isTranscribing]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      setSettings(prevSettings => ({
        ...prevSettings,
        ...response.data
      }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load settings');
    }
  };

  const fetchAudioDevices = async () => {
    try {
      const response = await axios.get('/api/audio/devices');
      const devices = Array.isArray(response.data) ? response.data : 
                     Array.isArray(response.data.devices) ? response.data.devices : [];
      setAudioDevices(devices);
    } catch (error) {
      console.error('Error fetching audio devices:', error);
      setError('Failed to load audio devices');
      setAudioDevices([]);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/settings', settings);
      setError('');
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    }
  };

  const startTranscribing = async () => {
    try {
      await axios.post('/api/audio/start', { device_index: parseInt(settings.device_index) });
      setIsTranscribing(true);
      setError('');
    } catch (error) {
      console.error('Error starting transcription:', error);
      setError('Failed to start transcription');
    }
  };

  const stopTranscribing = async () => {
    try {
      await axios.post('/api/audio/stop');
      setIsTranscribing(false);
      setError('');
    } catch (error) {
      console.error('Error stopping transcription:', error);
      setError('Failed to stop transcription');
    }
  };

  const fetchTranscription = async () => {
    try {
      const response = await axios.get('/api/transcription');
      setTranscription(response.data.transcription);
    } catch (error) {
      console.error('Error fetching transcription:', error);
    }
  };

  const fetchLlmResponse = async () => {
    try {
      const response = await axios.get('/api/llm/response');
      setLlmResponse(response.data.response);
    } catch (error) {
      console.error('Error fetching LLM response:', error);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setError('Failed to copy to clipboard');
    }
  };

  const clearTranscription = () => {
    setTranscription('');
    setLlmResponse('');
  };

  return (
    <div className="App">
      <div className="tabs">
        <button 
          className={activeTab === 'settings' ? 'active' : ''} 
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button 
          className={activeTab === 'transcription' ? 'active' : ''} 
          onClick={() => setActiveTab('transcription')}
        >
          Transcription
        </button>
      </div>

      {error && (
        <div className="error-message" style={{ color: '#dc3545', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="settings">
          <h2>Settings</h2>
          <form onSubmit={handleSettingsSubmit}>
            <div className="form-group">
              <label>Ollama Host:</label>
              <input
                type="text"
                value={settings.ollama_host || ''}
                onChange={(e) => setSettings({...settings, ollama_host: e.target.value})}
                placeholder="http://localhost:11434"
              />
            </div>
            <div className="form-group">
              <label>Ollama Model:</label>
              <input
                type="text"
                value={settings.ollama_model || ''}
                onChange={(e) => setSettings({...settings, ollama_model: e.target.value})}
                placeholder="llama2"
              />
            </div>
            <div className="form-group">
              <label>Audio Device:</label>
              <select
                value={settings.device_index || ''}
                onChange={(e) => setSettings({...settings, device_index: e.target.value})}
              >
                <option value="">Select a device</option>
                {Array.isArray(audioDevices) && audioDevices.map((device, index) => (
                  <option key={index} value={index}>
                    {device.name || `Device ${index}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Transcription Method:</label>
              <select
                value={settings.transcription_method || ''}
                onChange={(e) => setSettings({...settings, transcription_method: e.target.value})}
              >
                <option value="whisper">Whisper</option>
                <option value="picovoice">Picovoice</option>
              </select>
            </div>
            {settings.transcription_method === 'whisper' && (
              <div className="form-group">
                <label>Whisper Model Path:</label>
                <input
                  type="text"
                  value={settings.whisper_model_path || ''}
                  onChange={(e) => setSettings({...settings, whisper_model_path: e.target.value})}
                  placeholder="base"
                />
              </div>
            )}
            {settings.transcription_method === 'picovoice' && (
              <div className="form-group">
                <label>Picovoice Access Key:</label>
                <input
                  type="text"
                  value={settings.picovoice_access_key || ''}
                  onChange={(e) => setSettings({...settings, picovoice_access_key: e.target.value})}
                  placeholder="Enter your Picovoice access key"
                />
              </div>
            )}
            <div className="form-group">
              <label>Audio Gain:</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={settings.gain || 1.0}
                onChange={(e) => setSettings({...settings, gain: parseFloat(e.target.value)})}
              />
            </div>
            <div className="form-group">
              <label>Prompt Template:</label>
              <textarea
                value={settings.prompt_template || ''}
                onChange={(e) => setSettings({...settings, prompt_template: e.target.value})}
                placeholder="Enter your prompt template"
                rows="4"
              />
            </div>
            <button type="submit" className="primary">Save Settings</button>
          </form>
        </div>
      )}

      {activeTab === 'transcription' && (
        <div className="transcription">
          <h2>Transcription</h2>
          <div className={`status-indicator ${isTranscribing ? 'recording' : 'not-recording'}`}>
            {isTranscribing ? 'Recording...' : 'Not Recording'}
          </div>
          <div className="transcription-controls">
            <button 
              className="primary"
              onClick={startTranscribing}
              disabled={isTranscribing || !settings.device_index}
            >
              Start Transcribing
            </button>
            <button 
              className="danger"
              onClick={stopTranscribing}
              disabled={!isTranscribing}
            >
              Stop Transcribing
            </button>
            <button 
              className="secondary"
              onClick={clearTranscription}
              disabled={!transcription && !llmResponse}
            >
              Clear
            </button>
          </div>
          <div className="transcription-content">
            <div className="transcription-box">
              <h3>Transcription</h3>
              <div className="box-controls">
                <button 
                  onClick={() => copyToClipboard(transcription)}
                  disabled={!transcription}
                  title="Copy Transcription"
                >
                  Copy
                </button>
              </div>
              <div className="transcription-text">{transcription}</div>
            </div>
            <div className="response-box">
              <h3>LLM Response</h3>
              <div className="box-controls">
                <button 
                  onClick={() => copyToClipboard(llmResponse)}
                  disabled={!llmResponse}
                  title="Copy Response"
                >
                  Copy
                </button>
              </div>
              <div className="response-text">{llmResponse}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 