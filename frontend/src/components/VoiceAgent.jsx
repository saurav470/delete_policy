import { useState, useRef, useEffect } from 'react';
import { createSession, sendMessage, setSessionBaseIdentifier } from '../utils/api';
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
  const ttsAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const sessionRef = useRef({ room_id: null, session_id: null });
  const negotiatedRef = useRef(false);
  const pendingIceRef = useRef([]);
  const recognitionRef = useRef(null);
  const backendSessionRef = useRef(null);

  const playTTS = async (text) => {
    if (!text) return;
    
    try {
      const response = await fetch('/api/v1/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error('TTS generation failed');
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (ttsAudioRef.current) {
        ttsAudioRef.current.src = audioUrl;
        try {
          await ttsAudioRef.current.play();
        } catch (playError) {
          // Autoplay may be blocked - silently fail
          console.log('Audio autoplay blocked - user interaction required');
        }
        ttsAudioRef.current.onended = () => URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      console.error('TTS playback error:', error);
    }
  };

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
      sessionRef.current = { room_id: data.room_id, session_id: data.session_id };

      // Create a backend chat session for Python API
      try {
        const sessionResp = await createSession();
        backendSessionRef.current = sessionResp.session_id;
        // Set the mobile number as the session base identifier so user need not speak it
        if (phoneNumber && backendSessionRef.current) {
          try {
            await setSessionBaseIdentifier(backendSessionRef.current, phoneNumber);
          } catch (_) { /* ignore */ }
        }
      } catch (e) {
        // Non-fatal; chat will fail without this
      }

      // 1) Get microphone
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;

      // 2) Create RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
          { urls: ['turn:openrelay.metered.ca:80'], username: 'openrelayproject', credential: 'openrelayproject' }
        ]
      });
      peerConnectionRef.current = pc;

      // 3) Add local audio track
      localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream));

      // 4) Play remote audio when received
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (audioRef.current) {
          audioRef.current.srcObject = remoteStream;
          audioRef.current.play().catch(() => { });
        }
      };

      // 5) Send local ICE candidates to server
      pc.onicecandidate = async (e) => {
        if (!e.candidate) return;
        const candidate = e.candidate.toJSON();
        if (!negotiatedRef.current) {
          pendingIceRef.current.push(candidate);
          return;
        }
        try {
          await fetch('/voice/ice-candidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionRef.current.session_id,
              room_id: sessionRef.current.room_id,
              candidate,
            }),
          });
        } catch (err) {
          // Best-effort; ignore
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setIsConnected(false);
        }
      };

      // 6) Create offer and send to server
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);

      const answerResp = await fetch('/voice/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionRef.current.session_id,
          room_id: sessionRef.current.room_id,
          offer: pc.localDescription,
        }),
      });

      if (!answerResp.ok) {
        throw new Error('Failed to negotiate WebRTC');
      }

      const answerData = await answerResp.json();
      await pc.setRemoteDescription(answerData.answer);
      negotiatedRef.current = true;
      // Start browser-based STT (Web Speech API)
      startBrowserSTT();
      // Flush any buffered ICE candidates now that remote description is set on server
      if (pendingIceRef.current.length > 0) {
        const toSend = [...pendingIceRef.current];
        pendingIceRef.current = [];
        for (const candidate of toSend) {
          try {
            await fetch('/voice/ice-candidate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id: sessionRef.current.session_id,
                room_id: sessionRef.current.room_id,
                candidate,
              }),
            });
          } catch (_) { }
        }
      }

      const baseTranscript = [
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
      ];

      if (backendSessionRef.current) {
        baseTranscript.unshift({
          speaker: 'system',
          text: `Backend chat session: ${backendSessionRef.current}`,
          timestamp: new Date().toISOString(),
        });
      }

      setTranscript(baseTranscript);

      // Play greeting audio after user initiated the call (user gesture present)
      playTTS('Hello! I\'m your insurance assistant. How can I help you today?');

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
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    stopBrowserSTT();

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

  const startBrowserSTT = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      let interim = '';
      recognition.onresult = async (event) => {
        let finalTranscript = '';
        interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += chunk;
          } else {
            interim += chunk;
          }
        }

        if (finalTranscript.trim()) {
          // Append user text
          const userEntry = {
            speaker: 'user',
            text: finalTranscript.trim(),
            timestamp: new Date().toISOString(),
          };
          setTranscript((prev) => [...prev, userEntry]);

          // Send to backend chat if session available
          if (backendSessionRef.current) {
            try {
              // Prefer streaming voice endpoint for low latency
              const ctrl = new AbortController();
              const resp = await fetch('/api/v1/insurance/chat/voice-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: backendSessionRef.current, prompt: finalTranscript.trim() }),
                signal: ctrl.signal,
              });

              if (resp.ok && resp.body) {
                const reader = resp.body.getReader();
                const decoder = new TextDecoder();
                let aggregated = '';
                let firstSentenceSpoken = false;
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  const chunk = decoder.decode(value, { stream: true });
                  if (!chunk) continue;
                  aggregated += chunk;

                  // Speak early when we have a sentence end
                  if (!firstSentenceSpoken) {
                    const sentences = aggregated.split(/(?<=[.!?])\s+/);
                    if (sentences.length > 0 && /[.!?]$/.test(sentences[0])) {
                      const early = formatForVoice(sentences[0]);
                      if (early) {
                        try { playTTS(early); } catch (_) { }
                      }
                      firstSentenceSpoken = true;
                    }
                  }
                }

                const finalAnswer = formatForVoice(aggregated);
                const agentEntry = { speaker: 'agent', text: finalAnswer, timestamp: new Date().toISOString() };
                setTranscript((prev) => [...prev, agentEntry]);
              } else {
                // Fallback to non-streaming chat
                const chatResp = await sendMessage(backendSessionRef.current, finalTranscript.trim());
                const answerRaw = chatResp.answer || '';
                const answer = formatForVoice(answerRaw);
                const agentEntry = { speaker: 'agent', text: answer, timestamp: new Date().toISOString() };
                setTranscript((prev) => [...prev, agentEntry]);
                if (answer) {
                  playTTS(answer);
                }
              }
            } catch (e) {
              // ignore chat failures, keep STT running
            }
          }
        }
      };

      recognition.onerror = () => { };
      recognition.onend = () => {
        // Auto-restart while connected
        if (isConnected) {
          try { recognition.start(); } catch (_) { }
        }
      };

      recognitionRef.current = recognition;
      try { recognition.start(); } catch (_) { }
    } catch (_) {
      // ignore
    }
  };

  const stopBrowserSTT = () => {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.onend = null; rec.stop(); } catch (_) { }
    }
    recognitionRef.current = null;
  };

  // Voice formatting helpers: strip HTML and shorten for crisper TTS
  const stripHtml = (html) => {
    try {
      const div = document.createElement('div');
      div.innerHTML = html;
      const text = div.textContent || div.innerText || '';
      return text.replace(/\s+/g, ' ').trim();
    } catch (_) {
      return html;
    }
  };

  const shortenForVoice = (text, maxSentences = 2, maxChars = 280) => {
    if (!text) return text;
    let trimmed = text.trim();
    const sentences = trimmed.split(/(?<=[.!?])\s+/);
    trimmed = sentences.slice(0, maxSentences).join(' ');
    if (trimmed.length > maxChars) {
      trimmed = trimmed.slice(0, maxChars).replace(/\s+\S*$/, '').trim() + '...';
    }
    return trimmed;
  };

  const formatForVoice = (maybeHtml) => {
    const plain = stripHtml(maybeHtml);
    return shortenForVoice(plain);
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

            {/* Hidden audio element to play remote media */}
            <audio ref={audioRef} autoPlay playsInline />
            
            {/* Hidden audio element for TTS playback */}
            <audio ref={ttsAudioRef} style={{ display: 'none' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default VoiceAgent;
