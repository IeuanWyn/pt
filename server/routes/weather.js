const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { query } = require('../services/db');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'training-plan-app/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

// WMO weather interpretation codes → label + emoji
function describeWeatherCode(code) {
  if (code === 0) return { label: 'Clear sky', icon: '☀️', bad: false };
  if (code <= 3) return { label: 'Partly cloudy', icon: '⛅', bad: false };
  if (code <= 48) return { label: 'Foggy', icon: '🌫️', bad: false };
  if (code <= 67) return { label: 'Rain / drizzle', icon: '🌧️', bad: true };
  if (code <= 77) return { label: 'Snow', icon: '🌨️', bad: true };
  if (code <= 82) return { label: 'Rain showers', icon: '🌦️', bad: true };
  if (code <= 86) return { label: 'Snow showers', icon: '🌨️', bad: true };
  return { label: 'Thunderstorm', icon: '⛈️', bad: true };
}

// Decide whether conditions favour an outdoor walk
function walkRecommendation(dayData) {
  const { tempMax, precipitation, windspeed, weatherCode } = dayData;
  const { bad: badWeather } = describeWeatherCode(weatherCode);

  if (badWeather) return { outdoor: false, reason: 'Rain or storm forecast — indoor bike recommended' };
  if (precipitation > 2) return { outdoor: false, reason: 'Significant rain expected — indoor bike recommended' };
  if (windspeed > 40) return { outdoor: false, reason: 'Strong winds — indoor bike recommended' };
  if (tempMax < 2) return { outdoor: false, reason: 'Very cold — indoor bike recommended' };

  if (precipitation > 0.5) return { outdoor: true, reason: 'Light rain possible — dress for it or swap for indoor bike' };
  if (tempMax < 8) return { outdoor: true, reason: 'Cold but manageable — wrap up well' };
  return { outdoor: true, reason: 'Good conditions for a walk' };
}

// GET /api/weather/week
// Returns 7-day daily weather for the user's location
router.get('/week', async (req, res) => {
  try {
    // Get location from user profile
    const rows = await query('SELECT location FROM user_profile WHERE id = 1');
    const location = rows[0]?.location;
    if (!location) {
      return res.status(400).json({ error: 'No location set in profile' });
    }

    // Geocode the location using Nominatim
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const geoData = await fetchJson(geoUrl);
    if (!geoData.length) {
      return res.status(400).json({ error: `Could not geocode location: ${location}` });
    }
    const { lat, lon } = geoData[0];

    // Fetch 7-day daily forecast from Open-Meteo (free, no key)
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode` +
      `&timezone=auto&forecast_days=7`;
    const weatherData = await fetchJson(weatherUrl);

    const daily = weatherData.daily;
    const days = daily.time.map((date, i) => {
      const dayData = {
        date,
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        precipitation: daily.precipitation_sum[i],
        windspeed: Math.round(daily.windspeed_10m_max[i]),
        weatherCode: daily.weathercode[i],
      };
      const weather = describeWeatherCode(dayData.weatherCode);
      const recommendation = walkRecommendation(dayData);
      return {
        ...dayData,
        weatherLabel: weather.label,
        weatherIcon: weather.icon,
        walkRecommendation: recommendation,
      };
    });

    res.json({ location, days });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
