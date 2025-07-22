const csv = require('csv-parser');
const fs = require('fs');

class CSVProcessor {
  constructor() {
    this.validCategories = [
      'General', 'Gambling', 'Cryptocurrency', 'Sports Betting',
      'Casino Games', 'Promotions', 'Banking', 'Support'
    ];
  }

  async processCSVFile(filePath, options = {}) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let rowCount = 0;

      const stream = fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => header.toLowerCase().trim(),
          skipEmptyLines: true,
          skipLinesWithError: true
        }));

      stream.on('data', (data) => {
        rowCount++;
        try {
          const processed = this.processRow(data, rowCount);
          if (processed.error) {
            errors.push(processed.error);
          } else {
            results.push(processed.data);
          }
        } catch (error) {
          errors.push(`Row ${rowCount}: ${error.message}`);
        }
      });

      stream.on('end', () => {
        resolve({
          success: true,
          data: results,
          errors: errors,
          totalRows: rowCount,
          processedRows: results.length,
          errorRows: errors.length
        });
      });

      stream.on('error', (error) => {
        reject({
          success: false,
          error: error.message,
          data: [],
          errors: [`File processing error: ${error.message}`]
        });
      });
    });
  }

  processRow(row, rowNumber) {
    try {
      // Look for keyword column with flexible naming
      const keyword = row.keyword || row.keywords || row.term || row.terms ||
                     row.phrase || row.phrases || row.query || row.queries ||
                     Object.values(row)[0];

      const category = row.category || row.categories || row.group ||
                      row.groups || row.type || 'General';

      // Validate keyword
      if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
        return {
          error: `Row ${rowNumber}: Missing or invalid keyword`
        };
      }

      const trimmedKeyword = keyword.trim();

      // Validate keyword length
      if (trimmedKeyword.length > 255) {
        return {
          error: `Row ${rowNumber}: Keyword too long (max 255 characters)`
        };
      }

      // Validate and normalize category
      const trimmedCategory = typeof category === 'string' ? category.trim() : 'General';
      const finalCategory = this.validCategories.includes(trimmedCategory) ? trimmedCategory : 'General';

      return {
        data: {
          keyword: trimmedKeyword,
          category: finalCategory,
          rowNumber: rowNumber
        }
      };
    } catch (error) {
      return {
        error: `Row ${rowNumber}: Processing error - ${error.message}`
      };
    }
  }

  validateCSVStructure(filePath) {
    return new Promise((resolve, reject) => {
      const headers = [];
      const sampleRows = [];
      let rowCount = 0;
      const maxSampleRows = 5;

      const stream = fs.createReadStream(filePath)
        .pipe(csv({
          mapHeaders: ({ header }) => {
            const cleanHeader = header.toLowerCase().trim();
            if (headers.length < 10) { // Capture first 10 headers
              headers.push(cleanHeader);
            }
            return cleanHeader;
          }
        }));

      stream.on('data', (data) => {
        rowCount++;
        if (sampleRows.length < maxSampleRows) {
          sampleRows.push(data);
        }
      });

      stream.on('end', () => {
        const hasKeywordColumn = headers.some(header =>
          ['keyword', 'keywords', 'term', 'terms', 'phrase', 'phrases'].includes(header)
        );

        const hasCategoryColumn = headers.some(header =>
          ['category', 'categories', 'group', 'groups', 'type'].includes(header)
        );

        resolve({
          valid: headers.length > 0,
          headers: headers,
          sampleRows: sampleRows,
          totalRows: rowCount,
          hasKeywordColumn: hasKeywordColumn,
          hasCategoryColumn: hasCategoryColumn,
          recommendations: this.getRecommendations(hasKeywordColumn, hasCategoryColumn)
        });
      });

      stream.on('error', (error) => {
        reject({
          valid: false,
          error: error.message
        });
      });
    });
  }

  getRecommendations(hasKeywordColumn, hasCategoryColumn) {
    const recommendations = [];

    if (!hasKeywordColumn) {
      recommendations.push('Add a "keyword" column with your keywords');
    }

    if (!hasCategoryColumn) {
      recommendations.push('Consider adding a "category" column to organize keywords');
    }

    recommendations.push('Ensure keywords are not empty and under 255 characters');
    recommendations.push('Valid categories: ' + this.validCategories.join(', '));

    return recommendations;
  }

  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error cleaning up file:', error);
      return false;
    }
  }
}

module.exports = new CSVProcessor();
