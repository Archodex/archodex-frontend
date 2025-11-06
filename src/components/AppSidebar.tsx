import { useState } from 'react';
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
import { isPlayground } from '@/lib/utils';
import { Button } from './ui/button';
import { ElementRef } from './Tutorial/CallbacksContext';
import AccountSwitcher from './AccountSwitcher';
import User from './User';
import { redirectToAuth } from '@/lib/auth';
import posthog from 'posthog-js';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

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
    const [tooltipOpen, setTooltipOpen] = useState(false);

    if (item.hideFromPlayground && isPlayground) {
      return null;
    }

    const disabled = item.disabledWhenNoAccount && !accountId;

    const url = disabled ? '#' : generatePath(item.url, { accountId });

    return (
      <SidebarMenuItem key={item.title} ref={item.ref}>
        <Tooltip open={tooltipOpen}>
          <TooltipTrigger asChild>
            <SidebarMenuButton
              asChild
              isActive={window.location.pathname.startsWith(url)}
              className={[
                'min-h-fit text-md [&>svg]:size-5 [&>svg]:text-primary',
                disabled ? 'text-muted-foreground! cursor-default' : '',
              ].join(' ')}
              onClick={() => {
                if (disabled) {
                  setTooltipOpen(true);
                  setTimeout(() => {
                    setTooltipOpen(false);
                  }, 2000);
                  return;
                }

                setOpenMobile(false);
                posthog.capture('sidebar_item_clicked', { item: item.title });
              }}
            >
              <NavLink to={url} relative="path">
                {item.icon}
                <span>{item.title}</span>
              </NavLink>
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent>Select an Account First</TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  });

export const AppSidebar: React.FC = () => {
  const { setOpenMobile } = useSidebar();
  const { accountId } = useParams();

  const items: MenuItem[] = [
    { title: 'Secrets', url: '/:accountId/secrets', icon: <LockKeyhole />, disabledWhenNoAccount: true },
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
          <div className="flex justify-center md:hidden">
            <LogoHorizontalCoral className="w-auto h-6" />
          </div>
          {!isPlayground && (
            <SidebarMenu>
              <SidebarMenuItem>
                <AccountSwitcher />
              </SidebarMenuItem>
            </SidebarMenu>
          )}
          {isPlayground && (
            <Button
              onClick={() => {
                posthog.capture('sidebar_get_started_clicked');
                redirectToAuth({ signup: true, newTab: true });
              }}
            >
              Get Started
            </Button>
          )}
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="p-2">
          <SidebarMenu>{menuItems(items, accountId, setOpenMobile)}</SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {menuItems(footerItems, accountId, setOpenMobile)}
            <User
              onClick={() => {
                setOpenMobile(false);
              }}
            />
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
};
