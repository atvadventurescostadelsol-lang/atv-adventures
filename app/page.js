'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, BarChart3, Settings, LogOut, Globe } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import Dashboard from '@/components/Dashboard';
import BatchEntry from '@/components/BatchEntry';
import CalendarView from '@/components/CalendarView';
import Reports from '@/components/Reports';
import AdminPanel from '@/components/AdminPanel';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const { language, changeLanguage, t } = useLanguage();

  useEffect(() => {
    checkInitialization();
  }, []);

  // Handle date selection from calendar
  function handleDateSelect(date) {
    setSelectedDate(date);
    setActiveTab('dashboard');
    toast.success(`${t('showingDataFor')} ${date}`);
  }

  async function checkInitialization() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const products = await res.json();
        setIsInitialized(products.length > 0);
      }
    } catch (error) {
      console.error('Error checking initialization:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{t('notInitialized')}</CardTitle>
            <CardDescription>
              {t('sheetNotConfigured')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('runInitScript')}
            </p>
            <code className="block bg-muted p-3 rounded-md text-sm">
              node scripts/setup-existing-sheet.js
            </code>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-orange-600">{t('appTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t('appSubtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{language === 'es' ? 'ES' : 'EN'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => changeLanguage('es')}
                    className={language === 'es' ? 'bg-accent' : ''}
                  >
                    🇪🇸 Español
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => changeLanguage('en')}
                    className={language === 'en' ? 'bg-accent' : ''}
                  >
                    🇬🇧 English
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dashboard')}</span>
            </TabsTrigger>
            <TabsTrigger value="entry" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('newTour')}</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{t('calendar')}</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('reports')}</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </TabsContent>

          <TabsContent value="entry">
            <BatchEntry />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarView onDateSelect={handleDateSelect} />
          </TabsContent>

          <TabsContent value="reports">
            <Reports />
          </TabsContent>

          <TabsContent value="admin">
            <AdminPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
