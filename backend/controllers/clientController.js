const { Client, Keyword, Analytics } = require('../models');
const { Op, fn, col } = require('sequelize');

const clientController = {
  async getAllClients(req, res) {
    try {
      const clients = await Client.findAll({
        include: [{
          model: Keyword,
          as: 'keywords',
          attributes: ['id'],
          required: false
        }],
        attributes: {
          include: [
            [fn('COUNT', col('keywords.id')), 'keyword_count']
          ]
        },
        group: ['Client.id'],
        order: [['created_at', 'DESC']]
      });

      res.json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getClient(req, res) {
    try {
      const { id } = req.params;
      
      const client = await Client.findByPk(id, {
        include: [{
          model: Keyword,
          as: 'keywords',
          limit: 10,
          order: [['created_at', 'DESC']]
        }]
      });

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const stats = await this.getClientStats(client.id);
      
      res.json({
        ...client.toJSON(),
        stats
      });
    } catch (error) {
      console.error('Error fetching client:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async createClient(req, res) {
    try {
      const { name, industry, website, description, settings } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Client name is required' });
      }

      const existingClient = await Client.findOne({ where: { name } });
      if (existingClient) {
        return res.status(400).json({ error: 'Client already exists' });
      }

      const client = await Client.create({
        name,
        industry,
        website,
        description,
        settings: settings || {},
        active: true
      });

      res.status(201).json(client);
    } catch (error) {
      console.error('Error creating client:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async updateClient(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const client = await Client.findByPk(id);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      await client.update(updates);
      res.json(client);
    } catch (error) {
      console.error('Error updating client:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async deleteClient(req, res) {
    try {
      const { id } = req.params;

      const client = await Client.findByPk(id);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Check if client has keywords
      const keywordCount = await Keyword.count({ where: { client_id: id } });
      if (keywordCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete client with existing keywords. Delete keywords first.' 
        });
      }

      await client.destroy();
      res.json({ message: 'Client deleted successfully' });
    } catch (error) {
      console.error('Error deleting client:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getClientStats(clientId) {
    const [
      totalKeywords,
      activeKeywords,
      totalAnalytics,
      stakeMentions
    ] = await Promise.all([
      Keyword.count({ where: { client_id: clientId } }),
      Keyword.count({ where: { client_id: clientId, status: 'active' } }),
      Analytics.count({
        include: [{
          model: Keyword,
          as: 'keyword',
          where: { client_id: clientId }
        }]
      }),
      Analytics.count({
        include: [{
          model: Keyword,
          as: 'keyword',
          where: { client_id: clientId }
        }],
        where: { stake_mentioned: true }
      })
    ]);

    return {
      totalKeywords,
      activeKeywords,
      totalAnalytics,
      stakeMentions,
      mentionRate: totalAnalytics > 0 ? ((stakeMentions / totalAnalytics) * 100).toFixed(1) : 0
    };
  }
};

module.exports = clientController;
