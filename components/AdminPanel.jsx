'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Save, X, Check, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import UserManagement from '@/components/UserManagement';
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

export default function AdminPanel() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [categories, setCategories] = useState(['quad', 'buggy']);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: '', name: '' });
  const [capacities, setCapacities] = useState({ quad: 10, buggy: 6 });
  const [editingCapacity, setEditingCapacity] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'quad',
    duration: '',
    basePrice: '',
    active: true
  });
  const [newSlot, setNewSlot] = useState({
    time: '',
    quadCapacity: 10,
    buggyCapacity: 6,
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
        const uniqueCategories = [...new Set(productsData.map(p => p.category))];
        if (uniqueCategories.length > 0) {
          setCategories(uniqueCategories);
        }
      }

      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        setTimeSlots(slotsData);
        // Get default capacities from first slot
        if (slotsData.length > 0) {
          setCapacities({
            quad: parseInt(slotsData[0].quadCapacity) || 10,
            buggy: parseInt(slotsData[0].buggyCapacity) || 6
          });
        }
      }
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

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

  function handleDeleteCategory(categoryToDelete) {
    const productsInCategory = products.filter(p => p.category === categoryToDelete);
    if (productsInCategory.length > 0) {
      toast.error(`No se puede eliminar: hay ${productsInCategory.length} producto(s) en esta categoría`);
      return;
    }
    setCategories(categories.filter(c => c !== categoryToDelete));
    toast.success(`Categoría "${categoryToDelete}" eliminada`);
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
        setNewProduct({ name: '', category: 'quad', duration: '', basePrice: '', active: true });
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

  async function handleDeleteProduct(productId) {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Producto eliminado');
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar producto');
      console.error(error);
    } finally {
      setDeleteDialog({ open: false, type: '', id: '', name: '' });
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

  async function handleDeleteSlot(slotId) {
    try {
      const res = await fetch(`/api/timeslots/${slotId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Franja horaria eliminada');
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar franja');
      console.error(error);
    } finally {
      setDeleteDialog({ open: false, type: '', id: '', name: '' });
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
        setNewSlot({ time: '', quadCapacity: capacities.quad, buggyCapacity: capacities.buggy, active: true });
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

  async function handleUpdateCapacities() {
    try {
      // Update capacities for all time slots
      const updatePromises = timeSlots.map(slot => 
        fetch(`/api/timeslots/${slot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            time: slot.time,
            quadCapacity: capacities.quad,
            buggyCapacity: capacities.buggy,
            active: slot.active === 'TRUE' || slot.active === true
          })
        })
      );

      await Promise.all(updatePromises);
      toast.success(t('deletedSuccess'));
      setEditingCapacity(false);
      loadData();
    } catch (error) {
      toast.error(t('deleteError'));
      console.error(error);
    }
  }

  function handleDeleteCategory(categoryToDelete) {
    // Check if category has products
    const categoryProducts = products.filter(p => p.category === categoryToDelete);
    if (categoryProducts.length > 0) {
      toast.error(`Cannot delete category with ${categoryProducts.length} products`);
      return;
    }
    
    // Remove category from list
    setCategories(categories.filter(c => c !== categoryToDelete));
    toast.success(t('deletedSuccess'));
    setDeleteDialog({ open: false, type: '', id: '', name: '' });
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
      quadCapacity: slot.quadCapacity || 10,
      buggyCapacity: slot.buggyCapacity || 6,
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
      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: '', id: '', name: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete')} {deleteDialog.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmation')}: "{deleteDialog.name}". {t('deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteDialog.type === 'producto' || deleteDialog.type === 'product') {
                  handleDeleteProduct(deleteDialog.id);
                } else if (deleteDialog.type === 'franja horaria' || deleteDialog.type === 'time slot') {
                  handleDeleteSlot(deleteDialog.id);
                } else if (deleteDialog.type === 'categoría' || deleteDialog.type === 'category') {
                  handleDeleteCategory(deleteDialog.id);
                }
              }}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>{t('adminTitle')}</CardTitle>
          <CardDescription>{t('adminDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products">{t('products')}</TabsTrigger>
              <TabsTrigger value="timeslots">{t('timeSlots')}</TabsTrigger>
              <TabsTrigger value="capacity">{t('capacities')}</TabsTrigger>
              <TabsTrigger value="categories">{t('categories')}</TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                {t('users')}
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('addProduct')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                    <div>
                      <Label>{t('category')}</Label>
                      <Select value={newProduct.category} onValueChange={(value) => setNewProduct({...newProduct, category: value})}>
                        <SelectTrigger className="mt-1">
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
                    </div>
                    <div>
                      <Label>{t('name')}</Label>
                      <Input value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} placeholder="ej: 2 horas" className="mt-1" />
                    </div>
                    <div>
                      <Label>{t('duration')}</Label>
                      <Input value={newProduct.duration} onChange={(e) => setNewProduct({...newProduct, duration: e.target.value})} placeholder="ej: 2h" className="mt-1" />
                    </div>
                    <div>
                      <Label>{t('basePrice')} (€)</Label>
                      <Input type="number" step="0.01" value={newProduct.basePrice} onChange={(e) => setNewProduct({...newProduct, basePrice: e.target.value})} placeholder="70" className="mt-1" />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleCreateProduct} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('addProduct')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('products')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('category')}</TableHead>
                        <TableHead>{t('name')}</TableHead>
                        <TableHead>{t('duration')}</TableHead>
                        <TableHead>{t('basePrice')}</TableHead>
                        <TableHead>{t('active')}</TableHead>
                        <TableHead className="text-right">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const isEditing = editingProduct?.id === product.id;
                        
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              {isEditing ? (
                                <Select value={editingProduct.category} onValueChange={(value) => setEditingProduct({...editingProduct, category: value})}>
                                  <SelectTrigger className="h-8 w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map(cat => (
                                      <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
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
                                <Input value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="h-8" />
                              ) : product.name}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input value={editingProduct.duration} onChange={(e) => setEditingProduct({...editingProduct, duration: e.target.value})} className="h-8 w-20" />
                              ) : product.duration}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <span>€</span>
                                  <Input type="number" step="0.01" value={editingProduct.basePrice} onChange={(e) => setEditingProduct({...editingProduct, basePrice: e.target.value})} className="h-8 w-20" />
                                </div>
                              ) : `€${product.basePrice}`}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Select value={editingProduct.active ? 'true' : 'false'} onValueChange={(value) => setEditingProduct({...editingProduct, active: value === 'true'})}>
                                  <SelectTrigger className="h-8 w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">{t('active')}</SelectItem>
                                    <SelectItem value="false">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant={(product.active === 'TRUE' || product.active === true) ? 'default' : 'secondary'}>
                                  {(product.active === 'TRUE' || product.active === true) ? t('active') : 'Inactive'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex gap-1 justify-end">
                                  <Button onClick={() => handleUpdateProduct(editingProduct.id, editingProduct)} size="sm" variant="default">
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button onClick={() => setEditingProduct(null)} size="sm" variant="ghost">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-1 justify-end">
                                  <Button onClick={() => startEditProduct(product)} variant="ghost" size="sm">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => setDeleteDialog({ open: true, type: 'producto', id: product.id, name: product.name })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
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
                      <Input type="time" value={newSlot.time} onChange={(e) => setNewSlot({...newSlot, time: e.target.value})} className="mt-1" />
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
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Cap. Quads</TableHead>
                        <TableHead>Cap. Buggies</TableHead>
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
                                <Input type="time" value={editingSlot.time} onChange={(e) => setEditingSlot({...editingSlot, time: e.target.value})} className="h-8 w-32" />
                              ) : slot.time}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input type="number" value={editingSlot.quadCapacity} onChange={(e) => setEditingSlot({...editingSlot, quadCapacity: e.target.value})} className="h-8 w-16" />
                              ) : (slot.quadCapacity || capacities.quad)}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input type="number" value={editingSlot.buggyCapacity} onChange={(e) => setEditingSlot({...editingSlot, buggyCapacity: e.target.value})} className="h-8 w-16" />
                              ) : (slot.buggyCapacity || capacities.buggy)}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Select value={editingSlot.active ? 'true' : 'false'} onValueChange={(value) => setEditingSlot({...editingSlot, active: value === 'true'})}>
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
                                  <Button onClick={() => handleUpdateSlot(editingSlot.id, editingSlot)} size="sm" variant="default">
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button onClick={() => setEditingSlot(null)} size="sm" variant="ghost">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-1 justify-end">
                                  <Button onClick={() => startEditSlot(slot)} variant="ghost" size="sm">
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => setDeleteDialog({ open: true, type: 'time slot', id: slot.id, name: slot.time })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
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
                  <CardTitle>{t('capacities')}</CardTitle>
                  <CardDescription>{t('maxVehicles')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className={editingCapacity ? 'ring-2 ring-blue-500' : ''}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">🏍️ {t('quads')}</h3>
                              <p className="text-sm text-muted-foreground">{t('quadCapacity')}</p>
                            </div>
                            {editingCapacity ? (
                              <Input 
                                type="number" 
                                value={capacities.quad} 
                                onChange={(e) => setCapacities({...capacities, quad: parseInt(e.target.value) || 0})}
                                className="w-20 text-2xl font-bold text-center"
                              />
                            ) : (
                              <div className="text-3xl font-bold text-blue-600">{capacities.quad}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className={editingCapacity ? 'ring-2 ring-green-500' : ''}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">🚙 {t('buggies')}</h3>
                              <p className="text-sm text-muted-foreground">{t('buggyCapacity')}</p>
                            </div>
                            {editingCapacity ? (
                              <Input 
                                type="number" 
                                value={capacities.buggy} 
                                onChange={(e) => setCapacities({...capacities, buggy: parseInt(e.target.value) || 0})}
                                className="w-20 text-2xl font-bold text-center"
                              />
                            ) : (
                              <div className="text-3xl font-bold text-green-600">{capacities.buggy}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex gap-2">
                      {editingCapacity ? (
                        <>
                          <Button onClick={handleUpdateCapacities}>
                            <Save className="h-4 w-4 mr-2" />
                            {t('modifyCapacity')}
                          </Button>
                          <Button variant="outline" onClick={() => setEditingCapacity(false)}>
                            {t('cancel')}
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => setEditingCapacity(true)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          {t('modifyCapacity')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('categories')}</CardTitle>
                  <CardDescription>{t('addCategory')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      value={newCategory} 
                      onChange={(e) => setNewCategory(e.target.value)} 
                      placeholder={t('categoryName')}
                      className="max-w-xs"
                    />
                    <Button onClick={handleAddCategory}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('addCategory')}
                    </Button>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    {categories.map(cat => {
                      const productCount = products.filter(p => p.category === cat).length;
                      const isDefault = cat === 'quad' || cat === 'buggy';
                      
                      return (
                        <Card key={cat} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium capitalize">{cat}</div>
                              <div className="text-xs text-muted-foreground">{productCount} {t('products').toLowerCase()}</div>
                            </div>
                            {!isDefault && productCount === 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => setDeleteDialog({ open: true, type: 'category', id: cat, name: cat })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {!isDefault && productCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {t('active')}
                              </Badge>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <UserManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
