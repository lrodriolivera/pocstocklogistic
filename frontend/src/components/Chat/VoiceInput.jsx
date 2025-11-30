import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader } from 'lucide-react';
import './VoiceInput.css';

/**
 * VoiceInput Component
 *
 * Componente de entrada de voz optimizado para móviles y desktop
 * Usa Web Speech API con fallback manual
 *
 * Features:
 * - Detección automática de soporte del navegador
 * - Modo "mantener presionado" para móviles (estilo WhatsApp)
 * - Modo "click to toggle" para desktop
 * - Indicadores visuales de grabación
 * - Transcripción automática al input
 */
const VoiceInput = ({ onTranscript, disabled = false, isMobile = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);

  // Detectar soporte de Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);

      // Inicializar reconocimiento
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Manejar resultados
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript.trim());
          onTranscript(finalTranscript.trim());
          setIsListening(false);
        } else if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };

      // Manejar errores
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);

        if (event.error === 'not-allowed') {
          alert('⚠️ Permiso de micrófono denegado. Por favor, habilita el micrófono en la configuración de tu navegador.');
        } else if (event.error === 'no-speech') {
          // Silencio detectado, es normal - no mostrar error
        } else if (event.error === 'network') {
          console.warn('Error de red en reconocimiento de voz. Esto puede deberse a que Chrome requiere HTTPS para esta función (localhost está permitido). El error es normal si no estás hablando.');
          // No mostrar alerta, solo log - puede ser normal si el usuario no habló
        } else {
          console.warn('Error de reconocimiento de voz:', event.error);
        }
      };

      // Manejar fin de reconocimiento
      recognition.onend = () => {
        setIsListening(false);
        setIsPressing(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      console.warn('Web Speech API no soportada en este navegador');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignorar errores al limpiar
        }
      }
    };
  }, [onTranscript]);

  // Iniciar grabación
  const startListening = () => {
    if (!isSupported || disabled || isListening) return;

    try {
      setTranscript('');
      setIsListening(true);
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);
    }
  };

  // Detener grabación
  const stopListening = () => {
    if (!isListening) return;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
    setIsListening(false);
  };

  // Manejar click (desktop)
  const handleClick = () => {
    if (isMobile) return; // En móvil usar touch events

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Manejar touch start (móvil - mantener presionado)
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    e.preventDefault();
    setIsPressing(true);
    startListening();
  };

  // Manejar touch end (móvil - soltar)
  const handleTouchEnd = (e) => {
    if (!isMobile) return;
    e.preventDefault();
    setIsPressing(false);

    // Pequeño delay para capturar las últimas palabras
    timeoutRef.current = setTimeout(() => {
      stopListening();
    }, 300);
  };

  // Manejar mouse down (desktop alternativo - mantener presionado)
  const handleMouseDown = () => {
    if (isMobile) return;
    setIsPressing(true);
    startListening();
  };

  // Manejar mouse up (desktop alternativo - soltar)
  const handleMouseUp = () => {
    if (isMobile) return;
    setIsPressing(false);

    timeoutRef.current = setTimeout(() => {
      stopListening();
    }, 300);
  };

  // Limpiar timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Si no está soportado, no renderizar nada
  if (!isSupported) {
    return null;
  }

  return (
    <div className="voice-input-container">
      {isMobile ? (
        // Modo móvil: Mantener presionado
        <button
          type="button"
          className={`voice-button mobile ${isListening ? 'listening' : ''} ${isPressing ? 'pressing' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          disabled={disabled}
          aria-label={isListening ? 'Grabando... Suelta para enviar' : 'Mantén presionado para hablar'}
        >
          {isListening ? (
            <>
              <div className="pulse-ring"></div>
              <Mic className="w-6 h-6 mic-icon" />
            </>
          ) : (
            <Mic className="w-6 h-6" />
          )}
          <span className="voice-hint">
            {isListening ? 'Grabando...' : 'Mantén presionado'}
          </span>
        </button>
      ) : (
        // Modo desktop: Click to toggle o mantener presionado
        <button
          type="button"
          className={`voice-button desktop ${isListening ? 'listening' : ''} ${isPressing ? 'pressing' : ''}`}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          disabled={disabled}
          aria-label={isListening ? 'Detener grabación' : 'Iniciar grabación de voz'}
        >
          {isListening ? (
            <>
              <div className="pulse-ring"></div>
              <Mic className="w-5 h-5 mic-icon" />
            </>
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Transcripción en tiempo real (opcional) */}
      {transcript && isListening && (
        <div className="transcript-preview">
          {transcript}
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
