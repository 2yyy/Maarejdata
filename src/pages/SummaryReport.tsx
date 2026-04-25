import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Users, FileCheck, Trophy, Target, BarChart3, FilterX, Building2, CircleDot, Calendar as CalendarIcon } from 'lucide-react';

export default function SummaryReport() {
  const { role, activeComplexId, circleId } = useAuth();

  
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('1'); 
  const [selectedComplex, setSelectedComplex] = useState<string>(activeComplexId || 'all');
  const [selectedCircle, setSelectedCircle] = useState<string>('all');

  const [complexes, setComplexes] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalStudents: 0, totalExams: 0, totalCompletions: 0, averageScore: 0 });
  const [loading, setLoading] = useState(false);

  
  useEffect(() => {
    const fetchInitialData = async () => {
      
      const { data: rangeYears, error } = await supabase
        .from('semester_ranges')
        .select('academic_year');
      
      if (rangeYears && rangeYears.length > 0) {
        
        const uniqueYears = Array.from(new Set(rangeYears.map(r => r.academic_year)))
          .sort((a, b) => parseInt(b) - parseInt(a));
        
        setAvailableYears(uniqueYears);
        
        
        if (!selectedYear) {
          setSelectedYear(uniqueYears[0]);
        }
      }

      if (role === 'admin') {
        const { data: compData } = await supabase.from('complexes').select('id, name');
        if (compData) setComplexes(compData);
      }
    };
    fetchInitialData();
  }, [role]);

 
  useEffect(() => {
    const fetchCircles = async () => {
      let circQuery = supabase.from('circles').select('id, name, complex_id');
      if (role === 'admin' && selectedComplex !== 'all') {
        circQuery = circQuery.eq('complex_id', selectedComplex);
      } else if (role === 'teacher' && circleId) {
        circQuery = circQuery.eq('id', circleId);
      }
      const { data: circData } = await circQuery;
      if (circData) setCircles(circData);
    };
    fetchCircles();
  }, [role, selectedComplex, circleId]);

  
  const fetchReportData = async () => {
    if (!selectedYear) return;
    setLoading(true);
    
    
    let studentsQuery = supabase.from('students').select('id');
    if (selectedCircle !== 'all') {
      studentsQuery = studentsQuery.eq('circle_id', selectedCircle);
    } else if (selectedComplex !== 'all') {
      studentsQuery = studentsQuery.eq('complex_id', selectedComplex);
    } else if (activeComplexId) {
      studentsQuery = studentsQuery.eq('complex_id', activeComplexId);
    }
    const { data: stData } = await studentsQuery.neq('status', 'مفصول');
    const studentIds = stData ? stData.map(s => s.id) : [];

    if (studentIds.length > 0) {
      
      const { data: rangeData } = await supabase
        .from('semester_ranges')
        .select('start_date, end_date')
        .eq('academic_year', selectedYear)
        .eq('semester_name', selectedSemester)
        .maybeSingle();

      if (rangeData) {
        
        const endDateFull = `${rangeData.end_date}T23:59:59`;


        const { data: mData } = await supabase
          .from('maarij_data')
          .select('*')
          .in('student_id', studentIds)
          .or(`and(academic_year.eq.${selectedYear},semester_name.eq.${selectedSemester}),and(date.gte.${rangeData.start_date},date.lte.${endDateFull})`);
        
        const maarijData = mData || [];
        const exams = maarijData.filter(r => !r.completed);
        const completions = maarijData.filter(r => r.completed);
        const totalScore = exams.reduce((acc, curr) => acc + (curr.exam_percentage || 0), 0);
        const avg = exams.length > 0 ? (totalScore / exams.length).toFixed(1) : 0;

        setStats({
          totalStudents: studentIds.length,
          totalExams: exams.length,
          totalCompletions: completions.length,
          averageScore: Number(avg),
        });
      } else {
        setStats({ totalStudents: studentIds.length, totalExams: 0, totalCompletions: 0, averageScore: 0 });
      }
    } else {
      setStats({ totalStudents: 0, totalExams: 0, totalCompletions: 0, averageScore: 0 });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedYear, selectedSemester, selectedComplex, selectedCircle, activeComplexId]);

  return (
    <div className="space-y-6 animate-fade-in pb-10" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> الملخص الإحصائي
          </h1>
          <p className="text-muted-foreground text-[11px] mt-1 font-bold italic text-primary/70">
            * يتم تحديث السنوات تلقائياً بناءً على إعدادات النطاقات
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {setSelectedCircle('all'); setSelectedSemester('1');}} className="gap-2 border-primary/20 hover:bg-primary/5 h-8 text-xs">
          <FilterX className="h-4 w-4" /> تصفير
        </Button>
      </div>

      <Card className="border-primary/10 shadow-sm bg-primary/5">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="h-3 w-3"/> السنة الدراسية
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="bg-white border-slate-200 h-9 text-xs"><SelectValue placeholder="اختر السنة" /></SelectTrigger>
                <SelectContent>
                  {availableYears.length > 0 ? (
                    availableYears.map(year => (
                      <SelectItem key={year} value={year}>{year} هـ</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>لا توجد سنوات مسجلة</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="h-3 w-3"/> الفصل الدراسي
              </label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="bg-white border-slate-200 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">الفصل الأول</SelectItem>
                  <SelectItem value="2">الفصل الثاني</SelectItem>
                  <SelectItem value="summer">الفصل الصيفي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === 'admin' && !activeComplexId && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3"/> المجمع
                </label>
                <Select value={selectedComplex} onValueChange={(v) => { setSelectedComplex(v); setSelectedCircle('all'); }}>
                  <SelectTrigger className="bg-white border-slate-200 h-9 text-xs"><SelectValue placeholder="كل المجمعات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المجمعات</SelectItem>
                    {complexes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                <CircleDot className="h-3 w-3"/> الحلقة
              </label>
              <Select value={selectedCircle} onValueChange={setSelectedCircle}>
                <SelectTrigger className="bg-white border-slate-200 h-9 text-xs"><SelectValue placeholder="كل الحلقات" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحلقات</SelectItem>
                  {circles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* بطاقات الإحصائيات */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${loading ? 'opacity-50' : ''} transition-opacity`}>
        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 text-center">
            <Users className="h-6 w-6 mx-auto text-blue-600 mb-2" />
            <h3 className="text-2xl font-black text-slate-800">{stats.totalStudents}</h3>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">طلاب نشطون</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 text-center">
            <FileCheck className="h-6 w-6 mx-auto text-indigo-600 mb-2" />
            <h3 className="text-2xl font-black text-slate-800">{stats.totalExams}</h3>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">إجمالي الاختبارات</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 text-center">
            <Trophy className="h-6 w-6 mx-auto text-emerald-600 mb-2" />
            <h3 className="text-2xl font-black text-slate-800">{stats.totalCompletions}</h3>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">عدد الختمات</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5 text-center">
            <Target className="h-6 w-6 mx-auto text-orange-600 mb-2" />
            <h3 className="text-2xl font-black text-slate-800">{stats.averageScore}%</h3>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">متوسط الدرجات</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 text-center">
         <p className="text-[11px] text-slate-500 italic">
           ملاحظة: البيانات تظهر السجلات المرصودة بناءً على النطاق الزمني المختار، أو بناءً على "وسم" الفصل والسنة المرتبط بالسجل.
         </p>
      </div>
    </div>
  );
}