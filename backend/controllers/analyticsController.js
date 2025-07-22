const { Keyword, Analytics, Client } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

const analyticsController = {
  async getOverview(req, res) {
    try {
      const { clientName = 'Stake', days = 30 } = req.query;
      
      const client = await Client.findOne({ where: { name: clientName } });
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));

      const [
        totalKeywords,
        analyzedKeywords,
        recentAnalytics,
        stakeMentions,
        avgVisibilityData
      ] = await Promise.all([
        Keyword.count({ where: { client_id: client.id, status: 'active' } }),
        
        Keyword.count({
          where: { 
            client_id: client.id, 
            last_analyzed: { [Op.gte]: daysAgo }
          }
        }),
        
        Analytics.count({
          include: [{
            model: Keyword,
            as: 'keyword',
            where: { client_id: client.id }
          }],
          where: { created_at: { [Op.gte]: daysAgo } }
        }),
        
        Analytics.count({
          include: [{
            model: Keyword,
            as: 'keyword',
            where: { client_id: client.id }
          }],
          where: { 
            stake_mentioned: true,
            created_at: { [Op.gte]: daysAgo }
          }
        }),

        Keyword.findAll({
          where: { client_id: client.id },
          attributes: [
            [fn('AVG', col('visibility_chatgpt')), 'avg_chatgpt'],
            [fn('AVG', col('visibility_perplexity')), 'avg_perplexity'],
            [fn('AVG', col('visibility_claude')), 'avg_claude'],
            [fn('AVG', col('visibility_gemini')), 'avg_gemini']
          ],
          raw: true
        })
      ]);

      const avgVisibility = avgVisibilityData[0];
      const overallVisibility = [
        parseFloat(avgVisibility.avg_chatgpt) || 0,
        parseFloat(avgVisibility.avg_perplexity) || 0,
        parseFloat(avgVisibility.avg_claude) || 0,
        parseFloat(avgVisibility.avg_gemini) || 0
      ];

      const avgVisibilityScore = overallVisibility.reduce((a, b) => a + b, 0) / 4;

      const sentimentStats = await Analytics.findAll({
        include: [{
          model: Keyword,
          as: 'keyword',
          where: { client_id: client.id }
        }],
        where: { created_at: { [Op.gte]: daysAgo } },
        attributes: [
          'brand_sentiment',
          [fn('COUNT', col('Analytics.id')), 'count']
        ],
        group: ['brand_sentiment'],
        raw: true
      });

      const platformStats = await Analytics.findAll({
        include: [{
          model: Keyword,
          as: 'keyword',
          where: { client_id: client.id }
        }],
        where: { created_at: { [Op.gte]: daysAgo } },
        attributes: [
          'platform',
          [fn('COUNT', col('Analytics.id')), 'total_analyses'],
          [fn('SUM', literal('CASE WHEN stake_mentioned = 1 THEN 1 ELSE 0 END')), 'mentions'],
          [fn('AVG', col('confidence_score')), 'avg_confidence']
        ],
        group: ['platform'],
        raw: true
      });

      const trendingKeywords = await Keyword.findAll({
        where: { client_id: client.id },
        include: [{
          model: Analytics,
          as: 'analytics',
          where: { created_at: { [Op.gte]: daysAgo } },
          required: true
        }],
        attributes: [
          'id', 'keyword', 'category',
          [fn('COUNT', col('analytics.id')), 'analysis_count'],
          [fn('SUM', literal('CASE WHEN analytics.stake_mentioned = 1 THEN 1 ELSE 0 END')), 'mention_count']
        ],
        group: ['Keyword.id'],
        order: [[fn('COUNT', col('analytics.id')), 'DESC']],
        limit: 10,
        subQuery: false
      });

      res.json({
        overview: {
          totalKeywords,
          analyzedKeywords,
          recentAnalytics,
          stakeMentions,
          avgVisibilityScore: Math.round(avgVisibilityScore),
          mentionRate: recentAnalytics > 0 ? ((stakeMentions / recentAnalytics) * 100).toFixed(1) : 0
        },
        visibility: {
          chatgpt: Math.round(parseFloat(avgVisibility.avg_chatgpt) || 0),
          perplexity: Math.round(parseFloat(avgVisibility.avg_perplexity) || 0),
          claude: Math.round(parseFloat(avgVisibility.avg_claude) || 0),
          gemini: Math.round(parseFloat(avgVisibility.avg_gemini) || 0)
        },
        sentiment: sentimentStats.reduce((acc, item) => {
          acc[item.brand_sentiment] = parseInt(item.count);
          return acc;
        }, {}),
        platforms: platformStats.map(item => ({
          platform: item.platform,
          totalAnalyses: parseInt(item.total_analyses),
          mentions: parseInt(item.mentions),
          mentionRate: ((parseInt(item.mentions) / parseInt(item.total_analyses)) * 100).toFixed(1),
          avgConfidence: parseFloat(item.avg_confidence).toFixed(2)
        })),
        trendingKeywords: trendingKeywords.map(keyword => ({
          id: keyword.id,
          keyword: keyword.keyword,
          category: keyword.category,
          analysisCount: parseInt(keyword.dataValues.analysis_count),
          mentionCount: parseInt(keyword.dataValues.mention_count),
          mentionRate: ((parseInt(keyword.dataValues.mention_count) / parseInt(keyword.dataValues.analysis_count)) * 100).toFixed(1)
        })),
        period: {
          days: parseInt(days),
          from: daysAgo.toISOString(),
          to: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting overview:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getVisibilityTrends(req, res) {
    try {
      const { clientName = 'Stake', days = 30, platform } = req.query;
      
      const client = await Client.findOne({ where: { name: clientName } });
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));

      let whereClause = {
        created_at: { [Op.gte]: daysAgo }
      };

      if (platform) {
        whereClause.platform = platform;
      }

      const dailyData = await Analytics.findAll({
        include: [{
          model: Keyword,
          as: 'keyword',
          where: { client_id: client.id },
          attributes: []
        }],
        where: whereClause,
        attributes: [
          [fn('DATE', col('Analytics.created_at')), 'date'],
          'platform',
          [fn('COUNT', col('Analytics.id')), 'total_analyses'],
          [fn('SUM', literal('CASE WHEN stake_mentioned = 1 THEN 1 ELSE 0 END')), 'mentions'],
          [fn('AVG', col('confidence_score')), 'avg_confidence']
        ],
        group: [fn('DATE', col('Analytics.created_at')), 'platform'],
        order: [[fn('DATE', col('Analytics.created_at')), 'ASC']],
        raw: true
      });

      const chartData = {};
      dailyData.forEach(item => {
        const date = item.date;
        if (!chartData[date]) {
          chartData[date] = {
            date,
            totalAnalyses: 0,
            totalMentions: 0,
            platforms: {}
          };
        }

        chartData[date].totalAnalyses += parseInt(item.total_analyses);
        chartData[date].totalMentions += parseInt(item.mentions);
        chartData[date].platforms[item.platform] = {
          analyses: parseInt(item.total_analyses),
          mentions: parseInt(item.mentions),
          mentionRate: ((parseInt(item.mentions) / parseInt(item.total_analyses)) * 100).toFixed(1),
          avgConfidence: parseFloat(item.avg_confidence).toFixed(2)
        };
      });

      const trends = Object.values(chartData).map(day => ({
        ...day,
        mentionRate: day.totalAnalyses > 0 ? ((day.totalMentions / day.totalAnalyses) * 100).toFixed(1) : 0
      }));

      res.json({
        trends,
        summary: {
          totalDays: trends.length,
          avgDailyAnalyses: trends.length > 0 ? Math.round(trends.reduce((sum, day) => sum + day.totalAnalyses, 0) / trends.length) : 0,
          avgMentionRate: trends.length > 0 ? (trends.reduce((sum, day) => sum + parseFloat(day.mentionRate), 0) / trends.length).toFixed(1) : 0,
          platforms: platform ? [platform] : [...new Set(dailyData.map(item => item.platform))]
        }
      });
    } catch (error) {
      console.error('Error getting visibility trends:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getCitationAnalysis(req, res) {
    try {
      const { clientName = 'Stake', days = 30 } = req.query;
      
      const client = await Client.findOne({ where: { name: clientName } });
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));

      const analyticsWithCitations = await Analytics.findAll({
        include: [{
          model: Keyword,
          as: 'keyword',
          where: { client_id: client.id },
          attributes: ['keyword', 'category']
        }],
        where: {
          created_at: { [Op.gte]: daysAgo },
          citations: { [Op.ne]: '[]' }
        },
        attributes: ['id', 'platform', 'citations', 'stake_mentioned', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 100
      });

      const citationStats = {
        totalCitations: 0,
        uniqueDomains: new Set(),
        domainCount: {},
        platformBreakdown: {},
        topDomains: []
      };

      analyticsWithCitations.forEach(analysis => {
        const citations = Array.isArray(analysis.citations) ? analysis.citations : [];
        citationStats.totalCitations += citations.length;

        citations.forEach(citation => {
          if (citation.url) {
            try {
              const domain = new URL(citation.url).hostname.replace('www.', '');
              citationStats.uniqueDomains.add(domain);
              citationStats.domainCount[domain] = (citationStats.domainCount[domain] || 0) + 1;
            } catch (e) {
              // Invalid URL, skip
            }
          }
        });

        if (!citationStats.platformBreakdown[analysis.platform]) {
          citationStats.platformBreakdown[analysis.platform] = {
            totalAnalyses: 0,
            withCitations: 0,
            totalCitations: 0
          };
        }

        citationStats.platformBreakdown[analysis.platform].withCitations++;
        citationStats.platformBreakdown[analysis.platform].totalCitations += citations.length;
      });

      citationStats.topDomains = Object.entries(citationStats.domainCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

      for (const platform of Object.keys(citationStats.platformBreakdown)) {
        const totalForPlatform = await Analytics.count({
          include: [{
            model: Keyword,
            as: 'keyword',
            where: { client_id: client.id }
          }],
          where: {
            platform,
            created_at: { [Op.gte]: daysAgo }
          }
        });
        
        citationStats.platformBreakdown[platform].totalAnalyses = totalForPlatform;
        citationStats.platformBreakdown[platform].citationRate = 
          ((citationStats.platformBreakdown[platform].withCitations / totalForPlatform) * 100).toFixed(1);
      }

      res.json({
        summary: {
          totalCitations: citationStats.totalCitations,
          uniqueDomains: citationStats.uniqueDomains.size,
          analysesWithCitations: analyticsWithCitations.length,
          avgCitationsPerAnalysis: analyticsWithCitations.length > 0 
            ? (citationStats.totalCitations / analyticsWithCitations.length).toFixed(1) 
            : 0
        },
        topDomains: citationStats.topDomains,
        platformBreakdown: Object.entries(citationStats.platformBreakdown).map(([platform, stats]) => ({
          platform,
          ...stats
        })),
        recentAnalyses: analyticsWithCitations.slice(0, 20).map(analysis => ({
          id: analysis.id,
          keyword: analysis.keyword.keyword,
          category: analysis.keyword.category,
          platform: analysis.platform,
          citationCount: Array.isArray(analysis.citations) ? analysis.citations.length : 0,
          stakeMentioned: analysis.stake_mentioned,
          createdAt: analysis.created_at
        }))
      });
    } catch (error) {
      console.error('Error getting citation analysis:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = analyticsController;
