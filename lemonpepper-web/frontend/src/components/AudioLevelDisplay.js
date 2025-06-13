import React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

const AudioLevelDisplay = ({ audioLevels }) => {
  const { levels, peak_levels } = audioLevels;
  
  // Normalize dB values for display
  const normalizeDB = (dbValue) => {
    // Convert dB to a 0-100 scale for visualization
    // Typical values range from -60dB (silence) to 0dB (max)
    const minDB = -60;
    const maxDB = 0;
    return Math.max(0, Math.min(100, ((dbValue - minDB) / (maxDB - minDB)) * 100));
  };
  
  const normalizedLevels = levels.map(normalizeDB);
  const normalizedPeaks = peak_levels.map(normalizeDB);
  
  // Prepare data for the chart
  const data = [
    { name: 'Left', level: normalizedLevels[0], peak: normalizedPeaks[0] },
    { name: 'Right', level: normalizedLevels[1], peak: normalizedPeaks[1] }
  ];
  
  // Determine color based on level
  const getBarColor = (value) => {
    if (value < 30) return '#4caf50'; // Green for low levels
    if (value < 70) return '#ff9800'; // Orange for medium levels
    return '#f44336'; // Red for high levels
  };
  
  return (
    <Box sx={{ height: '80px', width: '100%' }}>
      <Typography variant="caption" sx={{ mb: 1 }}>
        Audio Levels
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis dataKey="name" type="category" hide />
          <Bar dataKey="level" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.level)} />
            ))}
          </Bar>
          <Bar dataKey="peak" radius={[0, 4, 4, 0]} fill="rgba(255,255,255,0.3)" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AudioLevelDisplay; 