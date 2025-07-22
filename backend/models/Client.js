const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  industry: {
    type: DataTypes.STRING(100),
    defaultValue: 'Technology'
  },
  website: {
    type: DataTypes.STRING(255),
    validate: {
      isUrl: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  api_limits: {
    type: DataTypes.JSON,
    defaultValue: {
      daily_requests: 1000,
      monthly_requests: 30000
    }
  }
}, {
  tableName: 'clients',
  indexes: [
    {
      fields: ['active']
    },
    {
      fields: ['industry']
    }
  ]
});

module.exports = Client;
