import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Plus, Info, Clock, Trash2, Settings2, PlusCircle, MinusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AcademicCalendar() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [ranges, setRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWeeks, setTotalWeeks] = useState(19);

  
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const yearsM = ["2024", "2025", "2026", "2027", "2028"]; // ميلادي
  const yearsH = ["1446", "1447", "1448", "1449", "1450"]; // هجري
  const weekDays = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

  const [newEvent, setNewEvent] = useState({ week: '1', day: 'السبت', name: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: evData } = await supabase.from('academic_calendar').select('*').order('week');
    const { data: rangeData } = await supabase.from('semester_ranges').select('*').order('semester_name');
    
    if (evData) {
      setEvents(evData);
      
      const maxWeek = evData.reduce((max, ev) => Math.max(max, ev.week), 19);
      setTotalWeeks(maxWeek);
    }
    
    if (rangeData) {
      const uniqueSemesters = ['1', '2', 'summer'];
      const filtered = uniqueSemesters.map(sem => {
        return rangeData.find(r => r.semester_name === sem) || { 
          semester_name: sem, 
          academic_year: '1447', 
          start_date: '2025-01-01', 
          end_date: '2025-01-01' 
        };
      });
      setRanges(filtered);
    }
    setLoading(false);
  };

  const getDatePart = (dateStr: string, part: 'd' | 'm' | 'y') => {
    if (!dateStr) return "1";
    const parts = dateStr.split('-');
    if (part === 'y') return parts[0];
    if (part === 'm') return parseInt(parts[1]).toString();
    return parseInt(parts[2]).toString();
  };

  const updateRangeState = (id: string, field: string, value: string, datePart?: 'd'|'m'|'y') => {
    setRanges(ranges.map(r => {
      if (r.id === id || (!r.id && r.semester_name === id)) {
        if (datePart) {
          let [y, m, d] = (r[field] || "2025-01-01").split('-');
          if (datePart === 'y') y = value;
          if (datePart === 'm') m = value.padStart(2, '0');
          if (datePart === 'd') d = value.padStart(2, '0');
          return { ...r, [field]: `${y}-${m}-${d}` };
        }
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const handleUpdateRange = async (range: any) => {
    const payload = {
      semester_name: range.semester_name,
      academic_year: range.academic_year,
      start_date: range.start_date,
      end_date: range.end_date
    };

    let error;
    if (range.id) {
      const { error: err } = await supabase.from('semester_ranges').update(payload).eq('id', range.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('semester_ranges').insert(payload);
      error = err;
    }

    if (!error) {
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات النطاق بنجاح" });
      fetchData();
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.name.trim()) return;
    const { error } = await supabase.from('academic_calendar').insert({
      week: parseInt(newEvent.week),
      event_name: `${newEvent.day}: ${newEvent.name}`
    });

    if (!error) {
      toast({ title: "تم", description: "تمت إضافة الحدث بنجاح" });
      setNewEvent({ ...newEvent, name: '' });
      fetchData();
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const { error } = await supabase.from('academic_calendar').delete().eq('id', id);
    if (!error) {
      toast({ title: "تم الحذف", description: "تمت الإزالة بنجاح" });
      fetchData();
    }
  };

  const weeksList = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-16" dir="rtl">
      
      {/* الترويسة - تختلف حسب الصلاحية */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          {role === 'admin' ? <Settings2 className="h-6 w-6 text-primary" /> : <Clock className="h-6 w-6 text-primary" />}
          <h1 className="font-display text-xl font-bold text-slate-800">
            {role === 'admin' ? "إعدادات التقويم الدراسي" : "التقويم الأكاديمي"}
          </h1>
        </div>
      </div>

      {/* نطاقات الفصول - تظهر للمشرف بس */}
      {role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ranges.map((r) => (
            <Card key={r.id || r.semester_name} className="border-none shadow-sm ring-1 ring-slate-200">
              <div className="bg-slate-50/50 border-b px-4 py-2.5">
                <span className="font-bold text-[11px] text-slate-600 uppercase">
                  {r.semester_name === 'summer' ? 'الفصل الصيفي' : `الفصل الدراسي ${r.semester_name}`}
                </span>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">السنة الدراسية (هـ)</Label>
                  <Select value={r.academic_year} onValueChange={(v) => updateRangeState(r.id || r.semester_name, 'academic_year', v)}>
                    <SelectTrigger className="h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>{yearsH.map(y => <SelectItem key={y} value={y}>{y} هـ</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {['start_date', 'end_date'].map((field: any) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-[10px] text-slate-400">{field === 'start_date' ? 'بداية الفصل' : 'نهاية الفصل'}</Label>
                    <div className="flex gap-1">
                      <Select value={getDatePart(r[field], 'd')} onValueChange={(v) => updateRangeState(r.id || r.semester_name, field, v, 'd')}>
                        <SelectTrigger className="h-8 text-[10px] flex-1 px-1"><SelectValue placeholder="يوم" /></SelectTrigger>
                        <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={getDatePart(r[field], 'm')} onValueChange={(v) => updateRangeState(r.id || r.semester_name, field, v, 'm')}>
                        <SelectTrigger className="h-8 text-[10px] flex-1 px-1"><SelectValue placeholder="شهر" /></SelectTrigger>
                        <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={getDatePart(r[field], 'y')} onValueChange={(v) => updateRangeState(r.id || r.semester_name, field, v, 'y')}>
                        <SelectTrigger className="h-8 text-[10px] flex-1 px-1"><SelectValue placeholder="سنة" /></SelectTrigger>
                        <SelectContent>{yearsM.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                <Button variant="secondary" className="w-full h-8 text-[10px] font-bold" onClick={() => handleUpdateRange(r)}>
                  <Save className="h-3 w-3 ml-1" /> حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* لوحة إضافة الأحداث - للمشرف بس */}
      {role === 'admin' && (
        <Card className="bg-primary border-none shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4 text-white">
              <Plus className="h-4 w-4" />
              <h2 className="text-sm font-bold">إضافة حدث أسبوعي</h2>
            </div>
            <div className="flex flex-wrap md:flex-nowrap gap-4 items-end text-white">
              <div className="w-full md:w-24 space-y-1">
                <Label className="text-[10px] opacity-80">الأسبوع</Label>
                <Select value={newEvent.week} onValueChange={(v) => setNewEvent({...newEvent, week: v})}>
                  <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{weeksList.map(w => <SelectItem key={w} value={w.toString()}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-32 space-y-1">
                <Label className="text-[10px] opacity-80">اليوم</Label>
                <Select value={newEvent.day} onValueChange={(v) => setNewEvent({...newEvent, day: v})}>
                  <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{weekDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1 min-w-[200px]">
                <Label className="text-[10px] opacity-80">وصف الحدث</Label>
                <Input value={newEvent.name} onChange={(e) => setNewEvent({...newEvent, name: e.target.value})} placeholder="مثلاً: اختبار الفترات" className="h-9 bg-white/10 border-white/20 placeholder:text-white/40" />
              </div>
              <Button onClick={handleAddEvent} className="h-9 px-8 bg-white text-primary hover:bg-white/90 font-black text-xs">نشر</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* عرض الأحداث للجميع مع إدارة الأسابيع للمشرف */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-600 flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> جدول الأحداث</h2>
          {role === 'admin' && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-primary text-[10px]" onClick={() => setTotalWeeks(totalWeeks + 1)}><PlusCircle className="h-3.5 w-3.5 ml-1" /> أسبوع جديد</Button>
              <Button variant="ghost" size="sm" className="text-red-500 text-[10px]" onClick={() => setTotalWeeks(Math.max(1, totalWeeks - 1))}><MinusCircle className="h-3.5 w-3.5 ml-1" /> حذف أسبوع</Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {weeksList.map(w => {
            const weekEvents = events.filter(e => e.week === w);
            return (
              <div key={w} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="bg-slate-50 text-slate-400 w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px]">{w}</div>
                  <div className="space-y-1.5">
                    {weekEvents.map(ev => (
                      <div key={ev.id} className="bg-slate-50/50 p-2 rounded-lg flex items-center justify-between gap-2 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-700 leading-tight">{ev.event_name}</p>
                        {role === 'admin' && (
                          <button onClick={() => handleDeleteEvent(ev.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /></button>
                        )}
                      </div>
                    ))}
                    {weekEvents.length === 0 && <p className="text-[9px] text-slate-300 italic pt-1">لا توجد أحداث</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}