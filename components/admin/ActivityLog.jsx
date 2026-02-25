'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, Clock, User, FileText, PlusCircle, MinusCircle, Edit, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ActivityLog() {
  const [sessions, setSessions] = useState([]);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/activity-log');
      const data = await res.json();
      setSessions(data.sessions || []);
      setNewCount(data.newCount || 0);
    } catch (error) {
      console.error('Error fetching activity:', error);
      toast.error('Error al cargar actividad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const markAsRead = async () => {
    try {
      setMarking(true);
      await fetch('/api/activity-log/mark-read');
      await fetchActivity();
      toast.success('Marcado como leído');
    } catch (error) {
      toast.error('Error');
    } finally {
      setMarking(false);
    }
  };

  // Parse action string into readable format
  const parseAction = (actionStr) => {
    if (!actionStr) return [];
    return actionStr.split('|').map((action, idx) => {
      let icon = <Eye className="h-3 w-3" />;
      let color = 'text-gray-600';
      let text = action;
      
      if (action.startsWith('LOGIN')) {
        icon = <User className="h-3 w-3" />;
        color = 'text-blue-600';
        text = 'Inició sesión';
      } else if (action.startsWith('+GASTO')) {
        icon = <MinusCircle className="h-3 w-3" />;
        color = 'text-red-600';
        text = `Creó gasto: ${action.replace('+GASTO:', '')}`;
      } else if (action.startsWith('+INGRESO')) {
        icon = <PlusCircle className="h-3 w-3" />;
        color = 'text-green-600';
        text = `Creó ingreso: ${action.replace('+INGRESO:', '')}`;
      } else if (action.startsWith('+TOUR')) {
        icon = <PlusCircle className="h-3 w-3" />;
        color = 'text-orange-600';
        text = `Creó tour: ${action.replace('+TOUR:', '')}`;
      } else if (action.startsWith('~TOUR')) {
        icon = <Edit className="h-3 w-3" />;
        color = 'text-purple-600';
        text = `Modificó tour: ${action.replace('~TOUR:', '')}`;
      } else if (action.startsWith('-GASTO')) {
        icon = <MinusCircle className="h-3 w-3" />;
        color = 'text-red-800';
        text = `Eliminó gasto: ${action.replace('-GASTO:', '')}`;
      } else if (action.startsWith('-INGRESO')) {
        icon = <MinusCircle className="h-3 w-3" />;
        color = 'text-green-800';
        text = `Eliminó ingreso: ${action.replace('-INGRESO:', '')}`;
      } else if (action.startsWith('INFORME')) {
        icon = <FileText className="h-3 w-3" />;
        color = 'text-indigo-600';
        text = `Generó informe: ${action.replace('INFORME:', '')}`;
      } else if (action.startsWith('VER_DASH')) {
        icon = <Eye className="h-3 w-3" />;
        color = 'text-gray-500';
        text = `Vio dashboard: ${action.replace('VER_DASH:', '')}`;
      } else if (action.startsWith('VER_CAL')) {
        icon = <Eye className="h-3 w-3" />;
        color = 'text-gray-500';
        text = `Vio calendario`;
      }
      
      return { icon, color, text, key: idx };
    });
  };

  // Get role badge
  const getRoleBadge = (role) => {
    switch (role) {
      case 'readonly':
        return <Badge className="bg-purple-600">Solo Lectura</Badge>;
      case 'quad':
        return <Badge className="bg-blue-600">Quad</Badge>;
      case 'buggy':
        return <Badge className="bg-green-600">Buggy</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Calculate session duration
  const getSessionDuration = (login, lastActivity) => {
    const start = new Date(login);
    const end = new Date(lastActivity);
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'menos de 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  };

  // Check if action contains important changes
  const hasImportantChanges = (actions) => {
    if (!actions) return false;
    return actions.includes('+GASTO') || 
           actions.includes('+INGRESO') || 
           actions.includes('+TOUR') || 
           actions.includes('~TOUR') ||
           actions.includes('-GASTO') ||
           actions.includes('-INGRESO');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-orange-500" />
          <CardTitle>Actividad de Usuarios</CardTitle>
          {newCount > 0 && (
            <Badge className="bg-red-600 animate-pulse">
              {newCount} nueva{newCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchActivity} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {newCount > 0 && (
            <Button variant="default" size="sm" onClick={markAsRead} disabled={marking}>
              <Check className="h-4 w-4 mr-1" />
              Marcar leídas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay actividad registrada
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {sessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`p-4 rounded-lg border-2 ${
                    session.isNew 
                      ? hasImportantChanges(session.actions)
                        ? 'border-red-300 bg-red-50'
                        : 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-bold">{session.username}</span>
                      {getRoleBadge(session.role)}
                      {session.isNew && (
                        <Badge variant="destructive" className="text-xs">NUEVA</Badge>
                      )}
                      {hasImportantChanges(session.actions) && (
                        <Badge className="bg-red-600 text-xs">⚠️ CAMBIOS</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(session.loginTime), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  
                  {/* Time info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(session.loginTime), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                    <span>→</span>
                    <span>{format(new Date(session.lastActivity), 'HH:mm')}</span>
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                      {getSessionDuration(session.loginTime, session.lastActivity)}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="space-y-1 mt-2 pl-2 border-l-2 border-gray-300">
                    {parseAction(session.actions).map((action) => (
                      <div key={action.key} className={`flex items-center gap-2 text-sm ${action.color}`}>
                        {action.icon}
                        <span>{action.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Se muestran los últimos 15 días de actividad. No incluye actividad del administrador.
        </div>
      </CardContent>
    </Card>
  );
}
