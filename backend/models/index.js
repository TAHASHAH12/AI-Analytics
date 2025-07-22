const sequelize = require('../config/database');
const Keyword = require('./Keyword');
const Analytics = require('./Analytics');
const Client = require('./Client');

// Define associations
Keyword.hasMany(Analytics, {
  foreignKey: 'keyword_id',
  as: 'analytics',
  onDelete: 'CASCADE'
});

Analytics.belongsTo(Keyword, {
  foreignKey: 'keyword_id',
  as: 'keyword'
});

Client.hasMany(Keyword, {
  foreignKey: 'client_id',
  as: 'keywords'
});

Keyword.belongsTo(Client, {
  foreignKey: 'client_id',
  as: 'client'
});

// Sync models with database
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('✅ Database synchronized successfully.');
    
    // Create default client if it doesn't exist
    const [stakeClient, created] = await Client.findOrCreate({
      where: { name: 'Stake' },
      defaults: {
        name: 'Stake',
        industry: 'Gambling & Cryptocurrency',
        website: 'https://stake.com',
        active: true,
        settings: {
          target_platforms: ['ChatGPT', 'Perplexity', 'Claude', 'Gemini'],
          analysis_frequency: 'daily'
        }
      }
    });
    
    if (created) {
      console.log('✅ Default client "Stake" created.');
    }
  } catch (error) {
    console.error('❌ Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Keyword,
  Analytics,
  Client,
  syncDatabase
};
