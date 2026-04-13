import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  AlertTriangle,
  FileCheck,
  Search,
  Users,
  ClipboardCheck,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Menu,
  Bell,
  FileText,
  ChevronRight,
  ChevronDown,
  History,
  FlaskConical,
  CalendarRange,
  Target,
  ShieldCheck,
  Star,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/lib/auth';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/auditor-dashboard', label: 'Auditor View', icon: ClipboardList },
  { path: '/manager-dashboard', label: 'Manager View', icon: BarChart3 },
  { path: '/engagements', label: 'Engagements', icon: FileCheck },
  { path: '/risks', label: 'Risks', icon: AlertTriangle },
  { path: '/controls', label: 'Controls', icon: Shield },
  { path: '/testing', label: 'Testing', icon: FlaskConical },
  { path: '/findings', label: 'Findings', icon: Search },
  { path: '/approvals', label: 'Approvals', icon: ClipboardCheck },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/audit-logs', label: 'Audit Trail', icon: History },
];

const auditPlanSubItems = [
  { path: '/audit-plan', label: '6-Year Dashboard', icon: CalendarRange, exact: true },
  { path: '/audit-plan/grc-themes', label: 'GRC Themes', icon: ShieldCheck },
  { path: '/audit-plan/risk-scoring', label: 'Risk Scoring Engine', icon: Target },
  { path: '/audit-plan/year6', label: 'FY2031 MAR Plan', icon: Star },
  { path: '/audit-plan/import', label: 'Import Plan', icon: Upload, managerOnly: true },
];

function AuditPlanNavSection({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const [user] = useAtom(currentUserAtom);
  const isAuditPlanActive = location.pathname.startsWith('/audit-plan');
  const [open, setOpen] = useState(isAuditPlanActive);

  const canImport = user?.role === 'admin' || user?.role === 'audit_manager';

  return (
    <div>
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isAuditPlanActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        {isAuditPlanActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sidebar-primary rounded-r-full"
          />
        )}
        <CalendarRange className={`w-5 h-5 shrink-0 ${isAuditPlanActive ? 'text-sidebar-primary' : ''}`} />
        <span className="font-medium flex-1 text-left">Audit Plan</span>
        {open
          ? <ChevronDown className="w-4 h-4 opacity-60" />
          : <ChevronRight className="w-4 h-4 opacity-60" />}
      </button>

      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
          {auditPlanSubItems.map((item) => {
            if (item.managerOnly && !canImport) return null;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-sidebar-accent/70 text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sidebar-primary' : ''}`} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-sidebar-foreground">AuditFlow</h1>
            <p className="text-xs text-sidebar-foreground/60">Internal Audit Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' as const }}
            >
              <NavLink
                to={item.path}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-sidebar-primary rounded-r-full"
                  />
                )}
                <item.icon className={`w-5 h-5 ${isActive ? 'text-sidebar-primary' : ''}`} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto text-sidebar-primary" />
                )}
              </NavLink>
            </motion.div>
          );
        })}

        {/* Audit Plan section */}
        <div className="pt-2 border-t border-sidebar-border/50 mt-2">
          <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-4 py-1 mb-1">
            Planning
          </p>
          <AuditPlanNavSection onNavigate={onNavigate} />
        </div>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="px-4 py-3 bg-sidebar-accent/30 rounded-lg">
          <p className="text-xs text-sidebar-foreground/60 mb-1">System Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-sm text-sidebar-foreground">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-sidebar flex-col border-r border-sidebar-border">
        <NavContent />
      </aside>

      {/* Mobile Header & Sheet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">AuditFlow</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
              <NavContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 mt-14 lg:mt-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' as const }}
            className="min-h-screen"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
