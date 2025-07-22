import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const { user, updateUser, loading: authLoading } = useAuth();
  const [eligibleDrives, setEligibleDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDrives: 0,
    appliedDrives: 0,
    pendingApplications: 0
  });
  const navigate = useNavigate();

  // Add debugging
  console.log('=== StudentDashboard Debug ===');
  console.log('authLoading:', authLoading);
  console.log('user:', user);
  console.log('loading:', loading);
  console.log('token exists:', !!localStorage.getItem('token'));

  // Use useCallback to define the function
  const fetchEligibleDrives = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        navigate('/login');
        return;
      }
      
      console.log('Fetching drives with token:', token ? 'exists' : 'missing');
      
      const response = await axios.get('http://localhost:5000/api/job-drives/student-drives', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Drives response:', response.data);
      setEligibleDrives(response.data.jobDrives || []);
      
      const total = response.data.jobDrives?.length || 0;
      const applied = response.data.jobDrives?.filter(drive => 
        drive.applications?.some(app => app.student === user?.id)
      ).length || 0;
      
      setStats({
        totalDrives: total,
        appliedDrives: applied,
        pendingApplications: total - applied
      });
    } catch (error) {
      console.error('Error fetching drives:', error);
      
      if (error.response?.status === 401) {
        console.log('Token expired or invalid, redirecting to login');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      
      if (error.response?.status === 403) {
        toast.error('Access denied. Please contact administrator.');
      } else {
        toast.error('Failed to fetch drives');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, navigate]);

  useEffect(() => {
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    if (!user) {
      console.log('No user found after auth loading complete');
      setLoading(false);
      return;
    }

    console.log('User found, fetching drives for:', user.email);
    fetchEligibleDrives();
  }, [user, authLoading, fetchEligibleDrives]);

  // Show loading only if auth is loading or we're fetching data
  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If no user after auth loading is complete, redirect to login
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleRefreshProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }
      
      const response = await axios.get('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      updateUser(response.data.user);
      toast.success('Profile refreshed successfully');
    } catch (error) {
      console.error('Profile refresh error:', error);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      
      toast.error('Failed to refresh profile');
    }
  };

  const handleApply = async (driveId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `http://localhost:5000/api/job-drives/${driveId}/apply`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      toast.success('Application submitted successfully!');
      
      // Update the local state to reflect the application immediately
      setEligibleDrives(prevDrives => 
        prevDrives.map(drive => {
          if (drive._id === driveId) {
            // Create a new applications array if it doesn't exist
            const applications = drive.applications || [];
            // Add the current user's application
            return {
              ...drive,
              applications: [
                ...applications,
                { student: user?.id, appliedAt: new Date() }
              ]
            };
          }
          return drive;
        })
      );
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        appliedDrives: prevStats.appliedDrives + 1,
        pendingApplications: prevStats.pendingApplications - 1
      }));
      
      // Also fetch fresh data from the server
      fetchEligibleDrives();
    } catch (error) {
      console.error('Apply error:', error);
      if (error.response?.status === 403) {
        toast.error(`Access denied: ${error.response.data?.message}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to apply');
      }
    }
  };

  // Helper function to check if user has applied to a drive
  const hasApplied = (drive) => {
    if (!drive.applications || !user?.id) return false;
    
    return drive.applications.some(app => {
      // Handle both object format { student: "id" } and string format "id"
      if (typeof app === 'object' && app !== null) {
        return app.student === user.id || app.student === user._id;
      }
      return app === user.id || app === user._id;
    });
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="card-white-hover p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 lavender-bg-light rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.profile?.name || user?.email}!</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/edit-profile')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Edit Profile
            </button>
            <button
              onClick={handleRefreshProfile}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Refresh Profile
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Drives</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDrives}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Applied Drives</p>
                <p className="text-2xl font-bold text-gray-900">{stats.appliedDrives}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingApplications}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Job Drives Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Available Job Drives</h2>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading drives...</span>
              </div>
            ) : eligibleDrives.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No drives available at the moment</p>
            ) : (
              <div className="space-y-4">
                {eligibleDrives.map((drive) => (
                  <div key={drive._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{drive.companyName}</h3>
                        <p className="text-gray-600">{drive.role || drive.jobTitle}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span>📍 {drive.location}</span>
                          <span>💰 ₹{drive.ctc || drive.package} LPA</span>
                          <span>📅 {new Date(drive.date || drive.driveDate).toLocaleDateString()}</span>
                          <span>
                            CGPA: {drive.eligibility?.minCGPA || drive.eligibilityCriteria?.cgpa || 'N/A'}+ | 
                            Backlogs: {drive.eligibility?.maxBacklogs || drive.eligibilityCriteria?.backlogs || 'N/A'}
                          </span>
                        </div>
                        {drive.description && (
                          <p className="text-gray-600 mt-2 text-sm">{drive.description}</p>
                        )}
                      </div>
                      <div className="ml-4 flex space-x-2">
                        {hasApplied(drive) ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                            ✓ Applied
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApply(drive._id)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                          >
                            Apply Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;





































