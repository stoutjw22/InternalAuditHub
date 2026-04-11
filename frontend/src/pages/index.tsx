export default function HomePage() {
  const { data: risks = [] } = useRiskList();
  const { data: controls = [] } = useControlList();
  const { data: remediations = [] } = useRemediationActionList();
  const { data: findings = [] } = useFindingList();
  const { data: approvals = [] } = useApprovalRequestList();
  const overdueRemediations = getOverdueRemediations(remediations);

  const pendingApprovals = approvals.filter(a => a.approvalstatusKey === 'ApprovalstatusKey0');
  const highSeverityFindings = findings.filter(f => f.severityKey === 'SeverityKey2');

  const stats = [
    {
      label: 'Total Risks',
      value: risks.length,
      icon: AlertTriangle,
      color: 'bg-chart-4/10 text-chart-4',
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Active Controls',
      value: controls.length,
      icon: Shield,
      color: 'bg-primary/10 text-primary',
      trend: '+5%',
      trendUp: true,
    },
    {
      label: 'Open Findings',
      value: findings.length,
      icon: Search,
      color: 'bg-chart-3/10 text-chart-3',
      trend: '-8%',
      trendUp: false,
    },
    {
      label: 'Pending Approvals',
      value: pendingApprovals.length,
      icon: ClipboardCheck,
      color: 'bg-accent/10 text-accent',
      trend: null,
      trendUp: null,
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Audit Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor risks, controls, findings, and approval workflows
            </p>
          </div>

        {/* Overdue Remediations Alert */}
        {overdueRemediations.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-sm border-l-4 border-l-destructive bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-destructive/10">
                      <Bell className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Overdue Remediation Actions</h3>
                      <p className="text-sm text-muted-foreground">
                        {overdueRemediations.length} action{overdueRemediations.length !== 1 ? 's' : ''} require attention
                      </p>
                    </div>
                  </div>
                  <NavLink to="/notifications">
                    <Button variant="outline" className="gap-2 border-destructive/30 hover:bg-destructive/10">
                      <Mail className="w-4 h-4" />
                      Send Notifications
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </NavLink>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
          <div className="flex gap-3">
            <NavLink to="/findings">
              <Button variant="outline" className="gap-2">
                <Search className="w-4 h-4" />
                New Finding
              </Button>
            </NavLink>
            <NavLink to="/risks">
              <Button className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                Add Risk
              </Button>
            </NavLink>
          </div>
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
              <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    {stat.trend && (
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        stat.trendUp ? 'text-accent' : 'text-destructive'
                      }`}>
                        {stat.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {stat.trend}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* High Severity Findings */}
          <motion.div variants={itemVariants}>
            <Card className="h-full border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  High Severity Findings
                </CardTitle>
                <NavLink to="/findings">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </NavLink>
              </CardHeader>
              <CardContent className="space-y-3">
                {highSeverityFindings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-accent" />
                    <p>No high severity findings</p>
                  </div>
                ) : (
                  highSeverityFindings.slice(0, 5).map((finding) => (
                    <div
                      key={finding.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-destructive rounded-full" />
                        <div>
                          <p className="font-medium text-foreground">{finding.findingtitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {finding.controlname?.controlname || 'No control assigned'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive" className="uppercase text-xs">
                        {finding.severityKey ? FindingSeverityKeyToLabel[finding.severityKey] : 'Unknown'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending Approvals */}
          <motion.div variants={itemVariants}>
            <Card className="h-full border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Clock className="w-4 h-4 text-chart-3" />
                  Pending Approvals
                </CardTitle>
                <NavLink to="/approvals">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </NavLink>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-accent" />
                    <p>No pending approvals</p>
                  </div>
                ) : (
                  pendingApprovals.slice(0, 5).map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{approval.requesttitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {approval.requestedby?.auditusername || 'Unknown requester'}
                          {approval.requestdate && ` • ${new Date(approval.requestdate).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="uppercase text-xs bg-chart-3/10 text-chart-3">
                        {approval.approvalstatusKey ? ApprovalRequestApprovalstatusKeyToLabel[approval.approvalstatusKey] : 'Unknown'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <CardContent className="p-6">
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Add Risk', icon: AlertTriangle, path: '/risks', color: 'text-chart-4' },
                  { label: 'Add Control', icon: Shield, path: '/controls', color: 'text-primary' },
                  { label: 'Log Finding', icon: Search, path: '/findings', color: 'text-chart-3' },
                  { label: 'Review Approvals', icon: ClipboardCheck, path: '/approvals', color: 'text-accent' },
                ].map((action) => (
                  <NavLink key={action.path} to={action.path}>
                    <div className="p-4 bg-card rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
                      <action.icon className={`w-6 h-6 ${action.color} mb-3 group-hover:scale-110 transition-transform`} />
                      <p className="font-medium text-foreground">{action.label}</p>
                    </div>
                  </NavLink>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
