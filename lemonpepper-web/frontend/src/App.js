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
    }
  };

  const fetchAudioDevices = async () => {
    try {
      const response = await axios.get('/api/audio/devices');
      // Ensure we're setting an array of devices
      const devices = Array.isArray(response.data) ? response.data : 
                     Array.isArray(response.data.devices) ? response.data.devices : [];
      setAudioDevices(devices);
    } catch (error) {
      console.error('Error fetching audio devices:', error);
      setAudioDevices([]); // Set empty array on error
    }
  };

  const fetchTranscription = async () => {
    try {
      const response = await axios.get('/api/transcription');
      setTranscription(response.data.transcription || '');
    } catch (error) {
      console.error('Error fetching transcription:', error);
    }
  };

  const fetchLlmResponse = async () => {
    try {
      const response = await axios.get('/api/llm/response');
      setLlmResponse(response.data.response || '');
    } catch (error) {
      console.error('Error fetching LLM response:', error);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/settings', settings);
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  const startTranscribing = async () => {
    try {
      if (!settings.device_index) {
        alert('Please select an audio device first');
        return;
      }
      
      const response = await axios.post('/api/audio/start', { 
        device_index: parseInt(settings.device_index) 
      });
      
      if (response.data.message === "Recording started") {
        setIsTranscribing(true);
      } else {
        alert(response.data.message || 'Failed to start transcription');
      }
    } catch (error) {
      console.error('Error starting transcription:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to start transcription';
      alert(`Error: ${errorMessage}`);
    }
  };

  const stopTranscribing = async () => {
    try {
      await axios.post('/api/audio/stop');
      setIsTranscribing(false);
    } catch (error) {
      console.error('Error stopping transcription:', error);
      alert('Failed to stop transcription');
    }
  };

  const clearTranscription = () => {
    setTranscription('');
    setLlmResponse('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('Copied to clipboard!'))
      .catch(err => console.error('Failed to copy:', err));
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
                value={settings.transcription_method || 'whisper'}
                onChange={(e) => setSettings({...settings, transcription_method: e.target.value})}
              >
                <option value="whisper">Whisper</option>
                <option value="picovoice">Picovoice</option>
              </select>
            </div>
            {settings.transcription_method === 'whisper' && (
              <div className="form-group">
                <label>Whisper Model:</label>
                <select
                  value={settings.whisper_model_path || 'base'}
                  onChange={(e) => setSettings({...settings, whisper_model_path: e.target.value})}
                >
                  <option value="base">Base</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
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
              <label>Gain:</label>
              <input
                type="number"
                value={settings.gain || 1.0}
                onChange={(e) => setSettings({...settings, gain: parseFloat(e.target.value)})}
                step="0.1"
                min="0.1"
                max="10.0"
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
            <button type="submit">Save Settings</button>
          </form>
        </div>
      )}

      {activeTab === 'transcription' && (
        <div className="transcription">
          <h2>Transcription</h2>
          <div className="controls">
            <button onClick={isTranscribing ? stopTranscribing : startTranscribing}>
              {isTranscribing ? 'Stop Transcribing' : 'Start Transcribing'}
            </button>
            <button onClick={clearTranscription} disabled={!transcription && !llmResponse}>
              Clear
            </button>
            <button onClick={() => copyToClipboard(transcription)} disabled={!transcription}>
              Copy Transcription
            </button>
            <button onClick={() => copyToClipboard(llmResponse)} disabled={!llmResponse}>
              Copy Response
            </button>
          </div>
          <div className="transcription-content">
            <div>
              <h3>Transcription:</h3>
              <p>{transcription || "No transcription yet. Click the Start button to begin transcribing."}</p>
            </div>
            <div>
              <h3>LLM Response:</h3>
              <p>{llmResponse || "No LLM response yet. Process your transcription to get a response."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 