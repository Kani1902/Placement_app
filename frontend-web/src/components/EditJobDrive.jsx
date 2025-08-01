import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import toast from "react-hot-toast";

const EditJobDrive = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [locationInput, setLocationInput] = useState('');

  // Determine return path based on current location or referrer
  const getReturnPath = () => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const returnTo = searchParams.get("returnTo");

    if (returnTo) {
      return returnTo;
    }

    // If coming from all-job-drives page, return there
    if (document.referrer.includes("/all-job-drives")) {
      return "/all-job-drives";
    }

    // Default return path
    return "/job-drives";
  };

  const [formData, setFormData] = useState({
    // Basic Company Details
    companyName: "",
    companyWebsite: "",
    companyDescription: "",
    recruiterContact: {
    name: "",
    email: "",
    phone: ""
  },
    driveMode: "on-campus",
    locations: [],
    
    // Job Role Details
    role: "",
    type: "full-time",
    description: "",
    requirements: "",
    skills: "",
    
    // Package Details
    ctc: "",
    ctcBreakdown: {
      baseSalary: "",
      variablePay: "",
      joiningBonus: "",
      otherBenefits: ""
    },
    
    // Bond Details
    bond: "",
    bondDetails: {
      amount: "",
      duration: ""
    },
    
    // Drive Details
    date: "",
    time: "",
    deadline: "",
    venue: "",
    driveMode: "on-campus",
    
    // Selection Process
    rounds: "",
    testDetails: "",
    interviewProcess: "",
    
    // Additional Settings
    isDreamJob: false,
    unplacedOnly: false,
    
    // Eligibility Criteria
    eligibility: {
      minCGPA: "",
      allowedDepartments: [],
      allowedBatches: [],
      maxBacklogs: "",
      noCurrentBacklogs: false,
      historyOfArrears: false,
    },
  });

  const departments = [
    'Computer Science and Engineering',
    'Information Technology',
    'Electronics and Communication Engineering',
    'Electrical and Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Production Engineering',
    'Industrial Biotechnology',
    'Electronic and Instrumentation Engineering'
  ];

  const batches = ['2024', '2025', '2026', '2027'];

  useEffect(() => {
    fetchJobDrive();
  }, [id]);

  const fetchJobDrive = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/job-drives/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const drive = response.data.jobDrive;
      console.log("Fetched raw drive data:", drive); // Debug log

      setFormData({
        // Basic Company Details
        companyName: drive.companyName || "",
        companyWebsite: drive.companyWebsite || "",
        companyDescription: drive.companyDescription || "",
        recruiterContact: {
          name: drive.recruiterContact?.name || "",
          email: drive.recruiterContact?.email || "",
          phone: drive.recruiterContact?.phone || ""
        },
        driveMode: drive.driveMode || "on-campus",
        locations: Array.isArray(drive.locations) ? drive.locations : (drive.location ? [drive.location] : []),
        
        // Job Role Details
        role: drive.role || "",
        type: drive.type || drive.jobType || "full-time",
        description: drive.description || "",
        requirements: drive.requirements || "",
        skills: Array.isArray(drive.skills) ? drive.skills.join(", ") : (drive.skills || ""),
        
        // Package Details
        ctc: drive.ctc ? drive.ctc.toString() : "",
        ctcBreakdown: {
          baseSalary: drive.ctcBreakdown?.baseSalary || "",
          variablePay: drive.ctcBreakdown?.variablePay || "",
          joiningBonus: drive.ctcBreakdown?.joiningBonus || "",
          otherBenefits: drive.ctcBreakdown?.otherBenefits || ""
        },
        
        // Bond Details
        bond: drive.bond || "",
        bondDetails: {
          amount: drive.bondDetails?.amount || "",
          duration: drive.bondDetails?.duration || ""
        },
        
        // Drive Details
        date: drive.date ? drive.date.split('T')[0] : "",
        time: drive.time || "",
        deadline: drive.deadline ? drive.deadline.split('T')[0] : "",
        venue: drive.venue || "",
        
        // Selection Process
        rounds: Array.isArray(drive.rounds) ? drive.rounds.join(", ") : (drive.rounds || ""),
        testDetails: drive.testDetails || "",
        interviewProcess: drive.interviewProcess || "",
        
        // Additional Settings
        isDreamJob: Boolean(drive.isDreamJob),
        unplacedOnly: Boolean(drive.unplacedOnly),
        
        // Eligibility Criteria - Handle multiple possible field names
        eligibility: {
          minCGPA: drive.eligibility?.minCGPA || drive.eligibility?.cgpa || "",
          allowedDepartments: Array.isArray(drive.eligibility?.allowedDepartments) 
            ? drive.eligibility.allowedDepartments 
            : Array.isArray(drive.eligibility?.departments) 
              ? drive.eligibility.departments 
              : [],
          allowedBatches: Array.isArray(drive.eligibility?.allowedBatches) 
            ? drive.eligibility.allowedBatches 
            : Array.isArray(drive.eligibility?.batches) 
              ? drive.eligibility.batches 
              : [],
          maxBacklogs: drive.eligibility?.maxBacklogs || "",
          noCurrentBacklogs: Boolean(drive.eligibility?.noCurrentBacklogs),
          historyOfArrears: Boolean(drive.eligibility?.historyOfArrears),
        },
      });

      console.log("Mapped form data:", {
        companyName: drive.companyName,
        role: drive.role,
        type: drive.type || drive.jobType,
        ctc: drive.ctc,
        locations: Array.isArray(drive.locations) ? drive.locations : [drive.location],
        eligibility: drive.eligibility
      });

    } catch (error) {
      console.error("Error fetching job drive:", error);
      toast.error("Failed to fetch job drive details");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        // Basic Company Details
        companyName: formData.companyName,
        companyWebsite: formData.companyWebsite,
        companyDescription: formData.companyDescription,
        recruiterContact: formData.recruiterContact,
        driveMode: formData.driveMode,
        locations: formData.locations,
        location: formData.locations[0] || "", // For backward compatibility
        
        // Job Role Details
        role: formData.role,
        type: formData.type,
        jobType: formData.type, // Backend expects both
        description: formData.description,
        requirements: formData.requirements,
        skills: formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        
        // Package Details
        ctc: parseFloat(formData.ctc) || 0,
        ctcBreakdown: formData.ctcBreakdown,
        
        // Bond Details
        bond: formData.bond,
        bondDetails: formData.bondDetails,
        
        // Drive Details
        date: formData.date,
        time: formData.time,
        deadline: formData.deadline,
        venue: formData.venue,
        
        // Selection Process
        rounds: formData.rounds
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        testDetails: formData.testDetails,
        interviewProcess: formData.interviewProcess,
        
        // Additional Settings
        isDreamJob: formData.isDreamJob,
        unplacedOnly: formData.unplacedOnly,
        
        // Eligibility - Send in both formats for compatibility
        eligibility: {
          minCGPA: parseFloat(formData.eligibility.minCGPA) || 0,
          cgpa: parseFloat(formData.eligibility.minCGPA) || 0, // Backend compatibility
          maxBacklogs: parseInt(formData.eligibility.maxBacklogs) || 0,
          allowedDepartments: formData.eligibility.allowedDepartments,
          departments: formData.eligibility.allowedDepartments, // Backend compatibility
          allowedBatches: formData.eligibility.allowedBatches,
          batches: formData.eligibility.allowedBatches, // Backend compatibility
          noCurrentBacklogs: formData.eligibility.noCurrentBacklogs,
          historyOfArrears: formData.eligibility.historyOfArrears,
        },
      };

      console.log("Update payload:", payload);

      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5000/api/job-drives/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      toast.success("Job drive updated successfully!");
      navigate(getReturnPath());
    } catch (error) {
      console.error("Update error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update job drive"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('eligibility.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        eligibility: {
          ...prev.eligibility,
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (name.startsWith('ctcBreakdown.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        ctcBreakdown: {
          ...prev.ctcBreakdown,
          [field]: value
        }
      }));
    } else if (name.startsWith('bondDetails.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bondDetails: {
          ...prev.bondDetails,
          [field]: value
        }
      }));
    } else if (name.startsWith('recruiterContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        recruiterContact: {
          ...prev.recruiterContact,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleDepartmentChange = (dept) => {
    setFormData(prev => ({
      ...prev,
      eligibility: {
        ...prev.eligibility,
        allowedDepartments: prev.eligibility.allowedDepartments.includes(dept)
          ? prev.eligibility.allowedDepartments.filter(d => d !== dept)
          : [...prev.eligibility.allowedDepartments, dept]
      }
    }));
  };

  const handleBatchChange = (batch) => {
    setFormData(prev => ({
      ...prev,
      eligibility: {
        ...prev.eligibility,
        allowedBatches: prev.eligibility.allowedBatches.includes(batch)
          ? prev.eligibility.allowedBatches.filter(b => b !== batch)
          : [...prev.eligibility.allowedBatches, batch]
      }
    }));
  };

  const addLocation = () => {
    if (locationInput.trim() && !formData.locations.includes(locationInput.trim())) {
      setFormData(prev => ({
        ...prev,
        locations: [...prev.locations, locationInput.trim()]
      }));
      setLocationInput('');
    }
  };

  const removeLocation = (index) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index)
    }));
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading job drive details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Edit Job Drive
                </h1>
                <p className="text-gray-600">Update job drive information</p>
              </div>
              <button
                onClick={() => navigate(getReturnPath())}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Company Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Company Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company Website</label>
                  <input
                    type="url"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Company Description</label>
                <textarea
                  name="companyDescription"
                  value={formData.companyDescription}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Recruiter Contact */}
              <div className="mt-4">
                <h3 className="text-md font-medium mb-3">Recruiter Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      name="recruiterContact.name"
                      value={formData.recruiterContact.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      name="recruiterContact.email"
                      value={formData.recruiterContact.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      name="recruiterContact.phone"
                      value={formData.recruiterContact.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Job Role Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Job Role Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Job Role *</label>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Job Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="full-time">Full Time</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Job Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Requirements</label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Skills (comma-separated)</label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="React, Node.js, Python, etc."
                />
              </div>
            </div>

            {/* Package Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Package Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">CTC (LPA) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    name="ctc"
                    value={formData.ctc}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              {/* CTC Breakdown */}
              <div className="mt-4">
                <h3 className="text-md font-medium mb-3">CTC Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Base Salary</label>
                    <input
                      type="number"
                      step="0.1"
                      name="ctcBreakdown.baseSalary"
                      value={formData.ctcBreakdown.baseSalary}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Variable Pay</label>
                    <input
                      type="number"
                      step="0.1"
                      name="ctcBreakdown.variablePay"
                      value={formData.ctcBreakdown.variablePay}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Joining Bonus</label>
                    <input
                      type="number"
                      step="0.1"
                      name="ctcBreakdown.joiningBonus"
                      value={formData.ctcBreakdown.joiningBonus}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Other Benefits</label>
                    <input
                      type="text"
                      name="ctcBreakdown.otherBenefits"
                      value={formData.ctcBreakdown.otherBenefits}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bond Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Bond/Service Agreement</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Bond Details</label>
                <textarea
                  name="bond"
                  value={formData.bond}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe any service agreement or bond requirements"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bond Amount</label>
                  <input
                    type="number"
                    name="bondDetails.amount"
                    value={formData.bondDetails.amount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bond Duration</label>
                  <input
                    type="text"
                    name="bondDetails.duration"
                    value={formData.bondDetails.duration}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 2 years"
                  />
                </div>
              </div>
            </div>

            {/* Job Locations */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Job Locations</h2>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter job location"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                />
                <button
                  type="button"
                  onClick={addLocation}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.locations.map((location, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                  >
                    {location}
                    <button
                      type="button"
                      onClick={() => removeLocation(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Drive Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Drive Schedule</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Drive Mode</label>
                  <select
                    name="driveMode"
                    value={formData.driveMode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="on-campus">On Campus</option>
                    <option value="remote">Remote</option>
                    <option value="pooled-campus">Pooled Campus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Venue</label>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Drive Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Drive Time</label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Application Deadline *</label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Selection Process */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Selection Process</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Selection Rounds (comma-separated)</label>
                  <input
                    type="text"
                    name="rounds"
                    value={formData.rounds}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Online Test, Technical Interview, HR Interview"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Test Details</label>
                  <textarea
                    name="testDetails"
                    value={formData.testDetails}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Details about online tests, coding rounds, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Interview Process</label>
                  <textarea
                    name="interviewProcess"
                    value={formData.interviewProcess}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Details about interview rounds and process"
                  />
                </div>
              </div>
            </div>

            {/* Eligibility Criteria */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Eligibility Criteria</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Minimum CGPA *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    name="eligibility.minCGPA"
                    value={formData.eligibility.minCGPA}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Maximum Backlogs</label>
                  <input
                    type="number"
                    min="0"
                    name="eligibility.maxBacklogs"
                    value={formData.eligibility.maxBacklogs}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={formData.eligibility.noCurrentBacklogs}
                  />
                </div>
              </div>

              {/* No Current Backlogs Checkbox */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="eligibility.noCurrentBacklogs"
                    checked={formData.eligibility.noCurrentBacklogs}
                    onChange={(e) => {
                      handleChange(e);
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          eligibility: {
                            ...prev.eligibility,
                            maxBacklogs: '0'
                          }
                        }));
                      }
                    }}
                    className="mr-3"
                  />
                  <span className="text-sm font-medium">No current backlogs required</span>
                </label>
              </div>

              {/* History of Arrears Checkbox */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="eligibility.historyOfArrears"
                    checked={formData.eligibility.historyOfArrears}
                    onChange={handleChange}
                    className="mr-3"
                  />
                  <span className="text-sm font-medium">Allow students with history of arrears</span>
                </label>
              </div>

              {/* Department Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-3">Allowed Departments *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {departments.map((dept) => (
                    <label key={dept} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.eligibility.allowedDepartments.includes(dept)}
                        onChange={() => handleDepartmentChange(dept)}
                        className="mr-3"
                      />
                      <span className="text-sm">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Batch Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-3">Allowed Batches *</label>
                <div className="flex flex-wrap gap-4">
                  {batches.map((batch) => (
                    <label key={batch} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.eligibility.allowedBatches.includes(batch)}
                        onChange={() => handleBatchChange(batch)}
                        className="mr-2"
                      />
                      <span className="text-sm">{batch}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Special Conditions */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Special Conditions</h2>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isDreamJob"
                    checked={formData.isDreamJob}
                    onChange={handleChange}
                    className="mr-3"
                  />
                  <span className="text-sm font-medium">Mark as Dream Job</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="unplacedOnly"
                    checked={formData.unplacedOnly}
                    onChange={handleChange}
                    className="mr-3"
                  />
                  <span className="text-sm font-medium">Only for unplaced students</span>
                </label>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(getReturnPath())}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Job Drive"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditJobDrive;








