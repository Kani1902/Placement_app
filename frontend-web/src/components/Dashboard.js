import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDrives: 0,
    upcomingDrives: 0,
    applicationsReceived: 0
  });
  const [jobDrives, setJobDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Add error logging
  console.log('Dashboard rendering, user:', user);

  useEffect(() => {
    console.log('Dashboard useEffect running');
    fetchDashboardData();
    fetchJobDrives();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data...');
      const response = await axios.get('/api/job-drives/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      // Use fallback data if API fails
      setStats({
        totalDrives: 0,
        upcomingDrives: 0,
        applicationsReceived: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobDrives = async () => {
    try {
      console.log('Fetching job drives...');
      const response = await axios.get('/api/job-drives/all');
      console.log('Job drives response:', response.data);
      setJobDrives(response.data.jobDrives || []);
    } catch (error) {
      console.error('Error fetching job drives:', error);
      setJobDrives([]);
    }
  };

  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', file);

    setUploadLoading(true);
    try {
      const response = await axios.post('/api/users/upload-cgpa', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });

      toast.success(`Successfully updated CGPA for ${response.data.updatedCount} students`);
      event.target.value = '';
    } catch (error) {
      console.error('CSV upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload CSV');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteDrive = async (driveId) => {
    if (!window.confirm('Are you sure you want to delete this job drive?')) {
      return;
    }

    try {
      await axios.delete(`/api/job-drives/${driveId}`);
      toast.success('Job drive deleted successfully');
      fetchJobDrives();
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to delete job drive');
    }
  };

  // Add loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  // Add error state
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-600">Error: User not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.role === 'po' ? 'Placement Officer Dashboard' : 'Staff Dashboard'}
            </h1>
            <p className="text-gray-600">Welcome, {user?.profile?.name || user?.email}!</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => window.location.href = '/create-job-drive'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Job Drive
            </button>
          </div>
        </div>

        {/* Test content to ensure rendering */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <h2 className="text-xl font-bold">Dashboard Test</h2>
          <p>User Role: {user?.role}</p>
          <p>User Email: {user?.email}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                📊
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Drives</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDrives}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                ⏰
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming Drives</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingDrives}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                👥
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.applicationsReceived}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CSV Upload Section */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Upload Student CGPA</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={uploadLoading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadLoading && (
                <div className="text-blue-600">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>• CSV format: rollNo,cgpa</p>
              <p>• Example: 21CS001,8.5</p>
              <p>• Only existing students' CGPA will be updated</p>
            </div>
          </div>
        </div>

        {/* Job Drives List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Job Drives</h2>
          </div>
          
          {jobDrives.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No job drives created yet. Create your first job drive!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {jobDrives.slice(0, 5).map((drive) => (
                <div key={drive._id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{drive.companyName}</h3>
                        <span className={`px-2 py-1 rounded text-sm ${
                          drive.type === 'full-time' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {drive.type}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{drive.role}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-medium">Location:</span> {drive.location}
                        </div>
                        <div>
                          <span className="font-medium">CTC:</span> 
                          {drive.ctc ? `₹${drive.ctc} LPA` : 'Not specified'}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {new Date(drive.date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Applications:</span> {drive.applications?.length || 0}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDrive(drive._id)}
                      className="text-red-600 hover:text-red-800 ml-4"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;










