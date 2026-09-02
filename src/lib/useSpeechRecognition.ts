import { useCallback, useEffect, useRef, useState } from 'react';

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

const FATAL_ERRORS = new Set(['not-allowed', 'audio-capture', 'service-not-allowed']);

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);

  const createRecognition = useCallback(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return null;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += `${result[0].transcript} `;
        else interim += result[0].transcript;
      }
      if (final) setFinalTranscript((prev) => `${prev}${final}`);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      setError(event.error);
      if (FATAL_ERRORS.has(event.error)) shouldListenRef.current = false;
    };

    // Browsers end recognition after a short silence even with continuous:true.
    // Restart the same instance unless the user explicitly stopped or a fatal error occurred.
    recognition.onend = () => {
      if (shouldListenRef.current) {
        recognition.start();
      } else {
        setListening(false);
      }
    };

    return recognition;
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) {
      setError('not-supported');
      return;
    }
    setError(null);
    shouldListenRef.current = true;
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [createRecognition]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    supported: isSpeechRecognitionSupported(),
    listening,
    transcript: `${finalTranscript}${interimTranscript}`,
    error,
    start,
    stop,
    reset,
  };
}
