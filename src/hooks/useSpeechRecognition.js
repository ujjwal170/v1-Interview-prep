import { useEffect, useRef, useState, useCallback } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/**
 * useSpeechRecognition — wraps the Web Speech API into a React-friendly hook.
 *
 * @param {{
 *   lang?: string,
 *   continuous?: boolean,
 *   interimResults?: boolean,
 *   onResult?: (finalText: string, interimText: string) => void,
 * }} opts
 *   `onResult` should be memoized with useCallback to avoid re-creating the
 *   underlying SpeechRecognition instance on every render.
 *
 * @returns {{
 *   supported: boolean,
 *   listening: boolean,
 *   transcript: string,
 *   interimTranscript: string,
 *   error: string | null,
 *   start: () => void,
 *   stop: () => void,
 *   reset: () => void,
 * }}
 */
export function useSpeechRecognition({
  lang = 'en-US',
  continuous = true,
  interimResults = true,
  onResult,
} = {}) {
  const supported = !!SpeechRecognition;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!supported) return undefined;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onresult = (event) => {
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finalText) setTranscript((prev) => prev + finalText);
      setInterimTranscript(interim);
      onResult?.(finalText, interim);
    };

    recognition.onerror = (event) => setError(event.error);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [supported, lang, continuous, interimResults, onResult]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setInterimTranscript('');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // already started — ignore
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
