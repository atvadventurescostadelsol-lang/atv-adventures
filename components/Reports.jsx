'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, FileText, Calendar, TrendingUp, TrendingDown, Car, Truck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Reports() {
  const { language, t } = useLanguage();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('all');
  const [channel, setChannel] = useState('all');
  const [expenseAccount, setExpenseAccount] = useState('all'); // Filter: all, GE, E&S
  const [expenseConcept, setExpenseConcept] = useState('all'); // Filter by concept
  const [expenseCategories, setExpenseCategories] = useState({ GE: [], 'E&S': [] });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [periodStats, setPeriodStats] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const reportRef = useRef(null);
  
  // Expense-only report state
  const [expenseStartDate, setExpenseStartDate] = useState('');
  const [expenseEndDate, setExpenseEndDate] = useState('');
  const [expenseReportAccount, setExpenseReportAccount] = useState('all');
  const [expenseReportConcept, setExpenseReportConcept] = useState('all');
  const [expenseResults, setExpenseResults] = useState(null);
  const [expenseLoading, setExpenseLoading] = useState(false);
  
  const dateLocale = language === 'es' ? es : enUS;

  useEffect(() => {
    loadPeriodStats();
    loadExpenseCategories();
  }, []);

  // Load expense categories for filter dropdowns
  async function loadExpenseCategories() {
    try {
      const res = await fetch('/api/expense-categories');
      if (res.ok) {
        const data = await res.json();
        const grouped = { GE: [], 'E&S': [] };
        data.forEach(cat => {
          if (cat.account === 'GE') grouped.GE.push(cat);
          else if (cat.account === 'E&S') grouped['E&S'].push(cat);
        });
        setExpenseCategories(grouped);
      }
    } catch (error) {
      console.error('Error loading expense categories:', error);
    }
  }

  // Get available concepts based on selected account
  function getAvailableConcepts() {
    if (expenseAccount === 'all') {
      // Combine unique concepts from both accounts
      const allConcepts = [...expenseCategories.GE, ...expenseCategories['E&S']];
      const uniqueNames = [...new Set(allConcepts.map(c => c.name))];
      return uniqueNames;
    } else if (expenseAccount === 'GE') {
      return expenseCategories.GE.map(c => c.name);
    } else {
      return expenseCategories['E&S'].map(c => c.name);
    }
  }

  // Get available concepts for expense-only report
  function getExpenseReportConcepts() {
    if (expenseReportAccount === 'all') {
      const allConcepts = [...expenseCategories.GE, ...expenseCategories['E&S']];
      const uniqueNames = [...new Set(allConcepts.map(c => c.name))];
      return uniqueNames;
    } else if (expenseReportAccount === 'GE') {
      return expenseCategories.GE.map(c => c.name);
    } else {
      return expenseCategories['E&S'].map(c => c.name);
    }
  }

  // Reset concept filter when account changes
  useEffect(() => {
    setExpenseConcept('all');
  }, [expenseAccount]);

  // Reset expense report concept when account changes
  useEffect(() => {
    setExpenseReportConcept('all');
  }, [expenseReportAccount]);

  // Helper to parse numbers that may use comma as decimal separator (Spanish format)
  function parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    const strValue = String(value).replace(',', '.');
    const parsed = parseFloat(strValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  function formatCurrency(amount) {
    return `€${parseNumber(amount).toFixed(2)}`;
  }

  // Set quick date range for expense report
  function setExpenseQuickDateRange(period) {
    const today = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = end = today;
        break;
      case 'week':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'year':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      default:
        return;
    }

    setExpenseStartDate(format(start, 'yyyy-MM-dd'));
    setExpenseEndDate(format(end, 'yyyy-MM-dd'));
  }

  // Generate expense-only report
  async function runExpenseReport() {
    if (!expenseStartDate || !expenseEndDate) {
      toast.error(language === 'es' ? 'Por favor selecciona las fechas' : 'Please select dates');
      return;
    }

    setExpenseLoading(true);
    try {
      const res = await fetch(`/api/expenses?startDate=${expenseStartDate}&endDate=${expenseEndDate}`);
      
      if (res.ok) {
        let data = await res.json();
        
        // Filter by account
        if (expenseReportAccount !== 'all') {
          data = data.filter(e => e.account === expenseReportAccount);
        }
        
        // Filter by concept
        if (expenseReportConcept !== 'all') {
          data = data.filter(e => e.concept === expenseReportConcept);
        }
        
        // Calculate totals by account and concept
        const byAccount = { GE: 0, 'E&S': 0 };
        const byConcept = {};
        const byAccountAndConcept = { GE: {}, 'E&S': {} };
        const byDate = {};
        
        data.forEach(e => {
          const amount = parseNumber(e.amount);
          byAccount[e.account] += amount;
          
          if (!byConcept[e.concept]) byConcept[e.concept] = 0;
          byConcept[e.concept] += amount;
          
          if (!byAccountAndConcept[e.account][e.concept]) {
            byAccountAndConcept[e.account][e.concept] = 0;
          }
          byAccountAndConcept[e.account][e.concept] += amount;
          
          if (!byDate[e.date]) byDate[e.date] = [];
          byDate[e.date].push(e);
        });
        
        const totalExpenses = byAccount.GE + byAccount['E&S'];
        
        setExpenseResults({
          expenses: data,
          byAccount,
          byConcept,
          byAccountAndConcept,
          byDate,
          totalExpenses,
          filters: {
            account: expenseReportAccount,
            concept: expenseReportConcept,
            startDate: expenseStartDate,
            endDate: expenseEndDate,
          }
        });
      }
    } catch (error) {
      toast.error('Error al generar el informe de gastos');
      console.error(error);
    } finally {
      setExpenseLoading(false);
    }
  }

  // Export expense report to PDF
  async function exportExpensePDF() {
    if (!expenseResults) return;
    
    try {
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text(language === 'es' ? 'Informe de Gastos' : 'Expense Report', 14, 20);
      doc.setFontSize(12);
      doc.text(`${expenseResults.filters.startDate} - ${expenseResults.filters.endDate}`, 14, 30);
      
      if (expenseResults.filters.account !== 'all') {
        doc.text(`${language === 'es' ? 'Cuenta' : 'Account'}: ${expenseResults.filters.account}`, 14, 38);
      }
      if (expenseResults.filters.concept !== 'all') {
        doc.text(`${language === 'es' ? 'Concepto' : 'Concept'}: ${expenseResults.filters.concept}`, 14, 46);
      }
      
      // Summary by account
      doc.setFontSize(14);
      doc.text(language === 'es' ? 'Resumen por Cuenta' : 'Summary by Account', 14, 58);
      
      const accountData = [
        ['GE (Quads)', formatCurrency(expenseResults.byAccount.GE)],
        ['E&S (Buggies)', formatCurrency(expenseResults.byAccount['E&S'])],
        [language === 'es' ? 'TOTAL' : 'TOTAL', formatCurrency(expenseResults.totalExpenses)],
      ];

      doc.autoTable({
        startY: 63,
        head: [[language === 'es' ? 'Cuenta' : 'Account', language === 'es' ? 'Total' : 'Total']],
        body: accountData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
      });

      // Summary by concept
      doc.text(language === 'es' ? 'Resumen por Concepto' : 'Summary by Concept', 14, doc.lastAutoTable.finalY + 15);
      
      const conceptData = Object.entries(expenseResults.byConcept)
        .sort((a, b) => b[1] - a[1])
        .map(([concept, amount]) => [concept, formatCurrency(amount)]);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [[language === 'es' ? 'Concepto' : 'Concept', language === 'es' ? 'Total' : 'Total']],
        body: conceptData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
      });

      // Detail
      doc.text(language === 'es' ? 'Detalle de Gastos' : 'Expense Detail', 14, doc.lastAutoTable.finalY + 15);
      
      const detailData = expenseResults.expenses.map(e => [
        format(new Date(e.date), 'dd/MM/yyyy'),
        e.account,
        e.concept,
        e.notes || '-',
        formatCurrency(e.amount),
      ]);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [[
          language === 'es' ? 'Fecha' : 'Date',
          language === 'es' ? 'Cuenta' : 'Account',
          language === 'es' ? 'Concepto' : 'Concept',
          language === 'es' ? 'Notas' : 'Notes',
          language === 'es' ? 'Cantidad' : 'Amount',
        ]],
        body: detailData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
      });

      doc.save(`gastos_${expenseStartDate}_${expenseEndDate}.pdf`);
      toast.success(language === 'es' ? 'PDF generado' : 'PDF generated');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Error al exportar PDF');
    }
  }

  async function loadPeriodStats() {
    try {
      const [depRes, expRes] = await Promise.all([
        fetch('/api/departures'),
        fetch('/api/expenses?startDate=2020-01-01&endDate=2030-12-31')
      ]);
      
      if (!depRes.ok) return;
      
      const allDepartures = await depRes.json();
      const allExpenses = expRes.ok ? await expRes.json() : [];
      setExpenses(allExpenses);
      
      const today = new Date();
      
      // Weekly (Monday to Sunday)
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weeklyData = allDepartures.filter(d => d.date >= weekStart && d.date <= weekEnd);
      const weeklyExpenses = allExpenses.filter(e => e.date >= weekStart && e.date <= weekEnd);
      
      // Monthly
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
      const monthlyData = allDepartures.filter(d => d.date >= monthStart && d.date <= monthEnd);
      const monthlyExpenses = allExpenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
      
      // Yearly
      const yearStart = format(startOfYear(today), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(today), 'yyyy-MM-dd');
      const yearlyData = allDepartures.filter(d => d.date >= yearStart && d.date <= yearEnd);
      const yearlyExpenses = allExpenses.filter(e => e.date >= yearStart && e.date <= yearEnd);
      
      const weekLabel = language === 'es' 
        ? `Semana: ${format(startOfWeek(today, { weekStartsOn: 1 }), 'd MMM', { locale: es })} - ${format(endOfWeek(today, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`
        : `Week: ${format(startOfWeek(today, { weekStartsOn: 1 }), 'MMM d', { locale: enUS })} - ${format(endOfWeek(today, { weekStartsOn: 1 }), 'MMM d', { locale: enUS })}`;
      
      setPeriodStats({
        weekly: calculateStats(weeklyData, weeklyExpenses, weekLabel),
        monthly: calculateStats(monthlyData, monthlyExpenses, format(today, 'MMMM yyyy', { locale: dateLocale })),
        yearly: calculateStats(yearlyData, yearlyExpenses, format(today, 'yyyy'))
      });
    } catch (error) {
      console.error('Error loading period stats:', error);
    }
  }

  function calculateStats(data, expensesData, label) {
    const stats = {
      label,
      count: data.length,
      totalGross: 0,
      netBase: 0,
      vatAmount: 0,
      vatAmount2: 0, // IVA2: excluding cash payments
      // Quad stats
      quadCount: 0,
      quadGross: 0,
      quadNet: 0,
      quadCash: 0,
      quadBank: 0,
      quadWeb: 0,
      quadGyg: 0,
      quadCruise: 0,
      // Buggy stats
      buggyCount: 0,
      buggyGross: 0,
      buggyNet: 0,
      buggyCash: 0,
      buggyBank: 0,
      buggyWeb: 0,
      buggyGyg: 0,
      buggyCruise: 0,
      // Payment channels
      webTotal: 0,
      cashTotal: 0,
      bankTotal: 0,
      gygTotal: 0,
      cruiseTotal: 0,
      // Pending (GYG and Cruceros)
      pendingGYG: 0,
      pendingCruise: 0,
      // Commissions
      commissionTotal: 0,
      commissionCash: 0,
      commissionBank: 0,
      // Expenses
      geExpenseTotal: 0,
      esExpenseTotal: 0,
    };

    data.forEach(d => {
      const gross = parseNumber(d.totalGross);
      const vehicles = parseInt(d.vehiclesCount || 0);
      
      // Calculate IVA with proper decimals
      const vatRate = 0.21;
      const netBase = gross / (1 + vatRate);
      const vatAmount = gross - netBase;
      
      stats.totalGross += gross;
      stats.netBase += netBase;
      stats.vatAmount += vatAmount;

      const cashAmount = parseNumber(d.paymentSplitCash);
      const webAmount = parseNumber(d.paymentSplitWeb);
      const bankAmount = parseNumber(d.paymentSplitBank);
      const gygAmount = parseNumber(d.paymentSplitGyg);
      const cruiseAmount = parseNumber(d.paymentSplitCruise);
      const commission = parseNumber(d.commission);
      const commissionMethod = d.commissionMethod || 'cash';
      
      if (d.category === 'quad') {
        stats.quadCount += vehicles;
        stats.quadGross += gross;
        stats.quadNet += netBase;
        stats.quadCash += cashAmount;
        stats.quadBank += bankAmount;
        stats.quadWeb += webAmount;
        stats.quadGyg += gygAmount;
        stats.quadCruise += cruiseAmount;
      } else {
        stats.buggyCount += vehicles;
        stats.buggyGross += gross;
        stats.buggyNet += netBase;
        stats.buggyCash += cashAmount;
        stats.buggyBank += bankAmount;
        stats.buggyWeb += webAmount;
        stats.buggyGyg += gygAmount;
        stats.buggyCruise += cruiseAmount;
      }
      
      stats.webTotal += webAmount;
      stats.cashTotal += cashAmount;
      stats.bankTotal += bankAmount;
      stats.gygTotal += gygAmount;
      stats.cruiseTotal += cruiseAmount;
      stats.commissionTotal += commission;
      
      // Track commission by payment method
      if (commission > 0) {
        if (commissionMethod === 'bank') {
          stats.commissionBank += commission;
        } else {
          stats.commissionCash += commission;
        }
      }
      
      // Calculate IVA2 (excluding cash payments)
      const nonCashGross = gross - cashAmount;
      if (nonCashGross > 0) {
        const nonCashNet = nonCashGross / (1 + vatRate);
        stats.vatAmount2 += (nonCashGross - nonCashNet);
      }
      
      // Count pending payments (GYG and Cruceros)
      if (gygAmount > 0) {
        stats.pendingGYG += gygAmount;
      }
      if (cruiseAmount > 0 || d.isPendingCruise === 'true' || d.isPendingCruise === true) {
        stats.pendingCruise += cruiseAmount > 0 ? cruiseAmount : gross;
      }
    });

    // Calculate expenses by account
    if (expensesData && expensesData.length > 0) {
      expensesData.forEach(e => {
        const amount = parseNumber(e.amount);
        if (e.account === 'GE') {
          stats.geExpenseTotal += amount;
        } else if (e.account === 'E&S') {
          stats.esExpenseTotal += amount;
        }
      });
    }

    // Calculate net cash for each category
    stats.quadCashNet = stats.quadCash - stats.geExpenseTotal;
    stats.buggyCashNet = stats.buggyCash - stats.esExpenseTotal;

    return stats;
  }

  async function runReport() {
    if (!startDate || !endDate) {
      toast.error(language === 'es' ? 'Por favor selecciona las fechas' : 'Please select dates');
      return;
    }

    setLoading(true);
    try {
      const [depRes, expRes] = await Promise.all([
        fetch('/api/departures'),
        fetch(`/api/expenses?startDate=${startDate}&endDate=${endDate}`)
      ]);
      
      if (depRes.ok) {
        let data = await depRes.json();
        let expensesData = expRes.ok ? await expRes.json() : [];
        
        // Filter by date range
        data = data.filter(d => d.date >= startDate && d.date <= endDate);
        
        // Filter by category if selected
        if (category !== 'all') {
          data = data.filter(d => d.category === category);
        }
        
        // Filter by channel if selected
        if (channel !== 'all') {
          data = data.filter(d => d.salesChannel === channel);
        }
        
        // Filter expenses based on selected tour category (quad->GE, buggy->E&S)
        let filteredExpenses = expensesData;
        if (category === 'quad') {
          filteredExpenses = expensesData.filter(e => e.account === 'GE');
        } else if (category === 'buggy') {
          filteredExpenses = expensesData.filter(e => e.account === 'E&S');
        }
        
        // Apply expense account filter (additional filter for expense-specific reports)
        if (expenseAccount !== 'all') {
          filteredExpenses = filteredExpenses.filter(e => e.account === expenseAccount);
        }
        
        // Apply expense concept filter
        if (expenseConcept !== 'all') {
          filteredExpenses = filteredExpenses.filter(e => e.concept === expenseConcept);
        }
        
        const totals = calculateStats(data, filteredExpenses, `${startDate} - ${endDate}`);
        
        // Calculate expense totals by concept for detailed breakdown
        const expensesByAccount = { GE: {}, 'E&S': {} };
        const expenseTotalsByAccount = { GE: 0, 'E&S': 0 };
        
        filteredExpenses.forEach(e => {
          const amount = parseNumber(e.amount);
          const account = e.account;
          const concept = e.concept;
          
          if (!expensesByAccount[account][concept]) {
            expensesByAccount[account][concept] = 0;
          }
          expensesByAccount[account][concept] += amount;
          expenseTotalsByAccount[account] += amount;
        });
        
        setResults({
          data,
          expenses: filteredExpenses,
          allExpenses: expensesData, // Keep all for separate display when category='all'
          totals,
          categoryFilter: category,
          expenseAccountFilter: expenseAccount,
          expenseConceptFilter: expenseConcept,
          expensesByAccount,
          expenseTotalsByAccount,
        });
      }
    } catch (error) {
      toast.error('Error al generar el informe');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function setQuickDateRange(period) {
    const today = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = end = today;
        break;
      case 'week':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'year':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      default:
        return;
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  }

  async function exportPDF() {
    if (!results) return;
    
    try {
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable');

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('ATV Operations Report', 14, 20);
      doc.setFontSize(12);
      doc.text(`${results.totals.label}`, 14, 30);
      
      // Summary stats
      doc.setFontSize(14);
      doc.text('Summary', 14, 45);
      
      const summaryData = [
        ['Total Gross', formatCurrency(results.totals.totalGross)],
        ['Net Base', formatCurrency(results.totals.netBase)],
        ['VAT', formatCurrency(results.totals.vatAmount)],
        ['Tours', `${results.totals.count}`],
        ['Quads', `${results.totals.quadCount} (${formatCurrency(results.totals.quadGross)})`],
        ['Buggies', `${results.totals.buggyCount} (${formatCurrency(results.totals.buggyGross)})`],
      ];

      doc.autoTable({
        startY: 50,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12] },
      });

      // Payments breakdown
      doc.text('Payments Breakdown', 14, doc.lastAutoTable.finalY + 15);
      
      const paymentsData = [
        ['Cash', formatCurrency(results.totals.cashTotal)],
        ['Bank', formatCurrency(results.totals.bankTotal)],
        ['Web', formatCurrency(results.totals.webTotal)],
        ['GYG', formatCurrency(results.totals.gygTotal)],
        ['Cruises', formatCurrency(results.totals.cruiseTotal)],
      ];

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Method', 'Amount']],
        body: paymentsData,
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12] },
      });

      // Expenses
      if (results.totals.geExpenseTotal > 0 || results.totals.esExpenseTotal > 0) {
        doc.text('Expenses', 14, doc.lastAutoTable.finalY + 15);
        
        const expensesData = [
          ['GE (Quads)', formatCurrency(results.totals.geExpenseTotal)],
          ['E&S (Buggies)', formatCurrency(results.totals.esExpenseTotal)],
          ['Total Expenses', formatCurrency(results.totals.geExpenseTotal + results.totals.esExpenseTotal)],
        ];

        doc.autoTable({
          startY: doc.lastAutoTable.finalY + 20,
          head: [['Account', 'Amount']],
          body: expensesData,
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
        });
      }

      // Net Cash Summary
      doc.text('Net Cash After Expenses', 14, doc.lastAutoTable.finalY + 15);
      
      const netCashData = [
        ['Quad Cash Net (Cash - GE Expenses)', formatCurrency(results.totals.quadCashNet)],
        ['Buggy Cash Net (Cash - E&S Expenses)', formatCurrency(results.totals.buggyCashNet)],
        ['Total Net Cash', formatCurrency(results.totals.quadCashNet + results.totals.buggyCashNet)],
      ];

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Category', 'Amount']],
        body: netCashData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
      });

      doc.save(`report_${startDate}_${endDate}.pdf`);
      toast.success(language === 'es' ? 'PDF generado' : 'PDF generated');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Error al exportar PDF');
    }
  }

  function StatCard({ title, stats, icon: Icon, colorClass = 'bg-orange-500' }) {
    return (
      <Card>
        <CardHeader className={`${colorClass} text-white rounded-t-lg`}>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <CardDescription className="text-white/80">{stats.label}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('totalGross')}</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalGross)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('tours')}</p>
              <p className="text-2xl font-bold">{stats.count}</p>
            </div>
          </div>

          {/* IVA Section */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-2 rounded">
                <p className="text-xs text-muted-foreground">{t('vat')}</p>
                <p className="font-bold">{formatCurrency(stats.vatAmount)}</p>
              </div>
              <div className="bg-purple-100 p-2 rounded">
                <p className="text-xs text-purple-700">IVA2 ({language === 'es' ? 'sin efectivo' : 'excl. cash'})</p>
                <p className="font-bold text-purple-800">{formatCurrency(stats.vatAmount2)}</p>
              </div>
            </div>
          </div>
          
          {/* Category Breakdown */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2 flex items-center gap-1">
              {language === 'es' ? 'Por Categoría' : 'By Category'}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Quads */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-1 mb-2">
                  <Car className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Quads</span>
                </div>
                <p className="text-sm">{t('vehicles')}: <span className="font-bold">{stats.quadCount}</span></p>
                <p className="text-sm">{t('gross')}: <span className="font-bold">{formatCurrency(stats.quadGross)}</span></p>
                <p className="text-sm">💵: <span className="font-medium">{formatCurrency(stats.quadCash)}</span></p>
                {stats.geExpenseTotal > 0 && (
                  <p className="text-sm text-red-600">
                    -{formatCurrency(stats.geExpenseTotal)} ({language === 'es' ? 'gastos GE' : 'GE expenses'})
                  </p>
                )}
                <p className="text-sm font-bold text-blue-700 mt-1">
                  {language === 'es' ? 'Efectivo Neto' : 'Net Cash'}: {formatCurrency(stats.quadCashNet || (stats.quadCash - (stats.geExpenseTotal || 0)))}
                </p>
              </div>
              
              {/* Buggies */}
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-1 mb-2">
                  <Truck className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Buggies</span>
                </div>
                <p className="text-sm">{t('vehicles')}: <span className="font-bold">{stats.buggyCount}</span></p>
                <p className="text-sm">{t('gross')}: <span className="font-bold">{formatCurrency(stats.buggyGross)}</span></p>
                <p className="text-sm">💵: <span className="font-medium">{formatCurrency(stats.buggyCash)}</span></p>
                {stats.esExpenseTotal > 0 && (
                  <p className="text-sm text-red-600">
                    -{formatCurrency(stats.esExpenseTotal)} ({language === 'es' ? 'gastos E&S' : 'E&S expenses'})
                  </p>
                )}
                <p className="text-sm font-bold text-green-700 mt-1">
                  {language === 'es' ? 'Efectivo Neto' : 'Net Cash'}: {formatCurrency(stats.buggyCashNet || (stats.buggyCash - (stats.esExpenseTotal || 0)))}
                </p>
              </div>
            </div>
          </div>

          {/* Expenses Summary */}
          {(stats.geExpenseTotal > 0 || stats.esExpenseTotal > 0) && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2 flex items-center gap-1 text-red-600">
                <TrendingDown className="h-4 w-4" />
                {language === 'es' ? 'Gastos Totales' : 'Total Expenses'}
              </h4>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>GE (Quads):</span>
                  <span className="font-medium">-{formatCurrency(stats.geExpenseTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>E&S (Buggies):</span>
                  <span className="font-medium">-{formatCurrency(stats.esExpenseTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t mt-2 pt-2">
                  <span>{t('total')}:</span>
                  <span className="text-red-600">-{formatCurrency(stats.geExpenseTotal + stats.esExpenseTotal)}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Payments */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">{t('payments')}</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-muted p-2 rounded">
                <span className="text-muted-foreground">💵 {t('cash')}</span>
                <p className="font-bold">{formatCurrency(stats.cashTotal)}</p>
              </div>
              <div className="bg-muted p-2 rounded">
                <span className="text-muted-foreground">🏦 {t('bank')}</span>
                <p className="font-bold">{formatCurrency(stats.bankTotal)}</p>
              </div>
              <div className="bg-muted p-2 rounded">
                <span className="text-muted-foreground">🌐 Web</span>
                <p className="font-bold">{formatCurrency(stats.webTotal)}</p>
              </div>
            </div>
          </div>
          
          {/* Pending */}
          {(stats.pendingGYG > 0 || stats.pendingCruise > 0) && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">{t('pendingPayments')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {stats.pendingGYG > 0 && (
                  <div className="bg-yellow-50 p-2 rounded">
                    <span className="text-yellow-700">🎫 GYG</span>
                    <p className="font-bold text-yellow-800">{formatCurrency(stats.gygTotal)}</p>
                  </div>
                )}
                {stats.pendingCruise > 0 && (
                  <div className="bg-blue-50 p-2 rounded">
                    <span className="text-blue-700">🚢 {t('cruises')}</span>
                    <p className="font-bold text-blue-800">{formatCurrency(stats.cruiseTotal)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Commissions */}
          {stats.commissionTotal > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">{language === 'es' ? 'Comisiones' : 'Commissions'}</h4>
              <div className="bg-purple-50 p-2 rounded text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-700">{t('total')}:</span>
                  <span className="font-bold text-purple-800">{formatCurrency(stats.commissionTotal)}</span>
                </div>
                {stats.commissionCash > 0 && (
                  <div className="flex justify-between text-xs mt-1">
                    <span>💵 {language === 'es' ? 'De efectivo' : 'From cash'}:</span>
                    <span>{formatCurrency(stats.commissionCash)}</span>
                  </div>
                )}
                {stats.commissionBank > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>🏦 {language === 'es' ? 'De banco' : 'From bank'}:</span>
                    <span>{formatCurrency(stats.commissionBank)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Stats Cards */}
      {periodStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard 
            title={language === 'es' ? 'Esta Semana' : 'This Week'} 
            stats={periodStats.weekly} 
            icon={Calendar}
            colorClass="bg-blue-500"
          />
          <StatCard 
            title={language === 'es' ? 'Este Mes' : 'This Month'} 
            stats={periodStats.monthly} 
            icon={Calendar}
            colorClass="bg-green-500"
          />
          <StatCard 
            title={language === 'es' ? 'Este Año' : 'This Year'} 
            stats={periodStats.yearly} 
            icon={TrendingUp}
            colorClass="bg-orange-500"
          />
        </div>
      )}

      {/* Expense-Only Report */}
      <Card className="border-2 border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <TrendingDown className="h-5 w-5" />
            {language === 'es' ? 'Informe de Gastos' : 'Expense Report'}
          </CardTitle>
          <CardDescription>
            {language === 'es' 
              ? 'Genera un informe exclusivo de gastos, filtrando por cuenta y concepto'
              : 'Generate an expense-only report, filtering by account and concept'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Quick date buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setExpenseQuickDateRange('today')}>
                {t('today')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpenseQuickDateRange('week')}>
                {language === 'es' ? 'Esta Semana' : 'This Week'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpenseQuickDateRange('month')}>
                {language === 'es' ? 'Este Mes' : 'This Month'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpenseQuickDateRange('year')}>
                {language === 'es' ? 'Este Año' : 'This Year'}
              </Button>
            </div>

            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <Label>{language === 'es' ? 'Desde' : 'From'}</Label>
                <Input
                  type="date"
                  value={expenseStartDate}
                  onChange={(e) => setExpenseStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{language === 'es' ? 'Hasta' : 'To'}</Label>
                <Input
                  type="date"
                  value={expenseEndDate}
                  onChange={(e) => setExpenseEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{language === 'es' ? 'Cuenta' : 'Account'}</Label>
                <Select value={expenseReportAccount} onValueChange={setExpenseReportAccount}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'es' ? 'Todas' : 'All'}</SelectItem>
                    <SelectItem value="GE">GE (Quads)</SelectItem>
                    <SelectItem value="E&S">E&S (Buggies)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'es' ? 'Concepto' : 'Concept'}</Label>
                <Select value={expenseReportConcept} onValueChange={setExpenseReportConcept}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'es' ? 'Todos' : 'All'}</SelectItem>
                    {getExpenseReportConcepts().map(concept => (
                      <SelectItem key={concept} value={concept}>{concept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={runExpenseReport} className="w-full bg-red-600 hover:bg-red-700" disabled={expenseLoading}>
                  {expenseLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {language === 'es' ? 'Generar' : 'Generate'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Report Results */}
      {expenseResults && (
        <Card className="border-2 border-red-200">
          <CardHeader className="bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-red-700">
                  {language === 'es' ? 'Informe de Gastos' : 'Expense Report'}
                </CardTitle>
                <CardDescription>
                  {expenseResults.filters.startDate} - {expenseResults.filters.endDate}
                  {expenseResults.filters.account !== 'all' && (
                    <Badge variant="secondary" className="ml-2">{expenseResults.filters.account}</Badge>
                  )}
                  {expenseResults.filters.concept !== 'all' && (
                    <Badge variant="outline" className="ml-2">{expenseResults.filters.concept}</Badge>
                  )}
                </CardDescription>
              </div>
              <Button onClick={exportExpensePDF} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {/* Total */}
            <Card className="bg-red-100 border-red-300">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-red-700 text-sm">{language === 'es' ? 'TOTAL GASTOS' : 'TOTAL EXPENSES'}</p>
                  <p className="text-4xl font-bold text-red-700">-{formatCurrency(expenseResults.totalExpenses)}</p>
                  <p className="text-sm text-red-600 mt-1">
                    {expenseResults.expenses.length} {language === 'es' ? 'registros' : 'records'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Summary by Account */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    GE (Quads)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">-{formatCurrency(expenseResults.byAccount.GE)}</p>
                  {Object.keys(expenseResults.byAccountAndConcept.GE).length > 0 && (
                    <div className="mt-3 space-y-1">
                      {Object.entries(expenseResults.byAccountAndConcept.GE)
                        .sort((a, b) => b[1] - a[1])
                        .map(([concept, amount]) => (
                          <div key={concept} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{concept}</span>
                            <span className="font-medium">-{formatCurrency(amount)}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    E&S (Buggies)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">-{formatCurrency(expenseResults.byAccount['E&S'])}</p>
                  {Object.keys(expenseResults.byAccountAndConcept['E&S']).length > 0 && (
                    <div className="mt-3 space-y-1">
                      {Object.entries(expenseResults.byAccountAndConcept['E&S'])
                        .sort((a, b) => b[1] - a[1])
                        .map(([concept, amount]) => (
                          <div key={concept} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{concept}</span>
                            <span className="font-medium">-{formatCurrency(amount)}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary by Concept */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  📊 {language === 'es' ? 'Resumen por Concepto' : 'Summary by Concept'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(expenseResults.byConcept)
                    .sort((a, b) => b[1] - a[1])
                    .map(([concept, amount]) => (
                      <div key={concept} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span className="font-medium">{concept}</span>
                        <span className="text-red-600 font-bold">-{formatCurrency(amount)}</span>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>

            {/* Detail by Date */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  📋 {language === 'es' ? 'Detalle por Fecha' : 'Detail by Date'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(expenseResults.byDate).length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {language === 'es' ? 'No hay gastos en este período' : 'No expenses in this period'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(expenseResults.byDate)
                      .sort((a, b) => b[0].localeCompare(a[0]))
                      .map(([date, dateExpenses]) => {
                        const dayTotal = dateExpenses.reduce((sum, e) => sum + parseNumber(e.amount), 0);
                        return (
                          <div key={date} className="border rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">
                                {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: dateLocale })}
                              </span>
                              <Badge variant="destructive">-{formatCurrency(dayTotal)}</Badge>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{language === 'es' ? 'Cuenta' : 'Account'}</TableHead>
                                  <TableHead>{language === 'es' ? 'Concepto' : 'Concept'}</TableHead>
                                  <TableHead>{language === 'es' ? 'Notas' : 'Notes'}</TableHead>
                                  <TableHead className="text-right">{language === 'es' ? 'Cantidad' : 'Amount'}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dateExpenses.map((exp, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>
                                      <Badge variant={exp.account === 'GE' ? 'default' : 'secondary'}
                                             className={exp.account === 'GE' ? 'bg-blue-600' : 'bg-green-600'}>
                                        {exp.account}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{exp.concept}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{exp.notes || '-'}</TableCell>
                                    <TableCell className="text-right font-medium text-red-600">
                                      -{formatCurrency(exp.amount)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {/* Custom Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'es' ? 'Generar Informe Personalizado' : 'Generate Custom Report'}
          </CardTitle>
          <CardDescription>
            {language === 'es' 
              ? 'Selecciona un rango de fechas para generar un informe detallado'
              : 'Select a date range to generate a detailed report'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick date buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('today')}>
                {t('today')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('week')}>
                {language === 'es' ? 'Esta Semana' : 'This Week'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('month')}>
                {language === 'es' ? 'Este Mes' : 'This Month'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('year')}>
                {language === 'es' ? 'Este Año' : 'This Year'}
              </Button>
            </div>

            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <Label>{language === 'es' ? 'Desde' : 'From'}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{language === 'es' ? 'Hasta' : 'To'}</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t('category')}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'es' ? 'Todos' : 'All'}</SelectItem>
                    <SelectItem value="quad">Quads</SelectItem>
                    <SelectItem value="buggy">Buggies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'es' ? 'Canal' : 'Channel'}</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'es' ? 'Todos' : 'All'}</SelectItem>
                    <SelectItem value="otros">{language === 'es' ? 'Directo' : 'Direct'}</SelectItem>
                    <SelectItem value="gyg">GYG</SelectItem>
                    <SelectItem value="cruceros">{t('cruises')}</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={runReport} className="w-full" disabled={loading}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  {language === 'es' ? 'Generar' : 'Generate'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card ref={reportRef}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{language === 'es' ? 'Resultados del Informe de Tours' : 'Tour Report Results'}</CardTitle>
                <CardDescription>
                  {results.totals.label}
                </CardDescription>
              </div>
              <Button onClick={exportPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="pt-6">
                  <p className="text-orange-100">{t('totalGross')}</p>
                  <p className="text-3xl font-bold">{formatCurrency(results.totals.totalGross)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">{t('tours')}</p>
                  <p className="text-3xl font-bold">{results.totals.count}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">{t('netBase')}</p>
                  <p className="text-3xl font-bold">{formatCurrency(results.totals.netBase)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">{t('vat')}</p>
                  <p className="text-3xl font-bold">{formatCurrency(results.totals.vatAmount)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="pt-6">
                  <p className="text-purple-100">IVA2 ({language === 'es' ? 'sin efectivo' : 'excl. cash'})</p>
                  <p className="text-3xl font-bold">{formatCurrency(results.totals.vatAmount2)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown with Expenses - Show based on filter */}
            {results.categoryFilter === 'all' ? (
              /* Show both categories when filter is 'all' */
              <div className="grid gap-4 md:grid-cols-2">
                {/* Quads */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Car className="h-5 w-5 text-blue-600" />
                      {t('quads')} (GE)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t('vehicles')}:</span>
                      <span className="font-bold">{results.totals.quadCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('gross')}:</span>
                      <span className="font-bold">{formatCurrency(results.totals.quadGross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>💵 {t('cash')}:</span>
                      <span className="font-medium">{formatCurrency(results.totals.quadCash)}</span>
                    </div>
                    {results.totals.geExpenseTotal > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>{language === 'es' ? 'Gastos GE' : 'GE Expenses'}:</span>
                        <span className="font-medium">-{formatCurrency(results.totals.geExpenseTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t bg-blue-50 -mx-4 px-4 py-2 rounded-b-lg">
                      <span className="font-semibold text-blue-800">
                        💰 {language === 'es' ? 'Efectivo Neto' : 'Net Cash'}:
                      </span>
                      <span className={`font-bold text-lg ${results.totals.quadCashNet >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                        {formatCurrency(results.totals.quadCashNet)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Buggies */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Truck className="h-5 w-5 text-green-600" />
                      {t('buggies')} (E&S)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t('vehicles')}:</span>
                      <span className="font-bold">{results.totals.buggyCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('gross')}:</span>
                      <span className="font-bold">{formatCurrency(results.totals.buggyGross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>💵 {t('cash')}:</span>
                      <span className="font-medium">{formatCurrency(results.totals.buggyCash)}</span>
                    </div>
                    {results.totals.esExpenseTotal > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>{language === 'es' ? 'Gastos E&S' : 'E&S Expenses'}:</span>
                        <span className="font-medium">-{formatCurrency(results.totals.esExpenseTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t bg-green-50 -mx-4 px-4 py-2 rounded-b-lg">
                      <span className="font-semibold text-green-800">
                        💰 {language === 'es' ? 'Efectivo Neto' : 'Net Cash'}:
                      </span>
                      <span className={`font-bold text-lg ${results.totals.buggyCashNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {formatCurrency(results.totals.buggyCashNet)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : results.categoryFilter === 'quad' ? (
              /* Show only Quads when filter is 'quad' */
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="h-5 w-5 text-blue-600" />
                    {t('quads')} (GE)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('vehicles')}:</span>
                    <span className="font-bold">{results.totals.quadCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('gross')}:</span>
                    <span className="font-bold">{formatCurrency(results.totals.quadGross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💵 {t('cash')}:</span>
                    <span className="font-medium">{formatCurrency(results.totals.quadCash)}</span>
                  </div>
                  {results.totals.geExpenseTotal > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>{language === 'es' ? 'Gastos GE' : 'GE Expenses'}:</span>
                      <span className="font-medium">-{formatCurrency(results.totals.geExpenseTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t bg-blue-50 -mx-4 px-4 py-2 rounded-b-lg">
                    <span className="font-semibold text-blue-800">
                      💰 {language === 'es' ? 'Efectivo Neto' : 'Net Cash'}:
                    </span>
                    <span className={`font-bold text-lg ${results.totals.quadCashNet >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {formatCurrency(results.totals.quadCashNet)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Show only Buggies when filter is 'buggy' */
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-green-600" />
                    {t('buggies')} (E&S)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>{t('vehicles')}:</span>
                    <span className="font-bold">{results.totals.buggyCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('gross')}:</span>
                    <span className="font-bold">{formatCurrency(results.totals.buggyGross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💵 {t('cash')}:</span>
                    <span className="font-medium">{formatCurrency(results.totals.buggyCash)}</span>
                  </div>
                  {results.totals.esExpenseTotal > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>{language === 'es' ? 'Gastos E&S' : 'E&S Expenses'}:</span>
                      <span className="font-medium">-{formatCurrency(results.totals.esExpenseTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t bg-green-50 -mx-4 px-4 py-2 rounded-b-lg">
                    <span className="font-semibold text-green-800">
                      💰 {language === 'es' ? 'Efectivo Neto' : 'Net Cash'}:
                    </span>
                    <span className={`font-bold text-lg ${results.totals.buggyCashNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {formatCurrency(results.totals.buggyCashNet)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expenses Detail - Show separated when filter is 'all' */}
            {results.categoryFilter === 'all' && (results.totals.geExpenseTotal > 0 || results.totals.esExpenseTotal > 0) && (
              <div className="grid gap-4 md:grid-cols-2">
                {/* GE Expenses */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                      <TrendingDown className="h-5 w-5" />
                      {language === 'es' ? 'Gastos GE (Quads)' : 'GE Expenses (Quads)'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {results.allExpenses?.filter(e => e.account === 'GE').length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                            <TableHead>{language === 'es' ? 'Concepto' : 'Concept'}</TableHead>
                            <TableHead className="text-right">{language === 'es' ? 'Cantidad' : 'Amount'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.allExpenses?.filter(e => e.account === 'GE').map((exp, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{format(new Date(exp.date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{exp.concept}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                -{formatCurrency(exp.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-blue-50 font-bold">
                            <TableCell colSpan={2}>{t('total')}</TableCell>
                            <TableCell className="text-right text-red-600">
                              -{formatCurrency(results.totals.geExpenseTotal)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground text-sm py-4">
                        {language === 'es' ? 'Sin gastos GE en este período' : 'No GE expenses in this period'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* E&S Expenses */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                      <TrendingDown className="h-5 w-5" />
                      {language === 'es' ? 'Gastos E&S (Buggies)' : 'E&S Expenses (Buggies)'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {results.allExpenses?.filter(e => e.account === 'E&S').length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                            <TableHead>{language === 'es' ? 'Concepto' : 'Concept'}</TableHead>
                            <TableHead className="text-right">{language === 'es' ? 'Cantidad' : 'Amount'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.allExpenses?.filter(e => e.account === 'E&S').map((exp, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{format(new Date(exp.date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{exp.concept}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                -{formatCurrency(exp.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-green-50 font-bold">
                            <TableCell colSpan={2}>{t('total')}</TableCell>
                            <TableCell className="text-right text-red-600">
                              -{formatCurrency(results.totals.esExpenseTotal)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground text-sm py-4">
                        {language === 'es' ? 'Sin gastos E&S en este período' : 'No E&S expenses in this period'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Expense Summary by Concept - Show when expenses are filtered or available */}
            {results.expensesByAccount && (Object.keys(results.expensesByAccount.GE).length > 0 || Object.keys(results.expensesByAccount['E&S']).length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    📊 {language === 'es' ? 'Resumen de Gastos por Concepto' : 'Expense Summary by Concept'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'es' 
                      ? 'Total gastado en cada concepto durante el período seleccionado'
                      : 'Total spent on each concept during the selected period'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* GE Summary by Concept */}
                    {(results.expenseAccountFilter === 'all' || results.expenseAccountFilter === 'GE') && 
                     Object.keys(results.expensesByAccount.GE).length > 0 && (
                      <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Car className="h-4 w-4 text-blue-600" />
                            GE (Quads) - {language === 'es' ? 'Por Concepto' : 'By Concept'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {Object.entries(results.expensesByAccount.GE)
                              .sort((a, b) => b[1] - a[1])
                              .map(([concept, amount]) => (
                                <div key={concept} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                  <span className="font-medium">{concept}</span>
                                  <span className="text-red-600 font-bold">-{formatCurrency(amount)}</span>
                                </div>
                              ))
                            }
                            <div className="flex justify-between items-center p-2 bg-blue-100 rounded font-bold border-t-2 border-blue-300">
                              <span>{t('total')} GE</span>
                              <span className="text-red-600">-{formatCurrency(results.expenseTotalsByAccount.GE)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* E&S Summary by Concept */}
                    {(results.expenseAccountFilter === 'all' || results.expenseAccountFilter === 'E&S') && 
                     Object.keys(results.expensesByAccount['E&S']).length > 0 && (
                      <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Truck className="h-4 w-4 text-green-600" />
                            E&S (Buggies) - {language === 'es' ? 'Por Concepto' : 'By Concept'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {Object.entries(results.expensesByAccount['E&S'])
                              .sort((a, b) => b[1] - a[1])
                              .map(([concept, amount]) => (
                                <div key={concept} className="flex justify-between items-center p-2 bg-green-50 rounded">
                                  <span className="font-medium">{concept}</span>
                                  <span className="text-red-600 font-bold">-{formatCurrency(amount)}</span>
                                </div>
                              ))
                            }
                            <div className="flex justify-between items-center p-2 bg-green-100 rounded font-bold border-t-2 border-green-300">
                              <span>{t('total')} E&S</span>
                              <span className="text-red-600">-{formatCurrency(results.expenseTotalsByAccount['E&S'])}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Grand Total */}
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">
                        {language === 'es' ? 'TOTAL GASTOS' : 'TOTAL EXPENSES'}
                      </span>
                      <span className="text-red-600 font-bold text-2xl">
                        -{formatCurrency(results.expenseTotalsByAccount.GE + results.expenseTotalsByAccount['E&S'])}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expenses Detail - Single list when filter is quad or buggy */}
            {results.categoryFilter !== 'all' && results.expenses.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                    <TrendingDown className="h-5 w-5" />
                    {language === 'es' ? 'Detalle de Gastos' : 'Expense Detail'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                        <TableHead>{language === 'es' ? 'Cuenta' : 'Account'}</TableHead>
                        <TableHead>{language === 'es' ? 'Concepto' : 'Concept'}</TableHead>
                        <TableHead>{language === 'es' ? 'Notas' : 'Notes'}</TableHead>
                        <TableHead className="text-right">{language === 'es' ? 'Cantidad' : 'Amount'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.expenses.map((exp, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{format(new Date(exp.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={exp.account === 'GE' ? 'default' : 'secondary'} 
                                   className={exp.account === 'GE' ? 'bg-blue-600' : 'bg-green-600'}>
                              {exp.account}
                            </Badge>
                          </TableCell>
                          <TableCell>{exp.concept}</TableCell>
                          <TableCell className="text-muted-foreground">{exp.notes || '-'}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            -{formatCurrency(exp.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Detailed data table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{language === 'es' ? 'Detalle de Tours' : 'Tour Detail'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                        <TableHead>{language === 'es' ? 'Hora' : 'Time'}</TableHead>
                        <TableHead>{t('category')}</TableHead>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead className="text-right">{t('vehicles')}</TableHead>
                        <TableHead className="text-right">{t('gross')}</TableHead>
                        <TableHead className="text-right">💵</TableHead>
                        <TableHead className="text-right">🏦</TableHead>
                        <TableHead className="text-right">🎫</TableHead>
                        <TableHead className="text-right">🚢</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.data.map((dep, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{format(new Date(dep.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{dep.timeSlot}</TableCell>
                          <TableCell>
                            <Badge variant={dep.category === 'quad' ? 'default' : 'secondary'}
                                   className={dep.category === 'quad' ? 'bg-blue-600' : 'bg-green-600'}>
                              {dep.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{dep.productName}</TableCell>
                          <TableCell className="text-right">{dep.vehiclesCount}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(dep.totalGross)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(dep.paymentSplitCash)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(dep.paymentSplitBank)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(dep.paymentSplitGyg)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(dep.paymentSplitCruise)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
