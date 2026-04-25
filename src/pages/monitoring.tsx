import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; 
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BookOpen, Save, Loader2, Calendar, Filter, User, BarChart3, Clock, ChevronDown, ChevronUp, CheckCircle2, Trophy, Search, Home } from 'lucide-react';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

export default function MonitoringPage() {
  const navigate = useNavigate();
  const { role, circleId: authCircleId, activeComplexId } = useAuth(); 
  const [circles, setCircles] = useState<any[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string>('all');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [entry, setEntry] = useState<Record<string, { hifz: string, review: string }>>({});
  
  
  const [searchQuery, setSearchQuery] = useState('');

  const getLocalToday = () => {
    const now = new Date();
    const offset = 3 * 60 * 60 * 1000;
    const localDate = new Date(now.getTime() + offset);
    return localDate.toISOString().split('T')[0];
  };

  
  useEffect(() => {
    const fetchCircles = async () => {
      let query = supabase.from('circles').select('*');
      if (activeComplexId) {
        query = query.eq('complex_id', activeComplexId);
      }
      const { data } = await query;
      if (data) setCircles(data);
    };
    fetchCircles();
  }, [activeComplexId]);

  
  useEffect(() => {
    const targetCircleId = role === 'teacher' ? authCircleId : selectedCircle;
    fetchStudentsProgress(targetCircleId);
  }, [role, authCircleId, selectedCircle, startDate, endDate, activeComplexId]);

  const fetchStudentsProgress = async (targetCircleId: string | null) => {
    if (role === 'teacher' && !targetCircleId) {
      setStudents([]);
      return;
    }

    setLoading(true);
    try {
      
      let studentQuery = (supabase.from('students' as any) as any).select('id, name, circle_id');
      
      if (targetCircleId && targetCircleId !== 'all') {
        studentQuery = studentQuery.eq('circle_id', targetCircleId);
      } else if (activeComplexId) {
        
        studentQuery = studentQuery.eq('complex_id', activeComplexId);
      }
      
      const { data: studentsData } = await studentQuery;

      
      let progressData: any[] = [];
      if (studentsData && studentsData.length > 0) {
        const studentIds = studentsData.map((s: any) => s.id);
        let progressQuery = (supabase.from('student_progress' as any) as any).select('*').in('student_id', studentIds);
        
        if (startDate) progressQuery = progressQuery.gte('record_date', startDate);
        if (endDate) progressQuery = progressQuery.lte('record_date', endDate);

        const { data } = await progressQuery;
        progressData = data || [];
      }

      if (studentsData) {
        const formatted = studentsData.map((student: any) => {
          const history = progressData.filter((p: any) => p.student_id === student.id);
          return {
            ...student,
            totalHifz: history.reduce((acc: number, curr: any) => acc + (Number(curr.hifz_pages) || 0), 0),
            totalReview: history.reduce((acc: number, curr: any) => acc + (Number(curr.review_pages) || 0), 0),
          };
        });
        
        
        setStudents(formatted.sort((a, b) => a.name.localeCompare(b.name, 'ar')));
      }
    } catch (error) {
      toast.error("خطأ في تحديث البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgress = async (studentId: string, studentCircleId: string) => {
    const data = entry[studentId];
    if (!data?.hifz && !data?.review) return toast.error("يرجى إدخال البيانات");

    setSavingId(studentId);
    try {
      const { error } = await (supabase.from('student_progress' as any) as any).insert({
        student_id: studentId,
        circle_id: studentCircleId,
        hifz_pages: parseInt(data.hifz || '0'),
        review_pages: parseInt(data.review || '0'),
        record_date: getLocalToday() 
      });

      if (error) throw error;
      toast.success("تم الحفظ بنجاح");
      setEntry(prev => ({ ...prev, [studentId]: { hifz: '', review: '' } }));
      setExpandedStudent(null);
      
      const targetCircleId = role === 'teacher' ? authCircleId : selectedCircle;
      fetchStudentsProgress(targetCircleId);
    } catch (err) {
      toast.error("تعذر الحفظ");
    } finally {
      setSavingId(null);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8" dir="rtl">
      
      {/* الترويسة وأدوات التحكم */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/Dashboard')} 
            className="rounded-xl text-slate-400 hover:text-primary"
          >
            <Home className="h-6 w-6" />
          </Button>
          <div className="p-3.5 bg-primary/10 rounded-[1.25rem] text-primary shadow-sm">
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">لوحة الإحصائيات</h1>
            <p className="text-sm font-bold text-slate-400 mt-0.5">متابعة دقيقة لمسيرة الحفظ والمراجعة</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            {role !== 'teacher' && (
              <Select value={selectedCircle} onValueChange={(val) => setSelectedCircle(val)}>
                  <SelectTrigger className="w-full md:w-56 h-12 rounded-2xl border-slate-200 bg-white shadow-sm font-bold">
                      <SelectValue placeholder="اختر النطاق" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                      <SelectItem value="all" className="font-bold">جميع الحلقات</SelectItem>
                      {circles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
              </Select>
            )}
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setShowFilters(!showFilters)}
                className={`h-12 w-12 rounded-2xl transition-all ${showFilters ? 'bg-primary text-white' : 'text-slate-400'}`}
            >
                <Filter className="h-5 w-5" />
            </Button>
        </div>
      </header>

      {showFilters && (
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white animate-in slide-in-from-top-4">
          <CardContent className="p-6 grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-400 mr-2 uppercase">من تاريخ</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-400 mr-2 uppercase">إلى تاريخ</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-none px-4 font-bold" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* إجمالي الحلقة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative group overflow-hidden bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center gap-6">
            <div className="h-14 w-14 bg-blue-50 rounded-3xl flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                <BookOpen className="h-7 w-7" />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">إجمالي الحفظ</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-800">{students.reduce((acc, s) => acc + s.totalHifz, 0)}</span>
                    <span className="text-sm font-bold text-primary italic">صفحة</span>
                </div>
            </div>
        </div>
        
        <div className="relative group overflow-hidden bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm flex items-center gap-6">
            <div className="h-14 w-14 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-600 transition-transform group-hover:scale-110">
                <Clock className="h-7 w-7" />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">إجمالي المراجعة</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-800">{students.reduce((acc, s) => acc + s.totalReview, 0)}</span>
                    <span className="text-sm font-bold text-orange-600 italic">صفحة</span>
                </div>
            </div>
        </div>
      </div>

      {/* قائمة الطلاب */}
      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            <p className="text-slate-400 font-bold animate-pulse">جاري تحديث الموازين...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mr-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">قائمة الطلاب </span>
            </div>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="بحث عن طالب..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pr-9 rounded-xl bg-slate-50 border-none text-xs font-bold shadow-inner"
              />
            </div>
          </div>
          
          {filteredStudents.map((student) => {
            const isExpanded = expandedStudent === student.id;
            return (
              <div 
                key={student.id} 
                className={`group bg-white border rounded-[2rem] transition-all duration-500 overflow-hidden ${isExpanded ? 'border-primary shadow-2xl shadow-primary/5' : 'border-slate-50 shadow-sm hover:border-slate-200'}`}
              >
                <div 
                  className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-primary/[0.03]' : ''}`}
                  onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                >
                  <div className="flex items-center gap-5">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black transition-all ${isExpanded ? 'bg-primary text-white rotate-12' : 'bg-slate-50 text-slate-300'}`}>
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-base">{student.name}</h3>
                      <div className="flex gap-4 mt-1">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                            <span className="text-[13px] font-bold text-slate-500">حفظ: <b className="text-primary">{student.totalHifz}</b></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400/40" />
                            <span className="text-[13px] font-bold text-slate-500">مراجعة: <b className="text-orange-600">{student.totalReview}</b></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-300'}`}>
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 pt-2 bg-primary/[0.03] animate-in slide-in-from-top-4 duration-500">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label className="text-[12px] font-black text-primary uppercase mr-2">إنجاز الحفظ اليوم</Label>
                        <Input 
                          placeholder="0" type="number"
                          className="h-14 rounded-[1.25rem] bg-white border-primary/10 text-center font-black text-xl shadow-inner focus:ring-primary transition-all"
                          autoFocus
                          value={entry[student.id]?.hifz || ''}
                          onChange={(e) => setEntry(prev => ({ ...prev, [student.id]: { ...prev[student.id], hifz: e.target.value } }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[12px] font-black text-orange-600 uppercase mr-2">مراجعة اليوم</Label>
                        <Input 
                          placeholder="0" type="number"
                          className="h-14 rounded-[1.25rem] bg-white border-orange-100 text-center font-black text-xl shadow-inner focus:ring-orange-500 transition-all"
                          value={entry[student.id]?.review || ''}
                          onChange={(e) => setEntry(prev => ({ ...prev, [student.id]: { ...prev[student.id], review: e.target.value } }))}
                        />
                      </div>
                    </div>
                    <Button 
                      className="w-full h-14 rounded-[1.25rem] font-black text-base gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-[1.01]"
                      onClick={() => handleSaveProgress(student.id, student.circle_id)}
                      disabled={savingId === student.id}
                    >
                      {savingId === student.id ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
                      {savingId === student.id ? 'جاري تثبيت البيانات...' : 'اعتماد الرصد اليومي'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}