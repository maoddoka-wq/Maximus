import { BarChart3, Box, ChevronRight, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { Button } from '#components/ui/button';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from '#components/ui/sidebar';

export function SidebarDemo() {
  const items: Array<[string, LucideIcon]> = [['Tableau de bord', LayoutDashboard], ['Stocks', Box], ['Rapports', BarChart3]];
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-72 w-full overflow-hidden rounded-lg border">
        <Sidebar collapsible="icon" variant="sidebar">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map(([label, Icon]) => (
                    <SidebarMenuItem key={String(label)}>
                      <SidebarMenuButton tooltip={String(label)}><Icon /><span>{label}</span><ChevronRight className="ml-auto" /></SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <main className="flex flex-1 flex-col gap-4 p-4"><SidebarTrigger /><p className="text-sm text-muted-foreground">Réduisez la barre ou utilisez Ctrl+B / ⌘B.</p><Button variant="outline" onClick={() => undefined}>Action</Button></main>
      </div>
    </SidebarProvider>
  );
}