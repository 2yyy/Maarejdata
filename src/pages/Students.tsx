import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Phone, User, Search, Trash2, Save, Edit2, Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Student {
  id: string;
  name: string;
  track: string;
  level: number;
  age: number | null;
  parent_phone: string | null;
  circle_id: string | null;
  complex_id?: string | null;
  study_stage?: string | null;
  circles?: { name: string } | null;
  complex_name?: string | null;
  birth_date?: string | null; 
  status?: string | null; 
  dismissal_reason?: string | null; 
}

interface Circle {
  id: string;
  name: string;
  complex_id?: string;
}

interface Complex {
  id: string;
  name: string;
}

export default function Students() {
  const { role, activeComplexId } = useAuth(); 
  const { toast } = useToast();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [activeComplexName, setActiveComplexName] = useState('');

  const [filterCircle, setFilterCircle] = useState<string>('all');
  const [filterComplex, setFilterComplex] = useState<string>('all'); 
  const [search, setSearch] = useState('');
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formComplexId, setFormComplexId] = useState<string>(''); 

  const [form, setForm] = useState({ name: '', track: 'تمهيدي', level: 1, age: '', birth_date: '', parent_phone: '', circle_id: '', study_stage: '' });
  const [loading, setLoading] = useState(false);

  const [dismissStudent, setDismissStudent] = useState<Student | null>(null);
  const [dismissReason, setDismissReason] = useState('');

  const fetchData = async () => {
    let studentsQuery = supabase.from('students').select('*').order('name', { ascending: true });
    let circlesQuery = supabase.from('circles').select('*');
    let complexesQuery = supabase.from('complexes').select('*');

    if (activeComplexId) {
      studentsQuery = studentsQuery.eq('complex_id', activeComplexId);
      circlesQuery = circlesQuery.eq('complex_id', activeComplexId);
    }

    const [studentsRes, circlesRes, complexesRes] = await Promise.all([studentsQuery, circlesQuery, complexesQuery]);

    if (studentsRes.error) {
      toast({ title: 'خطأ في جلب الطلاب', description: studentsRes.error.message, variant: 'destructive' });
    }

    if (complexesRes.data) {
      const fetchedComplexes = complexesRes.data as Complex[];
      setComplexes(fetchedComplexes);
      if (activeComplexId) {
        setActiveComplexName(fetchedComplexes.find(c => c.id === activeComplexId)?.name || '');
      }
    }

    if (studentsRes.data && circlesRes.data) {
      const fetchedCircles = circlesRes.data as Circle[];
      const fetchedComplexes = complexesRes.data as Complex[] || [];
      
      setCircles(fetchedCircles);
      
      const mappedStudents = (studentsRes.data as any[]).map(student => ({
        ...student,
        circles: fetchedCircles.find(c => c.id === student.circle_id) || null,
        complex_name: fetchedComplexes.find(c => c.id === student.complex_id)?.name || 'غير محدد'
      }));
      
      setStudents(mappedStudents);
    }
  };

  useEffect(() => { fetchData(); }, [activeComplexId]);

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  };

  const filtered = students.filter((s) => {
    if (s.status === 'مفصول') return false; 
    if (filterComplex !== 'all' && s.complex_id !== filterComplex) return false;
    if (filterCircle !== 'all' && s.circle_id !== filterCircle) return false;
    if (search && !s.name.includes(search)) return false;
    return true;
  });

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      name: form.name,
      track: form.track as any,
      level: form.level,
      age: form.age ? parseInt(form.age.toString()) : null,
      birth_date: form.birth_date || null, 
      parent_phone: form.parent_phone || null,
      circle_id: form.circle_id || null,
      study_stage: form.study_stage || null,
      complex_id: activeComplexId || formComplexId || null, 
    };

    let error;
    if (isEditing && selectedStudent) {
      const res = await supabase.from('students').update(payload).eq('id', selectedStudent.id);
      error = res.error;
    } else {
      const res = await supabase.from('students').insert(payload);
      error = res.error;
    }

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم بنجاح', description: isEditing ? 'تم تحديث بيانات الطالب' : 'تم إضافة الطالب بنجاح' });
      setShowAdd(false);
      setSelectedStudent(null);
      setIsEditing(false);
      setForm({ name: '', track: 'تمهيدي', level: 1, age: '', birth_date: '', parent_phone: '', circle_id: '', study_stage: '' });
      setFormComplexId('');
      fetchData();
    }
    setLoading(false);
  };

  const handleDismiss = async () => {
    if (!dismissStudent) return;
    if (!dismissReason.trim()) {
      toast({ title: 'تنبيه', description: 'الرجاء كتابة سبب الفصل', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('students').update({ 
      status: 'مفصول', 
      dismissal_reason: dismissReason.trim() 
    }).eq('id', dismissStudent.id);

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم فصل الطالب' });
      setDismissStudent(null);
      setDismissReason('');
      setSelectedStudent(null);
      setIsEditing(false);
      fetchData();
    }
    setLoading(false);
  };

  const openEdit = (student: Student) => {
    if (role === 'teacher') return; 
    setSelectedStudent(student);
    setFormComplexId(student.complex_id || '');
    setForm({
      name: student.name,
      track: student.track,
      level: student.level,
      age: student.age?.toString() || '',
      birth_date: student.birth_date || '',
      parent_phone: student.parent_phone || '',
      circle_id: student.circle_id || '',
      study_stage: student.study_stage || ''
    });
    setIsEditing(true);
  };

  const trackLabel: Record<string, string> = { 
    'تمهيدي': 'تمهيدي', 'فضي': 'فضي', 'ذهبي': 'ذهبي', 
    'الماسي': 'الماسي', 'سرد': 'سرد', 'بدون معارج': 'بدون معارج' 
  };
  const trackColor: Record<string, string> = { 
    'تمهيدي': 'bg-muted text-foreground', 'فضي': 'bg-secondary text-secondary-foreground', 'ذهبي': 'bg-accent text-accent-foreground',
    'الماسي': 'bg-blue-100 text-blue-700', 'سرد': 'bg-green-100 text-green-700', 'بدون معارج': 'bg-red-100 text-red-700'
  };

  const getLevelsForTrack = (track: string) => {
    let max = 1;
    if (track === 'ذهبي') max = 26;
    else if (track === 'فضي') max = 19;
    else if (track === 'تمهيدي') max = 10;
    else max = 30; 
    return Array.from({ length: max }, (_, i) => i + 1);
  };

  
  const availableCirclesForForm = circles.filter(c => {
    const targetComplexId = activeComplexId || formComplexId;
    if (!targetComplexId) return false;
    return c.complex_id === targetComplexId;
  });

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(-1)}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold text-primary">
              {activeComplexId && activeComplexName ? `دليل طلاب مجمع ${activeComplexName}` : 'دليل الطلاب الشامل'}
            </h1>
            {!activeComplexId && role === 'admin' && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">كل المجمعات</span>
            )}
          </div>
        </div>
        {role !== 'teacher' && (
          <Button size="sm" onClick={() => { 
            setIsEditing(false); 
            setShowAdd(true); 
            setFormComplexId(activeComplexId || '');
            setForm({ name: '', track: 'تمهيدي', level: 1, age: '', birth_date: '', parent_phone: '', circle_id: '', study_stage: '' }); 
          }}>
            <Plus className="h-4 w-4 ml-1" /> إضافة طالب
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        
        <div className="flex gap-2">
          {!activeComplexId && role === 'admin' && (
            <Select value={filterComplex} onValueChange={(v) => { setFilterComplex(v); setFilterCircle('all'); }}>
              <SelectTrigger className="w-32 text-right"><SelectValue placeholder="المجمع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المجمعات</SelectItem>
                {complexes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Select value={filterCircle} onValueChange={setFilterCircle}>
            <SelectTrigger className="w-32 text-right"><SelectValue placeholder="الحلقة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحلقات</SelectItem>
              {circles
                .filter(c => filterComplex === 'all' || c.complex_id === filterComplex)
                .map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">لا يوجد طلاب مسجلين حالياً</p>
        ) : (
          filtered.map((student) => (
            <Card key={student.id} className={`${role === 'teacher' ? 'cursor-default' : 'cursor-pointer hover:shadow-md'} transition-shadow`} onClick={() => openEdit(student)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{student.name}</p>
                    {!activeComplexId && role === 'admin' && (
                      <span className="hidden sm:inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full border border-indigo-100">
                        <Building2 className="w-3 h-3" /> {student.complex_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {student.circles?.name || 'بدون حلقة'} | مستوى {student.level}
                    {!activeComplexId && role === 'admin' && (
                      <span className="sm:hidden block mt-0.5 text-indigo-600">🏢 {student.complex_name}</span>
                    )}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${trackColor[student.track] || 'bg-gray-100'}`}>
                  {trackLabel[student.track] || student.track}
                </span>
                {role !== 'teacher' && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showAdd || isEditing} onOpenChange={(open) => { if(!open) { setShowAdd(false); setIsEditing(false); } }}>
        <DialogContent className="max-w-[90vw] sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-display text-right border-b pb-2">
              {isEditing ? `تعديل بيانات: ${selectedStudent?.name}` : 'إضافة طالب جديد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            
            {!activeComplexId && !isEditing && (
              <div className="space-y-2">
                <Label className="text-primary font-bold">اختر المجمع أولاً</Label>
                <Select value={formComplexId} onValueChange={(v) => { setFormComplexId(v); setForm({...form, circle_id: ''}); }}>
                  <SelectTrigger dir="rtl" className="text-right border-primary"><SelectValue placeholder="المجمع" /></SelectTrigger>
                  <SelectContent>
                    {complexes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isEditing && !activeComplexId && (
               <div className="text-xs text-right bg-indigo-50 text-indigo-700 p-2 rounded border border-indigo-100 mb-2">
                 المجمع الحالي: <b>{selectedStudent?.complex_name}</b>
               </div>
            )}

            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-center" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المرحلة الدراسية</Label>
                <Select value={form.study_stage} onValueChange={(v) => setForm({ ...form, study_stage: v })}>
                  <SelectTrigger dir="rtl" className="text-right"><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ابتدائي">ابتدائي</SelectItem>
                    <SelectItem value="متوسط">متوسط</SelectItem>
                    <SelectItem value="ثانوي">ثانوي</SelectItem>
                    <SelectItem value="أخر">أخر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>تاريخ الميلاد {form.age && <span className="text-primary font-bold">(العمر: {form.age})</span>}</Label>
                <Input 
                  type="date" 
                  value={form.birth_date} 
                  onChange={(e) => {
                    const dob = e.target.value;
                    setForm({ ...form, birth_date: dob, age: calculateAge(dob).toString() });
                  }} 
                  className="text-right" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المسار</Label>
                <Select value={form.track} onValueChange={(v) => setForm({ ...form, track: v, level: 1 })}>
                  <SelectTrigger dir="rtl" className="text-right"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="تمهيدي">تمهيدي</SelectItem>
                    <SelectItem value="فضي">فضي</SelectItem>
                    <SelectItem value="ذهبي">ذهبي</SelectItem>
                    <SelectItem value="الماسي">الماسي</SelectItem>
                    <SelectItem value="سرد">سرد</SelectItem>
                    <SelectItem value="بدون معارج">بدون معارج</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المستوى الحالي</Label>
                <Select value={form.level.toString()} onValueChange={(v) => setForm({ ...form, level: parseInt(v) })}>
                  <SelectTrigger dir="rtl" className="text-right"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-40 overflow-y-auto">
                    {getLevelsForTrack(form.track).map((num) => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>الحلقة</Label>
              <Select 
                value={form.circle_id} 
                onValueChange={(v) => setForm({ ...form, circle_id: v })}
                disabled={!activeComplexId && !formComplexId}
              >
                <SelectTrigger dir="rtl" className="text-right">
                  <SelectValue placeholder={(!activeComplexId && !formComplexId) ? 'اختر المجمع أولاً' : 'اختر حلقة'} />
                </SelectTrigger>
                <SelectContent>
                  {availableCirclesForForm.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>هاتف ولي الأمر</Label>
              <div className="flex gap-2">
                <Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} dir="ltr" placeholder="05xxxxxxxx" className="text-left" />
                {isEditing && form.parent_phone && (
                   <Button variant="outline" size="icon" asChild>
                     <a href={`tel:${form.parent_phone}`}><Phone className="h-4 w-4" /></a>
                   </Button>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-row-reverse gap-2 border-t pt-4">
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={loading || !form.name || (!activeComplexId && !formComplexId)}>
              <Save className="h-4 w-4" /> {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
            {isEditing && (
              <Button variant="destructive" size="icon" onClick={() => setDismissStudent(selectedStudent)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dismissStudent} onOpenChange={(open) => !open && setDismissStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-right">فصل الطالب: {dismissStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-right">
            <Label className="text-destructive font-bold">يرجى كتابة سبب الفصل:</Label>
            <Input 
              placeholder="مثال: الغياب المتكرر، الانتقال لمدينة أخرى..." 
              value={dismissReason} 
              onChange={e => setDismissReason(e.target.value)} 
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setDismissStudent(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDismiss} disabled={loading || !dismissReason.trim()}>
              تأكيد الفصل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}