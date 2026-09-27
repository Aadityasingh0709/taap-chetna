// client/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import PersonalRiskCalculator from './components/PersonalRiskCalculator';
import TravelRiskAnalyzer from './components/TravelRiskAnalyzer';
import WhatIfPlanner from './components/WhatIfPlanner';
import MunicipalDashboard from './components/MunicipalDashboard';
import AdminPortal from './components/AdminPortal';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import ScrollProgressBar from './components/ScrollProgressBar';
import ScrollToTopButton from './components/ScrollToTopButton';
import './App.css';

// Route Guard for Municipal Officers
function OfficerRoute({ children }) {
  const { role } = useAuth();
  if (role !== 'MUNICIPAL_OFFICER') {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Route Guard for System Admin
function AdminRoute({ children }) {
  const { role } = useAuth();
  if (role !== 'SYSTEM_ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Route Guard for Citizens & Guests
function CitizenOnlyRoute({ children }) {
  const { role } = useAuth();
  if (role === 'MUNICIPAL_OFFICER') {
    return <Navigate to="/authority" replace />;
  }
  if (role === 'SYSTEM_ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

function MainApp() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { role } = useAuth();

  return (
    <div className="min-h-screen flex flex-col selection:bg-orange-500 selection:text-white relative">
      {/* Scroll Progress Indicator Bar */}
      <ScrollProgressBar />

      {/* Navigation Bar with Theme Switcher & Segregated Navigation */}
      <Navbar onOpenAuth={() => setAuthModalOpen(true)} />

      {/* Main Role-Specific Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <Routes>
          {/* Citizen Routes */}
          <Route
            path="/"
            element={
              <CitizenOnlyRoute>
                <PersonalRiskCalculator />
              </CitizenOnlyRoute>
            }
          />
          <Route
            path="/travel"
            element={
              <CitizenOnlyRoute>
                <TravelRiskAnalyzer />
              </CitizenOnlyRoute>
            }
          />
          <Route
            path="/what-if"
            element={
              <CitizenOnlyRoute>
                <WhatIfPlanner />
              </CitizenOnlyRoute>
            }
          />

          {/* Municipal Officer Exclusive Route */}
          <Route
            path="/authority"
            element={
              <OfficerRoute>
                <MunicipalDashboard />
              </OfficerRoute>
            }
          />

          {/* System Admin Exclusive Route */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPortal />
              </AdminRoute>
            }
          />

          {/* Catch-all redirect based on role */}
          <Route
            path="*"
            element={
              role === 'MUNICIPAL_OFFICER' ? (
                <Navigate to="/authority" replace />
              ) : role === 'SYSTEM_ADMIN' ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </main>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Footer */}
      <Footer />

      {/* Floating 3D Scroll to Top Action Button */}
      <ScrollToTopButton />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <MainApp />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
