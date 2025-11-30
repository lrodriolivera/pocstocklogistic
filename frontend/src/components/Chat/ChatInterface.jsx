import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bot, User, Minimize2, Maximize2, X, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import VoiceInput from './VoiceInput';

const ChatInterface = ({ isOpen, onToggle, className = '' }) => {
  const { authFetch, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen && user && messages.length === 0) {
      getGreeting();
    }
  }, [isOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getGreeting = async () => {
    try {
      const response = await authFetch('/api/chat/greeting');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages([{
            id: Date.now(),
            text: data.data.greeting,
            sender: 'luci',
            timestamp: new Date(),
            type: 'greeting'
          }]);
        }
      }
    } catch (error) {
      console.error('Error getting greeting:', error);
      setMessages([{
        id: Date.now(),
        text: `¡Hola ${user?.firstName}! Soy LUC1, tu asistente de logística. ¿En qué puedo ayudarte?`,
        sender: 'luci',
        timestamp: new Date(),
        type: 'greeting'
      }]);
    }
  };

  const sendMessage = async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await authFetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const luciMessage = {
            id: Date.now() + 1,
            text: data.data.response,
            sender: 'luci',
            timestamp: new Date()
          };

          setMessages(prev => [...prev, luciMessage]);
          setSessionId(data.data.session_id);

          if (data.data.suggestions) {
            setSuggestions(data.data.suggestions);
          }
        }
      } else {
        throw new Error('Error enviando mensaje');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías intentarlo de nuevo?',
        sender: 'luci',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const useSuggestion = (suggestion) => {
    sendMessage(suggestion);
    setSuggestions([]);
  };

  const clearChat = () => {
    setMessages([]);
    setSuggestions([]);
    setSessionId(null);
    getGreeting();
  };

  // Manejar transcripción de voz
  const handleVoiceTranscript = (transcript) => {
    setInputMessage(transcript);
    // Auto-enviar el mensaje después de la transcripción
    setTimeout(() => {
      sendMessage(transcript);
    }, 100);
  };

  const formatMessage = (text) => {
    // Format URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let formatted = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');

    // Format bullet points
    formatted = formatted.replace(/^[•·-]\s/gm, '<span class="text-blue-600">•</span> ');

    // Format numbers with emojis
    formatted = formatted.replace(/(\d+)\./g, '<span class="text-blue-600 font-semibold">$1.</span>');

    return formatted;
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={`fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-50 ${className}`}
        title="Hablar con LUC1"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 ${className}`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">LUC1</h3>
            <p className="text-xs text-blue-100">Asistente Logístico</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearChat}
            className="text-blue-100 hover:text-white p-1 rounded"
            title="Limpiar chat"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="text-blue-100 hover:text-white p-1 rounded"
            title="Minimizar"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.sender === 'luci' && (
                  <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
                  />
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
              <Bot className="w-4 h-4" />
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600">LUC1 está escribiendo...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Sugerencias:</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => useSuggestion(suggestion)}
                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isMobile ? "Habla o escribe..." : "Escribe tu mensaje o usa el micrófono..."}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />

          {/* Botón de voz */}
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            disabled={isLoading}
            isMobile={isMobile}
          />

          {/* Botón de enviar */}
          <button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors flex-shrink-0"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2 text-center">
          {isMobile ? 'Mantén presionado el micrófono para hablar' : 'Presiona Enter o usa el micrófono'}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;