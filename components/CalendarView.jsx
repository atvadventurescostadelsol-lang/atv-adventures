'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMonthDepartures();
  }, [currentDate]);

  async function loadMonthDepartures() {
    setLoading(true);
    try {
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      // Load all departures for the month
      const res = await fetch(`/api/departures`);
      if (res.ok) {
        const allDepartures = await res.json();
        // Filter by month
        const filtered = allDepartures.filter(d => d.date >= start && d.date <= end);
        setDepartures(filtered);
      }
    } catch (error) {
      console.error('Error loading departures:', error);
    } finally {
      setLoading(false);
    }
  }

  function previousMonth() {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  }

  function nextMonth() {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  }

  function getDayDepartures(date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return departures.filter(d => d.date === dateStr);
  }

  function getDayStats(date) {
    const dayDepartures = getDayDepartures(date);
    const totalGross = dayDepartures.reduce((sum, d) => sum + parseFloat(d.totalGross || 0), 0);
    const quadCount = dayDepartures.filter(d => d.category === 'quad').reduce((sum, d) => sum + parseInt(d.vehiclesCount || 0), 0);
    const buggyCount = dayDepartures.filter(d => d.category === 'buggy').reduce((sum, d) => sum + parseInt(d.vehiclesCount || 0), 0);
    
    return { count: dayDepartures.length, totalGross, quadCount, buggyCount };
  }

  // Get calendar days (including padding)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={previousMonth} variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={() => setCurrentDate(new Date())} variant="outline" size="sm">
                Hoy
              </Button>
              <Button onClick={nextMonth} variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground p-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map(day => {
                const stats = getDayStats(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

                return (
                  <Card
                    key={day.toISOString()}
                    className={`min-h-[100px] p-2 ${
                      !isCurrentMonth ? 'opacity-40' : ''
                    } ${
                      isCurrentDay ? 'ring-2 ring-orange-600' : ''
                    } ${
                      stats.count > 0 ? 'bg-gradient-to-br from-orange-50 to-white' : ''
                    }`}
                  >
                    <CardContent className="p-0 space-y-1">
                      <div className="flex items-start justify-between">
                        <span className={`text-sm font-medium ${
                          isCurrentDay ? 'text-orange-600' : ''
                        }`}>
                          {format(day, 'd')}
                        </span>
                        {stats.count > 0 && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {stats.count}
                          </Badge>
                        )}
                      </div>

                      {stats.count > 0 && (
                        <div className="space-y-1 text-xs">
                          <div className="font-semibold text-orange-600">
                            €{stats.totalGross.toFixed(0)}
                          </div>
                          <div className="flex gap-1 text-muted-foreground">
                            {stats.quadCount > 0 && (
                              <span>Q:{stats.quadCount}</span>
                            )}
                            {stats.buggyCount > 0 && (
                              <span>B:{stats.buggyCount}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
