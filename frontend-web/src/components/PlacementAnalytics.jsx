import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const PlacementAnalytics = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [newBatch, setNewBatch] = useState('');
  const [showAddBatch, setShowAddBatch] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchAnalytics(selectedBatch);
    }
  }, [selectedBatch]);

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/placement-analytics/batches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setBatches(response.data.batches || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Error fetching batches');
    }
  };

  const fetchAnalytics = async (batch) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/placement-analytics/${batch}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAnalytics(response.data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics(null);
      if (error.response?.status !== 404) {
        toast.error('Error fetching analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatch = async () => {
    if (!newBatch.trim()) {
      toast.error('Please enter a batch name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/placement-analytics/batches', 
        { batchName: newBatch.trim() },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      toast.success('Batch added successfully');
      setNewBatch('');
      setShowAddBatch(false);
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error adding batch');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }
    
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('batch', selectedBatch);

    try {
      setUploadLoading(true);
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/placement-analytics/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('File uploaded and analytics generated successfully');
      setFile(null);
      fetchAnalytics(selectedBatch);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error uploading file');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteAnalytics = async () => {
    if (!selectedBatch) return;
    
    if (window.confirm('Are you sure you want to delete analytics for this batch?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/placement-analytics/${selectedBatch}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        toast.success('Analytics deleted successfully');
        setAnalytics(null);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error deleting analytics');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Placement Analytics</h1>
          </div>

          <div className="p-6">
            {/* Batch Management */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Select Batch</h2>
                <button
                  onClick={() => setShowAddBatch(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Add New Batch
                </button>
              </div>

              {showAddBatch && (
                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newBatch}
                      onChange={(e) => setNewBatch(e.target.value)}
                      placeholder="Enter batch name (e.g., 2024)"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    />
                    <button
                      onClick={handleAddBatch}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddBatch(false);
                        setNewBatch('');
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select a batch</option>
                {batches.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload */}
            {selectedBatch && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Placement Data</h2>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept=".csv,.pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  />
                  <button
                    onClick={handleFileUpload}
                    disabled={uploadLoading || !file}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploadLoading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Supported formats: CSV, PDF (Max size: 10MB)
                </p>
              </div>
            )}

            {/* Analytics Display */}
            {selectedBatch && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Analytics for {selectedBatch}</h2>
                  {analytics && (
                    <button
                      onClick={handleDeleteAnalytics}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      Delete Analytics
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading analytics...</p>
                  </div>
                ) : analytics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-blue-900">Total Students</h3>
                      <p className="text-3xl font-bold text-blue-600">{analytics.totalStudents || 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-green-900">Placed Students</h3>
                      <p className="text-3xl font-bold text-green-600">{analytics.placedStudents || 0}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-yellow-900">Placement Rate</h3>
                      <p className="text-3xl font-bold text-yellow-600">{analytics.placementRate || 0}%</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-purple-900">Average Package</h3>
                      <p className="text-3xl font-bold text-purple-600">₹{analytics.averagePackage || 0}L</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-indigo-900">Highest Package</h3>
                      <p className="text-3xl font-bold text-indigo-600">₹{analytics.highestPackage || 0}L</p>
                    </div>
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-pink-900">Total Companies</h3>
                      <p className="text-3xl font-bold text-pink-600">{analytics.totalCompanies || 0}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No analytics data available for this batch.</p>
                    <p className="text-sm text-gray-500 mt-2">Upload a file to generate analytics.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlacementAnalytics;
