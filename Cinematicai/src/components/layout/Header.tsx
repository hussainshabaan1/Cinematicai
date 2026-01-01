import { useState, useEffect } from 'react';
import { Film, LogOut, User, Key, DollarSign, Users, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const checkAdminRole = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
    };

    checkAdminRole();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg cinematic-bg">
              <Film className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">CinematicAI</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link to="/pricing">
              <Button variant="ghost">الباقات والأسعار</Button>
            </Link>
            {user ? (
              <>
                <Link to="/projects">
                  <Button variant="ghost">المشاريع</Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="cinematic-bg text-white">
                          {getInitials(user.username)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/projects')}>
                      <Film className="mr-2 h-4 w-4" />
                      <span>مشاريعي</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/pricing')}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>الباقات والأسعار</span>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin/api-keys')}>
                          <Key className="mr-2 h-4 w-4" />
                          <span>إدارة مفاتيح API</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/plans')}>
                          <DollarSign className="mr-2 h-4 w-4" />
                          <span>إدارة الباقات</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                          <Users className="mr-2 h-4 w-4" />
                          <span>إدارة المستخدمين</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/login">
                <Button variant="outline">تسجيل الدخول</Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
