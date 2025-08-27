# 🚀 NestJS Enterprise Template

Enterprise-ready NestJS API template with comprehensive logging, monitoring, authentication, and security features.

## 📋 Features

### 🔐 **Authentication & Authorization**
- JWT-based authentication
- Login/Register endpoints
- Protected routes with guards
- User profile management

### 📊 **Enterprise Logging System**
- **6 Different Log Collections:**
  - `request_logs` - All HTTP requests
  - `response_logs` - All HTTP responses with timing
  - `error_logs` - Application errors with stack traces
  - `info_logs` - General information logs
  - `debug_logs` - Debug information (development only)
  - `performance_logs` - Performance metrics and timings

### 🏥 **Health Monitoring**
- Basic health check endpoint
- Detailed system information
- Kubernetes readiness/liveness probes
- Database connectivity checks

### 🛡️ **Security Features**
- Helmet.js security headers
- CORS configuration
- Input validation with class-validator
- Rate limiting ready
- Compression middleware

### 🐳 **Docker Support**
- Multi-service Docker Compose
- MongoDB and Redis included
- Production-ready Dockerfile

## 🚀 Quick Start

### 1. Clone or Use Template
```bash
# Clone this repository
git clone <your-repo-url>
cd nestjs-enterprise-template

# Or create from GitHub template
# Click "Use this template" button on GitHub
```

### 2. Environment Setup
```bash
# Copy environment file
cp .env.example .env.development

# Edit environment variables
nano .env.development
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Services
```bash
# Start MongoDB and Redis
docker-compose up -d

# Start development server
npm run start:dev
```

### 5. Access Application
- **API:** http://localhost:3000/api
- **Swagger Docs:** http://localhost:3000/api/docs
- **Health Check:** http://localhost:3000/api/health

## 📚 API Endpoints

### Authentication
```bash
POST /api/auth/login       # User login
POST /api/auth/register    # User registration
GET  /api/auth/profile     # Get user profile (protected)
POST /api/auth/logout      # User logout (protected)
```

### Users Management
```bash
GET    /api/users          # Get all users (protected)
GET    /api/users/:id      # Get user by ID (protected)
POST   /api/users          # Create user (protected)
PUT    /api/users/:id      # Update user (protected)
DELETE /api/users/:id      # Delete user (protected)
```

### Health Monitoring
```bash
GET /api/health            # Basic health check
GET /api/health/detailed   # Detailed system info
GET /api/health/readiness  # Kubernetes readiness probe
GET /api/health/liveness   # Kubernetes liveness probe
```

### Logging System
```bash
GET /api/logger/logs                    # Get info logs
GET /api/logger/request-logs            # Get request logs
GET /api/logger/response-logs           # Get response logs
GET /api/logger/error-logs              # Get error logs
GET /api/logger/performance-logs        # Get performance logs
GET /api/logger/stats/errors            # Error statistics
GET /api/logger/stats/performance       # Performance statistics
GET /api/logger/stats/summary           # Overall statistics
POST /api/logger/test                   # Create test logs
```

## 🔧 Environment Variables

```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Database
MONGODB_URI=mongodb://localhost:27017/nestjs_enterprise
MONGODB_LOG_DB=nestjs_logs

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-jwt-secret-change-this
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Swagger
SWAGGER_ENABLED=true

# Logging
LOG_LEVEL=debug
LOG_TO_CONSOLE=true
LOG_TO_MONGODB=true

# CORS
CORS_ORIGIN=*
```

## 📊 Logging Collections

The logging system automatically categorizes logs into 6 MongoDB collections:

### 1. Request Logs (`request_logs`)
```json
{
  "method": "GET",
  "url": "/api/health",
  "headers": {...},
  "userAgent": "Mozilla/5.0...",
  "ip": "127.0.0.1",
  "userId": "user123",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "type": "request"
}
```

### 2. Response Logs (`response_logs`)
```json
{
  "method": "GET",
  "url": "/api/health",
  "statusCode": 200,
  "responseTime": 45,
  "userId": "user123",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "type": "response"
}
```

### 3. Error Logs (`error_logs`)
```json
{
  "message": "Database connection failed",
  "stack": "Error: Connection timeout...",
  "context": "DatabaseService",
  "userId": "user123",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "type": "error",
  "level": "error"
}
```

## 🐳 Docker Usage

### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Build
```bash
# Build production image
docker build -t my-api:latest .

# Run production container
docker run -d \
  --name my-api \
  --env-file .env.production \
  -p 3000:3000 \
  my-api:latest
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 📝 Development Scripts

```bash
npm run start          # Start production server
npm run start:dev      # Start development server
npm run start:debug    # Start debug mode
npm run build          # Build for production
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run docker:up      # Start Docker services
npm run docker:down    # Stop Docker services
npm run docker:logs    # View Docker logs
```

## 🎯 Usage as Template

### 1. Create New Project from Template
1. Click "Use this template" on GitHub
2. Name your new repository
3. Clone the new repository

### 2. Customize for Your Project
```bash
# Update package.json
nano package.json  # Change name, description, author

# Update environment variables
cp .env.example .env
nano .env  # Configure for your environment

# Install dependencies
npm install

# Start development
npm run start:dev
```

### 3. Add Your Business Logic
- Add new modules in `src/modules/`
- Create your entities/schemas
- Add business logic to services
- Create your controllers
- Add custom middleware if needed

## 🔒 Security Best Practices

### Production Deployment
- [ ] Change all default JWT secrets
- [ ] Set strong database passwords
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up SSL/TLS
- [ ] Configure environment-specific settings
- [ ] Set up monitoring and alerts

### Environment Security
- [ ] Use environment variables for secrets
- [ ] Never commit `.env` files
- [ ] Use different secrets for each environment
- [ ] Regularly rotate JWT secrets
- [ ] Monitor error logs for security issues

## 📈 Monitoring

### Performance Tracking
- All HTTP requests are automatically logged with response times
- Performance statistics available via `/api/logger/stats/performance`
- Error tracking with context and stack traces

### Health Checks
- Basic health: `/api/health`
- Detailed health: `/api/health/detailed`
- Database connectivity checks
- Memory usage and uptime information

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: your-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/nestjs-enterprise-template/issues)
- 📚 Documentation: [API Docs](http://localhost:3000/api/docs)

---

**Ready to build enterprise-grade APIs!** 🚀