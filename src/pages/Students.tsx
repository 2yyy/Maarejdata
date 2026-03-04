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
import { Plus, Phone, User, Search, Trash2, Save, Edit2 } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  track: string;
  level: number;
  age: number | null;
  parent_phone: string | null;
  circle_id: string | null;
  study_stage?: string | null;
  circles?: { name: string } | null;
}

interface Circle {
  id: string;
  name: string;
}

export default function Students() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [filterCircle, setFilterCircle] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', track: 'تمهيدي', level: 1, age: '', parent_phone: '', circle_id: '', study_stage: '' });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    // التعديل الجوهري هنا: جلبنا الطلاب والحلقات بشكل منفصل لضمان الظهور
    const [studentsRes, circlesRes] = await Promise.all([
      supabase.from('students').select('*').order('name', { ascending: true }),
      supabase.from('circles').select('*'),
    ]);

    if (studentsRes.error) {
      toast({ title: 'خطأ في جلب الطلاب', description: studentsRes.error.message, variant: 'destructive' });
    }

    if (studentsRes.data && circlesRes.data) {
      const fetchedCircles = circlesRes.data as Circle[];
      setCircles(fetchedCircles);
      
      // ربط الطلاب بالحلقات يدوياً لضمان عدم الاختفاء
      const mappedStudents = (studentsRes.data as any[]).map(student => ({
        ...student,
        circles: fetchedCircles.find(c => c.id === student.circle_id) || null
      }));
      
      setStudents(mappedStudents);
    } else if (studentsRes.data) {
      setStudents(studentsRes.data as Student[]);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = students.filter((s) => {
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
      age: form.age ? parseInt(form.age) : null,
      parent_phone: form.parent_phone || null,
      circle_id: form.circle_id || null,
      study_stage: form.study_stage || null,
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
      setForm({ name: '', track: 'تمهيدي', level: 1, age: '', parent_phone: '', circle_id: '', study_stage: '' });
      fetchData();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف هذا الطالب نهائياً؟")) return;
    
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف الطالب' });
      setSelectedStudent(null);
      fetchData();
    }
  };

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setForm({
      name: student.name,
      track: student.track,
      level: student.level,
      age: student.age?.toString() || '',
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
    else max = 30; // افتراضي للمسارات الجديدة
    return Array.from({ length: max }, (_, i) => i + 1);
  };

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-primary">دليل الطلاب</h1>
        <Button size="sm" onClick={() => { setIsEditing(false); setShowAdd(true); setForm({ name: '', track: 'تمهيدي', level: 1, age: '', parent_phone: '', circle_id: '', study_stage: '' }); }}>
          <Plus className="h-4 w-4 ml-1" /> إضافة طالب
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث عن طالب..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={filterCircle} onValueChange={setFilterCircle}>
          <SelectTrigger className="w-32 text-right"><SelectValue placeholder="الحلقة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحلقات</SelectItem>
            {circles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">لا يوجد طلاب مسجلين حالياً</p>
        ) : (
          filtered.map((student) => (
            <Card key={student.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(student)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-semibold truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.circles?.name || 'بدون حلقة'} | مستوى {student.level}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${trackColor[student.track] || 'bg-gray-100'}`}>
                  {trackLabel[student.track] || student.track}
                </span>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                  <Edit2 className="h-4 w-4" />
                </Button>
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
                <Label>العمر</Label>
                <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="text-right" />
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
              <Select value={form.circle_id} onValueChange={(v) => setForm({ ...form, circle_id: v })}>
                <SelectTrigger dir="rtl" className="text-right"><SelectValue placeholder="اختر حلقة" /></SelectTrigger>
                <SelectContent>
                  {circles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={loading || !form.name}>
              <Save className="h-4 w-4" /> {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
            {isEditing && (
              <Button variant="destructive" size="icon" onClick={() => handleDelete(selectedStudent!.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}