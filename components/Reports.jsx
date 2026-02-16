'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('all');
  const [channel, setChannel] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runReport() {
    if (!startDate || !endDate) {
      toast.error('Por favor selecciona las fechas');
      return;
    }

    setLoading(true);
    try {
      let url = `/api/departures?`;
      const params = [];
      
      if (category !== 'all') params.push(`category=${category}`);
      if (channel !== 'all') params.push(`channel=${channel}`);
      
      url += params.join('&');

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        
        // Filter by date range
        const filtered = data.filter(d => d.date >= startDate && d.date <= endDate);
        
        // Calculate totals
        const totals = {
          count: filtered.length,
          totalGross: 0,
          netBase: 0,
          vatAmount: 0,
          quadCount: 0,
          buggyCount: 0,
          cashTotal: 0,
          bankTotal: 0,
        };

        filtered.forEach(d => {
          totals.totalGross += parseFloat(d.totalGross || 0);
          totals.netBase += parseFloat(d.netBase || 0);
          totals.vatAmount += parseFloat(d.vatAmount || 0);
          
          if (d.category === 'quad') {
            totals.quadCount += parseInt(d.vehiclesCount || 0);
          } else {
            totals.buggyCount += parseInt(d.vehiclesCount || 0);
          }

          if (d.depositPaid === 'true') {
            if (d.depositPaidMethod === 'cash') {
              totals.cashTotal += parseFloat(d.depositAmount || 0);
            } else {
              totals.bankTotal += parseFloat(d.depositAmount || 0);
            }
          }

          if (d.remainingPaid === 'true') {
            if (d.remainingPaidMethod === 'cash') {
              totals.cashTotal += parseFloat(d.remainingAmount || 0);
            } else {
              totals.bankTotal += parseFloat(d.remainingAmount || 0);
            }
          }
        });

        setResults({ data: filtered, totals });
      }
    } catch (error) {
      toast.error('Error al generar el reporte');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    if (!results) return;

    const headers = [
      'Fecha', 'Hora', 'Categoría', 'Producto', 'Vehículos', 'Precio Unit.',
      'Total Bruto', 'Base Neta', 'IVA', 'Canal', 'Depósito Pagado', 'Restante Pagado'
    ];

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
      d.depositPaid,
      d.remainingPaid,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Reporte exportado');
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generador de Reportes</CardTitle>
          <CardDescription>Genera reportes personalizados de tus operaciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="quad">Quads</SelectItem>
                  <SelectItem value="buggy">Buggies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="channel">Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="gyg">GetYourGuide</SelectItem>
                  <SelectItem value="cruceros">Cruceros</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={runReport} disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Generar Reporte
                </>
              )}
            </Button>
            {results && (
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              {results.totals.count} entrada(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4">
                  <div className="text-sm opacity-90">Total Bruto</div>
                  <div className="text-2xl font-bold">€{results.totals.totalGross.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Base Neta</div>
                  <div className="text-2xl font-bold">€{results.totals.netBase.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">IVA (21%)</div>
                  <div className="text-2xl font-bold">€{results.totals.vatAmount.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Vehículos</div>
                  <div className="text-2xl font-bold">{results.totals.quadCount + results.totals.buggyCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Q: {results.totals.quadCount} | B: {results.totals.buggyCount}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Veh.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Canal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.data.map((d, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{d.date}</TableCell>
                        <TableCell>{d.timeSlot}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            d.category === 'quad' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {d.category === 'quad' ? 'Quad' : 'Buggy'}
                          </span>
                        </TableCell>
                        <TableCell>{d.productName}</TableCell>
                        <TableCell className="text-right">{d.vehiclesCount}</TableCell>
                        <TableCell className="text-right font-medium">€{parseFloat(d.totalGross || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.salesChannel}</TableCell>
                      </TableRow>
                    ))}
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
