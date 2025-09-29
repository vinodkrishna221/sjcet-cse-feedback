# Student Feedback Management System

A comprehensive web application for managing student feedback on faculty teaching performance, built with FastAPI backend and React frontend.

## 🚀 Features

- **Student Authentication**: Secure login using registration number and date of birth
- **Admin Dashboard**: HOD and Principal dashboards with comprehensive analytics
- **Feedback System**: 10-question comprehensive feedback form for each teacher
- **Analytics**: Detailed performance analytics and reporting
- **Role-based Access**: Secure access control for students, HOD, and Principal
- **Data Management**: Student and faculty management with CSV import/export
- **Real-time Updates**: Live dashboard updates and notifications

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with async/await support
- **Database**: MongoDB with Motor async driver
- **Authentication**: JWT tokens with bcrypt password hashing
- **Security**: Rate limiting, CORS protection, input validation
- **API**: RESTful API with comprehensive error handling

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/ui components with Tailwind CSS
- **State Management**: React Context for authentication
- **Routing**: React Router v6 with protected routes
- **HTTP Client**: Fetch API with error handling

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- MongoDB 7.0+
- Docker and Docker Compose (optional)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd student-feedback-system
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001/api
   - API Documentation: http://localhost:8001/docs

### Manual Setup

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment file**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Start MongoDB**
   ```bash
   mongod
   ```

6. **Run the backend**
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the frontend**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=student_feedback_db

# Security Configuration
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Server Configuration
HOST=0.0.0.0
PORT=8001

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
```

#### Frontend (.env.local)
```env
VITE_BACKEND_URL=http://localhost:8001/api
```

## 👥 Default Credentials

### Admin Accounts
- **HOD**: username=`hod_cse`, password=`hod@123`
- **Principal**: username=`principal`, password=`principal@123`

### Sample Students
- **Student A**: Reg=`24G31A0501`, DOB=`2003-05-15`
- **Student B**: Reg=`24G31A0521`, DOB=`2003-01-07`

## 📊 Database Schema

### Collections

#### Students
```json
{
  "id": "uuid",
  "reg_number": "string",
  "name": "string",
  "section": "A|B|C|D",
  "dob": "YYYY-MM-DD",
  "email": "string",
  "phone": "string",
  "is_active": "boolean"
}
```

#### Faculty
```json
{
  "id": "uuid",
  "faculty_id": "string",
  "name": "string",
  "subjects": ["string"],
  "sections": ["A|B|C|D"],
  "email": "string",
  "phone": "string",
  "is_active": "boolean"
}
```

#### Feedback Submissions
```json
{
  "id": "uuid",
  "student_section": "A|B|C|D",
  "faculty_feedbacks": [
    {
      "faculty_id": "string",
      "faculty_name": "string",
      "subject": "string",
      "question_ratings": [
        {
          "question_id": "string",
          "question": "string",
          "rating": "number"
        }
      ],
      "overall_rating": "number",
      "detailed_feedback": "string",
      "suggestions": "string"
    }
  ],
  "submitted_at": "datetime",
  "is_anonymous": "boolean"
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Configurable request rate limiting
- **CORS Protection**: Configurable cross-origin resource sharing
- **Input Validation**: Comprehensive data validation
- **Security Headers**: XSS, CSRF, and clickjacking protection
- **Role-based Access**: Granular permission system

## 🧪 Testing

### Backend Testing
```bash
cd backend
python backend_test_fixed.py
```

### Frontend Testing
```bash
cd frontend
npm run test
```

## 📈 Performance Optimizations

- **Database Indexing**: Optimized MongoDB indexes
- **Connection Pooling**: Efficient database connections
- **Caching**: In-memory caching for frequently accessed data
- **Async Operations**: Non-blocking I/O operations
- **Bundle Optimization**: Code splitting and tree shaking

## 🚀 Deployment

### Production Environment

1. **Set production environment variables**
2. **Use production-grade MongoDB instance**
3. **Configure reverse proxy (nginx)**
4. **Set up SSL certificates**
5. **Configure monitoring and logging**

### Docker Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/student/login` - Student login
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/verify-token` - Token verification

### Student Management
- `GET /api/students/` - Get all students
- `POST /api/students/` - Create student
- `PUT /api/students/{id}` - Update student
- `DELETE /api/students/{id}` - Delete student

### Faculty Management
- `GET /api/faculty/` - Get all faculty
- `POST /api/faculty/` - Create faculty
- `PUT /api/faculty/{id}` - Update faculty
- `DELETE /api/faculty/{id}` - Delete faculty

### Feedback System
- `POST /api/feedback/submit` - Submit feedback
- `GET /api/feedback/analytics/dashboard` - Dashboard analytics
- `GET /api/feedback/questions` - Get feedback questions

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MongoDB is running
   - Verify connection string in .env
   - Check network connectivity

2. **CORS Errors**
   - Verify CORS_ORIGINS in backend .env
   - Check frontend URL matches allowed origins

3. **Authentication Issues**
   - Verify SECRET_KEY is set
   - Check token expiration settings
   - Clear browser storage and retry

4. **Rate Limiting**
   - Check RATE_LIMIT_PER_MINUTE setting
   - Wait for rate limit window to reset

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

## 🔄 Changelog

### v1.0.0
- Initial release
- Student feedback system
- Admin dashboards
- Analytics and reporting
- Security improvements
- Docker support
