const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PlacementAnalytics = require('../models/PlacementAnalytics');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/placement-data/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const batch = req.body.batch || 'unknown';
    const ext = path.extname(file.originalname);
    cb(null, `${batch}-${Date.now()}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /csv|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only CSV and PDF files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Helper function to parse CSV
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const lines = data.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      const results = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        if (obj[headers[0]]) {
          results.push(obj);
        }
      }
      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to generate statistics
const generateStatistics = (data) => {
  if (!data || data.length === 0) {
    return {
      totalStudents: 0,
      placedStudents: 0,
      placementRate: 0,
      averagePackage: 0,
      highestPackage: 0,
      totalCompanies: 0
    };
  }

  const totalStudents = data.length;
  const placedStudents = data.filter(student => 
    student.status === 'Placed' || student.company || student.Company
  ).length;
  
  const placementRate = totalStudents > 0 ? 
    Math.round((placedStudents / totalStudents) * 100) : 0;

  const packages = data
    .filter(student => student.package || student.Package)
    .map(student => {
      const pkg = (student.package || student.Package || '').toString().toLowerCase();
      let amount = 0;
      
      if (pkg.includes('lpa')) {
        amount = parseFloat(pkg.replace(/[^0-9.]/g, ''));
      } else {
        const num = parseFloat(pkg.replace(/[^0-9.]/g, ''));
        amount = num > 1000 ? num / 100000 : num;
      }
      
      return isNaN(amount) ? 0 : amount;
    })
    .filter(amount => amount > 0);

  const averagePackage = packages.length > 0 ? 
    Math.round((packages.reduce((sum, pkg) => sum + pkg, 0) / packages.length) * 100) / 100 : 0;
  
  const highestPackage = packages.length > 0 ? Math.max(...packages) : 0;

  const companies = new Set(
    data
      .filter(student => student.company || student.Company)
      .map(student => (student.company || student.Company || '').trim())
      .filter(company => company)
  );

  return {
    totalStudents,
    placedStudents,
    placementRate,
    averagePackage,
    highestPackage,
    totalCompanies: companies.size
  };
};

// Get all batches
router.get('/batches', auth, async (req, res) => {
  try {
    console.log('Fetching batches...');
    const analytics = await PlacementAnalytics.find({}, 'batch').distinct('batch');
    console.log('Found batches:', analytics);
    res.json({ batches: analytics || [] });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ message: 'Error fetching batches', error: error.message });
  }
});

// Add new batch
router.post('/batches', auth, async (req, res) => {
  try {
    console.log('Adding new batch:', req.body);
    const { batchName } = req.body;
    
    if (!batchName) {
      return res.status(400).json({ message: 'Batch name is required' });
    }

    const existingBatch = await PlacementAnalytics.findOne({ batch: batchName });
    if (existingBatch) {
      return res.status(400).json({ message: 'Batch already exists' });
    }

    const analytics = new PlacementAnalytics({
      batch: batchName,
      uploadedBy: req.user.id,
      data: [],
      statistics: {
        totalStudents: 0,
        placedStudents: 0,
        placementRate: 0,
        averagePackage: 0,
        highestPackage: 0,
        totalCompanies: 0
      }
    });

    await analytics.save();
    console.log('Batch added successfully:', batchName);
    res.json({ message: 'Batch added successfully' });
  } catch (error) {
    console.error('Error adding batch:', error);
    res.status(500).json({ message: 'Error adding batch', error: error.message });
  }
});

// Upload and process placement data
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { batch } = req.body;
    
    if (!batch) {
      return res.status(400).json({ message: 'Batch is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    let placementData = [];
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    if (fileExt === '.csv') {
      placementData = await parseCSV(filePath);
    } else if (fileExt === '.pdf') {
      placementData = [];
    }

    const statistics = generateStatistics(placementData);

    let analytics = await PlacementAnalytics.findOne({ batch });
    if (analytics) {
      analytics.data = placementData;
      analytics.statistics = statistics;
      analytics.uploadedAt = new Date();
      analytics.fileName = req.file.originalname;
      analytics.filePath = filePath;
    } else {
      analytics = new PlacementAnalytics({
        batch,
        uploadedBy: req.user.id,
        data: placementData,
        statistics,
        fileName: req.file.originalname,
        filePath
      });
    }

    await analytics.save();
    res.json({ message: 'File uploaded and analytics generated successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

// Get analytics for a batch
router.get('/:batch', auth, async (req, res) => {
  try {
    const { batch } = req.params;
    const analytics = await PlacementAnalytics.findOne({ batch });
    
    if (!analytics) {
      return res.status(404).json({ message: 'No analytics found for this batch' });
    }

    res.json({ analytics: analytics.statistics || {} });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

// Delete analytics for a batch
router.delete('/:batch', auth, async (req, res) => {
  try {
    const { batch } = req.params;
    const analytics = await PlacementAnalytics.findOne({ batch });
    
    if (!analytics) {
      return res.status(404).json({ message: 'Analytics not found' });
    }

    if (analytics.filePath && fs.existsSync(analytics.filePath)) {
      fs.unlinkSync(analytics.filePath);
    }

    await PlacementAnalytics.deleteOne({ batch });
    res.json({ message: 'Analytics deleted successfully' });
  } catch (error) {
    console.error('Error deleting analytics:', error);
    res.status(500).json({ message: 'Error deleting analytics', error: error.message });
  }
});

module.exports = router;


