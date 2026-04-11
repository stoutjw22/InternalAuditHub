import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  History,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  AlertTriangle,
  ClipboardCheck,
  Eye,
  Calendar,
  User,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuditLogList } from '@/generated/hooks';
import { AuditLogActiontypeKeyToLabel, type AuditLog, type AuditLogActiontypeKey } from '@/generated/models';
import { format, parseISO } from 'date-fns';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
} as const;

type SortField = 'changetimestamp' | 'entityname' | 'actiontypeKey' | 'changedby';
type SortDirection = 'asc' | 'desc';

const entityIcons: Record<string, typeof History> = {
  Risk: AlertTriangle,
  Control: Shield,
  Finding: FileText,
  ApprovalRequest: ClipboardCheck,
};

const actionColors: Record<AuditLogActiontypeKey, string> = {
  ActiontypeKey0: 'bg-accent/15 text-accent border-accent/30',
  ActiontypeKey1: 'bg-primary/15 text-primary border-primary/30',
  ActiontypeKey2: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
  ActiontypeKey3: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function AuditLogsPage() {
  const { data: auditLogsData, isLoading } = useAuditLogList();
  const auditLogs = auditLogsData?.results ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('changetimestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const entities = useMemo(() => {
    const unique = new Set(auditLogs.map((log) => log.entityname));
    return Array.from(unique).sort();
  }, [auditLogs]);

  const filteredAndSortedLogs = useMemo(() => {
    let result = [...auditLogs];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.entityname.toLowerCase().includes(query) ||
          log.changedby.toLowerCase().includes(query) ||
          log.fieldname?.toLowerCase().includes(query) ||
          log.oldvalue?.toLowerCase().includes(query) ||
          log.newvalue?.toLowerCase().includes(query) ||
          log.recordid.toLowerCase().includes(query)
      );
    }

    // Apply entity filter
    if (entityFilter !== 'all') {
      result = result.filter((log) => log.entityname === entityFilter);
    }

    // Apply action filter
    if (actionFilter !== 'all') {
      result = result.filter((log) => log.actiontypeKey === actionFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'changetimestamp':
          comparison = new Date(a.changetimestamp).getTime() - new Date(b.changetimestamp).getTime();
          break;
        case 'entityname':
          comparison = a.entityname.localeCompare(b.entityname);
          break;
        case 'actiontypeKey':
          comparison = a.actiontypeKey.localeCompare(b.actiontypeKey);
          break;
        case 'changedby':
          comparison = a.changedby.localeCompare(b.changedby);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [auditLogs, searchQuery, entityFilter, actionFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setEntityFilter('all');
    setActionFilter('all');
  };

  const hasActiveFilters = searchQuery || entityFilter !== 'all' || actionFilter !== 'all';

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(parseISO(timestamp), 'MMM d, yyyy h:mm a');
    } catch {
      return timestamp;
    }
  };

  const getEntityIcon = (entityName: string) => {
    const Icon = entityIcons[entityName] || History;
    return Icon;
  };

  const getLinkedEntityName = (log: AuditLog): string | null => {
    if (log.risk?.riskname) return log.risk.riskname;
    if (log.control?.controlname) return log.control.controlname;
    if (log.finding?.findingtitle) return log.finding.findingtitle;
    if (log.approvalrequest?.requesttitle) return log.approvalrequest.requesttitle;
    return null;
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = auditLogs.filter((log) => new Date(log.changetimestamp) >= today);
    const creates = auditLogs.filter((log) => log.actiontypeKey === 'ActiontypeKey0').length;
    const updates = auditLogs.filter((log) => log.actiontypeKey === 'ActiontypeKey1').length;
    const approvals = auditLogs.filter(
      (log) => log.actiontypeKey === 'ActiontypeKey2' || log.actiontypeKey === 'ActiontypeKey3'
    ).length;

    return {
      total: auditLogs.length,
      today: todayLogs.length,
      creates,
      updates,
      approvals,
    };
  }, [auditLogs]);

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
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              Audit Trail
            </h1>
            <p className="text-muted-foreground">
              Track all changes to risks, controls, findings, and approvals
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Logs', value: stats.total, color: 'bg-muted' },
            { label: 'Today', value: stats.today, color: 'bg-chart-3/10' },
            { label: 'Creates', value: stats.creates, color: 'bg-accent/10' },
            { label: 'Updates', value: stats.updates, color: 'bg-primary/10' },
            { label: 'Approvals', value: stats.approvals, color: 'bg-chart-4/10' },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mb-2`}>
                  <span className="text-sm font-bold text-foreground">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by entity, user, field, or value..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-border/50"
                  />
                </div>

                {/* Filter Popover (Mobile) */}
                <div className="md:hidden">
                  <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full gap-2">
                        <Filter className="w-4 h-4" />
                        Filters
                        {hasActiveFilters && (
                          <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                            {(entityFilter !== 'all' ? 1 : 0) + (actionFilter !== 'all' ? 1 : 0)}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Entity</label>
                        <Select value={entityFilter} onValueChange={setEntityFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All entities" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All entities</SelectItem>
                            {entities.map((entity) => (
                              <SelectItem key={entity} value={entity}>
                                {entity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Action</label>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All actions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All actions</SelectItem>
                            {Object.entries(AuditLogActiontypeKeyToLabel).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                          Clear filters
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Desktop Filters */}
                <div className="hidden md:flex gap-3">
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All entities</SelectItem>
                      {entities.map((entity) => (
                        <SelectItem key={entity} value={entity}>
                          {entity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actions</SelectItem>
                      {Object.entries(AuditLogActiontypeKeyToLabel).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="icon" onClick={clearFilters}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="font-display text-lg flex items-center justify-between">
                <span>Change History</span>
                <Badge variant="secondary" className="font-normal">
                  {filteredAndSortedLogs.length} records
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredAndSortedLogs.length === 0 ? (
                <div className="text-center py-20">
                  <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No audit logs found</p>
                  {hasActiveFilters && (
                    <Button variant="ghost" onClick={clearFilters} className="mt-2">
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('changetimestamp')}
                        >
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Timestamp
                            {sortField === 'changetimestamp' &&
                              (sortDirection === 'desc' ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronUp className="w-4 h-4" />
                              ))}
                            {sortField !== 'changetimestamp' && <ArrowUpDown className="w-3 h-3 opacity-50" />}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('entityname')}
                        >
                          <div className="flex items-center gap-1">
                            Entity
                            {sortField === 'entityname' &&
                              (sortDirection === 'desc' ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronUp className="w-4 h-4" />
                              ))}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('actiontypeKey')}
                        >
                          <div className="flex items-center gap-1">
                            Action
                            {sortField === 'actiontypeKey' &&
                              (sortDirection === 'desc' ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronUp className="w-4 h-4" />
                              ))}
                          </div>
                        </TableHead>
                        <TableHead className="hidden md:table-cell">Field</TableHead>
                        <TableHead
                          className="cursor-pointer hover:text-foreground transition-colors hidden lg:table-cell"
                          onClick={() => handleSort('changedby')}
                        >
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            Changed By
                            {sortField === 'changedby' &&
                              (sortDirection === 'desc' ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronUp className="w-4 h-4" />
                              ))}
                          </div>
                        </TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedLogs.map((log, index) => {
                        const EntityIcon = getEntityIcon(log.entityname);
                        const linkedName = getLinkedEntityName(log);

                        return (
                          <motion.tr
                            key={log.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02, duration: 0.2 }}
                            className="group hover:bg-muted/50 cursor-pointer border-b border-border/50"
                            onClick={() => setSelectedLog(log)}
                          >
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {formatTimestamp(log.changetimestamp)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                                  <EntityIcon className="w-4 h-4 text-foreground" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{log.entityname}</p>
                                  {linkedName && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                      {linkedName}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`font-medium ${actionColors[log.actiontypeKey]}`}
                              >
                                {AuditLogActiontypeKeyToLabel[log.actiontypeKey]}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {log.fieldname ? (
                                <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                                  {log.fieldname}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">
                              {log.changedby}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              Audit Log Details
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 mt-4">
              {/* Action Badge */}
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`text-sm px-3 py-1 ${actionColors[selectedLog.actiontypeKey]}`}
                >
                  {AuditLogActiontypeKeyToLabel[selectedLog.actiontypeKey]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatTimestamp(selectedLog.changetimestamp)}
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Entity</p>
                  <p className="font-medium text-foreground">{selectedLog.entityname}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Changed By</p>
                  <p className="font-medium text-foreground">{selectedLog.changedby}</p>
                </div>
                {selectedLog.fieldname && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Field</p>
                    <p className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                      {selectedLog.fieldname}
                    </p>
                  </div>
                )}
              </div>

              {/* Linked Entity */}
              {getLinkedEntityName(selectedLog) && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Related Record</p>
                  <p className="font-medium text-foreground">{getLinkedEntityName(selectedLog)}</p>
                  <p className="text-xs font-mono text-muted-foreground">{selectedLog.recordid}</p>
                </div>
              )}

              {/* Value Changes */}
              {(selectedLog.oldvalue || selectedLog.newvalue) && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Value Change</p>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedLog.oldvalue && (
                      <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <p className="text-xs text-destructive font-medium mb-1">Old Value</p>
                        <p className="text-sm text-foreground break-words">{selectedLog.oldvalue}</p>
                      </div>
                    )}
                    {selectedLog.newvalue && (
                      <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
                        <p className="text-xs text-accent font-medium mb-1">New Value</p>
                        <p className="text-sm text-foreground break-words">{selectedLog.newvalue}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
