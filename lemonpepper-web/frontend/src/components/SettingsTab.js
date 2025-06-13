import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  Slider,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  IconButton
} from '@mui/material';
import { Refresh, Download } from '@mui/icons-material';

const SettingsTab = ({
  settings,
  updateSettings,
  audioDevices,
  ollamaModels,
  whisperModels,
  downloadWhisperModel,
  fetchOllamaModels
}) => {
  const [ollamaHost, setOllamaHost] = useState(settings.ollama_host);
  const [selectedModel, setSelectedModel] = useState(settings.ollama_model);
  const [selectedDevice, setSelectedDevice] = useState(settings.device_index);
  const [gain, setGain] = useState(settings.gain);
  const [transcriptionMethod, setTranscriptionMethod] = useState(settings.transcription_method);
  const [selectedWhisperModel, setSelectedWhisperModel] = useState(settings.whisper_model_path);
  const [picovoiceKey, setPicovoiceKey] = useState(settings.picovoice_access_key || '');
  const [promptTemplate, setPromptTemplate] = useState(settings.prompt_template);

  const handleOllamaSettingsUpdate = () => {
    updateSettings({
      ollama_host: ollamaHost,
      ollama_model: selectedModel
    });
  };

  const handleAudioSettingsUpdate = () => {
    updateSettings({
      device_index: selectedDevice,
      gain: gain
    });
  };

  const handleTranscriptionSettingsUpdate = () => {
    updateSettings({
      transcription_method: transcriptionMethod,
      whisper_model_path: selectedWhisperModel
    });
  };

  const handlePicovoiceUpdate = () => {
    updateSettings({
      picovoice_access_key: picovoiceKey
    });
  };

  const handlePromptTemplateUpdate = () => {
    updateSettings({
      prompt_template: promptTemplate
    });
  };

  return (
    <Grid container spacing={3}>
      {/* Ollama API Settings */}
      <Grid item xs={12}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ollama API Settings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ollama Host"
                value={ollamaHost}
                onChange={(e) => setOllamaHost(e.target.value)}
                margin="normal"
                variant="outlined"
                helperText="Example: http://localhost:11434"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Select Ollama Model</InputLabel>
                  <Select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    label="Select Ollama Model"
                  >
                    {ollamaModels.map((model) => (
                      <MenuItem key={model.name} value={model.name}>
                        {model.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Select an LLM model from Ollama</FormHelperText>
                </FormControl>
                <IconButton 
                  sx={{ ml: 1 }} 
                  onClick={fetchOllamaModels}
                  title="Refresh Models"
                >
                  <Refresh />
                </IconButton>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleOllamaSettingsUpdate}
              >
                Update Ollama Settings
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Audio Device Settings */}
      <Grid item xs={12}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Audio Device Settings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <FormControl fullWidth variant="outlined" margin="normal">
                <InputLabel>Select Audio Device</InputLabel>
                <Select
                  value={selectedDevice !== null ? selectedDevice : ''}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  label="Select Audio Device"
                >
                  {audioDevices.map((device) => (
                    <MenuItem key={device.id} value={device.id}>
                      {device.name} (in: {device.input_channels}, out: {device.output_channels})
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select an audio input device</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ mt: 3 }}>
                <Typography gutterBottom>Gain: {gain.toFixed(1)}x</Typography>
                <Slider
                  value={gain}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  onChange={(_, newValue) => setGain(newValue)}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleAudioSettingsUpdate}
              >
                Update Audio Settings
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Transcription Settings */}
      <Grid item xs={12}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Transcription Settings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <RadioGroup
                  row
                  value={transcriptionMethod}
                  onChange={(e) => setTranscriptionMethod(e.target.value)}
                >
                  <FormControlLabel value="whisper" control={<Radio />} label="OpenAI Whisper" />
                  <FormControlLabel value="vosk" control={<Radio />} label="Alpha Cephei Vosk" disabled />
                </RadioGroup>
                <FormHelperText>Select transcription method</FormHelperText>
              </FormControl>
            </Grid>
            
            {transcriptionMethod === 'whisper' && (
              <>
                <Grid item xs={12} md={8}>
                  <FormControl fullWidth variant="outlined" margin="normal">
                    <InputLabel>Select Whisper Model</InputLabel>
                    <Select
                      value={selectedWhisperModel || ''}
                      onChange={(e) => setSelectedWhisperModel(e.target.value)}
                      label="Select Whisper Model"
                    >
                      {whisperModels.map((model) => (
                        <MenuItem key={model} value={model}>
                          {model}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>Select a Whisper model</FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={() => downloadWhisperModel('base.en')}
                    >
                      Download Base English Model
                    </Button>
                  </Box>
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleTranscriptionSettingsUpdate}
              >
                Update Transcription Settings
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Prompt Template Settings */}
      <Grid item xs={12}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Prompt Template Settings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <RadioGroup
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                >
                  <FormControlLabel value="default" control={<Radio />} label="Default (with coding)" />
                  <FormControlLabel value="non_coding_interview" control={<Radio />} label="Non-coding Interview" />
                </RadioGroup>
                <FormHelperText>Select a prompt template for the LLM</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handlePromptTemplateUpdate}
              >
                Update Prompt Template
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* TTS Settings */}
      <Grid item xs={12}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Text-to-Speech Settings (Experimental)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Optional: For TTS functionality, enter your Picovoice Orca access key
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Picovoice Orca Access Key"
                value={picovoiceKey}
                onChange={(e) => setPicovoiceKey(e.target.value)}
                margin="normal"
                variant="outlined"
                helperText="Get an access key from https://picovoice.ai/platform/orca/"
              />
            </Grid>
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handlePicovoiceUpdate}
                disabled={!picovoiceKey}
              >
                Save TTS Settings
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default SettingsTab; 