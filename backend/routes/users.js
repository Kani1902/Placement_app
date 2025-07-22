const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// Upload CGPA CSV
router.post('/upload-cgpa', auth, upload.single('csvFile'), async (req, res) => {
  try {
    console.log('=== UPLOAD CGPA ROUTE HIT ===');
    console.log('User:', req.user.email, 'Role:', req.user.role);
    console.log('File received:', req.file ? 'Yes' : 'No');
    
    // Allow moorthy@gmail.com regardless of role, or specific roles
    const isAuthorized = req.user.email === 'moorthy@gmail.com' || 
                        req.user.role === 'po' || 
                        req.user.role === 'placementofficer' || 
                        req.user.role === 'staff';
    
    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Access denied - Only placement officers can upload CGPA data',
        userRole: req.user.role,
        userEmail: req.user.email
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File path:', req.file.path);
    console.log('File size:', req.file.size);

    const results = [];
    let updatedCount = 0;
    let errorCount = 0;

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        console.log('CSV Row:', data);
        results.push(data);
      })
      .on('end', async () => {
        try {
          console.log('CSV parsing complete. Total rows:', results.length);
          
          if (results.length === 0) {
            console.log('No data found in CSV');
            fs.unlinkSync(req.file.path);
            return res.json({
              message: 'No data found in CSV file',
              updatedCount: 0,
              errorCount: 0,
              totalRows: 0
            });
          }

          // Show first row to understand structure
          console.log('First row structure:', results[0]);
          console.log('Available columns:', Object.keys(results[0]));
          
          for (const row of results) {
            console.log('--- Processing row ---');
            console.log('Raw row:', row);
            
            // Try all possible column name variations, including ones with newlines
            const rollNo = row.rollNo || row['ROLL NO'] || row.rollNumber || 
                          row['Roll Number'] || row['roll_no'] || row['ROLL_NO'] ||
                          row.RollNo || row.RollNumber;
            
            const cgpa = row.cgpa || row.CGPA || row['CGPA'] || row.gpa || row.GPA ||
                        row['\nCGPA'] || row['\rCGPA'] || row[' CGPA'];
            
            console.log('Extracted values:');
            console.log('  rollNo:', `"${rollNo}"`);
            console.log('  cgpa:', `"${cgpa}"`);
            
            if (!rollNo || !cgpa) {
              console.log('❌ Missing data - skipping row');
              errorCount++;
              continue;
            }

            const cleanRollNo = rollNo.toString().trim();
            console.log('Searching for student with rollNo:', `"${cleanRollNo}"`);

            // Try to find student with detailed logging
            const student = await User.findOne({
              $or: [
                { 'profile.rollNumber': cleanRollNo },
                { 'profile.registerNo': cleanRollNo }
              ],
              role: 'student'
            });

            if (student) {
              console.log('✅ Student found:', student.profile.name);
              console.log('  Current CGPA:', student.profile.cgpa);
              console.log('  New CGPA:', parseFloat(cgpa));
              
              // Update the student
              student.profile.cgpa = parseFloat(cgpa);
              await student.save();
              updatedCount++;
            } else {
              console.log('❌ No student found for rollNo:', `"${cleanRollNo}"`);
              errorCount++;
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: 'CSV processed successfully',
            updatedCount,
            errorCount,
            totalRows: results.length
          });

        } catch (error) {
          console.error('Error processing CSV:', error);
          fs.unlinkSync(req.file.path);
          res.status(500).json({ message: 'Error processing CSV file' });
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error reading CSV file' });
      });

  } catch (error) {
    console.error('Upload error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Temporary route to check students (remove after debugging)
router.get('/debug-students', auth, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }, {
      'profile.name': 1,
      'profile.rollNumber': 1,
      'profile.registerNo': 1,
      email: 1
    });
    
    console.log('Students in database:', students);
    res.json({ students });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug route to check CSV format
router.post('/debug-csv', auth, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const results = [];
    
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        fs.unlinkSync(req.file.path); // Clean up
        
        res.json({
          message: 'CSV parsed successfully',
          totalRows: results.length,
          headers: Object.keys(results[0] || {}),
          sampleRows: results.slice(0, 5),
          allData: results
        });
      })
      .on('error', (error) => {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error reading CSV', error: error.message });
      });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug route to check specific student CGPA
router.get('/debug-student/:rollNumber', auth, async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const student = await User.findOne({
      $or: [
        { 'profile.rollNumber': rollNumber },
        { 'profile.registerNo': rollNumber }
      ],
      role: 'student'
    });
    
    if (student) {
      res.json({
        found: true,
        student: {
          name: student.profile.name,
          rollNumber: student.profile.rollNumber,
          cgpa: student.profile.cgpa,
          email: student.email
        }
      });
    } else {
      res.json({ found: false, rollNumber });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug route to check user data
router.get('/debug-user-data', auth, async (req, res) => {
  try {
    const users = await User.find({}, {
      email: 1,
      role: 1,
      'profile.name': 1,
      'profile.rollNumber': 1
    });
    
    console.log('All users in database:', users);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fix user profile route
router.post('/fix-user-profile', auth, async (req, res) => {
  try {
    if (req.user.email !== 'moorthy@gmail.com') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id);
    user.profile.name = 'Moorthy';
    user.role = 'po';
    await user.save();

    res.json({ 
      message: 'Profile fixed',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

























