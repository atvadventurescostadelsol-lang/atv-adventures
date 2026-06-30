#!/usr/bin/env python3
import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://pending-tracker-10.preview.emergentagent.com/api"

# Test data - using realistic data as per system instructions
TEST_USER_DATA = {
    'userId': 'tester123',
    'username': 'TestManager',
    'userRole': 'admin'
}

def print_test_result(test_name, success, details=""):
    """Print formatted test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"    Details: {details}")
    print()

def test_get_tasks():
    """Test GET /api/tasks - Get all tasks"""
    print("🧪 Testing GET /api/tasks...")
    
    try:
        response = requests.get(f"{BASE_URL}/tasks")
        
        if response.status_code == 200:
            data = response.json()
            
            # Should return object with 'pending' and 'completed' arrays
            if isinstance(data, dict) and 'pending' in data and 'completed' in data:
                print_test_result("GET /api/tasks structure", True, 
                                f"Returns pending ({len(data['pending'])}) and completed ({len(data['completed'])}) tasks")
                
                # Check if pending tasks are sorted by priority
                if data['pending']:
                    priority_order = ['urgente', 'importante', 'necesario', 'sugerencia']
                    priorities = [task.get('priority') for task in data['pending']]
                    is_sorted = all(priority_order.index(priorities[i]) <= priority_order.index(priorities[i+1]) 
                                  for i in range(len(priorities)-1) if priorities[i] and priorities[i+1])
                    print_test_result("Priority sorting", is_sorted, f"Priorities: {priorities[:3]}...")
                
                return True, data
            else:
                print_test_result("GET /api/tasks structure", False, f"Invalid response structure: {type(data)}")
                return False, None
        else:
            print_test_result("GET /api/tasks", False, f"HTTP {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_test_result("GET /api/tasks", False, f"Exception: {str(e)}")
        return False, None

def test_create_task():
    """Test POST /api/tasks - Create new task"""
    print("🧪 Testing POST /api/tasks...")
    
    test_task = {
        'description': 'Revisar sistema de frenos en todos los quads',
        'priority': 'urgente',
        'price': '150.00',
        'notes': 'Revisión de seguridad mensual requerida',
        **TEST_USER_DATA
    }
    
    try:
        response = requests.post(f"{BASE_URL}/tasks", json=test_task)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success') and 'task' in data:
                task = data['task']
                created_task_id = task.get('id')
                
                # Verify required fields
                checks = [
                    (task.get('description') == test_task['description'], "Description matches"),
                    (task.get('priority') == test_task['priority'], "Priority matches"),
                    (task.get('price') == test_task['price'], "Price matches"),
                    (task.get('notes') == test_task['notes'], "Notes matches"),
                    (task.get('status') == 'pending', "Status is pending"),
                    (created_task_id is not None, "ID generated")
                ]
                
                all_passed = all(check[0] for check in checks)
                failed_checks = [check[1] for check in checks if not check[0]]
                
                print_test_result("POST /api/tasks", all_passed, 
                                f"Created task ID: {created_task_id}" + 
                                (f" | Failed: {failed_checks}" if failed_checks else ""))
                
                return all_passed, created_task_id
            else:
                print_test_result("POST /api/tasks", False, f"Invalid response: {data}")
                return False, None
        else:
            print_test_result("POST /api/tasks", False, f"HTTP {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print_test_result("POST /api/tasks", False, f"Exception: {str(e)}")
        return False, None

def test_create_task_validation():
    """Test POST /api/tasks validation"""
    print("🧪 Testing POST /api/tasks validation...")
    
    # Test missing required fields
    invalid_tasks = [
        ({}, "Empty payload"),
        ({'description': 'Test'}, "Missing priority"),
        ({'priority': 'urgente'}, "Missing description"),
        ({'description': 'Test', 'priority': 'invalid'}, "Invalid priority")
    ]
    
    all_passed = True
    
    for invalid_task, test_desc in invalid_tasks:
        try:
            response = requests.post(f"{BASE_URL}/tasks", json=invalid_task)
            
            if response.status_code == 400:
                print_test_result(f"Validation - {test_desc}", True, "Correctly rejected")
            else:
                print_test_result(f"Validation - {test_desc}", False, 
                                f"Expected 400, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print_test_result(f"Validation - {test_desc}", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def test_complete_task(task_id):
    """Test POST /api/tasks/complete - Mark task as complete"""
    print("🧪 Testing POST /api/tasks/complete...")
    
    if not task_id:
        print_test_result("POST /api/tasks/complete", False, "No task ID provided")
        return False
    
    complete_data = {
        'taskId': task_id,
        'completionNotes': 'Revisión completada. Todos los frenos funcionan correctamente.',
        **TEST_USER_DATA
    }
    
    try:
        response = requests.post(f"{BASE_URL}/tasks/complete", json=complete_data)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                print_test_result("POST /api/tasks/complete", True, f"Task {task_id} marked as completed")
                return True
            else:
                print_test_result("POST /api/tasks/complete", False, f"Success=false: {data}")
                return False
        else:
            print_test_result("POST /api/tasks/complete", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("POST /api/tasks/complete", False, f"Exception: {str(e)}")
        return False

def test_update_task(task_id):
    """Test PUT /api/tasks/{id} - Update task"""
    print("🧪 Testing PUT /api/tasks/{id}...")
    
    if not task_id:
        print_test_result("PUT /api/tasks/{id}", False, "No task ID provided")
        return False
    
    update_data = {
        'description': 'Revisar sistema de frenos y neumáticos en todos los quads',
        'price': '200.00',
        'priority': 'importante',
        'notes': 'Revisión ampliada incluyendo neumáticos',
        **TEST_USER_DATA
    }
    
    try:
        response = requests.put(f"{BASE_URL}/tasks/{task_id}", json=update_data)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success') and 'task' in data:
                task = data['task']
                
                # Verify updates
                checks = [
                    (task.get('description') == update_data['description'], "Description updated"),
                    (task.get('price') == update_data['price'], "Price updated"),
                    (task.get('priority') == update_data['priority'], "Priority updated"),
                    (task.get('notes') == update_data['notes'], "Notes updated")
                ]
                
                all_passed = all(check[0] for check in checks)
                failed_checks = [check[1] for check in checks if not check[0]]
                
                print_test_result("PUT /api/tasks/{id}", all_passed, 
                                f"Task {task_id} updated" + 
                                (f" | Failed: {failed_checks}" if failed_checks else ""))
                return all_passed
            else:
                print_test_result("PUT /api/tasks/{id}", False, f"Invalid response: {data}")
                return False
        else:
            print_test_result("PUT /api/tasks/{id}", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("PUT /api/tasks/{id}", False, f"Exception: {str(e)}")
        return False

def test_update_task_permissions():
    """Test PUT /api/tasks/{id} permissions"""
    print("🧪 Testing PUT /api/tasks/{id} permissions...")
    
    # First create a task with different user
    other_user_task = {
        'description': 'Tarea de otro usuario',
        'priority': 'necesario',
        'userId': 'other_user',
        'username': 'OtherUser',
        'userRole': 'user'
    }
    
    try:
        # Create task with other user
        response = requests.post(f"{BASE_URL}/tasks", json=other_user_task)
        if response.status_code != 200:
            print_test_result("Permission test setup", False, "Failed to create test task")
            return False
        
        task_id = response.json()['task']['id']
        
        # Try to update with different user (non-admin)
        update_data = {
            'description': 'Trying to update other user task',
            'userId': 'different_user',
            'username': 'DifferentUser',
            'userRole': 'user'
        }
        
        response = requests.put(f"{BASE_URL}/tasks/{task_id}", json=update_data)
        
        if response.status_code == 403:
            print_test_result("Permission check - non-admin/non-creator", True, "Correctly denied access")
            return True
        else:
            print_test_result("Permission check - non-admin/non-creator", False, 
                            f"Expected 403, got {response.status_code}")
            return False
            
    except Exception as e:
        print_test_result("Permission test", False, f"Exception: {str(e)}")
        return False

def test_delete_task():
    """Test DELETE /api/tasks/{id} - Delete task"""
    print("🧪 Testing DELETE /api/tasks/{id}...")
    
    # Create a test task first
    test_task = {
        'description': 'Tarea para eliminar',
        'priority': 'sugerencia',
        **TEST_USER_DATA
    }
    
    try:
        # Create task
        response = requests.post(f"{BASE_URL}/tasks", json=test_task)
        if response.status_code != 200:
            print_test_result("DELETE setup", False, "Failed to create test task")
            return False
        
        task_id = response.json()['task']['id']
        
        # Delete task
        params = {
            'userId': TEST_USER_DATA['userId'],
            'userRole': TEST_USER_DATA['userRole'],
            'userName': TEST_USER_DATA['username']
        }
        
        response = requests.delete(f"{BASE_URL}/tasks/{task_id}", params=params)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                print_test_result("DELETE /api/tasks/{id}", True, f"Task {task_id} deleted successfully")
                return True
            else:
                print_test_result("DELETE /api/tasks/{id}", False, f"Success=false: {data}")
                return False
        else:
            print_test_result("DELETE /api/tasks/{id}", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("DELETE /api/tasks/{id}", False, f"Exception: {str(e)}")
        return False

def test_delete_task_permissions():
    """Test DELETE /api/tasks/{id} permissions"""
    print("🧪 Testing DELETE /api/tasks/{id} permissions...")
    
    # Create a task with specific user
    test_task = {
        'description': 'Tarea de usuario específico',
        'priority': 'necesario',
        'userId': 'specific_user',
        'username': 'SpecificUser',
        'userRole': 'user'
    }
    
    try:
        # Create task
        response = requests.post(f"{BASE_URL}/tasks", json=test_task)
        if response.status_code != 200:
            print_test_result("DELETE permission setup", False, "Failed to create test task")
            return False
        
        task_id = response.json()['task']['id']
        
        # Try to delete with different user (non-admin)
        params = {
            'userId': 'different_user',
            'userRole': 'user',
            'userName': 'DifferentUser'
        }
        
        response = requests.delete(f"{BASE_URL}/tasks/{task_id}", params=params)
        
        if response.status_code == 403:
            print_test_result("DELETE permission check", True, "Correctly denied access")
            
            # Cleanup - delete with correct user
            params['userId'] = 'specific_user'
            requests.delete(f"{BASE_URL}/tasks/{task_id}", params=params)
            
            return True
        elif response.status_code == 404:
            print_test_result("DELETE permission check", False, "Task not found - possible issue")
            return False
        else:
            print_test_result("DELETE permission check", False, 
                            f"Expected 403, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_test_result("DELETE permission test", False, f"Exception: {str(e)}")
        return False

def test_task_priority_validation():
    """Test that only valid priorities are accepted"""
    print("🧪 Testing priority validation...")
    
    valid_priorities = ['urgente', 'importante', 'necesario', 'sugerencia']
    invalid_priorities = ['high', 'low', 'medium', 'critical', 'invalid']
    
    all_passed = True
    
    # Test valid priorities
    for priority in valid_priorities:
        test_task = {
            'description': f'Test task with {priority} priority',
            'priority': priority,
            **TEST_USER_DATA
        }
        
        try:
            response = requests.post(f"{BASE_URL}/tasks", json=test_task)
            
            if response.status_code == 200:
                print_test_result(f"Valid priority '{priority}'", True, "Accepted")
                # Cleanup - delete the created task
                if response.json().get('task', {}).get('id'):
                    task_id = response.json()['task']['id']
                    params = {'userId': TEST_USER_DATA['userId'], 'userRole': TEST_USER_DATA['userRole'], 'userName': TEST_USER_DATA['username']}
                    requests.delete(f"{BASE_URL}/tasks/{task_id}", params=params)
            else:
                print_test_result(f"Valid priority '{priority}'", True, f"HTTP {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print_test_result(f"Valid priority '{priority}'", False, f"Exception: {str(e)}")
            all_passed = False
    
    # Test invalid priorities
    for priority in invalid_priorities:
        test_task = {
            'description': f'Test task with {priority} priority',
            'priority': priority,
            **TEST_USER_DATA
        }
        
        try:
            response = requests.post(f"{BASE_URL}/tasks", json=test_task)
            
            if response.status_code == 400:
                print_test_result(f"Invalid priority '{priority}'", True, "Correctly rejected")
            else:
                print_test_result(f"Invalid priority '{priority}'", False, 
                                f"Expected 400, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print_test_result(f"Invalid priority '{priority}'", False, f"Exception: {str(e)}")
            all_passed = False
    
    return all_passed

def verify_google_sheets_integration():
    """Verify that tasks are actually stored in Google Sheets"""
    print("🧪 Testing Google Sheets integration...")
    
    try:
        # Create a unique task
        unique_desc = f"Integration test task {datetime.now().isoformat()}"
        test_task = {
            'description': unique_desc,
            'priority': 'importante',
            'price': '99.99',
            **TEST_USER_DATA
        }
        
        # Create task
        response = requests.post(f"{BASE_URL}/tasks", json=test_task)
        if response.status_code != 200:
            print_test_result("Sheets integration - create", False, "Failed to create task")
            return False
        
        task_id = response.json()['task']['id']
        
        # Retrieve all tasks and verify our task is there
        response = requests.get(f"{BASE_URL}/tasks")
        if response.status_code != 200:
            print_test_result("Sheets integration - retrieve", False, "Failed to get tasks")
            return False
        
        tasks_data = response.json()
        all_tasks = tasks_data.get('pending', []) + tasks_data.get('completed', [])
        
        # Find our task
        found_task = next((t for t in all_tasks if t.get('description') == unique_desc), None)
        
        if found_task:
            print_test_result("Google Sheets integration", True, 
                            f"Task persisted and retrieved correctly (ID: {task_id})")
            
            # Cleanup
            params = {'userId': TEST_USER_DATA['userId'], 'userRole': TEST_USER_DATA['userRole'], 'userName': TEST_USER_DATA['username']}
            requests.delete(f"{BASE_URL}/tasks/{task_id}", params=params)
            
            return True
        else:
            print_test_result("Google Sheets integration", False, 
                            "Task not found in retrieved list")
            return False
            
    except Exception as e:
        print_test_result("Google Sheets integration", False, f"Exception: {str(e)}")
        return False

def run_comprehensive_tasks_api_test():
    """Run all Tasks API tests"""
    print("=" * 70)
    print("🚀 COMPREHENSIVE TASKS API TESTING STARTED")
    print(f"Base URL: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 70)
    print()
    
    test_results = []
    created_task_id = None
    
    # Test 1: GET /api/tasks
    success, initial_data = test_get_tasks()
    test_results.append(("GET /api/tasks", success))
    
    # Test 2: POST /api/tasks - Create new task
    success, task_id = test_create_task()
    test_results.append(("POST /api/tasks", success))
    if success:
        created_task_id = task_id
    
    # Test 3: POST /api/tasks validation
    success = test_create_task_validation()
    test_results.append(("POST /api/tasks validation", success))
    
    # Test 4: Priority validation
    success = test_task_priority_validation()
    test_results.append(("Priority validation", success))
    
    # Test 5: PUT /api/tasks/{id} - Update task
    success = test_update_task(created_task_id)
    test_results.append(("PUT /api/tasks/{id}", success))
    
    # Test 6: PUT /api/tasks/{id} permissions
    success = test_update_task_permissions()
    test_results.append(("PUT permissions", success))
    
    # Test 7: POST /api/tasks/complete
    success = test_complete_task(created_task_id)
    test_results.append(("POST /api/tasks/complete", success))
    
    # Test 8: DELETE /api/tasks/{id}
    success = test_delete_task()
    test_results.append(("DELETE /api/tasks/{id}", success))
    
    # Test 9: DELETE permissions
    success = test_delete_task_permissions()
    test_results.append(("DELETE permissions", success))
    
    # Test 10: Google Sheets integration
    success = verify_google_sheets_integration()
    test_results.append(("Google Sheets integration", success))
    
    # Final verification - GET tasks again to verify structure
    success, final_data = test_get_tasks()
    test_results.append(("Final verification", success))
    
    # Summary
    print("=" * 70)
    print("📊 TASKS API TEST RESULTS SUMMARY")
    print("=" * 70)
    
    passed = 0
    total = len(test_results)
    
    for test_name, success in test_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if success:
            passed += 1
    
    print()
    print(f"📈 OVERALL RESULTS: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL TASKS API ENDPOINTS ARE WORKING CORRECTLY!")
    else:
        print("⚠️  SOME TESTS FAILED - INVESTIGATION REQUIRED")
    
    print("=" * 70)
    
    return passed == total

if __name__ == "__main__":
    try:
        success = run_comprehensive_tasks_api_test()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)