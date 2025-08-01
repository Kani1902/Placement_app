import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const PODashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDrives: 0,
    upcomingDrives: 0,
    totalStudentsPlaced: 0
  });
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [studentsDetails, setStudentsDetails] = useState([]);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [placementFilter, setPlacementFilter] = useState('all');
  const [availableDepartments, setAvailableDepartments] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchAllDrives();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      console.log('Fetching PO dashboard stats...');
      
      // Fetch all drives
      const drivesResponse = await axios.get('http://localhost:5000/api/job-drives', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Drives response:', drivesResponse.data);
      
      const drives = drivesResponse.data.jobDrives || [];
      const totalDrives = drives.length;
      
      console.log('Total drives found:', totalDrives);
      
      // Calculate upcoming drives
      const upcomingDrives = drives.filter(drive => {
        const checkDate = drive.deadline || drive.date;
        if (!checkDate) return false;
        
        const deadlineDateTime = new Date(checkDate);
        if (drive.time && drive.deadline) {
          const [hours, minutes] = drive.time.split(':');
          deadlineDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
          deadlineDateTime.setHours(23, 59, 59, 999);
        }
        
        return new Date() <= deadlineDateTime;
      }).length;
      
      console.log('Upcoming drives:', upcomingDrives);
      
      // Fetch total students placed
      console.log('Fetching placed students count...');
      const placedResponse = await axios.get('http://localhost:5000/api/users/placed-students-count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('Placed students response:', placedResponse.data);
      
      const totalStudentsPlaced = placedResponse.data.count || 0;
      
      console.log('Final stats:', {
        totalDrives,
        upcomingDrives,
        totalStudentsPlaced
      });
      
      setStats({
        totalDrives,
        upcomingDrives,
        totalStudentsPlaced
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Failed to fetch dashboard statistics');
      
      // Set default values on error
      setStats({
        totalDrives: 0,
        upcomingDrives: 0,
        totalStudentsPlaced: 0
      });
    }
  };

  const fetchAllDrives = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5000/api/job-drives', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Process drives to ensure all fields are properly set
      const processedDrives = (response.data.jobDrives || []).map(drive => ({
        ...drive,
        displayLocation: drive.location || (drive.locations && drive.locations.length > 0 ? drive.locations.join(', ') : 'Not specified'),
        displayType: drive.type === 'full-time' ? 'Full Time' : drive.type === 'internship' ? 'Internship' : 'Full Time'
      }));
      
      setDrives(processedDrives);
    } catch (error) {
      console.error('Error fetching drives:', error);
      toast.error('Failed to fetch drives');
    } finally {
      setLoading(false);
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
      const response = await axios.post('http://localhost:5000/api/users/upload-cgpa', formData, {
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
    if (window.confirm('Are you sure you want to delete this drive?')) {
      try {
        const token = localStorage.getItem('token');
        console.log('Deleting drive:', driveId);
        console.log('User role:', user?.role);
        
        await axios.delete(`http://localhost:5000/api/job-drives/${driveId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        toast.success('Drive deleted successfully');
        fetchAllDrives();
        fetchStats(); // Refresh stats as well
      } catch (error) {
        console.error('Delete error:', error);
        if (error.response?.status === 403) {
          toast.error('Access denied - Only authorized users can delete drives');
        } else {
          toast.error('Failed to delete drive');
        }
      }
    }
  };

  // Add function to fetch students details
  const fetchStudentsDetails = async () => {
    setStudentsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users/students-details', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const students = response.data.students || [];
      setStudentsDetails(students);
      setAvailableDepartments(getUniqueDepartments(students));
      console.log('Students details fetched:', students.length);
    } catch (error) {
      console.error('Error fetching students details:', error);
      toast.error('Failed to fetch students details');
    } finally {
      setStudentsLoading(false);
    }
  };

  // Add function to get unique departments
  const getUniqueDepartments = (students) => {
    const departments = students
      .map(student => student.department)
      .filter(dept => dept && dept.trim() !== '')
      .filter((dept, index, arr) => arr.indexOf(dept) === index)
      .sort();
    return departments;
  };

  // Add function to get filtered students
  const getFilteredStudents = () => {
    return studentsDetails.filter(student => {
      // Department filter
      const departmentMatch = departmentFilter === 'all' || student.department === departmentFilter;
      
      // Placement filter
      let placementMatch = true;
      if (placementFilter === 'placed') {
        placementMatch = student.placementStatus === 'Placed';
      } else if (placementFilter === 'unplaced') {
        placementMatch = student.placementStatus === 'Not Placed' || !student.placementStatus;
      }
      
      return departmentMatch && placementMatch;
    });
  };

  // Add CSV download function for students details
  const downloadStudentsCSV = () => {
    const filteredStudents = getFilteredStudents();
    
    if (!filteredStudents?.length) {
      toast.error('No student data to download');
      return;
    }

    const headers = [
      'S.No', 'Name', 'Roll Number', 'Department', 'Degree', 'Graduation Year', 'CGPA',
      'Gender', 'Date of Birth', 'Personal Email', 'College Email', 'Phone Number',
      'Address', '10th Percentage', '12th Percentage', 'Diploma Percentage',
      'LinkedIn URL', 'GitHub URL', 'Current Backlogs', 'Backlog History',
      'About Me', 'Skills', 'Placement Status', 'Consent Status', 'Profile Complete',
      'Registered Date', 'Last Updated'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredStudents.map((student, index) => [
        index + 1,
        `"${student.name}"`,
        `"${student.rollNumber}"`,
        `"${student.department}"`,
        `"${student.degree}"`,
        `"${student.graduationYear}"`,
        `"${student.cgpa}"`,
        `"${student.gender}"`,
        `"${student.dateOfBirth !== 'N/A' ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'}"`,
        `"${student.personalEmail}"`,
        `"${student.collegeEmail}"`,
        `"${student.phoneNumber}"`,
        `"${student.address}"`,
        `"${student.tenthPercentage}"`,
        `"${student.twelfthPercentage}"`,
        `"${student.diplomaPercentage}"`,
        `"${student.linkedinUrl}"`,
        `"${student.githubUrl}"`,
        `"${student.currentBacklogs}"`,
        `"${Array.isArray(student.historyOfBacklogs) ? student.historyOfBacklogs.map(b => `${b.subject}-${b.semester}`).join('; ') : 'None'}"`,
        `"${student.aboutMe}"`,
        `"${Array.isArray(student.skills) ? student.skills.join('; ') : student.skills}"`,
        `"${student.placementStatus}"`,
        `"${student.placementConsent?.hasConsented ? 'Signed' : 'Not Signed'}"`,
        `"${student.otpVerified ? 'OTP Verified' : 'OTP Not Verified'}"`,
        `"${student.profileComplete ? 'Complete' : 'Incomplete'}"`,
        `"${student.registeredAt ? new Date(student.registeredAt).toLocaleDateString() : 'N/A'}"`,
        `"${student.lastUpdated ? new Date(student.lastUpdated).toLocaleDateString() : 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Include filter info in filename
    const filterSuffix = departmentFilter !== 'all' || placementFilter !== 'all' 
      ? `_${departmentFilter !== 'all' ? departmentFilter.replace(/\s+/g, '_') : 'AllDepts'}_${placementFilter !== 'all' ? placementFilter : 'AllStatus'}`
      : '';
    
    link.setAttribute('download', `students_details${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Downloaded ${filteredStudents.length} student records`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Placement Officer Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name}!</p>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/create-job-drive"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Drive
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Drives</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalDrives}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming Drives</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.upcomingDrives}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totals Placed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalStudentsPlaced}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/pr-create-job" className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors">
            <h3 className="text-lg font-semibold mb-2">Create New Drive</h3>
            <p className="text-blue-100">Add a new job drive for companies</p>
          </Link>
          <Link to="/manage-drives" className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition-colors">
            <h3 className="text-lg font-semibold mb-2">Manage Drives</h3>
            <p className="text-green-100">View and manage all job drives</p>
          </Link>
          <Link to="/job-drives" className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors">
            <h3 className="text-lg font-semibold mb-2">View All Drives</h3>
            <p className="text-purple-100">Browse all available job drives</p>
          </Link>
        </div>

        {/* CGPA Upload Section */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Upload Student & PR CGPA</h2>
            <p className="text-sm text-gray-600">Upload CSV file with roll numbers and CGPA for students and placement representatives</p>
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
              {uploadLoading && <span className="text-blue-600">Uploading...</span>}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <p>CSV should contain columns: ROLL NO, CGPA</p>
              <p>This will update CGPA for both students and placement representatives</p>
            </div>
          </div>
        </div>

        {/* Job Drives Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Job Drives</h2>
          </div>
          
          <div className="p-6">
            {drives.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No drives created yet</p>
            ) : (
              <div className="space-y-4">
                {drives.map((drive) => (
                  <div key={drive._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{drive.companyName}</h3>
                        <p className="text-gray-600">{drive.role}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span>📍 {drive.displayLocation || drive.location || (drive.locations && drive.locations.length > 0 ? drive.locations.join(', ') : 'Not specified')}</span>
                          <span>💼 {drive.displayType || drive.type || drive.jobType || 'Not specified'}</span>
                          <span>💰 {drive.ctc ? `${drive.ctc} LPA` : 'Not specified'}</span>
                          <span>📅 {new Date(drive.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => handleDeleteDrive(drive._id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Students Details Modal */}
        {showStudentsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Students Details</h3>
                <button
                  onClick={() => setShowStudentsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {/* Filters Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Department:</label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Departments</option>
                      {availableDepartments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Placement Status:</label>
                    <select
                      value={placementFilter}
                      onChange={(e) => setPlacementFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Students</option>
                      <option value="placed">Placed Only</option>
                      <option value="unplaced">Unplaced Only</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-auto">
                    <span className="text-sm text-gray-600">
                      Showing {getFilteredStudents().length} of {studentsDetails.length} students
                    </span>
                    <button
                      onClick={() => {
                        setDepartmentFilter('all');
                        setPlacementFilter('all');
                      }}
                      className="px-3 py-1 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded text-sm"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>

              {studentsLoading ? (
                <div className="text-center py-8">
                  <p>Loading students...</p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[60vh]">
                  <div className="mb-4 flex justify-between items-center">
                    <h4 className="font-semibold">
                      Students List ({getFilteredStudents().length} students)
                    </h4>
                    <button
                      onClick={downloadStudentsCSV}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Download CSV
                    </button>
                  </div>
                  
                  {getFilteredStudents().length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {studentsDetails.length === 0 
                          ? 'No students found' 
                          : 'No students match the selected filters'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CGPA</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Placement Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getFilteredStudents().map((student, index) => (
                            <tr key={student._id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{student.rollNumber}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{student.department}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{student.cgpa}</td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  student.placementStatus === 'Placed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {student.placementStatus || 'Not Placed'}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  student.profileComplete 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {student.profileComplete ? 'Complete' : 'Incomplete'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PODashboard;

















































