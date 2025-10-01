import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { createSession, sendMessage, getSession } from '../utils/api';
import './ChatBot.css';

function ChatBot() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSession = async () => {
    try {
      const session = await createSession();
      setSessionId(session.session_id);
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! 👋 I\'m your healthcare insurance assistant. Please share your registered mobile number, and I\'ll help you with your policy questions.',
        },
      ]);
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
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.answer || response.message },
      ]);
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
    </div>
  );
}

export default ChatBot;
