#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"
echo "🧪 Testing NestJS Enterprise API"
echo "================================="

# Test 1: Health Check
echo "1️⃣  Health Check..."
curl -s "$BASE_URL/health/liveness"
echo -e "\n"

# Test 2: Register User
echo "2️⃣  Register New User..."
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "testnew2@example.com","password": "Test123456!","firstName": "TestNew","lastName": "User"}'
echo -e "\n"

# Test 3: Login
echo "3️⃣  Login User..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }')
echo $LOGIN_RESPONSE
echo -e "\n"

# Extract access token (basic parsing)
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "📝 Access Token: ${ACCESS_TOKEN:0:30}..."
echo -e "\n"

# Test 4: Get Users (authenticated)
echo "4️⃣  Get Users List..."
curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
echo -e "\n"

echo "✅ Basic tests completed!"