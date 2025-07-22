const mongoose = require('mongoose');

const jobDriveSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['full-time', 'internship'],
    required: true
  },
  ctc: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  deadline: {
    type: Date,
    default: function() {
      return new Date(this.date.getTime() - 24 * 60 * 60 * 1000);
    }
  },
  description: String,
  requirements: String,
  skills: [String],
  bond: String,
  rounds: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eligibility: {
    minCGPA: { type: Number, default: 0 },
    maxBacklogs: { type: Number, default: 0 },
    allowedDepartments: [String],
    allowedBatches: [String]
  },
  applications: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'shortlisted', 'selected', 'rejected'],
      default: 'applied'
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('JobDrive', jobDriveSchema);



