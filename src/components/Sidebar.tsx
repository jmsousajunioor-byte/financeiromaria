import { Home, CreditCard, TrendingUp, User, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const Sidebar = () => {
  const { user, signOut } = useAuth();

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: TrendingUp, label: 'Transações', path: '/transactions' },
    { icon: CreditCard, label: 'Cartões & Bancos', path: '/cards' },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform animate-slide-in">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
            <span className="text-xl font-bold text-white">F</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sidebar-foreground">FinanceApp</span>
            <span className="text-xs text-sidebar-foreground/60">Gestão Financeira</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User section */}
        <div className="p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-white font-semibold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.full_name || 'Usuário'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={signOut}
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
