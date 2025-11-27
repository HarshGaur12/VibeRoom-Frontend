// WebRTC Configuration
// For local development, update the SOCKET_URL with your ngrok URL
// For production, set VITE_SOCKET_URL environment variable

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://superbly-unlotted-sharda.ngrok-free.dev';

export const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:relay.metered.ca:80",
      username: "openai-demo",
      credential: "openai-demo"
    }
  ]
};
