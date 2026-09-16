import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from './store';

import Navbar from './components/Navbar';
import DonorBotChat from './components/DonorBotChat';

import Login from './pages/Login';
import DonorDashboard from './pages/DonorDashboard';
import RecipientDashboard from './pages/RecipientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAppStore();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    switch (user.role) {
      case 'donor': return <Navigate to="/donor-dashboard" replace />;
      case 'recipient': return <Navigate to="/recipient-dashboard" replace />;
      case 'doctor': return <Navigate to="/doctor-dashboard" replace />;
      case 'admin': return <Navigate to="/admin-dashboard" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }

  return children;
}

export default function App() {
  const { user } = useAppStore();

  return (
    <Router>
      <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans">
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff' } }} />
        <Navbar />

        <main className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/donor-dashboard"
              element={
                <ProtectedRoute allowedRoles={['donor']}>
                  <DonorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recipient-dashboard"
              element={
                <ProtectedRoute allowedRoles={['recipient']}>
                  <RecipientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor-dashboard"
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <DoctorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                user ? (
                  user.role === 'donor' ? (
                    <Navigate to="/donor-dashboard" replace />
                  ) : user.role === 'recipient' ? (
                    <Navigate to="/recipient-dashboard" replace />
                  ) : user.role === 'doctor' ? (
                    <Navigate to="/doctor-dashboard" replace />
                  ) : (
                    <Navigate to="/admin-dashboard" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Routes>
        </main>

        {user && <DonorBotChat />}
      </div>
    </Router>
  );
}
