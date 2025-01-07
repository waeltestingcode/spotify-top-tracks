import React, { useState, useEffect } from 'react';
import './App.css';

const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = 'https://waeltestingcode.github.io/spotify-top-tracks';
const SCOPES = [
  'user-top-read',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-private',
  'user-read-email'
];

function App() {
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('long_term'); // Default to long_term
  const [trackCount, setTrackCount] = useState(10); // Default to 10 tracks

  useEffect(() => {
    setError(null);

    const hash = window.location.hash
      .substring(1)
      .split('&')
      .reduce((initial, item) => {
        let parts = item.split('=');
        initial[parts[0]] = decodeURIComponent(parts[1]);
        return initial;
      }, {});

    if (hash.access_token) {
      const newToken = hash.access_token;
      sessionStorage.setItem('spotify_token', newToken);
      setToken(newToken);
      window.location.hash = '';
    } else {
      const storedToken = sessionStorage.getItem('spotify_token');
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  const login = () => {
    sessionStorage.removeItem('spotify_token');
    setToken(null);
    setError(null);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'token',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      show_dialog: true
    });

    window.location.href = `${authUrl}?${params.toString()}`;
  };

  const handleTokenExpiration = () => {
    sessionStorage.removeItem('spotify_token');
    setToken(null);
    setError('Session expired. Please log in again.');
  };

  const createTopTracksPlaylist = async () => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const testResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!testResponse.ok) {
        if (testResponse.status === 401 || testResponse.status === 403) {
          handleTokenExpiration();
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('Failed to authenticate with Spotify');
      }

      // Get user profile
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // If unauthorized, clear token and ask to login again
      if (userResponse.status === 401) {
        setToken(null);
        throw new Error('Session expired. Please log in again.');
      }

      let errorData;
      try {
        errorData = await userResponse.json();
      } catch (e) {
        // If response isn't JSON, it might be an auth error
        if (!userResponse.ok) {
          throw new Error('Authentication failed. Please try logging in again.');
        }
        throw new Error('Unexpected response from Spotify');
      }

      if (!userResponse.ok) {
        throw new Error(`Failed to get user profile: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const userData = errorData; // reuse the parsed response

      // Get top tracks
      const tracksResponse = await fetch(
        `https://api.spotify.com/v1/me/top/tracks?limit=${trackCount}&time_range=${timeRange}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (!tracksResponse.ok) {
        const errorData = await tracksResponse.json();
        throw new Error(`Failed to get top tracks: ${errorData.error.message}`);
      }
      
      const tracksData = await tracksResponse.json();

      if (!tracksData.items || tracksData.items.length === 0) {
        throw new Error('No top tracks found. Try listening to more music first!');
      }

      // Create new playlist
      const playlistResponse = await fetch(
        `https://api.spotify.com/v1/users/${userData.id}/playlists`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `My Top ${trackCount} Tracks`,
            description: 'Created by Top Tracks App'
          })
        }
      );
      
      if (!playlistResponse.ok) {
        const errorData = await playlistResponse.json();
        throw new Error(`Failed to create playlist: ${errorData.error.message}`);
      }
      
      const playlistData = await playlistResponse.json();

      // Add tracks to playlist
      const addTracksResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: tracksData.items.map(track => track.uri)
          })
        }
      );
      
      if (!addTracksResponse.ok) {
        const errorData = await addTracksResponse.json();
        throw new Error(`Failed to add tracks: ${errorData.error.message}`);
      }

      alert('Playlist created successfully!');
    } catch (error) {
      console.error('Error details:', error);
      setError(error.message);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Spotify Top Tracks Playlist Creator</h1>
        {error && <p className="error-message">{error}</p>}
        {!token ? (
          <button onClick={login}>
            {error ? 'Login Again' : 'Login with Spotify'}
          </button>
        ) : (
          <>
            <div>
              <label htmlFor="timeRange">Select Time Range:</label>
              <select
                id="timeRange"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="short_term">Last 4 Weeks</option>
                <option value="medium_term">Last 6 Months</option>
                <option value="long_term">All Time</option>
              </select>
            </div>
            <div>
              <label htmlFor="trackCount">Select Number of Tracks:</label>
              <select
                id="trackCount"
                value={trackCount}
                onChange={(e) => setTrackCount(e.target.value)}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button 
              onClick={createTopTracksPlaylist}
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Playlist'}
            </button>
          </>
        )}
      </header>
    </div>
  );
}

export default App; 
