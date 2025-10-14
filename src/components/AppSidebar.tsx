import { Atom, LockKeyhole, SendToBack } from 'lucide-react';
import { generatePath, NavLink, useParams } from 'react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import LogoHorizontalCoral from '@/components/LogoHorizontalCoral.svg?react';
import LogoCoral from '@/components/LogoCoral.svg?react';
import { useContext, useEffect, useState } from 'react';
import { isPlayground } from '@/lib/utils';
import { Button } from './ui/button';
import TutorialCallbacksContext, { ElementRef } from './Tutorial/CallbacksContext';
import TutorialContext from './Tutorial/Context';
import AccountSwitcher from './AccountSwitcher';
import User from './User';

interface MenuItem {
  ref?: ElementRef;
  title: string;
  url: string;
  icon: React.ReactElement;
  hideFromPlayground?: boolean;
  disabledWhenNoAccount?: boolean;
}

const menuItems = (items: MenuItem[], accountId: string | undefined, setOpenMobile: (open: boolean) => void) =>
  items.map((item) => {
    if (item.hideFromPlayground && isPlayground) {
      return null;
    }

    const disabled = item.disabledWhenNoAccount && !accountId;

    const url = disabled ? '#' : generatePath(item.url, { accountId });

    return (
      <SidebarMenuItem key={item.title} ref={item.ref}>
        <SidebarMenuButton
          asChild
          isActive={window.location.pathname.includes(item.url)}
          className={[
            'min-h-fit text-md [&>svg]:size-5 [&>svg]:text-primary',
            disabled ? 'text-muted-foreground pointer-events-none cursor-default' : '',
          ].join(' ')}
          onClick={() => {
            setOpenMobile(false);
          }}
        >
          <NavLink to={url} relative="path">
            {item.icon}
            <span>{item.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  });

export const AppSidebar: React.FC = () => {
  const tutorialContext = useContext(TutorialContext);
  const { elementRef: elementRef } = useContext(TutorialCallbacksContext).refs;
  const tutorialCallbacksContext = useContext(TutorialCallbacksContext);
  const { openMobile, setOpenMobile } = useSidebar();
  const [showResumeTutorialButton, setShowResumeTutorialButton] = useState(openMobile && tutorialContext.closed);
  const { accountId } = useParams();

  useEffect(() => {
    if (tutorialContext.closed) {
      if (openMobile) {
        setTimeout(() => {
          setShowResumeTutorialButton(true);
        }, 700);
      } else {
        setShowResumeTutorialButton(false);
      }
    } else {
      setShowResumeTutorialButton(false);

      if (openMobile && !tutorialContext.currentStep.isInSidebar) {
        setOpenMobile(false);
      }
    }
  }, [openMobile, setOpenMobile, tutorialContext.closed, tutorialContext.currentStep.isInSidebar]);

  const items: MenuItem[] = [
    {
      title: 'Secrets',
      url: '/:accountId/secrets',
      icon: <LockKeyhole />,
      ref: elementRef('secretsSidebarItem'),
      disabledWhenNoAccount: true,
    },
    { title: 'Environments', url: '/:accountId/environments', icon: <SendToBack />, disabledWhenNoAccount: true },
  ];

  const footerItems: MenuItem[] = [
    { title: 'Inventory', url: '/:accountId/inventory', icon: <Atom />, disabledWhenNoAccount: true },
  ];

  return (
    <>
      <Sidebar collapsible="icon" className="border-[hsl(var(--sidebar-border))]">
        <SidebarHeader>
          <div className="hidden md:flex">
            <LogoHorizontalCoral className="w-auto h-10 group-data-[collapsible=icon]:hidden" />
            <LogoCoral className="w-full h-10 hidden group-data-[collapsible=icon]:block" />
          </div>
          <div className="flex md:hidden">
            <LogoHorizontalCoral className="w-auto h-6" />
          </div>
          {!isPlayground && (
            <SidebarMenu>
              <SidebarMenuItem>
                <AccountSwitcher />
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="p-2">
          <SidebarMenu>{menuItems(items, accountId, setOpenMobile)}</SidebarMenu>
          {showResumeTutorialButton && (
            <Button
              className="fixed bottom-10 right-10 z-50"
              onClick={
                tutorialContext.atEnd
                  ? tutorialCallbacksContext.restartTutorial
                  : tutorialCallbacksContext.resumeTutorial
              }
            >
              {tutorialContext.atEnd ? 'Restart Tutorial' : 'Resume Tutorial'}
            </Button>
          )}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {menuItems(footerItems, accountId, setOpenMobile)}
            <User />
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
};
