import React, { useState, useEffect } from 'react';
import './App.css';

const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = 'https://waeltestingcode.github.io/spotify-top-tracks';
const SCOPES = [
  'user-top-read',
  'playlist-modify-public',
  'playlist-modify-private'
];

function App() {
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash
      .substring(1)
      .split('&')
      .reduce((initial, item) => {
        let parts = item.split('=');
        initial[parts[0]] = decodeURIComponent(parts[1]);
        return initial;
      }, {});

    if (hash.access_token) {
      setToken(hash.access_token);
      // Clear the hash from the URL
      window.location.hash = '';
    }

    // Check if there's an error parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error')) {
      setError('Authentication failed. Please try again.');
    }
  }, []);

  // Add a function to handle token expiration
  const handleTokenExpiration = () => {
    setToken(null);
    setError('Session expired. Please log in again.');
  };

  const login = () => {
    setError(null); // Clear any existing errors
    window.location = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES.join('%20')}&response_type=token&show_dialog=true`;
  };

  const createTopTracksPlaylist = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get user profile
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
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
        'https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term',
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
            name: 'My Top 10 Tracks',
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
          <button 
            onClick={createTopTracksPlaylist}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Top 10 Playlist'}
          </button>
        )}
      </header>
    </div>
  );
}

export default App; 
