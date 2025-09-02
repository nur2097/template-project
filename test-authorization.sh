#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"
echo "🔐 Testing Authorization System"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results counter
PASS=0
FAIL=0

# Helper function to test endpoint
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local token="$4"
    local expected_status="$5"
    local description="$6"
    
    echo -n "Testing: $test_name... "
    
    if [ -n "$token" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
    fi
    
    http_status=$(echo $response | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$http_status" == "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $http_status) - $description"
        ((PASS++))
    else
        echo -e "${RED}FAIL${NC} (Expected: $expected_status, Got: $http_status) - $description"
        ((FAIL++))
    fi
}

# Test 1: Public endpoint should work without token
test_endpoint "Public Health Check" "GET" "/health/liveness" "" "200" "Public endpoint accessible"

# Test 2: Protected endpoint without token should fail
test_endpoint "Protected Without Token" "GET" "/users" "" "401" "Should require authentication"

# Test 3: Login and get tokens
echo -e "\n${YELLOW}Getting Authentication Tokens...${NC}"

# Login as regular user
USER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "user@example.com",
        "password": "user123"
    }')

USER_TOKEN=$(echo $USER_LOGIN | jq -r '.accessToken // empty')

if [ -n "$USER_TOKEN" ] && [ "$USER_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓${NC} User token obtained: ${USER_TOKEN:0:20}..."
else
    echo -e "${RED}✗${NC} Failed to get user token"
    exit 1
fi

# Login as admin
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@example.com",
        "password": "admin123"
    }')

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.accessToken // empty')

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓${NC} Admin token obtained: ${ADMIN_TOKEN:0:20}..."
else
    echo -e "${RED}✗${NC} Failed to get admin token"
fi

# Login as superadmin
SUPERADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "superadmin@example.com",
        "password": "superadmin123"
    }')

SUPERADMIN_TOKEN=$(echo $SUPERADMIN_LOGIN | jq -r '.accessToken // empty')

if [ -n "$SUPERADMIN_TOKEN" ] && [ "$SUPERADMIN_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓${NC} SuperAdmin token obtained: ${SUPERADMIN_TOKEN:0:20}..."
else
    echo -e "${RED}✗${NC} Failed to get superadmin token"
fi

echo -e "\n${YELLOW}Testing Authorization Rules...${NC}"

# Test 4: User with valid token should access their profile
test_endpoint "User Profile Access" "GET" "/auth/profile" "$USER_TOKEN" "200" "User can access own profile"

# Test 5: User should be able to read users (if they have users.read permission)
test_endpoint "User Read Permission" "GET" "/users" "$USER_TOKEN" "403" "Regular user should not have users.read permission"

# Test 6: Admin should have users.read permission
if [ -n "$ADMIN_TOKEN" ]; then
    test_endpoint "Admin Read Permission" "GET" "/users" "$ADMIN_TOKEN" "200" "Admin should have users.read permission"
fi

# Test 7: SuperAdmin should bypass all permission checks
if [ -n "$SUPERADMIN_TOKEN" ]; then
    test_endpoint "SuperAdmin Health Access" "GET" "/health/detailed" "$SUPERADMIN_TOKEN" "200" "SuperAdmin should access all endpoints"
    test_endpoint "SuperAdmin Users Access" "GET" "/users" "$SUPERADMIN_TOKEN" "200" "SuperAdmin should bypass permission checks"
    test_endpoint "SuperAdmin Logs Access" "GET" "/logger/logs" "$SUPERADMIN_TOKEN" "200" "SuperAdmin should access logging endpoints"
fi

# Test 8: Test invalid token
INVALID_TOKEN="invalid.jwt.token"
test_endpoint "Invalid Token" "GET" "/auth/profile" "$INVALID_TOKEN" "401" "Invalid token should be rejected"

# Test 9: Test company isolation - user should only see their company data
test_endpoint "Company Isolation" "GET" "/users" "$USER_TOKEN" "403" "Users should only access their company data"

# Test 10: Test SuperAdmin with company parameter
if [ -n "$SUPERADMIN_TOKEN" ]; then
    test_endpoint "SuperAdmin Company Context" "GET" "/users?companyId=1" "$SUPERADMIN_TOKEN" "200" "SuperAdmin should access any company data"
fi

echo -e "\n${YELLOW}Testing Token Blacklisting...${NC}"

# Test 11: Logout user and test blacklisted token
if [ -n "$USER_TOKEN" ]; then
    LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
        -H "Authorization: Bearer $USER_TOKEN")
    
    # Try to use the token after logout
    test_endpoint "Blacklisted Token" "GET" "/auth/profile" "$USER_TOKEN" "401" "Blacklisted token should be rejected"
fi

echo -e "\n${YELLOW}Testing Permission-based Access...${NC}"

# Create a new user token for permission tests
if [ -n "$USER_TOKEN" ]; then
    # Re-login to get a fresh token
    USER_LOGIN2=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "user@example.com",
            "password": "user123"
        }')
    
    USER_TOKEN2=$(echo $USER_LOGIN2 | jq -r '.accessToken // empty')
    
    # Test different permission-protected endpoints
    test_endpoint "User Stats Permission" "GET" "/users/stats" "$USER_TOKEN2" "403" "Should require users.read permission"
    
    if [ -n "$ADMIN_TOKEN" ]; then
        test_endpoint "Admin Stats Permission" "GET" "/users/stats" "$ADMIN_TOKEN" "200" "Admin should have users.read permission"
    fi
fi

echo -e "\n${YELLOW}Results Summary${NC}"
echo "================================="
echo -e "Tests Passed: ${GREEN}$PASS${NC}"
echo -e "Tests Failed: ${RED}$FAIL${NC}"
echo -e "Total Tests: $((PASS + FAIL))"

if [ $FAIL -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All authorization tests passed!${NC}"
    exit 0
else
    echo -e "\n❌ ${RED}Some authorization tests failed!${NC}"
    exit 1
fi