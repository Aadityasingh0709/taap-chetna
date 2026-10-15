// client/src/context/ShaktiContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useTransition } from 'react';
import { getShaktiPreviewResponse } from '../components/shakti/shaktiMockData';

const ShaktiContext = createContext(null);

export const ShaktiProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeMode, setActiveMode] = useState('text'); // 'text' | 'voice' | 'live'
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
  const [, startTransition] = useTransition();

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

  const sendMessage = useCallback((rawText) => {
    const text = (rawText || '').trim();
    if (!text) return;

    const userMsg = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    // Natural simulated formulation delay for Phase 1 local preview
    setTimeout(() => {
      startTransition(() => {
        const previewData = getShaktiPreviewResponse(text);
        const shaktiMsg = {
          id: `shakti_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sender: 'shakti',
          text: previewData.text,
          bullets: previewData.bullets || [],
          suggestedNext: previewData.suggestedNext || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isPreview: true,
        };

        setMessages((prev) => [...prev, shaktiMsg]);
        setIsThinking(false);
      });
    }, 700);
  }, [startTransition]);

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
        messages,
        isThinking,
        sendMessage,
        clearConversation,
        openWithPrompt,
        feedbackToast,
        showFeedbackToast,
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
