'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// User restrictions configuration
// Charly can only access buggy category and E&S expenses
const USER_RESTRICTIONS = {
  'Charly': {
    allowedCategories: ['buggy'], // Only buggy, not quad
    allowedExpenseAccounts: ['E&S'], // Only E&S, not GE
    canAccessAdmin: false,
  }
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
        // Get user restrictions
        const restrictions = USER_RESTRICTIONS[data.user.username] || null;
        
        const userData = {
          id: data.user.id,
          username: data.user.username,
          role: data.user.role,
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      changePassword,
      isAdmin,
      canAccessAdmin,
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
