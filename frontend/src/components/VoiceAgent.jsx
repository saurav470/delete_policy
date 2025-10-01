import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2, Volume2 } from 'lucide-react';
import './VoiceAgent.css';

function VoiceAgent() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const startCall = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const response = await fetch('/voice/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start voice session');
      }

      const data = await response.json();
      
      setTranscript([
        {
          speaker: 'system',
          text: `Voice session started. Session ID: ${data.session_id}`,
          timestamp: new Date().toISOString(),
        },
        {
          speaker: 'agent',
          text: 'Hello! I\'m your insurance assistant. How can I help you today?',
          timestamp: new Date().toISOString(),
        },
      ]);

      setIsConnected(true);
      setIsConnecting(false);
    } catch (err) {
      console.error('Failed to start call:', err);
      setError('Failed to connect to voice agent. Please try again.');
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsConnected(false);
    setTranscript([]);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (peerConnectionRef.current) {
      const audioTrack = peerConnectionRef.current
        .getSenders()
        .find((sender) => sender.track?.kind === 'audio')?.track;
      if (audioTrack) {
        audioTrack.enabled = isMuted;
      }
    }
  };

  return (
    <div className="voice-container">
      <div className="voice-card">
        <div className="voice-header">
          <h2>🎙️ Voice AI Agent</h2>
          <p>Real-time voice conversation with your healthcare assistant</p>
        </div>

        {!isConnected ? (
          <div className="connect-section">
            <div className="phone-input-group">
              <label htmlFor="phone">Your Phone Number</label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={isConnecting}
                className="phone-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              onClick={startCall}
              disabled={isConnecting || !phoneNumber.trim()}
              className="call-button start"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={24} className="spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Phone size={24} />
                  <span>Start Voice Call</span>
                </>
              )}
            </button>

            <div className="info-cards">
              <div className="info-card">
                <Volume2 size={20} />
                <div>
                  <h4>Clear Audio</h4>
                  <p>High-quality voice conversation</p>
                </div>
              </div>
              <div className="info-card">
                <Mic size={20} />
                <div>
                  <h4>Natural Speech</h4>
                  <p>Speak naturally, we understand</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="call-section">
            <div className="call-status">
              <div className="pulse-ring"></div>
              <div className="call-icon">
                <Phone size={32} />
              </div>
              <h3>Call in Progress</h3>
              <p>Connected to: {phoneNumber}</p>
            </div>

            <div className="transcript-section">
              <h4>Live Transcript</h4>
              <div className="transcript-container">
                {transcript.map((entry, index) => (
                  <div key={index} className={`transcript-entry ${entry.speaker}`}>
                    <span className="speaker-tag">
                      {entry.speaker === 'agent' ? '🤖 Assistant' : 
                       entry.speaker === 'user' ? '👤 You' : 'ℹ️ System'}
                    </span>
                    <p>{entry.text}</p>
                  </div>
                ))}
                {transcript.length === 0 && (
                  <p className="empty-state">Transcript will appear here...</p>
                )}
              </div>
            </div>

            <div className="call-controls">
              <button
                onClick={toggleMute}
                className={`control-button ${isMuted ? 'active' : ''}`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button
                onClick={endCall}
                className="call-button end"
              >
                <PhoneOff size={24} />
                <span>End Call</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VoiceAgent;
