import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Bot, User, Sparkles, Volume2 } from 'lucide-react';
import { createSession, sendMessage, getSession } from '../utils/api';
import './ChatBot.css';

function ChatBot() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const playTTS = async (text) => {
    if (!audioEnabled || !text) return;
    
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
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        try {
          await audioRef.current.play();
        } catch (playError) {
          // Autoplay may be blocked - silently fail
          console.log('Audio autoplay blocked - user interaction required');
        }
        audioRef.current.onended = () => URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      console.error('TTS playback error:', error);
    }
  };

  const initializeSession = async () => {
    try {
      const session = await createSession();
      setSessionId(session.session_id);
      const greetingMessage = 'Hello! 👋 I\'m your healthcare insurance assistant. Please share your registered mobile number, and I\'ll help you with your policy questions.';
      setMessages([
        {
          role: 'assistant',
          content: greetingMessage,
        },
      ]);
      // Note: Greeting audio will NOT autoplay due to browser restrictions
      // Audio will start playing after the user's first interaction (sending a message)
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setMessages([
        {
          role: 'assistant',
          content: '⚠️ Unable to connect to the server. Please refresh the page to try again.',
        },
      ]);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await sendMessage(sessionId, userMessage);
      const assistantMessage = response.answer || response.message;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantMessage },
      ]);
      // Play TTS for assistant response
      playTTS(assistantMessage);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Sorry, I encountered an error processing your request. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="chat-container">
        <div className="loading-state">
          <Loader2 size={48} className="spin" />
          <p>Initializing chat session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <div className="header-icon">
            <Bot size={28} />
          </div>
          <div>
            <h2>Healthcare Insurance Assistant</h2>
            <p className="status">
              <span className="status-dot"></span>
              Online & Ready to Help
            </p>
          </div>
        </div>
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`audio-toggle ${audioEnabled ? 'active' : ''}`}
          title={audioEnabled ? 'Disable Voice' : 'Enable Voice'}
        >
          <Volume2 size={20} />
        </button>
      </div>

      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-container">
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            disabled={isLoading || !sessionId}
            className="message-input"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !sessionId}
            className="send-button"
          >
            {isLoading ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <p className="input-hint">
          <Sparkles size={14} />
          Powered by AI • Your data is secure
        </p>
      </form>
      
      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}

export default ChatBot;
