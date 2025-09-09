# 🔐 Authentication System

The NestJS Enterprise Template implements a comprehensive, enterprise-grade authentication system with JWT tokens, refresh token rotation, device tracking, and multi-device session management.

## 🏗️ Authentication Architecture

```mermaid
graph TB
    A[Client Request] --> B{Has Access Token?}
    B -->|Yes| C[Validate JWT]
    B -->|No| D[Login Required]
    C --> E{Token Valid?}
    E -->|Yes| F[Check Blacklist]
    E -->|No| G[Token Expired]
    F --> H{In Blacklist?}
    H -->|No| I[Proceed to Resource]
    H -->|Yes| J[Token Revoked]
    G --> K[Use Refresh Token]
    J --> D
    K --> L{Refresh Valid?}
    L -->|Yes| M[Generate New Tokens]
    L -->|No| D
    M --> I
```

## 🎯 Key Features

### ✅ JWT + Refresh Token System
- **Access Tokens**: Short-lived (1 hour) for API access
- **Refresh Tokens**: Long-lived (7 days) for token renewal
- **Token Rotation**: New refresh token on each refresh
- **Automatic Cleanup**: Expired tokens are automatically removed

### ✅ Device Tracking
- **Maximum 5 Devices**: Per user account
- **Device Fingerprinting**: Browser, OS, IP tracking
- **Device Management**: Users can view and revoke devices
- **Automatic Cleanup**: Oldest device removed when limit exceeded

### ✅ Token Security
- **Blacklist System**: Revoked tokens stored in Redis
- **Secure Storage**: Tokens hashed before database storage
- **Token Binding**: Tokens tied to specific devices
- **Expiration Management**: Automatic token cleanup

## 🔑 Token Structure

### Access Token (JWT)
```json
{
  "sub": 123,                    // User ID
  "email": "user@example.com",   // User email
  "companyId": 1,                // Company ID (multi-tenant)
  "systemRole": "USER",          // System-wide role
  "deviceId": "dev_abc123",      // Device identifier
  "iat": 1635724800,             // Issued at
  "exp": 1635728400              // Expires at
}
```

### Refresh Token
```json
{
  "id": "rt_xyz789",             // Refresh token ID
  "userId": 123,                 // User ID
  "deviceId": "dev_abc123",      // Device identifier
  "expiresAt": "2024-12-01T00:00:00Z"
}
```

## 🚪 Authentication Endpoints

### Register New User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "fullName": "John Doe",
    "systemRole": "USER",
    "companyId": 1
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "rt_xyz789abc...",
  "deviceId": "dev_abc123"
}
```

### User Login
```http
POST /api/v1/auth/login
Content-Type: application/json
User-Agent: MyApp/1.0 (iOS; iPhone)

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

### Refresh Access Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "rt_xyz789abc..."
}
```

### Get User Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Logout Current Device
```http
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Logout All Devices
```http
POST /api/v1/auth/logout-all
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Logout Other Devices
```http
POST /api/v1/auth/logout-other-devices
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## 📱 Device Management

### Get Active Devices
```http
GET /api/v1/auth/devices
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "devices": [
    {
      "id": "dev_abc123",
      "deviceType": "mobile",
      "deviceName": "iPhone 13",
      "browser": "Safari",
      "os": "iOS 15.0",
      "ip": "192.168.1.100",
      "lastAccessAt": "2024-01-15T10:30:00Z",
      "isCurrentDevice": true
    },
    {
      "id": "dev_def456",
      "deviceType": "desktop",
      "deviceName": "Chrome on Windows",
      "browser": "Chrome",
      "os": "Windows 10",
      "ip": "192.168.1.101",
      "lastAccessAt": "2024-01-14T15:45:00Z",
      "isCurrentDevice": false
    }
  ],
  "totalDevices": 2,
  "maxDevices": 5
}
```

### Revoke Specific Device
```http
POST /api/v1/auth/revoke-device
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "deviceId": "dev_def456"
}
```

## 🔒 Password Management

### Forgot Password
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Reset Password
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "newPassword": "NewSecurePassword123"
}
```

### Change Password (Authenticated)
```http
POST /api/v1/auth/change-password
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewSecurePassword123"
}
```

## 🛡️ Security Implementation

### JWT Strategy
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigurationService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Check if token is blacklisted
    const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(
      payload.jti
    );
    
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: payload.sub,
      email: payload.email,
      companyId: payload.companyId,
      systemRole: payload.systemRole,
      deviceId: payload.deviceId,
    };
  }
}
```

### Device Tracking Service
```typescript
@Injectable()
export class DeviceService {
  constructor(private prisma: PrismaService) {}

  async trackDevice(
    userId: number,
    companyId: number,
    request: Request,
  ): Promise<Device> {
    const deviceFingerprint = this.generateDeviceFingerprint(request);
    
    // Check if device exists
    let device = await this.findDeviceByFingerprint(
      userId,
      deviceFingerprint
    );

    if (!device) {
      device = await this.createNewDevice(
        userId,
        companyId,
        deviceFingerprint,
        request
      );
    } else {
      device = await this.updateDeviceAccess(device.id);
    }

    await this.enforceDeviceLimit(userId);
    return device;
  }

  private async enforceDeviceLimit(userId: number): Promise<void> {
    const devices = await this.getUserDevices(userId);
    
    if (devices.length > MAX_DEVICES_PER_USER) {
      // Remove oldest device(s)
      const devicesToRemove = devices
        .sort((a, b) => a.lastAccessAt.getTime() - b.lastAccessAt.getTime())
        .slice(0, devices.length - MAX_DEVICES_PER_USER);
      
      for (const device of devicesToRemove) {
        await this.revokeDevice(device.id);
      }
    }
  }
}
```

### Token Blacklist Service
```typescript
@Injectable()
export class TokenBlacklistService {
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  async blacklistToken(jti: string, expiresAt: Date): Promise<void> {
    const ttl = Math.max(0, expiresAt.getTime() - Date.now());
    await this.redis.setex(`blacklist:${jti}`, Math.ceil(ttl / 1000), '1');
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.get(`blacklist:${jti}`);
    return result === '1';
  }

  async blacklistAllUserTokens(userId: number): Promise<void> {
    // Blacklist all active refresh tokens for the user
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    const promises = refreshTokens.map(token =>
      this.blacklistToken(token.id, token.expiresAt)
    );

    await Promise.all(promises);
  }
}
```

## 🔐 Guards and Decorators

### JWT Guard
```typescript
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
```

### Current User Decorator
```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Usage in controllers
@Get('profile')
@UseGuards(JwtGuard)
async getProfile(@CurrentUser() user: AuthenticatedUser) {
  return this.userService.findById(user.id);
}
```

## 🧪 Testing Authentication

### Test Script
```bash
#!/bin/bash

API_BASE="http://localhost:3000/api/v1"

echo "🔐 Testing Authentication Flow"

# 1. Register new user
echo "1. Registering new user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "password": "Test123456"
  }')

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.refreshToken')

echo "✅ User registered. Access token: ${ACCESS_TOKEN:0:20}..."

# 2. Access protected endpoint
echo "2. Accessing protected endpoint..."
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$API_BASE/auth/profile" | jq

# 3. Refresh token
echo "3. Refreshing access token..."
REFRESH_RESPONSE=$(curl -s -X POST "$API_BASE/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.accessToken')
echo "✅ Token refreshed. New token: ${NEW_ACCESS_TOKEN:0:20}..."

# 4. Get active devices
echo "4. Getting active devices..."
curl -s -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  "$API_BASE/auth/devices" | jq

# 5. Logout
echo "5. Logging out..."
curl -s -X POST -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  "$API_BASE/auth/logout"

echo "✅ Authentication flow test completed!"
```

## 📊 Security Metrics

### Token Security
- **Access Token TTL**: 1 hour (configurable)
- **Refresh Token TTL**: 7 days (configurable)
- **Max Devices per User**: 5 (configurable)
- **Token Rotation**: Yes (new refresh token on each refresh)
- **Blacklist Storage**: Redis with automatic expiration

### Password Security
- **Minimum Length**: 8 characters
- **Complexity**: Letters, numbers, special characters
- **Hashing**: bcrypt with salt rounds (12)
- **Password Reset**: Secure token-based reset

## 🔧 Configuration

### Environment Variables
```env
# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Device Management
MAX_DEVICES_PER_USER=5
DEVICE_CLEANUP_INTERVAL="24h"

# Token Security
TOKEN_BLACKLIST_CLEANUP_INTERVAL="1h"
PASSWORD_RESET_TOKEN_EXPIRES_IN="1h"
```

### Module Configuration
```typescript
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: config.jwtExpiresIn,
        },
      }),
    }),
  ],
  // ...
})
export class AuthModule {}
```

---

## 🔗 Related Documentation

- [[Authorization & RBAC]] - Role-based access control
- [[Security Features]] - Additional security measures
- [[API Endpoints]] - Complete API reference
- [[Best Practices]] - Security best practices