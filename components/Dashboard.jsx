'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, TrendingDown, Car, DollarSign, Clock, Trash2, Edit2, X, Save, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Helper to parse numbers that may use comma as decimal separator (Spanish format)
function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const strValue = String(value).replace(',', '.');
  const parsed = parseFloat(strValue);
  return isNaN(parsed) ? 0 : parsed;
}

export default function Dashboard({ selectedDate: propDate, onDateChange }) {
  const { language, t } = useLanguage();
  const [data, setData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(propDate || new Date().toISOString().split('T')[0]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, departureId: null, departureName: '' });
  const [editDialog, setEditDialog] = useState({ open: false, departure: null });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  
  const dateLocale = language === 'es' ? es : enUS;

  // Sync with prop when it changes
  useEffect(() => {
    if (propDate && propDate !== selectedDate) {
      setSelectedDate(propDate);
    }
  }, [propDate]);

  useEffect(() => {
    loadDashboard();
  }, [selectedDate]);

  async function loadDashboard() {
    setLoading(true);
    try {
      // Load departures and expenses for the selected date
      const [dashboardRes, expensesRes] = await Promise.all([
        fetch(`/api/dashboard?date=${selectedDate}`),
        fetch(`/api/expenses?startDate=${selectedDate}&endDate=${selectedDate}`)
      ]);
      
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        setData(dashboardData);
      }
      
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(departureId) {
    try {
      const res = await fetch(`/api/departures/${departureId}?userId=user-1&userName=Usuario`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Entrada eliminada exitosamente');
        loadDashboard(); // Reload data
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar la entrada');
      console.error(error);
    } finally {
      setDeleteDialog({ open: false, departureId: null, departureName: '' });
    }
  }

  function openEditDialog(departure) {
    setEditForm({
      vehiclesCount: departure.vehiclesCount || 1,
      notes: departure.notes || '',
      paymentSplitCash: parseNumber(departure.paymentSplitCash),
      paymentSplitBank: parseNumber(departure.paymentSplitBank),
      paymentSplitWeb: parseNumber(departure.paymentSplitWeb),
      paymentSplitGyg: parseNumber(departure.paymentSplitGyg),
      paymentSplitCruise: parseNumber(departure.paymentSplitCruise),
      commission: parseNumber(departure.commission),
      commissionMethod: departure.commissionMethod || 'cash',
    });
    setEditDialog({ open: true, departure });
  }

  async function saveEdit() {
    if (!editDialog.departure) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/departures/${editDialog.departure.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          userId: 'user-1',
          userName: 'Usuario',
        }),
      });

      if (res.ok) {
        toast.success(language === 'es' ? 'Tour actualizado' : 'Tour updated');
        setEditDialog({ open: false, departure: null });
        loadDashboard();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error');
      }
    } catch (error) {
      toast.error('Error');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">No se pudo cargar el dashboard</p>
        </CardContent>
      </Card>
    );
  }

  const { stats, departures } = data;

  // Calculate stats separated by category
  const quadDepartures = departures.filter(d => d.category === 'quad');
  const buggyDepartures = departures.filter(d => d.category === 'buggy');

  const quadStats = {
    totalGross: quadDepartures.reduce((sum, d) => sum + parseNumber(d.totalGross), 0),
    cashTotal: quadDepartures.reduce((sum, d) => sum + parseNumber(d.paymentSplitCash), 0),
    bankTotal: quadDepartures.reduce((sum, d) => sum + parseNumber(d.paymentSplitBank), 0),
    webTotal: quadDepartures.reduce((sum, d) => sum + parseNumber(d.paymentSplitWeb), 0),
    gygTotal: quadDepartures.reduce((sum, d) => sum + parseNumber(d.paymentSplitGyg), 0),
    cruiseTotal: quadDepartures.reduce((sum, d) => sum + parseNumber(d.paymentSplitCruise), 0),
    vehiclesCount: quadDepartures.reduce((sum, d) => sum + parseInt(d.vehiclesCount || 0), 0),
  };

  const buggyStats = {
    totalGross: buggyDepartures.reduce((sum, d) => sum + parseNumber(d.totalGross), 0),
    cashTotal: buggyDepartures.reduce((sum, d) => sum + parseNumber(d.paymentSplitCash), 0),
    bankTotal: buggyDepartures.reduce((sum, d) => sum + parseNumber(d.paymentSplitBank), 0),
    webTotal: buggyDepartures.reduce((sum, d) => sum + parseNumber(d.paymentSplitWeb), 0),
    gygTotal: buggyDepartures.reduce((sum, d) => sum + parseNumber(d.paymentSplitGyg), 0),
    cruiseTotal: buggyDepartures.reduce((sum, d) => sum + parseNumber(d.paymentSplitCruise), 0),
    vehiclesCount: buggyDepartures.reduce((sum, d) => sum + parseInt(d.vehiclesCount || 0), 0),
  };

  // Calculate expenses by account for today
  const geExpenses = expenses.filter(e => e.account === 'GE');
  const esExpenses = expenses.filter(e => e.account === 'E&S');
  const geExpenseTotal = geExpenses.reduce((sum, e) => sum + parseNumber(e.amount), 0);
  const esExpenseTotal = esExpenses.reduce((sum, e) => sum + parseNumber(e.amount), 0);

  // Net cash after expenses
  const quadCashNet = quadStats.cashTotal - geExpenseTotal;
  const buggyCashNet = buggyStats.cashTotal - esExpenseTotal;

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('dashboard')} - {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: dateLocale })}</CardTitle>
              <CardDescription>{t('dailyOperationsSummary')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prev = new Date(selectedDate);
                  prev.setDate(prev.getDate() - 1);
                  setSelectedDate(prev.toISOString().split('T')[0]);
                }}
              >
                {t('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                {t('today')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = new Date(selectedDate);
                  next.setDate(next.getDate() + 1);
                  setSelectedDate(next.toISOString().split('T')[0]);
                }}
              >
                {t('next')}
              </Button>
              <Button variant="ghost" size="icon" onClick={loadDashboard}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* General Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-100">{t('totalGross')}</CardDescription>
            <CardTitle className="text-3xl">€{stats.totalGross.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-orange-100">
              {t('net')}: €{stats.netBase.toFixed(2)} | {t('vat')}: €{stats.vatAmount.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('vehicles')}</CardDescription>
            <CardTitle className="text-3xl">{stats.quadCount + stats.buggyCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Car className="h-4 w-4 text-blue-600" />
                <span className="font-medium">{stats.quadCount}</span>
                <span className="text-muted-foreground">{t('quads')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="h-4 w-4 text-green-600" />
                <span className="font-medium">{stats.buggyCount}</span>
                <span className="text-muted-foreground">{t('buggies')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('paymentsReceived')}</CardDescription>
            <CardTitle className="text-3xl">€{((stats.cashTotal || 0) + (stats.bankTotal || 0) + (stats.webTotal || 0)).toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">€{(stats.cashTotal || 0).toFixed(2)}</span>
                <span className="text-muted-foreground"> 💵 {t('cash')}</span>
              </div>
              <div>
                <span className="font-medium">€{(stats.bankTotal || 0).toFixed(2)}</span>
                <span className="text-muted-foreground"> 🏦 {t('bank')}</span>
              </div>
              <div>
                <span className="font-medium">€{(stats.webTotal || 0).toFixed(2)}</span>
                <span className="text-muted-foreground"> 🌐 {t('web')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-100">{t('pendingArrival')}</CardDescription>
            <CardTitle className="text-3xl">€{((stats.gygTotal || 0) + (stats.cruiseTotal || 0)).toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-1 text-xs text-yellow-100">
              <div>🎫 GYG: €{(stats.gygTotal || 0).toFixed(2)}</div>
              <div>🚢 {t('cruises')}: €{(stats.cruiseTotal || 0).toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Category: Quads vs Buggies */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* QUADS (GE) */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">{t('quads')} (GE)</CardTitle>
              </div>
              <Badge variant="secondary">{quadStats.vehiclesCount} veh.</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{language === 'es' ? 'Ingresos Brutos' : 'Gross Income'}</span>
              <span className="font-bold text-lg">€{quadStats.totalGross.toFixed(2)}</span>
            </div>
            
            <div className="border-t pt-2">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>💵 {t('cash')}</span>
                  <span className="font-medium">€{quadStats.cashTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>🏦 {t('bank')}</span>
                  <span className="font-medium">€{quadStats.bankTotal.toFixed(2)}</span>
                </div>
                {quadStats.webTotal > 0 && (
                  <div className="flex justify-between">
                    <span>🌐 Web</span>
                    <span className="font-medium">€{quadStats.webTotal.toFixed(2)}</span>
                  </div>
                )}
                {quadStats.gygTotal > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>🎫 GYG (pendiente)</span>
                    <span className="font-medium">€{quadStats.gygTotal.toFixed(2)}</span>
                  </div>
                )}
                {quadStats.cruiseTotal > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>🚢 {t('cruises')} (pendiente)</span>
                    <span className="font-medium">€{quadStats.cruiseTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* GE Expenses */}
            {geExpenseTotal > 0 && (
              <div className="border-t pt-2">
                <div className="flex justify-between items-center text-red-600">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    {language === 'es' ? 'Gastos GE (del efectivo)' : 'GE Expenses (from cash)'}
                  </span>
                  <span className="font-medium">-€{geExpenseTotal.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {geExpenses.map(e => `${e.concept}: €${parseNumber(e.amount).toFixed(2)}`).join(', ')}
                </div>
              </div>
            )}

            {/* Net Cash */}
            <div className="border-t pt-2 bg-blue-50 -mx-4 px-4 py-2 rounded-b-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-blue-800">
                  💰 {language === 'es' ? 'Efectivo Neto Quads' : 'Net Cash Quads'}
                </span>
                <span className={`font-bold text-xl ${quadCashNet >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  €{quadCashNet.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BUGGIES (E&S) */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">{t('buggies')} (E&S)</CardTitle>
              </div>
              <Badge variant="secondary">{buggyStats.vehiclesCount} veh.</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{language === 'es' ? 'Ingresos Brutos' : 'Gross Income'}</span>
              <span className="font-bold text-lg">€{buggyStats.totalGross.toFixed(2)}</span>
            </div>
            
            <div className="border-t pt-2">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>💵 {t('cash')}</span>
                  <span className="font-medium">€{buggyStats.cashTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>🏦 {t('bank')}</span>
                  <span className="font-medium">€{buggyStats.bankTotal.toFixed(2)}</span>
                </div>
                {buggyStats.webTotal > 0 && (
                  <div className="flex justify-between">
                    <span>🌐 Web</span>
                    <span className="font-medium">€{buggyStats.webTotal.toFixed(2)}</span>
                  </div>
                )}
                {buggyStats.gygTotal > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>🎫 GYG (pendiente)</span>
                    <span className="font-medium">€{buggyStats.gygTotal.toFixed(2)}</span>
                  </div>
                )}
                {buggyStats.cruiseTotal > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>🚢 {t('cruises')} (pendiente)</span>
                    <span className="font-medium">€{buggyStats.cruiseTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* E&S Expenses */}
            {esExpenseTotal > 0 && (
              <div className="border-t pt-2">
                <div className="flex justify-between items-center text-red-600">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    {language === 'es' ? 'Gastos E&S (del efectivo)' : 'E&S Expenses (from cash)'}
                  </span>
                  <span className="font-medium">-€{esExpenseTotal.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {esExpenses.map(e => `${e.concept}: €${parseNumber(e.amount).toFixed(2)}`).join(', ')}
                </div>
              </div>
            )}

            {/* Net Cash */}
            <div className="border-t pt-2 bg-green-50 -mx-4 px-4 py-2 rounded-b-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-800">
                  💰 {language === 'es' ? 'Efectivo Neto Buggies' : 'Net Cash Buggies'}
                </span>
                <span className={`font-bold text-xl ${buggyCashNet >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  €{buggyCashNet.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tours by Time Slot */}
      <Card>
        <CardHeader>
          <CardTitle>{t('toursByTimeSlot')}</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(stats.departuresBySlot).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t('noToursScheduled')}</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(stats.departuresBySlot).sort((a, b) => a[0].localeCompare(b[0])).map(([timeSlot, slotDepartures]) => (
                <div key={timeSlot} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-lg">{timeSlot}</h3>
                    <Badge variant="secondary">{slotDepartures.length} {t('entries')}</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {slotDepartures.map((dep, idx) => {
                      // Parse payment amounts
                      const cashAmt = parseNumber(dep.paymentSplitCash);
                      const bankAmt = parseNumber(dep.paymentSplitBank);
                      const webAmt = parseNumber(dep.paymentSplitWeb);
                      const gygAmt = parseNumber(dep.paymentSplitGyg);
                      const cruiseAmt = parseNumber(dep.paymentSplitCruise);
                      const commission = parseNumber(dep.commission);
                      const isPendingCruise = dep.isPendingCruise === 'true' || dep.isPendingCruise === true;
                      
                      return (
                        <Card key={idx} className={`bg-muted/50 relative ${dep.category === 'quad' ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-green-400'}`}>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => openEditDialog(dep)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteDialog({
                                open: true,
                                departureId: dep.id,
                                departureName: `${dep.productName}`
                              })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant={dep.category === 'quad' ? 'default' : 'secondary'} className={dep.category === 'quad' ? 'bg-blue-600' : 'bg-green-600'}>
                                {dep.category === 'quad' ? 'Quad' : 'Buggy'}
                              </Badge>
                              <span className="text-sm font-medium">{dep.vehiclesCount}x</span>
                            </div>
                            <p className="text-sm font-medium mb-2">{dep.productName}</p>
                            
                            {/* Total */}
                            <div className="flex items-center justify-between text-sm mb-2 pb-2 border-b">
                              <span className="text-muted-foreground">{t('total')}:</span>
                              <span className="font-bold text-lg">€{parseNumber(dep.totalGross).toFixed(2)}</span>
                            </div>
                            
                            {/* Payment breakdown */}
                            <div className="space-y-1 text-xs">
                              {cashAmt > 0 && (
                                <div className="flex justify-between">
                                  <span>💵 {language === 'es' ? 'Efectivo' : 'Cash'}</span>
                                  <span className="font-medium">€{cashAmt.toFixed(2)}</span>
                                </div>
                              )}
                              {bankAmt > 0 && (
                                <div className="flex justify-between">
                                  <span>🏦 {language === 'es' ? 'Banco' : 'Bank'}</span>
                                  <span className="font-medium">€{bankAmt.toFixed(2)}</span>
                                </div>
                              )}
                              {webAmt > 0 && (
                                <div className="flex justify-between">
                                  <span>🌐 Web</span>
                                  <span className="font-medium">€{webAmt.toFixed(2)}</span>
                                </div>
                              )}
                              {gygAmt > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>🎫 GYG</span>
                                  <span className="font-medium">€{gygAmt.toFixed(2)}</span>
                                </div>
                              )}
                              {(cruiseAmt > 0 || isPendingCruise) && (
                                <div className="flex justify-between text-blue-600">
                                  <span>🚢 {language === 'es' ? 'Crucero' : 'Cruise'}</span>
                                  <span className="font-medium">€{cruiseAmt > 0 ? cruiseAmt.toFixed(2) : parseNumber(dep.totalGross).toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Commission if any */}
                            {commission > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="flex justify-between text-xs text-purple-600">
                                  <span>
                                    💰 {language === 'es' ? 'Comisión' : 'Commission'} 
                                    {dep.commissionMethod === 'bank' ? ' (🏦 sale banco)' : ' (💵 sale efectivo)'}
                                  </span>
                                  <span className="font-medium">-€{commission.toFixed(2)}</span>
                                </div>
                                {/* Warning if commission method differs from main payment */}
                                {((cashAmt > 0 && dep.commissionMethod === 'bank') || 
                                  (bankAmt > 0 && cashAmt === 0 && dep.commissionMethod === 'cash')) && (
                                  <div className="text-xs text-amber-600 mt-1">
                                    ⚠️ {language === 'es' ? 'Comisión de fuente diferente al cobro' : 'Commission from different source'}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Notes if any */}
                            {dep.notes && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs text-muted-foreground italic">📝 {dep.notes}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteEntry')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmation')}: <strong>{deleteDialog.departureName}</strong>
              <br /><br />
              {t('deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteDialog.departureId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Tour Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, departure: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {language === 'es' ? 'Editar Tour' : 'Edit Tour'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.departure?.productName} - {editDialog.departure?.category}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Vehicles Count */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === 'es' ? 'Vehículos' : 'Vehicles'}</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.vehiclesCount || 1}
                  onChange={(e) => setEditForm({ ...editForm, vehiclesCount: e.target.value })}
                />
              </div>
              <div>
                <Label>{language === 'es' ? 'Notas' : 'Notes'}</Label>
                <Input
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder={language === 'es' ? 'Notas...' : 'Notes...'}
                />
              </div>
            </div>

            {/* Payment Split */}
            <div>
              <Label className="mb-2 block">{language === 'es' ? 'Desglose de Pago' : 'Payment Breakdown'}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">💵 {language === 'es' ? 'Efectivo' : 'Cash'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.paymentSplitCash || 0}
                    onChange={(e) => setEditForm({ ...editForm, paymentSplitCash: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">🏦 {language === 'es' ? 'Banco' : 'Bank'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.paymentSplitBank || 0}
                    onChange={(e) => setEditForm({ ...editForm, paymentSplitBank: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">🌐 Web</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.paymentSplitWeb || 0}
                    onChange={(e) => setEditForm({ ...editForm, paymentSplitWeb: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">🎫 GYG</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.paymentSplitGyg || 0}
                    onChange={(e) => setEditForm({ ...editForm, paymentSplitGyg: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">🚢 {language === 'es' ? 'Crucero' : 'Cruise'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.paymentSplitCruise || 0}
                    onChange={(e) => setEditForm({ ...editForm, paymentSplitCruise: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Commission */}
            <div>
              <Label className="mb-2 block">💰 {language === 'es' ? 'Comisión Colaborador' : 'Collaborator Commission'}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.commission || 0}
                  onChange={(e) => setEditForm({ ...editForm, commission: parseFloat(e.target.value) || 0 })}
                  className="flex-1"
                />
                <Select
                  value={editForm.commissionMethod || 'cash'}
                  onValueChange={(value) => setEditForm({ ...editForm, commissionMethod: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 {language === 'es' ? 'Efectivo' : 'Cash'}</SelectItem>
                    <SelectItem value="bank">🏦 {language === 'es' ? 'Banco' : 'Bank'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, departure: null })}>
              {t('cancel')}
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? '...' : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'es' ? 'Guardar' : 'Save'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
