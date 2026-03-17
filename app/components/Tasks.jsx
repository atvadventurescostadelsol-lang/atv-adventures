'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Check, Edit, Trash2, AlertTriangle, AlertCircle, Info, Lightbulb, Clock, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

// Priority configuration
const PRIORITIES = {
  urgente: { 
    label: 'Urgente', 
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: AlertTriangle,
    order: 0 
  },
  importante: { 
    label: 'Importante', 
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: AlertCircle,
    order: 1 
  },
  necesario: { 
    label: 'Necesario', 
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Info,
    order: 2 
  },
  sugerencia: { 
    label: 'Sugerencia', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Lightbulb,
    order: 3 
  },
};

function TaskCard({ task, onComplete, onEdit, onDelete, canModify, canDelete }) {
  const priorityConfig = PRIORITIES[task.priority] || PRIORITIES.sugerencia;
  const PriorityIcon = priorityConfig.icon;
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className={`mb-3 border-l-4 ${task.status === 'completed' ? 'border-l-green-500 bg-green-50/50' : `border-l-${task.priority === 'urgente' ? 'red' : task.priority === 'importante' ? 'orange' : task.priority === 'necesario' ? 'amber' : 'blue'}-500`}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Header with priority badge */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className={priorityConfig.color}>
                <PriorityIcon className="h-3 w-3 mr-1" />
                {priorityConfig.label}
              </Badge>
              {task.price && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  €{parseFloat(task.price).toFixed(2)}
                </Badge>
              )}
            </div>
            
            {/* Description */}
            <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
              {task.description}
            </p>
            
            {/* Notes */}
            {task.notes && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                {task.notes}
              </p>
            )}
            
            {/* Meta info */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.createdByUsername || 'Sistema'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(task.createdAt)}
              </span>
            </div>
            
            {/* Completion info for completed tasks */}
            {task.status === 'completed' && (
              <div className="mt-2 p-2 bg-green-100/50 rounded-md">
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Completada por {task.completedByUsername || 'Sistema'} el {formatDate(task.completedAt)}
                </p>
                {task.completionNotes && (
                  <p className="text-xs text-green-600 mt-1 italic">
                    "{task.completionNotes}"
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col gap-1">
            {task.status !== 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={() => onComplete(task)}
                title="Marcar como realizado"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            {canModify && task.status !== 'completed' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                  onClick={() => onEdit(task)}
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                  onClick={() => onDelete(task)}
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {/* Delete button for completed tasks - only for admin */}
            {canDelete && task.status === 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                onClick={() => onDelete(task)}
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Tasks() {
  const { user, isAdmin } = useAuth();
  const { language } = useLanguage();
  
  const [tasks, setTasks] = useState({ pending: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Form state for new/edit task
  const [formData, setFormData] = useState({
    description: '',
    price: '',
    priority: 'necesario',
    notes: ''
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        toast.error('Error al cargar las tareas');
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const canModifyTask = (task) => {
    if (isAdmin()) return true;
    return task.createdBy === user?.id;
  };

  const handleCreateTask = async () => {
    if (!formData.description.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: user?.id,
          username: user?.username,
          userRole: user?.role
        })
      });
      
      if (res.ok) {
        toast.success('Tarea creada correctamente');
        setShowNewTaskDialog(false);
        resetForm();
        loadTasks();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al crear la tarea');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleEditTask = async () => {
    if (!formData.description.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: user?.id,
          username: user?.username,
          userRole: user?.role
        })
      });
      
      if (res.ok) {
        toast.success('Tarea actualizada correctamente');
        setShowEditDialog(false);
        setSelectedTask(null);
        resetForm();
        loadTasks();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al actualizar la tarea');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          completionNotes,
          userId: user?.id,
          username: user?.username,
          userRole: user?.role
        })
      });
      
      if (res.ok) {
        toast.success('Tarea marcada como realizada');
        setShowCompleteDialog(false);
        setSelectedTask(null);
        setCompletionNotes('');
        loadTasks();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al completar la tarea');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    
    setSaving(true);
    try {
      const params = new URLSearchParams({
        userId: user?.id || '',
        userRole: user?.role || '',
        userName: user?.username || ''
      });
      
      const res = await fetch(`/api/tasks/${selectedTask.id}?${params}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        toast.success('Tarea eliminada');
        setShowDeleteConfirm(false);
        setSelectedTask(null);
        loadTasks();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al eliminar la tarea');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (task) => {
    setSelectedTask(task);
    setFormData({
      description: task.description || '',
      price: task.price || '',
      priority: task.priority || 'necesario',
      notes: task.notes || ''
    });
    setShowEditDialog(true);
  };

  const openCompleteDialog = (task) => {
    setSelectedTask(task);
    setCompletionNotes('');
    setShowCompleteDialog(true);
  };

  const openDeleteConfirm = (task) => {
    setSelectedTask(task);
    setShowDeleteConfirm(true);
  };

  const resetForm = () => {
    setFormData({
      description: '',
      price: '',
      priority: 'necesario',
      notes: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-orange-600">
            {language === 'es' ? 'Tareas y Notas' : 'Tasks & Notes'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {language === 'es' ? 'Lista compartida de tareas pendientes' : 'Shared to-do list'}
          </p>
        </div>
        <Button onClick={() => setShowNewTaskDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {language === 'es' ? 'Nueva Tarea' : 'New Task'}
        </Button>
      </div>

      {/* Pending Tasks Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            {language === 'es' ? 'Pendientes' : 'Pending'}
            <Badge variant="secondary">{tasks.pending?.length || 0}</Badge>
          </CardTitle>
          <CardDescription>
            {language === 'es' ? 'Ordenadas por prioridad' : 'Ordered by priority'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.pending?.length > 0 ? (
            tasks.pending.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={openCompleteDialog}
                onEdit={openEditDialog}
                onDelete={openDeleteConfirm}
                canModify={canModifyTask(task)}
                canDelete={false}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {language === 'es' ? 'No hay tareas pendientes' : 'No pending tasks'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {language === 'es' ? 'Realizados' : 'Completed'}
            <Badge variant="secondary">{tasks.completed?.length || 0}</Badge>
          </CardTitle>
          <CardDescription>
            {language === 'es' ? 'Últimas tareas completadas' : 'Recently completed tasks'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.completed?.length > 0 ? (
            tasks.completed.slice(0, 10).map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={() => {}}
                onEdit={() => {}}
                onDelete={openDeleteConfirm}
                canModify={false}
                canDelete={isAdmin()}
              />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {language === 'es' ? 'No hay tareas completadas' : 'No completed tasks'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* New Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'es' ? 'Nueva Tarea' : 'New Task'}</DialogTitle>
            <DialogDescription>
              {language === 'es' ? 'Añade una nueva tarea a la lista compartida' : 'Add a new task to the shared list'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">{language === 'es' ? 'Descripción' : 'Description'} *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === 'es' ? 'Describe la tarea...' : 'Describe the task...'}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">{language === 'es' ? 'Prioridad' : 'Priority'} *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">🔴 Urgente</SelectItem>
                    <SelectItem value="importante">🟠 Importante</SelectItem>
                    <SelectItem value="necesario">🟡 Necesario</SelectItem>
                    <SelectItem value="sugerencia">🔵 Sugerencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">{language === 'es' ? 'Precio (€)' : 'Price (€)'}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{language === 'es' ? 'Observaciones' : 'Notes'}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === 'es' ? 'Observaciones adicionales...' : 'Additional notes...'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewTaskDialog(false); resetForm(); }}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button onClick={handleCreateTask} disabled={saving}>
              {saving ? '...' : (language === 'es' ? 'Crear Tarea' : 'Create Task')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'es' ? 'Editar Tarea' : 'Edit Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">{language === 'es' ? 'Descripción' : 'Description'} *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-priority">{language === 'es' ? 'Prioridad' : 'Priority'} *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">🔴 Urgente</SelectItem>
                    <SelectItem value="importante">🟠 Importante</SelectItem>
                    <SelectItem value="necesario">🟡 Necesario</SelectItem>
                    <SelectItem value="sugerencia">🔵 Sugerencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">{language === 'es' ? 'Precio (€)' : 'Price (€)'}</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">{language === 'es' ? 'Observaciones' : 'Notes'}</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedTask(null); resetForm(); }}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button onClick={handleEditTask} disabled={saving}>
              {saving ? '...' : (language === 'es' ? 'Guardar' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Task Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'es' ? 'Marcar como Realizado' : 'Mark as Complete'}</DialogTitle>
            <DialogDescription>
              {selectedTask?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="completion-notes">
                {language === 'es' ? 'Notas de finalización (opcional)' : 'Completion notes (optional)'}
              </Label>
              <Textarea
                id="completion-notes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={language === 'es' ? 'Añade comentarios sobre la tarea completada...' : 'Add comments about the completed task...'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCompleteDialog(false); setSelectedTask(null); setCompletionNotes(''); }}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button onClick={handleCompleteTask} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? '...' : (language === 'es' ? 'Completar' : 'Complete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === 'es' ? 'Eliminar Tarea' : 'Delete Task'}</DialogTitle>
            <DialogDescription>
              {language === 'es' 
                ? '¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.'
                : 'Are you sure you want to delete this task? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-red-50 rounded-md">
            <p className="text-sm font-medium text-red-800">{selectedTask?.description}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setSelectedTask(null); }}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={saving}>
              {saving ? '...' : (language === 'es' ? 'Eliminar' : 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
