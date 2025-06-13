import React from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Clear,
  Send,
  ContentCopy
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import AudioLevelDisplay from './AudioLevelDisplay';

const HomeTab = ({ 
  isTranscribing,
  startTranscribing,
  stopTranscribing,
  clearTranscription,
  processTranscription,
  transcription,
  llmResponse,
  audioLevels,
  deviceIndex
}) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Grid container spacing={2} sx={{ height: '100%' }}>
      {/* Left Column - Transcription */}
      <Grid item xs={12} md={6} sx={{ height: '100%' }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            borderLeft: '4px solid #4caf50'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Audio Transcription
            </Typography>
            <Box>
              <Tooltip title={isTranscribing ? "Stop Transcribing" : "Start Transcribing"}>
                <IconButton 
                  color={isTranscribing ? "error" : "success"}
                  onClick={isTranscribing ? stopTranscribing : () => startTranscribing(deviceIndex)}
                  disabled={!deviceIndex && !isTranscribing}
                >
                  {isTranscribing ? <Stop /> : <PlayArrow />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear Transcription">
                <IconButton onClick={clearTranscription}>
                  <Clear />
                </IconButton>
              </Tooltip>
              <Tooltip title="Process Transcription">
                <IconButton 
                  color="primary" 
                  onClick={processTranscription}
                  disabled={!transcription}
                >
                  <Send />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            bgcolor: 'background.default', 
            p: 2, 
            borderRadius: 1,
            mb: 2
          }}>
            <Typography 
              variant="body1" 
              component="div" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '1rem',
                lineHeight: 1.7
              }}
            >
              {transcription || "No transcription yet. Click the play button to start transcribing."}
            </Typography>
          </Box>
          
          <AudioLevelDisplay audioLevels={audioLevels} />
        </Paper>
      </Grid>
      
      {/* Right Column - LLM Response */}
      <Grid item xs={12} md={6} sx={{ height: '100%' }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            borderLeft: '4px solid #2196f3'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              LLM Response
            </Typography>
            <Tooltip title="Copy Response">
              <IconButton 
                onClick={() => copyToClipboard(llmResponse)}
                disabled={!llmResponse}
              >
                <ContentCopy />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            bgcolor: 'background.default', 
            p: 2, 
            borderRadius: 1
          }}>
            {llmResponse ? (
              <ReactMarkdown>
                {llmResponse}
              </ReactMarkdown>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No LLM response yet. Process your transcription to get a response.
              </Typography>
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default HomeTab; 