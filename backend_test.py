#!/usr/bin/env python3
"""
Backend API Test Suite for ATV Operations Control
Tests the batch departure creation endpoint after the critical fix
"""

import requests
import json
from datetime import datetime, timedelta
import time

# Base URL from environment
BASE_URL = "https://departure-income-hub.preview.emergentagent.com"

def test_api_endpoint(method, endpoint, data=None, expected_status=200):
    """Helper function to test API endpoints"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
        else:
            print(f"❌ Unsupported method: {method}")
            return None
            
        print(f"📡 {method} {endpoint}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == expected_status:
            print(f"   ✅ Expected status {expected_status}")
        else:
            print(f"   ❌ Expected {expected_status}, got {response.status_code}")
            
        try:
            json_response = response.json()
            print(f"   Response: {json.dumps(json_response, indent=2)[:200]}...")
            return json_response
        except:
            print(f"   Response (text): {response.text[:200]}...")
            return response.text
            
    except Exception as e:
        print(f"❌ Error testing {method} {endpoint}: {str(e)}")
        return None

def test_batch_departures_single_entry():
    """Test 1: Create a single departure entry via batch endpoint"""
    print("\n🧪 TEST 1: Single Entry Batch Creation")
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    test_data = {
        "entries": [{
            "date": today,
            "timeSlot": "12:00",
            "category": "quad", 
            "productId": "1",  # Quad 1 hora (80€)
            "vehiclesCount": 2,
            "groupLabel": "Test Single Entry",
            "salesChannel": "otros",
            "paymentSplit": [{"method": "cash", "amount": 160}]
        }],
        "userId": "test_agent",
        "userName": "Test Agent"
    }
    
    response = test_api_endpoint('POST', '/api/departures/batch', test_data)
    
    if response and isinstance(response, dict):
        if response.get('success') and response.get('created') == 1:
            print("   ✅ Single entry created successfully")
            return response.get('results', [{}])[0].get('id')
        else:
            print(f"   ❌ Single entry creation failed: {response}")
            return None
    return None

def test_batch_departures_multiple_entries():
    """Test 2: Create multiple departure entries in one batch"""
    print("\n🧪 TEST 2: Multiple Entries Batch Creation")
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    test_data = {
        "entries": [
            {
                "date": today,
                "timeSlot": "10:00",
                "category": "quad",
                "productId": "2",  # Quad 2 horas (120€)
                "vehiclesCount": 1,
                "groupLabel": "Test Multi Entry 1",
                "salesChannel": "otros",
                "paymentSplit": [{"method": "cash", "amount": 120}]
            },
            {
                "date": today,
                "timeSlot": "14:00", 
                "category": "buggy",
                "productId": "5",  # Buggy 1 hora (120€)
                "vehiclesCount": 1,
                "groupLabel": "Test Multi Entry 2",
                "salesChannel": "web",
                "paymentSplit": [{"method": "web", "amount": 120}]
            },
            {
                "date": today,
                "timeSlot": "16:00",
                "category": "quad",
                "productId": "1",  # Quad 1 hora (80€)
                "vehiclesCount": 3,
                "groupLabel": "Test Multi Entry 3",
                "salesChannel": "gyg",
                "paymentSplit": [{"method": "gyg", "amount": 240}]
            }
        ],
        "userId": "test_agent",
        "userName": "Test Agent"
    }
    
    response = test_api_endpoint('POST', '/api/departures/batch', test_data)
    
    if response and isinstance(response, dict):
        if response.get('success') and response.get('created') == 3:
            print("   ✅ Multiple entries created successfully")
            return [result.get('id') for result in response.get('results', [])]
        else:
            print(f"   ❌ Multiple entries creation failed: {response}")
            return []
    return []

def test_dashboard_contains_entries():
    """Test 3: Verify entries appear in dashboard"""
    print("\n🧪 TEST 3: Dashboard Contains Created Entries")
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    response = test_api_endpoint('GET', f'/api/dashboard?date={today}')
    
    if response and isinstance(response, dict):
        departures = response.get('departures', [])
        stats = response.get('stats', {})
        
        print(f"   📊 Dashboard shows {len(departures)} departures for {today}")
        print(f"   💰 Total Gross: €{stats.get('totalGross', 0)}")
        print(f"   🏍️ Quad Count: {stats.get('quadCount', 0)}")
        print(f"   🚗 Buggy Count: {stats.get('buggyCount', 0)}")
        
        # Check for our test entries
        test_entries = [d for d in departures if d.get('groupLabel', '').startswith('Test')]
        print(f"   🧪 Found {len(test_entries)} test entries")
        
        if len(test_entries) >= 1:
            print("   ✅ Dashboard contains created entries")
            return True
        else:
            print("   ❌ Dashboard missing created entries")
            return False
    else:
        print("   ❌ Dashboard request failed")
        return False

def test_departures_list():
    """Test 4: Verify entries appear in departures list"""
    print("\n🧪 TEST 4: Departures List Contains Created Entries")
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    response = test_api_endpoint('GET', f'/api/departures?date={today}')
    
    if response and isinstance(response, list):
        print(f"   📋 Departures list shows {len(response)} entries for {today}")
        
        # Check for our test entries
        test_entries = [d for d in response if d.get('groupLabel', '').startswith('Test')]
        print(f"   🧪 Found {len(test_entries)} test entries")
        
        if len(test_entries) >= 1:
            print("   ✅ Departures list contains created entries")
            
            # Show sample entry details to verify correct data
            sample = test_entries[0]
            print(f"   📝 Sample entry:")
            print(f"      - ID: {sample.get('id', 'N/A')}")
            print(f"      - Date: {sample.get('date', 'N/A')}")
            print(f"      - Time: {sample.get('timeSlot', 'N/A')}")
            print(f"      - Product: {sample.get('productName', 'N/A')}")
            print(f"      - Vehicles: {sample.get('vehiclesCount', 'N/A')}")
            print(f"      - Total: €{sample.get('totalGross', 'N/A')}")
            
            return True
        else:
            print("   ❌ Departures list missing created entries")
            return False
    else:
        print("   ❌ Departures list request failed")
        return False

def test_error_handling():
    """Test 5: Error handling for invalid batch requests"""
    print("\n🧪 TEST 5: Error Handling for Invalid Requests")
    
    # Test empty entries array
    response = test_api_endpoint('POST', '/api/departures/batch', {"entries": []}, expected_status=400)
    if response and "Invalid entries array" in str(response):
        print("   ✅ Empty array properly rejected")
    else:
        print("   ❌ Empty array handling failed")
    
    # Test missing required fields
    invalid_data = {
        "entries": [{
            "date": "2026-02-16",
            "timeSlot": "12:00",
            # Missing category, productId, vehiclesCount
        }]
    }
    
    response = test_api_endpoint('POST', '/api/departures/batch', invalid_data)
    if response and response.get('errors', 0) > 0:
        print("   ✅ Missing fields properly handled")
    else:
        print("   ❌ Missing fields handling failed")

def run_all_tests():
    """Run all backend tests"""
    print("🚀 Starting Backend API Tests for Batch Departures")
    print("=" * 60)
    
    # Test 1: Single entry
    single_id = test_batch_departures_single_entry()
    
    # Test 2: Multiple entries  
    multi_ids = test_batch_departures_multiple_entries()
    
    # Wait a moment for data propagation
    print("\n⏳ Waiting for data propagation...")
    time.sleep(2)
    
    # Test 3: Dashboard verification
    dashboard_ok = test_dashboard_contains_entries()
    
    # Test 4: Departures list verification
    departures_ok = test_departures_list()
    
    # Test 5: Error handling
    test_error_handling()
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY")
    print("=" * 60)
    
    tests = [
        ("Single Entry Creation", single_id is not None),
        ("Multiple Entries Creation", len(multi_ids) == 3),
        ("Dashboard Integration", dashboard_ok),
        ("Departures List Integration", departures_ok)
    ]
    
    passed = sum(1 for _, result in tests if result)
    total = len(tests)
    
    for test_name, result in tests:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status} {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED - Batch departures endpoint is working correctly!")
        return True
    else:
        print("⚠️  SOME TESTS FAILED - Issues detected with batch departures endpoint")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)