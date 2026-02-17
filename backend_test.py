#!/usr/bin/env python3
"""
Backend API Testing Script for Cruceros Payment Feature
Tests the specific functionality requested for Cruceros payment method.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://atv-auth-preview.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_icon} {test_name}: {status}")
    if details:
        print(f"    Details: {details}")
    print()

def test_cruceros_batch_creation():
    """Test POST /api/departures/batch with Cruceros payment method"""
    print("🔄 Testing Cruceros Batch Creation...")
    
    test_data = {
        "entries": [
            {
                "date": "2026-02-16",
                "timeSlot": "10:00",
                "category": "quad",
                "productId": "1",
                "vehiclesCount": 1,
                "groupLabel": "Test Crucero Backend",
                "paymentSplit": [
                    {
                        "method": "cruceros",
                        "amount": 85
                    }
                ],
                "isPendingCruise": True,
                "salesChannel": "cruceros"
            }
        ],
        "userId": "test_user",
        "userName": "Test User"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/departures/batch",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success") and result.get("created") == 1:
                entry_id = result["results"][0]["id"] if result.get("results") else None
                log_test(
                    "Cruceros Batch Creation", 
                    "PASS", 
                    f"Entry created successfully with ID: {entry_id}"
                )
                return True, entry_id
            else:
                log_test(
                    "Cruceros Batch Creation", 
                    "FAIL", 
                    f"Unexpected response structure: {result}"
                )
                return False, None
        else:
            log_test(
                "Cruceros Batch Creation", 
                "FAIL", 
                f"HTTP {response.status_code}: {response.text[:200]}"
            )
            return False, None
            
    except requests.exceptions.RequestException as e:
        log_test("Cruceros Batch Creation", "FAIL", f"Request failed: {str(e)}")
        return False, None

def test_dashboard_cruceros_total():
    """Test GET /api/dashboard to verify cruiseTotal > 0 after creating entry"""
    print("🔄 Testing Dashboard Cruceros Total...")
    
    try:
        response = requests.get(
            f"{API_BASE}/dashboard?date=2026-02-16",
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            stats = result.get("stats", {})
            cruise_total = stats.get("cruiseTotal", 0)
            gyg_total = stats.get("gygTotal", 0)
            
            if cruise_total > 0:
                log_test(
                    "Dashboard Cruceros Total", 
                    "PASS", 
                    f"cruiseTotal: {cruise_total}, gygTotal: {gyg_total}"
                )
                return True
            else:
                log_test(
                    "Dashboard Cruceros Total", 
                    "FAIL", 
                    f"cruiseTotal is {cruise_total}, expected > 0. Full stats: {stats}"
                )
                return False
        else:
            log_test(
                "Dashboard Cruceros Total", 
                "FAIL", 
                f"HTTP {response.status_code}: {response.text[:200]}"
            )
            return False
            
    except requests.exceptions.RequestException as e:
        log_test("Dashboard Cruceros Total", "FAIL", f"Request failed: {str(e)}")
        return False

def test_departures_data_alignment():
    """Test GET /api/departures to verify proper data alignment with new columns"""
    print("🔄 Testing Departures Data Alignment...")
    
    try:
        response = requests.get(
            f"{API_BASE}/departures?date=2026-02-16",
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if isinstance(result, list) and len(result) > 0:
                # Check if the entries have the expected fields
                first_entry = result[0]
                expected_fields = [
                    'id', 'date', 'timeSlot', 'category', 'productId',
                    'paymentSplitCruise', 'gygDiscount', 'isPendingCruise'
                ]
                
                missing_fields = []
                for field in expected_fields:
                    if field not in first_entry:
                        missing_fields.append(field)
                
                # Check specifically for Cruceros entry
                cruceros_entry = None
                for entry in result:
                    if entry.get('groupLabel') == 'Test Crucero Backend':
                        cruceros_entry = entry
                        break
                
                if cruceros_entry:
                    cruise_payment = float(cruceros_entry.get('paymentSplitCruise', 0))
                    is_pending = cruceros_entry.get('isPendingCruise', 'false')
                    
                    if cruise_payment > 0 and is_pending == 'true':
                        log_test(
                            "Departures Data Alignment", 
                            "PASS", 
                            f"Found Cruceros entry with cruise payment: {cruise_payment}, pending: {is_pending}"
                        )
                        return True
                    else:
                        log_test(
                            "Departures Data Alignment", 
                            "FAIL", 
                            f"Cruceros entry found but incorrect values: cruise={cruise_payment}, pending={is_pending}"
                        )
                        return False
                else:
                    log_test(
                        "Departures Data Alignment", 
                        "FAIL", 
                        f"Cruceros test entry not found in departures list. Available entries: {len(result)}"
                    )
                    return False
            else:
                log_test(
                    "Departures Data Alignment", 
                    "FAIL", 
                    f"Expected array with entries, got: {type(result)} with length: {len(result) if hasattr(result, '__len__') else 'N/A'}"
                )
                return False
        else:
            log_test(
                "Departures Data Alignment", 
                "FAIL", 
                f"HTTP {response.status_code}: {response.text[:200]}"
            )
            return False
            
    except requests.exceptions.RequestException as e:
        log_test("Departures Data Alignment", "FAIL", f"Request failed: {str(e)}")
        return False

def test_api_connectivity():
    """Test basic API connectivity"""
    print("🔄 Testing API Connectivity...")
    
    try:
        response = requests.get(f"{API_BASE}", timeout=10)
        if response.status_code == 200:
            log_test("API Connectivity", "PASS", "API is accessible")
            return True
        else:
            log_test("API Connectivity", "FAIL", f"HTTP {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        log_test("API Connectivity", "FAIL", f"Connection failed: {str(e)}")
        return False

def main():
    """Run all Cruceros payment feature tests"""
    print("=" * 60)
    print("🚀 CRUCEROS PAYMENT FEATURE TESTING")
    print(f"📍 Base URL: {BASE_URL}")
    print(f"🔗 API URL: {API_BASE}")
    print("=" * 60)
    print()
    
    # Track test results
    test_results = {}
    
    # Test 1: API Connectivity
    test_results["api_connectivity"] = test_api_connectivity()
    
    # Test 2: Create Cruceros batch entry
    if test_results["api_connectivity"]:
        success, entry_id = test_cruceros_batch_creation()
        test_results["cruceros_batch_creation"] = success
        
        # Small delay to ensure data is persisted
        if success:
            print("⏳ Waiting 2 seconds for data persistence...")
            time.sleep(2)
            
        # Test 3: Verify dashboard shows cruise total
        test_results["dashboard_cruceros_total"] = test_dashboard_cruceros_total()
        
        # Test 4: Verify departures data alignment
        test_results["departures_data_alignment"] = test_departures_data_alignment()
    else:
        test_results["cruceros_batch_creation"] = False
        test_results["dashboard_cruceros_total"] = False
        test_results["departures_data_alignment"] = False
    
    # Summary
    print("=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    print(f"\n📈 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL CRUCEROS PAYMENT TESTS PASSED!")
        return True
    else:
        print("⚠️  SOME TESTS FAILED - See details above")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)