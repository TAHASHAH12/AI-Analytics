const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class OpenAIService {
  constructor() {
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  async analyzeKeyword(keyword, query, context = {}) {
    try {
      const systemPrompt = `You are an AI assistant that analyzes search queries and provides comprehensive responses. 
      Pay special attention to mentions of 'Stake' (the gambling and cryptocurrency platform). 
      Analyze the sentiment towards Stake if mentioned, and provide detailed analysis.
      
      Context: ${JSON.stringify(context)}`;

      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Analyze this query about "${keyword}": ${query}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      });

      const response = completion.choices[0].message.content;
      
      const analysis = {
        response,
        stakeMentioned: this.checkStakeMention(response),
        brandSentiment: this.analyzeBrandSentiment(response),
        overallSentiment: this.analyzeOverallSentiment(response),
        wordCount: response.split(' ').length,
        confidenceScore: this.calculateConfidenceScore(response),
        keyTopics: this.extractKeyTopics(response),
        citations: this.extractCitations(response),
        usage: completion.usage
      };
      
      return analysis;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI Analysis Failed: ${error.message}`);
    }
  }

  checkStakeMention(text) {
    const stakePatterns = [
      /\bstake\b/gi,
      /\bstake\.com\b/gi,
      /\bstake casino\b/gi,
      /\bstake platform\b/gi
    ];
    
    return stakePatterns.some(pattern => pattern.test(text));
  }

  analyzeBrandSentiment(text) {
    if (!this.checkStakeMention(text)) return 'Neutral';
    
    const veryPositiveWords = ['excellent', 'outstanding', 'amazing', 'exceptional', 'superior', 'best'];
    const positiveWords = ['good', 'great', 'solid', 'reliable', 'trusted', 'popular', 'recommended'];
    const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'unreliable', 'risky'];
    const veryNegativeWords = ['scam', 'fraud', 'dangerous', 'avoid', 'illegal', 'banned'];
    
    const lowerText = text.toLowerCase();
    
    const veryPositiveScore = veryPositiveWords.filter(word => lowerText.includes(word)).length * 2;
    const positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;
    const veryNegativeScore = veryNegativeWords.filter(word => lowerText.includes(word)).length * 2;
    
    const totalPositive = veryPositiveScore + positiveScore;
    const totalNegative = negativeScore + veryNegativeScore;
    
    if (veryPositiveScore > 0 && totalPositive > totalNegative) return 'Very Positive';
    if (totalPositive > totalNegative) return 'Positive';
    if (totalNegative > totalPositive) return 'Negative';
    if (veryNegativeScore > 0) return 'Very Negative';
    
    return 'Neutral';
  }

  analyzeOverallSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'outstanding', 'positive', 'beneficial'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'poor', 'disappointing', 'negative', 'problematic', 'concerning'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'Positive';
    if (negativeCount > positiveCount) return 'Negative';
    return 'Neutral';
  }

  calculateConfidenceScore(text) {
    const confidenceIndicators = [
      /definitely/gi, /certainly/gi, /clearly/gi, /obviously/gi,
      /according to/gi, /research shows/gi, /studies indicate/gi,
      /data suggests/gi, /evidence shows/gi
    ];
    
    const uncertaintyIndicators = [
      /maybe/gi, /perhaps/gi, /possibly/gi, /might/gi, /could/gi,
      /seems/gi, /appears/gi, /allegedly/gi, /reportedly/gi
    ];
    
    const confidenceScore = confidenceIndicators.reduce((score, pattern) => {
      return score + (text.match(pattern) || []).length * 0.1;
    }, 0.5);
    
    const uncertaintyPenalty = uncertaintyIndicators.reduce((penalty, pattern) => {
      return penalty + (text.match(pattern) || []).length * 0.05;
    }, 0);
    
    return Math.max(0, Math.min(1, confidenceScore - uncertaintyPenalty));
  }

  extractKeyTopics(text) {
    const topics = [];
    const gamblingTopics = ['betting', 'casino', 'gambling', 'poker', 'slots', 'sports betting'];
    const cryptoTopics = ['bitcoin', 'cryptocurrency', 'crypto', 'blockchain', 'digital currency'];
    
    gamblingTopics.forEach(topic => {
      if (text.toLowerCase().includes(topic)) topics.push(`Gambling: ${topic}`);
    });
    
    cryptoTopics.forEach(topic => {
      if (text.toLowerCase().includes(topic)) topics.push(`Crypto: ${topic}`);
    });
    
    return topics;
  }

  extractCitations(text) {
    const urlPattern = /(https?:\/\/[^\s]+)/gi;
    const urls = text.match(urlPattern) || [];
    
    return urls.map((url, index) => ({
      url: url,
      position: index + 1,
      title: `Citation ${index + 1}`
    }));
  }

  async generateKeywordSuggestions(seedKeyword, count = 10, category = 'General') {
    try {
      const categoryContext = this.getCategoryContext(category);
      
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are a keyword research expert specializing in ${category.toLowerCase()} keywords. 
            Generate relevant keyword suggestions for SEO and content marketing that would be valuable for Stake.com.
            ${categoryContext}`
          },
          {
            role: "user",
            content: `Generate ${count} relevant keyword suggestions related to "${seedKeyword}". 
            Return only the keywords, one per line, without numbers or bullet points.`
          }
        ],
        max_tokens: 800,
        temperature: 0.8
      });

      const suggestions = completion.choices[0].message.content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim())
        .filter(keyword => keyword.length > 0 && keyword.length <= 100)
        .slice(0, count);

      return suggestions;
    } catch (error) {
      console.error('OpenAI Keyword Suggestions Error:', error);
      throw new Error(`Keyword suggestion failed: ${error.message}`);
    }
  }

  getCategoryContext(category) {
    const contexts = {
      'Gambling': 'Focus on gambling, betting, casino games, sports betting, and related terms.',
      'Cryptocurrency': 'Focus on crypto, bitcoin, digital currencies, blockchain, and crypto gambling.',
      'Sports Betting': 'Focus on sports betting, odds, matches, tournaments, and specific sports.',
      'Casino Games': 'Focus on slot games, poker, blackjack, roulette, and other casino games.',
      'Promotions': 'Focus on bonuses, promotions, offers, rewards, and loyalty programs.',
      'Banking': 'Focus on deposits, withdrawals, payment methods, and financial transactions.',
      'Support': 'Focus on customer service, help, tutorials, and user guidance.'
    };
    
    return contexts[category] || 'Generate general keywords related to online gaming and gambling.';
  }
}

module.exports = new OpenAIService();
