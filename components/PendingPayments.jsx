'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, CheckCircle, Filter, CreditCard } from 'lucide-react';
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

export default function PendingPayments() {
  const { t, language } = useLanguage();
  const [gygPending, setGygPending] = useState([]);
  const [cruisePending, setCruisePending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGyg, setSelectedGyg] = useState([]);
  const [selectedCruise, setSelectedCruise] = useState([]);
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmType, setConfirmType] = useState(''); // 'gyg' or 'cruise'
  const [processing, setProcessing] = useState(false);
  
  // Date range filter
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');

  useEffect(() => {
    loadPendingPayments();
  }, []);

  async function loadPendingPayments() {
    setLoading(true);
    try {
      const res = await fetch('/api/departures');
      if (res.ok) {
        const departures = await res.json();
        
        // Filter GYG pending (has paymentSplitGyg > 0 and not collected)
        const gyg = departures.filter(d => {
          const gygAmount = parseFloat(d.paymentSplitGyg) || 0;
          return gygAmount > 0 && d.gygCollectedDate !== 'true' && !d.gygCollected;
        });
        
        // Filter Cruise pending (has paymentSplitCruise > 0 and not collected)
        const cruise = departures.filter(d => {
          const cruiseAmount = parseFloat(d.paymentSplitCruise) || 0;
          return cruiseAmount > 0 && d.cruiseCollectedDate !== 'true' && !d.cruiseCollected;
        });
        
        setGygPending(gyg);
        setCruisePending(cruise);
      }
    } catch (error) {
      console.error('Error loading pending payments:', error);
      toast.error(language === 'es' ? 'Error al cargar pagos pendientes' : 'Error loading pending payments');
    } finally {
      setLoading(false);
    }
  }

  function parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    const strValue = String(value).replace(',', '.');
    const parsed = parseFloat(strValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  function formatCurrency(amount) {
    return `€${parseNumber(amount).toFixed(2)}`;
  }

  function getFilteredItems(items, type) {
    if (!dateFilterStart && !dateFilterEnd) return items;
    
    return items.filter(item => {
      const itemDate = item.date;
      if (dateFilterStart && itemDate < dateFilterStart) return false;
      if (dateFilterEnd && itemDate > dateFilterEnd) return false;
      return true;
    });
  }

  function handleSelectAll(type, checked) {
    const items = type === 'gyg' ? getFilteredItems(gygPending, 'gyg') : getFilteredItems(cruisePending, 'cruise');
    if (checked) {
      const ids = items.map(item => item.id);
      if (type === 'gyg') {
        setSelectedGyg(ids);
      } else {
        setSelectedCruise(ids);
      }
    } else {
      if (type === 'gyg') {
        setSelectedGyg([]);
      } else {
        setSelectedCruise([]);
      }
    }
  }

  function handleSelectItem(type, id, checked) {
    if (type === 'gyg') {
      if (checked) {
        setSelectedGyg([...selectedGyg, id]);
      } else {
        setSelectedGyg(selectedGyg.filter(i => i !== id));
      }
    } else {
      if (checked) {
        setSelectedCruise([...selectedCruise, id]);
      } else {
        setSelectedCruise(selectedCruise.filter(i => i !== id));
      }
    }
  }

  function selectByDateRange(type) {
    if (!dateFilterStart || !dateFilterEnd) {
      toast.error(language === 'es' ? 'Selecciona un rango de fechas' : 'Select a date range');
      return;
    }
    
    const items = type === 'gyg' ? gygPending : cruisePending;
    const filtered = items.filter(item => {
      return item.date >= dateFilterStart && item.date <= dateFilterEnd;
    });
    
    const ids = filtered.map(item => item.id);
    if (type === 'gyg') {
      setSelectedGyg(ids);
    } else {
      setSelectedCruise(ids);
    }
    
    toast.success(`${ids.length} ${language === 'es' ? 'tours seleccionados' : 'tours selected'}`);
  }

  function openConfirmDialog(type) {
    const selected = type === 'gyg' ? selectedGyg : selectedCruise;
    if (selected.length === 0) {
      toast.error(language === 'es' ? 'Selecciona al menos un tour' : 'Select at least one tour');
      return;
    }
    setConfirmType(type);
    setShowConfirmDialog(true);
  }

  async function handleMarkAsCollected() {
    setProcessing(true);
    const selected = confirmType === 'gyg' ? selectedGyg : selectedCruise;
    const items = confirmType === 'gyg' ? gygPending : cruisePending;
    
    try {
      const promises = selected.map(async (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        
        const res = await fetch('/api/collect-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            departureId: id,
            paymentType: confirmType,
            collectionDate: collectionDate,
            amount: confirmType === 'gyg' ? item.paymentSplitGyg : item.paymentSplitCruise
          })
        });
        
        if (!res.ok) {
          throw new Error(`Failed to collect payment for ${id}`);
        }
        
        return res.json();
      });
      
      await Promise.all(promises);
      
      toast.success(
        language === 'es' 
          ? `${selected.length} pago(s) marcado(s) como cobrado(s)` 
          : `${selected.length} payment(s) marked as collected`
      );
      
      // Reset selection and reload
      if (confirmType === 'gyg') {
        setSelectedGyg([]);
      } else {
        setSelectedCruise([]);
      }
      
      loadPendingPayments();
    } catch (error) {
      console.error('Error marking as collected:', error);
      toast.error(language === 'es' ? 'Error al procesar los pagos' : 'Error processing payments');
    } finally {
      setProcessing(false);
      setShowConfirmDialog(false);
    }
  }

  function calculateSelectedTotal(type) {
    const selected = type === 'gyg' ? selectedGyg : selectedCruise;
    const items = type === 'gyg' ? gygPending : cruisePending;
    
    return selected.reduce((total, id) => {
      const item = items.find(i => i.id === id);
      if (!item) return total;
      const amount = type === 'gyg' ? parseNumber(item.paymentSplitGyg) : parseNumber(item.paymentSplitCruise);
      return total + amount;
    }, 0);
  }

  function calculateTotalPending(type) {
    const items = type === 'gyg' ? gygPending : cruisePending;
    return items.reduce((total, item) => {
      const amount = type === 'gyg' ? parseNumber(item.paymentSplitGyg) : parseNumber(item.paymentSplitCruise);
      return total + amount;
    }, 0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const gygFiltered = getFilteredItems(gygPending, 'gyg');
  const cruiseFiltered = getFilteredItems(cruisePending, 'cruise');

  return (
    <div className="space-y-6">
      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'es' ? 'Confirmar Cobro' : 'Confirm Collection'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'es' 
                ? `¿Marcar ${confirmType === 'gyg' ? selectedGyg.length : selectedCruise.length} tour(s) como cobrado(s)?`
                : `Mark ${confirmType === 'gyg' ? selectedGyg.length : selectedCruise.length} tour(s) as collected?`}
              <br />
              <strong>{language === 'es' ? 'Total' : 'Total'}: {formatCurrency(calculateSelectedTotal(confirmType))}</strong>
              <br />
              <strong>{language === 'es' ? 'Fecha de cobro' : 'Collection date'}: {collectionDate}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsCollected} disabled={processing}>
              {processing 
                ? (language === 'es' ? 'Procesando...' : 'Processing...')
                : (language === 'es' ? 'Confirmar Cobro' : 'Confirm Collection')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {language === 'es' ? 'Cobros Pendientes' : 'Pending Payments'}
          </CardTitle>
          <CardDescription>
            {language === 'es' 
              ? 'Gestiona los cobros pendientes de GYG y Cruceros' 
              : 'Manage pending payments from GYG and Cruises'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Date Filter */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4" />
              <span className="font-medium">
                {language === 'es' ? 'Filtrar por Fecha' : 'Filter by Date'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label>{language === 'es' ? 'Desde' : 'From'}</Label>
                <Input
                  type="date"
                  value={dateFilterStart}
                  onChange={(e) => setDateFilterStart(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <Label>{language === 'es' ? 'Hasta' : 'To'}</Label>
                <Input
                  type="date"
                  value={dateFilterEnd}
                  onChange={(e) => setDateFilterEnd(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <Label>{language === 'es' ? 'Fecha de Cobro' : 'Collection Date'}</Label>
                <Input
                  type="date"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFilterStart('');
                  setDateFilterEnd('');
                }}
              >
                {language === 'es' ? 'Limpiar Filtro' : 'Clear Filter'}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="gyg" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gyg" className="gap-2">
                <span className="font-bold text-green-600">GYG</span>
                <Badge variant="secondary">{gygPending.length}</Badge>
                <span className="text-xs text-muted-foreground">
                  ({formatCurrency(calculateTotalPending('gyg'))})
                </span>
              </TabsTrigger>
              <TabsTrigger value="cruise" className="gap-2">
                <span className="font-bold text-blue-600">
                  {language === 'es' ? 'Cruceros' : 'Cruises'}
                </span>
                <Badge variant="secondary">{cruisePending.length}</Badge>
                <span className="text-xs text-muted-foreground">
                  ({formatCurrency(calculateTotalPending('cruise'))})
                </span>
              </TabsTrigger>
            </TabsList>

            {/* GYG Tab */}
            <TabsContent value="gyg">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-green-600">
                        GetYourGuide (GYG)
                      </CardTitle>
                      <CardDescription>
                        {gygFiltered.length} {language === 'es' ? 'tours pendientes' : 'pending tours'}
                        {selectedGyg.length > 0 && (
                          <span className="ml-2 text-green-600 font-medium">
                            • {selectedGyg.length} {language === 'es' ? 'seleccionados' : 'selected'}: {formatCurrency(calculateSelectedTotal('gyg'))}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {dateFilterStart && dateFilterEnd && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectByDateRange('gyg')}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          {language === 'es' ? 'Seleccionar Rango' : 'Select Range'}
                        </Button>
                      )}
                      <Button
                        onClick={() => openConfirmDialog('gyg')}
                        disabled={selectedGyg.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {language === 'es' ? 'Marcar Cobrado' : 'Mark Collected'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {gygFiltered.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {language === 'es' ? 'No hay pagos pendientes de GYG' : 'No pending GYG payments'}
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedGyg.length === gygFiltered.length && gygFiltered.length > 0}
                              onCheckedChange={(checked) => handleSelectAll('gyg', checked)}
                            />
                          </TableHead>
                          <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                          <TableHead>{language === 'es' ? 'Hora' : 'Time'}</TableHead>
                          <TableHead>{language === 'es' ? 'Producto' : 'Product'}</TableHead>
                          <TableHead>{language === 'es' ? 'Vehículos' : 'Vehicles'}</TableHead>
                          <TableHead>{language === 'es' ? 'Grupo' : 'Group'}</TableHead>
                          <TableHead className="text-right">{language === 'es' ? 'Monto GYG' : 'GYG Amount'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gygFiltered.map((item) => (
                          <TableRow key={item.id} className={selectedGyg.includes(item.id) ? 'bg-green-50' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={selectedGyg.includes(item.id)}
                                onCheckedChange={(checked) => handleSelectItem('gyg', item.id, checked)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.date}</TableCell>
                            <TableCell>{item.timeSlot}</TableCell>
                            <TableCell>
                              <Badge variant={item.category === 'quad' ? 'default' : 'secondary'}>
                                {item.category}
                              </Badge>
                              <span className="ml-2">{item.productName}</span>
                            </TableCell>
                            <TableCell>{item.vehiclesCount}</TableCell>
                            <TableCell>{item.groupLabel || '-'}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(item.paymentSplitGyg)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cruise Tab */}
            <TabsContent value="cruise">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-blue-600">
                        {language === 'es' ? 'Cruceros' : 'Cruises'}
                      </CardTitle>
                      <CardDescription>
                        {cruiseFiltered.length} {language === 'es' ? 'tours pendientes' : 'pending tours'}
                        {selectedCruise.length > 0 && (
                          <span className="ml-2 text-blue-600 font-medium">
                            • {selectedCruise.length} {language === 'es' ? 'seleccionados' : 'selected'}: {formatCurrency(calculateSelectedTotal('cruise'))}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {dateFilterStart && dateFilterEnd && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectByDateRange('cruise')}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          {language === 'es' ? 'Seleccionar Rango' : 'Select Range'}
                        </Button>
                      )}
                      <Button
                        onClick={() => openConfirmDialog('cruise')}
                        disabled={selectedCruise.length === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {language === 'es' ? 'Marcar Cobrado' : 'Mark Collected'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {cruiseFiltered.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {language === 'es' ? 'No hay pagos pendientes de Cruceros' : 'No pending Cruise payments'}
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedCruise.length === cruiseFiltered.length && cruiseFiltered.length > 0}
                              onCheckedChange={(checked) => handleSelectAll('cruise', checked)}
                            />
                          </TableHead>
                          <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                          <TableHead>{language === 'es' ? 'Hora' : 'Time'}</TableHead>
                          <TableHead>{language === 'es' ? 'Producto' : 'Product'}</TableHead>
                          <TableHead>{language === 'es' ? 'Vehículos' : 'Vehicles'}</TableHead>
                          <TableHead>{language === 'es' ? 'Grupo' : 'Group'}</TableHead>
                          <TableHead className="text-right">{language === 'es' ? 'Monto Crucero' : 'Cruise Amount'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cruiseFiltered.map((item) => (
                          <TableRow key={item.id} className={selectedCruise.includes(item.id) ? 'bg-blue-50' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={selectedCruise.includes(item.id)}
                                onCheckedChange={(checked) => handleSelectItem('cruise', item.id, checked)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.date}</TableCell>
                            <TableCell>{item.timeSlot}</TableCell>
                            <TableCell>
                              <Badge variant={item.category === 'quad' ? 'default' : 'secondary'}>
                                {item.category}
                              </Badge>
                              <span className="ml-2">{item.productName}</span>
                            </TableCell>
                            <TableCell>{item.vehiclesCount}</TableCell>
                            <TableCell>{item.groupLabel || '-'}</TableCell>
                            <TableCell className="text-right font-bold text-blue-600">
                              {formatCurrency(item.paymentSplitCruise)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
