'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BatchEntry() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('');
  const [entries, setEntries] = useState([{
    id: Math.random(),
    category: 'quad',
    productId: '',
    vehiclesCount: 1,
    groupLabel: '',
    notes: '',
    salesChannel: 'web',
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
      groupLabel: '',
      notes: '',
      salesChannel: 'web',
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

    const allValid = entries.every(e => e.productId && e.vehiclesCount > 0);
    const capacityOk = quadTotal <= quadAvailable && buggyTotal <= buggyAvailable;

    return allValid && capacityOk && date && timeSlot;
  }

  async function handleSave() {
    if (!canSave()) {
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
          groupLabel: e.groupLabel,
          notes: e.notes,
          salesChannel: e.salesChannel,
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
          // Reset form
          setEntries([{
            id: Math.random(),
            category: 'quad',
            productId: '',
            vehiclesCount: 1,
            groupLabel: '',
            notes: '',
            salesChannel: 'web',
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
          <CardTitle>Nueva Entrada de Salidas</CardTitle>
          <CardDescription>
            Crea una o múltiples salidas para la misma fecha y franja horaria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Time Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="timeSlot">Franja Horaria</Label>
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona hora" />
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
                      <span className="font-semibold">Quads:</span>
                      <span className="ml-2">{quadTotal} / {capacity.quad.available} disponibles</span>
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
                      <span className="font-semibold">Buggies:</span>
                      <span className="ml-2">{buggyTotal} / {capacity.buggy.available} disponibles</span>
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
              <h3 className="font-semibold">Entradas ({entries.length})</h3>
              <Button onClick={addEntry} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Entrada
              </Button>
            </div>

            {entries.map((entry, index) => (
              <Card key={entry.id} className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <Badge>Entrada #{index + 1}</Badge>
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

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label>Categoría</Label>
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
                      <Label>Producto</Label>
                      <Select
                        value={entry.productId}
                        onValueChange={(value) => updateEntry(entry.id, 'productId', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecciona" />
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
                      <Label>Cantidad de Vehículos</Label>
                      <Input
                        type="number"
                        min="1"
                        value={entry.vehiclesCount}
                        onChange={(e) => updateEntry(entry.id, 'vehiclesCount', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Etiqueta de Grupo (Opcional)</Label>
                      <Input
                        value={entry.groupLabel}
                        onChange={(e) => updateEntry(entry.id, 'groupLabel', e.target.value)}
                        placeholder="ej: Grupo A"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Canal de Venta</Label>
                      <Select
                        value={entry.salesChannel}
                        onValueChange={(value) => updateEntry(entry.id, 'salesChannel', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="web">Web</SelectItem>
                          <SelectItem value="gyg">GetYourGuide</SelectItem>
                          <SelectItem value="cruceros">Cruceros</SelectItem>
                          <SelectItem value="colaborador">Colaborador</SelectItem>
                          <SelectItem value="otros">Otros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                      <Label>Notas (Opcional)</Label>
                      <Textarea
                        value={entry.notes}
                        onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                        placeholder="Notas adicionales..."
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar {entries.length} Entrada(s)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
