const axios = require('axios');

class DataForSeoService {
  constructor() {
    this.baseURL = 'https://api.dataforseo.com/v3';
    this.credentials = {
      username: process.env.DATAFORSEO_USERNAME,
      password: process.env.DATAFORSEO_PASSWORD
    };
  }

  async makeRequest(endpoint, data = null, method = 'POST') {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        auth: this.credentials,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = Array.isArray(data) ? data : [data];
      }

      const response = await axios(config);
      
      if (response.data.tasks && response.data.tasks[0]) {
        return response.data.tasks[0];
      }
      
      return response.data;
    } catch (error) {
      console.error('DataForSEO API Error:', error.response?.data || error.message);
      throw new Error(`DataForSEO request failed: ${error.message}`);
    }
  }

  async getKeywordData(keyword, locationCode = 2840, languageCode = 'en') {
    try {
      const requestData = {
        keyword: keyword,
        location_code: locationCode,
        language_code: languageCode,
        limit: 100
      };

      const result = await this.makeRequest('/dataforseo_labs/google/keyword_suggestions/live', requestData);
      
      if (result.result && result.result.length > 0) {
        return result.result.map(item => ({
          keyword: item.keyword,
          search_volume: item.search_volume,
          cpc: item.cpc,
          competition_level: item.competition_level,
          competition_index: item.competition_index,
          low_top_of_page_bid: item.low_top_of_page_bid,
          high_top_of_page_bid: item.high_top_of_page_bid,
          categories: item.categories,
          monthly_searches: item.monthly_searches
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching keyword data:', error.message);
      return [];
    }
  }

  async getKeywordSuggestions(keyword, filters = null, limit = 50) {
    try {
      const requestData = {
        keyword: keyword,
        location_code: 2840,
        language_code: 'en',
        limit: limit
      };

      if (filters && filters.length > 0) {
        requestData.filters = filters;
      }

      const result = await this.makeRequest('/dataforseo_labs/google/keyword_suggestions/live', requestData);
      
      if (result.result) {
        return result.result.map(item => ({
          keyword: item.keyword,
          search_volume: item.search_volume,
          cpc: item.cpc,
          competition: item.competition_level,
          difficulty: item.keyword_difficulty,
          trend: item.monthly_searches ? item.monthly_searches.slice(-12) : []
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching keyword suggestions:', error.message);
      return [];
    }
  }
}

module.exports = new DataForSeoService();
