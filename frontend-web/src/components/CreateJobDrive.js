import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const CreateJobDrive = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    role: '',
    type: 'full-time',
    location: '',
    date: '',
    ctc: '',
    description: '',
    skills: '',
    eligibility: {
      cgpa: '',
      maxBacklogs: 0,
      batches: '',
      departments: ''
    },
    bond: '',
    rounds: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        ctc: Number(formData.ctc),
        skills: formData.skills.split(',').map(s => s.trim()),
        eligibility: {
          ...formData.eligibility,
          cgpa: Number(formData.eligibility.cgpa),
          batches: formData.eligibility.batches.split(',').map(s => s.trim()),
          departments: formData.eligibility.departments.split(',').map(s => s.trim())
        },
        rounds: formData.rounds.split(',').map(s => s.trim())
      };

      await axios.post('http://localhost:5000/api/job-drives', payload);
      toast.success('Job drive created successfully!');
      navigate('/job-drives');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create job drive');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create Job Drive</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Company Name</label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Role</label>
          <input
            type="text"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="full-time">Full Time</option>
            <option value="internship">Internship</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">CTC (LPA)</label>
          <input
            type="number"
            name="ctc"
            value={formData.ctc}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Min CGPA</label>
          <input
            type="number"
            step="0.1"
            name="eligibility.cgpa"
            value={formData.eligibility.cgpa}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Max Backlogs</label>
          <input
            type="number"
            name="eligibility.maxBacklogs"
            value={formData.eligibility.maxBacklogs}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Skills (comma separated)</label>
          <input
            type="text"
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="React, Node.js, MongoDB"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Departments (comma separated)</label>
          <input
            type="text"
            name="eligibility.departments"
            value={formData.eligibility.departments}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="CSE, IT, ECE"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Eligible Batches (comma separated)</label>
          <input
            type="text"
            name="eligibility.batches"
            value={formData.eligibility.batches}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="2024, 2025, 2026 (leave empty for all batches)"
          />
        </div>

        <div className="md:col-span-2 flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/job-drives')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create Job Drive
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJobDrive;


