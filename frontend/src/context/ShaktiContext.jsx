// client/src/context/ShaktiContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sendShaktiChatMessage, getShaktiStatus } from '../services/api';

const ShaktiContext = createContext(null);

export const ShaktiProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeMode, setActiveMode] = useState('text'); // 'text' | 'voice' | 'live'
  const [locale, setLocale] = useState('en'); // 'en' | 'hi'
  const [messages, setMessages] = useState(() => {
    // Preserve conversation during current browser session
    try {
      const stored = sessionStorage.getItem('shakti_session_messages');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isThinking, setIsThinking] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [providerInfo, setProviderInfo] = useState({ provider: 'ollama', model: 'qwen3:4b', configured: true });

  // Fetch active AI provider status on mount
  useEffect(() => {
    getShaktiStatus()
      .then((res) => {
        if (res.data) setProviderInfo(res.data);
      })
      .catch(() => {
        // Fallback silently if offline
      });
  }, []);

  // Sync messages to session storage so re-opening preserves history
  useEffect(() => {
    try {
      sessionStorage.setItem('shakti_session_messages', JSON.stringify(messages));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }, [messages]);

  // Clean toast timeout
  useEffect(() => {
    if (!feedbackToast) return;
    const timer = setTimeout(() => setFeedbackToast(null), 3200);
    return () => clearTimeout(timer);
  }, [feedbackToast]);

  const showFeedbackToast = useCallback((msg) => {
    setFeedbackToast(msg);
  }, []);

  const openShakti = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeShakti = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const minimizeShakti = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const restoreShakti = useCallback(() => {
    setIsMinimized(false);
    setIsOpen(true);
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setIsThinking(false);
    try {
      sessionStorage.removeItem('shakti_session_messages');
    } catch {
      // Ignore
    }
  }, []);

  const getActiveClientContext = useCallback(() => {
    let selectedLocation = null;
    let coords = null;

    try {
      selectedLocation = localStorage.getItem('tapchetna_selected_location');
      const coordsRaw = localStorage.getItem('tapchetna_selected_coords');
      if (coordsRaw) {
        coords = JSON.parse(coordsRaw);
      }
    } catch {
      // storage unavailable
    }

    if (!selectedLocation) {
      try {
        const savedProfileRaw = localStorage.getItem('tapchetna_saved_profile');
        if (savedProfileRaw) {
          const profile = JSON.parse(savedProfileRaw);
          if (profile.homeLocation) selectedLocation = profile.homeLocation;
          if (profile.selectedCoords) coords = profile.selectedCoords;
        }
      } catch {
        // ignore
      }
    }

    return {
      selectedLocation: selectedLocation || null,
      coords: coords || null,
    };
  }, []);

  const updateActiveLocation = useCallback((location, coords = null) => {
    try {
      if (location) {
        localStorage.setItem('tapchetna_selected_location', location);
      } else {
        localStorage.removeItem('tapchetna_selected_location');
      }
      if (coords) {
        localStorage.setItem('tapchetna_selected_coords', JSON.stringify(coords));
      } else {
        localStorage.removeItem('tapchetna_selected_coords');
      }
    } catch {
      // ignore
    }
  }, []);

  const sendMessage = useCallback(async (rawText) => {
    const text = (rawText || '').trim();
    if (!text) return;

    const userMsg = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Optimistically append user message
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const clientContext = getActiveClientContext();

      // Format recent conversation context for the backend
      const historyToSend = [...messages, userMsg]
        .slice(-8)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      const res = await sendShaktiChatMessage(historyToSend, locale, clientContext);
      const data = res.data;

      const shaktiMsg = {
        id: `shakti_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sender: 'shakti',
        text: data.message || 'I have analyzed your query.',
        model: data.model,
        provider: data.provider,
        resolvedLocation: data.resolvedLocation,
        weatherSummary: data.weatherSummary,
        toolCalls: data.toolCallsExecuted || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAi: true,
      };

      setMessages((prev) => [...prev, shaktiMsg]);
    } catch (err) {
      console.error('[ShaktiContext] Chat error:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Shakti AI service is currently unavailable. Please verify backend configuration.';

      const fallbackMsg = {
        id: `shakti_${Date.now()}_err`,
        sender: 'shakti',
        text: `⚠️ **Service Notice:** ${errorMsg}\n\n*General Heat Safety Tip:* Drink adequate water with electrolyte salts (ORS) and avoid unshaded outdoor exertion between 12:00 PM and 3:30 PM.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };

      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsThinking(false);
    }
  }, [messages, locale, getActiveClientContext]);

  const openWithPrompt = useCallback((promptText) => {
    setIsOpen(true);
    setIsMinimized(false);
    setActiveMode('text');
    sendMessage(promptText);
  }, [sendMessage]);

  return (
    <ShaktiContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isMinimized,
        setIsMinimized,
        openShakti,
        closeShakti,
        minimizeShakti,
        restoreShakti,
        activeMode,
        setActiveMode,
        locale,
        setLocale,
        messages,
        isThinking,
        sendMessage,
        clearConversation,
        openWithPrompt,
        feedbackToast,
        showFeedbackToast,
        providerInfo,
        getActiveClientContext,
        updateActiveLocation,
      }}
    >
      {children}
    </ShaktiContext.Provider>
  );
};

export const useShakti = () => {
  const ctx = useContext(ShaktiContext);
  if (!ctx) {
    throw new Error('useShakti must be used within a ShaktiProvider');
  }
  return ctx;
};
