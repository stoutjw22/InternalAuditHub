import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { useAuditPlanGrcThemes } from '@/generated/hooks';
import type { GRCTestingTheme } from '@/generated/models/audit-plan';

const LAYER_COLORS: Record<string, string> = {
  GOVERNANCE: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  OPERATIONS: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  TECHNOLOGY: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  COMPLIANCE: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  FINANCIAL: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

function LayerBadge({ layer }: { layer: string }) {
  const color = LAYER_COLORS[layer.toUpperCase()] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide uppercase ${color}`}>
      {layer}
    </span>
  );
}

function ThemeGroup({
  layer,
  themes,
}: {
  layer: string;
  themes: GRCTestingTheme[];
}) {
  const [expanded, setExpanded] = useState(true);
  const totalControls = themes.reduce((sum, t) => sum + (t.control_count ?? 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <LayerBadge layer={layer} />
            <span className="font-medium text-foreground">{layer}</span>
            <span className="text-xs text-muted-foreground">
              {themes.length} sub-themes · {totalControls} controls
            </span>
          </div>
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>

        {expanded && (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Code</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Sub-Theme</TableHead>
                  <TableHead className="text-right w-20"># Controls</TableHead>
                  <TableHead>Control Types</TableHead>
                  <TableHead>Key Evidence</TableHead>
                  <TableHead className="w-32">Planned Years</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {themes.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      {t.sub_theme_code}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.domain}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{t.sub_theme_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {t.control_count ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.control_types ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[240px]">
                      {t.key_evidence ? (
                        <span className="line-clamp-2">{t.key_evidence}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.planned_audit_years ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

export default function GrcThemesPage() {
  const [search, setSearch] = useState('');
  const [layerFilter, setLayerFilter] = useState('all');

  const { data, isLoading } = useAuditPlanGrcThemes({ page_size: 200 });
  const themes = data?.results ?? [];

  const layers = useMemo(
    () => Array.from(new Set(themes.map((t) => t.layer))).sort(),
    [themes],
  );

  const filtered = useMemo(() => {
    return themes.filter((t) => {
      if (layerFilter !== 'all' && t.layer !== layerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.sub_theme_code.toLowerCase().includes(q) ||
          t.sub_theme_name.toLowerCase().includes(q) ||
          t.domain.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [themes, search, layerFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, GRCTestingTheme[]>();
    for (const t of filtered) {
      if (!map.has(t.layer)) map.set(t.layer, []);
      map.get(t.layer)!.push(t);
    }
    return map;
  }, [filtered]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">GRC Testing Themes</h1>
          <p className="text-sm text-muted-foreground">
            All testing sub-themes across governance, operations, and compliance layers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search themes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={layerFilter} onValueChange={setLayerFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Layer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Layers</SelectItem>
            {layers.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} sub-themes across {grouped.size} layers
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : themes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No GRC themes loaded yet.</p>
          <p className="text-sm mt-1">Import your workbook via the Import Plan page.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No themes match the current filter.</p>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([layer, layerThemes]) => (
            <ThemeGroup key={layer} layer={layer} themes={layerThemes} />
          ))}
        </div>
      )}
    </div>
  );
}
