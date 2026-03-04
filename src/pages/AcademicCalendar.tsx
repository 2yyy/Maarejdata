import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalIcon } from 'lucide-react';

interface CalendarEvent {
  id: string;
  week: number;
  event_name: string;
  event_date: string | null;
  description: string | null;
}

const TOTAL_WEEKS = 19;

export default function AcademicCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    supabase.from('academic_calendar').select('*').order('week').then(({ data }) => {
      if (data) setEvents(data as CalendarEvent[]);
    });
  }, []);

  const weeks = Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);
  const eventsByWeek: Record<number, CalendarEvent[]> = {};
  events.forEach(e => {
    if (!eventsByWeek[e.week]) eventsByWeek[e.week] = [];
    eventsByWeek[e.week].push(e);
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="font-display text-xl font-bold">التقويم الأكاديمي</h1>

      <div className="space-y-2">
        {weeks.map(w => {
          const weekEvents = eventsByWeek[w] || [];
          return (
            <Card key={w}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg min-w-[40px] text-center">
                    <span className="font-display font-bold text-primary">{w}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">الأسبوع {w}</p>
                    {weekEvents.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {weekEvents.map(ev => (
                          <div key={ev.id} className="flex items-center gap-2">
                            <CalIcon className="h-3 w-3 text-accent" />
                            <span className="text-xs">{ev.event_name}</span>
                            {ev.event_date && <span className="text-xs text-muted-foreground">({ev.event_date})</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">لا توجد أحداث</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
