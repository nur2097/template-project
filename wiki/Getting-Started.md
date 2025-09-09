# 🚀 Getting Started

This guide will help you set up and run the NestJS Enterprise Template in just a few minutes.

## 📋 Prerequisites

### Required
- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/get-started))

### Optional (for manual setup)
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **MongoDB** 6.0+ ([Download](https://www.mongodb.com/try/download/community))
- **Redis** 7.0+ ([Download](https://redis.io/download))

## ⚡ Quick Start (Docker - Recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/nestjs-enterprise-template.git
cd nestjs-enterprise-template
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables (optional for development)
nano .env
```

### 3. Start All Services
```bash
# Build and start all services
docker-compose up -d --build

# View logs (optional)
docker-compose logs -f
```

### 4. Verify Installation
```bash
# Check API health
curl http://localhost:3000/api/v1/health/liveness

# Expected response:
# {"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}
```

### 5. Access the Application
- **API**: http://localhost:3000
- **Swagger Documentation**: http://localhost:3000/api/docs
- **Database Studio**: `docker-compose exec app npm run db:studio`

## 🛠️ Manual Setup

### 1. Clone and Install
```bash
git clone https://github.com/your-repo/nestjs-enterprise-template.git
cd nestjs-enterprise-template
npm install
```

### 2. Database Setup

#### Start Infrastructure Services
```bash
# Start only database services
docker-compose up -d postgres mongodb redis
```

#### Alternative: Manual Database Setup
```bash
# PostgreSQL (if not using Docker)
createdb enterprise_db

# MongoDB (if not using Docker)
# MongoDB will create database automatically
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
# Database URLs
DATABASE_URL="postgresql://admin:password123@localhost:5432/enterprise_db?schema=public"
MONGODB_URI="mongodb://localhost:27017/enterprise_logs"
MONGODB_LOG_DB="mongodb://localhost:27017/enterprise_logs"

# Redis Configuration
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="1h"
```

### 4. Database Migration
```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 5. Start the Application
```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## 🧪 Verify Your Setup

### 1. Health Check
```bash
curl http://localhost:3000/api/v1/health/liveness
```

Expected response:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

### 2. API Documentation
Visit: http://localhost:3000/api/docs

You should see the Swagger UI with all available endpoints.

### 3. Test Authentication
```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "password": "Test123456"
  }'
```

Expected response:
```json
{
  "user": {
    "id": 1,
    "email": "test@example.com",
    "fullName": "Test User",
    "systemRole": "USER"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "abc123def456..."
}
```

## 🐳 Docker Commands

### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Production
```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Operations
```bash
# Run database migrations
docker-compose exec app npm run db:migrate

# Access Prisma Studio
docker-compose exec app npm run db:studio

# Seed database
docker-compose exec app npm run db:seed

# Access PostgreSQL shell
docker-compose exec postgres psql -U admin -d enterprise_db

# Access Redis CLI
docker-compose exec redis redis-cli
```

## 📁 Project Structure

```
nestjs-enterprise-template/
├── 📂 src/
│   ├── 📂 common/           # Shared utilities (guards, interceptors, etc.)
│   ├── 📂 modules/          # Feature modules (auth, users, etc.)
│   ├── 📂 shared/           # Infrastructure modules (database, cache)
│   ├── 📂 config/           # Configuration management
│   ├── 📂 queue/            # Background job processing
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry point
├── 📂 prisma/               # Database schema and migrations
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Database migrations
│   └── seed.ts              # Database seeding
├── 📂 docker/               # Docker configuration
├── 📂 test/                 # Test files
├── .env.example             # Environment template
├── docker-compose.yml       # Development Docker setup
└── README.md                # Project documentation
```

## 🔧 Development Scripts

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugging

# Building
npm run build             # Build for production
npm run start:prod        # Start production build

# Database
npm run db:generate       # Generate Prisma client
npm run db:migrate        # Run migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open database studio
npm run db:seed          # Seed database
npm run db:reset         # Reset database

# Testing
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Run tests with coverage
npm run test:e2e         # Run e2e tests

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier

# Docker
npm run docker:up        # docker-compose up -d
npm run docker:down      # docker-compose down
npm run docker:logs      # View logs
```

## 🚦 Next Steps

After setting up the project:

1. **[[Development Environment]]** - Set up your IDE and tools
2. **[[Authentication System]]** - Understand the auth flow
3. **[[API Endpoints]]** - Explore available endpoints
4. **[[Database Design]]** - Learn the database schema
5. **[[Testing Guide]]** - Write and run tests

## 🆘 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### Redis Connection Issues
```bash
# Check Redis status
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

#### Permission Issues (macOS/Linux)
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

### Getting Help

- **[[Contributing Guidelines]]** - How to contribute
- **[GitHub Issues](https://github.com/your-repo/nestjs-enterprise-template/issues)** - Report bugs
- **[Discussions](https://github.com/your-repo/nestjs-enterprise-template/discussions)** - Ask questions

## 🎯 Quick Testing

Test your setup with these commands:

```bash
# 1. Health check
curl http://localhost:3000/api/v1/health

# 2. Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"User","password":"Test123456"}'

# 3. Login user
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'

# 4. Access protected endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/auth/profile
```

---

**🎉 Congratulations!** Your NestJS Enterprise Template is now running. Ready to build amazing applications!