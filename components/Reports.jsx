'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Search, TrendingUp, TrendingDown, Car, Truck, RefreshCw, Wallet, Building2, Clock, CalendarDays, CalendarRange, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);

export default function Reports() {
  const { language } = useLanguage();
  const { canAccessCategory, canAccessExpenseAccount } = useAuth();
  
  const canViewQuads = canAccessCategory('quad');
  const canViewBuggies = canAccessCategory('buggy');
  const canViewGE = canAccessExpenseAccount('GE');
  const canViewES = canAccessExpenseAccount('E&S');
  
  // Main report states
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Unified detailed report states
  const [detailedStartDate, setDetailedStartDate] = useState('');
  const [detailedEndDate, setDetailedEndDate] = useState('');
  // Multiple selection for report types
  const [showTours, setShowTours] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);
  const [showIncomes, setShowIncomes] = useState(true);
  const [detailedAccount, setDetailedAccount] = useState('all');
  const [detailedConcept, setDetailedConcept] = useState('all');
  const [detailedPaymentMethod, setDetailedPaymentMethod] = useState('all');
  const [detailedResults, setDetailedResults] = useState(null);
  const [detailedLoading, setDetailedLoading] = useState(false);
  
  // Categories
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  
  const dateLocale = language === 'es' ? es : enUS;
  
  const formatCurrency = (amount) => `€${(parseFloat(amount) || 0).toFixed(2)}`;
  const parseNumber = (v) => typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')) || 0;

  // Get date ranges
  const getDateRanges = () => {
    const today = new Date();
    return {
      today: { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd'), label: language === 'es' ? 'Hoy' : 'Today' },
      month: { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd'), label: format(today, 'MMMM yyyy', { locale: dateLocale }) },
      year: { start: format(startOfYear(today), 'yyyy-MM-dd'), end: format(endOfYear(today), 'yyyy-MM-dd'), label: format(today, 'yyyy') },
      custom: { start: customStartDate, end: customEndDate, label: customStartDate && customEndDate ? `${format(new Date(customStartDate), 'dd/MM/yyyy')} - ${format(new Date(customEndDate), 'dd/MM/yyyy')}` : 'Personalizado' }
    };
  };

  // Load main report
  async function loadReport() {
    setLoading(true);
    try {
      const ranges = getDateRanges();
      
      if (selectedPeriod === 'custom' && (!customStartDate || !customEndDate)) {
        toast.error(language === 'es' ? 'Selecciona las fechas' : 'Select dates');
        setLoading(false);
        return;
      }
      
      const [todayDeps, monthDeps, yearDeps, expenses, incomes] = await Promise.all([
        fetch(`/api/departures?startDate=${ranges.today.start}&endDate=${ranges.today.end}`).then(r => r.json()).catch(() => []),
        fetch(`/api/departures?startDate=${ranges.month.start}&endDate=${ranges.month.end}`).then(r => r.json()).catch(() => []),
        fetch(`/api/departures?startDate=${ranges.year.start}&endDate=${ranges.year.end}`).then(r => r.json()).catch(() => []),
        fetch(`/api/expenses?startDate=${ranges.year.start}&endDate=${ranges.year.end}`).then(r => r.json()).catch(() => []),
        fetch(`/api/incomes?startDate=${ranges.year.start}&endDate=${ranges.year.end}`).then(r => r.json()).catch(() => []),
      ]);
      
      let customDeps = [], customExp = [], customInc = [];
      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        [customDeps, customExp, customInc] = await Promise.all([
          fetch(`/api/departures?startDate=${customStartDate}&endDate=${customEndDate}`).then(r => r.json()).catch(() => []),
          fetch(`/api/expenses?startDate=${customStartDate}&endDate=${customEndDate}`).then(r => r.json()).catch(() => []),
          fetch(`/api/incomes?startDate=${customStartDate}&endDate=${customEndDate}`).then(r => r.json()).catch(() => []),
        ]);
      }
      
      const filterDeps = (data) => (data || []).filter(d => (d.category === 'quad' && canViewQuads) || (d.category === 'buggy' && canViewBuggies));
      const filterExp = (data) => (data || []).filter(e => (e.account === 'GE' && canViewGE) || (e.account === 'E&S' && canViewES));
      
      const calcStats = (deps) => {
        const f = filterDeps(deps);
        const q = f.filter(d => d.category === 'quad');
        const b = f.filter(d => d.category === 'buggy');
        
        // Calculate vehicle counts by product
        const vehiclesByProduct = {};
        f.forEach(d => {
          const productName = d.productName || 'Sin producto';
          const category = d.category;
          const count = parseInt(d.vehiclesCount) || 1;
          
          if (!vehiclesByProduct[productName]) {
            vehiclesByProduct[productName] = { quad: 0, buggy: 0 };
          }
          vehiclesByProduct[productName][category] += count;
        });
        
        return {
          quads: {
            cash: q.reduce((s, d) => s + parseNumber(d.paymentSplitCash), 0),
            bank: q.reduce((s, d) => s + parseNumber(d.paymentSplitBank) + parseNumber(d.paymentSplitWeb), 0),
            gyg: q.reduce((s, d) => s + parseNumber(d.paymentSplitGyg), 0),
            cruise: q.reduce((s, d) => s + parseNumber(d.paymentSplitCruise), 0),
            total: q.reduce((s, d) => s + parseNumber(d.totalGross), 0),
            count: q.length,
            vehicles: q.reduce((s, d) => s + (parseInt(d.vehiclesCount) || 1), 0),
          },
          buggies: {
            cash: b.reduce((s, d) => s + parseNumber(d.paymentSplitCash), 0),
            bank: b.reduce((s, d) => s + parseNumber(d.paymentSplitBank) + parseNumber(d.paymentSplitWeb), 0),
            gyg: b.reduce((s, d) => s + parseNumber(d.paymentSplitGyg), 0),
            cruise: b.reduce((s, d) => s + parseNumber(d.paymentSplitCruise), 0),
            total: b.reduce((s, d) => s + parseNumber(d.totalGross), 0),
            count: b.length,
            vehicles: b.reduce((s, d) => s + (parseInt(d.vehiclesCount) || 1), 0),
          },
          vehiclesByProduct,
          departures: f,
        };
      };
      
      const calcExpStats = (data, range) => {
        const f = filterExp(data).filter(e => e.date >= range.start && e.date <= range.end);
        return {
          GE: { cash: f.filter(e => e.account === 'GE' && e.paymentMethod !== 'banco').reduce((s, e) => s + parseNumber(e.amount), 0),
                bank: f.filter(e => e.account === 'GE' && e.paymentMethod === 'banco').reduce((s, e) => s + parseNumber(e.amount), 0) },
          'E&S': { cash: f.filter(e => e.account === 'E&S' && e.paymentMethod !== 'banco').reduce((s, e) => s + parseNumber(e.amount), 0),
                   bank: f.filter(e => e.account === 'E&S' && e.paymentMethod === 'banco').reduce((s, e) => s + parseNumber(e.amount), 0) }
        };
      };
      
      const calcIncStats = (data, range) => {
        const f = filterExp(data).filter(i => i.date >= range.start && i.date <= range.end);
        return {
          GE: { cash: f.filter(i => i.account === 'GE' && i.paymentMethod !== 'banco').reduce((s, i) => s + parseNumber(i.amount), 0),
                bank: f.filter(i => i.account === 'GE' && i.paymentMethod === 'banco').reduce((s, i) => s + parseNumber(i.amount), 0) },
          'E&S': { cash: f.filter(i => i.account === 'E&S' && i.paymentMethod !== 'banco').reduce((s, i) => s + parseNumber(i.amount), 0),
                   bank: f.filter(i => i.account === 'E&S' && i.paymentMethod === 'banco').reduce((s, i) => s + parseNumber(i.amount), 0) }
        };
      };
      
      const reportObj = {
        periods: { today: calcStats(todayDeps), month: calcStats(monthDeps), year: calcStats(yearDeps) },
        expenses: { today: calcExpStats(expenses, ranges.today), month: calcExpStats(expenses, ranges.month), year: calcExpStats(expenses, ranges.year) },
        incomes: { today: calcIncStats(incomes, ranges.today), month: calcIncStats(incomes, ranges.month), year: calcIncStats(incomes, ranges.year) },
        labels: ranges,
      };
      
      if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
        reportObj.periods.custom = calcStats(customDeps);
        reportObj.expenses.custom = calcExpStats(customExp, { start: customStartDate, end: customEndDate });
        reportObj.incomes.custom = calcIncStats(customInc, { start: customStartDate, end: customEndDate });
      }
      
      setReportData(reportObj);
    } catch (error) {
      console.error(error);
      toast.error('Error');
    } finally {
      setLoading(false);
    }
  }
  
  // Load categories
  async function loadCategories() {
    try {
      const [expRes, incRes] = await Promise.all([
        fetch('/api/expense-categories').then(r => r.json()).catch(() => []),
        fetch('/api/income-categories').then(r => r.json()).catch(() => [])
      ]);
      setExpenseCategories(expRes || []);
      setIncomeCategories(incRes || []);
    } catch (e) { console.error(e); }
  }
  
  useEffect(() => { loadReport(); loadCategories(); }, []);
  
  // Calculate balance
  const calcBalance = (period) => {
    if (!reportData?.periods[period]) return null;
    const s = reportData.periods[period], e = reportData.expenses[period], i = reportData.incomes[period];
    return {
      quads: {
        cashNet: s.quads.cash + i.GE.cash - e.GE.cash,
        bankNet: s.quads.bank + i.GE.bank - e.GE.bank,
      },
      buggies: {
        cashNet: s.buggies.cash + i['E&S'].cash - e['E&S'].cash,
        bankNet: s.buggies.bank + i['E&S'].bank - e['E&S'].bank,
      }
    };
  };
  
  // Generate unified detailed report
  async function generateDetailedReport() {
    if (!detailedStartDate || !detailedEndDate) {
      toast.error(language === 'es' ? 'Selecciona las fechas' : 'Select dates');
      return;
    }
    
    setDetailedLoading(true);
    try {
      const [expRes, incRes, depsRes] = await Promise.all([
        fetch(`/api/expenses?startDate=${detailedStartDate}&endDate=${detailedEndDate}`).then(r => r.json()).catch(() => []),
        fetch(`/api/incomes?startDate=${detailedStartDate}&endDate=${detailedEndDate}`).then(r => r.json()).catch(() => []),
        fetch(`/api/departures?startDate=${detailedStartDate}&endDate=${detailedEndDate}`).then(r => r.json()).catch(() => []),
      ]);
      
      // Filter by permissions
      let expenses = (expRes || []).filter(e => (e.account === 'GE' && canViewGE) || (e.account === 'E&S' && canViewES));
      let incomes = (incRes || []).filter(i => (i.account === 'GE' && canViewGE) || (i.account === 'E&S' && canViewES));
      let departures = (depsRes || []).filter(d => (d.category === 'quad' && canViewQuads) || (d.category === 'buggy' && canViewBuggies));
      
      // Apply account filter
      if (detailedAccount !== 'all') {
        const accMap = { 'GE': 'quad', 'E&S': 'buggy' };
        expenses = expenses.filter(e => e.account === detailedAccount);
        incomes = incomes.filter(i => i.account === detailedAccount);
        departures = departures.filter(d => d.category === accMap[detailedAccount]);
      }
      
      // Apply concept filter
      if (detailedConcept !== 'all') {
        expenses = expenses.filter(e => e.concept === detailedConcept);
        incomes = incomes.filter(i => i.concept === detailedConcept);
      }
      
      // Apply payment method filter
      if (detailedPaymentMethod !== 'all') {
        expenses = expenses.filter(e => (e.paymentMethod || 'efectivo') === detailedPaymentMethod);
        incomes = incomes.filter(i => (i.paymentMethod || 'efectivo') === detailedPaymentMethod);
      }
      
      // Calculate totals
      const expTotal = expenses.reduce((s, e) => s + parseNumber(e.amount), 0);
      const incTotal = incomes.reduce((s, i) => s + parseNumber(i.amount), 0);
      const expByCash = expenses.filter(e => e.paymentMethod !== 'banco').reduce((s, e) => s + parseNumber(e.amount), 0);
      const expByBank = expenses.filter(e => e.paymentMethod === 'banco').reduce((s, e) => s + parseNumber(e.amount), 0);
      const incByCash = incomes.filter(i => i.paymentMethod !== 'banco').reduce((s, i) => s + parseNumber(i.amount), 0);
      const incByBank = incomes.filter(i => i.paymentMethod === 'banco').reduce((s, i) => s + parseNumber(i.amount), 0);
      
      // Departures totals - SOLO efectivo y banco (NO GYG ni cruceros)
      const depsCash = departures.reduce((s, d) => s + parseNumber(d.paymentSplitCash), 0);
      const depsBank = departures.reduce((s, d) => s + parseNumber(d.paymentSplitBank) + parseNumber(d.paymentSplitWeb), 0);
      const depsGyg = departures.reduce((s, d) => s + parseNumber(d.paymentSplitGyg), 0);
      const depsCruise = departures.reduce((s, d) => s + parseNumber(d.paymentSplitCruise), 0);
      const depsTotal = departures.reduce((s, d) => s + parseNumber(d.totalGross), 0);
      // Ingresos reales de tours (sin pendientes de GYG y cruceros)
      const depsRealIncome = depsCash + depsBank;
      
      // Balance REAL = Ingresos Tours (efectivo+banco) + Ingresos Extra - Gastos
      // NO incluye GYG ni cruceros porque son pendientes de cobrar
      const realBalance = depsRealIncome + incTotal - expTotal;
      
      // Balance por método de pago
      const balanceCash = depsCash + incByCash - expByCash;
      const balanceBank = depsBank + incByBank - expByBank;
      
      setDetailedResults({
        expenses, incomes, departures,
        expTotal, incTotal, expByCash, expByBank, incByCash, incByBank,
        depsCash, depsBank, depsGyg, depsCruise, depsTotal, depsRealIncome,
        balance: realBalance,
        balanceCash,
        balanceBank,
        // Store which sections are selected
        showTours,
        showExpenses,
        showIncomes,
        filters: { startDate: detailedStartDate, endDate: detailedEndDate, account: detailedAccount }
      });
    } catch (error) {
      toast.error('Error');
    } finally {
      setDetailedLoading(false);
    }
  }
  
  // Export detailed PDF
  function exportDetailedPDF() {
    if (!detailedResults) return;
    
    const doc = new jsPDF();
    const r = detailedResults;
    let y = 20;
    
    doc.setFontSize(16);
    doc.text(language === 'es' ? 'INFORME DETALLADO' : 'DETAILED REPORT', 14, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`${language === 'es' ? 'Período' : 'Period'}: ${format(new Date(r.filters.startDate), 'dd/MM/yyyy')} - ${format(new Date(r.filters.endDate), 'dd/MM/yyyy')}`, 14, y);
    y += 5;
    doc.text(`${language === 'es' ? 'Generado' : 'Generated'}: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, y);
    y += 10;
    
    // Tours Section
    if (r.showTours && r.departures.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 100, 0);
      doc.text(language === 'es' ? 'TOURS' : 'TOURS', 14, y);
      y += 5;
      doc.setTextColor(0, 0, 0);
      
      doc.autoTable({
        startY: y,
        head: [[
          language === 'es' ? 'Fecha' : 'Date',
          language === 'es' ? 'Hora' : 'Time',
          language === 'es' ? 'Tipo' : 'Type',
          language === 'es' ? 'Veh.' : 'Veh.',
          language === 'es' ? 'Efectivo' : 'Cash',
          language === 'es' ? 'Banco' : 'Bank',
          'Total',
          language === 'es' ? 'Notas' : 'Notes'
        ]],
        body: r.departures.map(d => [
          format(new Date(d.date), 'dd/MM/yyyy'),
          d.timeSlot || '-',
          d.category === 'quad' ? 'Quad' : 'Buggy',
          d.vehiclesCount || 1,
          formatCurrency(parseNumber(d.paymentSplitCash)),
          formatCurrency(parseNumber(d.paymentSplitBank) + parseNumber(d.paymentSplitWeb)),
          formatCurrency(parseNumber(d.totalGross)),
          d.notes || '-'
        ]),
        foot: [[
          { content: 'TOTAL COBRADO', colSpan: 4, styles: { fontStyle: 'bold' } },
          { content: formatCurrency(r.depsCash), styles: { fontStyle: 'bold' } },
          { content: formatCurrency(r.depsBank), styles: { fontStyle: 'bold' } },
          { content: formatCurrency(r.depsRealIncome), styles: { fontStyle: 'bold' } },
          ''
        ]],
        theme: 'grid',
        headStyles: { fillColor: [34, 139, 34] },
        footStyles: { fillColor: [220, 220, 220] },
        styles: { fontSize: 7 },
        columnStyles: { 7: { cellWidth: 40 } }
      });
      
      y = doc.lastAutoTable.finalY + 5;
      
      // Mostrar pendientes si existen
      if (r.depsGyg > 0 || r.depsCruise > 0) {
        doc.setFontSize(8);
        doc.setTextColor(150, 100, 0);
        doc.text(`Pendiente de cobro: GYG ${formatCurrency(r.depsGyg)} | Cruceros ${formatCurrency(r.depsCruise)}`, 14, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
      }
      
      y += 5;
    }
    
    // Expenses Section
    if (r.showExpenses && r.expenses.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      
      doc.setFontSize(12);
      doc.setTextColor(200, 0, 0);
      doc.text(language === 'es' ? 'GASTOS' : 'EXPENSES', 14, y);
      y += 5;
      doc.setTextColor(0, 0, 0);
      
      doc.autoTable({
        startY: y,
        head: [[
          language === 'es' ? 'Fecha' : 'Date',
          language === 'es' ? 'Cuenta' : 'Account',
          language === 'es' ? 'Concepto' : 'Concept',
          language === 'es' ? 'Método' : 'Method',
          language === 'es' ? 'Cantidad' : 'Amount',
          language === 'es' ? 'Notas' : 'Notes'
        ]],
        body: r.expenses.map(e => [
          format(new Date(e.date), 'dd/MM/yyyy'),
          e.account,
          e.concept,
          e.paymentMethod === 'banco' ? 'Banco' : 'Efectivo',
          `-${formatCurrency(e.amount)}`,
          e.notes || '-'
        ]),
        foot: [[
          { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold' } },
          { content: `-${formatCurrency(r.expTotal)}`, styles: { fontStyle: 'bold', textColor: [200, 0, 0] } },
          ''
        ]],
        theme: 'grid',
        headStyles: { fillColor: [200, 50, 50] },
        footStyles: { fillColor: [220, 220, 220] },
        styles: { fontSize: 7 },
        columnStyles: { 5: { cellWidth: 40 } }
      });
      
      y = doc.lastAutoTable.finalY + 10;
    }
    
    // Incomes Section
    if (r.showIncomes && r.incomes.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      
      doc.setFontSize(12);
      doc.setTextColor(0, 150, 0);
      doc.text(language === 'es' ? 'INGRESOS EXTRA' : 'EXTRA INCOME', 14, y);
      y += 5;
      doc.setTextColor(0, 0, 0);
      
      doc.autoTable({
        startY: y,
        head: [[
          language === 'es' ? 'Fecha' : 'Date',
          language === 'es' ? 'Cuenta' : 'Account',
          language === 'es' ? 'Concepto' : 'Concept',
          language === 'es' ? 'Método' : 'Method',
          language === 'es' ? 'Cantidad' : 'Amount',
          language === 'es' ? 'Notas' : 'Notes'
        ]],
        body: r.incomes.map(i => [
          format(new Date(i.date), 'dd/MM/yyyy'),
          i.account,
          i.concept,
          i.paymentMethod === 'banco' ? 'Banco' : 'Efectivo',
          `+${formatCurrency(i.amount)}`,
          i.notes || '-'
        ]),
        foot: [[
          { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold' } },
          { content: `+${formatCurrency(r.incTotal)}`, styles: { fontStyle: 'bold', textColor: [0, 150, 0] } },
          ''
        ]],
        theme: 'grid',
        headStyles: { fillColor: [50, 150, 50] },
        footStyles: { fillColor: [220, 220, 220] },
        styles: { fontSize: 7 },
        columnStyles: { 5: { cellWidth: 40 } }
      });
      
      y = doc.lastAutoTable.finalY + 10;
    }
    
    // Balance Summary - Si hay ingresos (tours o extra) Y gastos
    if ((r.showTours || r.showIncomes) && r.showExpenses) {
      if (y > 250) { doc.addPage(); y = 20; }
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 150);
      doc.text(language === 'es' ? 'BALANCE' : 'BALANCE', 14, y);
      doc.setTextColor(0, 0, 0);
      y += 8;
      
      const balanceRows = [];
      if (r.showTours) {
        balanceRows.push([language === 'es' ? 'Ingresos Tours (Efectivo + Banco)' : 'Tour Income (Cash + Bank)', `+${formatCurrency(r.depsRealIncome)}`]);
      }
      if (r.showIncomes) {
        balanceRows.push([language === 'es' ? 'Ingresos Extra' : 'Extra Income', `+${formatCurrency(r.incTotal)}`]);
      }
      if (r.showExpenses) {
        balanceRows.push([language === 'es' ? 'Total Gastos' : 'Total Expenses', `-${formatCurrency(r.expTotal)}`]);
      }
      balanceRows.push([{ content: language === 'es' ? 'BALANCE TOTAL' : 'TOTAL BALANCE', styles: { fontStyle: 'bold', fillColor: [230, 230, 250] } }, 
         { content: formatCurrency(r.balance), styles: { fontStyle: 'bold', fillColor: [230, 230, 250], textColor: r.balance >= 0 ? [0, 100, 0] : [200, 0, 0] } }]);
      balanceRows.push(['', '']);
      balanceRows.push([language === 'es' ? '💵 Balance Efectivo' : '💵 Cash Balance', formatCurrency(r.balanceCash)]);
      balanceRows.push([language === 'es' ? '🏦 Balance Banco' : '🏦 Bank Balance', formatCurrency(r.balanceBank)]);
      
      doc.autoTable({
        startY: y,
        body: balanceRows,
        theme: 'grid',
        styles: { fontSize: 10 },
        columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } }
      });
      
      y = doc.lastAutoTable.finalY + 5;
      
      // Nota sobre pendientes
      if (r.showTours && (r.depsGyg > 0 || r.depsCruise > 0)) {
        doc.setFontSize(8);
        doc.setTextColor(150, 100, 0);
        doc.text(`Nota: No incluye pendientes de cobro - GYG: ${formatCurrency(r.depsGyg)} | Cruceros: ${formatCurrency(r.depsCruise)}`, 14, y);
      }
    }
    
    doc.save(`informe_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    toast.success(language === 'es' ? 'PDF descargado' : 'PDF downloaded');
  }
  
  // Export main report PDF
  function exportMainPDF() {
    if (!reportData) return;
    
    const doc = new jsPDF();
    const balance = calcBalance(selectedPeriod);
    const period = reportData.periods[selectedPeriod];
    const label = reportData.labels[selectedPeriod]?.label || selectedPeriod;
    let y = 20;
    
    doc.setFontSize(16);
    doc.text(language === 'es' ? 'INFORME FINANCIERO' : 'FINANCIAL REPORT', 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`${language === 'es' ? 'Período' : 'Period'}: ${label}`, 14, y);
    y += 5;
    doc.text(`${language === 'es' ? 'Generado' : 'Generated'}: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, y);
    y += 10;
    
    // Tours detail
    if (period?.departures?.length > 0) {
      doc.setFontSize(12);
      doc.text(language === 'es' ? 'DESGLOSE DE TOURS' : 'TOUR BREAKDOWN', 14, y);
      y += 5;
      
      doc.autoTable({
        startY: y,
        head: [[
          language === 'es' ? 'Fecha' : 'Date',
          language === 'es' ? 'Hora' : 'Time',
          language === 'es' ? 'Tipo' : 'Type',
          language === 'es' ? 'Vehículos' : 'Vehicles',
          language === 'es' ? 'Efectivo' : 'Cash',
          language === 'es' ? 'Banco' : 'Bank',
          'Total'
        ]],
        body: period.departures.map(d => [
          format(new Date(d.date), 'dd/MM/yyyy'),
          d.timeSlot || '-',
          d.category === 'quad' ? 'Quad' : 'Buggy',
          d.vehiclesCount || 1,
          formatCurrency(parseNumber(d.paymentSplitCash)),
          formatCurrency(parseNumber(d.paymentSplitBank) + parseNumber(d.paymentSplitWeb)),
          formatCurrency(parseNumber(d.totalGross))
        ]),
        foot: [[
          { content: 'TOTALES', colSpan: 4, styles: { fontStyle: 'bold' } },
          { content: formatCurrency(period.quads.cash + period.buggies.cash), styles: { fontStyle: 'bold' } },
          { content: formatCurrency(period.quads.bank + period.buggies.bank), styles: { fontStyle: 'bold' } },
          { content: formatCurrency(period.quads.total + period.buggies.total), styles: { fontStyle: 'bold' } }
        ]],
        theme: 'grid',
        headStyles: { fillColor: [230, 126, 34] },
        footStyles: { fillColor: [220, 220, 220] },
        styles: { fontSize: 8 }
      });
      
      y = doc.lastAutoTable.finalY + 10;
    }
    
    // Vehicles Breakdown
    if (period?.vehiclesByProduct && Object.keys(period.vehiclesByProduct).length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 128, 128);
      doc.text(language === 'es' ? 'VEHICULOS FACTURADOS' : 'VEHICLES INVOICED', 14, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
      
      const vehiclesBody = [];
      const productNames = Object.keys(period.vehiclesByProduct).sort();
      
      productNames.forEach(product => {
        const data = period.vehiclesByProduct[product];
        const qCount = canViewQuads ? (data.quad || 0) : 0;
        const bCount = canViewBuggies ? (data.buggy || 0) : 0;
        if (qCount > 0 || bCount > 0) {
          vehiclesBody.push([
            product,
            canViewQuads ? (qCount > 0 ? qCount.toString() : '-') : '',
            canViewBuggies ? (bCount > 0 ? bCount.toString() : '-') : '',
            (qCount + bCount).toString()
          ]);
        }
      });
      
      const totalQuads = period.quads.vehicles || 0;
      const totalBuggies = period.buggies.vehicles || 0;
      
      const vehiclesHead = [[
        language === 'es' ? 'Producto' : 'Product',
        ...(canViewQuads ? ['Quads'] : []),
        ...(canViewBuggies ? ['Buggies'] : []),
        'Total'
      ]];
      
      const vehiclesFoot = [[
        { content: 'TOTAL', styles: { fontStyle: 'bold' } },
        ...(canViewQuads ? [{ content: totalQuads.toString(), styles: { fontStyle: 'bold' } }] : []),
        ...(canViewBuggies ? [{ content: totalBuggies.toString(), styles: { fontStyle: 'bold' } }] : []),
        { content: ((canViewQuads ? totalQuads : 0) + (canViewBuggies ? totalBuggies : 0)).toString(), styles: { fontStyle: 'bold' } }
      ]];
      
      // Rebuild body with correct columns
      const finalBody = productNames.map(product => {
        const data = period.vehiclesByProduct[product];
        const qCount = data.quad || 0;
        const bCount = data.buggy || 0;
        return [
          product,
          ...(canViewQuads ? [qCount > 0 ? qCount.toString() : '-'] : []),
          ...(canViewBuggies ? [bCount > 0 ? bCount.toString() : '-'] : []),
          ((canViewQuads ? qCount : 0) + (canViewBuggies ? bCount : 0)).toString()
        ];
      }).filter(row => {
        // Only include rows with at least one vehicle
        const total = parseInt(row[row.length - 1]);
        return total > 0;
      });
      
      if (finalBody.length > 0) {
        doc.autoTable({
          startY: y,
          head: vehiclesHead,
          body: finalBody,
          foot: vehiclesFoot,
          theme: 'grid',
          headStyles: { fillColor: [0, 128, 128] },
          footStyles: { fillColor: [220, 220, 220] },
          styles: { fontSize: 9 },
          columnStyles: { 
            0: { cellWidth: 60 },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center', fontStyle: 'bold' }
          }
        });
        
        y = doc.lastAutoTable.finalY + 10;
      }
    }
    
    // VAT Summary
    const totalGross = (canViewQuads ? period.quads.total : 0) + (canViewBuggies ? period.buggies.total : 0);
    const totalNet = totalGross / 1.21;
    const totalVat = totalGross - totalNet;
    const cashTotal = (canViewQuads ? period.quads.cash : 0) + (canViewBuggies ? period.buggies.cash : 0);
    const vatNoCash = totalVat - (cashTotal - cashTotal / 1.21);
    
    doc.setFontSize(12);
    doc.text(language === 'es' ? 'DESGLOSE FISCAL' : 'TAX BREAKDOWN', 14, y);
    y += 5;
    
    doc.autoTable({
      startY: y,
      body: [
        [language === 'es' ? 'Bruto (con IVA)' : 'Gross (with VAT)', formatCurrency(totalGross)],
        [language === 'es' ? 'Neto (sin IVA)' : 'Net (without VAT)', formatCurrency(totalNet)],
        [language === 'es' ? 'IVA Total (21%)' : 'Total VAT (21%)', formatCurrency(totalVat)],
        [language === 'es' ? 'IVA a Declarar (sin efectivo)' : 'VAT to Declare', formatCurrency(vatNoCash)],
      ],
      theme: 'grid',
      columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } },
      styles: { fontSize: 9 }
    });
    
    y = doc.lastAutoTable.finalY + 10;
    
    // Balance
    if (balance) {
      doc.setFontSize(12);
      doc.text(language === 'es' ? 'BALANCE' : 'BALANCE', 14, y);
      y += 5;
      
      const balanceData = [];
      if (canViewQuads) {
        balanceData.push(['Quads - Efectivo', formatCurrency(balance.quads.cashNet)]);
        balanceData.push(['Quads - Banco', formatCurrency(balance.quads.bankNet)]);
      }
      if (canViewBuggies) {
        balanceData.push(['Buggies - Efectivo', formatCurrency(balance.buggies.cashNet)]);
        balanceData.push(['Buggies - Banco', formatCurrency(balance.buggies.bankNet)]);
      }
      
      doc.autoTable({
        startY: y,
        body: balanceData,
        theme: 'grid',
        columnStyles: { 1: { fontStyle: 'bold', halign: 'right' } },
        styles: { fontSize: 9 }
      });
    }
    
    doc.save(`informe_principal_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast.success(language === 'es' ? 'PDF descargado' : 'PDF downloaded');
  }
  
  // Get concepts for filters
  const getConcepts = () => {
    const concepts = new Set();
    expenseCategories.forEach(c => concepts.add(c.name));
    incomeCategories.forEach(c => concepts.add(c.name));
    return Array.from(concepts);
  };

  if (loading && !reportData) {
    return <div className="flex justify-center p-12"><RefreshCw className="h-8 w-8 animate-spin text-orange-600" /></div>;
  }

  const balance = calcBalance(selectedPeriod);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">📊 {language === 'es' ? 'Informes Financieros' : 'Financial Reports'}</h2>
          <p className="text-muted-foreground">{language === 'es' ? 'Resumen completo de ventas, gastos e ingresos' : 'Complete summary'}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadReport} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {language === 'es' ? 'Actualizar' : 'Refresh'}
          </Button>
          <Button onClick={exportMainPDF} disabled={!reportData}>
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
              {['today', 'month', 'year', 'custom'].map(p => (
                <Button key={p} variant={selectedPeriod === p ? 'default' : 'outline'} size="sm" onClick={() => setSelectedPeriod(p)}>
                  {p === 'today' && <><Clock className="h-4 w-4 mr-1" />{language === 'es' ? 'Hoy' : 'Today'}</>}
                  {p === 'month' && <><CalendarDays className="h-4 w-4 mr-1" />{language === 'es' ? 'Mes' : 'Month'}</>}
                  {p === 'year' && <><CalendarRange className="h-4 w-4 mr-1" />{language === 'es' ? 'Año' : 'Year'}</>}
                  {p === 'custom' && <><Search className="h-4 w-4 mr-1" />{language === 'es' ? 'Personalizado' : 'Custom'}</>}
                </Button>
              ))}
            </div>
          </div>
          {selectedPeriod === 'custom' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg flex flex-wrap items-end gap-4">
              <div><Label>Desde</Label><Input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="mt-1 w-40" /></div>
              <div><Label>Hasta</Label><Input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="mt-1 w-40" /></div>
              <Button onClick={loadReport} disabled={!customStartDate || !customEndDate}><Search className="h-4 w-4 mr-2" />{language === 'es' ? 'Generar' : 'Generate'}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Sales Table */}
          <Card>
            <CardHeader className="bg-orange-50 border-b">
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-orange-600" />💰 {language === 'es' ? 'Ventas Tours' : 'Tour Sales'}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{language === 'es' ? 'Período' : 'Period'}</TableHead>
                    {canViewQuads && <><TableHead className="text-center text-blue-700">Quads 💵</TableHead><TableHead className="text-center text-blue-700">Quads 🏦</TableHead></>}
                    {canViewBuggies && <><TableHead className="text-center text-green-700">Buggies 💵</TableHead><TableHead className="text-center text-green-700">Buggies 🏦</TableHead></>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['today', 'month', 'year', ...(selectedPeriod === 'custom' ? ['custom'] : [])].map(p => reportData.periods[p] && (
                    <TableRow key={p} className={selectedPeriod === p ? 'bg-orange-50' : ''}>
                      <TableCell><Badge variant={selectedPeriod === p ? 'default' : 'outline'}>{reportData.labels[p]?.label}</Badge></TableCell>
                      {canViewQuads && <><TableCell className="text-center font-semibold text-blue-600">{formatCurrency(reportData.periods[p].quads.cash)}</TableCell><TableCell className="text-center font-semibold text-blue-600">{formatCurrency(reportData.periods[p].quads.bank)}</TableCell></>}
                      {canViewBuggies && <><TableCell className="text-center font-semibold text-green-600">{formatCurrency(reportData.periods[p].buggies.cash)}</TableCell><TableCell className="text-center font-semibold text-green-600">{formatCurrency(reportData.periods[p].buggies.bank)}</TableCell></>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Vehicles Breakdown */}
          <Card className="border-2 border-teal-200">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200">
              <CardTitle className="flex items-center gap-2 text-teal-700">
                <Car className="h-5 w-5" />
                🚗 {language === 'es' ? 'Vehículos Facturados' : 'Vehicles Invoiced'}
                <Badge variant="outline" className="ml-2 bg-white">
                  {reportData.labels[selectedPeriod]?.label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                const p = reportData.periods[selectedPeriod];
                if (!p) return null;
                const totalQuads = p.quads.vehicles || 0;
                const totalBuggies = p.buggies.vehicles || 0;
                const vehiclesByProduct = p.vehiclesByProduct || {};
                const productNames = Object.keys(vehiclesByProduct).sort();
                
                return (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      {canViewQuads && (
                        <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 text-center">
                          <div className="flex items-center justify-center gap-2 text-blue-600 font-medium mb-1">
                            <Car className="h-4 w-4" /> Quads
                          </div>
                          <div className="text-3xl font-bold text-blue-700">{totalQuads}</div>
                          <div className="text-xs text-blue-500">{language === 'es' ? 'vehículos' : 'vehicles'}</div>
                        </div>
                      )}
                      {canViewBuggies && (
                        <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200 text-center">
                          <div className="flex items-center justify-center gap-2 text-green-600 font-medium mb-1">
                            <Truck className="h-4 w-4" /> Buggies
                          </div>
                          <div className="text-3xl font-bold text-green-700">{totalBuggies}</div>
                          <div className="text-xs text-green-500">{language === 'es' ? 'vehículos' : 'vehicles'}</div>
                        </div>
                      )}
                      <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-300 text-center">
                        <div className="text-teal-600 font-medium mb-1">📊 Total</div>
                        <div className="text-3xl font-bold text-teal-700">{(canViewQuads ? totalQuads : 0) + (canViewBuggies ? totalBuggies : 0)}</div>
                        <div className="text-xs text-teal-500">{language === 'es' ? 'vehículos' : 'vehicles'}</div>
                      </div>
                    </div>
                    
                    {/* Breakdown by Product */}
                    {productNames.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                          📦 {language === 'es' ? 'Desglose por Producto' : 'Breakdown by Product'}
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-teal-50">
                              <TableHead>{language === 'es' ? 'Producto' : 'Product'}</TableHead>
                              {canViewQuads && <TableHead className="text-center text-blue-700">🏍️ Quads</TableHead>}
                              {canViewBuggies && <TableHead className="text-center text-green-700">🚙 Buggies</TableHead>}
                              <TableHead className="text-center font-bold">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {productNames.map(product => {
                              const data = vehiclesByProduct[product];
                              const qCount = data.quad || 0;
                              const bCount = data.buggy || 0;
                              return (
                                <TableRow key={product}>
                                  <TableCell className="font-medium">{product}</TableCell>
                                  {canViewQuads && <TableCell className="text-center text-blue-600">{qCount > 0 ? qCount : '-'}</TableCell>}
                                  {canViewBuggies && <TableCell className="text-center text-green-600">{bCount > 0 ? bCount : '-'}</TableCell>}
                                  <TableCell className="text-center font-bold">{(canViewQuads ? qCount : 0) + (canViewBuggies ? bCount : 0)}</TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-teal-100 font-bold">
                              <TableCell>TOTAL</TableCell>
                              {canViewQuads && <TableCell className="text-center text-blue-700">{totalQuads}</TableCell>}
                              {canViewBuggies && <TableCell className="text-center text-green-700">{totalBuggies}</TableCell>}
                              <TableCell className="text-center text-teal-800 text-lg">{(canViewQuads ? totalQuads : 0) + (canViewBuggies ? totalBuggies : 0)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* VAT Breakdown */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-purple-50 border-b">
              <CardTitle className="flex items-center gap-2 text-purple-700"><Building2 className="h-5 w-5" />🧾 {language === 'es' ? 'Desglose Fiscal (IVA 21%)' : 'Tax Breakdown'}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {(() => {
                const p = reportData.periods[selectedPeriod];
                if (!p) return null;
                const qT = p.quads.total, bT = p.buggies.total;
                const qN = qT / 1.21, bN = bT / 1.21;
                const qV = qT - qN, bV = bT - bN;
                const qC = p.quads.cash, bC = p.buggies.cash;
                const qVnC = qV - (qC - qC / 1.21), bVnC = bV - (bC - bC / 1.21);
                return (
                  <Table>
                    <TableHeader><TableRow className="bg-purple-50">
                      <TableHead>{language === 'es' ? 'Concepto' : 'Concept'}</TableHead>
                      {canViewQuads && <TableHead className="text-center">Quads</TableHead>}
                      {canViewBuggies && <TableHead className="text-center">Buggies</TableHead>}
                      <TableHead className="text-center font-bold">TOTAL</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      <TableRow><TableCell>💰 Bruto</TableCell>{canViewQuads && <TableCell className="text-center">{formatCurrency(qT)}</TableCell>}{canViewBuggies && <TableCell className="text-center">{formatCurrency(bT)}</TableCell>}<TableCell className="text-center font-bold">{formatCurrency((canViewQuads ? qT : 0) + (canViewBuggies ? bT : 0))}</TableCell></TableRow>
                      <TableRow className="bg-gray-50"><TableCell>📊 Neto</TableCell>{canViewQuads && <TableCell className="text-center">{formatCurrency(qN)}</TableCell>}{canViewBuggies && <TableCell className="text-center">{formatCurrency(bN)}</TableCell>}<TableCell className="text-center font-bold">{formatCurrency((canViewQuads ? qN : 0) + (canViewBuggies ? bN : 0))}</TableCell></TableRow>
                      <TableRow><TableCell>🏛️ IVA Total</TableCell>{canViewQuads && <TableCell className="text-center text-purple-600">{formatCurrency(qV)}</TableCell>}{canViewBuggies && <TableCell className="text-center text-purple-600">{formatCurrency(bV)}</TableCell>}<TableCell className="text-center font-bold text-purple-700">{formatCurrency((canViewQuads ? qV : 0) + (canViewBuggies ? bV : 0))}</TableCell></TableRow>
                      <TableRow className="bg-amber-50"><TableCell>⚡ IVA sin Efectivo</TableCell>{canViewQuads && <TableCell className="text-center font-bold text-amber-700">{formatCurrency(qVnC)}</TableCell>}{canViewBuggies && <TableCell className="text-center font-bold text-amber-700">{formatCurrency(bVnC)}</TableCell>}<TableCell className="text-center font-bold text-amber-800 text-lg">{formatCurrency((canViewQuads ? qVnC : 0) + (canViewBuggies ? bVnC : 0))}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>

          {/* Balance */}
          {balance && (
            <Card className="border-4 border-orange-400">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <CardTitle className="text-xl flex items-center gap-2"><Wallet className="h-6 w-6" />💰 {language === 'es' ? 'BALANCE REAL' : 'REAL BALANCE'}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {canViewQuads && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2"><Car className="h-5 w-5" />QUADS (GE)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-xl border-2 border-green-300 text-center">
                          <div className="text-sm text-green-600">💵 Efectivo</div>
                          <div className={`text-2xl font-bold ${balance.quads.cashNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(balance.quads.cashNet)}</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-300 text-center">
                          <div className="text-sm text-blue-600">🏦 Banco</div>
                          <div className={`text-2xl font-bold ${balance.quads.bankNet >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatCurrency(balance.quads.bankNet)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {canViewBuggies && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-green-700 flex items-center gap-2"><Truck className="h-5 w-5" />BUGGIES (E&S)</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-xl border-2 border-green-300 text-center">
                          <div className="text-sm text-green-600">💵 Efectivo</div>
                          <div className={`text-2xl font-bold ${balance.buggies.cashNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(balance.buggies.cashNet)}</div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-300 text-center">
                          <div className="text-sm text-blue-600">🏦 Banco</div>
                          <div className={`text-2xl font-bold ${balance.buggies.bankNet >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatCurrency(balance.buggies.bankNet)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unified Detailed Report */}
          <Card className="border-2 border-indigo-300">
            <CardHeader className="bg-indigo-50">
              <CardTitle className="text-indigo-700 flex items-center gap-2"><FileText className="h-5 w-5" />📋 {language === 'es' ? 'Informe Detallado Personalizado' : 'Custom Detailed Report'}</CardTitle>
              <CardDescription>{language === 'es' ? 'Genera un informe con filtros específicos y descárgalo en PDF' : 'Generate a report with specific filters'}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-6 mb-4">
                <div><Label>Desde</Label><Input type="date" value={detailedStartDate} onChange={e => setDetailedStartDate(e.target.value)} className="mt-1" /></div>
                <div><Label>Hasta</Label><Input type="date" value={detailedEndDate} onChange={e => setDetailedEndDate(e.target.value)} className="mt-1" /></div>
                <div>
                  <Label>{language === 'es' ? 'Incluir' : 'Include'}</Label>
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="showTours" checked={showTours} onCheckedChange={setShowTours} />
                      <label htmlFor="showTours" className="text-sm cursor-pointer">🚗 Tours</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="showExpenses" checked={showExpenses} onCheckedChange={setShowExpenses} />
                      <label htmlFor="showExpenses" className="text-sm cursor-pointer">💸 Gastos</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="showIncomes" checked={showIncomes} onCheckedChange={setShowIncomes} />
                      <label htmlFor="showIncomes" className="text-sm cursor-pointer">💰 Ingresos Extra</label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label>{language === 'es' ? 'Cuenta' : 'Account'}</Label>
                  <Select value={detailedAccount} onValueChange={setDetailedAccount}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'es' ? 'Todas' : 'All'}</SelectItem>
                      {canViewGE && <SelectItem value="GE">GE (Quads)</SelectItem>}
                      {canViewES && <SelectItem value="E&S">E&S (Buggies)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'es' ? 'Método' : 'Method'}</Label>
                  <Select value={detailedPaymentMethod} onValueChange={setDetailedPaymentMethod}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'es' ? 'Todos' : 'All'}</SelectItem>
                      <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="banco">🏦 Banco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'es' ? 'Concepto' : 'Concept'}</Label>
                  <Select value={detailedConcept} onValueChange={setDetailedConcept}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'es' ? 'Todos' : 'All'}</SelectItem>
                      {getConcepts().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={generateDetailedReport} className="bg-indigo-600 hover:bg-indigo-700" disabled={detailedLoading}>
                    {detailedLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
                    {language === 'es' ? 'Generar' : 'Generate'}
                  </Button>
                </div>
              </div>
              
              {detailedResults && (
                <div className="space-y-4 mt-6">
                  {/* Summary Cards - Según las opciones seleccionadas */}
                  <div className="grid md:grid-cols-4 gap-4">
                    {/* Tours Card */}
                    {detailedResults.showTours && (
                      <div className="p-4 bg-orange-100 rounded-lg">
                        <div className="text-sm text-orange-600">{language === 'es' ? 'Ingresos Tours' : 'Tour Income'}</div>
                        <div className="text-xl font-bold">{formatCurrency(detailedResults.depsRealIncome)}</div>
                        <div className="text-xs text-muted-foreground">💵 {formatCurrency(detailedResults.depsCash)} | 🏦 {formatCurrency(detailedResults.depsBank)}</div>
                        {(detailedResults.depsGyg > 0 || detailedResults.depsCruise > 0) && (
                          <div className="text-xs text-orange-500 mt-1">⏳ Pendiente: GYG {formatCurrency(detailedResults.depsGyg)} | Cruceros {formatCurrency(detailedResults.depsCruise)}</div>
                        )}
                      </div>
                    )}
                    
                    {/* Incomes Card */}
                    {detailedResults.showIncomes && (
                      <div className="p-4 bg-green-100 rounded-lg">
                        <div className="text-sm text-green-600">{language === 'es' ? 'Ingresos Extra' : 'Extra Income'}</div>
                        <div className="text-xl font-bold text-green-700">+{formatCurrency(detailedResults.incTotal)}</div>
                        <div className="text-xs text-muted-foreground">💵 {formatCurrency(detailedResults.incByCash)} | 🏦 {formatCurrency(detailedResults.incByBank)}</div>
                      </div>
                    )}
                    
                    {/* Expenses Card */}
                    {detailedResults.showExpenses && (
                      <div className="p-4 bg-red-100 rounded-lg">
                        <div className="text-sm text-red-600">{language === 'es' ? 'Gastos' : 'Expenses'}</div>
                        <div className="text-xl font-bold text-red-700">-{formatCurrency(detailedResults.expTotal)}</div>
                        <div className="text-xs text-muted-foreground">💵 {formatCurrency(detailedResults.expByCash)} | 🏦 {formatCurrency(detailedResults.expByBank)}</div>
                      </div>
                    )}
                    
                    {/* Balance Card - Solo si hay tours o ingresos Y gastos */}
                    {(detailedResults.showTours || detailedResults.showIncomes) && detailedResults.showExpenses && (
                      <div className="p-4 bg-indigo-100 rounded-lg border-2 border-indigo-300">
                        <div className="text-sm text-indigo-600 font-semibold">{language === 'es' ? 'BALANCE' : 'BALANCE'}</div>
                        <div className={`text-2xl font-bold ${detailedResults.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(detailedResults.balance)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          💵 {formatCurrency(detailedResults.balanceCash)} | 🏦 {formatCurrency(detailedResults.balanceBank)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Download PDF Button */}
                  <div className="flex justify-end">
                    <Button onClick={exportDetailedPDF} className="bg-indigo-600 hover:bg-indigo-700">
                      <Download className="h-4 w-4 mr-2" />
                      {language === 'es' ? 'Descargar PDF' : 'Download PDF'}
                    </Button>
                  </div>
                  
                  {/* Tours Table */}
                  {detailedResults.showTours && detailedResults.departures.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-2 flex items-center gap-2"><Car className="h-4 w-4" /> Tours ({detailedResults.departures.length})</h4>
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                          <TableHead>{language === 'es' ? 'Hora' : 'Time'}</TableHead>
                          <TableHead>{language === 'es' ? 'Tipo' : 'Type'}</TableHead>
                          <TableHead>{language === 'es' ? 'Vehículos' : 'Vehicles'}</TableHead>
                          <TableHead>💵</TableHead>
                          <TableHead>🏦</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>{language === 'es' ? 'Notas' : 'Notes'}</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {detailedResults.departures.map((d, i) => (
                            <TableRow key={i}>
                              <TableCell>{format(new Date(d.date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{d.timeSlot || '-'}</TableCell>
                              <TableCell><Badge className={d.category === 'quad' ? 'bg-blue-600' : 'bg-green-600'}>{d.category === 'quad' ? 'Quad' : 'Buggy'}</Badge></TableCell>
                              <TableCell>{d.vehiclesCount || 1}</TableCell>
                              <TableCell>{formatCurrency(parseNumber(d.paymentSplitCash))}</TableCell>
                              <TableCell>{formatCurrency(parseNumber(d.paymentSplitBank) + parseNumber(d.paymentSplitWeb))}</TableCell>
                              <TableCell className="text-right font-bold">{formatCurrency(parseNumber(d.totalGross))}</TableCell>
                              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={d.notes || ''}>{d.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {/* Expenses Table */}
                  {detailedResults.showExpenses && detailedResults.expenses.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-2 text-red-700 flex items-center gap-2"><TrendingDown className="h-4 w-4" /> {language === 'es' ? 'Gastos' : 'Expenses'} ({detailedResults.expenses.length})</h4>
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                          <TableHead>{language === 'es' ? 'Cuenta' : 'Account'}</TableHead>
                          <TableHead>{language === 'es' ? 'Concepto' : 'Concept'}</TableHead>
                          <TableHead>{language === 'es' ? 'Método' : 'Method'}</TableHead>
                          <TableHead className="text-right">{language === 'es' ? 'Cantidad' : 'Amount'}</TableHead>
                          <TableHead>{language === 'es' ? 'Notas' : 'Notes'}</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {detailedResults.expenses.map((e, i) => (
                            <TableRow key={i}>
                              <TableCell>{format(new Date(e.date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell><Badge className={e.account === 'GE' ? 'bg-blue-600' : 'bg-green-600'}>{e.account}</Badge></TableCell>
                              <TableCell>{e.concept}</TableCell>
                              <TableCell><Badge variant="outline">{e.paymentMethod === 'banco' ? '🏦' : '💵'}</Badge></TableCell>
                              <TableCell className="text-right font-bold text-red-600">-{formatCurrency(e.amount)}</TableCell>
                              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={e.notes || ''}>{e.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {/* Incomes Table */}
                  {detailedResults.showIncomes && detailedResults.incomes.length > 0 && (
                    <div>
                      <h4 className="font-bold mb-2 text-green-700 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {language === 'es' ? 'Ingresos Extra' : 'Extra Income'} ({detailedResults.incomes.length})</h4>
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                          <TableHead>{language === 'es' ? 'Cuenta' : 'Account'}</TableHead>
                          <TableHead>{language === 'es' ? 'Concepto' : 'Concept'}</TableHead>
                          <TableHead>{language === 'es' ? 'Método' : 'Method'}</TableHead>
                          <TableHead className="text-right">{language === 'es' ? 'Cantidad' : 'Amount'}</TableHead>
                          <TableHead>{language === 'es' ? 'Notas' : 'Notes'}</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {detailedResults.incomes.map((inc, i) => (
                            <TableRow key={i}>
                              <TableCell>{format(new Date(inc.date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell><Badge className={inc.account === 'GE' ? 'bg-blue-600' : 'bg-green-600'}>{inc.account}</Badge></TableCell>
                              <TableCell>{inc.concept}</TableCell>
                              <TableCell><Badge variant="outline">{inc.paymentMethod === 'banco' ? '🏦' : '💵'}</Badge></TableCell>
                              <TableCell className="text-right font-bold text-green-600">+{formatCurrency(inc.amount)}</TableCell>
                              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={inc.notes || ''}>{inc.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
