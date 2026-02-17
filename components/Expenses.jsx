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
import { Plus, Trash2, Receipt, Car, Truck, RefreshCw, Calendar, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
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

export default function Expenses() {
  const { language } = useLanguage();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState({ GE: [], 'E&S': [] });
  const [loading, setLoading] = useState(true);
  const [activeAccount, setActiveAccount] = useState('GE');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [dateFilter, setDateFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  
  const dateLocale = language === 'es' ? es : enUS;
  
  // Form state
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    concept: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [expensesRes, categoriesRes] = await Promise.all([
        fetch(`/api/expenses?startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}`),
        fetch('/api/expense-categories')
      ]);

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data);
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

  async function handleAddExpense() {
    if (!newExpense.amount || !newExpense.concept) {
      toast.error(language === 'es' ? 'Cantidad y concepto son requeridos' : 'Amount and concept are required');
      return;
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExpense,
          account: activeAccount,
          amount: parseFloat(newExpense.amount)
        })
      });

      if (res.ok) {
        toast.success(language === 'es' ? 'Gasto añadido' : 'Expense added');
        setNewExpense({
          date: new Date().toISOString().split('T')[0],
          amount: '',
          concept: '',
          notes: ''
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
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(language === 'es' ? 'Gasto eliminado' : 'Expense deleted');
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

  // Filter expenses by account
  const accountExpenses = expenses.filter(e => e.account === activeAccount);
  const totalExpenses = accountExpenses.reduce((sum, e) => sum + parseNumber(e.amount), 0);

  // Group expenses by date
  const expensesByDate = {};
  accountExpenses.forEach(exp => {
    if (!expensesByDate[exp.date]) {
      expensesByDate[exp.date] = [];
    }
    expensesByDate[exp.date].push(exp);
  });

  const sortedDates = Object.keys(expensesByDate).sort((a, b) => b.localeCompare(a));

  // Get totals for both accounts
  const geExpenses = expenses.filter(e => e.account === 'GE');
  const esExpenses = expenses.filter(e => e.account === 'E&S');
  const geTotal = geExpenses.reduce((sum, e) => sum + parseNumber(e.amount), 0);
  const esTotal = esExpenses.reduce((sum, e) => sum + parseNumber(e.amount), 0);

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
            <AlertDialogTitle>{language === 'es' ? '¿Eliminar gasto?' : 'Delete expense?'}</AlertDialogTitle>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              <CardTitle className="text-lg">GE (Quads)</CardTitle>
            </div>
            <CardDescription className="text-blue-100">
              {language === 'es' ? 'Se descuenta del efectivo de Quads' : 'Deducted from Quad cash'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-{formatCurrency(geTotal)}</div>
            <div className="text-sm text-blue-100 mt-1">
              {geExpenses.length} {language === 'es' ? 'gastos registrados' : 'expenses recorded'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              <CardTitle className="text-lg">E&S (Buggies)</CardTitle>
            </div>
            <CardDescription className="text-green-100">
              {language === 'es' ? 'Se descuenta del efectivo de Buggies' : 'Deducted from Buggy cash'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">-{formatCurrency(esTotal)}</div>
            <div className="text-sm text-green-100 mt-1">
              {esExpenses.length} {language === 'es' ? 'gastos registrados' : 'expenses recorded'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {language === 'es' ? 'Gestión de Gastos' : 'Expense Management'}
              </CardTitle>
              <CardDescription>
                {language === 'es' 
                  ? 'Registra gastos para cada cuenta. GE → Quads, E&S → Buggies.' 
                  : 'Record expenses for each account. GE → Quads, E&S → Buggies.'}
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="GE" className="gap-2">
                <Car className="h-4 w-4" />
                <span className="font-bold">GE</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {formatCurrency(geTotal)}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="E&S" className="gap-2">
                <Truck className="h-4 w-4" />
                <span className="font-bold">E&S</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {formatCurrency(esTotal)}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {['GE', 'E&S'].map(account => (
              <TabsContent key={account} value={account} className="space-y-4">
                {/* Add Expense Form */}
                <Card className={`${account === 'GE' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                  <CardContent className="p-4">
                    <div className="grid gap-4 md:grid-cols-5">
                      <div>
                        <Label>{language === 'es' ? 'Fecha' : 'Date'}</Label>
                        <Input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>{language === 'es' ? 'Cantidad (€)' : 'Amount (€)'}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>{language === 'es' ? 'Concepto' : 'Concept'}</Label>
                        <Select
                          value={newExpense.concept}
                          onValueChange={(value) => setNewExpense({ ...newExpense, concept: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={language === 'es' ? 'Seleccionar...' : 'Select...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories[account]?.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{language === 'es' ? 'Notas' : 'Notes'}</Label>
                        <Input
                          placeholder={language === 'es' ? 'Opcional...' : 'Optional...'}
                          value={newExpense.notes}
                          onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleAddExpense} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          {language === 'es' ? 'Añadir Gasto' : 'Add Expense'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <div className={`p-4 rounded-lg ${account === 'GE' ? 'bg-blue-100 border-blue-300' : 'bg-green-100 border-green-300'} border`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingDown className={`h-6 w-6 ${account === 'GE' ? 'text-blue-600' : 'text-green-600'}`} />
                      <div>
                        <h4 className={`font-semibold ${account === 'GE' ? 'text-blue-800' : 'text-green-800'}`}>
                          {language === 'es' ? 'Total Gastos' : 'Total Expenses'} {account}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {accountExpenses.length} {language === 'es' ? 'registros en el período' : 'records in period'}
                        </p>
                      </div>
                    </div>
                    <div className={`text-3xl font-bold ${account === 'GE' ? 'text-blue-700' : 'text-green-700'}`}>
                      -{formatCurrency(totalExpenses)}
                    </div>
                  </div>
                </div>

                {/* Expenses List by Date */}
                {sortedDates.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                    <p className="text-muted-foreground">
                      {language === 'es' ? 'No hay gastos registrados en este período' : 'No expenses recorded in this period'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedDates.map(date => (
                      <Card key={date}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: dateLocale })}
                            </span>
                            <Badge variant="destructive">
                              -{formatCurrency(expensesByDate[date].reduce((sum, e) => sum + parseNumber(e.amount), 0))}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{language === 'es' ? 'Concepto' : 'Concept'}</TableHead>
                                <TableHead>{language === 'es' ? 'Notas' : 'Notes'}</TableHead>
                                <TableHead className="text-right">{language === 'es' ? 'Cantidad' : 'Amount'}</TableHead>
                                <TableHead className="w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {expensesByDate[date].map(exp => (
                                <TableRow key={exp.id}>
                                  <TableCell>
                                    <Badge variant="secondary">{exp.concept}</Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {exp.notes || '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-red-600">
                                    -{formatCurrency(exp.amount)}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-600 hover:text-red-700"
                                      onClick={() => setDeleteDialog({ open: true, id: exp.id })}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}
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
