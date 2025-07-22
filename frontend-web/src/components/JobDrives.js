import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const JobDrives = () => {
  const { user } = useAuth();
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    fetchJobDrives();
  }, []);

  // Add this useEffect to debug the data
  useEffect(() => {
    if (drives.length > 0 && user) {
      console.log('=== DEBUG DATA ===');
      console.log('User object:', user);
      console.log('User ID:', user.id);
      console.log('User _id:', user._id);
      console.log('First drive applications:', drives[0]?.applications);
      drives.forEach((drive, index) => {
        console.log(`Drive ${index} (${drive.companyName}) applications:`, drive.applications);
      });
      console.log('=== END DEBUG ===');
    }
  }, [drives, user]);

  const fetchJobDrives = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login first');
        return;
      }

      // Use role-based endpoints
      const endpoint = user?.role === 'student' 
        ? 'http://localhost:5000/api/job-drives/student-drives'
        : 'http://localhost:5000/api/job-drives';
        
      console.log('Fetching job drives from:', endpoint, 'for role:', user?.role);
      
      const response = await axios.get(endpoint, { 
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Job drives response:', response.data);
      setDrives(response.data.jobDrives || []);
      
      // Show message if no drives due to incomplete profile
      if (response.data.message && user?.role === 'student') {
        toast.info(response.data.message);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied');
      } else {
        toast.error('Failed to fetch job drives');
      }
      setDrives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (driveId) => {
    if (window.confirm('Are you sure you want to delete this job drive?')) {
      try {
        await axios.delete(`http://localhost:5000/api/job-drives/${driveId}`);
        toast.success('Job drive deleted successfully');
        fetchJobDrives();
      } catch (error) {
        toast.error('Failed to delete job drive');
      }
    }
  };

  const handleApply = async (driveId) => {
    try {
      console.log('=== FRONTEND APPLY ===');
      console.log('Drive ID:', driveId);
      console.log('User:', user);
      
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      if (!token) {
        toast.error('Please login first');
        return;
      }
      
      // Check if already applied before making the request
      const drive = drives.find(d => d._id === driveId);
      if (drive && isApplied(drive)) {
        toast.error('Already applied to this job drive');
        return;
      }
      
      const response = await axios.post(
        `http://localhost:5000/api/job-drives/${driveId}/apply`, 
        {}, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Apply response:', response.data);
      toast.success('Application submitted successfully!');
      
      // Force update the UI immediately
      setDrives(prevDrives => 
        prevDrives.map(drive => {
          if (drive._id === driveId) {
            // Create a new applications array with the current user
            return {
              ...drive,
              applications: [
                ...(drive.applications || []),
                { 
                  student: user.id || user._id,
                  appliedAt: new Date()
                }
              ]
            };
          }
          return drive;
        })
      );
      
      // Also refresh from server
      fetchJobDrives();
    } catch (error) {
      console.error('Apply error:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.status === 403) {
        toast.error(`Access denied: ${error.response.data?.message}`);
      } else if (error.response?.status === 400 && error.response?.data?.message?.includes('Already applied')) {
        toast.error('Already applied to this job drive');
        
        // Force update the UI to show as applied
        setDrives(prevDrives => 
          prevDrives.map(drive => {
            if (drive._id === driveId && !isApplied(drive)) {
              return {
                ...drive,
                applications: [
                  ...(drive.applications || []),
                  { student: user.id || user._id }
                ]
              };
            }
            return drive;
          })
        );
      } else {
        toast.error(error.response?.data?.message || 'Failed to apply');
      }
    }
  };

  const isApplied = (drive) => {
    if (!user || !drive.applications) return false;
    
    return drive.applications.some(app => {
      const studentId = app.student?._id || app.student;
      const userId = user.id || user._id;
      return studentId === userId;
    });
  };

  const filteredDrives = drives.filter(drive => {
    const driveDate = new Date(drive.date);
    const today = new Date();
    
    if (filter === 'upcoming') {
      return driveDate >= today;
    } else if (filter === 'past') {
      return driveDate < today;
    }
    return true;
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Job Drives</h1>
        {/* Remove the Create New Drive button */}
      </div>

      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'upcoming' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'past' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      {filteredDrives.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No job drives found</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredDrives.map((drive) => {
            // Pre-calculate application status for this drive
            const hasApplied = isApplied(drive);
            
            // Add debugging for each drive
            console.log(`Drive: ${drive.companyName}, hasApplied: ${hasApplied}`);
            console.log('Applications for this drive:', drive.applications);
            console.log('Current user ID:', user?.id);
            
            return (
            <div key={drive._id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{drive.companyName}</h3>
                  <p className="text-gray-600">{drive.role}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    drive.type === 'full-time' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {drive.type}
                  </span>
                  {(user.role === 'po' || user.role === 'staff') && (
                    <button
                      onClick={() => handleDelete(drive._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{drive.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CTC</p>
                  <p className="font-medium">
                    {drive.ctc ? `₹${drive.ctc} LPA` : 'Not specified'}
                  </p>
          
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{new Date(drive.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Applications</p>
                  <p className="font-medium">{drive.applications.length}</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{drive.description}</p>
              
              {drive.skills && drive.skills.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Required Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {drive.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Created by: {drive.createdBy?.profile?.name || drive.createdBy?.email || 'Unknown'}
                  </p>
                  
                  {user.role === 'student' && !isApplied(drive) && (
                    <button
                      onClick={() => handleApply(drive._id)}
                      className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-medium"
                    >
                      Apply Now
                    </button>
                  )}
                  
                  {user.role === 'student' && isApplied(drive) && (
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                      Applied ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
};

export default JobDrives;







































