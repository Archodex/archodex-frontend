import React, { useContext } from 'react';
import { ChevronsUpDown, LogOut, NotebookPen, UserCog, User as UserIcon } from 'lucide-react';
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
import posthog from 'posthog-js';
import SurveyContext from './Survey/Context';
import SurveyName from './Survey/SurveyName';
import { isPlayground } from '@/lib/utils';

const User: React.FC = () => {
  const { openSurvey } = useContext(SurveyContext);
  const navigate = useNavigate();

  return (
    <SidebarMenuItem>
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) {
            posthog.capture('user_menu_opened');
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className="py-1 text-xs min-h-fit data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
            <UserIcon className="size-5! text-primary" />
            <span className="flex-1 truncate">{userEmail()}</span>
            <ChevronsUpDown />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{userEmail()}</DropdownMenuLabel>
          <DropdownMenuItem className="cursor-pointer" onClick={() => void navigate('/user/settings')}>
            <UserCog className="text-primary" />
            <span>User Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              openSurvey(isPlayground ? SurveyName.PlaygroundFeedback : SurveyName.AppFeedback);
            }}
          >
            <NotebookPen className="text-primary" />
            <span>Give Us Feedback</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={() => void navigate('/logout')}>
            <LogOut className="text-primary" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export default User;
