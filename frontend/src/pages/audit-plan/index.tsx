import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Calendar,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Target,
  Clock,
  Filter,
  X,
  ChevronRight,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import {
  useAuditPlanEntityList,
  useAuditPlanSummary,
} from '@/generated/hooks';
import type { AuditableEntity, AuditPlanDomain, ResidualLevel } from '@/generated/models/audit-plan';

// ── Domain color map ──────────────────────────────────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  'Cybersecurity': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'Business Continuity': 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  'Claims': 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  'Third-Party Risk': 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  'Financial Reporting': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'Actuarial / ERM': 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
  'IT Infrastructure': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  'IT / SDLC': 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  'ERM / Governance': 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
  'Claims / Fraud': 'bg-red-500/15 text-red-700 dark:text-red-400',
  'Claims/UW/Agency': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'Underwriting': 'bg-lime-500/15 text-lime-700 dark:text-lime-400',
  'Data Governance': 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  'Compliance': 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400',
  'HR': 'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  'Actuarial': 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
  'Market Conduct': 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  'Legal / Governance': 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  'IT Asset Mgmt': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  'Operations': 'bg-green-500/15 text-green-700 dark:text-green-400',
  'IT Operations': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'Policy Admin': 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  'Physical Security': 'bg-gray-500/15 text-gray-700 dark:text-gray-400',
  'Governance': 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
};

const RESIDUAL_COLORS: Record<ResidualLevel, string> = {
  Critical: 'bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300/40',
  High: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-300/40',
  Medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-300/40',
  Low: 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-300/40',
};

const FISCAL_YEARS = [2026, 2027, 2028, 2029, 2030, 2031];

const ALL_DOMAINS: AuditPlanDomain[] = [
  'Cybersecurity', 'Business Continuity', 'Claims', 'Third-Party Risk',
  'Financial Reporting', 'Actuarial / ERM', 'IT Infrastructure', 'IT / SDLC',
  'ERM / Governance', 'Claims / Fraud', 'Claims/UW/Agency', 'Underwriting',
  'Data Governance', 'Compliance', 'HR', 'Actuarial', 'Market Conduct',
  'Legal / Governance', 'IT Asset Mgmt', 'Operations', 'IT Operations',
  'Policy Admin', 'Physical Security', 'Governance',
];

// Placeholder header stats (live from API once data is imported)
const HEADER_STATS = [
  { label: 'Auditable Entities', value: '79', icon: Building2, color: 'text-blue-500' },
  { label: 'Risks Mapped', value: '336', icon: AlertTriangle, color: 'text-orange-500' },
  { label: 'MAR-Relevant AUs', value: '57', icon: ShieldCheck, color: 'text-emerald-500' },
  { label: 'Audits/Year Target', value: '16', icon: Target, color: 'text-purple-500' },
  { label: '5-Year Coverage', value: '100%', icon: Calendar, color: 'text-cyan-500' },
  { label: 'GRC Controls Mapped', value: '385', icon: Clock, color: 'text-rose-500' },
];

function ResidualBadge({ level }: { level: ResidualLevel | null }) {
  if (!level) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RESIDUAL_COLORS[level]}`}>
      {level}
    </span>
  );
}

function DomainChip({ domain }: { domain: string }) {
  const color = DOMAIN_COLORS[domain] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${color}`}>
      {domain}
    </span>
  );
}

function EntityCard({ entity }: { entity: AuditableEntity }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={`/audit-plan/entities/${entity.id}`}>
        <Card className="hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer h-full">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                {entity.au_id}
              </span>
              {entity.mar_required && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  MAR
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
              {entity.name}
            </p>
            <DomainChip domain={entity.domain} />
            <div className="flex items-center justify-between mt-auto pt-1">
              <ResidualBadge level={entity.residual_level} />
              {entity.priority_score && (
                <span className="text-xs text-muted-foreground font-mono">
                  Score: {entity.priority_score}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function AuditPlanDashboard() {
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [residualFilter, setResidualFilter] = useState<string>('all');
  const [marFilter, setMarFilter] = useState<string>('all');

  const { data: entityData, isLoading: entitiesLoading } = useAuditPlanEntityList({ page_size: 100 });
  const { data: summaryData, isLoading: summaryLoading } = useAuditPlanSummary();

  const entities = entityData?.results ?? [];
  const summaries = summaryData?.results ?? [];

  const filtered = useMemo(() => {
    return entities.filter((e) => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) &&
          !e.au_id.toLowerCase().includes(search.toLowerCase())) return false;
      if (domainFilter !== 'all' && e.domain !== domainFilter) return false;
      if (residualFilter !== 'all' && e.residual_level !== residualFilter) return false;
      if (marFilter === 'yes' && !e.mar_required) return false;
      if (marFilter === 'no' && e.mar_required) return false;
      return true;
    });
  }, [entities, search, domainFilter, residualFilter, marFilter]);

  const hasFilters = search || domainFilter !== 'all' || residualFilter !== 'all' || marFilter !== 'all';

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">6-Year Integrated Audit Plan</h1>
          <p className="text-sm text-muted-foreground">FY2026–FY2031 · Risk-Based Coverage</p>
        </div>
      </div>

      {/* Summary stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {HEADER_STATS.map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`w-5 h-5 shrink-0 ${stat.color}`} />
              <div>
                <p className="text-xl font-bold text-foreground leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Year-by-year breakdown table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Year-by-Year Coverage Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {summaryLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead className="text-right">Planned Audits</TableHead>
                  <TableHead className="text-right">MAR-Required</TableHead>
                  <TableHead className="text-right">Non-MAR</TableHead>
                  <TableHead className="text-right">Avg Priority Score</TableHead>
                  <TableHead className="text-right">Est. Total Hours</TableHead>
                  <TableHead>Coverage Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.length === 0
                  ? FISCAL_YEARS.map((yr) => (
                      <TableRow key={yr}>
                        <TableCell className="font-medium">
                          <span className="font-mono text-sm">FY{yr}</span>
                          {yr === 2031 && (
                            <span className="ml-2 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                              MAR Year 6
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                        <TableCell className="text-right text-muted-foreground">—</TableCell>
                        <TableCell className="text-muted-foreground text-sm italic">Pending import</TableCell>
                      </TableRow>
                    ))
                  : summaries.map((s) => (
                      <TableRow key={s.fiscal_year}>
                        <TableCell className="font-medium">
                          <span className="font-mono text-sm">FY{s.fiscal_year}</span>
                          {s.fiscal_year === 2031 && (
                            <span className="ml-2 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                              MAR Year 6
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">{s.planned_audits}</TableCell>
                        <TableCell className="text-right text-orange-600 dark:text-orange-400">{s.mar_required_count}</TableCell>
                        <TableCell className="text-right">{s.non_mar_count}</TableCell>
                        <TableCell className="text-right font-mono">{s.avg_priority_score}</TableCell>
                        <TableCell className="text-right font-mono">{s.estimated_total_hours.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.coverage_notes || '—'}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Input
            placeholder="Search entities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-3"
          />
        </div>

        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {ALL_DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={residualFilter} onValueChange={setResidualFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Residual Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={marFilter} onValueChange={setMarFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="MAR Required" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">MAR Required</SelectItem>
            <SelectItem value="no">Non-MAR</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setDomainFilter('all');
              setResidualFilter('all');
              setMarFilter('all');
            }}
          >
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} of {entities.length} entities
        </span>
      </div>

      {/* Entity card grid */}
      {entitiesLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No entities match the current filters.</p>
          {entities.length === 0 && (
            <p className="text-sm mt-1">
              Run{' '}
              <code className="bg-muted px-1 rounded text-xs">python manage.py seed_audit_plan</code>{' '}
              then import your workbook via{' '}
              <Link to="/audit-plan/import" className="text-primary underline">Import Plan</Link>.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {filtered.map((entity) => (
            <EntityCard key={entity.id} entity={entity} />
          ))}
        </div>
      )}

      {/* Quick nav links */}
      <div className="flex flex-wrap gap-3 pt-2">
        {[
          { to: '/audit-plan/grc-themes', label: 'GRC Testing Themes', icon: ShieldCheck },
          { to: '/audit-plan/risk-scoring', label: 'Risk Scoring Engine', icon: Target },
          { to: '/audit-plan/year6', label: 'FY2031 MAR Plan', icon: Star },
        ].map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Button variant="outline" size="sm" className="gap-2">
              <Icon className="w-4 h-4" />
              {label}
              <ChevronRight className="w-3 h-3 opacity-50" />
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
