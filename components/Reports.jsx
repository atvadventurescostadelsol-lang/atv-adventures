'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Search, TrendingUp, TrendingDown, Car, Truck, RefreshCw, Wallet, Building2, Clock, CalendarDays, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);

export default function Reports() {
  const { language, t } = useLanguage();
  const { canAccessCategory, canAccessExpenseAccount } = useAuth();
  
  const canViewQuads = canAccessCategory('quad');
  const canViewBuggies = canAccessCategory('buggy');
  const canViewGE = canAccessExpenseAccount('GE');
  const canViewES = canAccessExpenseAccount('E&S');
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Expense report states
  const [expenseReportStartDate, setExpenseReportStartDate] = useState('');
  const [expenseReportEndDate, setExpenseReportEndDate] = useState('');
  const [expenseReportAccount, setExpenseReportAccount] = useState('all');
  const [expenseReportConcept, setExpenseReportConcept] = useState('all');
  const [expenseReportPaymentMethod, setExpenseReportPaymentMethod] = useState('all');
  const [expenseReportResults, setExpenseReportResults] = useState(null);
  const [expenseReportLoading, setExpenseReportLoading] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState([]);
  
  // Income report states
  const [incomeReportStartDate, setIncomeReportStartDate] = useState('');
  const [incomeReportEndDate, setIncomeReportEndDate] = useState('');
  const [incomeReportAccount, setIncomeReportAccount] = useState('all');
  const [incomeReportConcept, setIncomeReportConcept] = useState('all');
  const [incomeReportPaymentMethod, setIncomeReportPaymentMethod] = useState('all');
  const [incomeReportResults, setIncomeReportResults] = useState(null);
  const [incomeReportLoading, setIncomeReportLoading] = useState(false);
  const [incomeCategories, setIncomeCategories] = useState([]);
  
  const dateLocale = language === 'es' ? es : enUS;
  
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `€${num.toFixed(2)}`;
  };
  
  const parseNumber = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value.replace(',', '.')) || 0;
    return 0;
  };

  // Get date ranges based on selected period
  const getDateRanges = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
    
    const yearStart = format(startOfYear(today), 'yyyy-MM-dd');
    const yearEnd = format(endOfYear(today), 'yyyy-MM-dd');
    
    return {
      today: { start: todayStr, end: todayStr, label: language === 'es' ? 'Hoy' : 'Today' },
      month: { start: monthStart, end: monthEnd, label: format(today, 'MMMM yyyy', { locale: dateLocale }) },
      year: { start: yearStart, end: yearEnd, label: format(today, 'yyyy') },
      custom: { start: customStartDate, end: customEndDate, label: language === 'es' ? 'Personalizado' : 'Custom' }
    };
  };

  // Load report data
  async function loadReport() {
    setLoading(true);
    try {
      const ranges = getDateRanges();
      
      if (selectedPeriod === 'custom' && (!customStartDate || !customEndDate)) {
        toast.error(language === 'es' ? 'Selecciona las fechas' : 'Select dates');
        setLoading(false);
        return;
      }
      
      // Build fetch promises based on what we need
      const fetchPromises = [
        fetch(`/api/departures?startDate=${ranges.today.start}&endDate=${ranges.today.end}`).then(r => r.json()),
        fetch(`/api/departures?startDate=${ranges.month.start}&endDate=${ranges.month.end}`).then(r => r.json()),
        fetch(`/api/departures?startDate=${ranges.year.start}&endDate=${ranges.year.end}`).then(r => r.json()),
        fetch(`/api/expenses?startDate=${ranges.year.start}&endDate=${ranges.year.end}`).then(r => r.json()),
        fetch(`/api/incomes?startDate=${ranges.year.start}&endDate=${ranges.year.end}`).then(r => r.json()),
      ];
      
      // Add custom period fetch if needed
      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        fetchPromises.push(fetch(`/api/departures?startDate=${customStartDate}&endDate=${customEndDate}`).then(r => r.json()));
        fetchPromises.push(fetch(`/api/expenses?startDate=${customStartDate}&endDate=${customEndDate}`).then(r => r.json()));
        fetchPromises.push(fetch(`/api/incomes?startDate=${customStartDate}&endDate=${customEndDate}`).then(r => r.json()));
      }
      
      const results = await Promise.all(fetchPromises);
      const [todayDeps, monthDeps, yearDeps, expenses, incomes] = results;
      const customDeps = results[5] || [];
      const customExpenses = results[6] || [];
      const customIncomes = results[7] || [];
      
      // Filter by permissions
      const filterByPermissions = (data) => {
        if (!Array.isArray(data)) return [];
        return data.filter(d => {
          if (d.category === 'quad' && !canViewQuads) return false;
          if (d.category === 'buggy' && !canViewBuggies) return false;
          return true;
        });
      };
      
      const filterExpensesByPermissions = (data) => {
        if (!Array.isArray(data)) return [];
        return data.filter(e => {
          if (e.account === 'GE' && !canViewGE) return false;
          if (e.account === 'E&S' && !canViewES) return false;
          return true;
        });
      };
      
      // Calculate stats for a period
      const calcStats = (departures) => {
        const filtered = filterByPermissions(departures);
        
        const quadDeps = filtered.filter(d => d.category === 'quad');
        const buggyDeps = filtered.filter(d => d.category === 'buggy');
        
        return {
          quads: {
            cash: quadDeps.reduce((sum, d) => sum + parseNumber(d.paymentSplitCash), 0),
            bank: quadDeps.reduce((sum, d) => sum + parseNumber(d.paymentSplitBank) + parseNumber(d.paymentSplitWeb), 0),
            gyg: quadDeps.reduce((sum, d) => sum + parseNumber(d.paymentSplitGyg), 0),
            cruise: quadDeps.reduce((sum, d) => sum + parseNumber(d.paymentSplitCruise), 0),
            total: quadDeps.reduce((sum, d) => sum + parseNumber(d.totalGross), 0),
            count: quadDeps.length,
          },
          buggies: {
            cash: buggyDeps.reduce((sum, d) => sum + parseNumber(d.paymentSplitCash), 0),
            bank: buggyDeps.reduce((sum, d) => sum + parseNumber(d.paymentSplitBank) + parseNumber(d.paymentSplitWeb), 0),
            gyg: buggyDeps.reduce((sum, d) => sum + parseNumber(d.paymentSplitGyg), 0),
            cruise: buggyDeps.reduce((sum, d) => sum + parseNumber(d.paymentSplitCruise), 0),
            total: buggyDeps.reduce((sum, d) => sum + parseNumber(d.totalGross), 0),
            count: buggyDeps.length,
          }
        };
      };
      
      // Calculate expense stats
      const calcExpenseStats = (expenseData, period) => {
        const ranges = getDateRanges();
        const range = ranges[period];
        const filtered = filterExpensesByPermissions(expenseData).filter(e => 
          e.date >= range.start && e.date <= range.end
        );
        
        return {
          GE: {
            cash: filtered.filter(e => e.account === 'GE' && e.paymentMethod !== 'banco').reduce((s, e) => s + parseNumber(e.amount), 0),
            bank: filtered.filter(e => e.account === 'GE' && e.paymentMethod === 'banco').reduce((s, e) => s + parseNumber(e.amount), 0),
          },
          'E&S': {
            cash: filtered.filter(e => e.account === 'E&S' && e.paymentMethod !== 'banco').reduce((s, e) => s + parseNumber(e.amount), 0),
            bank: filtered.filter(e => e.account === 'E&S' && e.paymentMethod === 'banco').reduce((s, e) => s + parseNumber(e.amount), 0),
          }
        };
      };
      
      // Calculate income stats
      const calcIncomeStats = (incomeData, period) => {
        const ranges = getDateRanges();
        const range = ranges[period];
        if (!range || !range.start || !range.end) {
          return { GE: { cash: 0, bank: 0 }, 'E&S': { cash: 0, bank: 0 } };
        }
        const filtered = filterExpensesByPermissions(incomeData).filter(i => 
          i.date >= range.start && i.date <= range.end
        );
        
        return {
          GE: {
            cash: filtered.filter(i => i.account === 'GE' && i.paymentMethod !== 'banco').reduce((s, i) => s + parseNumber(i.amount), 0),
            bank: filtered.filter(i => i.account === 'GE' && i.paymentMethod === 'banco').reduce((s, i) => s + parseNumber(i.amount), 0),
          },
          'E&S': {
            cash: filtered.filter(i => i.account === 'E&S' && i.paymentMethod !== 'banco').reduce((s, i) => s + parseNumber(i.amount), 0),
            bank: filtered.filter(i => i.account === 'E&S' && i.paymentMethod === 'banco').reduce((s, i) => s + parseNumber(i.amount), 0),
          }
        };
      };
      
      // Calculate custom period expense stats directly from fetched data
      const calcCustomExpenseStats = (expenseData) => {
        const filtered = filterExpensesByPermissions(expenseData);
        return {
          GE: {
            cash: filtered.filter(e => e.account === 'GE' && e.paymentMethod !== 'banco').reduce((s, e) => s + parseNumber(e.amount), 0),
            bank: filtered.filter(e => e.account === 'GE' && e.paymentMethod === 'banco').reduce((s, e) => s + parseNumber(e.amount), 0),
          },
          'E&S': {
            cash: filtered.filter(e => e.account === 'E&S' && e.paymentMethod !== 'banco').reduce((s, e) => s + parseNumber(e.amount), 0),
            bank: filtered.filter(e => e.account === 'E&S' && e.paymentMethod === 'banco').reduce((s, e) => s + parseNumber(e.amount), 0),
          }
        };
      };
      
      // Calculate custom period income stats directly from fetched data
      const calcCustomIncomeStats = (incomeData) => {
        const filtered = filterExpensesByPermissions(incomeData);
        return {
          GE: {
            cash: filtered.filter(i => i.account === 'GE' && i.paymentMethod !== 'banco').reduce((s, i) => s + parseNumber(i.amount), 0),
            bank: filtered.filter(i => i.account === 'GE' && i.paymentMethod === 'banco').reduce((s, i) => s + parseNumber(i.amount), 0),
          },
          'E&S': {
            cash: filtered.filter(i => i.account === 'E&S' && i.paymentMethod !== 'banco').reduce((s, i) => s + parseNumber(i.amount), 0),
            bank: filtered.filter(i => i.account === 'E&S' && i.paymentMethod === 'banco').reduce((s, i) => s + parseNumber(i.amount), 0),
          }
        };
      };
      
      // Build the report data object
      const reportDataObj = {
        periods: {
          today: calcStats(todayDeps),
          month: calcStats(monthDeps),
          year: calcStats(yearDeps),
        },
        expenses: {
          today: calcExpenseStats(expenses, 'today'),
          month: calcExpenseStats(expenses, 'month'),
          year: calcExpenseStats(expenses, 'year'),
        },
        incomes: {
          today: calcIncomeStats(incomes, 'today'),
          month: calcIncomeStats(incomes, 'month'),
          year: calcIncomeStats(incomes, 'year'),
        },
        rawExpenses: filterExpensesByPermissions(expenses),
        rawIncomes: filterExpensesByPermissions(incomes),
        labels: getDateRanges(),
      };
      
      // Add custom period data if applicable
      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        reportDataObj.periods.custom = calcStats(customDeps);
        reportDataObj.expenses.custom = calcCustomExpenseStats(customExpenses);
        reportDataObj.incomes.custom = calcCustomIncomeStats(customIncomes);
        reportDataObj.labels.custom = { 
          start: customStartDate, 
          end: customEndDate, 
          label: `${format(new Date(customStartDate), 'dd/MM/yyyy')} - ${format(new Date(customEndDate), 'dd/MM/yyyy')}` 
        };
      }
      
      setReportData(reportDataObj);
      
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error(language === 'es' ? 'Error al cargar el informe' : 'Error loading report');
    } finally {
      setLoading(false);
    }
  }
  
  // Load expense and income categories
  async function loadCategories() {
    try {
      const [expCatRes, incCatRes] = await Promise.all([
        fetch('/api/expense-categories'),
        fetch('/api/income-categories')
      ]);
      if (expCatRes.ok) {
        const data = await expCatRes.json();
        setExpenseCategories(data);
      }
      if (incCatRes.ok) {
        const data = await incCatRes.json();
        setIncomeCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }
  
  // Generate expense-only report
  async function generateExpenseReport() {
    if (!expenseReportStartDate || !expenseReportEndDate) {
      toast.error(language === 'es' ? 'Selecciona las fechas' : 'Select dates');
      return;
    }
    
    setExpenseReportLoading(true);
    try {
      const res = await fetch(`/api/expenses?startDate=${expenseReportStartDate}&endDate=${expenseReportEndDate}`);
      if (res.ok) {
        let data = await res.json();
        
        // Filter by permissions
        data = data.filter(e => {
          if (e.account === 'GE' && !canViewGE) return false;
          if (e.account === 'E&S' && !canViewES) return false;
          return true;
        });
        
        // Apply filters
        if (expenseReportAccount !== 'all') {
          data = data.filter(e => e.account === expenseReportAccount);
        }
        if (expenseReportConcept !== 'all') {
          data = data.filter(e => e.concept === expenseReportConcept);
        }
        if (expenseReportPaymentMethod !== 'all') {
          data = data.filter(e => (e.paymentMethod || 'efectivo') === expenseReportPaymentMethod);
        }
        
        // Calculate totals
        const byAccount = { GE: { cash: 0, bank: 0 }, 'E&S': { cash: 0, bank: 0 } };
        const byConcept = {};
        
        data.forEach(e => {
          const amount = parseNumber(e.amount);
          const method = e.paymentMethod || 'efectivo';
          if (method === 'banco') {
            byAccount[e.account].bank += amount;
          } else {
            byAccount[e.account].cash += amount;
          }
          if (!byConcept[e.concept]) byConcept[e.concept] = 0;
          byConcept[e.concept] += amount;
        });
        
        const total = Object.values(byAccount).reduce((sum, acc) => sum + acc.cash + acc.bank, 0);
        
        setExpenseReportResults({
          data,
          byAccount,
          byConcept,
          total,
          filters: {
            startDate: expenseReportStartDate,
            endDate: expenseReportEndDate,
            account: expenseReportAccount,
            concept: expenseReportConcept,
            paymentMethod: expenseReportPaymentMethod
          }
        });
      }
    } catch (error) {
      toast.error('Error');
    } finally {
      setExpenseReportLoading(false);
    }
  }
  
  // Generate income-only report
  async function generateIncomeReport() {
    if (!incomeReportStartDate || !incomeReportEndDate) {
      toast.error(language === 'es' ? 'Selecciona las fechas' : 'Select dates');
      return;
    }
    
    setIncomeReportLoading(true);
    try {
      const res = await fetch(`/api/incomes?startDate=${incomeReportStartDate}&endDate=${incomeReportEndDate}`);
      if (res.ok) {
        let data = await res.json();
        
        // Filter by permissions
        data = data.filter(i => {
          if (i.account === 'GE' && !canViewGE) return false;
          if (i.account === 'E&S' && !canViewES) return false;
          return true;
        });
        
        // Apply filters
        if (incomeReportAccount !== 'all') {
          data = data.filter(i => i.account === incomeReportAccount);
        }
        if (incomeReportConcept !== 'all') {
          data = data.filter(i => i.concept === incomeReportConcept);
        }
        if (incomeReportPaymentMethod !== 'all') {
          data = data.filter(i => (i.paymentMethod || 'efectivo') === incomeReportPaymentMethod);
        }
        
        // Calculate totals
        const byAccount = { GE: { cash: 0, bank: 0 }, 'E&S': { cash: 0, bank: 0 } };
        const byConcept = {};
        
        data.forEach(i => {
          const amount = parseNumber(i.amount);
          const method = i.paymentMethod || 'efectivo';
          if (method === 'banco') {
            byAccount[i.account].bank += amount;
          } else {
            byAccount[i.account].cash += amount;
          }
          if (!byConcept[i.concept]) byConcept[i.concept] = 0;
          byConcept[i.concept] += amount;
        });
        
        const total = Object.values(byAccount).reduce((sum, acc) => sum + acc.cash + acc.bank, 0);
        
        setIncomeReportResults({
          data,
          byAccount,
          byConcept,
          total,
          filters: {
            startDate: incomeReportStartDate,
            endDate: incomeReportEndDate,
            account: incomeReportAccount,
            concept: incomeReportConcept,
            paymentMethod: incomeReportPaymentMethod
          }
        });
      }
    } catch (error) {
      toast.error('Error');
    } finally {
      setIncomeReportLoading(false);
    }
  }
  
  useEffect(() => {
    loadReport();
    loadCategories();
  }, []);
  
  // Get unique concepts for filters
  const getExpenseConcepts = () => {
    const concepts = new Set();
    expenseCategories.forEach(c => concepts.add(c.name));
    return Array.from(concepts);
  };
  
  const getIncomeConcepts = () => {
    const concepts = new Set();
    incomeCategories.forEach(c => concepts.add(c.name));
    return Array.from(concepts);
  };
  
  // Calculate balance for each account
  const calculateBalance = (period) => {
    if (!reportData || !reportData.periods[period]) return null;
    
    const sales = reportData.periods[period];
    const exp = reportData.expenses[period];
    const inc = reportData.incomes[period];
    
    if (!sales || !exp || !inc) return null;
    
    return {
      quads: {
        cashIn: sales.quads.cash + inc.GE.cash,
        cashOut: exp.GE.cash,
        cashNet: sales.quads.cash + inc.GE.cash - exp.GE.cash,
        bankIn: sales.quads.bank + inc.GE.bank,
        bankOut: exp.GE.bank,
        bankNet: sales.quads.bank + inc.GE.bank - exp.GE.bank,
      },
      buggies: {
        cashIn: sales.buggies.cash + inc['E&S'].cash,
        cashOut: exp['E&S'].cash,
        cashNet: sales.buggies.cash + inc['E&S'].cash - exp['E&S'].cash,
        bankIn: sales.buggies.bank + inc['E&S'].bank,
        bankOut: exp['E&S'].bank,
        bankNet: sales.buggies.bank + inc['E&S'].bank - exp['E&S'].bank,
      }
    };
  };

  // Export to PDF
  const exportPDF = () => {
    if (!reportData) return;
    
    const doc = new jsPDF();
    const balance = calculateBalance(selectedPeriod);
    const label = reportData.labels[selectedPeriod].label;
    
    doc.setFontSize(18);
    doc.text(language === 'es' ? 'Informe Financiero' : 'Financial Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`${language === 'es' ? 'Período' : 'Period'}: ${label}`, 14, 30);
    doc.text(`${language === 'es' ? 'Generado' : 'Generated'}: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 37);
    
    let y = 50;
    
    // Quads Section
    if (canViewQuads) {
      doc.setFontSize(14);
      doc.text('QUADS (GE)', 14, y);
      y += 10;
      
      doc.autoTable({
        startY: y,
        head: [[language === 'es' ? 'Concepto' : 'Concept', language === 'es' ? 'Efectivo' : 'Cash', language === 'es' ? 'Banco' : 'Bank']],
        body: [
          [language === 'es' ? 'Ventas Tours' : 'Tour Sales', formatCurrency(reportData.periods[selectedPeriod].quads.cash), formatCurrency(reportData.periods[selectedPeriod].quads.bank)],
          [language === 'es' ? 'Ingresos Extra' : 'Extra Income', formatCurrency(reportData.incomes[selectedPeriod].GE.cash), formatCurrency(reportData.incomes[selectedPeriod].GE.bank)],
          [language === 'es' ? 'Gastos' : 'Expenses', `-${formatCurrency(reportData.expenses[selectedPeriod].GE.cash)}`, `-${formatCurrency(reportData.expenses[selectedPeriod].GE.bank)}`],
          [language === 'es' ? 'BALANCE' : 'BALANCE', formatCurrency(balance.quads.cashNet), formatCurrency(balance.quads.bankNet)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      y = doc.lastAutoTable.finalY + 15;
    }
    
    // Buggies Section
    if (canViewBuggies) {
      doc.setFontSize(14);
      doc.text('BUGGIES (E&S)', 14, y);
      y += 10;
      
      doc.autoTable({
        startY: y,
        head: [[language === 'es' ? 'Concepto' : 'Concept', language === 'es' ? 'Efectivo' : 'Cash', language === 'es' ? 'Banco' : 'Bank']],
        body: [
          [language === 'es' ? 'Ventas Tours' : 'Tour Sales', formatCurrency(reportData.periods[selectedPeriod].buggies.cash), formatCurrency(reportData.periods[selectedPeriod].buggies.bank)],
          [language === 'es' ? 'Ingresos Extra' : 'Extra Income', formatCurrency(reportData.incomes[selectedPeriod]['E&S'].cash), formatCurrency(reportData.incomes[selectedPeriod]['E&S'].bank)],
          [language === 'es' ? 'Gastos' : 'Expenses', `-${formatCurrency(reportData.expenses[selectedPeriod]['E&S'].cash)}`, `-${formatCurrency(reportData.expenses[selectedPeriod]['E&S'].bank)}`],
          [language === 'es' ? 'BALANCE' : 'BALANCE', formatCurrency(balance.buggies.cashNet), formatCurrency(balance.buggies.bankNet)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] },
      });
      
      y = doc.lastAutoTable.finalY + 15;
    }
    
    // Pending payments
    const pendingQuads = reportData.periods[selectedPeriod].quads;
    const pendingBuggies = reportData.periods[selectedPeriod].buggies;
    
    if (pendingQuads.gyg + pendingQuads.cruise + pendingBuggies.gyg + pendingBuggies.cruise > 0) {
      doc.setFontSize(14);
      doc.text(language === 'es' ? 'PENDIENTES DE COBRO' : 'PENDING PAYMENTS', 14, y);
      y += 10;
      
      doc.autoTable({
        startY: y,
        head: [[language === 'es' ? 'Concepto' : 'Concept', 'Quads (GE)', 'Buggies (E&S)', 'Total']],
        body: [
          ['GYG', formatCurrency(pendingQuads.gyg), formatCurrency(pendingBuggies.gyg), formatCurrency(pendingQuads.gyg + pendingBuggies.gyg)],
          [language === 'es' ? 'Cruceros' : 'Cruises', formatCurrency(pendingQuads.cruise), formatCurrency(pendingBuggies.cruise), formatCurrency(pendingQuads.cruise + pendingBuggies.cruise)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [234, 179, 8] },
      });
    }
    
    doc.save(`informe_${selectedPeriod}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast.success(language === 'es' ? 'PDF descargado' : 'PDF downloaded');
  };

  if (loading && !reportData) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  const balance = calculateBalance(selectedPeriod);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{language === 'es' ? '📊 Informes Financieros' : '📊 Financial Reports'}</h2>
          <p className="text-muted-foreground">{language === 'es' ? 'Resumen completo de ventas, gastos e ingresos' : 'Complete summary of sales, expenses and incomes'}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={loadReport} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {language === 'es' ? 'Actualizar' : 'Refresh'}
          </Button>
          <Button onClick={exportPDF} disabled={!reportData}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <Label className="font-semibold">{language === 'es' ? 'Período:' : 'Period:'}</Label>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={selectedPeriod === 'today' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => { setSelectedPeriod('today'); }}
              >
                <Clock className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Hoy' : 'Today'}
              </Button>
              <Button 
                variant={selectedPeriod === 'month' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => { setSelectedPeriod('month'); }}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Este Mes' : 'This Month'}
              </Button>
              <Button 
                variant={selectedPeriod === 'year' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => { setSelectedPeriod('year'); }}
              >
                <CalendarRange className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Este Año' : 'This Year'}
              </Button>
              <Button 
                variant={selectedPeriod === 'custom' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => { setSelectedPeriod('custom'); }}
              >
                <Search className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Personalizado' : 'Custom'}
              </Button>
            </div>
          </div>
          
          {/* Custom Date Range */}
          {selectedPeriod === 'custom' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label className="text-sm">{language === 'es' ? 'Desde' : 'From'}</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="mt-1 w-40"
                  />
                </div>
                <div>
                  <Label className="text-sm">{language === 'es' ? 'Hasta' : 'To'}</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="mt-1 w-40"
                  />
                </div>
                <Button 
                  onClick={loadReport} 
                  disabled={!customStartDate || !customEndDate || loading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  {language === 'es' ? 'Generar Informe' : 'Generate Report'}
                </Button>
              </div>
              {customStartDate && customEndDate && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {language === 'es' ? 'Período seleccionado:' : 'Selected period:'} {format(new Date(customStartDate), 'dd/MM/yyyy')} - {format(new Date(customEndDate), 'dd/MM/yyyy')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Sales Summary - 3 Periods */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                {language === 'es' ? '💰 Ventas por Tours' : '💰 Tour Sales'}
              </CardTitle>
              <CardDescription>{language === 'es' ? 'Ingresos de tours por efectivo y banco' : 'Tour income by cash and bank'}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">{language === 'es' ? 'Período' : 'Period'}</TableHead>
                      {canViewQuads && (
                        <>
                          <TableHead className="text-center text-blue-700">
                            <div className="flex items-center justify-center gap-1">
                              <Car className="h-4 w-4" />
                              Quads 💵
                            </div>
                          </TableHead>
                          <TableHead className="text-center text-blue-700">
                            <div className="flex items-center justify-center gap-1">
                              <Car className="h-4 w-4" />
                              Quads 🏦
                            </div>
                          </TableHead>
                        </>
                      )}
                      {canViewBuggies && (
                        <>
                          <TableHead className="text-center text-green-700">
                            <div className="flex items-center justify-center gap-1">
                              <Truck className="h-4 w-4" />
                              Buggies 💵
                            </div>
                          </TableHead>
                          <TableHead className="text-center text-green-700">
                            <div className="flex items-center justify-center gap-1">
                              <Truck className="h-4 w-4" />
                              Buggies 🏦
                            </div>
                          </TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {['today', 'month', 'year'].map((period) => (
                      <TableRow key={period} className={selectedPeriod === period ? 'bg-orange-50' : ''}>
                        <TableCell className="font-medium">
                          <Badge variant={selectedPeriod === period ? 'default' : 'outline'}>
                            {reportData.labels[period].label}
                          </Badge>
                        </TableCell>
                        {canViewQuads && (
                          <>
                            <TableCell className="text-center font-semibold text-blue-600">
                              {formatCurrency(reportData.periods[period].quads.cash)}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-blue-600">
                              {formatCurrency(reportData.periods[period].quads.bank)}
                            </TableCell>
                          </>
                        )}
                        {canViewBuggies && (
                          <>
                            <TableCell className="text-center font-semibold text-green-600">
                              {formatCurrency(reportData.periods[period].buggies.cash)}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-green-600">
                              {formatCurrency(reportData.periods[period].buggies.bank)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* VAT Breakdown Section */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200">
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Building2 className="h-5 w-5" />
                {language === 'es' ? '🧾 Desglose Fiscal (IVA 21%)' : '🧾 Tax Breakdown (VAT 21%)'}
              </CardTitle>
              <CardDescription>{language === 'es' ? `Período: ${reportData.labels[selectedPeriod].label}` : `Period: ${reportData.labels[selectedPeriod].label}`}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {(() => {
                const quadsTotal = reportData.periods[selectedPeriod].quads.total;
                const quadsNet = quadsTotal / 1.21;
                const quadsVat = quadsTotal - quadsNet;
                const quadsCash = reportData.periods[selectedPeriod].quads.cash;
                const quadsCashVat = quadsCash - (quadsCash / 1.21);
                const quadsVatNoCash = quadsVat - quadsCashVat;
                
                const buggiesTotal = reportData.periods[selectedPeriod].buggies.total;
                const buggiesNet = buggiesTotal / 1.21;
                const buggiesVat = buggiesTotal - buggiesNet;
                const buggiesCash = reportData.periods[selectedPeriod].buggies.cash;
                const buggiesCashVat = buggiesCash - (buggiesCash / 1.21);
                const buggiesVatNoCash = buggiesVat - buggiesCashVat;
                
                const totalGross = quadsTotal + buggiesTotal;
                const totalNet = quadsNet + buggiesNet;
                const totalVat = quadsVat + buggiesVat;
                const totalVatNoCash = quadsVatNoCash + buggiesVatNoCash;
                
                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-purple-50">
                          <TableHead className="font-bold">{language === 'es' ? 'Concepto' : 'Concept'}</TableHead>
                          {canViewQuads && <TableHead className="text-center text-blue-700">Quads (GE)</TableHead>}
                          {canViewBuggies && <TableHead className="text-center text-green-700">Buggies (E&S)</TableHead>}
                          {canViewQuads && canViewBuggies && <TableHead className="text-center font-bold">TOTAL</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">{language === 'es' ? '💰 Bruto (con IVA)' : '💰 Gross (with VAT)'}</TableCell>
                          {canViewQuads && <TableCell className="text-center font-semibold">{formatCurrency(quadsTotal)}</TableCell>}
                          {canViewBuggies && <TableCell className="text-center font-semibold">{formatCurrency(buggiesTotal)}</TableCell>}
                          {canViewQuads && canViewBuggies && <TableCell className="text-center font-bold text-purple-700">{formatCurrency(totalGross)}</TableCell>}
                        </TableRow>
                        <TableRow className="bg-gray-50">
                          <TableCell className="font-medium">{language === 'es' ? '📊 Neto (sin IVA)' : '📊 Net (without VAT)'}</TableCell>
                          {canViewQuads && <TableCell className="text-center">{formatCurrency(quadsNet)}</TableCell>}
                          {canViewBuggies && <TableCell className="text-center">{formatCurrency(buggiesNet)}</TableCell>}
                          {canViewQuads && canViewBuggies && <TableCell className="text-center font-bold">{formatCurrency(totalNet)}</TableCell>}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">{language === 'es' ? '🏛️ IVA Total (21%)' : '🏛️ Total VAT (21%)'}</TableCell>
                          {canViewQuads && <TableCell className="text-center text-purple-600">{formatCurrency(quadsVat)}</TableCell>}
                          {canViewBuggies && <TableCell className="text-center text-purple-600">{formatCurrency(buggiesVat)}</TableCell>}
                          {canViewQuads && canViewBuggies && <TableCell className="text-center font-bold text-purple-700">{formatCurrency(totalVat)}</TableCell>}
                        </TableRow>
                        <TableRow className="bg-amber-50 border-t-2 border-amber-300">
                          <TableCell className="font-medium">
                            <div>{language === 'es' ? '⚡ IVA sin Efectivo' : '⚡ VAT without Cash'}</div>
                            <div className="text-xs text-muted-foreground">{language === 'es' ? '(IVA a declarar)' : '(VAT to declare)'}</div>
                          </TableCell>
                          {canViewQuads && <TableCell className="text-center font-bold text-amber-700">{formatCurrency(quadsVatNoCash)}</TableCell>}
                          {canViewBuggies && <TableCell className="text-center font-bold text-amber-700">{formatCurrency(buggiesVatNoCash)}</TableCell>}
                          {canViewQuads && canViewBuggies && <TableCell className="text-center font-bold text-amber-800 text-lg">{formatCurrency(totalVatNoCash)}</TableCell>}
                        </TableRow>
                      </TableBody>
                    </Table>
                    
                    {/* Summary cards */}
                    <div className="grid md:grid-cols-3 gap-4 mt-6">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 border border-purple-300">
                        <div className="text-sm text-purple-600">{language === 'es' ? 'IVA Total' : 'Total VAT'}</div>
                        <div className="text-2xl font-bold text-purple-800">{formatCurrency((canViewQuads ? quadsVat : 0) + (canViewBuggies ? buggiesVat : 0))}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-green-100 to-green-200 border border-green-300">
                        <div className="text-sm text-green-600">{language === 'es' ? 'IVA del Efectivo' : 'Cash VAT'}</div>
                        <div className="text-2xl font-bold text-green-800">{formatCurrency((canViewQuads ? quadsCashVat : 0) + (canViewBuggies ? buggiesCashVat : 0))}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300">
                        <div className="text-sm text-amber-600">{language === 'es' ? 'IVA a Declarar' : 'VAT to Declare'}</div>
                        <div className="text-2xl font-bold text-amber-800">{formatCurrency((canViewQuads ? quadsVatNoCash : 0) + (canViewBuggies ? buggiesVatNoCash : 0))}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Pending Payments */}
          {(reportData.periods[selectedPeriod].quads.gyg + reportData.periods[selectedPeriod].quads.cruise + 
            reportData.periods[selectedPeriod].buggies.gyg + reportData.periods[selectedPeriod].buggies.cruise) > 0 && (
            <Card className="border-2 border-yellow-200">
              <CardHeader className="bg-yellow-50 border-b border-yellow-200">
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <Clock className="h-5 w-5" />
                  {language === 'es' ? '⏳ Pendientes de Cobro' : '⏳ Pending Payments'}
                </CardTitle>
                <CardDescription>{language === 'es' ? 'Pagos pendientes de GYG y Cruceros' : 'Pending payments from GYG and Cruises'}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {canViewQuads && reportData.periods[selectedPeriod].quads.gyg > 0 && (
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="text-sm text-blue-600 flex items-center gap-1">
                        <Car className="h-4 w-4" /> Quads - GYG
                      </div>
                      <div className="text-2xl font-bold text-blue-700">{formatCurrency(reportData.periods[selectedPeriod].quads.gyg)}</div>
                    </div>
                  )}
                  {canViewQuads && reportData.periods[selectedPeriod].quads.cruise > 0 && (
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="text-sm text-blue-600 flex items-center gap-1">
                        <Car className="h-4 w-4" /> Quads - {language === 'es' ? 'Cruceros' : 'Cruises'}
                      </div>
                      <div className="text-2xl font-bold text-blue-700">{formatCurrency(reportData.periods[selectedPeriod].quads.cruise)}</div>
                    </div>
                  )}
                  {canViewBuggies && reportData.periods[selectedPeriod].buggies.gyg > 0 && (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <Truck className="h-4 w-4" /> Buggies - GYG
                      </div>
                      <div className="text-2xl font-bold text-green-700">{formatCurrency(reportData.periods[selectedPeriod].buggies.gyg)}</div>
                    </div>
                  )}
                  {canViewBuggies && reportData.periods[selectedPeriod].buggies.cruise > 0 && (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <Truck className="h-4 w-4" /> Buggies - {language === 'es' ? 'Cruceros' : 'Cruises'}
                      </div>
                      <div className="text-2xl font-bold text-green-700">{formatCurrency(reportData.periods[selectedPeriod].buggies.cruise)}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expenses Summary */}
          <Card className="border-2 border-red-200">
            <CardHeader className="bg-red-50 border-b border-red-200">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <TrendingDown className="h-5 w-5" />
                {language === 'es' ? '💸 Gastos' : '💸 Expenses'}
              </CardTitle>
              <CardDescription>{language === 'es' ? `Período: ${reportData.labels[selectedPeriod].label}` : `Period: ${reportData.labels[selectedPeriod].label}`}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                {canViewGE && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                    <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-4">
                      <Car className="h-5 w-5" /> GE (Quads)
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">💵 {language === 'es' ? 'Efectivo' : 'Cash'}</span>
                        <span className="font-bold text-red-600">-{formatCurrency(reportData.expenses[selectedPeriod].GE.cash)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">🏦 {language === 'es' ? 'Banco' : 'Bank'}</span>
                        <span className="font-bold text-red-600">-{formatCurrency(reportData.expenses[selectedPeriod].GE.bank)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between items-center">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-red-700 text-lg">
                          -{formatCurrency(reportData.expenses[selectedPeriod].GE.cash + reportData.expenses[selectedPeriod].GE.bank)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {canViewES && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                    <h4 className="font-bold text-green-800 flex items-center gap-2 mb-4">
                      <Truck className="h-5 w-5" /> E&S (Buggies)
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">💵 {language === 'es' ? 'Efectivo' : 'Cash'}</span>
                        <span className="font-bold text-red-600">-{formatCurrency(reportData.expenses[selectedPeriod]['E&S'].cash)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">🏦 {language === 'es' ? 'Banco' : 'Bank'}</span>
                        <span className="font-bold text-red-600">-{formatCurrency(reportData.expenses[selectedPeriod]['E&S'].bank)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between items-center">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-red-700 text-lg">
                          -{formatCurrency(reportData.expenses[selectedPeriod]['E&S'].cash + reportData.expenses[selectedPeriod]['E&S'].bank)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* BALANCE - Most Important Section */}
          <Card className="border-4 border-orange-400 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Wallet className="h-6 w-6" />
                {language === 'es' ? '💰 BALANCE REAL - CAJA Y BANCO' : '💰 REAL BALANCE - CASH & BANK'}
              </CardTitle>
              <CardDescription className="text-orange-100">
                {language === 'es' ? `Período: ${reportData.labels[selectedPeriod].label}` : `Period: ${reportData.labels[selectedPeriod].label}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {balance && (
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Quads Balance */}
                  {canViewQuads && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-blue-700 flex items-center gap-2 border-b pb-2">
                        <Car className="h-6 w-6" /> QUADS (GE)
                      </h3>
                      
                      {/* Cash Box */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-300">
                        <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                          💵 {language === 'es' ? 'CAJA EFECTIVO' : 'CASH BOX'}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-700">(+) {language === 'es' ? 'Ventas Tours' : 'Tour Sales'}</span>
                            <span className="font-medium text-green-600">{formatCurrency(reportData.periods[selectedPeriod].quads.cash)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">(+) {language === 'es' ? 'Ingresos Extra' : 'Extra Income'}</span>
                            <span className="font-medium text-green-600">{formatCurrency(reportData.incomes[selectedPeriod].GE.cash)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-700">(-) {language === 'es' ? 'Gastos' : 'Expenses'}</span>
                            <span className="font-medium text-red-600">-{formatCurrency(reportData.expenses[selectedPeriod].GE.cash)}</span>
                          </div>
                          <div className="border-t-2 border-green-400 pt-2 mt-2 flex justify-between">
                            <span className="font-bold text-lg">=</span>
                            <span className={`font-bold text-2xl ${balance.quads.cashNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {formatCurrency(balance.quads.cashNet)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bank */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-300">
                        <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                          🏦 {language === 'es' ? 'BANCO' : 'BANK'}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">(+) {language === 'es' ? 'Ventas Tours' : 'Tour Sales'}</span>
                            <span className="font-medium text-blue-600">{formatCurrency(reportData.periods[selectedPeriod].quads.bank)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">(+) {language === 'es' ? 'Ingresos Extra' : 'Extra Income'}</span>
                            <span className="font-medium text-blue-600">{formatCurrency(reportData.incomes[selectedPeriod].GE.bank)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-700">(-) {language === 'es' ? 'Gastos' : 'Expenses'}</span>
                            <span className="font-medium text-red-600">-{formatCurrency(reportData.expenses[selectedPeriod].GE.bank)}</span>
                          </div>
                          <div className="border-t-2 border-blue-400 pt-2 mt-2 flex justify-between">
                            <span className="font-bold text-lg">=</span>
                            <span className={`font-bold text-2xl ${balance.quads.bankNet >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                              {formatCurrency(balance.quads.bankNet)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Buggies Balance */}
                  {canViewBuggies && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-green-700 flex items-center gap-2 border-b pb-2">
                        <Truck className="h-6 w-6" /> BUGGIES (E&S)
                      </h3>
                      
                      {/* Cash Box */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-300">
                        <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                          💵 {language === 'es' ? 'CAJA EFECTIVO' : 'CASH BOX'}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-700">(+) {language === 'es' ? 'Ventas Tours' : 'Tour Sales'}</span>
                            <span className="font-medium text-green-600">{formatCurrency(reportData.periods[selectedPeriod].buggies.cash)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">(+) {language === 'es' ? 'Ingresos Extra' : 'Extra Income'}</span>
                            <span className="font-medium text-green-600">{formatCurrency(reportData.incomes[selectedPeriod]['E&S'].cash)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-700">(-) {language === 'es' ? 'Gastos' : 'Expenses'}</span>
                            <span className="font-medium text-red-600">-{formatCurrency(reportData.expenses[selectedPeriod]['E&S'].cash)}</span>
                          </div>
                          <div className="border-t-2 border-green-400 pt-2 mt-2 flex justify-between">
                            <span className="font-bold text-lg">=</span>
                            <span className={`font-bold text-2xl ${balance.buggies.cashNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {formatCurrency(balance.buggies.cashNet)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bank */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-300">
                        <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                          🏦 {language === 'es' ? 'BANCO' : 'BANK'}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">(+) {language === 'es' ? 'Ventas Tours' : 'Tour Sales'}</span>
                            <span className="font-medium text-blue-600">{formatCurrency(reportData.periods[selectedPeriod].buggies.bank)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">(+) {language === 'es' ? 'Ingresos Extra' : 'Extra Income'}</span>
                            <span className="font-medium text-blue-600">{formatCurrency(reportData.incomes[selectedPeriod]['E&S'].bank)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-700">(-) {language === 'es' ? 'Gastos' : 'Expenses'}</span>
                            <span className="font-medium text-red-600">-{formatCurrency(reportData.expenses[selectedPeriod]['E&S'].bank)}</span>
                          </div>
                          <div className="border-t-2 border-blue-400 pt-2 mt-2 flex justify-between">
                            <span className="font-bold text-lg">=</span>
                            <span className={`font-bold text-2xl ${balance.buggies.bankNet >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                              {formatCurrency(balance.buggies.bankNet)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Grand Total */}
              {balance && (
                <div className="mt-8 p-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl text-white">
                  <h3 className="text-xl font-bold mb-4 text-center">{language === 'es' ? '🏆 RESUMEN TOTAL' : '🏆 TOTAL SUMMARY'}</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-center p-4 bg-white/10 rounded-xl">
                      <div className="text-green-300 text-sm mb-1">💵 {language === 'es' ? 'TOTAL EFECTIVO' : 'TOTAL CASH'}</div>
                      <div className={`text-3xl font-bold ${(balance.quads.cashNet + balance.buggies.cashNet) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency((canViewQuads ? balance.quads.cashNet : 0) + (canViewBuggies ? balance.buggies.cashNet : 0))}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white/10 rounded-xl">
                      <div className="text-blue-300 text-sm mb-1">🏦 {language === 'es' ? 'TOTAL BANCO' : 'TOTAL BANK'}</div>
                      <div className={`text-3xl font-bold ${(balance.quads.bankNet + balance.buggies.bankNet) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {formatCurrency((canViewQuads ? balance.quads.bankNet : 0) + (canViewBuggies ? balance.buggies.bankNet : 0))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
