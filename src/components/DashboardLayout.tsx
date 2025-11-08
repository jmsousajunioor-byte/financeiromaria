import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 w-full px-4 pt-20 pb-8 sm:px-6 lg:ml-64 lg:px-8 lg:py-8 lg:pt-8">
        <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 py-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <Sidebar isFloating={false} onNavigate={() => setIsMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">FinanceApp</p>
            <p className="text-base font-semibold">Menu</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-5xl lg:max-w-none lg:px-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
