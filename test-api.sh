#!/bin/bash

BASE_URL="http://localhost:3000/api"
echo "🧪 Testing NestJS Enterprise API"
echo "================================="

# Test 1: Health Check
echo "1️⃣  Health Check..."
curl -s "$BASE_URL/health/liveness" | jq '.'
echo ""

# Test 2: Register User
echo "2️⃣  Register New User..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "firstName": "Test",
    "lastName": "User"
  }')
echo $REGISTER_RESPONSE | jq '.'

# Extract access token
ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken // empty')
echo "📝 Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Test 3: Login
echo "3️⃣  Login User..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!"
  }')
echo $LOGIN_RESPONSE | jq '.'

# Update access token from login
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // empty')
echo ""

# Test 4: Get Profile
echo "4️⃣  Get User Profile..."
curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 5: Get Users List (requires auth)
echo "5️⃣  Get Users List..."
curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 6: Get User Stats
echo "6️⃣  Get User Statistics..."
curl -s -X GET "$BASE_URL/users/stats" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 7: Test Email (development mode - will log only)
echo "7️⃣  Test Email Service..."
curl -s -X GET "$BASE_URL/email/test-connection" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 8: Create Test Logs
echo "8️⃣  Create Test Logs..."
curl -s -X POST "$BASE_URL/logger/test" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "info",
    "message": "Test log entry from API test"
  }' | jq '.'
echo ""

# Test 9: Get Recent Logs
echo "9️⃣  Get Recent Logs..."
curl -s -X GET "$BASE_URL/logger/logs?limit=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo ""

# Test 10: Upload File
echo "🔟 Test File Upload..."
echo "Test file content" > /tmp/test.txt
curl -s -X POST "$BASE_URL/upload/single" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@/tmp/test.txt" | jq '.'
rm /tmp/test.txt
echo ""

echo "✅ All tests completed!"
echo "📊 Check your databases:"
echo "   - PostgreSQL: Users, devices, sessions"
echo "   - MongoDB: Logs in different collections"
echo "   - Redis: Token blacklist and cache"