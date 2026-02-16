'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, Car, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
              <CardTitle>Dashboard - {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: es })}</CardTitle>
              <CardDescription>Resumen de operaciones del día</CardDescription>
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
                ← Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                Hoy
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
                Siguiente →
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
            <CardDescription className="text-orange-100">Total Bruto</CardDescription>
            <CardTitle className="text-3xl">€{stats.totalGross.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-orange-100">
              Neto: €{stats.netBase.toFixed(2)} | IVA: €{stats.vatAmount.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vehículos</CardDescription>
            <CardTitle className="text-3xl">{stats.quadCount + stats.buggyCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Car className="h-4 w-4 text-blue-600" />
                <span className="font-medium">{stats.quadCount}</span>
                <span className="text-muted-foreground">Quads</span>
              </div>
              <div className="flex items-center gap-1">
                <Car className="h-4 w-4 text-green-600" />
                <span className="font-medium">{stats.buggyCount}</span>
                <span className="text-muted-foreground">Buggies</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pagos Recibidos</CardDescription>
            <CardTitle className="text-3xl">€{((stats.cashTotal || 0) + (stats.bankTotal || 0) + (stats.webTotal || 0) + (stats.gygTotal || 0)).toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">€{(stats.cashTotal || 0).toFixed(2)}</span>
                <span className="text-muted-foreground"> Efectivo</span>
              </div>
              <div>
                <span className="font-medium">€{(stats.bankTotal || 0).toFixed(2)}</span>
                <span className="text-muted-foreground"> Banco</span>
              </div>
              <div>
                <span className="font-medium">€{(stats.webTotal || 0).toFixed(2)}</span>
                <span className="text-muted-foreground"> Web</span>
              </div>
              <div>
                <span className="font-medium">€{(stats.gygTotal || 0).toFixed(2)}</span>
                <span className="text-muted-foreground"> GYG</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-100">Pendiente al Llegar</CardDescription>
            <CardTitle className="text-3xl">€{stats.remainingExpected.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-yellow-100">
              Depósitos: €{stats.depositsCollected.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departures by Time Slot */}
      <Card>
        <CardHeader>
          <CardTitle>Salidas por Franja Horaria</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(stats.departuresBySlot).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay salidas programadas para este día</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(stats.departuresBySlot).sort((a, b) => a[0].localeCompare(b[0])).map(([timeSlot, slotDepartures]) => (
                <div key={timeSlot} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-lg">{timeSlot}</h3>
                    <Badge variant="secondary">{slotDepartures.length} entrada(s)</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {slotDepartures.map((dep, idx) => (
                      <Card key={idx} className="bg-muted/50">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant={dep.category === 'quad' ? 'default' : 'secondary'}>
                              {dep.category === 'quad' ? 'Quad' : 'Buggy'}
                            </Badge>
                            <span className="text-sm font-medium">{dep.vehiclesCount}x</span>
                          </div>
                          <p className="text-sm font-medium mb-1">{dep.productName}</p>
                          {dep.groupLabel && (
                            <p className="text-xs text-muted-foreground mb-1">Grupo: {dep.groupLabel}</p>
                          )}
                          <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-semibold">€{parseFloat(dep.totalGross || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {dep.depositPaid === 'true' && (
                              <Badge variant="outline" className="text-xs">✓ Depósito</Badge>
                            )}
                            {dep.remainingPaid === 'true' && (
                              <Badge variant="outline" className="text-xs">✓ Completo</Badge>
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
    </div>
  );
}
