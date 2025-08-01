import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import PRJobCard from './PRJobCard';
import RoundManagementModal from './RoundManagementModal';

const normalizeDepartment = (dept) => {
  if (!dept) return null;
  return dept.toLowerCase().trim();
};

const AllJobDrives = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [showPlacedStudentsViewModal, setShowPlacedStudentsViewModal] = useState(false);
  const [selectedDriveForView, setSelectedDriveForView] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editStudentData, setEditStudentData] = useState({
    name: '',
    rollNumber: '',
    department: '',
    email: '',
    mobileNumber: ''
  });
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [selectedJobForRounds, setSelectedJobForRounds] = useState(null);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(null);
  const [showRoundStudentsModal, setShowRoundStudentsModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);
  const [selectedJobForRoundView, setSelectedJobForRoundView] = useState(null);
  const [showManageRoundsModal, setShowManageRoundsModal] = useState(false);
  const [selectedDriveForRounds, setSelectedDriveForRounds] = useState(null);
  const [selectedRoundForManagement, setSelectedRoundForManagement] = useState(null);
  const [roundApplicants, setRoundApplicants] = useState([]);
  const [selectedStudentsForRound, setSelectedStudentsForRound] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Add these helper functions at the top of the component
  const isDriveCreator = (drive) => {
    const isCreator = drive.createdBy?._id === user?.id;
    console.log('=== CREATOR CHECK ===');
    console.log('Drive:', drive.companyName);
    console.log('Drive creator ID:', drive.createdBy?._id);
    console.log('Current user ID:', user?.id);
    console.log('Is creator:', isCreator);
    return isCreator;
  };

  const canManageDrive = (drive) => {
    // If no createdBy info, nobody can manage
    if (!drive.createdBy) {
      console.log('❌ No creator info - no management access');
      return false;
    }
    
    // Check if user created the drive
    const isCreator = isDriveCreator(drive);
    
    // For PRs - also check department access
    if (user?.role === 'placement_representative' || user?.role === 'pr') {
      const userDept = normalizeDepartment(user.profile?.department);
      const creatorDept = normalizeDepartment(drive.createdBy?.profile?.department);
      
      console.log('=== MANAGE ACCESS CHECK ===');
      console.log('Drive:', drive.companyName);
      console.log('User:', user.email);
      console.log('User Dept (normalized):', userDept);
      console.log('Creator:', drive.createdBy.email);
      console.log('Creator Dept (normalized):', creatorDept);
      console.log('Is creator:', isCreator);
      
      // Allow if same department OR if user created the drive
      if (isCreator || (userDept && creatorDept && userDept === creatorDept)) {
        console.log('✅ Management access granted - same department or creator');
        return true;
      } else {
        console.log('❌ Different department and not creator - access denied');
        return false;
      }
    }
    
    // For POs - they can manage everything
    if (user?.role === 'po' || user?.role === 'placement_officer') {
      return true;
    }
    
    return isCreator;
  };

  const isViewOnlyPR = (drive) => {
    return (user?.role === 'placement_representative' || user?.role === 'pr') && !canManageDrive(drive);
  };

  // Function to check if applications are still open (for application deadline)
  const isApplicationDeadlinePassed = (drive) => {
    // If there's a deadline, use that; otherwise use drive date
    const checkDate = drive.deadline || drive.date;
    if (!checkDate) return false;
    
    const deadlineDateTime = new Date(checkDate);
    
    // If drive has a specific time, use it; otherwise assume end of day
    if (drive.time && drive.deadline) {
      const [hours, minutes] = drive.time.split(':');
      deadlineDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    } else {
      // If no time specified, consider applications open until end of deadline day
      deadlineDateTime.setHours(23, 59, 59, 999);
    }
    
    const currentDateTime = new Date();
    return currentDateTime > deadlineDateTime;
  };

  // Function to check if drive has ended (for filtering purposes)
  const isDriveEnded = (drive) => {
    if (!drive.date) return false;
    
    const driveDate = new Date(drive.date);
    const currentDate = new Date();
    
    // If drive has time, use it for comparison
    if (drive.time) {
      const [hours, minutes] = drive.time.split(':').map(Number);
      driveDate.setHours(hours, minutes, 0, 0);
      return currentDate > driveDate;
    } else {
      // If no time specified, consider drive ended at end of day
      driveDate.setHours(23, 59, 59, 999);
      return currentDate > driveDate;
    }
  };

  const handleViewPlacedStudents = (drive) => {
    setSelectedDriveForView(drive);
    setShowPlacedStudentsViewModal(true);
  };

  useEffect(() => {
    // Wait for auth context to load before checking user
    if (user === null) {
      // Still loading auth state, don't redirect yet
      return;
    }
    
    // Allow both placement_representative and placement_officer
    if (!user || (user.role !== 'placement_representative' && user.role !== 'placement_officer' && user.role !== 'po')) {
      navigate('/login');
      return;
    }
    fetchAllJobDrives();
  }, [user, navigate]);

  const fetchAllJobDrives = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/job-drives', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('=== API RESPONSE DEBUG ===');
      console.log('Full response:', response.data);
      console.log('Job drives:', response.data.jobDrives);
      
      // Debug each drive's creator info
      response.data.jobDrives.forEach((drive, index) => {
        console.log(`Drive ${index + 1} (${drive.companyName}):`, {
          createdBy: drive.createdBy,
          createdById: drive.createdBy?._id,
          createdByProfile: drive.createdBy?.profile,
          createdByDept: drive.createdBy?.profile?.department
        });
      });
      
      setDrives(response.data.jobDrives || []);
    } catch (error) {
      console.error('Error fetching job drives:', error);
      toast.error('Failed to fetch job drives');
    } finally {
      setLoading(false);
    }
  };

  // Add this useEffect to debug the data
  useEffect(() => {
    if (drives.length > 0) {
      console.log('=== DRIVES DEBUG ===');
      drives.forEach((drive, index) => {
        console.log(`Drive ${index + 1}:`, {
          company: drive.companyName,
          createdBy: drive.createdBy,
          createdByProfile: drive.createdBy?.profile,
          createdByDept: drive.createdBy?.profile?.department
        });
      });
      
      console.log('Current user:', {
        role: user?.role,
        department: user?.profile?.department,
        profile: user?.profile
      });
    }
  }, [drives, user]);

  const handleDeleteDrive = async (driveId) => {
    if (!window.confirm('Are you sure you want to delete this job drive?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/job-drives/${driveId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      toast.success('Job drive deleted successfully');
      setDrives(drives.filter(drive => drive._id !== driveId));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete job drive');
    }
  };

  const handleEditDrive = (driveId) => {
    navigate(`/pr/edit-job/${driveId}?returnTo=/all-job-drives`);
  };

  const handleViewDrive = (drive) => {
    setSelectedDrive(drive);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDrive(null);
  };

  const getFilteredDrives = () => {
    console.log('=== ALL JOB DRIVES FILTERING ===');
    console.log('Total drives:', drives.length);
    console.log('Current filter:', filter);
    console.log('User role:', user?.role);
    
    return drives.filter(drive => {
      const driveEnded = isDriveEnded(drive);
      console.log(`Drive ${drive.companyName}: ended=${driveEnded}, date=${drive.date}, time=${drive.time}`);
      
      if (filter === 'upcoming') {
        return !driveEnded; // Not ended yet
      } else if (filter === 'past') {
        return driveEnded; // Drive has ended
      }
      return true; // 'all' filter
    });
  };

  // Removed handleAddPlacedStudents and handleSubmitPlacedStudents

  const handleEditStudent = (student, index) => {
    setEditingStudent(index);
    setEditStudentData({
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department || '',
      email: student.email,
      mobileNumber: student.mobileNumber || ''
    });
  };

  const handleSaveEdit = async (index) => {
    try {
      const response = await fetch(`http://localhost:5000/api/job-drives/${selectedDriveForView._id}/update-placed-student`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          index: index,
          studentData: editStudentData
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Student updated successfully!');
        setEditingStudent(null);
        
        // Update the local state immediately
        setSelectedDriveForView(prev => ({
          ...prev,
          placedStudents: result.placedStudents
        }));
        
        // Also refresh the main drives list
        await fetchAllJobDrives();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Error updating student');
    }
  };

  const handleDeleteStudent = async (index) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/job-drives/${selectedDriveForView._id}/delete-placed-student`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ index: index })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Student deleted successfully!');
        
        // Update the local state immediately
        setSelectedDriveForView(prev => ({
          ...prev,
          placedStudents: result.placedStudents
        }));
        
        // Also refresh the main drives list
        await fetchAllJobDrives();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Error deleting student');
    }
  };

  const downloadCSV = () => {
    if (!selectedDriveForView?.placedStudents?.length) {
      toast.error('No data to download');
      return;
    }

    const headers = ['S.No', 'Name', 'Roll Number', 'Department', 'Email', 'Mobile', 'Added On'];
    const csvContent = [
      headers.join(','),
      ...selectedDriveForView.placedStudents.map((student, index) => [
        index + 1,
        `"${student.name}"`,
        `"${student.rollNumber}"`,
        `"${student.department || 'N/A'}"`,
        `"${student.email}"`,
        `"${student.mobileNumber || 'N/A'}"`,
        `"${student.addedAt ? new Date(student.addedAt).toLocaleDateString() : 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedDriveForView.companyName}_placed_students.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManageRounds = (drive, roundIndex) => {
    // For same department PRs - full management access
    setSelectedJobForRounds(drive);
    setSelectedRoundIndex(roundIndex);
    setShowRoundModal(true);
  };

  const handleViewRoundStudents = (drive, round, roundIndex) => {
    console.log('=== VIEW ROUND STUDENTS (PO) ===');
    console.log('Drive:', drive.companyName);
    console.log('Round:', round.name || `Round ${roundIndex + 1}`);
    console.log('Selected Students:', round.selectedStudents);
    
    setSelectedJobForRoundView(drive);
    setSelectedRound(round);
    setSelectedRoundIndex(roundIndex);
    setShowRoundStudentsModal(true);
  };

  const closeRoundModal = () => {
    setShowRoundModal(false);
    setSelectedJobForRounds(null);
    setSelectedRoundIndex(null);
    fetchAllJobDrives(); // Refresh the drives data
  };

  const closeRoundStudentsModal = () => {
    setShowRoundStudentsModal(false);
    setSelectedRound(null);
    setSelectedRoundIndex(null);
    setSelectedJobForRoundView(null);
  };

  // Add these handler functions after existing handlers
  const handleManageRoundsClick = (drive) => {
    setSelectedDriveForRounds(drive);
    setShowManageRoundsModal(true);
  };

  const handleRoundSelect = async (round, roundIndex) => {
    setSelectedRoundForManagement(round);
    setSelectedRoundIndex(roundIndex);
    setLoadingApplicants(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/job-drives/${selectedDriveForRounds._id}/applicants`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setRoundApplicants(response.data.applicants || []);
      setSelectedStudentsForRound(round.selectedStudents || []);
    } catch (error) {
      console.error('Error fetching applicants:', error);
      toast.error('Failed to fetch applicants');
      setRoundApplicants([]);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleStudentSelection = (studentId) => {
    setSelectedStudentsForRound(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSaveSelectedStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/job-drives/${selectedDriveForRounds._id}/rounds/${selectedRoundIndex}/select-students`,
        { studentIds: selectedStudentsForRound },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      toast.success('Students selected successfully');
      setSelectedRoundForManagement(null);
      setSelectedRoundIndex(null);
      fetchAllJobDrives(); // Refresh data
    } catch (error) {
      console.error('Error saving selected students:', error);
      toast.error('Failed to save selected students');
    }
  };

  const closeManageRoundsModal = () => {
    setShowManageRoundsModal(false);
    setSelectedDriveForRounds(null);
    setSelectedRoundForManagement(null);
    setSelectedRoundIndex(null);
    setRoundApplicants([]);
    setSelectedStudentsForRound([]);
  };

  // Modal component - Enhanced with all job details
 const DriveModal = ({ drive, onClose }) => {
    if (!drive) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{drive.companyName}</h2>
                <p className="text-xl text-gray-600">{drive.role}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Job Details</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><span className="font-medium">Type:</span> {drive.type === 'full-time' ? 'Full Time' : drive.type === 'internship' ? 'Internship' : drive.jobType === 'full-time' ? 'Full Time' : drive.jobType === 'internship' ? 'Internship' : 'Full Time'}</p>
                    <p><span className="font-medium">Location:</span> {drive.location || drive.locations?.join(', ') || 'Not specified'}</p>
                    <p><span className="font-medium">CTC:</span> {drive.ctc ? `₹${drive.ctc} LPA` : 'Not specified'}</p>
                    <p><span className="font-medium">Date:</span> {drive.date ? new Date(drive.date).toLocaleDateString() : 'Not specified'}</p>
                    <p><span className="font-medium">Deadline:</span> {drive.deadline ? new Date(drive.deadline).toLocaleDateString() : 'Not specified'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Eligibility Criteria</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><span className="font-medium">Min CGPA:</span> {drive.eligibility?.minCGPA || 0}</p>
                    <p><span className="font-medium">Max Backlogs:</span> {drive.eligibility?.maxBacklogs || 0}</p>
                    <p><span className="font-medium">Departments:</span> {drive.eligibility?.allowedDepartments?.join(', ') || 'All'}</p>
                    <p><span className="font-medium">Batches:</span> {drive.eligibility?.allowedBatches?.join(', ') || 'All'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Description</h3>
                  <p className="mt-2 text-sm text-gray-700">{drive.description || 'No description provided'}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Requirements</h3>
                  <p className="mt-2 text-sm text-gray-700">{drive.requirements && drive.requirements.trim() !== '' ? drive.requirements : 'No specific requirements mentioned'}</p>
                </div>

                {drive.skills && drive.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900">Required Skills</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {drive.skills.map((skill, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {drive.bond && (
                  <div>
                    <h3 className="font-semibold text-gray-900">Bond Details</h3>
                    <p className="mt-2 text-sm text-gray-700">{drive.bond}</p>
                  </div>
                )}

                {drive.rounds && drive.rounds.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900">Selection Rounds</h3>
                    <div className="mt-2 space-y-1">
                      {drive.rounds.map((round, index) => (
                        <p key={index} className="text-sm text-gray-700">
                          {index + 1}. {round}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <p>Applications: {drive.applications?.length || 0}</p>
                  <p>Created by: {drive.createdBy?.profile?.name || drive.createdBy?.email || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredDrives = getFilteredDrives();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with department info for PRs */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Job Drives</h1>
            {user?.role === 'placement_representative' && (
              <p className="text-gray-600 mt-1">
                Showing all job drives across all departments
              </p>
            )}
            {(user?.role === 'po' || user?.role === 'placement_officer') && (
              <p className="text-gray-600 mt-1">
                Showing all job drives (Placement Officer View)
              </p>
            )}
          </div>
          <div className="flex flex-wrap">
          <button
              onClick={() => navigate('/pr-create-job')}
              className="bg-blue-600 text-white px-4 py-2 mr-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Job Drive
          </button><button
            onClick={() => navigate('/pr-dashboard')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Dashboard
          </button></div>
        </div>

        {/* Filter Buttons - use same logic as JobDrives.js */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'upcoming', 'past'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                filter === filterType
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              {filterType} ({drives.filter(drive => {
                const driveEnded = isDriveEnded(drive);
                
                if (filterType === 'upcoming') return !driveEnded;
                if (filterType === 'past') return driveEnded;
                return true;
              }).length})
            </button>
          ))}
        </div>

      
        {/* Drives List */}
        {filteredDrives.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No job drives found for "{filter}" filter</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredDrives.map((drive) => {
              const driveEnded = isDriveEnded(drive);
              const hasSelectionRounds = drive.selectionRounds && Array.isArray(drive.selectionRounds) && drive.selectionRounds.length > 0;
              const canManage = canManageDrive(drive);
              const isCreator = isDriveCreator(drive);
              
              return (
                <div key={drive._id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{drive.companyName}</h3>
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          !driveEnded ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {!driveEnded ? 'Upcoming' : 'Ended'}
                        </span>
                        {hasSelectionRounds && (
                          <span className="px-2 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                            {drive.selectionRounds.length} Rounds
                          </span>
                        )}
                        {!drive.createdBy && (
                          <span className="px-2 py-1 rounded-full text-sm bg-red-100 text-red-800">
                            Missing Creator Info
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{drive.role}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 mb-4">
                        <div>
                          <span className="font-medium">Location:</span> {drive.displayLocation || drive.location || (drive.locations && drive.locations.length > 0 ? drive.locations.join(', ') : 'Not specified')}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {drive.displayType || drive.type || drive.jobType || 'Not specified'}
                        </div>
                        <div>
                          <span className="font-medium">CTC:</span> 
                          {drive.ctc ? `₹${drive.ctc} LPA` : 'Not specified'}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {drive.date ? new Date(drive.date).toLocaleDateString() : 'Not specified'}
                          {drive.time && <span className="ml-1">at {drive.time}</span>}
                        </div>
                      </div>

                      {/* Selection Rounds with strict access control */}
                      {hasSelectionRounds && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">Selection Rounds:</h4>
                          <div className="space-y-2">
                            {drive.selectionRounds.map((round, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                                    {round.name || `Round ${index + 1}`}
                                  </span>
                                  {round.selectedStudents && round.selectedStudents.length > 0 && (
                                    <span className="text-sm text-gray-600">
                                      ({round.selectedStudents.length} selected)
                                    </span>
                                  )}
                                </div>
                                
                                {/* View selected students button for each round - FIX THE HANDLER */}
                                {round.selectedStudents && round.selectedStudents.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('=== VIEW SELECTED CLICKED (PO) ===');
                                      console.log('Drive:', drive.companyName);
                                      console.log('Round:', round.name || `Round ${index + 1}`);
                                      console.log('Selected Students:', round.selectedStudents);
                                      handleViewRoundStudents(drive, round, index);
                                    }}
                                    className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm font-medium"
                                  >
                                    View Selected
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-500">
                        <p>Applications: {drive.applications?.length || 0}</p>
                        <p>Placed Students: {drive.placedStudents?.length || 0}</p>
                        <p>Created by: {drive.createdBy?.profile?.name || drive.createdBy?.email || 'Unknown'}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <button
                        onClick={() => handleViewDrive(drive)}
                        className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-medium"
                      >
                        View Details
                      </button>
                      
                      {/* Add Manage Rounds button in the action buttons section (after View Details button) */}
                      {hasSelectionRounds && canManage && (
                        <button
                          onClick={() => handleManageRoundsClick(drive)}
                          className="px-4 py-2 bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg font-medium"
                        >
                          Manage Rounds
                        </button>
                      )}
                    
                      {/* Everyone can View Placed Students if they exist */}
                      {driveEnded && drive.placedStudents && drive.placedStudents.length > 0 && (
                        <button
                          onClick={() => handleViewPlacedStudents(drive)}
                          className="px-4 py-2 bg-purple-500 text-white hover:bg-purple-600 rounded-lg font-medium"
                        >
                          View Placed ({drive.placedStudents.length})
                        </button>
                      )}
                      
                      {/* STRICT: Only creator can Edit/Delete */}
                      {isDriveCreator(drive) && (
                        <>
                          <button
                            onClick={() => handleEditDrive(drive._id)}
                            className="px-4 py-2 bg-yellow-500 text-white hover:bg-yellow-600 rounded-lg font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDrive(drive._id)}
                            className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg font-medium"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Modal */}
      {showModal && <DriveModal drive={selectedDrive} onClose={closeModal} />}
      {/* Placed Students Modal */}
      {/* Removed Placed Students Modal */}
      {/* Placed Students View Modal for POs */}
      {showPlacedStudentsViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Placed Students - {selectedDriveForView?.companyName}</h2>
            </div>

            {selectedDriveForView?.placedStudents?.length > 0 ? (
              <div>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg">Drive Summary</h3>
                  <p><span className="font-medium">Company:</span> {selectedDriveForView.companyName}</p>
                  <p><span className="font-medium">Role:</span> {selectedDriveForView.role}</p>
                  <p><span className="font-medium">Total Applications:</span> {selectedDriveForView.applications?.length || 0}</p>
                  <p><span className="font-medium">Total Placed:</span> {selectedDriveForView.placedStudents.length}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">S.No</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Roll Number</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Department</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Mobile</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Added On</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedDriveForView.placedStudents.map((student, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{index + 1}</td>
                          <td className="px-4 py-3 text-sm">
                            {editingStudent === index ? (
                              <input
                                type="text"
                                value={editStudentData.name}
                                onChange={(e) => setEditStudentData({...editStudentData, name: e.target.value})}
                                className="w-full px-2 py-1 border rounded"
                              />
                            ) : (
                              <span className="font-medium">{student.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {editingStudent === index ? (
                              <input
                                type="text"
                                value={editStudentData.rollNumber}
                                onChange={(e) => setEditStudentData({...editStudentData, rollNumber: e.target.value})}
                                className="w-full px-2 py-1 border rounded"
                              />
                            ) : (
                              student.rollNumber
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {editingStudent === index ? (
                              <input
                                type="text"
                                value={editStudentData.department}
                                onChange={(e) => setEditStudentData({...editStudentData, department: e.target.value})}
                                className="w-full px-2 py-1 border rounded"
                              />
                            ) : (
                              student.department || 'N/A'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {editingStudent === index ? (
                              <input
                                type="email"
                                value={editStudentData.email}
                                onChange={(e) => setEditStudentData({...editStudentData, email: e.target.value})}
                                className="w-full px-2 py-1 border rounded"
                              />
                            ) : (
                              student.email
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {editingStudent === index ? (
                              <input
                                type="text"
                                value={editStudentData.mobileNumber}
                                onChange={(e) => setEditStudentData({...editStudentData, mobileNumber: e.target.value})}
                                className="w-full px-2 py-1 border rounded"
                              />
                            ) : (
                              student.mobileNumber || 'N/A'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {student.addedAt ? new Date(student.addedAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {editingStudent === index ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleSaveEdit(index)}
                                  className="text-green-600 hover:text-green-800 text-xs"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingStudent(null)}
                                  className="text-gray-600 hover:text-gray-800 text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditStudent(student, index)}
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(index)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No placed students found for this drive.</p>
              </div>
            )}

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={downloadCSV}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download CSV</span>
              </button>
              <button
                onClick={() => {
                  setShowPlacedStudentsViewModal(false);
                  setSelectedDriveForView(null);
                  setEditingStudent(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Round Management Modal */}
      <RoundManagementModal
        isOpen={showRoundModal}
        onClose={closeRoundModal}
        job={selectedJobForRounds}
        roundIndex={selectedRoundIndex}
      />
      {/* Round Students Modal for PO */}
      {showRoundStudentsModal && selectedRound && selectedJobForRoundView && (
        <RoundStudentsModal
          isOpen={showRoundStudentsModal}
          round={selectedRound}
          roundIndex={selectedRoundIndex}
          jobDrive={selectedJobForRoundView}
          onClose={closeRoundStudentsModal}
        />
      )}
      {/* Manage Rounds Modal */}
      {showManageRoundsModal && selectedDriveForRounds && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Manage Rounds - {selectedDriveForRounds.companyName}
              </h2>
              <button
                onClick={closeManageRoundsModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rounds List */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Selection Rounds</h3>
                <div className="space-y-2">
                  {selectedDriveForRounds.selectionRounds?.map((round, index) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRoundIndex === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleRoundSelect(round, index)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {round.name || `Round ${index + 1}`}
                        </span>
                        <span className="text-sm text-gray-600">
                          {round.selectedStudents?.length || 0} selected
                        </span>
                      </div>
                      {round.details && (
                        <p className="text-sm text-gray-600 mt-1">{round.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Selection */}
              <div>
                {selectedRoundForManagement ? (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold">
                        Select Students for {selectedRoundForManagement.name || `Round ${selectedRoundIndex + 1}`}
                      </h3>
                      <span className="text-sm text-gray-600">
                        {selectedStudentsForRound.length} selected
                      </span>
                    </div>

                    {loadingApplicants ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading applicants...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                          {roundApplicants.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No applicants found for this drive
                            </div>
                          ) : (
                            <div className="space-y-2 p-2">
                              {roundApplicants.map((application) => (
                                <div
                                  key={application.student._id}
                                  className={`p-3 border rounded cursor-pointer transition-colors ${
                                    selectedStudentsForRound.includes(application.student._id)
                                      ? 'border-green-500 bg-green-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                  onClick={() => handleStudentSelection(application.student._id)}
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-medium">{application.student.profile?.name}</p>
                                      <p className="text-sm text-gray-600">
                                        {application.student.email}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {application.student.profile?.department}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm">
                                        CGPA: {application.student.profile?.cgpa || 'N/A'}
                                      </p>
                                      <p className="text-sm">
                                        Backlogs: {application.student.profile?.currentBacklogs || 0}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end space-x-3 mt-4">
                          <button
                            onClick={() => {
                              setSelectedRoundForManagement(null);
                              setSelectedRoundIndex(null);
                            }}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveSelectedStudents}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                          >
                            Save Selection ({selectedStudentsForRound.length})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Select a round to manage students
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RoundStudentsModal = ({ isOpen, onClose, round, roundIndex, jobDrive }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && round && round.selectedStudents && round.selectedStudents.length > 0) {
      console.log('=== MODAL OPENED (PO) ===');
      console.log('Round:', round.name);
      console.log('Selected Students:', round.selectedStudents);
      fetchSelectedStudents();
    }
  }, [isOpen, round]);

  const fetchSelectedStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('=== FETCHING STUDENTS (PO) ===');
      console.log('Job Drive ID:', jobDrive._id);
      console.log('Student IDs to fetch:', round.selectedStudents);
      
      const response = await axios.post(
        `http://localhost:5000/api/job-drives/${jobDrive._id}/get-students-by-ids`, 
        { studentIds: round.selectedStudents },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log('✅ API Response received:', response.data);
      setStudents(response.data.students || []);
      
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to fetch selected students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Selected Students - {round.name || `Round ${roundIndex + 1}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Company:</strong> {jobDrive.companyName} | 
            <strong> Round:</strong> {round.name || `Round ${roundIndex + 1}`} | 
            <strong> Selected:</strong> {round.selectedStudents?.length || 0} students
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading selected students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No student details found for this round.</p>
            <p className="text-sm mt-2">Selected Student IDs: {round.selectedStudents?.join(', ')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">S.No</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Roll No</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase">CGPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((student, index) => (
                  <tr key={student._id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {student.profile?.name || student.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.profile?.rollNumber || student.rollNumber || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.profile?.department || student.department || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.email || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.profile?.cgpa || student.cgpa || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllJobDrives;

















