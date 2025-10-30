import React, { useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { SidebarMenuButton } from './ui/sidebar';
import { Check, ChevronsUpDown, GalleryVerticalEnd, Plus, Settings } from 'lucide-react';
import { useNavigate, useParams, useRouteLoaderData } from 'react-router';
import { AccountsLoaderData } from '@/lib/accountsLoader';
import posthog from 'posthog-js';

const AccountSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();

  const accountsLoaderData = useRouteLoaderData<AccountsLoaderData>('accounts');
  if (!accountsLoaderData) {
    throw new Error('Missing accounts loader data');
  }

  const { accountId: currentAccountId } = params;

  const switchAccount = useCallback(
    (accountId: string) => {
      if (!currentAccountId) {
        void navigate(`/${accountId}`);
        return;
      }

      // React Router v7 doesn't provide a way to get the route pattern, so we have to use regex search and replace
      const newPath = location.pathname.replace(`/${currentAccountId}`, `/${accountId}`);

      void navigate(newPath);
    },
    [currentAccountId, navigate],
  );

  const { accounts } = accountsLoaderData;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          posthog.capture('account_switcher_opened');
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          className={`py-1 text-xs min-h-fit data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground`}
        >
          <GalleryVerticalEnd className="size-5! text-primary" />
          <span className="flex-1 truncate">{currentAccountId ?? 'Accounts'}</span>
          <ChevronsUpDown />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Accounts</DropdownMenuLabel>
        <DropdownMenuGroup>
          {Object.keys(accounts).map((accountId) => (
            <DropdownMenuItem
              key={accountId}
              className="justify-between cursor-pointer"
              onClick={() => {
                switchAccount(accountId);
              }}
            >
              <span className="shrink truncate">{accountId}</span>
              {accountId === currentAccountId && <Check className="text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            if (!currentAccountId) {
              throw new Error('No current account to navigate to settings for?');
            }

            void navigate(`/${currentAccountId}/settings`);
          }}
          disabled={!currentAccountId}
        >
          <Settings className="text-primary" />
          Account Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => {
            void navigate('/create_account');
          }}
        >
          <Plus className="text-primary" />
          New Account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountSwitcher;
