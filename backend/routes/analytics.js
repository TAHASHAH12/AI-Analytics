const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics/overview - Get dashboard overview
router.get('/overview', analyticsController.getOverview);

// GET /api/analytics/visibility-trends - Get visibility trends
router.get('/visibility-trends', analyticsController.getVisibilityTrends);

// GET /api/analytics/citations - Get citation analysis
router.get('/citations', analyticsController.getCitationAnalysis);

module.exports = router;
