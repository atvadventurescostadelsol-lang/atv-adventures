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

    # ==================== EXPENSES TESTS ====================
    
    def test_get_expense_categories_initialization(self):
        """Test GET /api/expense-categories returns default categories"""
        print("💰 Testing Expense Categories Initialization...")
        
        response = self.make_request("GET", "expense-categories")
        
        if not response["success"]:
            self.log_result("GET /api/expense-categories", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if isinstance(data, list):
                # Should have default categories for both GE and E&S accounts
                ge_categories = [cat for cat in data if cat.get("account") == "GE"]
                es_categories = [cat for cat in data if cat.get("account") == "E&S"]
                
                expected_names = ["Gasolina", "Alimentación", "Guía", "Mantenimiento", "Otros"]
                ge_names = [cat.get("name") for cat in ge_categories]
                es_names = [cat.get("name") for cat in es_categories]
                
                if len(ge_categories) >= 5 and len(es_categories) >= 5:
                    if all(name in ge_names for name in expected_names) and all(name in es_names for name in expected_names):
                        self.log_result("GET /api/expense-categories", True, f"Retrieved {len(data)} categories with defaults for both accounts")
                        return True
                    else:
                        self.log_result("GET /api/expense-categories", False, "Missing expected default categories", {"ge": ge_names, "es": es_names})
                        return False
                else:
                    self.log_result("GET /api/expense-categories", False, f"Insufficient categories: GE={len(ge_categories)}, E&S={len(es_categories)}")
                    return False
            else:
                self.log_result("GET /api/expense-categories", False, "Invalid response format", data)
                return False
        else:
            self.log_result("GET /api/expense-categories", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_create_expense_category(self):
        """Test POST /api/expense-categories"""
        print("💰 Testing Create Expense Category...")
        
        response = self.make_request("POST", "expense-categories", {
            "name": "Test Category",
            "account": "GE"
        })
        
        if not response["success"]:
            self.log_result("POST /api/expense-categories", False, f"Request failed: {response['data']['error']}")
            return None
            
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("success") and data.get("category", {}).get("name") == "Test Category":
                self.log_result("POST /api/expense-categories", True, "Successfully created Test Category for GE account")
                return data["category"]["id"]
            else:
                self.log_result("POST /api/expense-categories", False, "Category creation failed", data)
                return None
        else:
            self.log_result("POST /api/expense-categories", False, f"Expected 200, got {response['status_code']}", response["data"])
            return None

    def test_create_expense_category_duplicate(self):
        """Test POST /api/expense-categories with duplicate name"""
        print("💰 Testing Create Duplicate Category...")
        
        response = self.make_request("POST", "expense-categories", {
            "name": "Gasolina",  # This should already exist
            "account": "GE"
        })
        
        if not response["success"]:
            self.log_result("POST /api/expense-categories (duplicate)", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 400:
            data = response["data"]
            if not data.get("success", True) and "already exists" in data.get("error", "").lower():
                self.log_result("POST /api/expense-categories (duplicate)", True, "Correctly rejected duplicate category")
                return True
            else:
                self.log_result("POST /api/expense-categories (duplicate)", False, "Should reject duplicate category", data)
                return False
        else:
            self.log_result("POST /api/expense-categories (duplicate)", False, f"Expected 400, got {response['status_code']}", response["data"])
            return False

    def test_create_expense_category_invalid_account(self):
        """Test POST /api/expense-categories with invalid account"""
        print("💰 Testing Create Category Invalid Account...")
        
        response = self.make_request("POST", "expense-categories", {
            "name": "Invalid Account Category",
            "account": "INVALID"
        })
        
        if not response["success"]:
            self.log_result("POST /api/expense-categories (invalid account)", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 400:
            data = response["data"]
            if not data.get("success", True) and "invalid account" in data.get("error", "").lower():
                self.log_result("POST /api/expense-categories (invalid account)", True, "Correctly rejected invalid account")
                return True
            else:
                self.log_result("POST /api/expense-categories (invalid account)", False, "Should reject invalid account", data)
                return False
        else:
            self.log_result("POST /api/expense-categories (invalid account)", False, f"Expected 400, got {response['status_code']}", response["data"])
            return False

    def test_create_expense(self):
        """Test POST /api/expenses"""
        print("💰 Testing Create Expense...")
        
        expense_data = {
            "date": "2026-02-17",
            "amount": 25.50,
            "concept": "Gasolina",
            "account": "GE",
            "notes": "Test expense for fuel",
            "userId": "testuser"
        }
        
        response = self.make_request("POST", "expenses", expense_data)
        
        if not response["success"]:
            self.log_result("POST /api/expenses", False, f"Request failed: {response['data']['error']}")
            return None
            
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("success") and data.get("expense"):
                expense = data["expense"]
                if (expense.get("amount") == "25.50" and 
                    expense.get("concept") == "Gasolina" and 
                    expense.get("account") == "GE"):
                    self.log_result("POST /api/expenses", True, f"Successfully created expense with ID: {expense['id']}")
                    return expense["id"]
                else:
                    self.log_result("POST /api/expenses", False, "Expense data mismatch", expense)
                    return None
            else:
                self.log_result("POST /api/expenses", False, "Expense creation failed", data)
                return None
        else:
            self.log_result("POST /api/expenses", False, f"Expected 200, got {response['status_code']}", response["data"])
            return None

    def test_create_expense_missing_fields(self):
        """Test POST /api/expenses with missing required fields"""
        print("💰 Testing Create Expense Missing Fields...")
        
        response = self.make_request("POST", "expenses", {
            "date": "2026-02-17",
            "amount": 25.50
            # Missing concept and account
        })
        
        if not response["success"]:
            self.log_result("POST /api/expenses (missing fields)", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 400:
            data = response["data"]
            if not data.get("success", True) and "missing required fields" in data.get("error", "").lower():
                self.log_result("POST /api/expenses (missing fields)", True, "Correctly rejected missing fields")
                return True
            else:
                self.log_result("POST /api/expenses (missing fields)", False, "Should reject missing fields", data)
                return False
        else:
            self.log_result("POST /api/expenses (missing fields)", False, f"Expected 400, got {response['status_code']}", response["data"])
            return False

    def test_create_expense_invalid_account(self):
        """Test POST /api/expenses with invalid account"""
        print("💰 Testing Create Expense Invalid Account...")
        
        response = self.make_request("POST", "expenses", {
            "date": "2026-02-17",
            "amount": 25.50,
            "concept": "Test",
            "account": "INVALID"
        })
        
        if not response["success"]:
            self.log_result("POST /api/expenses (invalid account)", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 400:
            data = response["data"]
            if not data.get("success", True) and "invalid account" in data.get("error", "").lower():
                self.log_result("POST /api/expenses (invalid account)", True, "Correctly rejected invalid account")
                return True
            else:
                self.log_result("POST /api/expenses (invalid account)", False, "Should reject invalid account", data)
                return False
        else:
            self.log_result("POST /api/expenses (invalid account)", False, f"Expected 400, got {response['status_code']}", response["data"])
            return False

    def test_get_expenses_all(self):
        """Test GET /api/expenses"""
        print("💰 Testing Get All Expenses...")
        
        response = self.make_request("GET", "expenses")
        
        if not response["success"]:
            self.log_result("GET /api/expenses", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if isinstance(data, list):
                # Should have at least the expense we created
                if len(data) > 0:
                    first_expense = data[0]
                    required_fields = ["id", "date", "amount", "concept", "account"]
                    if all(field in first_expense for field in required_fields):
                        self.log_result("GET /api/expenses", True, f"Retrieved {len(data)} expenses with correct structure")
                        return True
                    else:
                        self.log_result("GET /api/expenses", False, "Expenses missing required fields", first_expense)
                        return False
                else:
                    self.log_result("GET /api/expenses", True, "Retrieved empty expenses list (expected initially)")
                    return True
            else:
                self.log_result("GET /api/expenses", False, "Invalid response format", data)
                return False
        else:
            self.log_result("GET /api/expenses", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_get_expenses_filtered_by_account(self):
        """Test GET /api/expenses?account=GE"""
        print("💰 Testing Get Expenses Filtered by Account...")
        
        response = self.make_request("GET", "expenses", params={"account": "GE"})
        
        if not response["success"]:
            self.log_result("GET /api/expenses (filtered)", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if isinstance(data, list):
                # All returned expenses should be for GE account
                ge_expenses = [exp for exp in data if exp.get("account") == "GE"]
                if len(data) == len(ge_expenses):
                    self.log_result("GET /api/expenses (filtered)", True, f"Correctly filtered {len(data)} GE expenses")
                    return True
                else:
                    self.log_result("GET /api/expenses (filtered)", False, f"Filter failed: {len(data)} total, {len(ge_expenses)} GE")
                    return False
            else:
                self.log_result("GET /api/expenses (filtered)", False, "Invalid response format", data)
                return False
        else:
            self.log_result("GET /api/expenses (filtered)", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_get_expenses_filtered_by_date_range(self):
        """Test GET /api/expenses?startDate=2026-02-01&endDate=2026-02-28"""
        print("💰 Testing Get Expenses Filtered by Date Range...")
        
        response = self.make_request("GET", "expenses", params={
            "startDate": "2026-02-01",
            "endDate": "2026-02-28"
        })
        
        if not response["success"]:
            self.log_result("GET /api/expenses (date filtered)", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if isinstance(data, list):
                # All returned expenses should be within date range
                valid_dates = all(
                    "2026-02-01" <= exp.get("date", "") <= "2026-02-28" 
                    for exp in data
                )
                if valid_dates:
                    self.log_result("GET /api/expenses (date filtered)", True, f"Correctly filtered {len(data)} expenses by date range")
                    return True
                else:
                    self.log_result("GET /api/expenses (date filtered)", False, "Date filter failed - expenses outside range found")
                    return False
            else:
                self.log_result("GET /api/expenses (date filtered)", False, "Invalid response format", data)
                return False
        else:
            self.log_result("GET /api/expenses (date filtered)", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_delete_expense(self, expense_id):
        """Test DELETE /api/expenses/:id"""
        if not expense_id:
            self.log_result("DELETE /api/expenses/:id", False, "No expense ID to delete")
            return False
            
        print(f"💰 Testing Delete Expense {expense_id}...")
        
        response = self.make_request("DELETE", f"expenses/{expense_id}")
        
        if not response["success"]:
            self.log_result("DELETE /api/expenses/:id", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("success"):
                self.log_result("DELETE /api/expenses/:id", True, f"Successfully deleted expense {expense_id}")
                return True
            else:
                self.log_result("DELETE /api/expenses/:id", False, "Expense deletion failed", data)
                return False
        else:
            self.log_result("DELETE /api/expenses/:id", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_delete_expense_category(self, category_id):
        """Test DELETE /api/expense-categories/:id"""
        if not category_id:
            self.log_result("DELETE /api/expense-categories/:id", False, "No category ID to delete")
            return False
            
        print(f"💰 Testing Delete Expense Category {category_id}...")
        
        response = self.make_request("DELETE", f"expense-categories/{category_id}")
        
        if not response["success"]:
            self.log_result("DELETE /api/expense-categories/:id", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if data.get("success"):
                self.log_result("DELETE /api/expense-categories/:id", True, f"Successfully deleted category {category_id}")
                return True
            else:
                self.log_result("DELETE /api/expense-categories/:id", False, "Category deletion failed", data)
                return False
        else:
            self.log_result("DELETE /api/expense-categories/:id", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def test_delete_nonexistent_expense(self):
        """Test DELETE /api/expenses/:id with nonexistent ID"""
        print("💰 Testing Delete Nonexistent Expense...")
        
        response = self.make_request("DELETE", "expenses/nonexistent-id")
        
        if not response["success"]:
            self.log_result("DELETE /api/expenses/:id (nonexistent)", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 404:
            data = response["data"]
            if not data.get("success", True) and "not found" in data.get("error", "").lower():
                self.log_result("DELETE /api/expenses/:id (nonexistent)", True, "Correctly returned 404 for nonexistent expense")
                return True
            else:
                self.log_result("DELETE /api/expenses/:id (nonexistent)", False, "Should return proper 404 error", data)
                return False
        else:
            self.log_result("DELETE /api/expenses/:id (nonexistent)", False, f"Expected 404, got {response['status_code']}", response["data"])
            return False

    def test_dashboard_with_date_param(self):
        """Test GET /api/dashboard?date=2026-02-17"""
        print("💰 Testing Dashboard with Date Parameter...")
        
        response = self.make_request("GET", "dashboard", params={"date": "2026-02-17"})
        
        if not response["success"]:
            self.log_result("GET /api/dashboard?date", False, f"Request failed: {response['data']['error']}")
            return False
            
        if response["status_code"] == 200:
            data = response["data"]
            if "stats" in data and "departures" in data and "date" in data:
                if data["date"] == "2026-02-17":
                    stats = data["stats"]
                    required_stats = ["totalGross", "quadCount", "buggyCount", "cashTotal", "bankTotal"]
                    if all(stat in stats for stat in required_stats):
                        self.log_result("GET /api/dashboard?date", True, f"Dashboard correctly returned stats for {data['date']}")
                        return True
                    else:
                        self.log_result("GET /api/dashboard?date", False, "Dashboard missing required stats fields", stats)
                        return False
                else:
                    self.log_result("GET /api/dashboard?date", False, f"Expected date 2026-02-17, got {data.get('date')}")
                    return False
            else:
                self.log_result("GET /api/dashboard?date", False, "Dashboard missing required fields", data)
                return False
        else:
            self.log_result("GET /api/dashboard?date", False, f"Expected 200, got {response['status_code']}", response["data"])
            return False

    def run_expense_tests(self):
        """Run all expense-related tests"""
        print("\n" + "=" * 60)
        print("💰 EXPENSES FEATURE TESTS")
        print("=" * 60)
        
        # Test expense categories
        self.test_get_expense_categories_initialization()
        category_id = self.test_create_expense_category()
        self.test_create_expense_category_duplicate()
        self.test_create_expense_category_invalid_account()
        
        # Test expenses
        expense_id = self.test_create_expense()
        self.test_create_expense_missing_fields()
        self.test_create_expense_invalid_account()
        self.test_get_expenses_all()
        self.test_get_expenses_filtered_by_account()
        self.test_get_expenses_filtered_by_date_range()
        
        # Test deletion
        self.test_delete_nonexistent_expense()
        self.test_delete_expense(expense_id)
        self.test_delete_expense_category(category_id)
        
        # Test dashboard integration
        self.test_dashboard_with_date_param()

    def run_all_tests(self):
        """Run all tests including authentication and expenses"""
        print("🚀 Starting Comprehensive Backend API Tests")
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
        
        # Run expense tests
        self.run_expense_tests()
        
        # Summary
        print("\n" + "=" * 60)
        print("🏁 COMPREHENSIVE TEST SUMMARY")
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