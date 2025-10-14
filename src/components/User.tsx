import React from 'react';
import { ChevronsUpDown, LogOut, UserCog, User as UserIcon } from 'lucide-react';
import { SidebarMenuButton, SidebarMenuItem } from './ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useNavigate } from 'react-router';
import { userEmail } from '@/lib/auth';

const User: React.FC = () => {
  const navigate = useNavigate();

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className="py-1 text-xs min-h-fit data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
            <UserIcon className="size-5! text-primary" />
            <span className="flex-1 truncate">{userEmail()}</span>
            <ChevronsUpDown />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{userEmail()}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => void navigate('/user/settings')}>
            <UserCog className="text-primary" />
            <span>User Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void navigate('/logout')}>
            <LogOut className="text-primary" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export default User;
