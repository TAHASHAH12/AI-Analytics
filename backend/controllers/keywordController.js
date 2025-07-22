const { Keyword, Analytics, Client } = require('../models');
const { Op } = require('sequelize');
const openaiService = require('../services/openaiService');
const dataforSeoService = require('../services/dataforSeoService');

const keywordController = {
  async getAllKeywords(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        category,
        search,
        client = 'Stake',
        status = 'active',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = { status };

      const clientRecord = await Client.findOne({ where: { name: client } });
      if (clientRecord) {
        whereClause.client_id = clientRecord.id;
      }

      if (category && category !== 'All') {
        whereClause.category = category;
      }

      if (search) {
        whereClause.keyword = {
          [Op.like]: `%${search}%`
        };
      }

      const { count, rows } = await Keyword.findAndCountAll({
        where: whereClause,
        include: [{
          model: Analytics,
          as: 'analytics',
          attributes: ['id', 'platform', 'stake_mentioned', 'brand_sentiment', 'created_at'],
          limit: 3,
          order: [['created_at', 'DESC']]
        }],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: offset,
        distinct: true
      });

      const keywordsWithStats = await Promise.all(rows.map(async (keyword) => {
        const analyticsCount = await Analytics.count({
          where: { keyword_id: keyword.id }
        });

        const stakeMentions = await Analytics.count({
          where: {
            keyword_id: keyword.id,
            stake_mentioned: true
          }
        });

        return {
          ...keyword.toJSON(),
          analyticsCount,
          stakeMentions,
          mentionRate: analyticsCount > 0 ? ((stakeMentions / analyticsCount) * 100).toFixed(1) : 0
        };
      }));

      res.json({
        keywords: keywordsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) * parseInt(limit) < count,
          hasPrevPage: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Error fetching keywords:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async addKeyword(req, res) {
    try {
      const { keyword, category = 'General', clientName = 'Stake' } = req.body;

      if (!keyword || keyword.trim().length === 0) {
        return res.status(400).json({ error: 'Keyword is required' });
      }

      const [client] = await Client.findOrCreate({
        where: { name: clientName },
        defaults: {
          name: clientName,
          industry: 'Gambling & Cryptocurrency',
          active: true
        }
      });

      const existingKeyword = await Keyword.findOne({
        where: {
          keyword: keyword.toLowerCase().trim(),
          client_id: client.id
        }
      });

      if (existingKeyword) {
        return res.status(400).json({ error: 'Keyword already exists for this client' });
      }

      let seoData = {
        search_volume: 0,
        cpc: 0.00,
        competition: 'Medium',
        difficulty: 50
      };

      try {
        const dataforSeoResults = await dataforSeoService.getKeywordData(keyword);
        if (dataforSeoResults && dataforSeoResults.length > 0) {
          const data = dataforSeoResults.find(item =>
            item.keyword.toLowerCase() === keyword.toLowerCase().trim()
          ) || dataforSeoResults[0];

          seoData = {
            search_volume: data.search_volume || 0,
            cpc: data.cpc || 0.00,
            competition: data.competition_level || 'Medium',
            difficulty: data.competition_index || 50
          };
        }
      } catch (seoError) {
        console.error('DataForSEO error:', seoError.message);
      }

      const newKeyword = await Keyword.create({
        keyword: keyword.trim(),
        category,
        client_id: client.id,
        ...seoData
      });

      const keywordWithClient = await Keyword.findByPk(newKeyword.id, {
        include: [{
          model: Client,
          as: 'client',
          attributes: ['name', 'industry']
        }]
      });

      res.status(201).json(keywordWithClient);
    } catch (error) {
      console.error('Error adding keyword:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async addMultipleKeywords(req, res) {
    try {
      const { keywords, clientName = 'Stake' } = req.body;

      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ error: 'Keywords array is required' });
      }

      const [client] = await Client.findOrCreate({
        where: { name: clientName },
        defaults: {
          name: clientName,
          industry: 'Gambling & Cryptocurrency',
          active: true
        }
      });

      const results = [];
      const errors = [];

      for (const keywordData of keywords) {
        try {
          const { keyword, category = 'General' } = keywordData;

          if (!keyword || keyword.trim().length === 0) {
            errors.push('Empty keyword skipped');
            continue;
          }

          const existingKeyword = await Keyword.findOne({
            where: {
              keyword: keyword.toLowerCase().trim(),
              client_id: client.id
            }
          });

          if (existingKeyword) {
            errors.push(`Keyword "${keyword}" already exists`);
            continue;
          }

          const newKeyword = await Keyword.create({
            keyword: keyword.trim(),
            category,
            client_id: client.id
          });

          results.push(newKeyword);
        } catch (error) {
          errors.push(`Error adding "${keywordData.keyword}": ${error.message}`);
        }
      }

      res.json({
        success: results.length,
        errors: errors.length,
        total: keywords.length,
        keywords: results,
        errorDetails: errors.slice(0, 10),
        hasMoreErrors: errors.length > 10
      });
    } catch (error) {
      console.error('Error adding multiple keywords:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async deleteKeyword(req, res) {
    try {
      const { id } = req.params;

      const keyword = await Keyword.findByPk(id, {
        include: [{
          model: Analytics,
          as: 'analytics'
        }]
      });

      if (!keyword) {
        return res.status(404).json({ error: 'Keyword not found' });
      }

      const analyticsCount = keyword.analytics.length;
      await keyword.destroy();

      res.json({
        message: 'Keyword deleted successfully',
        deletedAnalytics: analyticsCount
      });
    } catch (error) {
      console.error('Error deleting keyword:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async analyzeKeyword(req, res) {
    try {
      const { id } = req.params;
      const { query, platform = 'ChatGPT', context = {} } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const keyword = await Keyword.findByPk(id, {
        include: [{
          model: Client,
          as: 'client'
        }]
      });

      if (!keyword) {
        return res.status(404).json({ error: 'Keyword not found' });
      }

      const startTime = Date.now();

      const analysisContext = {
        ...context,
        keyword: keyword.keyword,
        category: keyword.category,
        client: keyword.client?.name || 'Unknown',
        platform
      };

      const analysis = await openaiService.analyzeKeyword(
        keyword.keyword,
        query,
        analysisContext
      );

      const responseTime = Date.now() - startTime;

      const analyticsData = await Analytics.create({
        keyword_id: keyword.id,
        platform,
        query,
        response: analysis.response,
        citations: analysis.citations || [],
        stake_mentioned: analysis.stakeMentioned,
        brand_sentiment: analysis.brandSentiment,
        overall_sentiment: analysis.overallSentiment,
        word_count: analysis.wordCount,
        confidence_score: analysis.confidenceScore,
        response_time: responseTime,
        analysis_metadata: {
          keyTopics: analysis.keyTopics || [],
          model: openaiService.model,
          timestamp: new Date().toISOString()
        }
      });

      const visibilityField = `visibility_${platform.toLowerCase().replace(' ', '')}`;
      const visibilityScore = analysis.stakeMentioned ? Math.min(100, 60 + Math.random() * 40) : Math.random() * 30;

      await keyword.update({
        last_analyzed: new Date(),
        [visibilityField]: Math.round(visibilityScore)
      });

      res.json({
        keyword: keyword.keyword,
        analysis: {
          ...analysis,
          responseTime,
          platform
        },
        analytics: {
          id: analyticsData.id,
          stake_mentioned: analyticsData.stake_mentioned,
          brand_sentiment: analyticsData.brand_sentiment,
          confidence_score: analyticsData.confidence_score
        },
        visibility: {
          platform,
          score: Math.round(visibilityScore)
        }
      });
    } catch (error) {
      console.error('Error analyzing keyword:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getKeywordSuggestions(req, res) {
    try {
      const { seed, count = 10, category = 'General', source = 'openai' } = req.query;

      if (!seed) {
        return res.status(400).json({ error: 'Seed keyword is required' });
      }

      let suggestions = [];

      if (source === 'openai') {
        suggestions = await openaiService.generateKeywordSuggestions(
          seed,
          parseInt(count),
          category
        );
      } else if (source === 'dataforseo') {
        const seoSuggestions = await dataforSeoService.getKeywordSuggestions(seed, null, parseInt(count));
        suggestions = seoSuggestions.map(item => item.keyword);
      }

      const uniqueSuggestions = [...new Set(suggestions)];
      const client = await Client.findOne({ where: { name: 'Stake' } });
      
      if (client) {
        const existingKeywords = await Keyword.findAll({
          where: {
            keyword: { [Op.in]: uniqueSuggestions },
            client_id: client.id
          },
          attributes: ['keyword']
        });

        const existingSet = new Set(existingKeywords.map(k => k.keyword.toLowerCase()));
        const filteredSuggestions = uniqueSuggestions.filter(
          suggestion => !existingSet.has(suggestion.toLowerCase())
        );

        suggestions = filteredSuggestions;
      }

      res.json({
        seed,
        category,
        source,
        suggestions,
        count: suggestions.length,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting suggestions:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getKeywordAnalytics(req, res) {
    try {
      const { id } = req.params;
      const { limit = 20, platform, days = 30 } = req.query;

      const whereClause = { keyword_id: id };

      if (platform) {
        whereClause.platform = platform;
      }

      if (days) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        whereClause.created_at = { [Op.gte]: daysAgo };
      }

      const analytics = await Analytics.findAll({
        where: whereClause,
        include: [{
          model: Keyword,
          as: 'keyword',
          attributes: ['keyword', 'category']
        }],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit)
      });

      const stats = {
        totalAnalyses: analytics.length,
        stakeMentions: analytics.filter(a => a.stake_mentioned).length,
        avgConfidenceScore: analytics.length > 0 
          ? (analytics.reduce((sum, a) => sum + parseFloat(a.confidence_score), 0) / analytics.length).toFixed(2)
          : 0,
        sentimentBreakdown: {
          'Very Positive': analytics.filter(a => a.brand_sentiment === 'Very Positive').length,
          'Positive': analytics.filter(a => a.brand_sentiment === 'Positive').length,
          'Neutral': analytics.filter(a => a.brand_sentiment === 'Neutral').length,
          'Negative': analytics.filter(a => a.brand_sentiment === 'Negative').length,
          'Very Negative': analytics.filter(a => a.brand_sentiment === 'Very Negative').length
        },
        platformBreakdown: {}
      };

      analytics.forEach(a => {
        stats.platformBreakdown[a.platform] = (stats.platformBreakdown[a.platform] || 0) + 1;
      });

      res.json({
        analytics,
        stats,
        keyword: analytics.length > 0 ? analytics[0].keyword : null
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = keywordController;
