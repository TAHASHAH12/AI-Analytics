const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { Keyword, Client } = require('../models');
const csvProcessor = require('../services/csvProcessor');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/');
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `keywords-${uniqueSuffix}.csv`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// POST /api/upload/csv - Upload CSV file with keywords
router.post('/csv', upload.single('csvFile'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    const { clientName = 'Stake' } = req.body;

    // Find or create client
    const [client] = await Client.findOrCreate({
      where: { name: clientName },
      defaults: {
        name: clientName,
        industry: 'Gambling & Cryptocurrency',
        active: true
      }
    });

    // Process CSV file
    const result = await csvProcessor.processCSVFile(filePath);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Error processing CSV file',
        details: result.errors
      });
    }

    const { data: results, errors } = result;
    const duplicates = [];
    const savedKeywords = [];

    // Process results and save to database
    for (const item of results) {
      try {
        // Check for existing keyword
        const existingKeyword = await Keyword.findOne({
          where: {
            keyword: item.keyword.toLowerCase(),
            client_id: client.id
          }
        });

        if (existingKeyword) {
          duplicates.push(`Row ${item.rowNumber}: Already exists - "${item.keyword}"`);
          continue;
        }

        const newKeyword = await Keyword.create({
          keyword: item.keyword,
          category: item.category,
          client_id: client.id
        });

        savedKeywords.push(newKeyword);
      } catch (error) {
        errors.push(`Row ${item.rowNumber}: Database error - ${error.message}`);
      }
    }

    // Clean up uploaded file
    csvProcessor.cleanupFile(filePath);

    res.json({
      message: 'CSV file processed successfully',
      summary: {
        totalRowsProcessed: result.totalRows,
        successfullyAdded: savedKeywords.length,
        duplicatesFound: duplicates.length,
        errorsEncountered: errors.length,
        clientName: client.name
      },
      keywords: savedKeywords.slice(0, 50),
      duplicates: duplicates.slice(0, 20),
      errors: errors.slice(0, 20),
      hasMoreKeywords: savedKeywords.length > 50,
      hasMoreDuplicates: duplicates.length > 20,
      hasMoreErrors: errors.length > 20,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    if (filePath) {
      csvProcessor.cleanupFile(filePath);
    }

    res.status(500).json({
      error: 'Error processing CSV upload',
      details: error.message
    });
  }
});

// POST /api/upload/validate-csv - Validate CSV format without saving
router.post('/validate-csv', upload.single('csvFile'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    
    const validation = await csvProcessor.validateCSVStructure(filePath);
    csvProcessor.cleanupFile(filePath);
    
    res.json(validation);
  } catch (error) {
    if (filePath) {
      csvProcessor.cleanupFile(filePath);
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
