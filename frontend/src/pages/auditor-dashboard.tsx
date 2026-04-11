import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { NavLink } from 'react-router-dom';
import {
  Briefcase,
  AlertTriangle,
  ShieldCheck,
  Search,
  Clock,
  CheckCircle2,
  PlayCircle,
  FileText,
  ArrowRight,
  Calendar,
  ClipboardList,
  Target,
  PauseCircle,
  FileCheck,
  AlertCircle,
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
  useRiskList,
  useControlList,
  useFindingList,
  useEngagementRiskList,
  useEngagementControlList,
  useRemediationActionList,
  useEngagementAuditorList,
} from '@/generated/hooks';
import { useAuditUserList } from '@/generated/hooks';
import {
  AuditEngagementStatusKeyToLabel,
  FindingSeverityKeyToLabel,
} from '@/generated/models';
import { DashboardContextSelector } from '@/components/dashboard-context-selector';
import type { AuditEngagementStatusKey, FindingSeverityKey } from '@/generated/models';

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

function getStatusColor(status?: AuditEngagementStatusKey): string {
  switch (status) {
    case 'StatusKey0': return 'bg-chart-4/10 text-chart-4 border-chart-4/30';
    case 'StatusKey1': return 'bg-chart-1/10 text-chart-1 border-chart-1/30';
    case 'StatusKey2': return 'bg-accent/10 text-accent border-accent/30';
    case 'StatusKey3': return 'bg-chart-3/10 text-chart-3 border-chart-3/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getStatusIcon(status?: AuditEngagementStatusKey) {
  switch (status) {
    case 'StatusKey0': return Calendar;
    case 'StatusKey1': return PlayCircle;
    case 'StatusKey2': return CheckCircle2;
    case 'StatusKey3': return PauseCircle;
    default: return Clock;
  }
}

function getSeverityColor(severity?: FindingSeverityKey): string {
  switch (severity) {
    case 'SeverityKey0': return 'bg-muted text-muted-foreground';
    case 'SeverityKey1': return 'bg-chart-3/10 text-chart-3 border-chart-3/30';
    case 'SeverityKey2': return 'bg-destructive/10 text-destructive border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function AuditorDashboardPage() {
  const { data: engagements = [], isLoading: engagementsLoading } = useAuditEngagementList();
  const { data: allRisks = [] } = useRiskList();
  const { data: allControls = [] } = useControlList();
  const { data: allFindings = [] } = useFindingList();
  const { data: allEngagementRisks = [] } = useEngagementRiskList();
  const { data: allEngagementControls = [] } = useEngagementControlList();

  // Context selector state
  const [selectedEngagement, setSelectedEngagement] = useState<string | null>(null);
  const [selectedAuditors, setSelectedAuditors] = useState<string[]>([]);

  // Get all auditors for the filter
  const { data: allEngagementAuditors = [] } = useEngagementAuditorList();
  const { data: allAuditors = [] } = useAuditUserList();
  const { data: allRemediations = [] } = useRemediationActionList();

  // Filter data based on context selection
  const filteredEngagements = useMemo(() => {
    if (!selectedEngagement) return engagements;
    return engagements.filter(e => e.id === selectedEngagement);
  }, [engagements, selectedEngagement]);

  // Active engagements (in progress) - filtered
  const activeEngagements = filteredEngagements.filter(e => e.statusKey === 'StatusKey1');
  const plannedEngagements = filteredEngagements.filter(e => e.statusKey === 'StatusKey0');

  // Risks needing assessment (not yet scoped to any engagement)
  const scopedRiskIds = new Set(allEngagementRisks.map(er => er.riskname?.id));
  const unscopedRisks = allRisks.filter(r => !scopedRiskIds.has(r.id));

  // Controls needing testing (not yet scoped to any engagement)
  const scopedControlIds = new Set(allEngagementControls.map(ec => ec.controlname?.id));
  const unscopedControls = allControls.filter(c => !scopedControlIds.has(c.id));

  // Filter findings by selected auditors
  const filteredFindings = useMemo(() => {
    if (selectedAuditors.length === 0) return allFindings;
    return allFindings.filter(f => 
      f.auditusername && selectedAuditors.includes(f.auditusername.id)
    );
  }, [allFindings, selectedAuditors]);

  // Findings without remediation (filtered)
  const findingsWithRemediation = new Set(allRemediations.map(r => r.findingtitle?.id));
  const findingsNeedingRemediation = filteredFindings.filter(f => !findingsWithRemediation.has(f.id));

  // Filter remediations by selected auditors
  const filteredRemediations = useMemo(() => {
    if (selectedAuditors.length === 0) return allRemediations;
    // Filter remediations linked to findings assigned to selected auditors
    const auditorFindingIds = new Set(filteredFindings.map(f => f.id));
    return allRemediations.filter(r => 
      r.findingtitle && auditorFindingIds.has(r.findingtitle.id)
    );
  }, [allRemediations, selectedAuditors, filteredFindings]);

  // Overdue remediations (filtered)
  const overdueRemediations = filteredRemediations.filter(r => {
    if (r.statusKey === 'StatusKey2') return false;
    return new Date(r.duedate) < new Date();
  });

  // Engagement metrics
  const engagementMetrics = useMemo(() => {
    return activeEngagements.map(eng => {
      // Get risks and controls scoped to this engagement
      const engRisks = allEngagementRisks.filter(er =>
        // In a real app we'd have direct engagement link; for now estimate based on naming
        er.engagementriskname?.includes(eng.engagementname.substring(0, 10)) || 
        allEngagementRisks.length > 0
      );
      const engControls = allEngagementControls.filter(ec => 
        allEngagementControls.length > 0
      );
      
      // Calculate progress based on various factors
      const riskProgress = engRisks.length > 0 ? Math.min(100, (engRisks.length / Math.max(allRisks.length, 1)) * 100 * 2) : 0;
      const controlProgress = engControls.length > 0 ? Math.min(100, (engControls.length / Math.max(allControls.length, 1)) * 100 * 2) : 0;
      const avgProgress = (riskProgress + controlProgress) / 2;

      return {
        engagement: eng,
        risksScoped: engRisks.length,
        controlsMapped: engControls.length,
        progress: Math.round(avgProgress),
      };
    });
  }, [activeEngagements, allEngagementRisks, allEngagementControls, allRisks.length, allControls.length]);

  // Summary stats
  const stats = [
    {
      label: 'Active Engagements',
      value: activeEngagements.length,
      icon: Briefcase,
      color: 'bg-chart-1/10 text-chart-1',
      description: 'Currently in progress',
    },
    {
      label: 'Risks to Assess',
      value: unscopedRisks.length,
      icon: AlertTriangle,
      color: 'bg-chart-4/10 text-chart-4',
      description: 'Not yet scoped',
    },
    {
      label: 'Controls to Test',
      value: unscopedControls.length,
      icon: ShieldCheck,
      color: 'bg-primary/10 text-primary',
      description: 'Awaiting testing',
    },
    {
      label: 'Findings Open',
      value: findingsNeedingRemediation.length,
      icon: Search,
      color: 'bg-chart-3/10 text-chart-3',
      description: 'Need remediation plan',
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
            <div className="w-12 h-12 bg-gradient-to-br from-chart-1/20 to-primary/20 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-chart-1" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Auditor Dashboard
              </h1>
              <p className="text-muted-foreground text-sm">
                Track engagements, risks, controls, and findings
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <NavLink to="/engagements">
              <Button variant="outline" className="gap-2">
                <Briefcase className="w-4 h-4" />
                View Engagements
              </Button>
            </NavLink>
            <NavLink to="/findings">
              <Button className="gap-2">
                <Search className="w-4 h-4" />
                Log Finding
              </Button>
            </NavLink>
          </div>
        </motion.div>

        {/* Context Selector */}
        <motion.div variants={itemVariants}>
          <DashboardContextSelector
            engagements={engagements}
            auditors={allAuditors}
            engagementAuditors={allEngagementAuditors}
            selectedEngagement={selectedEngagement}
            selectedAuditors={selectedAuditors}
            onEngagementChange={setSelectedEngagement}
            onAuditorsChange={setSelectedAuditors}
          />
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    {stat.value > 0 && (
                      <Badge variant="outline" className="text-xs border-chart-3/30 text-chart-3">
                        Action needed
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Engagements Progress */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="border-0 shadow-sm h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-chart-1" />
                  Active Engagements
                </CardTitle>
                <NavLink to="/engagements">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </NavLink>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeEngagements.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <Briefcase className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No active engagements</p>
                    <p className="text-sm text-muted-foreground mt-1">Start a planned engagement to begin auditing</p>
                  </div>
                ) : (
                  engagementMetrics.map((item) => {
                    const StatusIcon = getStatusIcon(item.engagement.statusKey);
                    return (
                      <div
                        key={item.engagement.id}
                        className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-foreground">{item.engagement.engagementname}</h4>
                            <p className="text-sm text-muted-foreground">Period: {item.engagement.period}</p>
                          </div>
                          <Badge variant="outline" className={`text-xs ${getStatusColor(item.engagement.statusKey)}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {AuditEngagementStatusKeyToLabel[item.engagement.statusKey]}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Fieldwork Progress</span>
                            <span className="font-medium text-foreground">{item.progress}%</span>
                          </div>
                          <Progress value={item.progress} className="h-2" />
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {item.risksScoped} risks scoped
                            </span>
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              {item.controlsMapped} controls mapped
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming Work */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm h-full">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-chart-4" />
                  Upcoming Work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plannedEngagements.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Planned Engagements</p>
                    {plannedEngagements.slice(0, 3).map((eng) => (
                      <div key={eng.id} className="p-3 bg-chart-4/5 rounded-lg border border-chart-4/20">
                        <p className="font-medium text-foreground text-sm">{eng.engagementname}</p>
                        <p className="text-xs text-muted-foreground">{eng.period}</p>
                      </div>
                    ))}
                  </div>
                )}

                {unscopedRisks.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risks to Assess</p>
                    {unscopedRisks.slice(0, 3).map((risk) => (
                      <div key={risk.id} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-foreground text-sm">{risk.riskname}</p>
                      </div>
                    ))}
                    {unscopedRisks.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{unscopedRisks.length - 3} more risks
                      </p>
                    )}
                  </div>
                )}

                {plannedEngagements.length === 0 && unscopedRisks.length === 0 && (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-8 h-8 text-accent mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Findings & Remediations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Findings Needing Remediation */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-chart-3" />
                  Findings Needing Remediation
                </CardTitle>
                <NavLink to="/findings">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </NavLink>
              </CardHeader>
              <CardContent>
                {findingsNeedingRemediation.length === 0 ? (
                  <div className="text-center py-6 bg-muted/30 rounded-lg">
                    <CheckCircle2 className="w-8 h-8 text-accent mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All findings have remediation plans</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Finding</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Control</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {findingsNeedingRemediation.slice(0, 5).map((finding) => (
                        <TableRow key={finding.id}>
                          <TableCell className="font-medium">{finding.findingtitle}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${getSeverityColor(finding.severityKey)}`}>
                              {finding.severityKey ? FindingSeverityKeyToLabel[finding.severityKey] : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {finding.controlname?.controlname || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Overdue Remediations */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  Overdue Remediations
                  {overdueRemediations.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {overdueRemediations.length}
                    </Badge>
                  )}
                </CardTitle>
                <NavLink to="/engagements">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                    Manage
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </NavLink>
              </CardHeader>
              <CardContent>
                {overdueRemediations.length === 0 ? (
                  <div className="text-center py-6 bg-muted/30 rounded-lg">
                    <CheckCircle2 className="w-8 h-8 text-accent mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No overdue remediations</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Owner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overdueRemediations.slice(0, 5).map((rem) => (
                        <TableRow key={rem.id}>
                          <TableCell>
                            <p className="font-medium text-foreground line-clamp-1">{rem.actiondescription}</p>
                            <p className="text-xs text-muted-foreground">{rem.findingtitle?.findingtitle}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                              {new Date(rem.duedate).toLocaleDateString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {rem.ownername?.findingownername || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Controls Awaiting Testing */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Controls Awaiting Testing
              </CardTitle>
              <NavLink to="/controls">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                  View all controls
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </NavLink>
            </CardHeader>
            <CardContent>
              {unscopedControls.length === 0 ? (
                <div className="text-center py-6 bg-muted/30 rounded-lg">
                  <FileCheck className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All controls have been scoped for testing</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unscopedControls.slice(0, 6).map((control) => (
                    <div
                      key={control.id}
                      className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{control.controlname}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Not yet assigned to engagement
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {unscopedControls.length > 6 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  +{unscopedControls.length - 6} more controls awaiting testing
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
