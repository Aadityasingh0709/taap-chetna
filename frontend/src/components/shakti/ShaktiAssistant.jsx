// client/src/components/shakti/ShaktiAssistant.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useShakti } from '../../context/ShaktiContext';
import ShaktiChatPanel from './ShaktiChatPanel';

export default function ShaktiAssistant() {
  const { role } = useAuth();
  const location = useLocation();
  const {
    isOpen,
    isMinimized,
  } = useShakti();

  // Strict citizen-only guard: Do not expose Shakti on officer or admin interfaces or routes
  if (
    role === 'MUNICIPAL_OFFICER' ||
    role === 'SYSTEM_ADMIN' ||
    location.pathname.startsWith('/authority') ||
    location.pathname.startsWith('/admin')
  ) {
    return null;
  }

  if (!isOpen || isMinimized) return null;
  return <ShaktiChatPanel />;
}
