import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BookOpen } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    } else if (isSignUp) {
      toast({
        title: 'تم التسجيل',
        description: 'يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب',
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">نظام المعارج</CardTitle>
          <p className="text-muted-foreground text-sm">
            إدارة حلقات تحفيظ القرآن الكريم
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-right"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-right"
                dir="ltr"
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
            </Button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? 'لديك حساب؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
