import { useCallback, useEffect, useRef, useState } from 'react';

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

const FATAL_ERRORS = new Set(['not-allowed', 'audio-capture', 'service-not-allowed']);
const RESTART_DELAY_MS = 300;
const RESTART_WINDOW_MS = 5000;
const MAX_RESTARTS_IN_WINDOW = 5;

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastRawError, setLastRawError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimestampsRef = useRef<number[]>([]);
  const lastRawErrorRef = useRef<string | null>(null);

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
      console.error('[voice] recognition error:', event.error, event.message);
      setError(event.error);
      setLastRawError(event.error);
      lastRawErrorRef.current = event.error;
      if (FATAL_ERRORS.has(event.error)) shouldListenRef.current = false;
    };

    // Browsers (macOS Chrome/Safari especially) end recognition after a short
    // silence even with continuous:true. Restart on a short delay so the OS has
    // time to release the mic — restarting synchronously throws InvalidStateError
    // and can spiral into a tight restart loop. A sliding-window cap is a safety
    // valve in case a browser keeps failing to actually start.
    recognition.onend = () => {
      console.log('[voice] recognition ended, shouldListen =', shouldListenRef.current);
      if (!shouldListenRef.current) {
        setListening(false);
        return;
      }

      const now = Date.now();
      restartTimestampsRef.current = restartTimestampsRef.current.filter((t) => now - t < RESTART_WINDOW_MS);
      restartTimestampsRef.current.push(now);

      if (restartTimestampsRef.current.length > MAX_RESTARTS_IN_WINDOW) {
        console.error(
          '[voice] gave up after',
          restartTimestampsRef.current.length,
          'restarts in',
          RESTART_WINDOW_MS,
          'ms — last raw error:',
          lastRawErrorRef.current,
        );
        shouldListenRef.current = false;
        setListening(false);
        setError('unstable');
        return;
      }

      restartTimeoutRef.current = setTimeout(() => {
        try {
          console.log('[voice] restarting recognition');
          recognition.start();
        } catch (err) {
          console.error('[voice] restart threw:', err);
          // already starting/started — ignore, next onend will retry
        }
      }, RESTART_DELAY_MS);
    };

    return recognition;
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
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
    setLastRawError(null);
    lastRawErrorRef.current = null;
    restartTimestampsRef.current = [];
    shouldListenRef.current = true;
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [createRecognition]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
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
    lastRawError,
    start,
    stop,
    reset,
  };
}
