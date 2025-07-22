const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Analytics = sequelize.define('Analytics', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  keyword_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'keywords',
      key: 'id'
    }
  },
  platform: {
    type: DataTypes.ENUM('ChatGPT', 'Perplexity', 'Claude', 'Gemini', 'Google AI'),
    allowNull: false
  },
  query: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  response: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  citations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  stake_mentioned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  brand_sentiment: {
    type: DataTypes.ENUM('Very Positive', 'Positive', 'Neutral', 'Negative', 'Very Negative'),
    defaultValue: 'Neutral'
  },
  overall_sentiment: {
    type: DataTypes.ENUM('Positive', 'Neutral', 'Negative'),
    defaultValue: 'Neutral'
  },
  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  response_time: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Response time in milliseconds'
  },
  word_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  confidence_score: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 1
    }
  },
  analysis_metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'analytics',
  indexes: [
    {
      fields: ['keyword_id']
    },
    {
      fields: ['platform']
    },
    {
      fields: ['stake_mentioned']
    },
    {
      fields: ['brand_sentiment']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = Analytics;
