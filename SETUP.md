# 🚀 Enterprise NestJS Template Setup Guide

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Redis** (for caching and queues)
- **PostgreSQL** (for main database)
- **MongoDB** (for logging)
- **Docker** (optional, for development services)

## 🔧 Quick Setup

### 1. **Clone and Install**

```bash
# Clone the repository
git clone <your-repository-url>
cd nestjs-enterprise-template

# Install dependencies
npm install
```

### 2. **Environment Configuration**

```bash
# Copy environment file
cp .env.example .env

# Edit configuration (see configuration section below)
nano .env
```

### 3. **Database Setup**

```bash
# Generate Prisma client
npm run db:generate

# Push database schema (for development)
npm run db:push

# Or run migrations (for production)
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 4. **Start Services**

#### Option A: Using Docker (Recommended for Development)

```bash
# Start PostgreSQL, MongoDB, Redis
docker-compose up -d postgres mongo redis

# Start the application
npm run start:dev
```

#### Option B: Using Local Services

```bash
# Make sure you have Redis, PostgreSQL, and MongoDB running locally
npm run start:dev
```

### 5. **Access Application**

- **API**: http://localhost:3000/api
- **Swagger Documentation**: http://localhost:3000/api/docs  
- **Health Check**: http://localhost:3000/api/health
- **Prisma Studio**: `npm run db:studio`

---

## ⚙️ Configuration

### **Required Environment Variables**

```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Database - PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=nestjs_enterprise

# Database - MongoDB (for logs)
MONGODB_URI=mongodb://localhost:27017/nestjs_logs

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Authentication
JWT_SECRET=your-very-secure-jwt-secret-key
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-very-secure-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
```

### **Optional Environment Variables**

```bash
# OpenTelemetry Tracing
TRACING_ENABLED=true
SERVICE_NAME=nestjs-enterprise-api
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Rate Limiting
THROTTLE_TTL_SHORT=60000    # 1 minute
THROTTLE_LIMIT_SHORT=20     # 20 requests per minute
THROTTLE_TTL_MEDIUM=300000  # 5 minutes  
THROTTLE_LIMIT_MEDIUM=100   # 100 requests per 5 minutes
THROTTLE_TTL_LONG=3600000   # 1 hour
THROTTLE_LIMIT_LONG=500     # 500 requests per hour

# Security
CSRF_ENABLED=false          # Enable in production
CORS_ORIGIN=*               # Restrict in production

# Email Service (Resend)
FROM_EMAIL=noreply@yourcompany.com
FROM_NAME=Your Company API
RESEND_API_KEY=your_resend_api_key

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880       # 5MB

# Logging
LOG_LEVEL=debug
LOG_TO_CONSOLE=true
LOG_TO_MONGODB=true
```

---

## 📚 Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start in debug mode
npm run start:prod         # Start in production mode

# Building
npm run build             # Build for production

# Database
npm run db:generate       # Generate Prisma client
npm run db:push          # Push schema to database (dev)
npm run db:migrate       # Run migrations (production)
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed initial data
npm run db:reset         # Reset database

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier

# Docker
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:logs      # View Docker logs
```

---

## 🏗️ Architecture Overview

### **Database Strategy**
- **PostgreSQL**: Main application data (users, business logic)
- **MongoDB**: Structured logging and analytics
- **Redis**: Caching, sessions, and job queues

### **Key Features**
- ✅ **Prisma ORM** with type-safe database access
- ✅ **Zod Validation** for request/response schemas
- ✅ **OpenTelemetry** for distributed tracing
- ✅ **Rate Limiting** with Redis backend
- ✅ **CSRF Protection** for web security
- ✅ **JWT Authentication** with refresh tokens
- ✅ **Comprehensive Logging** (6 log types)
- ✅ **Health Monitoring** with detailed metrics
- ✅ **File Upload** with validation
- ✅ **Email Service** with templates
- ✅ **Job Queues** with Bull/Redis

### **Logging Collections**
1. `request_logs` - HTTP requests
2. `response_logs` - HTTP responses with timing
3. `error_logs` - Application errors
4. `info_logs` - General information
5. `debug_logs` - Debug information (dev only)
6. `performance_logs` - Performance metrics

---

## 🔒 Production Checklist

### **Security**
- [ ] Change all default JWT secrets
- [ ] Set strong database passwords
- [ ] Configure proper CORS origins
- [ ] Enable CSRF protection
- [ ] Set up SSL/TLS certificates
- [ ] Configure rate limiting properly

### **Environment**
- [ ] Use production environment variables
- [ ] Set NODE_ENV=production
- [ ] Configure proper database URLs
- [ ] Set up monitoring and alerting
- [ ] Configure log retention policies

### **Database**
- [ ] Run proper migrations instead of db:push
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Set up read replicas if needed

### **Performance**
- [ ] Enable Redis for caching and sessions
- [ ] Configure CDN for static assets
- [ ] Set up load balancing
- [ ] Monitor performance metrics

---

## 🐳 Docker Development

### **Full Stack with Docker**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Clean restart
docker-compose down -v
docker-compose up -d
```

### **Individual Services**

```bash
# Only infrastructure
docker-compose up -d postgres mongo redis

# Start API separately
npm run start:dev
```

---

## 🧪 Testing

### **Default Test Users**

After running `npm run db:seed`:

```
Admin User:
  Email: admin@example.com
  Password: admin123

Regular User:
  Email: user@example.com  
  Password: user123

Moderator:
  Email: moderator@example.com
  Password: mod123
```

### **API Testing**

```bash
# Health check
curl http://localhost:3000/api/health

# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User", 
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## 🔧 Troubleshooting

### **Common Issues**

1. **Database Connection Error**
   ```bash
   # Check if databases are running
   docker-compose ps
   
   # Check connection strings in .env
   ```

2. **Redis Connection Error**
   ```bash
   # Start Redis
   docker-compose up -d redis
   # or
   brew services start redis
   ```

3. **Port Already in Use**
   ```bash
   # Kill process on port 3000
   kill -9 $(lsof -ti:3000)
   ```

4. **Prisma Client Issues**
   ```bash
   # Regenerate Prisma client
   npm run db:generate
   ```

### **Development Reset**

```bash
# Full reset for development
docker-compose down -v
npm run db:reset
npm run db:seed
npm run start:dev
```

---

## 🆘 Support

- 📧 **Email**: your-email@example.com
- 🐛 **Issues**: [GitHub Issues](your-repo/issues)
- 📚 **Docs**: [API Documentation](http://localhost:3000/api/docs)

---

**Ready to build enterprise-grade APIs!** 🚀