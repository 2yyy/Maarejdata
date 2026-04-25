import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; // التعديل: جلب نطاق المجمع
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trophy, Loader2, Medal } from 'lucide-react';

const COURSES = [1, 2, 3, 4, 5, 6];
const WEEKS = ['1', '2', '3', 'all']; 
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

// مصفوفة الأرقام من 0 إلى 10 للاختيار منها
const SCORE_OPTIONS = Array.from({ length: 11 }, (_, i) => String(i));

const ManualScoreInput = ({ label, colorClass, initialValue, onSave }: any) => {
  const [val, setVal] = useState(String(initialValue || 0));
  
  useEffect(() => { setVal(String(initialValue || 0)); }, [initialValue]);

  const handleChange = (v: string) => {
    setVal(v);
    onSave(parseFloat(v));
  };

  return (
    <div className="space-y-1 flex flex-col items-center justify-center text-center">
      <Label className={`text-[11px] font-bold ${colorClass} block mb-1`}>{label}</Label>
      <Select value={val} onValueChange={handleChange}>
        <SelectTrigger className="h-10 text-sm text-center font-bold focus:ring-1 focus:ring-primary w-20 flex justify-center">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCORE_OPTIONS.map(num => (
            <SelectItem key={num} value={num} className="text-center">{num}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default function DistinguishedCircle() {
  const { role, activeComplexId } = useAuth(); // التعديل: استخراج activeComplexId
  const [course, setCourse] = useState('1');
  const [weekInCourse, setWeekInCourse] = useState('1');
  const [day, setDay] = useState('الأحد');
  const [circles, setCircles] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // التعديل: جلب الحلقات الخاصة بالمجمع النشط فقط
  useEffect(() => {
    let query = supabase.from('circles').select('id, name');
    if (activeComplexId) {
      query = query.eq('complex_id', activeComplexId);
    }
    
    query.then(({ data }) => {
      if (data) setCircles(data);
    });
  }, [activeComplexId]); // إعادة الجلب إذا تغير المجمع النشط

  useEffect(() => {
    if (circles.length) calculateScores();
  }, [circles, course, weekInCourse, day]);

  const calculateScores = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const courseNum = parseInt(course);
      const { data: manualData } = await supabase.from('distinguished_circle_scores').select('*').eq('course', courseNum);
      const manualMap: Record<string, any> = {};
      manualData?.forEach((d: any) => {
        manualMap[d.circle_id] = { diamond: Number(d.diamond_necklace) || 0, bee: Number(d.bee_buzz) || 0, morals: Number(d.morals) || 0 };
      });

      const rows: any[] = [];
      for (const circle of circles) {
        let query = supabase.from('daily_evaluations').select('*').eq('circle_id', circle.id);
        if (weekInCourse === 'all') {
          const startWeek = ((courseNum - 1) * 3) + 1;
          const endWeek = startWeek + 2;
          query = query.gte('week', startWeek).lte('week', endWeek);
        } else {
          const actualWeek = ((courseNum - 1) * 3) + parseInt(weekInCourse);
          query = query.eq('week', actualWeek).eq('day', day);
        }

        const { data: evals } = await query;
        const validEvals = (evals || []).filter(e => (e.attendance as string) !== 'غير محدد');
        const totalValidStudents = validEvals.length;
        const actualMaarijSum = validEvals.reduce((acc, curr) => acc + (Number(curr.maarij_points) || 0), 0);
        const maxAttendancePoints = totalValidStudents * 2;
        const attendanceScore = maxAttendancePoints > 0 ? Math.min(5, (actualMaarijSum / maxAttendancePoints) * 5) : 0;
        const absentCount = validEvals.filter(e => e.attendance === 'غائب').length;
        const absentWithExcuse = validEvals.filter(e => e.attendance === 'غائب بعذر').length;
        
        let absenceScore = 10;
        if (totalValidStudents > 0) {
          const penalty = absentCount + (absentWithExcuse * (10 / totalValidStudents));
          absenceScore = Math.max(0, 10 - penalty);
        } else { absenceScore = 0; }

        const activeEvals = validEvals.filter(e => e.attendance === 'حاضر' || e.attendance === 'متأخر');
        const activeCount = activeEvals.length;
        const g3 = activeEvals.filter(e => Number(e.uniform_file_score) === 3).length;
        const g2 = activeEvals.filter(e => Number(e.uniform_file_score) === 2).length;
        const g1 = activeEvals.filter(e => Number(e.uniform_file_score) === 1).length;
        const uniformScore = activeCount > 0 ? Math.min(5, ((g3 + g2) / activeCount) * 5) : 0;
        const fileScore = activeCount > 0 ? Math.min(5, ((g3 + g1) / activeCount) * 5) : 0;

        const manual = manualMap[circle.id] || { diamond: 0, bee: 0, morals: 0 };
        const totalCombined = attendanceScore + absenceScore + uniformScore + fileScore + (manual.diamond || 0) + (manual.bee || 0) + (manual.morals || 0);

        rows.push({
          circle_id: circle.id, circle_name: circle.name,
          attendance_score: attendanceScore, absence_score: absenceScore,
          uniform_score: uniformScore, file_score: fileScore,
          diamond: manual.diamond || 0, bee: manual.bee || 0, morals: manual.morals || 0,
          total: totalCombined
        });
      }
      setScores(rows.sort((a, b) => b.total - a.total));
    } catch (e) { console.error(e); } finally { if (!silent) setLoading(false); }
  };

  const updateManualScore = async (circleId: string, field: string, val: number) => {
    const fieldMap: Record<string, string> = { diamond: 'diamond_necklace', bee: 'bee_buzz', morals: 'morals' };
    await supabase.from('distinguished_circle_scores').upsert({ 
      circle_id: circleId, course: parseInt(course), [fieldMap[field]]: val 
    }, { onConflict: 'circle_id,course' });
    calculateScores(true);
  };

  return (
    <div className="space-y-4 pb-10 px-2" dir="rtl">
      <div className="flex items-center gap-2 mb-4 pt-4 text-primary">
        <Trophy className="h-6 w-6 text-accent" />
        <h1 className="text-xl font-bold text-right">تميز الحلقات</h1>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-muted/30 p-2 rounded-lg border">
        <Select value={course} onValueChange={setCourse}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{COURSES.map(c => <SelectItem key={c} value={String(c)}>الدورة {c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={weekInCourse} onValueChange={setWeekInCourse}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="الأسبوع" /></SelectTrigger>
          <SelectContent>
            {WEEKS.map(w => <SelectItem key={w} value={w}>{w === 'all' ? 'الكل' : `أسبوع ${w}`}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={day} onValueChange={setDay} disabled={weekInCourse === 'all'}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {scores.map((row, idx) => (
            <Card key={row.circle_id} className={`${idx === 0 ? 'border-accent border-2 bg-accent/5' : 'border-muted'} transition-all`}>
              {weekInCourse === 'all' ? (
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${idx === 0 ? 'bg-yellow-100' : 'bg-slate-100'}`}>
                       <Medal className={`h-6 w-6 ${idx === 0 ? 'text-yellow-600' : 'text-slate-500'}`} />
                    </div>
                    <span className="text-lg font-bold text-slate-800">{row.circle_name}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground font-bold">المجموع الكلي</p>
                    <span className="text-2xl font-black text-primary">{(row.total || 0).toFixed(2)}</span>
                  </div>
                </CardContent>
              ) : (
                <>
                  <CardHeader className="p-4 pb-2 flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold">{row.circle_name}</CardTitle>
                    <div className="text-right">
                       <p className="text-[12px] text-muted-foreground font-medium">المجموع</p>
                       <b className="text-lg text-primary">{(row.total || 0).toFixed(2)}</b>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div className="bg-blue-50 border border-blue-100 p-2 rounded">
                        <p className="text-[13px] text-blue-600 font-bold mb-1">الحضور (5)</p>
                        <b className="text-xs">{(row.attendance_score || 0).toFixed(2)}</b>
                      </div>
                      <div className="bg-red-50 border border-red-100 p-2 rounded">
                        <p className="text-[13px] text-red-600 font-bold mb-1">الغياب (10)</p>
                        <b className="text-xs">{(row.absence_score || 0).toFixed(2)}</b>
                      </div>
                      <div className="bg-green-50 border border-green-100 p-2 rounded">
                        <p className="text-[13px] text-green-600 font-bold mb-1">الزي (5)</p>
                        <b className="text-xs">{(row.uniform_score || 0).toFixed(2)}</b>
                      </div>
                      <div className="bg-purple-50 border border-purple-100 p-2 rounded">
                        <p className="text-[13px] text-purple-600 font-bold mb-1">الملف (5)</p>
                        <b className="text-xs">{(row.file_score || 0).toFixed(2)}</b>
                      </div>
                    </div>
                    {role === 'admin' && (
                      <div className="flex justify-center gap-6 pt-2 border-t border-dashed mt-2">
                        <ManualScoreInput label="عقد الألماس (10)" colorClass="text-blue-500" initialValue={row.diamond} onSave={(val: number) => updateManualScore(row.circle_id, 'diamond', val)} />
                        <ManualScoreInput label="دوي النحل (10)" colorClass="text-orange-500" initialValue={row.bee} onSave={(val: number) => updateManualScore(row.circle_id, 'bee', val)} />
                        <ManualScoreInput label="الأخلاق (10)" colorClass="text-red-500" initialValue={row.morals} onSave={(val: number) => updateManualScore(row.circle_id, 'morals', val)} />
                      </div>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}