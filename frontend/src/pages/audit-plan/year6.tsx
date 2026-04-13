import { motion } from 'motion/react';
import { Star, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useAuditPlanMarEngagements,
  useAuditPlanEntityList,
} from '@/generated/hooks';
import type { ResidualLevel } from '@/generated/models/audit-plan';
import { Link } from 'react-router-dom';

const RESIDUAL_COLORS: Record<ResidualLevel, string> = {
  Critical: 'bg-red-500/20 text-red-700 dark:text-red-400',
  High: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
  Medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  Low: 'bg-green-500/20 text-green-700 dark:text-green-400',
};

function ResidualBadge({ level }: { level: ResidualLevel | null }) {
  if (!level) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${RESIDUAL_COLORS[level]}`}>
      {level}
    </span>
  );
}

function TestTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted-foreground text-xs">—</span>;
  const colors: Record<string, string> = {
    'Design + Effectiveness': 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    'Effectiveness': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    'Inspection': 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${colors[type] ?? 'bg-muted text-muted-foreground'}`}>
      {type}
    </span>
  );
}

export default function Year6Page() {
  const { data: marData, isLoading: marLoading } = useAuditPlanMarEngagements({
    fiscal_year: 2031,
    page_size: 100,
  });
  const { data: entityData, isLoading: entitiesLoading } = useAuditPlanEntityList({
    mar_required: true,
    page_size: 100,
  });

  const engagements = marData?.results ?? [];
  const marEntities = (entityData?.results ?? [])
    .filter((e) => e.mar_required)
    .sort((a, b) => {
      const rankA = a.priority_score ? parseFloat(a.priority_score) : 0;
      const rankB = b.priority_score ? parseFloat(b.priority_score) : 0;
      return rankB - rankA;
    });

  const totalHours = engagements.reduce((s, e) => s + (e.estimated_hours ?? 0), 0);
  const totalControls = engagements.reduce((s, e) => s + (e.control_count ?? 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Star className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">FY2031 — Year 6 MAR Testing Plan</h1>
          <p className="text-sm text-muted-foreground">
            Annual MAR engagements and risk-based audit candidates for fiscal year 2031
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{engagements.length || '—'}</p>
            <p className="text-sm text-muted-foreground mt-1">MAR Engagements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{totalControls || '—'}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Controls</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">
              {totalHours ? totalHours.toLocaleString() : '—'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Est. Total Hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Section A: MAR Testing Engagements */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              Section A — Annual MAR Testing Engagements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {marLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : engagements.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">
                No MAR engagements loaded. Import your workbook via the Import Plan page.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MAR Test Area</TableHead>
                    <TableHead>Control Theme</TableHead>
                    <TableHead className="text-right"># Controls</TableHead>
                    <TableHead>AU Scope</TableHead>
                    <TableHead>Test Type</TableHead>
                    <TableHead className="text-right">Sample Size</TableHead>
                    <TableHead>Quarter</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Est. Hours</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engagements.map((eng) => (
                    <TableRow key={eng.id}>
                      <TableCell className="font-medium text-sm">{eng.mar_test_area}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{eng.control_theme}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {eng.control_count ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px]">
                        <span className="line-clamp-2">{eng.au_scope ?? '—'}</span>
                      </TableCell>
                      <TableCell><TestTypeBadge type={eng.test_type} /></TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {eng.sample_size ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">{eng.quarter ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {eng.assigned_to ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {eng.estimated_hours ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[140px]">
                        <span className="line-clamp-2">{eng.notes ?? '—'}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Section B: Risk-Based Audit Candidates */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              Section B — Risk-Based Audit Candidates (MAR-Relevant AUs)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {entitiesLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : marEntities.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">
                No MAR-required entities found. Import your workbook to populate.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>AU ID</TableHead>
                    <TableHead>Audit Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-right">Priority Score</TableHead>
                    <TableHead>Residual Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marEntities.map((entity, idx) => (
                    <TableRow key={entity.id}>
                      <TableCell className="text-center text-muted-foreground text-sm">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Link to={`/audit-plan/entities/${entity.id}`}>
                          <span className="font-mono text-xs font-bold text-primary hover:underline">
                            {entity.au_id}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{entity.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entity.domain}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {entity.priority_score ?? '—'}
                      </TableCell>
                      <TableCell>
                        <ResidualBadge level={entity.residual_level} />
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
  );
}
