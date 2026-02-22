'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Calendar,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BackupManager() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [message, setMessage] = useState(null);

  const t = (key) => {
    const translations = {
      title: { es: 'Copias de Seguridad', en: 'Backup Manager' },
      description: { es: 'Gestiona las copias de seguridad de tus datos en Google Drive', en: 'Manage your data backups in Google Drive' },
      createBackup: { es: 'Crear Copia de Seguridad', en: 'Create Backup' },
      restore: { es: 'Restaurar', en: 'Restore' },
      delete: { es: 'Eliminar', en: 'Delete' },
      download: { es: 'Descargar', en: 'Download' },
      date: { es: 'Fecha', en: 'Date' },
      size: { es: 'Tamaño', en: 'Size' },
      actions: { es: 'Acciones', en: 'Actions' },
      noBackups: { es: 'No hay copias de seguridad', en: 'No backups found' },
      creating: { es: 'Creando copia...', en: 'Creating backup...' },
      restoring: { es: 'Restaurando...', en: 'Restoring...' },
      confirmRestore: { es: '¿Restaurar esta copia?', en: 'Restore this backup?' },
      restoreWarning: { es: 'Esta acción reemplazará TODOS los datos actuales con los de la copia de seguridad seleccionada. Esta acción no se puede deshacer.', en: 'This will replace ALL current data with the selected backup. This action cannot be undone.' },
      confirmDelete: { es: '¿Eliminar esta copia?', en: 'Delete this backup?' },
      deleteWarning: { es: 'Esta copia de seguridad se eliminará permanentemente de Google Drive.', en: 'This backup will be permanently deleted from Google Drive.' },
      cancel: { es: 'Cancelar', en: 'Cancel' },
      backupSuccess: { es: 'Copia de seguridad creada correctamente', en: 'Backup created successfully' },
      restoreSuccess: { es: 'Datos restaurados correctamente', en: 'Data restored successfully' },
      deleteSuccess: { es: 'Copia eliminada correctamente', en: 'Backup deleted successfully' },
      error: { es: 'Error', en: 'Error' },
      refresh: { es: 'Actualizar', en: 'Refresh' },
    };
    return translations[key]?.[language] || translations[key]?.['es'] || key;
  };

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backups');
      if (response.ok) {
        const data = await response.json();
        setBackups(data);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      setMessage({ type: 'error', text: t('error') + ': ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: user?.username || 'System' }),
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: t('backupSuccess') });
        fetchBackups();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      setMessage({ type: 'error', text: t('error') + ': ' + error.message });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    
    setRestoring(true);
    setShowRestoreDialog(false);
    setMessage(null);
    
    try {
      const response = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileId: selectedBackup.id,
          userName: user?.username || 'System'
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setMessage({ 
          type: 'success', 
          text: `${t('restoreSuccess')} (${result.restoredSheets?.length || 0} hojas)`
        });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      setMessage({ type: 'error', text: t('error') + ': ' + error.message });
    } finally {
      setRestoring(false);
      setSelectedBackup(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedBackup) return;
    
    setShowDeleteDialog(false);
    
    try {
      const response = await fetch(`/api/backups/${selectedBackup.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: t('deleteSuccess') });
        fetchBackups();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      setMessage({ type: 'error', text: t('error') + ': ' + error.message });
    } finally {
      setSelectedBackup(null);
    }
  };

  const handleDownload = async (backup) => {
    try {
      const response = await fetch(`/api/backups/${backup.id}`);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = backup.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading backup:', error);
      setMessage({ type: 'error', text: t('error') + ': ' + error.message });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const kb = parseInt(bytes) / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const formatBackupDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return format(date, "dd 'de' MMMM yyyy, HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchBackups}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
            <Button 
              onClick={handleCreateBackup}
              disabled={creating || restoring}
              className="bg-green-600 hover:bg-green-700"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('creating')}
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  {t('createBackup')}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Status message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Restoring overlay */}
        {restoring && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-center gap-3 border border-blue-200">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">{t('restoring')}</p>
              <p className="text-sm text-blue-600">Por favor, no cierre esta página</p>
            </div>
          </div>
        )}

        {/* Backups table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>{t('noBackups')}</p>
            <p className="text-sm mt-1">Crea tu primera copia de seguridad</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('size')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups.map((backup, index) => (
                <TableRow key={backup.id}>
                  <TableCell>
                    <Badge variant="outline">{index + 1}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{formatBackupDate(backup.createdTime)}</p>
                        <p className="text-xs text-gray-500">{backup.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatFileSize(backup.size)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(backup)}
                        title={t('download')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowRestoreDialog(true);
                        }}
                        disabled={restoring}
                        title={t('restore')}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowDeleteDialog(true);
                        }}
                        title={t('delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Info box */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="font-medium mb-1">💡 Información:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Las copias se guardan en Google Drive en la carpeta "ATV_Backups"</li>
            <li>Se recomienda crear una copia de seguridad antes de restaurar</li>
            <li>La restauración reemplaza TODOS los datos actuales</li>
          </ul>
        </div>
      </CardContent>

      {/* Restore Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {t('confirmRestore')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t('restoreWarning')}</p>
              {selectedBackup && (
                <p className="font-medium text-gray-700 mt-2">
                  Copia seleccionada: {formatBackupDate(selectedBackup.createdTime)}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {t('restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              {t('confirmDelete')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t('deleteWarning')}</p>
              {selectedBackup && (
                <p className="font-medium text-gray-700 mt-2">
                  Copia seleccionada: {formatBackupDate(selectedBackup.createdTime)}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
