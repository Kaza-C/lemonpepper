import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

// Configure axios
axios.defaults.baseURL = 'http://localhost:8000';

function App() {
  const [settings, setSettings] = useState({
    ollama_host: 'http://localhost:11434',
    ollama_model: '',
    device_index: null,
    transcription_method: 'whisper',  // Default to whisper
    whisper_model_path: 'base',       // Default to base model
    gain: 1.0,
    prompt_template: '',
    picovoice_access_key: ''
  });
  const [audioDevices, setAudioDevices] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [llmResponse, setLlmResponse] = useState('');
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    // Load settings on component mount
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
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      await axios.post('/api/settings', newSettings);
      setSettings(prev => ({ ...prev, ...newSettings }));
      alert('Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings');
    }
  };

  const fetchAudioDevices = async () => {
    try {
      const response = await axios.get('/api/audio/devices');
      setAudioDevices(response.data.devices || []);
    } catch (error) {
      console.error('Error fetching audio devices:', error);
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

  const fetchTranscription = async () => {
    try {
      const response = await axios.get('/api/transcription');
      setTranscription(response.data.transcription);
    } catch (error) {
      console.error('Error fetching transcription:', error);
    }
  };

  const clearTranscription = async () => {
    try {
      await axios.post('/api/transcription/clear');
      setTranscription('');
      setLlmResponse('');
    } catch (error) {
      console.error('Error clearing transcription:', error);
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

  const processTranscription = async () => {
    try {
      await axios.post('/api/llm/process');
      fetchLlmResponse();
    } catch (error) {
      console.error('Error processing transcription:', error);
      alert('Failed to process transcription');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const renderHomeTab = () => (
    <div className="tab-content">
      <div className="columns">
        <div className="column">
          <div className="panel">
            <h2>Audio Transcription</h2>
            <div className="controls">
              <button 
                onClick={isTranscribing ? stopTranscribing : startTranscribing}
                disabled={!settings.device_index && !isTranscribing}
                className={isTranscribing ? 'btn-danger' : 'btn-success'}
              >
                {isTranscribing ? 'Stop' : 'Start'} Transcribing
              </button>
              <button onClick={clearTranscription} className="btn-secondary">
                Clear
              </button>
              <button 
                onClick={processTranscription} 
                disabled={!transcription}
                className="btn-primary"
              >
                Process
              </button>
            </div>
            <div className="content-box">
              {transcription || "No transcription yet. Click the Start button to begin transcribing."}
            </div>
          </div>
        </div>
        <div className="column">
          <div className="panel">
            <h2>LLM Response</h2>
            <div className="controls">
              <button 
                onClick={() => copyToClipboard(llmResponse)}
                disabled={!llmResponse}
                className="btn-secondary"
              >
                Copy
              </button>
            </div>
            <div className="content-box">
              {llmResponse || "No LLM response yet. Process your transcription to get a response."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="tab-content">
      <div className="panel">
        <h2>Ollama API Settings</h2>
        <div className="form-group">
          <label>Ollama Host:</label>
          <input 
            type="text" 
            value={settings.ollama_host} 
            onChange={(e) => setSettings({...settings, ollama_host: e.target.value})}
            placeholder="http://localhost:11434"
          />
        </div>
        <div className="form-group">
          <label>Ollama Model:</label>
          <input 
            type="text" 
            value={settings.ollama_model} 
            onChange={(e) => setSettings({...settings, ollama_model: e.target.value})}
            placeholder="llama3.2"
          />
        </div>
        <div className="form-group">
          <label>Transcription Method:</label>
          <select
            value={settings.transcription_method}
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
              value={settings.whisper_model_path}
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
              value={settings.picovoice_access_key}
              onChange={(e) => setSettings({...settings, picovoice_access_key: e.target.value})}
              placeholder="Enter your Picovoice access key"
            />
          </div>
        )}
        <div className="form-group">
          <label>Gain:</label>
          <input
            type="number"
            value={settings.gain}
            onChange={(e) => setSettings({...settings, gain: parseFloat(e.target.value)})}
            step="0.1"
            min="0.1"
            max="10.0"
          />
        </div>
        <div className="form-group">
          <label>Prompt Template:</label>
          <textarea
            value={settings.prompt_template}
            onChange={(e) => setSettings({...settings, prompt_template: e.target.value})}
            placeholder="Enter your prompt template"
            rows="4"
          />
        </div>
        <button 
          onClick={() => updateSettings({
            ollama_host: settings.ollama_host,
            ollama_model: settings.ollama_model,
            transcription_method: settings.transcription_method,
            whisper_model_path: settings.whisper_model_path,
            gain: settings.gain,
            prompt_template: settings.prompt_template,
            picovoice_access_key: settings.picovoice_access_key
          })}
          className="btn-primary"
        >
          Update Ollama Settings
        </button>
      </div>

      <div className="panel">
        <h2>Audio Device Settings</h2>
        <div className="form-group">
          <label>Select Audio Device:</label>
          <select 
            value={settings.device_index || ''} 
            onChange={(e) => setSettings({...settings, device_index: e.target.value ? Number(e.target.value) : null})}
          >
            <option value="">Select a device</option>
            {audioDevices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} (in: {device.input_channels}, out: {device.output_channels})
              </option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => updateSettings({
            device_index: settings.device_index
          })}
          className="btn-primary"
        >
          Update Audio Settings
        </button>
      </div>
    </div>
  );

  return (
    <div className="app">
      <header>
        <h1>LemonPepper Web</h1>
        <nav>
          <button 
            className={activeTab === 'home' ? 'active' : ''} 
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
          <button 
            className={activeTab === 'settings' ? 'active' : ''} 
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
      </header>
      <main>
        {activeTab === 'home' ? renderHomeTab() : renderSettingsTab()}
      </main>
    </div>
  );
}

export default App; 