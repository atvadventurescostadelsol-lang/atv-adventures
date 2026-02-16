'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'quad',
    duration: '',
    basePrice: '',
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [productsRes, slotsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/timeslots')
      ]);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }

      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        setTimeSlots(slotsData);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct() {
    if (!newProduct.name || !newProduct.basePrice) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });

      if (res.ok) {
        toast.success('Producto creado exitosamente');
        setNewProduct({
          name: '',
          category: 'quad',
          duration: '',
          basePrice: '',
          active: true
        });
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al crear producto');
      }
    } catch (error) {
      toast.error('Error al crear producto');
      console.error(error);
    }
  }

  async function handleUpdateProduct(productId, updates) {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        toast.success('Producto actualizado exitosamente');
        setEditingProduct(null);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al actualizar producto');
      }
    } catch (error) {
      toast.error('Error al actualizar producto');
      console.error(error);
    }
  }

  function startEdit(product) {
    setEditingProduct({
      id: product.id,
      name: product.name,
      category: product.category,
      duration: product.duration,
      basePrice: product.basePrice,
      active: product.active === 'TRUE'
    });
  }

  function cancelEdit() {
    setEditingProduct(null);
  }

  function saveEdit() {
    if (editingProduct) {
      handleUpdateProduct(editingProduct.id, {
        name: editingProduct.name,
        category: editingProduct.category,
        duration: editingProduct.duration,
        basePrice: editingProduct.basePrice,
        active: editingProduct.active,
        userId: 'admin'
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Panel de Administración</CardTitle>
          <CardDescription>
            Gestiona productos, precios y configuración del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products">Productos</TabsTrigger>
              <TabsTrigger value="timeslots">Franjas Horarias</TabsTrigger>
              <TabsTrigger value="capacity">Capacidades</TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Agregar Nuevo Producto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <Label>Categoría</Label>
                      <Select
                        value={newProduct.category}
                        onValueChange={(value) => setNewProduct({...newProduct, category: value})}
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
                      <Label>Nombre</Label>
                      <Input
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        placeholder="ej: 2 horas"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Duración</Label>
                      <Input
                        value={newProduct.duration}
                        onChange={(e) => setNewProduct({...newProduct, duration: e.target.value})}
                        placeholder="ej: 2h"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Precio Base (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newProduct.basePrice}
                        onChange={(e) => setNewProduct({...newProduct, basePrice: e.target.value})}
                        placeholder="70"
                        className="mt-1"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button onClick={handleCreateProduct} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Productos Actuales</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Duración</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const isEditing = editingProduct?.id === product.id;
                        
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              {isEditing ? (
                                <Select
                                  value={editingProduct.category}
                                  onValueChange={(value) => setEditingProduct({...editingProduct, category: value})}
                                >
                                  <SelectTrigger className="h-8 w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="quad">Quad</SelectItem>
                                    <SelectItem value="buggy">Buggy</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={product.category === 'quad' ? 'default' : 'secondary'}>
                                  {product.category === 'quad' ? 'Quad' : 'Buggy'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {isEditing ? (
                                <Input
                                  value={editingProduct.name}
                                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                                  className="h-8"
                                />
                              ) : (
                                product.name
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={editingProduct.duration}
                                  onChange={(e) => setEditingProduct({...editingProduct, duration: e.target.value})}
                                  className="h-8 w-20"
                                />
                              ) : (
                                product.duration
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <span>€</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingProduct.basePrice}
                                    onChange={(e) => setEditingProduct({...editingProduct, basePrice: e.target.value})}
                                    className="h-8 w-20"
                                  />
                                </div>
                              ) : (
                                `€${product.basePrice}`
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={product.active === 'TRUE' ? 'default' : 'secondary'}>
                                {product.active === 'TRUE' ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                  <Button onClick={saveEdit} size="sm" variant="default">
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button onClick={cancelEdit} size="sm" variant="ghost">
                                    Cancelar
                                  </Button>
                                </div>
                              ) : (
                                <Button onClick={() => startEdit(product)} variant="ghost" size="sm">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Time Slots Tab */}
            <TabsContent value="timeslots" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Franjas Horarias</CardTitle>
                  <CardDescription>
                    Gestiona las franjas horarias disponibles para salidas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeSlots.map((slot) => (
                        <TableRow key={slot.id}>
                          <TableCell className="font-medium text-lg">{slot.time}</TableCell>
                          <TableCell>
                            <Badge variant={slot.active === 'TRUE' ? 'default' : 'secondary'}>
                              {slot.active === 'TRUE' ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Capacity Tab */}
            <TabsContent value="capacity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Capacidades por Categoría</CardTitle>
                  <CardDescription>
                    Define el número máximo de vehículos por franja horaria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">Quads</h3>
                              <p className="text-sm text-muted-foreground">Capacidad máxima por slot</p>
                            </div>
                            <div className="text-3xl font-bold text-blue-600">10</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">Buggies</h3>
                              <p className="text-sm text-muted-foreground">Capacidad máxima por slot</p>
                            </div>
                            <div className="text-3xl font-bold text-green-600">6</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Nota:</strong> Las capacidades controlan cuántos vehículos pueden salir en cada franja horaria.
                          Para cambiar estos valores, edita la hoja "Capacity" en Google Sheets.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
