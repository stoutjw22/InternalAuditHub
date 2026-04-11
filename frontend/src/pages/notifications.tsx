import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Mail, 
  AlertTriangle, 
  Clock, 
  Send, 
  CheckCircle2, 
  Filter, 
  RefreshCw,
  History,
  Settings,
  ChevronDown,
  User,
  Calendar,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';

import { useRemediationActionList, useFindingOwnerList } from '@/generated/hooks';
import type { RemediationAction } from '@/generated/models';
import { RemediationActionStatusKeyToLabel } from '@/generated/models';
import { 
  useEmailNotifications, 
  getOverdueRemediations, 
  getUpcomingRemediations,
  type EmailNotification,
} from '@/hooks/use-email-notifications';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
} as const;

function getDaysOverdue(dueDate?: string): number {
  if (!dueDate) return 0;
  return differenceInDays(new Date(), new Date(dueDate));
}

function getUrgencyLevel(daysOverdue: number): 'critical' | 'high' | 'medium' {
  if (daysOverdue >= 14) return 'critical';
  if (daysOverdue >= 7) return 'high';
  return 'medium';
}

function getUrgencyColor(urgency: 'critical' | 'high' | 'medium'): string {
  switch (urgency) {
    case 'critical':
      return 'bg-destructive text-destructive-foreground';
    case 'high':
      return 'bg-chart-3/10 text-chart-3 border-chart-3/30';
    case 'medium':
      return 'bg-chart-4/10 text-chart-4 border-chart-4/30';
  }
}

export default function NotificationsPage() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [previewEmail, setPreviewEmail] = useState<Omit<EmailNotification, 'id' | 'sentAt' | 'status'> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationHistoryOpen, setNotificationHistoryOpen] = useState(false);

  const { data: remediations = [], isLoading } = useRemediationActionList();
  const { data: owners = [] } = useFindingOwnerList();
  
  const {
    preferences,
    setPreferences,
    sendOverdueNotification,
    sendBulkNotifications,
    getNotificationHistory,
    isSending,
    generateNotificationEmail,
  } = useEmailNotifications();

  const overdueRemediations = useMemo(() => getOverdueRemediations(remediations), [remediations]);
  const upcomingRemediations = useMemo(() => getUpcomingRemediations(remediations, preferences.notifyDaysBefore), [remediations, preferences.notifyDaysBefore]);
  const notificationHistory = getNotificationHistory();

  const filteredOverdue = useMemo(() => {
    return overdueRemediations.filter(r => {
      if (filterOwner !== 'all' && r.ownername?.id !== filterOwner) return false;
      if (filterUrgency !== 'all') {
        const daysOverdue = getDaysOverdue(r.duedate);
        const urgency = getUrgencyLevel(daysOverdue);
        if (filterUrgency !== urgency) return false;
      }
      return true;
    });
  }, [overdueRemediations, filterOwner, filterUrgency]);

  const stats = useMemo(() => {
    const critical = overdueRemediations.filter(r => getUrgencyLevel(getDaysOverdue(r.duedate)) === 'critical').length;
    const high = overdueRemediations.filter(r => getUrgencyLevel(getDaysOverdue(r.duedate)) === 'high').length;
    const medium = overdueRemediations.filter(r => getUrgencyLevel(getDaysOverdue(r.duedate)) === 'medium').length;
    return { critical, high, medium, total: overdueRemediations.length, upcoming: upcomingRemediations.length };
  }, [overdueRemediations, upcomingRemediations]);

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredOverdue.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredOverdue.map(r => r.id)));
    }
  };

  const handleSendNotification = async (remediation: RemediationAction) => {
    try {
      await sendOverdueNotification(remediation);
      toast.success(`Notification sent to ${remediation.ownername?.findingownername || 'owner'}`);
    } catch {
      toast.error('Failed to send notification');
    }
  };

  const handleSendBulkNotifications = async () => {
    const selectedRemediations = filteredOverdue.filter(r => selectedItems.has(r.id));
    if (selectedRemediations.length === 0) {
      toast.error('No items selected');
      return;
    }
    try {
      await sendBulkNotifications(selectedRemediations);
      toast.success(`${selectedRemediations.length} notification(s) sent successfully`);
      setSelectedItems(new Set());
    } catch {
      toast.error('Failed to send notifications');
    }
  };

  const handlePreviewEmail = (remediation: RemediationAction) => {
    const email = generateNotificationEmail(remediation, 'overdue');
    setPreviewEmail(email);
  };

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-chart-3/10 rounded-xl flex items-center justify-center relative">
              <Bell className="w-6 h-6 text-chart-3" />
              {stats.total > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {stats.total > 9 ? '9+' : stats.total}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Email Notifications
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage overdue remediation alerts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            <Button
              onClick={handleSendBulkNotifications}
              disabled={selectedItems.size === 0 || isSending}
              className="gap-2"
            >
              {isSending ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              Send Selected ({selectedItems.size})
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Critical (14+ days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-3/10">
                  <Clock className="w-4 h-4 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.high}</p>
                  <p className="text-xs text-muted-foreground">High (7-13 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-4/10">
                  <Clock className="w-4 h-4 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.medium}</p>
                  <p className="text-xs text-muted-foreground">Medium (1-6 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Mail className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Calendar className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.upcoming}</p>
                  <p className="text-xs text-muted-foreground">Due Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="overdue" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overdue" className="gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Overdue ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="gap-1.5">
                <Clock className="w-4 h-4" />
                Due Soon ({stats.upcoming})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="w-4 h-4" />
                History ({notificationHistory.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overdue">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Overdue Remediation Actions
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <Select value={filterOwner} onValueChange={setFilterOwner}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="All Owners" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Owners</SelectItem>
                            {owners.map(owner => (
                              <SelectItem key={owner.id} value={owner.id}>
                                {owner.findingownername}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Select value={filterUrgency} onValueChange={setFilterUrgency}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="All Urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Urgency</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Spinner className="w-8 h-8" />
                    </div>
                  ) : filteredOverdue.length === 0 ? (
                    <div className="text-center py-16">
                      <CheckCircle2 className="w-12 h-12 text-accent mx-auto mb-4" />
                      <p className="font-medium text-foreground">No overdue remediation actions</p>
                      <p className="text-sm text-muted-foreground mt-1">All actions are on track</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Select All */}
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedItems.size === filteredOverdue.length}
                            onCheckedChange={toggleSelectAll}
                          />
                          <span className="text-sm font-medium">
                            {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'Select all'}
                          </span>
                        </div>
                        {selectedItems.size > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedItems(new Set())}
                          >
                            Clear
                          </Button>
                        )}
                      </div>

                      {/* Remediation List */}
                      <AnimatePresence>
                        {filteredOverdue.map((remediation, index) => {
                          const daysOverdue = getDaysOverdue(remediation.duedate);
                          const urgency = getUrgencyLevel(daysOverdue);
                          return (
                            <motion.div
                              key={remediation.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ delay: index * 0.03, duration: 0.2 }}
                              className="flex items-start gap-4 p-4 rounded-lg border border-border/50 hover:border-border hover:bg-muted/20 transition-colors"
                            >
                              <Checkbox
                                checked={selectedItems.has(remediation.id)}
                                onCheckedChange={() => toggleSelection(remediation.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-1">
                                    <h4 className="font-medium text-foreground">
                                      {remediation.actiondescription}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" />
                                        {remediation.ownername?.findingownername || 'Unassigned'}
                                      </span>
                                      <span className="text-muted-foreground/30">•</span>
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Due {remediation.duedate ? format(new Date(remediation.duedate), 'MMM d, yyyy') : '—'}
                                      </span>
                                      <span className="text-muted-foreground/30">•</span>
                                      <span className="flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        {remediation.findingtitle?.findingtitle || 'No finding'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={getUrgencyColor(urgency)}>
                                      {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                                    </Badge>
                                    <Badge variant="secondary">
                                      {RemediationActionStatusKeyToLabel[remediation.statusKey]}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePreviewEmail(remediation)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendNotification(remediation)}
                                  disabled={isSending}
                                  className="gap-1"
                                >
                                  <Mail className="w-4 h-4" />
                                  Send
                                </Button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-chart-3" />
                    Upcoming Due Dates (Next {preferences.notifyDaysBefore} Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingRemediations.length === 0 ? (
                    <div className="text-center py-16">
                      <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="font-medium text-foreground">No upcoming due dates</p>
                      <p className="text-sm text-muted-foreground mt-1">No remediation actions due in the next {preferences.notifyDaysBefore} days</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {upcomingRemediations.map(remediation => {
                        const daysUntilDue = remediation.duedate
                          ? Math.ceil((new Date(remediation.duedate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                          : 0;
                        return (
                          <div
                            key={remediation.id}
                            className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors"
                          >
                            <div className="space-y-1">
                              <h4 className="font-medium text-foreground">{remediation.actiondescription}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{remediation.ownername?.findingownername || 'Unassigned'}</span>
                                <span>•</span>
                                <span>Due {remediation.duedate ? format(new Date(remediation.duedate), 'MMM d, yyyy') : '—'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-chart-4/10 text-chart-4 border-chart-4/30">
                                {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} left
                              </Badge>
                              <Button variant="outline" size="sm" className="gap-1">
                                <Mail className="w-4 h-4" />
                                Remind
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <History className="w-5 h-5 text-accent" />
                    Notification History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notificationHistory.length === 0 ? (
                    <div className="text-center py-16">
                      <Mail className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="font-medium text-foreground">No notifications sent yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Sent notifications will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notificationHistory.map(notification => (
                        <Collapsible key={notification.id}>
                          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-accent/10">
                                <CheckCircle2 className="w-4 h-4 text-accent" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{notification.recipientEmail}</p>
                                <p className="text-sm text-muted-foreground">
                                  {notification.subject}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })}
                              </span>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>
                          <CollapsibleContent>
                            <div className="px-4 pb-4">
                              <div className="p-4 bg-muted/30 rounded-lg mt-2">
                                <p className="text-sm text-muted-foreground whitespace-pre-line">
                                  {notification.body}
                                </p>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      {/* Email Preview Dialog */}
      <Dialog open={!!previewEmail} onOpenChange={(open) => !open && setPreviewEmail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Preview
            </DialogTitle>
          </DialogHeader>
          {previewEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="font-medium text-muted-foreground">To:</span>
                <span>{previewEmail.recipientEmail}</span>
                <span className="font-medium text-muted-foreground">Subject:</span>
                <span>{previewEmail.subject}</span>
              </div>
              <div className="border-t pt-4">
                <Textarea
                  value={previewEmail.body}
                  readOnly
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewEmail(null)}>Close</Button>
            <Button
              onClick={async () => {
                if (previewEmail) {
                  const remediation = remediations.find(r => r.id === previewEmail.remediationActionId);
                  if (remediation) {
                    await handleSendNotification(remediation);
                    setPreviewEmail(null);
                  }
                }
              }}
              disabled={isSending}
              className="gap-2"
            >
              {isSending ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Notification Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-notifications">Enable Overdue Notifications</Label>
                <p className="text-sm text-muted-foreground">Automatically track overdue remediations</p>
              </div>
              <Switch
                id="enable-notifications"
                checked={preferences.enableOverdueNotifications}
                onCheckedChange={(checked) => setPreferences(p => ({ ...p, enableOverdueNotifications: checked }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notify Days Before Due</Label>
              <Select
                value={String(preferences.notifyDaysBefore)}
                onValueChange={(value) => setPreferences(p => ({ ...p, notifyDaysBefore: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="5">5 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-overdue">Notify On Overdue</Label>
                <p className="text-sm text-muted-foreground">Send alerts when items become overdue</p>
              </div>
              <Switch
                id="notify-overdue"
                checked={preferences.notifyOnOverdue}
                onCheckedChange={(checked) => setPreferences(p => ({ ...p, notifyOnOverdue: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-digest">Weekly Digest</Label>
                <p className="text-sm text-muted-foreground">Send weekly summary of overdue items</p>
              </div>
              <Switch
                id="weekly-digest"
                checked={preferences.notifyWeekly}
                onCheckedChange={(checked) => setPreferences(p => ({ ...p, notifyWeekly: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
