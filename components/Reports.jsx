'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Search, FileText, Calendar, TrendingUp, Car } from 'lucide-react';
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
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [periodStats, setPeriodStats] = useState(null);
  const reportRef = useRef(null);
  
  const dateLocale = language === 'es' ? es : enUS;

  useEffect(() => {
    loadPeriodStats();
  }, []);

  async function loadPeriodStats() {
    try {
      const res = await fetch('/api/departures');
      if (!res.ok) return;
      
      const allDepartures = await res.json();
      const today = new Date();
      
      // Weekly (Monday to Sunday)
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weeklyData = allDepartures.filter(d => d.date >= weekStart && d.date <= weekEnd);
      
      // Monthly
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
      const monthlyData = allDepartures.filter(d => d.date >= monthStart && d.date <= monthEnd);
      
      // Yearly
      const yearStart = format(startOfYear(today), 'yyyy-MM-dd');
      const yearEnd = format(endOfYear(today), 'yyyy-MM-dd');
      const yearlyData = allDepartures.filter(d => d.date >= yearStart && d.date <= yearEnd);
      
      const weekLabel = language === 'es' 
        ? `Semana: ${format(startOfWeek(today, { weekStartsOn: 1 }), 'd MMM', { locale: es })} - ${format(endOfWeek(today, { weekStartsOn: 1 }), 'd MMM', { locale: es })}`
        : `Week: ${format(startOfWeek(today, { weekStartsOn: 1 }), 'MMM d', { locale: enUS })} - ${format(endOfWeek(today, { weekStartsOn: 1 }), 'MMM d', { locale: enUS })}`;
      
      setPeriodStats({
        weekly: calculateStats(weeklyData, weekLabel),
        monthly: calculateStats(monthlyData, format(today, 'MMMM yyyy', { locale: dateLocale })),
        yearly: calculateStats(yearlyData, format(today, 'yyyy'))
      });
    } catch (error) {
      console.error('Error loading period stats:', error);
    }
  }

  // Helper to parse numbers that may use comma as decimal separator (Spanish format)
  function parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    const strValue = String(value).replace(',', '.');
    const parsed = parseFloat(strValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  function calculateStats(data, label) {
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
      // Buggy stats
      buggyCount: 0,
      buggyGross: 0,
      buggyNet: 0,
      // Payment channels
      webTotal: 0,
      cashTotal: 0,
      bankTotal: 0,
      gygTotal: 0,
      cruiseTotal: 0,
      // Pending (GYG and Cruceros)
      pendingGYG: 0,
      pendingCruise: 0,
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
      
      if (d.category === 'quad') {
        stats.quadCount += vehicles;
        stats.quadGross += gross;
        stats.quadNet += netBase;
      } else {
        stats.buggyCount += vehicles;
        stats.buggyGross += gross;
        stats.buggyNet += netBase;
      }

      const cashAmount = parseNumber(d.paymentSplitCash);
      const webAmount = parseNumber(d.paymentSplitWeb);
      const bankAmount = parseNumber(d.paymentSplitBank);
      const gygAmount = parseNumber(d.paymentSplitGyg);
      const cruiseAmount = parseNumber(d.paymentSplitCruise);
      
      stats.webTotal += webAmount;
      stats.cashTotal += cashAmount;
      stats.bankTotal += bankAmount;
      stats.gygTotal += gygAmount;
      stats.cruiseTotal += cruiseAmount;
      
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

    return stats;
  }

  async function runReport() {
    if (!startDate || !endDate) {
      toast.error('Por favor selecciona las fechas');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/departures');
      if (res.ok) {
        let data = await res.json();
        
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
        
        const totals = calculateStats(data, `${startDate} - ${endDate}`);
        setResults({ data, totals });
      }
    } catch (error) {
      toast.error(t('reportError'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function setQuickDate(period) {
    const today = new Date();
    let start, end;
    
    switch(period) {
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

  function exportToCSV() {
    if (!results) return;

    const headers = language === 'es' 
      ? ['Fecha', 'Hora', 'Categoría', 'Producto', 'Vehículos', 'Precio Unit.', 'Total Bruto', 'Base Neta', 'IVA', 'Canal', 'Web', 'Efectivo', 'Banco', 'GYG']
      : ['Date', 'Time', 'Category', 'Product', 'Vehicles', 'Unit Price', 'Total Gross', 'Net Base', 'VAT', 'Channel', 'Web', 'Cash', 'Bank', 'GYG'];

    const rows = results.data.map(d => [
      d.date,
      d.timeSlot,
      d.category,
      d.productName,
      d.vehiclesCount,
      d.pricePerVehicleGross,
      d.totalGross,
      d.netBase,
      d.vatAmount,
      d.salesChannel,
      d.paymentSplitWeb || 0,
      d.paymentSplitCash || 0,
      d.paymentSplitBank || 0,
      d.paymentSplitGyg || 0,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${category}-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Reporte CSV exportado');
  }

  function exportToPDF() {
    if (!results) return;

    const categoryLabel = category === 'all' ? 'Todos' : category === 'quad' ? 'Solo Quads' : 'Solo Buggies';

    // Create printable HTML
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte ATV Operations</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; }
          .summary { display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0; }
          .stat-card { background: #f3f4f6; padding: 15px; border-radius: 8px; min-width: 150px; }
          .stat-card .label { font-size: 12px; color: #6b7280; }
          .stat-card .value { font-size: 24px; font-weight: bold; color: #111827; }
          .stat-card.primary { background: linear-gradient(135deg, #ea580c, #f97316); color: white; }
          .stat-card.primary .label, .stat-card.primary .value { color: white; }
          .stat-card.quad { background: linear-gradient(135deg, #3b82f6, #60a5fa); color: white; }
          .stat-card.quad .label, .stat-card.quad .value { color: white; }
          .stat-card.buggy { background: linear-gradient(135deg, #22c55e, #4ade80); color: white; }
          .stat-card.buggy .label, .stat-card.buggy .value { color: white; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #f9fafb; font-weight: 600; }
          tr:nth-child(even) { background: #f9fafb; }
          .text-right { text-align: right; }
          .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 11px; }
          .filter-info { background: #fef3c7; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Reporte de Operaciones ATV</h1>
        <p><strong>Período:</strong> ${startDate} al ${endDate}</p>
        <p><strong>Filtro:</strong> ${categoryLabel}</p>
        <p><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')}</p>
        
        <h2>Resumen General</h2>
        <div class="summary">
          <div class="stat-card primary">
            <div class="label">Total Bruto</div>
            <div class="value">€${results.totals.totalGross.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="label">Base Neta</div>
            <div class="value">€${results.totals.netBase.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="label">IVA (21%)</div>
            <div class="value">€${results.totals.vatAmount.toFixed(2)}</div>
          </div>
          <div class="stat-card" style="background: #dbeafe;">
            <div class="label">IVA2 (sin efectivo)</div>
            <div class="value">€${results.totals.vatAmount2.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="label">Total Vehículos</div>
            <div class="value">${results.totals.quadCount + results.totals.buggyCount}</div>
          </div>
        </div>
        
        <h2>Desglose por Tipo de Vehículo</h2>
        <div class="summary">
          <div class="stat-card quad">
            <div class="label">Quads - Ingresos</div>
            <div class="value">€${results.totals.quadGross.toFixed(2)}</div>
            <div class="label" style="margin-top: 5px;">${results.totals.quadCount} vehículos</div>
          </div>
          <div class="stat-card buggy">
            <div class="label">Buggies - Ingresos</div>
            <div class="value">€${results.totals.buggyGross.toFixed(2)}</div>
            <div class="label" style="margin-top: 5px;">${results.totals.buggyCount} vehículos</div>
          </div>
        </div>

        <h2>Desglose por Canal de Pago</h2>
        <div class="summary">
          <div class="stat-card">
            <div class="label">💵 Efectivo</div>
            <div class="value">€${results.totals.cashTotal.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="label">🏦 Banco</div>
            <div class="value">€${results.totals.bankTotal.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="label">🌐 Web</div>
            <div class="value">€${results.totals.webTotal.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="label">🎫 GYG</div>
            <div class="value">€${results.totals.gygTotal.toFixed(2)}</div>
          </div>
          <div class="stat-card">
            <div class="label">🚢 Cruceros</div>
            <div class="value">€${results.totals.cruiseTotal.toFixed(2)}</div>
          </div>
        </div>
        ${(results.totals.pendingGYG > 0 || results.totals.pendingCruise > 0) ? `
        <div style="background: #fef3c7; padding: 10px; border-radius: 8px; margin: 15px 0;">
          ${results.totals.pendingGYG > 0 ? `<div><strong>⏳ Pendiente GYG:</strong> €${results.totals.pendingGYG.toFixed(2)}</div>` : ''}
          ${results.totals.pendingCruise > 0 ? `<div><strong>⏳ Pendiente Cruceros:</strong> €${results.totals.pendingCruise.toFixed(2)}</div>` : ''}
        </div>
        ` : ''}
        
        <h2>Detalle de Entradas (${results.data.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Categoría</th>
              <th>Producto</th>
              <th class="text-right">Veh.</th>
              <th class="text-right">Total</th>
              <th>Canal</th>
            </tr>
          </thead>
          <tbody>
            ${results.data.map(d => `
              <tr>
                <td>${d.date}</td>
                <td>${d.timeSlot}</td>
                <td>${d.category === 'quad' ? 'Quad' : 'Buggy'}</td>
                <td>${d.productName}</td>
                <td class="text-right">${d.vehiclesCount}</td>
                <td class="text-right">€${parseFloat(d.totalGross || 0).toFixed(2)}</td>
                <td>${d.salesChannel}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>ATV Operations - Sistema de Gestión</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = function() {
      printWindow.print();
    };

    toast.success('Preparando PDF para impresión');
  }

  function StatCard({ label, value, subValue, primary, className }) {
    return (
      <Card className={primary ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : className || ''}>
        <CardContent className="p-4">
          <div className={`text-sm ${primary ? 'opacity-90' : 'text-muted-foreground'}`}>{label}</div>
          <div className="text-2xl font-bold">{value}</div>
          {subValue && <div className={`text-xs mt-1 ${primary ? 'opacity-80' : 'text-muted-foreground'}`}>{subValue}</div>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Period Stats Cards */}
      {periodStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-medium">{t('thisWeek')}</CardTitle>
              </div>
              <CardDescription className="text-xs">{periodStats.weekly.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">€{periodStats.weekly.totalGross.toFixed(2)}</div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-blue-50 p-2 rounded">
                  <span className="text-blue-700 font-medium">{t('quads')}:</span> €{periodStats.weekly.quadGross.toFixed(2)} ({periodStats.weekly.quadCount})
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <span className="text-green-700 font-medium">{t('buggies')}:</span> €{periodStats.weekly.buggyGross.toFixed(2)} ({periodStats.weekly.buggyCount})
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <CardTitle className="text-sm font-medium">{t('thisMonth')}</CardTitle>
              </div>
              <CardDescription className="text-xs">{periodStats.monthly.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">€{periodStats.monthly.totalGross.toFixed(2)}</div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-blue-50 p-2 rounded">
                  <span className="text-blue-700 font-medium">{t('quads')}:</span> €{periodStats.monthly.quadGross.toFixed(2)} ({periodStats.monthly.quadCount})
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <span className="text-green-700 font-medium">{t('buggies')}:</span> €{periodStats.monthly.buggyGross.toFixed(2)} ({periodStats.monthly.buggyCount})
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm font-medium">{t('thisYear')}</CardTitle>
              </div>
              <CardDescription className="text-xs">{periodStats.yearly.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">€{periodStats.yearly.totalGross.toFixed(2)}</div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-blue-50 p-2 rounded">
                  <span className="text-blue-700 font-medium">{t('quads')}:</span> €{periodStats.yearly.quadGross.toFixed(2)} ({periodStats.yearly.quadCount})
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <span className="text-green-700 font-medium">{t('buggies')}:</span> €{periodStats.yearly.buggyGross.toFixed(2)} ({periodStats.yearly.buggyCount})
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('reportGenerator')}</CardTitle>
          <CardDescription>{t('generateCustomReports')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Date Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickDate('week')}>
              {t('thisWeek')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('month')}>
              {t('thisMonth')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate('year')}>
              {t('thisYear')}
            </Button>
          </div>

          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="startDate">{t('startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate">{t('endDate')}</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="category">{t('vehicleType')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🚗 {t('allVehicles')}</SelectItem>
                  <SelectItem value="quad">🏍️ {t('onlyQuads')}</SelectItem>
                  <SelectItem value="buggy">🚙 {t('onlyBuggies')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="channel">{t('channel')}</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="web">{t('web')}</SelectItem>
                  <SelectItem value="gyg">GetYourGuide</SelectItem>
                  <SelectItem value="cruceros">{t('cruises')}</SelectItem>
                  <SelectItem value="colaborador">{t('collaborator')}</SelectItem>
                  <SelectItem value="otros">{t('others')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={runReport} disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('generating')}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {t('generateReport')}
                </>
              )}
            </Button>
            {results && (
              <>
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  {t('exportCSV')}
                </Button>
                <Button onClick={exportToPDF} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  {t('exportPDF')}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>{t('results')}</CardTitle>
            <CardDescription>
              {results.totals.count} {t('entriesFound')} 
              {category !== 'all' && ` - ${t('filter')}: ${category === 'quad' ? t('onlyQuads') : t('onlyBuggies')}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* General Summary */}
            <div className="grid gap-4 md:grid-cols-5">
              <StatCard label={t('totalGross')} value={`€${results.totals.totalGross.toFixed(2)}`} primary />
              <StatCard label={t('netBase')} value={`€${results.totals.netBase.toFixed(2)}`} />
              <StatCard label={`${t('vat')} (21%)`} value={`€${results.totals.vatAmount.toFixed(2)}`} />
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-sm text-blue-600">{t('iva2')}</div>
                  <div className="text-2xl font-bold text-blue-700">€{results.totals.vatAmount2.toFixed(2)}</div>
                </CardContent>
              </Card>
              <StatCard 
                label={t('vehicles')} 
                value={results.totals.quadCount + results.totals.buggyCount}
              />
            </div>

            {/* Vehicle Type Breakdown */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Desglose por Tipo de Vehículo
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm opacity-90">Quads - Ingresos</div>
                        <div className="text-3xl font-bold">€{results.totals.quadGross.toFixed(2)}</div>
                        <div className="text-sm opacity-80 mt-1">
                          {results.totals.quadCount} vehículos | Neto: €{results.totals.quadNet.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-4xl opacity-30">🏍️</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm opacity-90">Buggies - Ingresos</div>
                        <div className="text-3xl font-bold">€{results.totals.buggyGross.toFixed(2)}</div>
                        <div className="text-sm opacity-80 mt-1">
                          {results.totals.buggyCount} vehículos | Neto: €{results.totals.buggyNet.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-4xl opacity-30">🚙</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div>
              <h3 className="font-semibold mb-3">Desglose por Canal de Pago</h3>
              <div className="grid gap-4 md:grid-cols-5">
                <StatCard label="💵 Efectivo" value={`€${results.totals.cashTotal.toFixed(2)}`} />
                <StatCard label="🏦 Banco" value={`€${results.totals.bankTotal.toFixed(2)}`} />
                <StatCard label="🌐 Web" value={`€${results.totals.webTotal.toFixed(2)}`} />
                <StatCard label="🎫 GYG" value={`€${results.totals.gygTotal.toFixed(2)}`} />
                <StatCard label="🚢 Cruceros" value={`€${results.totals.cruiseTotal.toFixed(2)}`} />
              </div>
              {results.totals.pendingCruise > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-amber-800 font-medium">
                    ⏳ Pendiente de cobro (Cruceros): €{results.totals.pendingCruise.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Pending Payments */}
            {(results.totals.pendingGYG > 0 || results.totals.pendingCruise > 0) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-semibold text-amber-800 mb-2">⏳ Pagos Pendientes de Llegar</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {results.totals.pendingGYG > 0 && (
                    <div className="text-amber-700">🎫 GYG: €{results.totals.pendingGYG.toFixed(2)}</div>
                  )}
                  {results.totals.pendingCruise > 0 && (
                    <div className="text-amber-700">🚢 Cruceros: €{results.totals.pendingCruise.toFixed(2)}</div>
                  )}
                </div>
              </div>
            )}

            {/* Table */}
            <div className="rounded-md border overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Veh.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Desglose de Pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.data.map((d, idx) => {
                      // Build payment breakdown with decimals using parseNumber
                      const payments = [];
                      if (parseNumber(d.paymentSplitCash) > 0) payments.push(`💵€${parseNumber(d.paymentSplitCash).toFixed(2)}`);
                      if (parseNumber(d.paymentSplitBank) > 0) payments.push(`🏦€${parseNumber(d.paymentSplitBank).toFixed(2)}`);
                      if (parseNumber(d.paymentSplitWeb) > 0) payments.push(`🌐€${parseNumber(d.paymentSplitWeb).toFixed(2)}`);
                      if (parseNumber(d.paymentSplitGyg) > 0) payments.push(`🎫€${parseNumber(d.paymentSplitGyg).toFixed(2)}`);
                      if (parseNumber(d.paymentSplitCruise) > 0) payments.push(`🚢€${parseNumber(d.paymentSplitCruise).toFixed(2)}`);
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{d.date}</TableCell>
                          <TableCell className="text-sm">{d.timeSlot}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              d.category === 'quad' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {d.category === 'quad' ? 'Q' : 'B'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{d.productName}</TableCell>
                          <TableCell className="text-right text-sm">{d.vehiclesCount}</TableCell>
                          <TableCell className="text-right font-medium">€{parseNumber(d.totalGross).toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 text-xs">
                              {payments.length > 0 ? payments.map((p, i) => (
                                <span key={i} className="bg-gray-100 px-1 py-0.5 rounded">{p}</span>
                              )) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
