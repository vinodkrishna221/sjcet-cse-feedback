# Feedback Management System

A comprehensive web-based feedback management system for educational institutions, built with FastAPI backend and React frontend.

## 🚀 Features

### Core Functionality
- **Student Management**: Complete CRUD operations for student records
- **Faculty Management**: Faculty profile and subject management
- **Feedback System**: Anonymous feedback collection with semester tracking
- **Report Generation**: Comprehensive reports in multiple formats (PDF, Excel, CSV)
- **Admin Dashboard**: Role-based access control and system administration

### Advanced Features
- **Authentication & Security**: JWT-based auth with refresh tokens, CSRF protection
- **Bulk Operations**: Import/export with validation and error reporting
- **Analytics Dashboard**: Trend analysis and performance metrics
- **Notification System**: Email notifications and deadline reminders
- **Audit Trail**: Complete action logging and undo functionality
- **PWA Support**: Progressive Web App capabilities
- **Dark Mode**: Theme switching with accessibility features

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with async/await support
- **Database**: MongoDB with Motor async driver
- **Authentication**: JWT tokens with refresh mechanism
- **Security**: Rate limiting, CORS, CSRF protection
- **API**: RESTful API with versioning and OpenAPI documentation

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand for global state
- **UI Components**: Shadcn/ui with Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Routing**: React Router DOM with lazy loading
- **Testing**: Jest, React Testing Library, Playwright

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- MongoDB 5.0+
- Redis 6.0+ (for rate limiting)

## 🛠️ Installation

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd feedback-system/backend
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

4. **Environment configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Database setup**
   ```bash
   # Start MongoDB
   mongod
   
   # Run database initialization
   python init-mongo.js
   ```

6. **Run the server**
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API URL
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov=. --cov-report=html
```

### Frontend Tests
```bash
cd frontend
npm run test              # Unit tests
npm run test:coverage     # Coverage report
npm run test:e2e          # E2E tests
```

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=mongodb://localhost:27017/feedback_system
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=120
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
REDIS_URL=redis://localhost:6379
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

#### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Feedback Management System
```

## 🚀 Deployment

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - MongoDB: localhost:27017
   - Redis: localhost:6379

### Production Deployment

1. **Backend deployment**
   ```bash
   # Install production dependencies
   pip install -r requirements.txt
   
   # Run with production server
   gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

2. **Frontend deployment**
   ```bash
   # Build for production
   npm run build
   
   # Serve with nginx or similar
   ```

## 📖 Usage Guide

### Admin Login
1. Navigate to `/admin-login`
2. Use admin credentials to access the system
3. Access HOD dashboard for department management

### Student Login
1. Navigate to `/student-login`
2. Use registration number and password
3. Submit feedback for assigned faculty

### Feedback Submission
1. Select semester and academic year
2. Rate faculty on various criteria (1-10 scale)
3. Provide detailed feedback and suggestions
4. Submit anonymously or with identification

### Report Generation
1. Access reports section from admin dashboard
2. Select report type and filters
3. Choose export format (PDF, Excel, CSV)
4. Download or email reports

## 🔒 Security Features

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control
- **Rate Limiting**: Redis-based rate limiting
- **CSRF Protection**: Cross-site request forgery protection
- **Input Validation**: Comprehensive input validation
- **Password Security**: Strong password policies with bcrypt
- **Audit Logging**: Complete action audit trail

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first responsive layout
- **Dark Mode**: Theme switching capability
- **Accessibility**: WCAG 2.1 AA compliance
- **Loading States**: Skeleton screens and loading indicators
- **Error Handling**: Graceful error handling and user feedback
- **Keyboard Navigation**: Full keyboard accessibility

## 📊 Performance Features

- **Code Splitting**: Route-based code splitting
- **Virtual Scrolling**: Efficient rendering of large lists
- **Caching**: Redis caching for improved performance
- **PWA**: Progressive Web App capabilities
- **Bundle Optimization**: Optimized JavaScript bundles

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages
- Ensure all tests pass before submitting

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation and FAQ

## 🔄 Changelog

### Version 1.0.0
- Initial release with core functionality
- Student and faculty management
- Feedback system with analytics
- Report generation
- Admin dashboard
- Security features
- PWA support

## 🏆 Acknowledgments

- FastAPI team for the excellent framework
- React team for the frontend library
- Shadcn/ui for the beautiful components
- MongoDB for the database solution
- All contributors and testers