import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { Clear } from '@mui/icons-material';

const LogTab = () => {
  const [logs, setLogs] = useState([]);
  
  // This is a placeholder for actual log fetching
  // In a real implementation, you would fetch logs from the backend
  // or use WebSockets to stream logs in real-time
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // This would be an actual API call in a real implementation
        // const response = await fetch('/api/logs');
        // const data = await response.json();
        // setLogs(data.logs);
        
        // For now, we'll just show some placeholder logs
        setLogs([
          { timestamp: new Date().toISOString(), level: 'INFO', message: 'Application started' },
          { timestamp: new Date().toISOString(), level: 'INFO', message: 'Settings loaded' },
          { timestamp: new Date().toISOString(), level: 'INFO', message: 'Ollama API initialized' },
        ]);
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };
    
    fetchLogs();
    
    // In a real implementation, you might set up a polling interval or WebSocket
    const interval = setInterval(fetchLogs, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const clearLogs = () => {
    setLogs([]);
    // In a real implementation, you would also call an API to clear logs on the server
  };
  
  const getLogColor = (level) => {
    switch (level) {
      case 'ERROR':
        return '#f44336';
      case 'WARNING':
        return '#ff9800';
      case 'INFO':
        return '#2196f3';
      case 'DEBUG':
        return '#4caf50';
      default:
        return 'inherit';
    }
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Application Logs</Typography>
        <Button 
          variant="outlined" 
          startIcon={<Clear />}
          onClick={clearLogs}
        >
          Clear Logs
        </Button>
      </Box>
      
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          flexGrow: 1, 
          overflow: 'auto',
          bgcolor: '#121212',
          fontFamily: 'monospace'
        }}
      >
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <Box 
              key={index} 
              sx={{ 
                mb: 1, 
                color: getLogColor(log.level),
                fontSize: '0.9rem'
              }}
            >
              <Typography 
                variant="body2" 
                component="span" 
                sx={{ 
                  color: '#aaa', 
                  mr: 1,
                  fontFamily: 'inherit'
                }}
              >
                {new Date(log.timestamp).toLocaleTimeString()}
              </Typography>
              <Typography 
                variant="body2" 
                component="span" 
                sx={{ 
                  fontWeight: 'bold',
                  mr: 1,
                  fontFamily: 'inherit'
                }}
              >
                [{log.level}]
              </Typography>
              <Typography 
                variant="body2" 
                component="span"
                sx={{ fontFamily: 'inherit' }}
              >
                {log.message}
              </Typography>
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No logs to display
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default LogTab; 