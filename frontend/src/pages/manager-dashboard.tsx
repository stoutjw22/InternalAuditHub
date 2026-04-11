import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Briefcase,
  FileText,
  Send,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  UserCheck,
  BarChart3,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAuditEngagementList,
  useApprovalRequestList,
  useFindingList,
  useRemediationActionList,
  useAuditManagerList,
  useAuditUserList,
  useEngagementAuditorList,
} from '@/generated/hooks';
import {
  AuditEngagementStatusKeyToLabel,
  ApprovalRequestApprovalstatusKeyToLabel,
  FindingSeverityKeyToLabel,
} from '@/generated/models';
import { DashboardContextSelector } from '@/components/dashboard-context-selector';
import type { ApprovalRequestApprovalstatusKey } from '@/generated/models';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
} as const;

function getApprovalStatusColor(status?: ApprovalRequestApprovalstatusKey): string {
  switch (status) {
    case 'ApprovalstatusKey0': return 'bg-chart-3/10 text-chart-3 border-chart-3/30';
    case 'ApprovalstatusKey1': return 'bg-accent/10 text-accent border-accent/30';
    case 'ApprovalstatusKey2': return 'bg-destructive/10 text-destructive border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getApprovalStatusIcon(status?: ApprovalRequestApprovalstatusKey) {
  switch (status) {
    case 'ApprovalstatusKey0': return Clock;
    case 'ApprovalstatusKey1': return CheckCircle2;
    case 'ApprovalstatusKey2': return XCircle;
    default: return Clock;
  }
}

export default function ManagerDashboardPage() {
  const { data: engagements = [], isLoading: engagementsLoading } = useAuditEngagementList();
  const { data: approvals = [] } = useApprovalRequestList();
  const { data: findings = [] } = useFindingList();
  const { data: remediations = [] } = useRemediationActionList();
  const { data: managers = [] } = useAuditManagerList();

  // Context selector state
  const [selectedEngagement, setSelectedEngagement] = useState<string | null>(null);
  const [selectedAuditors, setSelectedAuditors] = useState<string[]>([]);
  const { data: allEngagementAuditors = [] } = useEngagementAuditorList();
  const { data: auditUsers = [] } = useAuditUserList();

  // Filter engagements based on context selection
  const filteredEngagements = useMemo(() => {
    if (!selectedEngagement) return engagements;
    return engagements.filter(e => e.id === selectedEngagement);
  }, [engagements, selectedEngagement]);

  // Filter findings based on selected auditors
  const filteredFindings = useMemo(() => {
    if (selectedAuditors.length === 0) return findings;
    return findings.filter(f => 
      f.auditusername && selectedAuditors.includes(f.auditusername.id)
    );
  }, [findings, selectedAuditors]);

  // Filter remediations based on selected auditors
  const filteredRemediations = useMemo(() => {
    if (selectedAuditors.length === 0) return remediations;
    const auditorFindingIds = new Set(filteredFindings.map(f => f.id));
    return remediations.filter(r => 
      r.findingtitle && auditorFindingIds.has(r.findingtitle.id)
    );
  }, [remediations, selectedAuditors, filteredFindings]);

  // Filter approvals based on selected auditors
  const filteredApprovals = useMemo(() => {
    if (selectedAuditors.length === 0) return approvals;
    return approvals.filter(a => 
      a.requestedby && selectedAuditors.includes(a.requestedby.id)
    );
  }, [approvals, selectedAuditors]);

  // Pending approvals (need manager action) - filtered
  const pendingApprovals = filteredApprovals.filter(a => a.approvalstatusKey === 'ApprovalstatusKey0');
  const recentApprovals = filteredApprovals
    .filter(a => a.approvalstatusKey !== 'ApprovalstatusKey0')
    .slice(0, 5);

  // Findings pending approval (high severity typically need review) - filtered
  const highSeverityFindings = filteredFindings.filter(f => f.severityKey === 'SeverityKey2');

  // Outstanding management action plans - filtered
  const outstandingMAPs = filteredRemediations.filter(r => 
    r.statusKey !== 'StatusKey2' // Not completed
  );
  const overdueMAPs = outstandingMAPs.filter(r => new Date(r.duedate) < new Date());

  // Engagement overview - filtered
  const engagementsByStatus = useMemo(() => {
    const planned = filteredEngagements.filter(e => e.statusKey === 'StatusKey0').length;
    const inProgress = filteredEngagements.filter(e => e.statusKey === 'StatusKey1').length;
    const completed = filteredEngagements.filter(e => e.statusKey === 'StatusKey2').length;
    const onHold = filteredEngagements.filter(e => e.statusKey === 'StatusKey3').length;
    return { planned, inProgress, completed, onHold, total: filteredEngagements.length };
  }, [filteredEngagements]);

  // Team workload (audit users)
  const teamWorkload = useMemo(() => {
    return auditUsers.map(user => {
      // Count findings assigned to this user
      const userFindings = findings.filter(f => f.auditusername?.id === user.id);
      return {
        user,
        findingsCount: userFindings.length,
        highSeverity: userFindings.filter(f => f.severityKey === 'SeverityKey2').length,
      };
    }).sort((a, b) => b.findingsCount - a.findingsCount);
  }, [auditUsers, findings]);

  // Summary stats
  const stats = [
    {
      label: 'Pending Approvals',
      value: pendingApprovals.length,
      icon: ClipboardCheck,
      color: 'bg-chart-3/10 text-chart-3',
      urgent: pendingApprovals.length > 0,
    },
    {
      label: 'High Severity Findings',
      value: highSeverityFindings.length,
      icon: AlertTriangle,
      color: 'bg-destructive/10 text-destructive',
      urgent: highSeverityFindings.length > 0,
    },
    {
      label: 'Outstanding MAPs',
      value: outstandingMAPs.length,
      icon: FileText,
      color: 'bg-chart-4/10 text-chart-4',
      urgent: overdueMAPs.length > 0,
    },
    {
      label: 'Active Engagements',
      value: engagementsByStatus.inProgress,
      icon: Briefcase,
      color: 'bg-chart-1/10 text-chart-1',
      urgent: false,
    },
  ];

  if (engagementsLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-chart-1/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Manager Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">
                Oversee approvals, team workload, and audit progress
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <NavLink to="/approvals">
              <Button variant="outline" className="gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Review Approvals
              </Button>
            </NavLink>
            <NavLink to="/notifications">
              <Button className="gap-2">
                <Bell className="w-4 h-4" />
                Send Notifications
              </Button>
            </NavLink>
          </div>
        </motion.div>

        {/* Context Selector */}
        <motion.div variants={itemVariants}>
          <DashboardContextSelector
            engagements={engagements}
            auditors={auditUsers}
            engagementAuditors={allEngagementAuditors}
            selectedEngagement={selectedEngagement}
            selectedAuditors={selectedAuditors}
            onEngagementChange={setSelectedEngagement}
            onAuditorsChange={setSelectedAuditors}
          />
        </motion.div>

        {/* Urgent Alerts */}
        {(pendingApprovals.length > 0 || overdueMAPs.length > 0) && (
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm border-l-4 border-l-chart-3 bg-chart-3/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-chart-3/10">
                      <Clock className="w-5 h-5 text-chart-3" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Action Required</h3>
                      <p className="text-sm text-muted-foreground">
                        {pendingApprovals.length > 0 && `${pendingApprovals.length} approval${pendingApprovals.length !== 1 ? 's' : ''} pending`}
                        {pendingApprovals.length > 0 && overdueMAPs.length > 0 && ' • '}
                        {overdueMAPs.length > 0 && `${overdueMAPs.length} overdue MAP${overdueMAPs.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  <NavLink to="/approvals">
                    <Button variant="outline" className="gap-2 border-chart-3/30 hover:bg-chart-3/10">
                      <Eye className="w-4 h-4" />
                      Review Now
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </NavLink>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
            >
              <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow ${stat.urgent ? 'ring-1 ring-chart-3/30' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    {stat.urgent && (
                      <div className="w-2 h-2 bg-chart-3 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Approvals */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="border-0 shadow-sm h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-chart-3" />
                  Pending Approvals
                  {pendingApprovals.length > 0 && (
                    <Badge variant="outline" className="ml-2 bg-chart-3/10 text-chart-3 border-chart-3/30">
                      {pendingApprovals.length}
                    </Badge>
                  )}
                </CardTitle>
                <NavLink to="/approvals">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </NavLink>
              </CardHeader>
              <CardContent>
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-3" />
                    <p className="font-medium text-foreground">All caught up!</p>
                    <p className="text-sm text-muted-foreground mt-1">No pending approvals</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Finding</TableHead>
                        <TableHead className="w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApprovals.slice(0, 5).map((approval) => (
                        <TableRow key={approval.id}>
                          <TableCell>
                            <p className="font-medium text-foreground">{approval.requesttitle}</p>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {approval.requestedby?.auditusername || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {approval.requestdate ? new Date(approval.requestdate).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {approval.findingtitle?.findingtitle || '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:text-accent hover:bg-accent/10">
                                <ThumbsUp className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <ThumbsDown className="w-4 h-4" />
                              </Button>
                              <NavLink to="/approvals">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </NavLink>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Engagement Overview */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm h-full">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-chart-1" />
                  Engagement Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-chart-4" />
                      <span className="text-sm text-foreground">Planned</span>
                    </div>
                    <span className="font-bold text-foreground">{engagementsByStatus.planned}</span>
                  </div>
                  <Progress value={(engagementsByStatus.planned / Math.max(engagementsByStatus.total, 1)) * 100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-chart-1" />
                      <span className="text-sm text-foreground">In Progress</span>
                    </div>
                    <span className="font-bold text-foreground">{engagementsByStatus.inProgress}</span>
                  </div>
                  <Progress value={(engagementsByStatus.inProgress / Math.max(engagementsByStatus.total, 1)) * 100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent" />
                      <span className="text-sm text-foreground">Completed</span>
                    </div>
                    <span className="font-bold text-foreground">{engagementsByStatus.completed}</span>
                  </div>
                  <Progress value={(engagementsByStatus.completed / Math.max(engagementsByStatus.total, 1)) * 100} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-chart-3" />
                      <span className="text-sm text-foreground">On Hold</span>
                    </div>
                    <span className="font-bold text-foreground">{engagementsByStatus.onHold}</span>
                  </div>
                  <Progress value={(engagementsByStatus.onHold / Math.max(engagementsByStatus.total, 1)) * 100} className="h-2" />
                </div>

                <div className="pt-4 border-t border-border">
                  <NavLink to="/engagements">
                    <Button variant="outline" className="w-full gap-2">
                      <Briefcase className="w-4 h-4" />
                      View All Engagements
                    </Button>
                  </NavLink>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Team Workload & Outstanding MAPs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Workload */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Team Workload
                </CardTitle>
                <NavLink to="/users">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                    Manage team
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </NavLink>
              </CardHeader>
              <CardContent>
                {teamWorkload.length === 0 ? (
                  <div className="text-center py-6 bg-muted/30 rounded-lg">
                    <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No team members yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamWorkload.slice(0, 5).map((member) => (
                      <div key={member.user.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{member.user.auditusername}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.findingsCount} finding{member.findingsCount !== 1 ? 's' : ''} assigned
                            </p>
                          </div>
                        </div>
                        {member.highSeverity > 0 && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            {member.highSeverity} high
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Outstanding MAPs */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-chart-4" />
                  Outstanding Action Plans
                  {overdueMAPs.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {overdueMAPs.length} overdue
                    </Badge>
                  )}
                </CardTitle>
                <NavLink to="/engagements">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </NavLink>
              </CardHeader>
              <CardContent>
                {outstandingMAPs.length === 0 ? (
                  <div className="text-center py-6 bg-muted/30 rounded-lg">
                    <CheckCircle2 className="w-8 h-8 text-accent mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All action plans completed</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {outstandingMAPs.slice(0, 5).map((map) => {
                        const isOverdue = new Date(map.duedate) < new Date();
                        return (
                          <TableRow key={map.id}>
                            <TableCell>
                              <p className="font-medium text-foreground line-clamp-1">{map.actiondescription}</p>
                              <p className="text-xs text-muted-foreground">{map.ownername?.findingownername}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className={`text-sm ${isOverdue ? 'text-destructive font-medium' : 'text-foreground'}`}>
                                  {new Date(map.duedate).toLocaleDateString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${
                                isOverdue ? 'bg-destructive/10 text-destructive border-destructive/30' :
                                map.statusKey === 'StatusKey1' ? 'bg-chart-1/10 text-chart-1 border-chart-1/30' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {isOverdue ? 'Overdue' : map.statusKey === 'StatusKey1' ? 'In Progress' : 'Not Started'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Approval Activity */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Send className="w-5 h-5 text-accent" />
                Recent Approval Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentApprovals.length === 0 ? (
                <div className="text-center py-6 bg-muted/30 rounded-lg">
                  <ClipboardCheck className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent approval activity</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentApprovals.map((approval) => {
                    const StatusIcon = getApprovalStatusIcon(approval.approvalstatusKey);
                    return (
                      <div
                        key={approval.id}
                        className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-foreground text-sm line-clamp-1">{approval.requesttitle}</p>
                          <Badge variant="outline" className={`text-xs ${getApprovalStatusColor(approval.approvalstatusKey)}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {approval.approvalstatusKey ? ApprovalRequestApprovalstatusKeyToLabel[approval.approvalstatusKey] : 'Unknown'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {approval.requestedby?.auditusername || 'Unknown'}
                          {approval.approvedby && ` → ${approval.approvedby.auditmanagername}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
