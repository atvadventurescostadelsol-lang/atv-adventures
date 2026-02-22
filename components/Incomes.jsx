'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Wallet, Car, Truck, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Incomes() {
  const { language } = useLanguage();
  const { canAccessExpenseAccount, getAllowedExpenseAccounts } = useAuth();
  
  // Determine default account based on user permissions
  const allowedAccounts = getAllowedExpenseAccounts();
  const defaultAccount = allowedAccounts && allowedAccounts.length === 1 
    ? allowedAccounts[0] 
    : 'GE';
  
  const canViewGE = canAccessExpenseAccount('GE');
  const canViewES = canAccessExpenseAccount('E&S');
  
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState({ GE: [], 'E&S': [] });
  const [loading, setLoading] = useState(true);
  const [activeAccount, setActiveAccount] = useState(defaultAccount);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [dateFilter, setDateFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  
  const dateLocale = language === 'es' ? es : enUS;
  
  // Form state
  const [newIncome, setNewIncome] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    concept: '',
    notes: '',
    paymentMethod: 'efectivo'
  });

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [incomesRes, categoriesRes] = await Promise.all([
        fetch(`/api/incomes?startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}`),
        fetch('/api/income-categories')
      ]);

      if (incomesRes.ok) {
        const data = await incomesRes.json();
        setIncomes(data);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        // Group by account
        const grouped = { GE: [], 'E&S': [] };
        data.forEach(cat => {
          if (cat.account === 'GE') grouped.GE.push(cat);
          else if (cat.account === 'E&S') grouped['E&S'].push(cat);
        });
        setCategories(grouped);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(language === 'es' ? 'Error al cargar datos' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddIncome() {
    if (!newIncome.amount || !newIncome.concept) {
      toast.error(language === 'es' ? 'Cantidad y concepto son requeridos' : 'Amount and concept are required');
      return;
    }

    try {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newIncome,
          account: activeAccount,
          amount: parseFloat(newIncome.amount),
          paymentMethod: newIncome.paymentMethod
        })
      });

      if (res.ok) {
        toast.success(language === 'es' ? 'Ingreso añadido' : 'Income added');
        setNewIncome({
          date: new Date().toISOString().split('T')[0],
          amount: '',
          concept: '',
          notes: '',
          paymentMethod: 'efectivo'
        });
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error');
      }
    } catch (error) {
      toast.error('Error');
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/incomes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(language === 'es' ? 'Ingreso eliminado' : 'Income deleted');
        loadData();
      }
    } catch (error) {
      toast.error('Error');
    } finally {
      setDeleteDialog({ open: false, id: null });
    }
  }

  function parseNumber(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(',', '.')) || 0;
  }

  function formatCurrency(amount) {
    return `€${parseNumber(amount).toFixed(2)}`;
  }

  function setQuickDateFilter(period) {
    const today = new Date();
    let start, end;
    
    switch(period) {
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'all':
        start = new Date('2020-01-01');
        end = new Date('2030-12-31');
        break;
      default:
        return;
    }
    
    setDateFilter({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    });
  }

  // Filter incomes by account
  const accountIncomes = incomes.filter(i => i.account === activeAccount);
  const totalIncomes = accountIncomes.reduce((sum, i) => sum + parseNumber(i.amount), 0);

  // Group incomes by date
  const incomesByDate = {};
  accountIncomes.forEach(inc => {
    if (!incomesByDate[inc.date]) {
      incomesByDate[inc.date] = [];
    }
    incomesByDate[inc.date].push(inc);
  });

  const sortedDates = Object.keys(incomesByDate).sort((a, b) => b.localeCompare(a));

  // Get totals for both accounts
  const geIncomes = incomes.filter(i => i.account === 'GE');
  const esIncomes = incomes.filter(i => i.account === 'E&S');
  const geTotal = geIncomes.reduce((sum, i) => sum + parseNumber(i.amount), 0);
  const esTotal = esIncomes.reduce((sum, i) => sum + parseNumber(i.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'es' ? '¿Eliminar ingreso?' : 'Delete income?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'es' ? 'Esta acción no se puede deshacer.' : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'es' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => handleDelete(deleteDialog.id)}
            >
              {language === 'es' ? 'Eliminar' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Summary Cards - Only show accessible accounts */}
      <div className={`grid gap-4 ${canViewGE && canViewES ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        {canViewGE && (
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              <CardTitle className="text-lg">GE (Quads)</CardTitle>
            </div>
            <CardDescription className="text-blue-100">
              {language === 'es' ? 'Se suma al efectivo de Quads' : 'Added to Quad cash'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">+{formatCurrency(geTotal)}</div>
            <div className="text-sm text-blue-100 mt-1">
              {geIncomes.length} {language === 'es' ? 'ingresos registrados' : 'incomes recorded'}
            </div>
          </CardContent>
        </Card>
        )}

        {canViewES && (
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              <CardTitle className="text-lg">E&S (Buggies)</CardTitle>
            </div>
            <CardDescription className="text-green-100">
              {language === 'es' ? 'Se suma al efectivo de Buggies' : 'Added to Buggy cash'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">+{formatCurrency(esTotal)}</div>
            <div className="text-sm text-green-100 mt-1">
              {esIncomes.length} {language === 'es' ? 'ingresos registrados' : 'incomes recorded'}
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {language === 'es' ? 'Gestión de Ingresos' : 'Income Management'}
              </CardTitle>
              <CardDescription>
                {language === 'es' 
                  ? 'Registra ingresos manuales para cada cuenta. GE → Quads, E&S → Buggies.' 
                  : 'Record manual incomes for each account. GE → Quads, E&S → Buggies.'}
              </CardDescription>
            </div>
            
            {/* Date Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setQuickDateFilter('month')}>
                {language === 'es' ? 'Este Mes' : 'This Month'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateFilter('all')}>
                {language === 'es' ? 'Todos' : 'All'}
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  className="h-8 w-36"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  className="h-8 w-36"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeAccount} onValueChange={setActiveAccount} className="space-y-4">
            <TabsList className={`grid w-full ${canViewGE && canViewES ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {canViewGE && (
              <TabsTrigger value="GE" className="gap-2">
                <Car className="h-4 w-4" />
                <span className="font-bold">GE</span>
                <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-700">
                  +{formatCurrency(geTotal)}
                </Badge>
              </TabsTrigger>
              )}
              {canViewES && (
              <TabsTrigger value="E&S" className="gap-2">
                <Truck className="h-4 w-4" />
                <span className="font-bold">E&S</span>
                <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-700">
                  +{formatCurrency(esTotal)}
                </Badge>
              </TabsTrigger>
              )}
            </TabsList>

            {['GE', 'E&S'].filter(acc => (acc === 'GE' && canViewGE) || (acc === 'E&S' && canViewES)).map(account => (
              <TabsContent key={account} value={account} className="space-y-4">
                {/* Add Income Form */}
                <Card className={`${account === 'GE' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                  <CardContent className="p-4">
                    <div className="grid gap-4 md:grid-cols-6">
                      <div>
                        <Label>{language === 'es' ? 'Fecha' : 'Date'}</Label>
                        <Input
                          type="date"
                          value={newIncome.date}
                          onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>{language === 'es' ? 'Cantidad (€)' : 'Amount (€)'}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newIncome.amount}
                          onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>{language === 'es' ? 'Concepto' : 'Concept'}</Label>
                        <Select
                          value={newIncome.concept}
                          onValueChange={(value) => setNewIncome({ ...newIncome, concept: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={language === 'es' ? 'Seleccionar...' : 'Select...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories[account]?.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{language === 'es' ? 'Método de Pago' : 'Payment Method'}</Label>
                        <Select
                          value={newIncome.paymentMethod}
                          onValueChange={(value) => setNewIncome({ ...newIncome, paymentMethod: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="efectivo">
                              {language === 'es' ? '💵 Efectivo' : '💵 Cash'}
                            </SelectItem>
                            <SelectItem value="banco">
                              {language === 'es' ? '🏦 Banco' : '🏦 Bank'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{language === 'es' ? 'Notas' : 'Notes'}</Label>
                        <Input
                          placeholder={language === 'es' ? 'Opcional...' : 'Optional...'}
                          value={newIncome.notes}
                          onChange={(e) => setNewIncome({ ...newIncome, notes: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={handleAddIncome} 
                          className={`w-full ${account === 'GE' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {language === 'es' ? 'Añadir' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Incomes List by Date */}
                {sortedDates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'es' ? 'No hay ingresos registrados para este período' : 'No incomes recorded for this period'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedDates.map(date => {
                      const dateIncomes = incomesByDate[date];
                      const dayTotal = dateIncomes.reduce((sum, i) => sum + parseNumber(i.amount), 0);
                      
                      return (
                        <Card key={date}>
                          <CardHeader className="py-3 px-4 bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">
                                  {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: dateLocale })}
                                </span>
                              </div>
                              <Badge variant="default" className="bg-green-600">
                                +{formatCurrency(dayTotal)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{language === 'es' ? 'Concepto' : 'Concept'}</TableHead>
                                  <TableHead>{language === 'es' ? 'Notas' : 'Notes'}</TableHead>
                                  <TableHead className="text-right">{language === 'es' ? 'Cantidad' : 'Amount'}</TableHead>
                                  <TableHead className="w-10"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dateIncomes.map(inc => (
                                  <TableRow key={inc.id}>
                                    <TableCell className="font-medium">{inc.concept}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{inc.notes || '-'}</TableCell>
                                    <TableCell className="text-right font-bold text-green-600">
                                      +{formatCurrency(inc.amount)}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteDialog({ open: true, id: inc.id })}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
