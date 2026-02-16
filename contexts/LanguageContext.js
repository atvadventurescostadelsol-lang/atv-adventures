'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import translations from '@/lib/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('es');

  // Load language preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('atv-language');
    if (saved && (saved === 'es' || saved === 'en')) {
      setLanguage(saved);
    }
  }, []);

  // Save language preference
  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('atv-language', lang);
  };

  // Translation function
  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
