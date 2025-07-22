import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import AuthCallback from './components/AuthCallback.jsx';
import CreateProfile from './components/CreateProfile';
import StudentDashboard from './components/StudentDashboard';
import PODashboard from './components/PODashboard';
import CreateJobDrive from './components/CreateJobDrive';
import JobDrives from './components/JobDrives';
import ProtectedRoute from './components/ProtectedRoute';
import EditProfile from './components/EditProfile';
import VerifyEmail from './components/VerifyEmail';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            
            {/* Student Routes */}
            <Route path="/create-profile" element={
              <ProtectedRoute allowedRoles={['student']}>
                <CreateProfile />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/drives" element={
              <ProtectedRoute allowedRoles={['student']}>
                <JobDrives />
              </ProtectedRoute>
            } />
            
            {/* PO Routes */}
            <Route path="/po-dashboard" element={
              <ProtectedRoute allowedRoles={['po']}>
                <PODashboard />
              </ProtectedRoute>
            } />
            <Route path="/create-job-drive" element={
              <ProtectedRoute allowedRoles={['po']}>
                <CreateJobDrive />
              </ProtectedRoute>
            } />
            
            {/* Common Routes */}
            <Route path="/edit-profile" element={
              <ProtectedRoute allowedRoles={['student', 'po', 'staff']}>
                <EditProfile />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

















