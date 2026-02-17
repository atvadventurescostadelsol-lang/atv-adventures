'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, Car, DollarSign, Clock, Trash2, Edit2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
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
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(propDate || new Date().toISOString().split('T')[0]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, departureId: null, departureName: '' });
  
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
      const res = await fetch(`/api/dashboard?date=${selectedDate}`);
      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);
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

      {/* Stats Grid */}
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
                <Car className="h-4 w-4 text-green-600" />
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
                    {slotDepartures.map((dep, idx) => (
                      <Card key={idx} className="bg-muted/50 relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteDialog({
                            open: true,
                            departureId: dep.id,
                            departureName: `${dep.productName} - ${dep.groupLabel || (language === 'es' ? 'Sin grupo' : 'No group')}`
                          })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant={dep.category === 'quad' ? 'default' : 'secondary'}>
                              {dep.category === 'quad' ? 'Quad' : 'Buggy'}
                            </Badge>
                            <span className="text-sm font-medium">{dep.vehiclesCount}x</span>
                          </div>
                          <p className="text-sm font-medium mb-1">{dep.productName}</p>
                          {dep.groupLabel && (
                            <p className="text-xs text-muted-foreground mb-1">{t('group')}: {dep.groupLabel}</p>
                          )}
                          <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
                            <span className="text-muted-foreground">{t('total')}:</span>
                            <span className="font-semibold">€{parseNumber(dep.totalGross).toFixed(2)}</span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {dep.depositPaid === 'true' && (
                              <Badge variant="outline" className="text-xs">✓ {t('deposit')}</Badge>
                            )}
                            {dep.remainingPaid === 'true' && (
                              <Badge variant="outline" className="text-xs">✓ {t('complete')}</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
    </div>
  );
}
