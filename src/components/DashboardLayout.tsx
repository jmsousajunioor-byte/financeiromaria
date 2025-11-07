import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
