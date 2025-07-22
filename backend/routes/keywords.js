const express = require('express');
const router = express.Router();
const keywordController = require('../controllers/keywordController');

// GET /api/keywords - Get all keywords with pagination and filters
router.get('/', keywordController.getAllKeywords);

// POST /api/keywords - Add single keyword
router.post('/', keywordController.addKeyword);

// POST /api/keywords/bulk - Add multiple keywords
router.post('/bulk', keywordController.addMultipleKeywords);

// DELETE /api/keywords/:id - Delete keyword
router.delete('/:id', keywordController.deleteKeyword);

// POST /api/keywords/:id/analyze - Analyze single keyword
router.post('/:id/analyze', keywordController.analyzeKeyword);

// GET /api/keywords/:id/analytics - Get keyword analytics history
router.get('/:id/analytics', keywordController.getKeywordAnalytics);

// GET /api/keywords/suggestions - Get keyword suggestions
router.get('/suggestions', keywordController.getKeywordSuggestions);

module.exports = router;
