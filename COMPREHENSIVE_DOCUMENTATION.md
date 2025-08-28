# 🚀 NestJS Enterprise Template - Comprehensive Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation & Setup](#installation--setup)
5. [Configuration](#configuration)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Security Implementation](#security-implementation)
9. [Logging System](#logging-system)
10. [File Upload System](#file-upload-system)
11. [Email Service](#email-service)
12. [Queue System](#queue-system)
13. [Health Monitoring](#health-monitoring)
14. [Development Workflow](#development-workflow)
15. [Production Deployment](#production-deployment)
16. [Testing](#testing)
17. [Usage Examples](#usage-examples)

---

## Project Overview

The **NestJS Enterprise Template** is a production-ready, scalable backend application template built with NestJS framework. It provides a comprehensive foundation for building enterprise-grade APIs with advanced features like comprehensive logging, health monitoring, authentication, and security.

### Key Technologies
- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL (main data) + MongoDB (logs)
- **Cache/Queue**: Redis with Bull Queue
- **Authentication**: JWT with refresh tokens
- **Email**: Resend API integration
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker with multi-stage builds

### Project Structure
```
src/
├── modules/
│   ├── auth/                 # Authentication & authorization
│   ├── users/                # User management
│   ├── logger/               # Advanced logging system
│   ├── health/               # Health checks & monitoring
│   ├── email/                # Email service
│   ├── upload/               # File upload handling
│   └── security/             # Security configurations
├── shared/
│   └── database/             # Database connections
├── common/
│   ├── filters/              # Exception filters
│   └── interceptors/         # Global interceptors
├── cache/                    # Redis cache module
├── queue/                    # Bull queue system
└── main.ts                   # Application entry point
```

---

## Architecture

### Multi-Database Architecture
The template uses a dual-database approach:
- **PostgreSQL**: Main application data (users, business logic)
- **MongoDB**: Logging and analytics data (structured logs)
- **Redis**: Caching and queue management

### Modular Design
Each feature is encapsulated in its own module with:
- Controller (API endpoints)
- Service (business logic)
- DTOs (data validation)
- Entities (database models)
- Module (dependency injection configuration)

### Security Layers
1. **Helmet.js**: Security headers
2. **CORS**: Cross-origin resource sharing
3. **JWT**: Token-based authentication
4. **Input Validation**: Class-validator with DTOs
5. **Rate Limiting**: Ready for implementation

---

## Features

### 🔐 Authentication & Authorization
- **JWT Authentication**: Access and refresh token system
- **User Roles**: USER, ADMIN, MODERATOR
- **User Status**: ACTIVE, INACTIVE, SUSPENDED
- **Password Security**: bcrypt hashing
- **Session Management**: Refresh token rotation

### 📊 Advanced Logging System
Six specialized MongoDB collections for comprehensive logging:
- `request_logs` - HTTP requests with headers, IP, user context
- `response_logs` - HTTP responses with timing metrics
- `error_logs` - Application errors with stack traces
- `info_logs` - General information logs
- `debug_logs` - Development debugging (dev only)
- `performance_logs` - Operation performance metrics

### 🏥 Health Monitoring
- **Basic Health Check**: Simple availability check
- **Detailed System Info**: Memory, disk, uptime monitoring
- **Database Connectivity**: PostgreSQL and MongoDB status
- **Kubernetes Ready**: Liveness and readiness probes
- **Performance Thresholds**: Configurable warning levels

### 📧 Email Service
- **Resend Integration**: Modern email API
- **Template System**: Welcome, verification, password reset
- **Development Mode**: Console logging when API key not set
- **HTML/Text Support**: Rich email templates

### 📁 File Upload System
- **Multiple File Types**: Images, PDFs, text files
- **Size Validation**: Configurable file size limits
- **Security**: MIME type validation
- **Organization**: Folder-based file organization
- **Avatar Support**: User avatar upload functionality

### 🚦 Queue System
- **Redis-backed**: Bull queue with Redis
- **Multiple Queues**: Email and general processing
- **Job Statistics**: Monitoring and metrics
- **Error Handling**: Failed job tracking

### 🛡️ Security Features
- **Input Validation**: Comprehensive DTO validation
- **SQL Injection Protection**: TypeORM parameterized queries
- **XSS Protection**: Helmet.js security headers
- **Rate Limiting Ready**: Throttler module configured
- **Secure Headers**: Comprehensive security headers

---

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Local Development Setup

1. **Clone the Repository**
```bash
git clone <repository-url>
cd nestjs-enterprise-template
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Configuration**
```bash
# Copy the environment file
cp .env.example .env

# Edit configuration
nano .env
```

4. **Start Infrastructure Services**
```bash
# Start PostgreSQL, MongoDB, and Redis
docker-compose up -d postgres mongo redis

# Optional: Start admin tools
docker-compose --profile tools up -d
```

5. **Start Application**
```bash
# Development mode with hot reload
npm run start:dev

# Debug mode
npm run start:debug

# Production mode
npm run start:prod
```

6. **Access Application**
- **API**: http://localhost:3000/api
- **Swagger Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health

### Docker Development Setup

```bash
# Start all services including the API
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down
```

---

## Configuration

### Environment Variables

#### Application Settings
```bash
NODE_ENV=development
PORT=3000
API_PREFIX=api
FRONTEND_URL=http://localhost:3000
```

#### Database Configuration
```bash
# PostgreSQL (Main Database)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=nestjs_enterprise

# MongoDB (Logging Database)
MONGODB_URI=mongodb://localhost:27017/nestjs_logs
MONGODB_LOG_DB=nestjs_logs

# Redis (Cache & Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

#### Authentication
```bash
JWT_SECRET=your-very-long-and-secure-jwt-secret-key
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-refresh-secret-different-from-access
JWT_REFRESH_EXPIRES_IN=7d
```

#### Email Service (Optional)
```bash
FROM_EMAIL=noreply@yourcompany.com
FROM_NAME=Your Company API
RESEND_API_KEY=your_resend_api_key_here
```

#### File Upload
```bash
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes
```

#### Logging Configuration
```bash
LOG_LEVEL=debug
LOG_TO_CONSOLE=true
LOG_TO_MONGODB=true
LOG_BATCH_SIZE=100
LOG_BATCH_TIMEOUT=5000
LOG_QUEUE_MAX_SIZE=1000
LOG_ENABLE_SANITIZATION=true
LOG_ENABLE_CORRELATION=true
LOG_ENABLE_PERFORMANCE=true

# Log Retention Policies (in days)
LOG_RETENTION_HTTP=30
LOG_RETENTION_ERROR=90
LOG_RETENTION_INFO=30
LOG_RETENTION_SESSION=60
LOG_RETENTION_SECURITY=180
LOG_RETENTION_PERFORMANCE=15
```

#### Health Check Configuration
```bash
HEALTH_HTTP_TIMEOUT=5000
HEALTH_DISK_THRESHOLD_PERCENT=90
HEALTH_MEMORY_HEAP_THRESHOLD=200MB
HEALTH_MEMORY_RSS_THRESHOLD=300MB
HEALTH_ALERT_ENABLED=true
```

---

## Database Schema

### PostgreSQL Schema (Main Data)

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role_enum DEFAULT 'user',
  status user_status_enum DEFAULT 'active',
  avatar VARCHAR(255),
  phoneNumber VARCHAR(255),
  emailVerified BOOLEAN DEFAULT false,
  emailVerifiedAt TIMESTAMP,
  lastLoginAt TIMESTAMP,
  refreshToken VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP
);

CREATE TYPE user_role_enum AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'suspended');
```

### MongoDB Schema (Logging)

#### Request Logs Collection
```javascript
{
  _id: ObjectId,
  method: "GET|POST|PUT|DELETE",
  url: "/api/endpoint",
  headers: { ... },
  body: { ... },
  userAgent: "Mozilla/5.0...",
  ip: "127.0.0.1",
  userId: "user123",
  timestamp: ISODate,
  type: "request"
}
```

#### Response Logs Collection
```javascript
{
  _id: ObjectId,
  method: "GET",
  url: "/api/endpoint",
  statusCode: 200,
  responseTime: 45, // milliseconds
  userId: "user123",
  timestamp: ISODate,
  type: "response"
}
```

#### Error Logs Collection
```javascript
{
  _id: ObjectId,
  message: "Database connection failed",
  stack: "Error: Connection timeout...",
  context: "DatabaseService",
  userId: "user123",
  timestamp: ISODate,
  type: "error",
  level: "error"
}
```

#### Performance Logs Collection
```javascript
{
  _id: ObjectId,
  operation: "GET /api/users",
  duration: 125, // milliseconds
  context: "HTTP_REQUEST",
  metadata: {
    statusCode: 200,
    userId: "user123"
  },
  timestamp: ISODate,
  type: "performance"
}
```

---

## API Endpoints

### Authentication Endpoints
```http
POST /api/auth/register         # User registration
POST /api/auth/login           # User login
POST /api/auth/refresh         # Refresh access token
GET  /api/auth/profile         # Get current user profile
POST /api/auth/logout          # User logout
```

### User Management Endpoints
```http
GET    /api/users              # Get all users (paginated)
GET    /api/users/stats        # Get user statistics
GET    /api/users/:id          # Get user by ID
POST   /api/users              # Create new user
PUT    /api/users/:id          # Update user
DELETE /api/users/:id          # Delete user (soft delete)
```

### Health Monitoring Endpoints
```http
GET /api/health                # Basic health check
GET /api/health/detailed       # Detailed system information
GET /api/health/readiness      # Kubernetes readiness probe
GET /api/health/liveness       # Kubernetes liveness probe
```

### Logging System Endpoints
```http
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

### File Upload Endpoints
```http
POST /api/upload/single         # Upload single file
POST /api/upload/multiple       # Upload multiple files
POST /api/upload/avatar         # Upload user avatar
GET  /api/upload/info/:filename # Get file information
```

### Email Service Endpoints
```http
POST /api/email/send            # Send custom email
POST /api/email/test            # Send test email
GET  /api/email/templates       # Get available templates
```

---

## Security Implementation

### JWT Authentication
```typescript
// JWT Strategy Implementation
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```

### Input Validation
```typescript
// DTO with validation
export class CreateUserDto {
  @IsEmail()
  @ApiProperty({ example: "john.doe@example.com" })
  email: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({ example: "password123", minLength: 6 })
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
```

### Password Security
```typescript
// Password hashing
const hashedPassword = await bcrypt.hash(password, 10);

// Password verification
const isPasswordValid = await bcrypt.compare(password, user.password);
```

### Security Headers (main.ts)
```typescript
// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.enableCors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
});
```

---

## Logging System

### Logger Service Architecture
The logging system uses MongoDB collections for structured, searchable logs:

```typescript
@Injectable()
export class LoggerService {
  // Log HTTP requests
  async logRequest(data: {
    method: string;
    url: string;
    headers: any;
    body?: any;
    userAgent?: string;
    ip?: string;
    userId?: string;
  }) {
    const collection = this.connection.db.collection("request_logs");
    await collection.insertOne({
      ...data,
      timestamp: new Date(),
      type: LogType.REQUEST,
    });
  }

  // Log application errors
  async logError(
    message: string,
    stack?: string,
    context?: string,
    userId?: string,
  ) {
    const collection = this.connection.db.collection("error_logs");
    await collection.insertOne({
      message,
      stack,
      context,
      userId,
      timestamp: new Date(),
      type: LogType.ERROR,
      level: LogLevel.ERROR,
    });
  }
}
```

### Logging Interceptor
```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Log request
    this.loggerService.logRequest({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      userId: req.user?.userId,
    });

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        
        // Log response and performance
        this.loggerService.logResponse({...});
        this.loggerService.logPerformance({...});
      }),
      catchError((error) => {
        this.loggerService.logError(...);
        throw error;
      }),
    );
  }
}
```

### Log Analytics
```typescript
// Error statistics
async getErrorStats(hours = 24) {
  const collection = this.connection.db.collection("error_logs");
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return collection
    .aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: "$context", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
}

// Performance statistics
async getPerformanceStats(hours = 24) {
  const collection = this.connection.db.collection("performance_logs");
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return collection
    .aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: "$operation",
          avgDuration: { $avg: "$duration" },
          maxDuration: { $max: "$duration" },
          minDuration: { $min: "$duration" },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgDuration: -1 } },
    ])
    .toArray();
}
```

---

## File Upload System

### Upload Service
```typescript
@Injectable()
export class UploadService {
  private readonly allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/json",
  ];

  async uploadFile(
    file: UploadedFile,
    folder = "general",
  ): Promise<FileUploadResult> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate unique filename
    const filename = this.generateFilename(file.originalname);
    const filePath = path.join(this.uploadDir, folder, filename);

    // Write file to disk
    await writeFile(filePath, file.buffer);

    return {
      success: true,
      filename,
      url: `/uploads/${folder}/${filename}`,
      path: filePath,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
```

### File Validation
```typescript
private validateFile(file: UploadedFile): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > this.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
    };
  }

  // Check mime type
  if (!this.allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type ${file.mimetype} is not allowed`,
    };
  }

  return { valid: true };
}
```

---

## Email Service

### Email Service Implementation
```typescript
@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  async sendEmail(emailData: SendEmailDto): Promise<EmailResult> {
    try {
      // Development mode - log email instead of sending
      if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
        this.logger.log({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
        });
        
        return { success: true, messageId: `dev-${Date.now()}` };
      }

      // Send real email using Resend
      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
      });

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

### Email Templates
```typescript
// Welcome email template
async sendWelcomeEmail(to: string, userName: string): Promise<EmailResult> {
  return this.sendEmail({
    to,
    subject: "Welcome to Our Platform!",
    html: this.getWelcomeTemplate(userName),
    text: `Welcome ${userName}! Thank you for joining our platform.`,
  });
}

// Password reset template
async sendPasswordResetEmail(
  to: string,
  resetToken: string,
): Promise<EmailResult> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  return this.sendEmail({
    to,
    subject: "Password Reset Request",
    html: this.getPasswordResetTemplate(resetUrl),
    text: `Reset your password by clicking this link: ${resetUrl}`,
  });
}
```

---

## Queue System

### Queue Configuration
```typescript
@Injectable()
export class QueueService {
  constructor(
    @InjectQueue("email") private emailQueue: Queue,
    @InjectQueue("general") private generalQueue: Queue,
  ) {}

  async addEmailJob(name: string, data: any) {
    return await this.emailQueue.add(name, data);
  }

  async addGeneralJob(name: string, data: any) {
    return await this.generalQueue.add(name, data);
  }

  async getEmailQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.emailQueue.getWaiting(),
      this.emailQueue.getActive(),
      this.emailQueue.getCompleted(),
      this.emailQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}
```

### Queue Processor
```typescript
@Processor("email")
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process("send-welcome")
  async handleWelcomeEmail(job: Job<{ email: string; name: string }>) {
    this.logger.log(`Processing welcome email for ${job.data.email}`);
    
    try {
      // Send welcome email
      await this.emailService.sendWelcomeEmail(job.data.email, job.data.name);
      
      this.logger.log(`Welcome email sent to ${job.data.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error.message}`);
      throw error;
    }
  }
}
```

---

## Health Monitoring

### Health Service
```typescript
@Injectable()
export class HealthService {
  async checkDatabases(): Promise<DatabaseHealth> {
    const [postgres, mongodb] = await Promise.allSettled([
      this.checkPostgreSQL(),
      this.checkMongoDB(),
    ]);

    return {
      postgres: postgres.status === "fulfilled" 
        ? postgres.value 
        : { status: "unhealthy", message: postgres.reason.message },
      mongodb: mongodb.status === "fulfilled"
        ? mongodb.value
        : { status: "unhealthy", message: mongodb.reason.message },
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const diskUsage = await this.getRealDiskUsage();

    return {
      memory: {
        status: this.getMemoryStatus(systemMemoryPercentage),
        usage: memoryUsage,
        percentage: {
          heap: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
          system: (usedMemory / totalMemory) * 100,
        },
      },
      disk: {
        status: this.getDiskStatus(diskPercentage),
        usage: diskUsage,
      },
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
    };
  }
}
```

### Health Endpoints
```typescript
@Controller("health")
export class HealthController {
  @Get()
  async checkHealth() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("detailed")
  async getDetailedHealth() {
    return this.healthService.getOverallHealth();
  }

  @Get("readiness")
  async checkReadiness() {
    const health = await this.healthService.checkDatabases();
    const isReady = health.postgres.status === "healthy" && 
                   health.mongodb.status === "healthy";
    
    return {
      status: isReady ? "ready" : "not ready",
      databases: health,
    };
  }
}
```

---

## Development Workflow

### Available Scripts
```bash
# Development
npm run start:dev        # Start with hot reload
npm run start:debug      # Start in debug mode
npm run start:prod       # Start in production mode

# Building
npm run build           # Build the application

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier

# Testing
npm test               # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run test:debug     # Run tests in debug mode

# Docker
npm run docker:up      # Start Docker services
npm run docker:down    # Stop Docker services
npm run docker:logs    # View Docker logs
```

### Development Environment
```bash
# 1. Start infrastructure
docker-compose up -d postgres mongo redis

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env

# 4. Start development server
npm run start:dev

# 5. Access services
# - API: http://localhost:3000/api
# - Swagger: http://localhost:3000/api/docs
# - Adminer: http://localhost:8080 (if tools profile enabled)
# - Redis Commander: http://localhost:8081 (if tools profile enabled)
```

### Code Structure Guidelines
```typescript
// Module structure
src/modules/feature-name/
├── dto/
│   ├── create-feature.dto.ts
│   ├── update-feature.dto.ts
│   └── feature-response.dto.ts
├── entities/
│   └── feature.entity.ts
├── feature.controller.ts
├── feature.service.ts
├── feature.module.ts
└── index.ts

// Service pattern
@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(FeatureEntity)
    private featureRepository: Repository<FeatureEntity>,
  ) {}

  async create(createDto: CreateFeatureDto): Promise<FeatureResponseDto> {
    // Implementation
  }
}

// Controller pattern
@ApiTags("Feature")
@Controller("features")
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Post()
  @ApiOperation({ summary: "Create feature" })
  @ApiResponse({ status: 201, type: FeatureResponseDto })
  async create(@Body() createDto: CreateFeatureDto): Promise<FeatureResponseDto> {
    return this.featureService.create(createDto);
  }
}
```

---

## Production Deployment

### Docker Production Build
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production=false
COPY . .
RUN npm run build

FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /usr/src/app/dist ./dist
RUN mkdir -p uploads && chown -R nestjs:nodejs uploads
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health/liveness', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
CMD ["node", "dist/main.js"]
```

### Production Environment Variables
```bash
# Production settings
NODE_ENV=production
PORT=3000

# Database URLs (use connection strings for production)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Security (use strong, unique secrets)
JWT_SECRET=your-production-jwt-secret-very-long-and-secure
JWT_REFRESH_SECRET=your-production-refresh-secret-different-from-access

# External services
RESEND_API_KEY=your-production-resend-api-key
REDIS_URL=redis://user:pass@host:6379

# Monitoring
LOG_LEVEL=info
HEALTH_ALERT_ENABLED=true

# CORS (specify allowed origins)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestjs-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nestjs-api
  template:
    metadata:
      labels:
        app: nestjs-api
    spec:
      containers:
      - name: api
        image: your-registry/nestjs-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        livenessProbe:
          httpGet:
            path: /api/health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/readiness
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Production Checklist
- [ ] **Environment Variables**: All secrets configured
- [ ] **Database**: Production database with backups
- [ ] **SSL/TLS**: HTTPS enabled with valid certificates
- [ ] **CORS**: Proper origin restrictions
- [ ] **Rate Limiting**: Implemented and configured
- [ ] **Monitoring**: Health checks and alerting set up
- [ ] **Logging**: Log aggregation and monitoring
- [ ] **Backups**: Regular database and file backups
- [ ] **Security**: Security headers and input validation
- [ ] **Performance**: Load testing completed
- [ ] **Documentation**: API documentation accessible

---

## Testing

### Unit Testing
```typescript
// Example service test
describe("UsersService", () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe("create", () => {
    it("should create a user successfully", async () => {
      const createUserDto = {
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        password: "password123",
      };

      const savedUser = { id: 1, ...createUserDto };
      jest.spyOn(repository, "create").mockReturnValue(savedUser as any);
      jest.spyOn(repository, "save").mockResolvedValue(savedUser as any);

      const result = await service.create(createUserDto);

      expect(result).toEqual(expect.objectContaining({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
      }));
    });
  });
});
```

### Integration Testing
```typescript
// Example controller integration test
describe("AuthController (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe("/auth/register (POST)", () => {
    it("should register a new user", () => {
      return request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          password: "password123",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user.email).toBe("test@example.com");
          expect(res.body.accessToken).toBeDefined();
        });
    });
  });
});
```

### Test Configuration
```json
{
  "scripts": {
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage --passWithNoTests",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

---

## Usage Examples

### Authentication Flow
```typescript
// 1. Register a new user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'securePassword123'
  })
});

const { user, accessToken, refreshToken } = await registerResponse.json();

// 2. Login with credentials
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123'
  })
});

// 3. Access protected resources
const protectedResponse = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

// 4. Refresh token when expired
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ refreshToken })
});
```

### File Upload Example
```typescript
// Upload single file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const uploadResponse = await fetch('/api/upload/single', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const { success, url, filename } = await uploadResponse.json();

// Upload user avatar
const avatarFormData = new FormData();
avatarFormData.append('file', avatarFile);

const avatarResponse = await fetch('/api/upload/avatar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: avatarFormData
});
```

### Email Sending Example
```typescript
// Send custom email
const emailResponse = await fetch('/api/email/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'recipient@example.com',
    subject: 'Welcome to Our Platform',
    html: '<h1>Welcome!</h1><p>Thank you for joining us.</p>',
    text: 'Welcome! Thank you for joining us.'
  })
});

// Send welcome email template
const welcomeResponse = await fetch('/api/email/welcome', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'newuser@example.com',
    userName: 'John Doe'
  })
});
```

### Health Check Monitoring
```typescript
// Basic health check
const healthResponse = await fetch('/api/health');
const health = await healthResponse.json();
// { status: "ok", timestamp: "2024-01-01T00:00:00.000Z" }

// Detailed health information
const detailedResponse = await fetch('/api/health/detailed');
const detailedHealth = await detailedResponse.json();
/*
{
  status: "healthy",
  databases: {
    postgres: { status: "healthy", details: {...} },
    mongodb: { status: "healthy", details: {...} }
  },
  system: {
    memory: { status: "healthy", usage: {...}, percentage: {...} },
    disk: { status: "healthy", usage: {...} },
    uptime: 86400,
    loadAverage: [0.5, 0.4, 0.3]
  },
  timestamp: "2024-01-01T00:00:00.000Z",
  environment: "production",
  version: "1.0.0"
}
*/
```

### Logging and Analytics
```typescript
// Get error statistics
const errorStatsResponse = await fetch('/api/logger/stats/errors', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const errorStats = await errorStatsResponse.json();

// Get performance metrics
const perfStatsResponse = await fetch('/api/logger/stats/performance', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const performanceStats = await perfStatsResponse.json();

// Get recent logs
const logsResponse = await fetch('/api/logger/logs?limit=50', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
const recentLogs = await logsResponse.json();
```

---

## Conclusion

This NestJS Enterprise Template provides a robust foundation for building production-ready APIs with:

- **Comprehensive Security**: JWT authentication, input validation, security headers
- **Advanced Logging**: Structured logging with MongoDB storage and analytics
- **Health Monitoring**: Detailed system and database health checks
- **File Management**: Secure file upload with validation and organization
- **Email Integration**: Template-based email system with Resend
- **Queue System**: Background job processing with Bull/Redis
- **Production Ready**: Docker containerization and Kubernetes support
- **Developer Friendly**: Hot reload, TypeScript, comprehensive documentation

The template follows NestJS best practices and provides a scalable architecture that can grow with your application needs.

For support and contributions, please refer to the project repository and documentation.