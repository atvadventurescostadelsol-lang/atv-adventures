#!/usr/bin/env python3
"""
Backend API Testing Script for Tour Management System
Tests authentication, departures, expenses, and expense categories APIs
"""

import requests
import json
import sys
from datetime import datetime

# Get base URL from environment 
BASE_URL = "https://gastos-permissions.preview.emergentagent.com/api"

def print_test_result(test_name, passed, details=""):
    """Print test results with consistent formatting"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_auth_login():
    """Test authentication endpoints"""
    print("=== TESTING AUTHENTICATION ===")
    
    # Test 1: Admin login with credentials from code
    print("Testing admin login (Zorrouad/25592776)...")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", 
                               json={"username": "Zorrouad", "password": "25592776"})
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('user', {}).get('role') == 'admin':
                print_test_result("Admin login (Zorrouad/25592776)", True, 
                                f"Login successful, role: {data['user']['role']}")
                admin_user = data['user']
            else:
                print_test_result("Admin login (Zorrouad/25592776)", False, 
                                f"Unexpected response: {data}")
                admin_user = None
        else:
            print_test_result("Admin login (Zorrouad/25592776)", False, 
                            f"HTTP {response.status_code}: {response.text}")
            admin_user = None
    except Exception as e:
        print_test_result("Admin login (Zorrouad/25592776)", False, f"Exception: {str(e)}")
        admin_user = None

    # Test 2: Alternative admin login from request
    print("Testing admin login (Zorroaud/25592776)...")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", 
                               json={"username": "Zorroaud", "password": "25592776"})
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print_test_result("Admin login (Zorroaud/25592776)", True, 
                                f"Login successful, role: {data['user']['role']}")
            else:
                print_test_result("Admin login (Zorroaud/25592776)", False, 
                                f"Unexpected response: {data}")
        else:
            print_test_result("Admin login (Zorroaud/25592776)", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("Admin login (Zorroaud/25592776)", False, f"Exception: {str(e)}")

    # Test 3: User login with credentials from code
    print("Testing user login (Charly/Sajer)...")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", 
                               json={"username": "Charly", "password": "Sajer"})
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('user', {}).get('role') == 'user':
                print_test_result("User login (Charly/Sajer)", True, 
                                f"Login successful, role: {data['user']['role']}")
                charly_user = data['user']
            else:
                print_test_result("User login (Charly/Sajer)", False, 
                                f"Unexpected response: {data}")
                charly_user = None
        else:
            print_test_result("User login (Charly/Sajer)", False, 
                            f"HTTP {response.status_code}: {response.text}")
            charly_user = None
    except Exception as e:
        print_test_result("User login (Charly/Sajer)", False, f"Exception: {str(e)}")
        charly_user = None

    # Test 4: Alternative user login from request
    print("Testing user login (Charly/Charly2024)...")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", 
                               json={"username": "Charly", "password": "Charly2024"})
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print_test_result("User login (Charly/Charly2024)", True, 
                                f"Login successful, role: {data['user']['role']}")
            else:
                print_test_result("User login (Charly/Charly2024)", False, 
                                f"Unexpected response: {data}")
        else:
            print_test_result("User login (Charly/Charly2024)", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("User login (Charly/Charly2024)", False, f"Exception: {str(e)}")

    # Test 5: Invalid credentials
    print("Testing invalid login...")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", 
                               json={"username": "invalid", "password": "wrong"})
        
        if response.status_code == 401:
            data = response.json()
            if not data.get('success') and 'credentials' in data.get('error', '').lower():
                print_test_result("Invalid login rejection", True, 
                                f"Correctly rejected with: {data.get('error')}")
            else:
                print_test_result("Invalid login rejection", False, 
                                f"Unexpected response: {data}")
        else:
            print_test_result("Invalid login rejection", False, 
                            f"Expected 401, got HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("Invalid login rejection", False, f"Exception: {str(e)}")

    return admin_user, charly_user

def test_departures_api():
    """Test departures endpoints"""
    print("=== TESTING DEPARTURES API ===")
    
    # Test GET /api/departures
    print("Testing GET /api/departures...")
    try:
        response = requests.get(f"{BASE_URL}/departures")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/departures", True, 
                                f"Returned {len(data)} departures as array")
                
                # Check data structure if we have departures
                if len(data) > 0:
                    departure = data[0]
                    expected_fields = ['id', 'date', 'timeSlot', 'category', 'vehiclesCount']
                    missing_fields = [field for field in expected_fields if field not in departure]
                    if missing_fields:
                        print(f"    Warning: Missing expected fields: {missing_fields}")
                    else:
                        print(f"    Sample departure structure looks good")
            else:
                print_test_result("GET /api/departures", False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/departures", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/departures", False, f"Exception: {str(e)}")

    # Test with date filter
    print("Testing GET /api/departures with date filter...")
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/departures", params={"date": today})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/departures?date=" + today, True, 
                                f"Returned {len(data)} departures for {today}")
            else:
                print_test_result("GET /api/departures?date=" + today, False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/departures?date=" + today, False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/departures?date=" + today, False, f"Exception: {str(e)}")

def test_expenses_api():
    """Test expenses endpoints"""
    print("=== TESTING EXPENSES API ===")
    
    # Test GET /api/expenses
    print("Testing GET /api/expenses...")
    try:
        response = requests.get(f"{BASE_URL}/expenses")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/expenses", True, 
                                f"Returned {len(data)} expenses as array")
                
                # Check data structure if we have expenses
                if len(data) > 0:
                    expense = data[0]
                    expected_fields = ['id', 'date', 'amount', 'concept', 'account']
                    missing_fields = [field for field in expected_fields if field not in expense]
                    if missing_fields:
                        print(f"    Warning: Missing expected fields: {missing_fields}")
                    else:
                        print(f"    Sample expense structure looks good")
            else:
                print_test_result("GET /api/expenses", False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/expenses", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/expenses", False, f"Exception: {str(e)}")

    # Test with account filter
    print("Testing GET /api/expenses with account filter...")
    try:
        response = requests.get(f"{BASE_URL}/expenses", params={"account": "GE"})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/expenses?account=GE", True, 
                                f"Returned {len(data)} GE expenses")
                # Verify all returned expenses are for GE account
                if data:
                    non_ge_expenses = [e for e in data if e.get('account') != 'GE']
                    if non_ge_expenses:
                        print(f"    Warning: Found {len(non_ge_expenses)} non-GE expenses in filtered results")
                    else:
                        print(f"    Account filtering working correctly")
            else:
                print_test_result("GET /api/expenses?account=GE", False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/expenses?account=GE", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/expenses?account=GE", False, f"Exception: {str(e)}")

def test_expense_categories_api():
    """Test expense categories endpoints"""
    print("=== TESTING EXPENSE CATEGORIES API ===")
    
    # Test GET /api/expense-categories
    print("Testing GET /api/expense-categories...")
    try:
        response = requests.get(f"{BASE_URL}/expense-categories")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/expense-categories", True, 
                                f"Returned {len(data)} expense categories as array")
                
                # Check data structure if we have categories
                if len(data) > 0:
                    category = data[0]
                    expected_fields = ['id', 'name', 'account', 'createdAt']
                    missing_fields = [field for field in expected_fields if field not in category]
                    if missing_fields:
                        print(f"    Warning: Missing expected fields: {missing_fields}")
                    else:
                        print(f"    Sample category structure looks good")
                    
                    # Check if we have default categories
                    category_names = [c.get('name') for c in data]
                    expected_categories = ['Gasolina', 'Alimentación', 'Guía', 'Mantenimiento', 'Otros']
                    found_categories = [cat for cat in expected_categories if cat in category_names]
                    print(f"    Found default categories: {found_categories}")
            else:
                print_test_result("GET /api/expense-categories", False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/expense-categories", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/expense-categories", False, f"Exception: {str(e)}")

def test_incomes_api():
    """Test incomes endpoints as per review request"""
    print("=== TESTING INCOMES API ===")
    
    # Test 1: GET /api/incomes - Should return list of incomes
    print("Testing GET /api/incomes...")
    try:
        response = requests.get(f"{BASE_URL}/incomes")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/incomes", True, 
                                f"Returned {len(data)} incomes as array")
                
                # Check data structure if we have incomes
                if len(data) > 0:
                    income = data[0]
                    expected_fields = ['id', 'date', 'amount', 'concept', 'account', 'notes', 'createdAt']
                    missing_fields = [field for field in expected_fields if field not in income]
                    if missing_fields:
                        print(f"    Warning: Missing expected fields: {missing_fields}")
                    else:
                        print(f"    Sample income structure looks good")
            else:
                print_test_result("GET /api/incomes", False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/incomes", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/incomes", False, f"Exception: {str(e)}")

    # Test 2: GET /api/incomes with date range filter
    print("Testing GET /api/incomes with date range filter...")
    try:
        test_date = "2026-02-17"
        response = requests.get(f"{BASE_URL}/incomes", 
                               params={"startDate": test_date, "endDate": test_date})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/incomes with date filter", True, 
                                f"Returned {len(data)} incomes for date range {test_date}")
                # Verify all returned incomes are within date range
                if data:
                    out_of_range = [i for i in data if i.get('date') < test_date or i.get('date') > test_date]
                    if out_of_range:
                        print(f"    Warning: Found {len(out_of_range)} incomes outside date range")
                    else:
                        print(f"    Date filtering working correctly")
            else:
                print_test_result("GET /api/incomes with date filter", False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/incomes with date filter", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/incomes with date filter", False, f"Exception: {str(e)}")

    # Test 3: GET /api/incomes with account filter
    print("Testing GET /api/incomes with account filter...")
    try:
        response = requests.get(f"{BASE_URL}/incomes", params={"account": "GE"})
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/incomes?account=GE", True, 
                                f"Returned {len(data)} GE incomes")
                # Verify all returned incomes are for GE account
                if data:
                    non_ge_incomes = [i for i in data if i.get('account') != 'GE']
                    if non_ge_incomes:
                        print(f"    Warning: Found {len(non_ge_incomes)} non-GE incomes in filtered results")
                    else:
                        print(f"    Account filtering working correctly")
            else:
                print_test_result("GET /api/incomes?account=GE", False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/incomes?account=GE", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/incomes?account=GE", False, f"Exception: {str(e)}")

    # Test 4: POST /api/incomes - Create an income
    print("Testing POST /api/incomes (create income)...")
    created_income_id = None
    try:
        test_income = {
            "date": "2026-02-17",
            "amount": 50,
            "concept": "Transferencia",
            "account": "E&S",
            "notes": "Test income creation"
        }
        
        response = requests.post(f"{BASE_URL}/incomes", json=test_income)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and 'income' in data:
                created_income_id = data['income'].get('id')
                print_test_result("POST /api/incomes (create)", True, 
                                f"Income created successfully with ID: {created_income_id}")
                
                # Verify the created income structure
                income = data['income']
                expected_fields = ['id', 'date', 'amount', 'concept', 'account', 'notes']
                missing_fields = [field for field in expected_fields if field not in income]
                if missing_fields:
                    print(f"    Warning: Created income missing fields: {missing_fields}")
                else:
                    print(f"    Created income structure is complete")
                    
                # Verify field values
                if income.get('amount') == "50.00" and income.get('concept') == "Transferencia":
                    print(f"    Created income field values are correct")
                else:
                    print(f"    Warning: Field values don't match input")
            else:
                print_test_result("POST /api/incomes (create)", False, 
                                f"Unexpected response structure: {data}")
        else:
            print_test_result("POST /api/incomes (create)", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("POST /api/incomes (create)", False, f"Exception: {str(e)}")

    # Test 5: POST /api/incomes with invalid data
    print("Testing POST /api/incomes with invalid data...")
    try:
        invalid_income = {
            "date": "2026-02-17",
            "amount": 25,
            "concept": "Test",
            "account": "INVALID"  # Invalid account
        }
        
        response = requests.post(f"{BASE_URL}/incomes", json=invalid_income)
        
        if response.status_code == 400:
            data = response.json()
            if 'error' in data and 'account' in data['error'].lower():
                print_test_result("POST /api/incomes (invalid account)", True, 
                                f"Correctly rejected invalid account: {data.get('error')}")
            else:
                print_test_result("POST /api/incomes (invalid account)", False, 
                                f"Unexpected error message: {data}")
        else:
            print_test_result("POST /api/incomes (invalid account)", False, 
                            f"Expected 400, got HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("POST /api/incomes (invalid account)", False, f"Exception: {str(e)}")

    # Test 6: DELETE /api/incomes/{id} - Delete the created income
    if created_income_id:
        print(f"Testing DELETE /api/incomes/{created_income_id}...")
        try:
            response = requests.delete(f"{BASE_URL}/incomes/{created_income_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print_test_result("DELETE /api/incomes/{id}", True, 
                                    f"Income {created_income_id} deleted successfully")
                else:
                    print_test_result("DELETE /api/incomes/{id}", False, 
                                    f"Unexpected response: {data}")
            else:
                print_test_result("DELETE /api/incomes/{id}", False, 
                                f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print_test_result("DELETE /api/incomes/{id}", False, f"Exception: {str(e)}")
    else:
        print("Skipping DELETE test - no income was created")

    # Test 7: DELETE /api/incomes/{nonexistent_id}
    print("Testing DELETE /api/incomes with nonexistent ID...")
    try:
        fake_id = "nonexistent-id-12345"
        response = requests.delete(f"{BASE_URL}/incomes/{fake_id}")
        
        if response.status_code == 404:
            data = response.json()
            if 'error' in data and 'not found' in data['error'].lower():
                print_test_result("DELETE /api/incomes (nonexistent)", True, 
                                f"Correctly returned 404 for nonexistent income: {data.get('error')}")
            else:
                print_test_result("DELETE /api/incomes (nonexistent)", False, 
                                f"Unexpected error message: {data}")
        else:
            print_test_result("DELETE /api/incomes (nonexistent)", False, 
                            f"Expected 404, got HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("DELETE /api/incomes (nonexistent)", False, f"Exception: {str(e)}")

def test_income_categories_api():
    """Test income categories endpoints as per review request"""
    print("=== TESTING INCOME CATEGORIES API ===")
    
    # Test 1: GET /api/income-categories - Should return income categories
    print("Testing GET /api/income-categories...")
    try:
        response = requests.get(f"{BASE_URL}/income-categories")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/income-categories", True, 
                                f"Returned {len(data)} income categories as array")
                
                # Check data structure if we have categories
                if len(data) > 0:
                    category = data[0]
                    expected_fields = ['id', 'name', 'account', 'createdAt']
                    missing_fields = [field for field in expected_fields if field not in category]
                    if missing_fields:
                        print(f"    Warning: Missing expected fields: {missing_fields}")
                    else:
                        print(f"    Sample category structure looks good")
                    
                    # Check if we have default categories (Transferencia, Pago pendiente, Otros)
                    category_names = [c.get('name') for c in data]
                    expected_categories = ['Transferencia', 'Pago pendiente', 'Otros']
                    found_categories = [cat for cat in expected_categories if cat in category_names]
                    print(f"    Found default income categories: {found_categories}")
                    
                    # Check accounts
                    accounts = [c.get('account') for c in data]
                    expected_accounts = ['GE', 'E&S']
                    found_accounts = list(set(accounts))
                    print(f"    Found accounts: {found_accounts}")
            else:
                print_test_result("GET /api/income-categories", False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/income-categories", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/income-categories", False, f"Exception: {str(e)}")

    # Test 2: POST /api/income-categories - Create category
    print("Testing POST /api/income-categories...")
    created_category_id = None
    try:
        test_category = {
            "name": "Test Category",
            "account": "GE"
        }
        
        response = requests.post(f"{BASE_URL}/income-categories", json=test_category)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and 'category' in data:
                created_category_id = data['category'].get('id')
                print_test_result("POST /api/income-categories (create)", True, 
                                f"Category created successfully with ID: {created_category_id}")
                
                # Verify the created category structure
                category = data['category']
                if category.get('name') == "Test Category" and category.get('account') == "GE":
                    print(f"    Created category field values are correct")
                else:
                    print(f"    Warning: Field values don't match input")
            else:
                print_test_result("POST /api/income-categories (create)", False, 
                                f"Unexpected response structure: {data}")
        else:
            print_test_result("POST /api/income-categories (create)", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("POST /api/income-categories (create)", False, f"Exception: {str(e)}")

    # Test 3: POST /api/income-categories with invalid account
    print("Testing POST /api/income-categories with invalid account...")
    try:
        invalid_category = {
            "name": "Invalid Category",
            "account": "INVALID"
        }
        
        response = requests.post(f"{BASE_URL}/income-categories", json=invalid_category)
        
        if response.status_code == 400:
            data = response.json()
            if 'error' in data and 'account' in data['error'].lower():
                print_test_result("POST /api/income-categories (invalid account)", True, 
                                f"Correctly rejected invalid account: {data.get('error')}")
            else:
                print_test_result("POST /api/income-categories (invalid account)", False, 
                                f"Unexpected error message: {data}")
        else:
            print_test_result("POST /api/income-categories (invalid account)", False, 
                            f"Expected 400, got HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("POST /api/income-categories (invalid account)", False, f"Exception: {str(e)}")

    # Test 4: DELETE /api/income-categories/{id} - Delete the created category
    if created_category_id:
        print(f"Testing DELETE /api/income-categories/{created_category_id}...")
        try:
            response = requests.delete(f"{BASE_URL}/income-categories/{created_category_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    print_test_result("DELETE /api/income-categories/{id}", True, 
                                    f"Category {created_category_id} deleted successfully")
                else:
                    print_test_result("DELETE /api/income-categories/{id}", False, 
                                    f"Unexpected response: {data}")
            else:
                print_test_result("DELETE /api/income-categories/{id}", False, 
                                f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print_test_result("DELETE /api/income-categories/{id}", False, f"Exception: {str(e)}")
    else:
        print("Skipping DELETE test - no category was created")

    # Test 5: DELETE /api/income-categories/{nonexistent_id}
    print("Testing DELETE /api/income-categories with nonexistent ID...")
    try:
        fake_id = "nonexistent-category-id"
        response = requests.delete(f"{BASE_URL}/income-categories/{fake_id}")
        
        if response.status_code == 404:
            data = response.json()
            if 'error' in data and 'not found' in data['error'].lower():
                print_test_result("DELETE /api/income-categories (nonexistent)", True, 
                                f"Correctly returned 404 for nonexistent category: {data.get('error')}")
            else:
                print_test_result("DELETE /api/income-categories (nonexistent)", False, 
                                f"Unexpected error message: {data}")
        else:
            print_test_result("DELETE /api/income-categories (nonexistent)", False, 
                            f"Expected 404, got HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("DELETE /api/income-categories (nonexistent)", False, f"Exception: {str(e)}")

def test_additional_endpoints():
    """Test other important endpoints mentioned in test_result.md"""
    print("=== TESTING ADDITIONAL ENDPOINTS ===")
    
    # Test dashboard endpoint
    print("Testing GET /api/dashboard...")
    try:
        response = requests.get(f"{BASE_URL}/dashboard")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'stats' in data:
                print_test_result("GET /api/dashboard", True, 
                                f"Dashboard returned stats structure")
                
                # Check stats structure
                stats = data['stats']
                expected_stats = ['totalGross', 'netBase', 'vatAmount', 'quadCount', 'buggyCount']
                missing_stats = [stat for stat in expected_stats if stat not in stats]
                if missing_stats:
                    print(f"    Warning: Missing expected stats: {missing_stats}")
                else:
                    print(f"    Dashboard stats structure looks complete")
            else:
                print_test_result("GET /api/dashboard", False, 
                                f"Expected dict with 'stats', got: {type(data)}")
        else:
            print_test_result("GET /api/dashboard", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/dashboard", False, f"Exception: {str(e)}")

    # Test products endpoint
    print("Testing GET /api/products...")
    try:
        response = requests.get(f"{BASE_URL}/products")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/products", True, 
                                f"Returned {len(data)} products")
            else:
                print_test_result("GET /api/products", False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/products", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/products", False, f"Exception: {str(e)}")

    # Test timeslots endpoint
    print("Testing GET /api/timeslots...")
    try:
        response = requests.get(f"{BASE_URL}/timeslots")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print_test_result("GET /api/timeslots", True, 
                                f"Returned {len(data)} time slots")
            else:
                print_test_result("GET /api/timeslots", False, 
                                f"Expected array, got: {type(data)}")
        else:
            print_test_result("GET /api/timeslots", False, 
                            f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print_test_result("GET /api/timeslots", False, f"Exception: {str(e)}")

def main():
    """Run all backend API tests"""
    print("🚀 Starting Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print("=" * 60)
    
    # Test authentication first
    admin_user, charly_user = test_auth_login()
    
    # Test departures API
    test_departures_api()
    
    # Test expenses API
    test_expenses_api()
    
    # Test expense categories API
    test_expense_categories_api()
    
    # Test additional endpoints
    test_additional_endpoints()
    
    print("=" * 60)
    print("✅ Backend API Testing Complete")

if __name__ == "__main__":
    main()