import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Trophy, Clock, FileCheck, Info, User, Trash2, Search } from 'lucide-react';
import { calcMaarijReward } from '@/lib/calculations';

export default function MaarijData() {
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    student_id: '',
    exam_percentage: '',
    level_status: 'منضبط',
    date: new Date().toISOString().split('T')[0],
    duration: '',
    points_earned: '',
    points_total: '',
    is_completion: false,
    raw_score: '' // حقل الدرجة المحققة الجديد
  });

  const fetchData = async () => {
    const { data: stData } = await supabase.from('students').select('*');
    const { data: circData } = await supabase.from('circles').select('*');
    const { data: recData } = await supabase.from('maarij_data').select('*').order('date', { ascending: false });

    if (stData) {
      const enrichedStudents = stData.map(s => ({
        ...s,
        circles: circData?.find(c => c.id === s.circle_id)
      }));
      setStudents(enrichedStudents);

      if (recData) {
        const enrichedRecords = recData.map(r => ({
          ...r,
          students: enrichedStudents.find(s => s.id === r.student_id)
        }));
        setRecords(enrichedRecords);
      }
    }
  };

  useEffect(() => { fetchData(); }, []);

  const completedRecords = records.filter(r => r.completed);
  const examRecords = records.filter(r => !r.completed);
  const finishersIds = new Set(completedRecords.map(r => r.student_id));
  const activeStudents = students.filter(s => !finishersIds.has(s.id));

  const handleAdd = async () => {
    if (!form.student_id) return;
    setLoading(true);
    
    const student = students.find(s => s.id === form.student_id);

    const payload: any = {
      student_id: form.student_id,
      date: form.date,
      completed: form.is_completion,
      recorded_level: student?.level,
      recorded_track: student?.track
    };

    if (form.is_completion) {
      payload.completed_at = form.date;
      payload.level_status_detail = form.duration;
    } else {
      const examPct = parseFloat(form.exam_percentage) || 0;
      payload.exam_percentage = examPct;
      payload.rewards = student ? calcMaarijReward(student.track, examPct) : 0;
      payload.level_status = form.level_status; 
      payload.points_earned = parseFloat(form.points_earned) || 0;
      payload.points_total = parseFloat(form.points_total) || 0;
    }

    const { error } = await supabase.from('maarij_data').insert(payload);

    if (error) {
      toast({ title: 'خطأ في قاعدة البيانات', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحفظ بنجاح' });
      setShowAdd(false);
      setForm({ student_id: '', exam_percentage: '', level_status: 'منضبط', date: new Date().toISOString().split('T')[0], duration: '', points_earned: '', points_total: '', is_completion: false, raw_score: '' });
      fetchData();
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    await supabase.from('maarij_data').delete().eq('id', itemToDelete);
    fetchData();
    setItemToDelete(null);
  };

  const getFilteredData = () => {
    let baseData = [];
    if (activeTab === 'all') baseData = students;
    else if (activeTab === 'tested') baseData = examRecords;
    else if (activeTab === 'completed') baseData = completedRecords;
    else if (activeTab === 'active') baseData = activeStudents;

    if (!searchQuery) return baseData;
    return baseData.filter((item: any) => {
      const name = item.students?.name || item.name || '';
      return name.includes(searchQuery);
    });
  };

  return (
    <div className="space-y-4 pb-10" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-primary">بيانات المعارج</h1>
        <Button size="sm" onClick={() => {
          setForm(f => ({ ...f, is_completion: activeTab === 'completed' }));
          setShowAdd(true);
        }}>
          <Plus className="h-4 w-4 ml-1" />
          {activeTab === 'completed' ? 'إضافة ختمة' : 'إضافة اختبار'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card><CardContent className="p-3 text-center">
          <Users className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">{students.length}</p>
          <p className="text-[10px] text-muted-foreground">إجمالي الطلاب</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <FileCheck className="h-4 w-4 mx-auto text-indigo-500 mb-1" />
          <p className="text-lg font-bold">{examRecords.length}</p>
          <p className="text-[10px] text-muted-foreground">الاختبارات</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Trophy className="h-4 w-4 mx-auto text-accent mb-1" />
          <p className="text-lg font-bold">{completedRecords.length}</p>
          <p className="text-[10px] text-muted-foreground">الخاتمين</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Clock className="h-4 w-4 mx-auto text-orange-500 mb-1" />
          <p className="text-lg font-bold">{activeStudents.length}</p>
          <p className="text-[10px] text-muted-foreground">قيد التقدم</p>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث..." className="pr-10 text-right" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full h-auto flex-wrap bg-muted/30">
          <TabsTrigger value="all" className="flex-1 py-2 text-xs">الكل</TabsTrigger>
          <TabsTrigger value="tested" className="flex-1 py-2 text-xs">المختبرين</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 py-2 text-xs">الخاتمين</TabsTrigger>
          <TabsTrigger value="active" className="flex-1 py-2 text-xs">قيد التقدم</TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-2">
          {getFilteredData().map((item: any) => {
            const isStudent = activeTab === 'all' || activeTab === 'active';
            const s = isStudent ? item : item.students;
            const isFinisher = finishersIds.has(s?.id);

            const displayLevel = item.recorded_level || s?.level;
            const displayTrack = item.recorded_track || s?.track;

            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-right">
                      <div className={`p-2 rounded-full ${isFinisher ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                        {isFinisher ? <Trophy className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-bold">{s?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {isFinisher ? <span className="text-green-600 font-bold">خاتم</span> : `مستوى ${displayLevel}`} | {displayTrack}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedStudentInfo(s)}><Info className="h-4 w-4 text-blue-500" /></Button>
                      {!isStudent && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setItemToDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>

                  {activeTab === 'tested' && (
                    <div className="mt-3 bg-muted/50 p-3 rounded-lg relative">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px] text-center mb-6">
                        <div><p className="text-muted-foreground">النسبة</p><b className="text-primary">{item.exam_percentage}%</b></div>
                        <div><p className="text-muted-foreground">المكافأة</p><b className="text-primary">{item.rewards}</b></div>
                        <div><p className="text-muted-foreground">النقاط</p><b className="text-primary">{item.points_earned}/{item.points_total}</b></div>
                        <div><p className="text-muted-foreground">الحالة</p><b className="text-primary">{item.level_status}</b></div>
                      </div>

                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-muted-foreground/10">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.date}
                        </div>
                        <div className="text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {displayTrack} | مستوى {displayLevel}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'completed' && (
                    <div className="flex justify-between text-[10px] mt-2 border-t pt-2">
                      <span>تاريخ الختم: {item.completed_at}</span>
                      <span>المدة: {item.level_status_detail}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Tabs>

      <Dialog open={!!selectedStudentInfo} onOpenChange={() => setSelectedStudentInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center font-bold">معلومات الطالب</DialogTitle>
          </DialogHeader>
          {selectedStudentInfo && (() => {
            const completionData = records.find(r => r.student_id === selectedStudentInfo.id && r.completed);
            const isFinisher = !!completionData;
            
            return (
              <div className="space-y-4 py-2 text-right" dir="rtl">
                <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10">
                  <p className="font-bold text-lg text-primary">{selectedStudentInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedStudentInfo.track}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">الجوال:</span>
                    <b className="text-primary" dir="ltr">{selectedStudentInfo.parent_phone || '-'}</b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">عدد الاختبارات:</span>
                    <b className="text-primary">{examRecords.filter(r => r.student_id === selectedStudentInfo.id).length}</b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">المستوى الحالي:</span>
                    <b className={isFinisher ? "text-green-600 font-bold" : "text-primary"}>
                      {isFinisher ? "خاتم" : selectedStudentInfo.level}
                    </b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">المسار الحالي:</span>
                    <b className="text-primary">{selectedStudentInfo.track}</b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">الحلقة:</span>
                    <b className="text-primary">{selectedStudentInfo.circles?.name || '-'}</b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">العمر:</span>
                    <b className="text-primary">{selectedStudentInfo.age || '-'}</b>
                  </div>
                  
                  {isFinisher && (
                    <>
                      <div className="flex flex-col border-b border-green-100 pb-1 bg-green-50/50 p-1 rounded">
                        <span className="text-green-700 text-xs mb-1 font-semibold">تاريخ الختم:</span>
                        <b className="text-green-600">{completionData.completed_at || completionData.date}</b>
                      </div>
                      <div className="flex flex-col border-b border-green-100 pb-1 bg-green-50/50 p-1 rounded">
                        <span className="text-green-700 text-xs mb-1 font-semibold">مدة الختمة:</span>
                        <b className="text-green-600">{completionData.level_status_detail || 'غير محددة'}</b>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-right">{form.is_completion ? 'إضافة ختمة' : 'إضافة اختبار'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-center"><Label className="block mb-1">اسم الطالب</Label>
              <Select value={form.student_id} onValueChange={(v) => setForm({...form, student_id: v})}>
                <SelectTrigger className="text-right"><SelectValue placeholder="اختر طالب..." /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.is_completion ? (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div><Label className="block mb-1">تاريخ الختم</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div><Label className="block mb-1">المدة</Label><Input placeholder="مثال: 5 أشهر" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} /></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <Label className="block mb-1 font-bold">الدرجة من 95</Label>
                    <Input 
                      type="number" 
                      value={form.raw_score} 
                      onChange={e => {
                        const score = e.target.value;
                        const percentage = score ? ((parseFloat(score) / 95) * 100).toFixed(2) : '';
                        setForm({...form, raw_score: score, exam_percentage: percentage});
                      }} 
                    />
                  </div>
                  <div><Label className="block mb-1">النسبة %</Label><Input type="number" value={form.exam_percentage} readOnly className="bg-muted" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div><Label className="block mb-1">الحالة</Label>
                    <Select value={form.level_status} onValueChange={v => setForm({...form, level_status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="منضبط">منضبط</SelectItem><SelectItem value="متقدم">متقدم</SelectItem><SelectItem value="متأخر">متأخر</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label className="block mb-1">تاريخ الرصد</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t pt-2 text-center">
                  <div><Label className="block mb-1 text-xs font-bold">النقاط المحققة</Label><Input type="number" value={form.points_earned} onChange={e => setForm({...form, points_earned: e.target.value})} /></div>
                  <div><Label className="block mb-1 text-xs font-bold">النقاط الكاملة</Label><Input type="number" value={form.points_total} onChange={e => setForm({...form, points_total: e.target.value})} /></div>
                </div>
              </>
            )}
            <Button className="w-full" onClick={handleAdd} disabled={loading}>{loading ? 'جاري الحفظ...' : 'حفظ البيانات'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-right">تأكيد الحذف</DialogTitle></DialogHeader>
          <div className="text-right text-sm py-4">هل أنت متأكد من حذف هذا السجل؟</div>
          <DialogFooter className="flex gap-2"><Button variant="ghost" onClick={() => setItemToDelete(null)}>إلغاء</Button><Button variant="destructive" onClick={confirmDelete}>حذف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}