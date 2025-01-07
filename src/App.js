import React, { useState, useEffect } from 'react';
import './App.css';

const SPOTIFY_CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = 'https://waeltestingcode.github.io/spotify-top-tracks/callback';
const SCOPES = [
  'user-top-read',
  'playlist-modify-public',
  'playlist-modify-private'
];

function App() {
  const [token, setToken] = useState(null);

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
    }
  }, []);

  const login = () => {
    window.location = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPES.join('%20')}&response_type=token`;
  };

  const createTopTracksPlaylist = async () => {
    if (!token) return;

    try {
      // Get user profile
      const userResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = await userResponse.json();

      // Get top tracks
      const tracksResponse = await fetch(
        'https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const tracksData = await tracksResponse.json();

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
      const playlistData = await playlistResponse.json();

      // Add tracks to playlist
      await fetch(
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

      alert('Playlist created successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating playlist');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Spotify Top Tracks Playlist Creator</h1>
        {!token ? (
          <button onClick={login}>Login with Spotify</button>
        ) : (
          <button onClick={createTopTracksPlaylist}>Create Top 10 Playlist</button>
        )}
      </header>
    </div>
  );
}

export default App; 