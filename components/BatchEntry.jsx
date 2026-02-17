'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, AlertCircle, CheckCircle2, Euro, Ship, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';

const GYG_DISCOUNT = 0.25; // 25% discount for GYG

export default function BatchEntry() {
  const { t, language } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('');
  const [entries, setEntries] = useState([{
    id: Math.random(),
    category: 'quad',
    productId: '',
    vehiclesCount: 1,
    notes: '',
    salesChannel: 'cash',
    paymentSplit: [{ method: 'cash', amount: 0 }],
    gygDiscount: 0,
    isPendingCruise: false,
    commission: 0,
    commissionMethod: 'cash', // 'cash' or 'bank'
  }]);

  const [products, setProducts] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [capacity, setCapacity] = useState({ quad: { max: 0, used: 0, available: 0 }, buggy: { max: 0, used: 0, available: 0 } });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
    loadTimeSlots();
  }, []);

  useEffect(() => {
    if (date && timeSlot) {
      loadCapacity();
    }
  }, [date, timeSlot]);

  async function loadProducts() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  async function loadTimeSlots() {
    try {
      const res = await fetch('/api/timeslots');
      if (res.ok) {
        const data = await res.json();
        setTimeSlots(data);
        if (data.length > 0) {
          setTimeSlot(data[0].time);
        }
      }
    } catch (error) {
      console.error('Error loading time slots:', error);
    }
  }

  async function loadCapacity() {
    setLoading(true);
    try {
      const [quadRes, buggyRes] = await Promise.all([
        fetch(`/api/capacity?date=${date}&timeSlot=${timeSlot}&category=quad`),
        fetch(`/api/capacity?date=${date}&timeSlot=${timeSlot}&category=buggy`)
      ]);

      if (quadRes.ok && buggyRes.ok) {
        const quadData = await quadRes.json();
        const buggyData = await buggyRes.json();
        
        setCapacity({
          quad: quadData,
          buggy: buggyData,
        });
      }
    } catch (error) {
      console.error('Error loading capacity:', error);
    } finally {
      setLoading(false);
    }
  }

  function addEntry() {
    setEntries([...entries, {
      id: Math.random(),
      category: 'quad',
      productId: '',
      vehiclesCount: 1,
      notes: '',
      salesChannel: 'cash',
      paymentSplit: [{ method: 'cash', amount: 0 }],
      gygDiscount: 0,
      isPendingCruise: false,
      commission: 0,
      commissionMethod: 'cash',
    }]);
  }

  function removeEntry(id) {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  }

  function updateEntry(id, field, value) {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  }

  function getBaseTotal(entry) {
    if (!entry.productId || !entry.vehiclesCount) return 0;
    const product = products.find(p => p.id === entry.productId);
    if (!product) return 0;
    return parseFloat(product.basePrice) * parseInt(entry.vehiclesCount);
  }

  function getEntryTotal(entry) {
    const baseTotal = getBaseTotal(entry);
    // Apply GYG discount if applicable
    let total = baseTotal;
    if (entry.gygDiscount > 0) {
      total = baseTotal * (1 - entry.gygDiscount);
    }
    // Subtract commission - this is the real money received
    const commission = parseFloat(entry.commission) || 0;
    return total - commission;
  }

  // Get total before commission (for display purposes)
  function getPreCommissionTotal(entry) {
    const baseTotal = getBaseTotal(entry);
    if (entry.gygDiscount > 0) {
      return baseTotal * (1 - entry.gygDiscount);
    }
    return baseTotal;
  }

  function addPaymentSplit(entryId) {
    setEntries(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          paymentSplit: [...e.paymentSplit, { method: 'cash', amount: 0 }]
        };
      }
      return e;
    }));
  }

  function removePaymentSplit(entryId, splitIndex) {
    setEntries(entries.map(e => {
      if (e.id === entryId && e.paymentSplit.length > 1) {
        const newSplits = e.paymentSplit.filter((_, i) => i !== splitIndex);
        return { ...e, paymentSplit: newSplits };
      }
      return e;
    }));
  }

  function updatePaymentSplit(entryId, splitIndex, field, value) {
    setEntries(entries.map(e => {
      if (e.id === entryId) {
        const newSplits = e.paymentSplit.map((split, i) => {
          if (i === splitIndex) {
            return { ...split, [field]: value };
          }
          return split;
        });
        
        // Check if any split is GYG and apply discount
        const hasGyg = newSplits.some(s => s.method === 'gyg');
        const hasCruise = newSplits.some(s => s.method === 'cruceros');
        
        let updatedEntry = { ...e, paymentSplit: newSplits };
        
        // Apply GYG discount automatically
        if (field === 'method' && value === 'gyg') {
          const baseTotal = getBaseTotal(e);
          const discountedTotal = baseTotal * (1 - GYG_DISCOUNT);
          updatedEntry.gygDiscount = GYG_DISCOUNT;
          // Update all splits to reflect discounted total
          if (newSplits.length === 1) {
            updatedEntry.paymentSplit = [{ method: 'gyg', amount: discountedTotal }];
          }
          toast.info(`Descuento GYG del 25% aplicado: €${(baseTotal - discountedTotal).toFixed(2)}`);
        } else if (field === 'method' && value !== 'gyg') {
          // Remove GYG discount if switching away from GYG
          const otherHasGyg = newSplits.filter((_, idx) => idx !== splitIndex).some(s => s.method === 'gyg');
          if (!otherHasGyg && e.gygDiscount > 0) {
            updatedEntry.gygDiscount = 0;
            const baseTotal = getBaseTotal(e);
            if (newSplits.length === 1) {
              updatedEntry.paymentSplit = [{ method: value, amount: baseTotal }];
            }
          }
        }
        
        // Mark as pending for cruise
        if (field === 'method' && value === 'cruceros') {
          updatedEntry.isPendingCruise = true;
          toast.info('Pago de crucero marcado como pendiente (cobro mensual)');
        } else if (field === 'method' && value !== 'cruceros') {
          const otherHasCruise = newSplits.filter((_, idx) => idx !== splitIndex).some(s => s.method === 'cruceros');
          if (!otherHasCruise) {
            updatedEntry.isPendingCruise = false;
          }
        }
        
        return updatedEntry;
      }
      return e;
    }));
  }

  function handleProductChange(entryId, productId) {
    const entry = entries.find(e => e.id === entryId);
    const product = products.find(p => p.id === productId);
    if (!product || !entry) return;

    const baseTotal = parseFloat(product.basePrice) * parseInt(entry.vehiclesCount);
    const hasGyg = entry.paymentSplit.some(s => s.method === 'gyg');
    const finalTotal = hasGyg ? baseTotal * (1 - GYG_DISCOUNT) : baseTotal;
    const commission = parseFloat(entry.commission) || 0;
    const realTotal = finalTotal - commission;
    const method = entry.paymentSplit[0]?.method || 'cash';

    setEntries(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          productId,
          paymentSplit: [{ method, amount: realTotal }],
          gygDiscount: hasGyg ? GYG_DISCOUNT : 0,
        };
      }
      return e;
    }));
  }

  function handleVehicleCountChange(entryId, newCount) {
    const entry = entries.find(e => e.id === entryId);
    if (!entry || !entry.productId) {
      updateEntry(entryId, 'vehiclesCount', newCount);
      return;
    }

    const product = products.find(p => p.id === entry.productId);
    if (!product) return;

    const baseTotal = parseFloat(product.basePrice) * parseInt(newCount || 0);
    const hasGyg = entry.paymentSplit.some(s => s.method === 'gyg');
    const finalTotal = hasGyg ? baseTotal * (1 - GYG_DISCOUNT) : baseTotal;
    const commission = parseFloat(entry.commission) || 0;
    const realTotal = finalTotal - commission;
    const method = entry.paymentSplit[0]?.method || 'cash';

    setEntries(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          vehiclesCount: newCount,
          paymentSplit: [{ method, amount: realTotal }],
        };
      }
      return e;
    }));
  }

  function handleCommissionChange(entryId, newCommission) {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const commission = parseFloat(newCommission) || 0;
    const preCommissionTotal = getPreCommissionTotal(entry);
    const realTotal = preCommissionTotal - commission;
    const method = entry.paymentSplit[0]?.method || 'cash';

    // Update commission and recalculate payment split
    setEntries(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          commission: newCommission,
          paymentSplit: [{ method, amount: Math.max(0, realTotal) }],
        };
      }
      return e;
    }));
  }

  function getPaymentSplitTotal(entry) {
    return entry.paymentSplit.reduce((sum, split) => sum + parseFloat(split.amount || 0), 0);
  }

  function getTotalVehicles(category) {
    return entries
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + parseInt(e.vehiclesCount || 0), 0);
  }

  function canSave() {
    const quadTotal = getTotalVehicles('quad');
    const buggyTotal = getTotalVehicles('buggy');
    
    const quadAvailable = capacity.quad.available;
    const buggyAvailable = capacity.buggy.available;

    const allValid = entries.every(e => {
      if (!e.productId || !e.vehiclesCount) return false;
      const entryTotal = getEntryTotal(e);
      const splitTotal = getPaymentSplitTotal(e);
      const diff = Math.abs(splitTotal - entryTotal);
      return diff < 0.01;
    });
    
    const capacityOk = quadTotal <= quadAvailable && buggyTotal <= buggyAvailable;

    return allValid && capacityOk && date && timeSlot;
  }

  async function handleSave() {
    if (!canSave()) {
      const invalidSplits = entries.filter(e => {
        const entryTotal = getEntryTotal(e);
        const splitTotal = getPaymentSplitTotal(e);
        return Math.abs(splitTotal - entryTotal) >= 0.01;
      });
      
      if (invalidSplits.length > 0) {
        toast.error('Las cantidades de pago deben sumar el total de cada entrada');
        return;
      }
      toast.error('Por favor, verifica los datos y la capacidad disponible');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        entries: entries.map(e => ({
          date,
          timeSlot,
          category: e.category,
          productId: e.productId,
          vehiclesCount: parseInt(e.vehiclesCount),
          notes: e.notes,
          salesChannel: e.paymentSplit[0]?.method || 'otros',
          paymentSplit: e.paymentSplit.map(s => ({
            method: s.method,
            amount: parseFloat(s.amount)
          })),
          gygDiscount: e.gygDiscount || 0,
          isPendingCruise: e.isPendingCruise || false,
          commission: parseFloat(e.commission) || 0,
          userId: 'user-1',
          userName: 'Usuario Demo',
        })),
        userId: 'user-1',
        userName: 'Usuario Demo',
      };

      const res = await fetch('/api/departures/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          toast.success(`¡${result.created} entrada(s) creada(s) exitosamente!`);
          setEntries([{
            id: Math.random(),
            category: 'quad',
            productId: '',
            vehiclesCount: 1,
            notes: '',
            salesChannel: 'cash',
            paymentSplit: [{ method: 'cash', amount: 0 }],
            gygDiscount: 0,
            isPendingCruise: false,
            commission: 0,
            commissionMethod: 'cash',
          }]);
          loadCapacity();
        } else {
          toast.error(`Creadas ${result.created}, errores: ${result.errors}`);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar las entradas');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  const quadTotal = getTotalVehicles('quad');
  const buggyTotal = getTotalVehicles('buggy');
  const quadExceeds = quadTotal > capacity.quad.available;
  const buggyExceeds = buggyTotal > capacity.buggy.available;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('newTourEntry')}</CardTitle>
          <CardDescription>
            {t('createSingleOrMultiple')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Time Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="date">{t('date')}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="timeSlot">{t('timeSlot')}</Label>
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('selectTime')} />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map(slot => (
                    <SelectItem key={slot.id} value={slot.time}>{slot.time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Capacity Indicators */}
          {date && timeSlot && (
            <div className="grid gap-4 md:grid-cols-2">
              <Alert className={quadExceeds ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'}>
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{t('quads')}:</span>
                      <span className="ml-2">{quadTotal} / {capacity.quad.available} {t('available')}</span>
                    </div>
                    {quadExceeds ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="mt-1 h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${quadExceeds ? 'bg-red-600' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min((quadTotal / capacity.quad.available) * 100, 100)}%` }}
                    />
                  </div>
                </AlertDescription>
              </Alert>

              <Alert className={buggyExceeds ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{t('buggies')}:</span>
                      <span className="ml-2">{buggyTotal} / {capacity.buggy.available} {t('available')}</span>
                    </div>
                    {buggyExceeds ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div className="mt-1 h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${buggyExceeds ? 'bg-red-600' : 'bg-green-600'}`}
                      style={{ width: `${Math.min((buggyTotal / capacity.buggy.available) * 100, 100)}%` }}
                    />
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Entries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('entriesCount')} ({entries.length})</h3>
              <Button onClick={addEntry} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('addEntry')}
              </Button>
            </div>

            {entries.map((entry, index) => {
              const baseTotal = getBaseTotal(entry);
              const preCommissionTotal = getPreCommissionTotal(entry);
              const entryTotal = getEntryTotal(entry); // This is after commission
              const splitTotal = getPaymentSplitTotal(entry);
              const splitValid = Math.abs(splitTotal - entryTotal) < 0.01;
              const splitDiff = entryTotal - splitTotal;
              const hasDiscount = entry.gygDiscount > 0;
              const hasCommission = parseFloat(entry.commission) > 0;
              
              return (
                <Card key={entry.id} className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge>{t('entry')} #{index + 1}</Badge>
                        {baseTotal > 0 && (
                          <>
                            {hasDiscount && (
                              <Badge variant="outline" className="line-through text-muted-foreground">
                                €{baseTotal.toFixed(2)}
                              </Badge>
                            )}
                            {hasDiscount && !hasCommission && (
                              <Badge className="bg-green-600">
                                <Percent className="h-3 w-3 mr-1" />
                                €{entryTotal.toFixed(2)} (-25% GYG)
                              </Badge>
                            )}
                            {hasCommission && (
                              <>
                                {!hasDiscount && (
                                  <Badge variant="outline" className="line-through text-muted-foreground">
                                    €{baseTotal.toFixed(2)}
                                  </Badge>
                                )}
                                {hasDiscount && (
                                  <Badge variant="outline" className="text-green-600">
                                    €{preCommissionTotal.toFixed(2)} (-25%)
                                  </Badge>
                                )}
                                <Badge className="bg-purple-600">
                                  💰 €{entryTotal.toFixed(2)} (com: -{parseFloat(entry.commission).toFixed(2)})
                                </Badge>
                              </>
                            )}
                            {!hasDiscount && !hasCommission && (
                              <Badge variant="outline">
                                {t('total')}: €{entryTotal.toFixed(2)}
                              </Badge>
                            )}
                          </>
                        )}
                        {entry.isPendingCruise && (
                          <Badge className="bg-amber-500">
                            <Ship className="h-3 w-3 mr-1" />
                            Pendiente Crucero
                          </Badge>
                        )}
                      </div>
                      {entries.length > 1 && (
                        <Button
                          onClick={() => removeEntry(entry.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
                      <div>
                        <Label>{t('category')}</Label>
                        <Select
                          value={entry.category}
                          onValueChange={(value) => updateEntry(entry.id, 'category', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quad">Quad</SelectItem>
                            <SelectItem value="buggy">Buggy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>{t('product')}</Label>
                        <Select
                          value={entry.productId}
                          onValueChange={(value) => handleProductChange(entry.id, value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t('select')} />
                          </SelectTrigger>
                          <SelectContent>
                            {products
                              .filter(p => p.category === entry.category)
                              .map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - €{product.basePrice}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>{t('vehicleCount')}</Label>
                        <Input
                          type="number"
                          min="1"
                          value={entry.vehiclesCount}
                          onChange={(e) => handleVehicleCountChange(entry.id, e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="flex items-center gap-1">
                          💰 {language === 'es' ? 'Comisión Colaborador' : 'Collaborator Commission'}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.commission || ''}
                          onChange={(e) => handleCommissionChange(entry.id, e.target.value)}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>{t('notes')}</Label>
                        <Textarea
                          value={entry.notes}
                          onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                          placeholder={t('notesPlaceholder')}
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Payment Split Section */}
                    {entryTotal > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="flex items-center gap-2">
                            <Euro className="h-4 w-4" />
                            {t('paymentMethod')}
                            {!splitValid && splitDiff !== 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {t('missing')}: €{splitDiff.toFixed(2)}
                              </Badge>
                            )}
                            {splitValid && (
                              <Badge variant="default" className="text-xs bg-green-600">
                                ✓ {t('complete')}
                              </Badge>
                            )}
                          </Label>
                          <Button
                            onClick={() => addPaymentSplit(entry.id)}
                            size="sm"
                            variant="outline"
                            className="h-7"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {t('splitPayment')}
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {entry.paymentSplit.map((split, splitIndex) => (
                            <div key={splitIndex} className="flex gap-2 items-start">
                              <div className="flex-1">
                                <Select
                                  value={split.method}
                                  onValueChange={(value) => updatePaymentSplit(entry.id, splitIndex, 'method', value)}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cash">💵 {t('cash')}</SelectItem>
                                    <SelectItem value="bank">🏦 {t('bank')}</SelectItem>
                                    <SelectItem value="web">🌐 {t('web')}</SelectItem>
                                    <SelectItem value="gyg">🎫 {t('gygDiscount')}</SelectItem>
                                    <SelectItem value="cruceros">🚢 {t('cruisesPending')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-28">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={split.amount}
                                  onChange={(e) => updatePaymentSplit(entry.id, splitIndex, 'amount', e.target.value)}
                                  className="h-9"
                                  placeholder="€"
                                />
                              </div>
                              {entry.paymentSplit.length > 1 && (
                                <Button
                                  onClick={() => removePaymentSplit(entry.id, splitIndex)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 w-9 p-0 text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <div className="text-sm text-muted-foreground mt-2">
                            Total asignado: €{splitTotal.toFixed(2)} de €{entryTotal.toFixed(2)}
                            {hasDiscount && (
                              <span className="text-green-600 ml-2">(Precio original: €{baseTotal.toFixed(2)})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleSave}
              disabled={!canSave() || saving}
              size="lg"
              className="min-w-[200px]"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('saveTours')} {entries.length} {t('entries')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
