import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { useAuditPlanEntity } from '@/generated/hooks';
import type {
  AuditPlanYearNested,
  ControlRelianceCycle,
  KeyControlNested,
  ResidualLevel,
} from '@/generated/models/audit-plan';

// ── Shared badge helpers ───────────────────────────────────────────────────────

const RESIDUAL_COLORS: Record<ResidualLevel, string> = {
  Critical: 'bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300/40',
  High: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-300/40',
  Medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-300/40',
  Low: 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-300/40',
};

function ResidualBadge({ level }: { level: ResidualLevel | null }) {
  if (!level) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RESIDUAL_COLORS[level]}`}>
      {level}
    </span>
  );
}

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-muted-foreground text-xs">—</span>;
  const colors: Record<string, string> = {
    'Tier 1 (MAR/Fin Rptg)': 'bg-red-500/15 text-red-700 dark:text-red-400',
    'Tier 2 (Key Ops/Reg)': 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
    'Tier 3 (Supporting)': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${colors[tier] ?? 'bg-muted text-muted-foreground'}`}>
      {tier}
    </span>
  );
}

function RelianceChip({ result }: { result: string | null }) {
  if (!result || result === 'Not Tested') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <MinusCircle className="w-3.5 h-3.5" /> NT
      </span>
    );
  }
  if (result === 'Clean') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5" /> Clean
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
      <XCircle className="w-3.5 h-3.5" /> Exc.
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Not Started': 'bg-muted text-muted-foreground',
    'In Progress': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    'Complete': 'bg-green-500/15 text-green-700 dark:text-green-400',
    'Deferred': 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function OverviewTab({ entity }: { entity: ReturnType<typeof useAuditPlanEntity>['data'] }) {
  if (!entity) return null;
  const rows = [
    { label: 'ERM Risk Category', value: entity.erm_risk_category },
    { label: 'Risk Appetite Threshold', value: entity.risk_appetite_threshold },
    { label: 'Exceeds Appetite', value: entity.exceeds_appetite },
    { label: 'Frameworks', value: entity.frameworks },
    { label: 'Primary Clusters', value: entity.primary_clusters },
    { label: 'Estimated Hours', value: entity.estimated_hours?.toLocaleString() },
    { label: 'Risk Count', value: entity.risk_count },
    { label: 'Frequency Override Triggers', value: entity.frequency_override_triggers },
  ];

  return (
    <div className="space-y-4">
      {entity.agile_scope && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Agile Audit Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entity.agile_scope}</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reference Data</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {rows.map(({ label, value }) => (
                <TableRow key={label}>
                  <TableCell className="font-medium text-sm w-48">{label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{value ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ControlsTab({ controls }: { controls: KeyControlNested[] }) {
  if (controls.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-10">
        No controls assigned to this entity yet.
      </p>
    );
  }
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Control ID</TableHead>
              <TableHead>Key?</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Baseline</TableHead>
              <TableHead className="text-right">Effectiveness</TableHead>
              <TableHead>Reliance Ready</TableHead>
              <TableHead>Testing Strategy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {controls.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs font-bold">{c.control_id}</TableCell>
                <TableCell>
                  {c.is_key_control && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
                </TableCell>
                <TableCell className="text-sm">{c.control_name}</TableCell>
                <TableCell><TierBadge tier={c.control_tier} /></TableCell>
                <TableCell className="text-sm">{c.control_type ?? '—'}</TableCell>
                <TableCell className="text-sm">{c.frequency ?? '—'}</TableCell>
                <TableCell>
                  {c.baseline_complete
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : <MinusCircle className="w-4 h-4 text-muted-foreground" />}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {c.control_effectiveness ?? '—'}
                </TableCell>
                <TableCell>
                  {c.reliance_ready
                    ? <span className="text-xs text-green-600 dark:text-green-400 font-medium">Ready</span>
                    : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                  {c.testing_strategy ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RelianceTrackerTab({ controls }: { controls: KeyControlNested[] }) {
  const keyControls = controls.filter((c) => c.is_key_control);
  if (keyControls.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-10">
        No key controls (★) assigned to this entity yet.
      </p>
    );
  }

  function cycleResult(cycles: ControlRelianceCycle[], year: number): string | null {
    return cycles.find((c) => c.cycle_year === year)?.result ?? null;
  }

  function consecutiveClean(cycles: ControlRelianceCycle[]): number {
    const sorted = [2026, 2027, 2028]
      .map((y) => cycleResult(cycles, y));
    let count = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i] === 'Clean') count++;
      else break;
    }
    return count;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Control ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>FY2026</TableHead>
              <TableHead>FY2027</TableHead>
              <TableHead>FY2028</TableHead>
              <TableHead className="text-center">Consec. Clean</TableHead>
              <TableHead>Reliance Ready</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keyControls.map((c) => {
              const clean = consecutiveClean(c.reliance_cycles);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs font-bold">{c.control_id}</TableCell>
                  <TableCell className="text-sm">{c.control_name}</TableCell>
                  <TableCell><RelianceChip result={cycleResult(c.reliance_cycles, 2026)} /></TableCell>
                  <TableCell><RelianceChip result={cycleResult(c.reliance_cycles, 2027)} /></TableCell>
                  <TableCell><RelianceChip result={cycleResult(c.reliance_cycles, 2028)} /></TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold text-sm ${clean >= 3 ? 'text-green-600 dark:text-green-400' : clean >= 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`}>
                      {clean}
                    </span>
                  </TableCell>
                  <TableCell>
                    {c.reliance_ready
                      ? <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</span>
                      : <span className="text-xs text-muted-foreground">Not yet</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PlanYearsTab({ planYears }: { planYears: AuditPlanYearNested[] }) {
  const scheduled = planYears.filter((py) => py.is_scheduled);
  if (scheduled.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-10">
        This entity is not scheduled in any fiscal year yet.
      </p>
    );
  }
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fiscal Year</TableHead>
              <TableHead>Planned Year</TableHead>
              <TableHead>Quarter</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planYears.map((py) => (
              <TableRow key={py.id} className={!py.is_scheduled ? 'opacity-40' : ''}>
                <TableCell className="font-mono font-medium">FY{py.fiscal_year}</TableCell>
                <TableCell className="text-muted-foreground">{py.planned_year ?? '—'}</TableCell>
                <TableCell>{py.quarter ?? '—'}</TableCell>
                <TableCell><StatusBadge status={py.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AuditableEntityDetail() {
  const { id } = useParams<{ id: string }>();
  const entityId = parseInt(id ?? '0', 10);
  const { data: entity, isLoading } = useAuditPlanEntity(entityId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Entity not found.
        <div className="mt-4">
          <Link to="/audit-plan">
            <Button variant="outline">Back to Audit Plan</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Back nav */}
      <Link to="/audit-plan">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Audit Plan
        </Button>
      </Link>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-base font-bold text-primary bg-primary/10 px-3 py-1 rounded">
                    {entity.au_id}
                  </span>
                  <span className="text-xs bg-muted px-2 py-1 rounded">{entity.domain}</span>
                  {entity.mar_required && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-1 rounded font-medium">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> MAR Required
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-foreground">{entity.name}</h1>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Residual Level</p>
                  <ResidualBadge level={entity.residual_level} />
                </div>
                {entity.priority_score && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Priority Score</p>
                    <span className="text-xl font-bold font-mono text-foreground">
                      {entity.priority_score}
                    </span>
                  </div>
                )}
                {entity.rank && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Rank</p>
                    <span className="text-xl font-bold font-mono text-foreground">
                      #{entity.rank}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats row */}
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="w-4 h-4" />
                <span>{entity.controls?.length ?? 0} Controls</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{entity.plan_years?.filter((py) => py.is_scheduled).length ?? 0} Scheduled Years</span>
              </div>
              {entity.estimated_hours && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{entity.estimated_hours.toLocaleString()} Est. Hours</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="controls">
            Controls {entity.controls?.length ? `(${entity.controls.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="reliance">Reliance Tracker</TabsTrigger>
          <TabsTrigger value="plan-years">Plan Years</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab entity={entity} />
        </TabsContent>

        <TabsContent value="controls" className="mt-4">
          <ControlsTab controls={entity.controls ?? []} />
        </TabsContent>

        <TabsContent value="reliance" className="mt-4">
          <RelianceTrackerTab controls={entity.controls ?? []} />
        </TabsContent>

        <TabsContent value="plan-years" className="mt-4">
          <PlanYearsTab planYears={entity.plan_years ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
