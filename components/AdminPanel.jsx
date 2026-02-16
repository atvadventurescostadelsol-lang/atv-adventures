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
import { Plus, Edit2, Save, X, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPanel() {
  const [products, setProducts] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [categories, setCategories] = useState(['quad', 'buggy']);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'quad',
    duration: '',
    basePrice: '',
    active: true
  });
  const [newSlot, setNewSlot] = useState({
    time: '',
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
        // Extract unique categories
        const uniqueCategories = [...new Set(productsData.map(p => p.category))];
        if (uniqueCategories.length > 0) {
          setCategories(uniqueCategories);
        }
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

  // Add new category
  function handleAddCategory() {
    if (!newCategory.trim()) {
      toast.error('Ingresa un nombre para la categoría');
      return;
    }
    const categorySlug = newCategory.toLowerCase().trim().replace(/\s+/g, '_');
    if (categories.includes(categorySlug)) {
      toast.error('Esta categoría ya existe');
      return;
    }
    setCategories([...categories, categorySlug]);
    setNewProduct({ ...newProduct, category: categorySlug });
    setNewCategory('');
    setShowNewCategory(false);
    toast.success(`Categoría "${newCategory}" agregada`);
  }

  async function handleCreateProduct() {
    if (!newProduct.name || !newProduct.basePrice || !newProduct.duration) {
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
        toast.success('Producto actualizado');
        setEditingProduct(null);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al actualizar');
      }
    } catch (error) {
      toast.error('Error al actualizar producto');
      console.error(error);
    }
  }

  async function handleUpdateSlot(slotId, updates) {
    try {
      const res = await fetch(`/api/timeslots/${slotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        toast.success('Franja horaria actualizada');
        setEditingSlot(null);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al actualizar');
      }
    } catch (error) {
      toast.error('Error al actualizar franja');
      console.error(error);
    }
  }

  async function handleCreateSlot() {
    if (!newSlot.time) {
      toast.error('Por favor ingresa la hora');
      return;
    }

    try {
      const res = await fetch('/api/timeslots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSlot)
      });

      if (res.ok) {
        toast.success('Franja horaria creada');
        setNewSlot({ time: '', active: true });
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al crear franja');
      }
    } catch (error) {
      toast.error('Error al crear franja');
      console.error(error);
    }
  }

  function startEditProduct(product) {
    setEditingProduct({
      id: product.id,
      name: product.name,
      category: product.category,
      duration: product.duration,
      basePrice: product.basePrice,
      active: product.active === 'TRUE' || product.active === true
    });
  }

  function startEditSlot(slot) {
    setEditingSlot({
      id: slot.id,
      time: slot.time,
      active: slot.active === 'TRUE' || slot.active === true
    });
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
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <div>
                      <Label>Categoría</Label>
                      {showNewCategory ? (
                        <div className="flex gap-1 mt-1">
                          <Input
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Nueva categoría"
                            className="h-10"
                          />
                          <Button size="sm" onClick={handleAddCategory} className="h-10 px-2">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowNewCategory(false)} className="h-10 px-2">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 mt-1">
                          <Select
                            value={newProduct.category}
                            onValueChange={(value) => setNewProduct({...newProduct, category: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat} value={cat}>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" onClick={() => setShowNewCategory(true)} className="h-10 px-2" title="Nueva categoría">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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
                                  <SelectTrigger className="h-8 w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map(cat => (
                                      <SelectItem key={cat} value={cat}>
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={product.category === 'quad' ? 'default' : 'secondary'}>
                                  {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
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
                              {isEditing ? (
                                <Select
                                  value={editingProduct.active ? 'true' : 'false'}
                                  onValueChange={(value) => setEditingProduct({...editingProduct, active: value === 'true'})}
                                >
                                  <SelectTrigger className="h-8 w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Activo</SelectItem>
                                    <SelectItem value="false">Inactivo</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={(product.active === 'TRUE' || product.active === true) ? 'default' : 'secondary'}>
                                  {(product.active === 'TRUE' || product.active === true) ? 'Activo' : 'Inactivo'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                  <Button 
                                    onClick={() => handleUpdateProduct(editingProduct.id, editingProduct)} 
                                    size="sm" 
                                    variant="default"
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button onClick={() => setEditingProduct(null)} size="sm" variant="ghost">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button onClick={() => startEditProduct(product)} variant="ghost" size="sm">
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
                  <CardTitle>Agregar Nueva Franja Horaria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label>Hora (formato 24h)</Label>
                      <Input
                        type="time"
                        value={newSlot.time}
                        onChange={(e) => setNewSlot({...newSlot, time: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={handleCreateSlot}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </CardContent>
              </Card>

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
                      {timeSlots.map((slot) => {
                        const isEditing = editingSlot?.id === slot.id;
                        
                        return (
                          <TableRow key={slot.id}>
                            <TableCell className="font-medium text-lg">
                              {isEditing ? (
                                <Input
                                  type="time"
                                  value={editingSlot.time}
                                  onChange={(e) => setEditingSlot({...editingSlot, time: e.target.value})}
                                  className="h-8 w-32"
                                />
                              ) : (
                                slot.time
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Select
                                  value={editingSlot.active ? 'true' : 'false'}
                                  onValueChange={(value) => setEditingSlot({...editingSlot, active: value === 'true'})}
                                >
                                  <SelectTrigger className="h-8 w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">Activo</SelectItem>
                                    <SelectItem value="false">Inactivo</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={(slot.active === 'TRUE' || slot.active === true) ? 'default' : 'secondary'}>
                                  {(slot.active === 'TRUE' || slot.active === true) ? 'Activo' : 'Inactivo'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                  <Button 
                                    onClick={() => handleUpdateSlot(editingSlot.id, editingSlot)} 
                                    size="sm" 
                                    variant="default"
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button onClick={() => setEditingSlot(null)} size="sm" variant="ghost">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button onClick={() => startEditSlot(slot)} variant="ghost" size="sm">
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
