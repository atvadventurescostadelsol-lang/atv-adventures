'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileJson
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BackupManager() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [backupInfo, setBackupInfo] = useState(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  const t = (key) => {
    const translations = {
      title: { es: 'Copias de Seguridad', en: 'Backup Manager' },
      description: { es: 'Crea y restaura copias de seguridad de tus datos', en: 'Create and restore backups of your data' },
      createBackup: { es: 'Crear y Descargar Backup', en: 'Create & Download Backup' },
      restore: { es: 'Restaurar', en: 'Restore' },
      selectFile: { es: 'Seleccionar archivo de backup', en: 'Select backup file' },
      creating: { es: 'Creando backup...', en: 'Creating backup...' },
      restoring: { es: 'Restaurando...', en: 'Restoring...' },
      confirmRestore: { es: '¿Restaurar esta copia?', en: 'Restore this backup?' },
      restoreWarning: { es: 'Esta acción reemplazará TODOS los datos actuales con los de la copia de seguridad seleccionada. Esta acción no se puede deshacer.', en: 'This will replace ALL current data with the selected backup. This action cannot be undone.' },
      cancel: { es: 'Cancelar', en: 'Cancel' },
      backupSuccess: { es: 'Backup creado y descargado correctamente', en: 'Backup created and downloaded successfully' },
      restoreSuccess: { es: 'Datos restaurados correctamente', en: 'Data restored successfully' },
      error: { es: 'Error', en: 'Error' },
      invalidFile: { es: 'Archivo de backup inválido', en: 'Invalid backup file' },
      fileSelected: { es: 'Archivo seleccionado', en: 'File selected' },
    };
    return translations[key]?.[language] || translations[key]?.['es'] || key;
  };

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
        const backupData = await response.json();
        
        // Generate filename with date
        const now = new Date();
        const dateStr = format(now, 'yyyy-MM-dd_HH-mm');
        const fileName = `ATV_Backup_${dateStr}.json`;
        
        // Download the file
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setMessage({ type: 'success', text: t('backupSuccess') });
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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.sheets || !data.createdAt) {
          throw new Error('Invalid format');
        }
        setSelectedFile(data);
        setBackupInfo({
          name: file.name,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          sheetsCount: Object.keys(data.sheets).length,
          sheets: Object.keys(data.sheets),
        });
        setMessage({ type: 'info', text: `${t('fileSelected')}: ${file.name}` });
      } catch (err) {
        setMessage({ type: 'error', text: t('invalidFile') });
        setSelectedFile(null);
        setBackupInfo(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!selectedFile) return;
    
    setRestoring(true);
    setShowRestoreDialog(false);
    setMessage(null);
    
    try {
      const response = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          backupData: selectedFile,
          userName: user?.username || 'System'
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setMessage({ 
          type: 'success', 
          text: `${t('restoreSuccess')} (${result.restoredSheets?.length || 0} hojas restauradas)`
        });
        setSelectedFile(null);
        setBackupInfo(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      setMessage({ type: 'error', text: t('error') + ': ' + error.message });
    } finally {
      setRestoring(false);
    }
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
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status message */}
        {message && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : message.type === 'info'
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : message.type === 'info' ? (
              <FileJson className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Restoring overlay */}
        {restoring && (
          <div className="p-4 bg-blue-50 rounded-lg flex items-center gap-3 border border-blue-200">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">{t('restoring')}</p>
              <p className="text-sm text-blue-600">Por favor, no cierre esta página</p>
            </div>
          </div>
        )}

        {/* Create Backup Section */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Crear Copia de Seguridad
                </h3>
                <p className="text-sm text-green-600 mt-1">
                  Descarga un archivo JSON con todos tus datos actuales
                </p>
              </div>
              <Button 
                onClick={handleCreateBackup}
                disabled={creating || restoring}
                className="bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  <>
                    <Database className="h-5 w-5 mr-2" />
                    {t('createBackup')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Restore Backup Section */}
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-orange-800 flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Restaurar Copia de Seguridad
                </h3>
                <p className="text-sm text-orange-600 mt-1">
                  Selecciona un archivo de backup para restaurar tus datos
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="hidden"
                  id="backup-file-input"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={restoring}
                  className="flex-1 border-orange-300 hover:bg-orange-100"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  {t('selectFile')}
                </Button>
                
                <Button
                  onClick={() => setShowRestoreDialog(true)}
                  disabled={!selectedFile || restoring}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('restore')}
                </Button>
              </div>

              {/* Selected file info */}
              {backupInfo && (
                <div className="p-4 bg-white rounded-lg border border-orange-200">
                  <h4 className="font-medium mb-2">Información del backup:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Archivo:</span>
                      <span className="ml-2 font-medium">{backupInfo.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Fecha:</span>
                      <span className="ml-2">{formatBackupDate(backupInfo.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Creado por:</span>
                      <span className="ml-2">{backupInfo.createdBy || 'Desconocido'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Hojas:</span>
                      <span className="ml-2">{backupInfo.sheetsCount}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-500 text-sm">Contenido:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {backupInfo.sheets.map(sheet => (
                        <span key={sheet} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {sheet}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info box */}
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="font-medium mb-1">💡 Información importante:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Los backups se descargan como archivos JSON a tu ordenador</li>
            <li><strong>Guarda los archivos en un lugar seguro</strong> (Google Drive, USB, etc.)</li>
            <li>Se recomienda crear una copia de seguridad antes de restaurar</li>
            <li>La restauración reemplaza <strong>TODOS</strong> los datos actuales</li>
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
              {backupInfo && (
                <p className="font-medium text-gray-700 mt-2">
                  Backup seleccionado: {formatBackupDate(backupInfo.createdAt)}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {t('restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
