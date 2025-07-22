const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Keyword = sequelize.define('Keyword', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  keyword: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'clients',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.STRING(100),
    defaultValue: 'General',
    validate: {
      isIn: [['General', 'Gambling', 'Cryptocurrency', 'Sports Betting', 'Casino Games', 'Promotions', 'Banking', 'Support']]
    }
  },
  search_volume: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  competition: {
    type: DataTypes.ENUM('Low', 'Medium', 'High'),
    defaultValue: 'Medium'
  },
  cpc: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  difficulty: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
    validate: {
      min: 0,
      max: 100
    }
  },
  visibility_chatgpt: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  visibility_perplexity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  visibility_claude: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  visibility_gemini: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  avg_position: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 0.0
  },
  last_analyzed: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'archived'),
    defaultValue: 'active'
  }
}, {
  tableName: 'keywords',
  indexes: [
    {
      unique: true,
      fields: ['keyword', 'client_id']
    },
    {
      fields: ['category']
    },
    {
      fields: ['last_analyzed']
    },
    {
      fields: ['status']
    },
    {
      fields: ['search_volume']
    }
  ]
});

module.exports = Keyword;
