#!/usr/bin/env python3
"""
Test to create a single-column debugging API call to check sheet headers
"""

import requests
import json

BASE_URL = "https://financial-tracker-56.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test direct sheet data access
response = requests.get(f"{API_BASE}/departures?date=2026-02-16")
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    if data:
        first_entry = data[0]
        print(f"First entry keys ({len(first_entry)} total):")
        for i, key in enumerate(first_entry.keys(), 1):
            print(f"{i:2d}: {key}")
        
        # Check specifically for our test entry
        test_entry = None
        for entry in data:
            if entry.get('groupLabel') == 'Test Crucero Backend':
                test_entry = entry
                break
        
        if test_entry:
            print(f"\nTest entry 'Test Crucero Backend':")
            print(f"paymentSplitGyg: {test_entry.get('paymentSplitGyg', 'MISSING')}")
            print(f"Next field after paymentSplitGyg: {list(test_entry.keys())[list(test_entry.keys()).index('paymentSplitGyg') + 1] if 'paymentSplitGyg' in test_entry else 'N/A'}")
            
            # Show the last few fields
            keys = list(test_entry.keys())
            print(f"Last 5 fields: {keys[-5:]}")
        
    else:
        print("No data returned")
else:
    print(f"Error: {response.text}")