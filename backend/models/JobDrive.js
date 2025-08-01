const mongoose = require('mongoose');

const jobDriveSchema = new mongoose.Schema({
  // Basic Company Details
  companyName: { type: String, required: true },
  recruiterContact: {
    name: String,
    email: String,
    phone: String
  },
  driveMode: { 
    type: String, 
    enum: ['on-campus', 'remote', 'pooled-campus'], 
    default: 'on-campus' 
  },
  locations: [{ type: String }], // Array of locations
  
  // Job Role Details
  role: { type: String, required: true },
  type: { type: String, default: 'full-time' }, // Add default
  jobType: { type: String, default: 'full-time' }, // Add default
  description: { type: String, required: true }, // Rich text JD
  requirements: { type: String, default: '' }, // Add default for requirements
  skills: [{ type: String }], // Skill tags/keywords
  
  // Package Details
  ctc: { type: Number },
  ctcBreakdown: {
    baseSalary: Number,
    variablePay: Number,
    joiningBonus: Number,
    otherBenefits: String
  },
  
  // Location
  location: { type: String, default: '' }, // Add default
  
  // Bond/Service Agreement
  bond: String,
  bondDetails: {
    amount: Number,
    duration: String // e.g., "2 years"
  },
  
  // Enhanced Eligibility Criteria
  eligibility: {
    minCGPA: { type: Number, default: 0 },
    maxBacklogs: { type: Number, default: 0 },
    allowedDepartments: [{ type: String }],
    allowedBatches: [{ type: String }]
  },
  
  // Special Conditions
  isDreamJob: { type: Boolean, default: false }, // Auto-calculated if CTC >= 2x median
  unplacedOnly: { type: Boolean, default: false },
  
  // Drive Schedule
  date: { type: Date, required: true },
  time: { type: String },
  deadline: { type: Date },
  venue: String,
  
  // Test/Interview Details
  rounds: [String],
  selectionRounds: [{
    name: String,
    details: String,
    date: Date,
    time: String,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    selectedStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  testDetails: { type: String },
  interviewProcess: { type: String },
  
  // System fields
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applications: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appliedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['applied', 'shortlisted', 'rejected', 'selected'], default: 'applied' }
  }],
  placedStudents: [{
    name: { type: String, required: true },
    rollNumber: { type: String, required: true },
    department: String,
    email: { type: String, required: true },
    mobileNumber: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Auto-calculate dream job status
jobDriveSchema.pre('save', function(next) {
  // Assuming median CTC is 6 LPA (adjust as needed)
  const medianCTC = 6;
  this.isDreamJob = this.ctc >= (2 * medianCTC);
  next();
});

module.exports = mongoose.model('JobDrive', jobDriveSchema);









