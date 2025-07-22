import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardRoute = () => {
    if (user?.role === 'student') return '/dashboard';
    if (user?.role === 'po') return '/po-dashboard';
    return '/dashboard';
  };

  return (
    <nav className="bg-white sticky top-0 z-50 shadow-sm border-b border-violet-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 lavender-gradient rounded-lg flex items-center justify-center lavender-shadow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-800">Campus Portal</span>
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="flex items-center space-x-6">
              <Link 
                to={getDashboardRoute()} 
                className="text-gray-700 hover:text-violet-700 transition-colors duration-300 font-medium"
              >
                Dashboard
              </Link>
              
              {user.role === 'student' && (
                <Link 
                  to="/job-drives" 
                  className="text-gray-700 hover:text-violet-700 transition-colors duration-300 font-medium"
                >
                  Job Drives
                </Link>
              )}
              
              {user.role === 'po' && (
                <>
                  <Link 
                    to="/manage-drives" 
                    className="text-gray-700 hover:text-violet-700 transition-colors duration-300 font-medium"
                  >
                    Manage Drives
                  </Link>
                  <Link 
                    to="/create-job-drive" 
                    className="text-gray-700 hover:text-violet-700 transition-colors duration-300 font-medium"
                  >
                    Create Drive
                  </Link>
                </>
              )}
              
              {/* User Info */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-800 font-medium">
                    {user.profile?.name || user.email}
                  </div>
                  <div className="text-xs text-violet-600 font-medium">
                    {user.role === 'student' ? 'Student' : user.role === 'po' ? 'Placement Officer' : user.role}
                  </div>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="btn-lavender-light px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;



