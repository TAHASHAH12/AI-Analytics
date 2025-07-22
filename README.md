# 🔍 AI Search Analytics

AI Search Analytics is a full-stack web application that enables digital marketers, SEO professionals, and agencies to track keyword visibility, analyze competitor performance, and extract AI-based citation trends. It leverages OpenAI and DataForSEO APIs to surface meaningful insights from SERPs, keywords, and market shifts.

---

## 🚀 Features

### 🔧 Backend (Node.js + Express)
- Upload and manage keyword lists (CSV & manual)
- Connects to OpenAI for AI citation analysis
- Pulls SERP visibility data from DataForSEO Labs API
- MongoDB database integration
- RESTful API endpoints for keywords, analytics, and uploads

### 💻 Frontend (React 19)
- User dashboard with interactive charts
- Visibility, trend, and citation metrics
- Competitor comparison view
- Modular components for analytics, keyword input, and CSV import

---

## 📁 Folder Structure

ai-search-analytics/
├── backend/
│ ├── server.js
│ ├── routes/
│ ├── controllers/
│ ├── models/
│ ├── services/
│ └── config/
├── frontend/
│ ├── public/
│ └── src/
│ ├── components/
│ ├── pages/
│ ├── services/
│ └── utils/





---

## ⚙️ Technologies Used

| Layer      | Tools & Libraries                               |
|------------|--------------------------------------------------|
| Frontend   | React 19, React Router DOM, Chart.js, Axios     |
| Backend    | Node.js, Express.js, Mongoose                   |
| Database   | MongoDB                                         |
| AI API     | OpenAI (GPT-4 or GPT-4o)                        |
| SEO API    | DataForSEO Labs                                 |

---

## 🧪 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/TAHASHAH12/AI-Analytics.git
cd AI-Analytics


2. Backend Setup

cd backend
npm install


Create a .env file in the backend/ directory:

env
Copy
Edit
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aisearch
OPENAI_API_KEY=your_openai_api_key
DATAFORSEO_API_USER=your_dataforseo_username
DATAFORSEO_API_PASS=your_dataforseo_password


npm start


3. Frontend Setup
bash
Copy
Edit
cd ../frontend
npm install
npm start
The frontend runs on http://localhost:3000 and proxies API requests to the backend running on http://localhost:5000.

