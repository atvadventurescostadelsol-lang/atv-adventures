#!/usr/bin/env python3
"""
Debug script to check the raw sheet data structure
"""

import requests
import json

BASE_URL = "https://backup-restore-20.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def check_raw_departures():
    """Check raw departures data"""
    try:
        response = requests.get(f"{API_BASE}/departures?date=2026-02-16", timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            
            if result and len(result) > 0:
                # Get the test entry we just created
                test_entry = None
                for entry in result:
                    if entry.get('groupLabel') == 'Test Crucero Backend':
                        test_entry = entry
                        break
                
                if test_entry:
                    print("Found Test Crucero Backend entry:")
                    print(f"ID: {test_entry.get('id')}")
                    print(f"All fields: {list(test_entry.keys())}")
                    print()
                    
                    # Check for the specific fields we need
                    fields_to_check = [
                        'paymentSplitWeb', 'paymentSplitCash', 'paymentSplitBank', 
                        'paymentSplitGyg', 'paymentSplitCruise', 'gygDiscount', 'isPendingCruise'
                    ]
                    
                    print("Payment and Cruise fields:")
                    for field in fields_to_check:
                        value = test_entry.get(field, 'MISSING')
                        print(f"  {field}: {value}")
                    
                    print(f"\nTotal fields in entry: {len(test_entry)}")
                    print(f"Entry structure seems to end at: {list(test_entry.keys())[-5:]}")
                    
                else:
                    print("Test entry not found")
                    print(f"Available entries: {[e.get('groupLabel', e.get('id', 'No ID')) for e in result]}")
            else:
                print("No entries found")
        else:
            print(f"API Error: {response.status_code}")
            print(response.text[:500])
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_raw_departures()