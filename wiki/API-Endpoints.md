# 📖 API Endpoints

Complete API reference for the NestJS Enterprise Template. All endpoints are versioned under `/api/v1/` and follow RESTful conventions.

## 🔗 Base URL

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://your-api-domain.com/api/v1`
- **API Documentation**: `http://localhost:3000/api/docs` (Swagger UI)

## 📋 Response Format

### Standard Success Response
```json
{
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "correlationId": "req_abc123",
    "version": "1.0.0"
  }
}
```

### Paginated Response
```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "pages": 15
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "correlationId": "req_abc123"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "correlationId": "req_abc123"
  }
}
```

## 🔐 Authentication Endpoints

### Register New User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123"
}
```

**Response (201):**
```json
{
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "fullName": "John Doe",
      "systemRole": "USER",
      "companyId": 1,
      "emailVerified": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "rt_xyz789abc...",
    "deviceId": "dev_abc123"
  }
}
```

### User Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "fullName": "John Doe",
      "systemRole": "USER",
      "lastLoginAt": "2024-01-15T10:30:00Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "rt_xyz789abc...",
    "deviceId": "dev_abc123"
  }
}
```

### Refresh Access Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "rt_xyz789abc..."
}
```

**Response (200):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "rt_new789xyz...",
    "expiresIn": 3600
  }
}
```

### Get User Profile
```http
GET /auth/profile
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "data": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "phoneNumber": "+1234567890",
    "systemRole": "USER",
    "emailVerified": true,
    "emailVerifiedAt": "2024-01-10T15:20:00Z",
    "lastLoginAt": "2024-01-15T10:30:00Z",
    "company": {
      "id": 1,
      "name": "Acme Corp",
      "slug": "acme-corp"
    },
    "roles": [
      {
        "id": 2,
        "name": "Editor",
        "permissions": ["users:read", "users:write"]
      }
    ]
  }
}
```

### Device Management
```http
# Get Active Devices
GET /auth/devices
Authorization: Bearer {accessToken}

# Revoke Device
POST /auth/revoke-device
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "deviceId": "dev_xyz456"
}
```

### Logout Operations
```http
# Logout Current Device
POST /auth/logout
Authorization: Bearer {accessToken}

# Logout All Devices
POST /auth/logout-all
Authorization: Bearer {accessToken}

# Logout Other Devices
POST /auth/logout-other-devices
Authorization: Bearer {accessToken}
```

### Password Management
```http
# Forgot Password
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

# Reset Password
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "newPassword": "NewSecurePassword123"
}

# Change Password (Authenticated)
POST /auth/change-password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewSecurePassword123"
}
```

## 👥 User Management Endpoints

### List Users (Paginated)
```http
GET /users?page=1&limit=10&search=john&role=admin&status=active
Authorization: Bearer {accessToken}
X-Required-Permission: users:read
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 123,
      "email": "john@example.com",
      "fullName": "John Doe",
      "systemRole": "USER",
      "status": "ACTIVE",
      "emailVerified": true,
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "roles": [
        {
          "id": 2,
          "name": "Editor"
        }
      ]
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### Get User by ID
```http
GET /users/{id}
Authorization: Bearer {accessToken}
X-Required-Permission: users:read
```

### Create New User
```http
POST /users
Authorization: Bearer {accessToken}
X-Required-Permission: users:create
Content-Type: application/json

{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "SecurePassword123",
  "systemRole": "USER",
  "roleIds": [2, 3]
}
```

### Update User
```http
PUT /users/{id}
Authorization: Bearer {accessToken}
X-Required-Permission: users:update
Content-Type: application/json

{
  "firstName": "Jane Updated",
  "lastName": "Smith Updated",
  "phoneNumber": "+1234567890",
  "roleIds": [2]
}
```

### Delete User (Soft Delete)
```http
DELETE /users/{id}
Authorization: Bearer {accessToken}
X-Required-Permission: users:delete
```

### User Statistics
```http
GET /users/stats
Authorization: Bearer {accessToken}
X-Required-Permission: users:read
```

**Response (200):**
```json
{
  "data": {
    "totalUsers": 150,
    "activeUsers": 145,
    "inactiveUsers": 3,
    "suspendedUsers": 2,
    "verifiedUsers": 140,
    "unverifiedUsers": 10,
    "recentRegistrations": 5,
    "usersByRole": {
      "USER": 120,
      "MODERATOR": 25,
      "ADMIN": 5
    }
  }
}
```

## 🏢 Company Management Endpoints

### Get Company Profile
```http
GET /companies/profile
Authorization: Bearer {accessToken}
```

### Update Company
```http
PUT /companies/{id}
Authorization: Bearer {accessToken}
X-Required-Permission: companies:update
Content-Type: application/json

{
  "name": "Updated Company Name",
  "domain": "newdomain.com",
  "settings": {
    "theme": "dark",
    "timezone": "UTC"
  }
}
```

### Company Statistics
```http
GET /companies/stats
Authorization: Bearer {accessToken}
X-Required-Permission: companies:read
```

## 👑 Role & Permission Management

### List Roles
```http
GET /roles?page=1&limit=10
Authorization: Bearer {accessToken}
X-Required-Permission: roles:read
```

### Create Role
```http
POST /roles
Authorization: Bearer {accessToken}
X-Required-Permission: roles:create
Content-Type: application/json

{
  "name": "Content Manager",
  "description": "Manages content and posts",
  "permissionIds": [1, 2, 3, 5]
}
```

### Update Role
```http
PUT /roles/{id}
Authorization: Bearer {accessToken}
X-Required-Permission: roles:update
Content-Type: application/json

{
  "name": "Senior Content Manager",
  "description": "Senior level content management",
  "permissionIds": [1, 2, 3, 4, 5, 6]
}
```

### List Permissions
```http
GET /permissions?resource=users&action=read
Authorization: Bearer {accessToken}
X-Required-Permission: permissions:read
```

### Create Permission
```http
POST /permissions
Authorization: Bearer {accessToken}
X-Required-Permission: permissions:create
Content-Type: application/json

{
  "name": "posts:publish",
  "description": "Publish blog posts",
  "resource": "posts",
  "action": "publish"
}
```

## 🏥 Health & Monitoring Endpoints

### Basic Health Check
```http
GET /health
Authorization: Bearer {accessToken} (SuperAdmin only)
```

**Response (200):**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "responseTime": 45
    },
    "redis": {
      "status": "up",
      "responseTime": 12
    },
    "mongodb": {
      "status": "up",
      "responseTime": 23
    }
  }
}
```

### Detailed Health Check
```http
GET /health/detailed
Authorization: Bearer {accessToken} (SuperAdmin only)
```

### Database Health
```http
GET /health/database
GET /health/memory
GET /health/disk
GET /health/redis
```

### Kubernetes Probes
```http
GET /health/liveness    # Liveness probe
GET /health/readiness   # Readiness probe
```

### Application Metrics
```http
GET /health/metrics
Authorization: Bearer {accessToken} (SuperAdmin only)
```

**Response (200):**
```json
{
  "data": {
    "uptime": 86400,
    "memoryUsage": {
      "rss": 125829120,
      "heapTotal": 83886080,
      "heapUsed": 67108864
    },
    "cpuUsage": {
      "user": 12500,
      "system": 2500
    },
    "requests": {
      "total": 15420,
      "avgResponseTime": 145,
      "errorsLast24h": 23
    },
    "database": {
      "connections": 15,
      "queries": 8540,
      "avgQueryTime": 67
    }
  }
}
```

## 📊 Logging Endpoints

### Get Logs
```http
GET /logger/logs?level=info&limit=50&page=1
Authorization: Bearer {accessToken} (SuperAdmin only)
```

### Request/Response Logs
```http
GET /logger/request-logs?method=POST&url=/auth/login
GET /logger/response-logs?statusCode=500
```

### Error Logs
```http
GET /logger/error-logs?hours=24
Authorization: Bearer {accessToken} (SuperAdmin only)
```

### Performance Logs
```http
GET /logger/performance-logs?operation=database_query&minDuration=100
```

### Log Statistics
```http
GET /logger/stats/errors?hours=24
GET /logger/stats/performance
GET /logger/stats/summary
```

**Error Stats Response:**
```json
{
  "data": {
    "totalErrors": 45,
    "errorsByLevel": {
      "error": 30,
      "warn": 15
    },
    "errorsByHour": [
      { "hour": "2024-01-15T09:00:00Z", "count": 5 },
      { "hour": "2024-01-15T10:00:00Z", "count": 12 }
    ],
    "topErrors": [
      {
        "message": "Database connection timeout",
        "count": 8
      }
    ]
  }
}
```

## 📤 File Upload Endpoints

### Upload Single File
```http
POST /upload/single
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

file: [binary data]
```

### Upload Multiple Files
```http
POST /upload/multiple
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

files: [binary data array]
```

### Get File Info
```http
GET /upload/info/{fileId}
Authorization: Bearer {accessToken}
```

## 📧 Email Endpoints

### Send Test Email
```http
POST /email/test
Authorization: Bearer {accessToken}
X-Required-Permission: system:test
Content-Type: application/json

{
  "to": "test@example.com",
  "subject": "Test Email",
  "template": "welcome"
}
```

## 🔒 Security Testing Endpoints

### Rate Limit Test
```http
GET /security/rate-limit-test
Authorization: Bearer {accessToken} (SuperAdmin only)
```

### CSRF Token
```http
GET /security/csrf-token
Authorization: Bearer {accessToken}
```

## 📚 Query Parameters

### Common Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | integer | Page number | 1 |
| `limit` | integer | Items per page (max 100) | 10 |
| `search` | string | Search query | - |
| `sortBy` | string | Sort field | id |
| `sortOrder` | string | Sort order (asc/desc) | desc |
| `filter` | string | JSON filter object | - |

### User Endpoints Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role |
| `status` | string | Filter by status (active/inactive/suspended) |
| `verified` | boolean | Filter by email verification |
| `company` | integer | Filter by company ID (SuperAdmin only) |

### Log Endpoints Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `level` | string | Log level (error/warn/info/debug) |
| `hours` | integer | Hours back to search |
| `method` | string | HTTP method |
| `statusCode` | integer | HTTP status code |
| `userId` | integer | Filter by user ID |

## 🔐 Permission Requirements

### Endpoint Permissions

| Endpoint Pattern | Required Permission |
|------------------|-------------------|
| `GET /users` | `users:read` |
| `POST /users` | `users:create` |
| `PUT /users/{id}` | `users:update` |
| `DELETE /users/{id}` | `users:delete` |
| `GET /roles` | `roles:read` |
| `POST /roles` | `roles:create` |
| `GET /health/*` | `system:health` (SuperAdmin only) |
| `GET /logger/*` | `system:logs` (SuperAdmin only) |

### System Roles

| Role | Description | Default Permissions |
|------|-------------|-------------------|
| `SUPERADMIN` | System administrator | All permissions |
| `ADMIN` | Company administrator | Most permissions |
| `MODERATOR` | Content moderator | Limited permissions |
| `USER` | Regular user | Basic permissions |

---

## 🔗 Related Documentation

- [[Authentication System]] - Detailed auth implementation
- [[Authorization & RBAC]] - Permission system
- [[Testing Guide]] - API testing strategies
- [[Getting Started]] - Setup and basic usage