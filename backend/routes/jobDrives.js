const express = require('express');
const JobDrive = require('../models/JobDrive');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Authorization middleware for PO
const authorizePO = (req, res, next) => {
  if (req.user.role !== 'po' && req.user.role !== 'placementofficer') {
    return res.status(403).json({ message: 'Access denied - Only Placement Officers can perform this action' });
  }
  next();
};

// Create new job drive - Only for authorized PO
router.post('/', auth, authorizePO, async (req, res) => {
  try {
    const jobDriveData = {
      companyName: req.body.companyName,
      role: req.body.role,
      type: req.body.type,
      ctc: req.body.ctc,
      location: req.body.location,
      date: req.body.date,
      description: req.body.description,
      requirements: req.body.requirements,
      skills: req.body.skills || [],
      bond: req.body.bond || '',
      rounds: req.body.rounds || [],
      isActive: req.body.isActive !== false,
      createdBy: req.user.id,
      eligibility: {
        minCGPA: req.body.eligibility?.cgpa || req.body.eligibility?.minCGPA || 0,
        maxBacklogs: parseInt(req.body.eligibility?.maxBacklogs) || 0,
        allowedDepartments: req.body.eligibility?.departments || req.body.eligibility?.allowedDepartments || [],
        allowedBatches: req.body.eligibility?.batches || req.body.eligibility?.allowedBatches || []
      }
    };

    const jobDrive = new JobDrive(jobDriveData);
    await jobDrive.save();

    res.status(201).json({
      message: 'Job drive created successfully',
      jobDrive
    });
  } catch (error) {
    console.error('Create job drive error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

