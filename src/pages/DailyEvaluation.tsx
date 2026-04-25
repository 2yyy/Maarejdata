import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; // تمت الإضافة: جلب الصلاحيات
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { User, CheckCircle2, Trophy, Calendar as CalendarIcon } from 'lucide-react'; 
import { Link } from 'react-router-dom';

const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء'];
const ATTENDANCE_OPTIONS = ['غير محدد', 'حاضر', 'متأخر', 'غائب بعذر', 'غائب'] as const;

interface Student { id: string; name: string; circle_id: string | null; }
interface Circle { id: string; name: string; }
interface EvalData {
  attendance: string;
  uniform_file_score: number;
  mem_rev_score: number; 
  maarij_points: number;
}

export default function DailyEvaluation() {
  const { toast } = useToast();
  const { role, circleId: authCircleId, activeComplexId } = useAuth(); // التعديل: جلب activeComplexId
  const [week, setWeek] = useState('1');
  const [day, setDay] = useState(DAYS[0]);
  const [selectedCircleId, setSelectedCircleId] = useState<string>('all');
  const [dateValue, setDateValue] = useState(new Date().toISOString().split('T')[0]);
  const [dateType, setDateType] = useState<'هجري' | 'ميلادي'>('ميلادي');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [evals, setEvals] = useState<Record<string, EvalData>>({});

  // التعديل: جلب الحلقات التابعة للمجمع النشط فقط
  useEffect(() => {
    let query = supabase.from('circles').select('*');
    if (activeComplexId) {
      query = query.eq('complex_id', activeComplexId);
    }
    query.then(({ data }) => {
      if (data) setCircles(data);
    });
  }, [activeComplexId]);

  useEffect(() => {
    const fetchStudents = async () => {
      const targetCircleId = role === 'teacher' ? authCircleId : selectedCircleId;

      if (role === 'teacher' && !targetCircleId) {
        setStudents([]);
        return;
      }

      let query = supabase.from('students').select('id, name, circle_id').order('name', { ascending: true });
      
      // التعديل: تصفية الطلاب حسب الحلقة أو حسب المجمع (إذا اختار الكل)
      if (targetCircleId !== 'all') {
        query = query.eq('circle_id', targetCircleId);
      } else if (activeComplexId) {
        query = query.eq('complex_id', activeComplexId);
      }

      const { data } = await query;
      if (data) setStudents(data);
    };
    fetchStudents();
  }, [selectedCircleId, authCircleId, role, activeComplexId]); // التحديث عند تغير المجمع

  useEffect(() => {
    if (!students.length) return;
    const fetchEvals = async () => {
      const { data } = await supabase
        .from('daily_evaluations')
        .select('student_id, attendance, uniform_file_score, memorization, revision, maarij_points')
        .eq('week', parseInt(week))
        .eq('day', day)
        .in('student_id', students.map(s => s.id));
      
      const map: Record<string, EvalData> = {};
      data?.forEach((e: any) => {
        map[e.student_id] = {
          attendance: e.attendance,
          uniform_file_score: e.uniform_file_score ?? 0,
          mem_rev_score: Math.max(e.memorization ?? 0, e.revision ?? 0),
          maarij_points: e.maarij_points ?? 0,
        };
      });
      setEvals(map);
    };
    fetchEvals();
  }, [students, week, day]);

  const saveEval = useCallback(async (studentId: string, data: Partial<EvalData>) => {
    const student = students.find(s => s.id === studentId);
    if (!student?.circle_id) return;

    const current = evals[studentId] || {
      attendance: 'غير محدد', uniform_file_score: 0, mem_rev_score: 0, maarij_points: 0,
    };
    
    let merged = { ...current, ...data };
    
    if ('maarij_points' in data) {
      const pts = data.maarij_points ?? 0;
      let newMemScore = 0;
      if (pts >= 19) newMemScore = 5;
      else if (pts >= 17) newMemScore = 4;
      else if (pts === 16) newMemScore = 3;
      else if (pts <= 15) newMemScore = 0;
      
      merged.mem_rev_score = newMemScore;
    }

    const { error } = await supabase.from('daily_evaluations').upsert(
      {
        student_id: studentId,
        circle_id: student.circle_id,
        week: parseInt(week),
        day,
        attendance: merged.attendance as any,
        uniform_file_score: merged.uniform_file_score,
        memorization: merged.mem_rev_score,
        revision: merged.mem_rev_score,
        maarij_points: merged.maarij_points,
      },
      { onConflict: 'student_id,week,day' }
    );

    if (error) {
      toast({ title: 'خطأ في الحفظ', description: error.message, variant: 'destructive' });
    } else {
      setEvals(prev => ({ ...prev, [studentId]: merged }));
    }
  }, [students, week, day, evals, toast]);

  const handleInputChange = (studentId: string, field: keyof EvalData, value: string, max: number) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned === '') {
        setEvals(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: 0 } }));
        return;
    }
    let num = parseInt(cleaned);
    if (num > max) num = max;
    
    setEvals(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: num } }));
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10 px-2" dir="rtl">
      <div className="flex items-center justify-between pt-4">
        <h1 className="font-display text-xl font-bold text-primary flex items-center gap-2 text-right">
          <CheckCircle2 className="h-5 w-5" /> التقييم اليومي
        </h1>
        
        {role === 'admin' && (
          <Link 
            to="/wissam-maher" 
            className="flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1.5 rounded-lg border border-accent/20 hover:bg-accent/20 transition-all shadow-sm"
          >
            <Trophy className="h-4 w-4" />
            <span className="text-[11px] font-bold">وسام ماهر</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Select value={week} onValueChange={setWeek}>
          <SelectTrigger dir="rtl" className="h-9 text-xs"><SelectValue placeholder="الأسبوع" /></SelectTrigger>
          <SelectContent>
            {WEEKS.map(w => <SelectItem key={w} value={String(w)}>الأسبوع {w}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger dir="rtl" className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        
        {role !== 'teacher' && (
          <Select value={selectedCircleId} onValueChange={setSelectedCircleId}>
            <SelectTrigger dir="rtl" className="h-9 text-xs"><SelectValue placeholder="الحلقة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحلقات</SelectItem>
              {circles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        
        <div className="relative flex items-center">
          <Input 
            type={dateType === 'ميلادي' ? 'date' : 'text'} 
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="h-9 text-[11px] pr-8 text-center bg-card shadow-sm"
          />
          <button 
            type="button"
            onClick={() => setDateType(prev => prev === 'هجري' ? 'ميلادي' : 'هجري')}
            className="absolute right-1 px-1.5 py-1 text-[10px] font-bold bg-primary text-white rounded hover:bg-accent transition-colors"
          >
            {dateType}
          </button>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {students.map((student) => {
          const evalData = evals[student.id] || { attendance: 'غير محدد', uniform_file_score: 0, mem_rev_score: 0, maarij_points: 0 };
          return (
            <AccordionItem key={student.id} value={student.id} className="border rounded-lg overflow-hidden bg-card text-right">
              <AccordionTrigger className="px-4 hover:no-underline py-3">
                <div className="flex items-center gap-3 w-full">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm flex-1 text-right">{student.name}</span>
                  <span className={`text-[13px] px-2 py-0.5 rounded-full ${
                    evalData.attendance === 'حاضر' ? 'bg-green-100 text-green-700' :
                    evalData.attendance === 'متأخر' ? 'bg-yellow-100 text-yellow-700' :
                    evalData.attendance === 'غير محدد' ? 'bg-gray-100 text-gray-600' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {evalData.attendance}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 space-y-5 pt-3">
                <div className="max-w-xs mx-auto">
                  <Label className="text-[13px] text-muted-foreground mb-2 block text-center">حالة الحضور والغياب</Label>
                  <Select 
                    value={evalData.attendance} 
                    onValueChange={(v) => saveEval(student.id, { attendance: v })}
                  >
                    <SelectTrigger dir="rtl" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
                  <div className="space-y-2 text-center">
                    <Label className="text-[13px] text-muted-foreground block text-center">الزي والملف (0-3)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={evalData.uniform_file_score || ''}
                      onChange={(e) => handleInputChange(student.id, 'uniform_file_score', e.target.value, 3)}
                      onBlur={() => saveEval(student.id, { uniform_file_score: evalData.uniform_file_score })}
                      className="text-center font-medium focus:ring-primary h-9 w-24 mx-auto"
                    />
                  </div>

                  <div className="space-y-2 text-center">
                    <Label className="text-[13px] font-bold text-primary block text-center">الحفظ والمراجعة (0-5)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      readOnly
                      value={evalData.mem_rev_score}
                      className="text-center font-bold border-primary/40 focus:ring-primary bg-primary/5 shadow-sm h-9 w-24 mx-auto"
                    />
                  </div>

                  <div className="space-y-2 text-center">
                    <Label className="text-[13px] text-muted-foreground block text-center">نقاط المعارج (0-20)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={evalData.maarij_points || ''}
                      onChange={(e) => handleInputChange(student.id, 'maarij_points', e.target.value, 20)}
                      onBlur={() => saveEval(student.id, { maarij_points: evalData.maarij_points })}
                      className="text-center font-medium focus:ring-primary h-9 w-24 mx-auto"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {students.length === 0 && (
        <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed mt-4">
          <p className="text-muted-foreground text-sm italic">لا يوجد طلاب مسجلين في هذه الحلقة حالياً</p>
        </div>
      )}
    </div>
  );
}