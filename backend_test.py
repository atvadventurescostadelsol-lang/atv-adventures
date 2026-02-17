#!/usr/bin/env python3

import requests
import json
import sys
import time
from typing import Dict, Any

# Configuration
BASE_URL = "https://tour-expense-split.preview.emergentagent.com/api"
ADMIN_USER = "Zorrouad"
ADMIN_PASS = "25592776"
TEST_USER = "Jesus"
TEST_USER_PASS = "GECA2023"

class AuthTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = {
            "passed": [],
            "failed": [],
            "total_tests": 0
        }

    def log_result(self, test_name: str, success: bool, message: str = "", details: Dict = None):
        """Log test result"""
        self.results["total_tests"] += 1
        if success:
            self.results["passed"].append(test_name)
            print(f"✅ {test_name}: {message}")
        else:
            self.results["failed"].append(test_name)
            print(f"❌ {test_name}: {message}")
        
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """Make HTTP request and return response"""
        url = f"{BASE_URL}/{endpoint}"
        try:
            if method.upper() == "GET":
                response = self.session.get(url, params=params, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, params=params, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            try:
                return {
                    "status_code": response.status_code,
                    "data": response.json(),
                    "success": True
                }
            except json.JSONDecodeError:
                return {
                    "status_code": response.status_code,
                    "data": {"text": response.text},
                    "success": True
                }
        except requests.exceptions.RequestException as e:
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "success": False
            }

    def test_admin_login(self):
        """Test admin login with correct credentials"""
        print("🔐 Testing Admin Login...")
        
        response = self.make_request("POST", "auth/login", {
            "username": ADMIN_USER,
            "password": ADMIN_PASS
        })
        
        if not response["success"]:
            self.log_result("Admin Login", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("success") and data.get("user", {}).get("role") == "admin":
                self.log_result("Admin Login", True, f"Successfully logged in as {ADMIN_USER} with admin role")
                return True
            else:
                self.log_result("Admin Login", False, f"Login response invalid", data)
                return False
        else:
            self.log_result("Admin Login", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_user_login(self):
        """Test user login with correct credentials"""
        print("🔐 Testing User Login...")
        
        response = self.make_request("POST", "auth/login", {
            "username": TEST_USER,
            "password": TEST_USER_PASS
        })
        
        if not response["success"]:
            self.log_result("User Login", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("success") and data.get("user", {}).get("role") == "user":
                self.log_result("User Login", True, f"Successfully logged in as {TEST_USER} with user role")
                return True
            else:
                self.log_result("User Login", False, f"Login response invalid", data)
                return False
        else:
            self.log_result("User Login", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        print("🔐 Testing Invalid Login...")
        
        response = self.make_request("POST", "auth/login", {
            "username": "invalid_user",
            "password": "wrong_password"
        })
        
        if not response["success"]:
            self.log_result("Invalid Login Rejection", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 401:
            data = response["data"]
            if not data.get("success", True):
                self.log_result("Invalid Login Rejection", True, "Correctly rejected invalid credentials with 401")
                return True
            else:
                self.log_result("Invalid Login Rejection", False, "Should have rejected invalid credentials", data)
                return False
        else:
            self.log_result("Invalid Login Rejection", False, f"Expected 401, got {response['status_code']}", response["data"])
            return False

    def test_change_password_success(self):
        """Test successful password change"""
        print("🔑 Testing Password Change (Success)...")
        
        # Change password
        response = self.make_request("POST", "auth/change-password", {
            "userId": TEST_USER,
            "currentPassword": TEST_USER_PASS,
            "newPassword": "TEST123"
        })
        
        if not response["success"]:
            self.log_result("Password Change Success", False, f"Request failed: {response['data']['error']}")
            return False
        
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("success"):
                # Verify new password works
                login_response = self.make_request("POST", "auth/login", {
                    "username": TEST_USER,
                    "password": "TEST123"
                })
                
                if login_response["status_code"] == 200 and login_response["data"].get("success"):
                    self.log_result("Password Change Success", True, f"Password changed successfully for {TEST_USER}")
                    return True
                else:
                    self.log_result("Password Change Success", False, "Password change succeeded but new password doesn't work")
                    return False
            else:
                self.log_result("Password Change Success", False, "Password change failed", data)
                return False
        else:
            self.log_result("Password Change Success", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_change_password_wrong_current(self):
        """Test password change with wrong current password"""
        print("🔑 Testing Password Change (Wrong Current Password)...")
        
        response = self.make_request("POST", "auth/change-password", {
            "userId": TEST_USER,
            "currentPassword": "wrong_password",
            "newPassword": "NEW123"
        })
        
        if not response["success"]:
            self.log_result("Password Change Wrong Current", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 401:
            data = response["data"]
            if not data.get("success", True):
                self.log_result("Password Change Wrong Current", True, "Correctly rejected wrong current password with 401")
                return True
            else:
                self.log_result("Password Change Wrong Current", False, "Should have rejected wrong current password", data)
                return False
        else:
            self.log_result("Password Change Wrong Current", False, f"Expected 401, got {response['status_code']}", response["data"])
            return False

    def test_get_users_list(self):
        """Test getting users list"""
        print("👥 Testing Get Users List...")
        
        response = self.make_request("GET", "users")
        
        if not response["success"]:
            self.log_result("Get Users List", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if isinstance(data, list) and len(data) > 0:
                # Check that passwords are not included
                has_password = any("password" in user for user in data if isinstance(user, dict))
                if not has_password:
                    required_fields = ["username", "role", "createdAt"]
                    first_user = data[0]
                    has_required = all(field in first_user for field in required_fields)
                    if has_required:
                        self.log_result("Get Users List", True, f"Retrieved {len(data)} users without passwords")
                        return True
                    else:
                        self.log_result("Get Users List", False, "Users missing required fields", first_user)
                        return False
                else:
                    self.log_result("Get Users List", False, "Users list contains password field (security issue)")
                    return False
            else:
                self.log_result("Get Users List", False, "Empty or invalid users list", data)
                return False
        else:
            self.log_result("Get Users List", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_create_new_user(self):
        """Test creating a new user"""
        print("👤 Testing Create New User...")
        
        response = self.make_request("POST", "users", {
            "username": "TestUser",
            "password": "test123",
            "role": "user",
            "adminUser": ADMIN_USER
        })
        
        if not response["success"]:
            self.log_result("Create New User", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("success") and data.get("user", {}).get("username") == "TestUser":
                self.log_result("Create New User", True, f"Successfully created user TestUser")
                return True
            else:
                self.log_result("Create New User", False, "User creation failed or invalid response", data)
                return False
        else:
            self.log_result("Create New User", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_delete_user(self):
        """Test deleting a user"""
        print("🗑️ Testing Delete User...")
        
        response = self.make_request("DELETE", "users/TestUser", params={
            "adminUser": ADMIN_USER
        })
        
        if not response["success"]:
            self.log_result("Delete User", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("success"):
                self.log_result("Delete User", True, "Successfully deleted TestUser")
                return True
            else:
                self.log_result("Delete User", False, "User deletion failed", data)
                return False
        else:
            self.log_result("Delete User", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_admin_reset_password(self):
        """Test admin resetting user password"""
        print("🔧 Testing Admin Reset Password...")
        
        # Reset password back to original
        response = self.make_request("POST", "users/reset-password", {
            "username": TEST_USER,
            "newPassword": TEST_USER_PASS,
            "adminUser": ADMIN_USER
        })
        
        if not response["success"]:
            self.log_result("Admin Reset Password", False, f"Request failed: {response['data']['error']}")
            return False
        
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("success"):
                # Verify reset password works
                login_response = self.make_request("POST", "auth/login", {
                    "username": TEST_USER,
                    "password": TEST_USER_PASS
                })
                
                if login_response["status_code"] == 200 and login_response["data"].get("success"):
                    self.log_result("Admin Reset Password", True, f"Admin successfully reset {TEST_USER} password")
                    return True
                else:
                    self.log_result("Admin Reset Password", False, "Password reset succeeded but new password doesn't work")
                    return False
            else:
                self.log_result("Admin Reset Password", False, "Password reset failed", data)
                return False
        else:
            self.log_result("Admin Reset Password", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_existing_endpoints(self):
        """Test that existing endpoints still work"""
        print("🔄 Testing Existing Endpoints...")
        
        # Test products endpoint
        response = self.make_request("GET", "products")
        if response["success"] and response["status_code"] == 200:
            self.log_result("GET /api/products", True, "Products endpoint working correctly")
        else:
            self.log_result("GET /api/products", False, f"Status: {response['status_code']}", response.get("data"))
        
        # Test dashboard endpoint
        response = self.make_request("GET", "dashboard")
        if response["success"] and response["status_code"] == 200:
            data = response["data"]
            if "stats" in data and "departures" in data:
                self.log_result("GET /api/dashboard", True, "Dashboard endpoint working correctly")
            else:
                self.log_result("GET /api/dashboard", False, "Dashboard missing expected fields", data)
        else:
            self.log_result("GET /api/dashboard", False, f"Status: {response['status_code']}", response.get("data"))

    def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 Starting Authentication System Tests")
        print("=" * 60)
        
        # Initialize users sheet if needed
        init_response = self.make_request("GET", "init-users")
        if init_response["success"]:
            print(f"📊 Users sheet initialization: {init_response['data'].get('message', 'Done')}")
        
        print()
        
        # Run authentication tests
        self.test_admin_login()
        self.test_user_login()
        self.test_invalid_login()
        
        # Run password management tests
        self.test_change_password_success()
        self.test_change_password_wrong_current()
        self.test_admin_reset_password()
        
        # Run user management tests  
        self.test_get_users_list()
        self.test_create_new_user()
        self.test_delete_user()
        
        # Test existing functionality still works
        self.test_existing_endpoints()
        
        # Summary
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        passed = len(self.results["passed"])
        failed = len(self.results["failed"])
        total = self.results["total_tests"]
        
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {failed}/{total}")
        print(f"📊 Success Rate: {(passed/total)*100:.1f}%")
        
        if failed > 0:
            print("\n❌ Failed Tests:")
            for test in self.results["failed"]:
                print(f"   - {test}")
        
        return failed == 0

if __name__ == "__main__":
    tester = AuthTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)