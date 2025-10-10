# Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Database Setup](#database-setup)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **Python**: Version 3.8 or higher
- **MongoDB**: Version 6.0 or higher
- **Redis**: Version 7.0 or higher
- **Git**: Version 2.0 or higher
- **Docker**: Version 20.0 or higher (optional)

### Development Tools
- **VS Code**: Recommended IDE with extensions
- **Postman**: API testing tool
- **MongoDB Compass**: Database management tool
- **Redis Commander**: Redis management tool

### VS Code Extensions
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.black-formatter",
    "ms-python.isort",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "mongodb.mongodb-vscode"
  ]
}
```

## Environment Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd sjcet
```

### 2. Environment Variables

#### Backend Environment (.env)
```bash
# Database Configuration
MONGODB_URL=mongodb://localhost:27017/feedback_db
REDIS_URL=redis://localhost:6379

# Security Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=120
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_BURST=10

# Application Configuration
DEBUG=true
LOG_LEVEL=INFO
```

#### Frontend Environment (.env)
```bash
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
REACT_APP_WS_URL=ws://localhost:8000/ws

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_PWA=true

# Development Configuration
REACT_APP_DEBUG=true
REACT_APP_LOG_LEVEL=debug
```

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-test.txt
```

### 2. Database Initialization
```bash
# Start MongoDB (if not running)
mongod --dbpath /path/to/your/db

# Initialize database with collections and indexes
mongo feedback_db < init-mongo.js
```

### 3. Run Database Migrations
```bash
python migrate_feedback_uniqueness.py
```

### 4. Start the Backend Server
```bash
# Development mode with auto-reload
uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn server:app --host 0.0.0.0 --port 8000
```

### 5. Verify Backend Setup
```bash
# Check if server is running
curl http://localhost:8000/health

# Check API documentation
open http://localhost:8000/docs
```

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start the Development Server
```bash
# Development mode
npm start

# Production build
npm run build
npm run preview
```

### 3. Verify Frontend Setup
```bash
# Check if frontend is running
open http://localhost:3000
```

## Database Setup

### 1. MongoDB Setup

#### Local Installation
```bash
# macOS (using Homebrew)
brew install mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
```

#### Docker Setup
```bash
# Run MongoDB in Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:6.0

# Run Redis in Docker
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 2. Database Initialization
```bash
# Connect to MongoDB
mongo

# Create database and collections
use feedback_db
load("init-mongo.js")
```

### 3. Verify Database Setup
```bash
# Check collections
mongo feedback_db --eval "db.getCollectionNames()"

# Check indexes
mongo feedback_db --eval "db.students.getIndexes()"
```

## Development Workflow

### 1. Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request
# Merge after review
```

### 2. Code Quality Tools

#### Backend
```bash
# Format code
black .
isort .

# Type checking
mypy .

# Run tests
pytest
```

#### Frontend
```bash
# Format code
npm run format

# Lint code
npm run lint:fix

# Type checking
npm run type-check

# Run tests
npm test
```

### 3. Pre-commit Hooks
```bash
# Install pre-commit hooks
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

## Testing

### Backend Testing
```bash
cd backend

# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=.

# Run integration tests
pytest tests/integration/
```

### Frontend Testing
```bash
cd frontend

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

### Test Data Setup
```bash
# Create test data
python scripts/create_test_data.py

# Reset test database
python scripts/reset_test_db.py
```

## Deployment

### 1. Docker Deployment

#### Build Images
```bash
# Build backend image
docker build -t feedback-backend ./backend

# Build frontend image
docker build -t feedback-frontend ./frontend
```

#### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Production Deployment

#### Environment Variables
```bash
# Production environment variables
export NODE_ENV=production
export DEBUG=false
export LOG_LEVEL=warning
```

#### Build for Production
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run build
npm run preview
```

### 3. Monitoring Setup
```bash
# Install monitoring tools
pip install prometheus-client
npm install @prometheus/client

# Start monitoring
python scripts/start_monitoring.py
```

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod
```

#### 2. Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Restart Redis
sudo systemctl restart redis
```

#### 3. Python Dependencies Issues
```bash
# Clear pip cache
pip cache purge

# Reinstall dependencies
pip uninstall -r requirements.txt -y
pip install -r requirements.txt
```

#### 4. Node.js Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 5. Port Conflicts
```bash
# Check port usage
lsof -i :8000  # Backend port
lsof -i :3000  # Frontend port
lsof -i :27017 # MongoDB port
lsof -i :6379  # Redis port

# Kill process using port
kill -9 <PID>
```

### Debugging Tips

#### 1. Backend Debugging
```python
# Enable debug mode
DEBUG = True

# Add logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Use debugger
import pdb; pdb.set_trace()
```

#### 2. Frontend Debugging
```typescript
// Enable React DevTools
// Install React Developer Tools browser extension

// Add console logging
console.log('Debug info:', data);

// Use React DevTools Profiler
// Profile component performance
```

#### 3. Database Debugging
```javascript
// MongoDB shell debugging
db.setProfilingLevel(2)  // Profile all operations
db.system.profile.find().limit(5).sort({ts: -1}).pretty()

// Check slow queries
db.setProfilingLevel(1, {slowms: 100})
```

### Performance Issues

#### 1. Slow API Responses
```bash
# Check database indexes
mongo feedback_db --eval "db.feedback_submissions.getIndexes()"

# Analyze query performance
mongo feedback_db --eval "db.feedback_submissions.explain().find({})"

# Check Redis cache
redis-cli monitor
```

#### 2. Frontend Performance
```bash
# Analyze bundle size
npm run analyze

# Check for memory leaks
# Use Chrome DevTools Memory tab

# Profile React components
# Use React DevTools Profiler
```

### Getting Help

#### 1. Documentation
- **API Documentation**: http://localhost:8000/docs
- **Architecture Docs**: `docs/ARCHITECTURE.md`
- **API Reference**: `docs/API.md`

#### 2. Logs
```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs
# Check browser console

# Database logs
tail -f /var/log/mongodb/mongod.log
```

#### 3. Community Support
- **GitHub Issues**: Create issue for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check existing documentation first

## Additional Resources

### Learning Resources
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **React Documentation**: https://react.dev/
- **MongoDB Documentation**: https://docs.mongodb.com/
- **Redis Documentation**: https://redis.io/docs/

### Tools and Utilities
- **API Testing**: Postman, Insomnia
- **Database Management**: MongoDB Compass, Studio 3T
- **Redis Management**: Redis Commander, RedisInsight
- **Code Quality**: SonarQube, CodeClimate

### Best Practices
- **Security**: OWASP guidelines
- **Performance**: Web.dev performance guides
- **Accessibility**: WCAG guidelines
- **Testing**: Testing Library best practices

This setup guide should help you get the Student Feedback Management System up and running quickly. If you encounter any issues not covered here, please refer to the troubleshooting section or create an issue in the repository.
