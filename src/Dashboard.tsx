import { Outlet, useOutletContext } from 'react-router';
import { AppSidebar } from './components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar';
import LogoHorizontalCoral from './components/LogoHorizontalCoral.svg?react';
import TutorialElement from './components/Tutorial/Element';
import { isPlayground } from './lib/utils';

const Dashboard = () => {
  const outletContext = useOutletContext();

  return (
    <SidebarProvider style={{ '--sidebar-width': '180px' } as React.CSSProperties}>
      <AppSidebar />
      <main className="overflow-auto flex-1 max-h-screen">
        <div className="w-full h-full flex flex-col">
          <header className="md:hidden flex flex-none h-12 shrink-0 items-center gap-2 border-b bg-sidebar">
            <div className="flex size-full items-center gap-1 px-4">
              <SidebarTrigger className="mr-2 text-primary" />
              <LogoHorizontalCoral className="w-auto h-4 group-data-[collapsible=icon]:hidden" />
            </div>
          </header>
          <div className="flex-1 overflow-scroll">
            <Outlet context={outletContext} />
          </div>
        </div>
      </main>
      {isPlayground && <TutorialElement />}
    </SidebarProvider>
  );
};

export default Dashboard;
