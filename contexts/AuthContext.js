'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Role-based restrictions configuration
// admin: full access to everything
// buggy: only buggy category and E&S account (like Charly)
// quad: only quad category and GE account
// readonly: only dashboard and reports access (no data modification)
const ROLE_RESTRICTIONS = {
  'admin': null, // No restrictions - full access
  'buggy': {
    allowedCategories: ['buggy'],
    allowedExpenseAccounts: ['E&S'],
    canAccessAdmin: false,
    isReadOnly: false,
  },
  'quad': {
    allowedCategories: ['quad'],
    allowedExpenseAccounts: ['GE'],
    canAccessAdmin: false,
    isReadOnly: false,
  },
  'readonly': {
    allowedCategories: ['quad', 'buggy'], // Can view all categories
    allowedExpenseAccounts: ['GE', 'E&S'], // Can view all accounts
    canAccessAdmin: false,
    isReadOnly: true, // Only dashboard and reports
    allowedTabs: ['dashboard', 'reports'], // Tabs this role can access
  }
};

// Legacy user-specific restrictions (for backwards compatibility)
const USER_RESTRICTIONS = {
  'Charly': ROLE_RESTRICTIONS['buggy'],
  'charly': ROLE_RESTRICTIONS['buggy'],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const savedUser = localStorage.getItem('atv-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('atv-user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Get restrictions: first check role-based, then user-specific
        const role = data.user.role || 'admin';
        let restrictions = ROLE_RESTRICTIONS[role] || null;
        
        // Override with user-specific restrictions if they exist
        if (USER_RESTRICTIONS[data.user.username]) {
          restrictions = USER_RESTRICTIONS[data.user.username];
        }
        
        const userData = {
          id: data.user.id,
          username: data.user.username,
          role: role,
          restrictions: restrictions
        };
        setUser(userData);
        localStorage.setItem('atv-user', JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Connection error' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('atv-user');
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user) return { success: false, error: 'Not logged in' };

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Connection error' };
    }
  };

  const isAdmin = () => user?.role === 'admin';
  
  // Check if user has category restrictions
  const hasRestrictions = () => !!user?.restrictions;
  
  // Get allowed categories for user (null means all)
  const getAllowedCategories = () => user?.restrictions?.allowedCategories || null;
  
  // Get allowed expense accounts for user (null means all)
  const getAllowedExpenseAccounts = () => user?.restrictions?.allowedExpenseAccounts || null;
  
  // Check if user can access a specific category
  const canAccessCategory = (category) => {
    if (!user?.restrictions?.allowedCategories) return true;
    return user.restrictions.allowedCategories.includes(category);
  };
  
  // Check if user can access a specific expense account
  const canAccessExpenseAccount = (account) => {
    if (!user?.restrictions?.allowedExpenseAccounts) return true;
    return user.restrictions.allowedExpenseAccounts.includes(account);
  };
  
  // Check if user can access admin panel
  const canAccessAdmin = () => {
    if (user?.restrictions?.canAccessAdmin === false) return false;
    return user?.role === 'admin';
  };
  
  // Check if user is read-only (only dashboard and reports)
  const isReadOnly = () => {
    return user?.restrictions?.isReadOnly === true;
  };
  
  // Check if user can access a specific tab
  const canAccessTab = (tabName) => {
    // Admin has access to everything
    if (!user?.restrictions) return true;
    // If user has allowedTabs restriction, check against it
    if (user?.restrictions?.allowedTabs) {
      return user.restrictions.allowedTabs.includes(tabName);
    }
    // If no specific tab restrictions, allow access
    return true;
  };
  
  // Get list of allowed tabs for the user
  const getAllowedTabs = () => {
    if (!user?.restrictions?.allowedTabs) return null; // null means all tabs
    return user.restrictions.allowedTabs;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      changePassword,
      isAdmin,
      canAccessAdmin,
      isReadOnly,
      canAccessTab,
      getAllowedTabs,
      hasRestrictions,
      getAllowedCategories,
      getAllowedExpenseAccounts,
      canAccessCategory,
      canAccessExpenseAccount,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
