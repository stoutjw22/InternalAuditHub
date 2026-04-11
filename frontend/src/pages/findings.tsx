import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  Download,
  Upload,
  CheckSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

import {
  useFindingList,
  useControlList,
  useAuditUserList,
  useFindingOwnerList,
  useCreateFinding,
  useUpdateFinding,
  useDeleteFinding,
} from '@/generated/hooks';
import type { Finding, FindingSeverityKey } from '@/generated/models';
import { FindingSeverityKeyToLabel } from '@/generated/models';

// ── Severity options ──────────────────────────────────────────────────────────
const severityOptions: { key: FindingSeverityKey; label: string }[] = [
  { key: 'SeverityKey0', label: 'Low' },
  { key: 'SeverityKey1', label: 'Medium' },
  { key: 'SeverityKey2', label: 'High' },
];

// ── Excel helpers ─────────────────────────────────────────────────────────────
function generateExcelXML(data: Array<Record<string, string>>, headers: string[]): string {
  const escapeXml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<?mso-application progid="Excel.Sheet"?>';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
  xml += '<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E8E8E8" ss:Pattern="Solid"/></Style></Styles>';
  xml += '<Worksheet ss:Name="Findings"><Table>';

  xml += '<Row>';
  headers.forEach(h => {
    xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
  });
  xml += '</Row>';

  data.forEach(row => {
    xml += '<Row>';
    headers.forEach(h => {
      xml += `<Cell><Data ss:Type="String">${escapeXml(row[h] || '')}</Data></Cell>`;
    });
    xml += '</Row>';
  });

  xml += '</Table></Worksheet></Workbook>';
  return xml;
}

function parseExcelXML(xmlString: string): Array<Record<string, string>> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const rows = doc.querySelectorAll('Row');
  const result: Array<Record<string, string>> = [];

  if (rows.length < 2) return result;

  const headerCells = rows[0].querySelectorAll('Cell Data');
  const headers: string[] = [];
  headerCells.forEach(cell => headers.push(cell.textContent || ''));

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('Cell Data');
    const rowData: Record<string, string> = {};
    cells.forEach((cell, idx) => {
      if (headers[idx]) {
        rowData[headers[idx]] = cell.textContent || '';
      }
    });
    if (Object.keys(rowData).length > 0) {
      result.push(rowData);
    }
  }

  return result;
}

// ── Local types ───────────────────────────────────────────────────────────────
interface FindingFormData {
  findingtitle: string;
  recommendation?: string;
  severityKey?: FindingSeverityKey;
  controlId?: string;
  auditUserId?: string;
  findingOwnerId?: string;
}

type SortField = 'findingtitle' | 'severity' | 'control' | 'owner';
type SortDirection = 'asc' | 'desc' | null;

export default function FindingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [deleteFinding, setDeleteFinding] = useState<Finding | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { data: findings = [], isLoading } = useFindingList();
  const { data: controls = [] } = useControlList();
  const { data: auditUsers = [] } = useAuditUserList();
  const { data: findingOwners = [] } = useFindingOwnerList();
  const createMutation = useCreateFinding();
  const updateMutation = useUpdateFinding();
  const deleteMutation = useDeleteFinding();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FindingFormData>();

  const filteredAndSortedFindings = useMemo(() => {
    let result = findings.filter(finding =>
      finding.findingtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      finding.recommendation?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply severity filter
    if (severityFilter !== 'all') {
      result = result.filter(finding => finding.severityKey === severityFilter);
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let aVal: string;
        let bVal: string;

        switch (sortField) {
          case 'findingtitle':
            aVal = a.findingtitle.toLowerCase();
            bVal = b.findingtitle.toLowerCase();
            break;
          case 'severity':
            aVal = a.severityKey || '';
            bVal = b.severityKey || '';
            break;
          case 'control':
            aVal = (a.controlname?.controlname || '').toLowerCase();
            bVal = (b.controlname?.controlname || '').toLowerCase();
            break;
          case 'owner':
            aVal = (a.findingownername?.findingownername || '').toLowerCase();
            bVal = (b.findingownername?.findingownername || '').toLowerCase();
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [findings, searchQuery, severityFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-40" />;
    if (sortDirection === 'asc') return <ArrowUp className="w-4 h-4 ml-1" />;
    return <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSeverityFilter('all');
    setSortField(null);
    setSortDirection(null);
  };

  const hasActiveFilters = searchQuery || severityFilter !== 'all' || sortField;

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredAndSortedFindings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedFindings.map(f => f.id)));
    }
  }, [selectedIds.size, filteredAndSortedFindings]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = filteredAndSortedFindings.length > 0 && selectedIds.size === filteredAndSortedFindings.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredAndSortedFindings.length;

  // Excel Export
  const exportToExcel = useCallback(() => {
    const dataToExport = selectedIds.size > 0
      ? filteredAndSortedFindings.filter(f => selectedIds.has(f.id))
      : filteredAndSortedFindings;

    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Finding Title', 'Recommendation', 'Severity', 'Control', 'Owner'];
    const rows = dataToExport.map(finding => ({
      'Finding Title': finding.findingtitle,
      'Recommendation': finding.recommendation || '',
      'Severity': finding.severityKey ? FindingSeverityKeyToLabel[finding.severityKey] : '',
      'Control': finding.controlname?.controlname || '',
      'Owner': finding.findingownername?.findingownername || ''
    }));

    const xmlContent = generateExcelXML(rows, headers);
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `findings-export-${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success(`Exported ${dataToExport.length} finding${dataToExport.length !== 1 ? 's' : ''} to Excel`);
  }, [filteredAndSortedFindings, selectedIds]);

  // CSV Export
  const exportToCSV = useCallback(() => {
    const dataToExport = selectedIds.size > 0
      ? filteredAndSortedFindings.filter(f => selectedIds.has(f.id))
      : filteredAndSortedFindings;

    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Finding Title', 'Recommendation', 'Severity', 'Control', 'Owner'];
    const rows = dataToExport.map(finding => [
      finding.findingtitle,
      finding.recommendation || '',
      finding.severityKey ? FindingSeverityKeyToLabel[finding.severityKey] : '',
      finding.controlname?.controlname || '',
      finding.findingownername?.findingownername || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `findings-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success(`Exported ${dataToExport.length} finding${dataToExport.length !== 1 ? 's' : ''} to CSV`);
  }, [filteredAndSortedFindings, selectedIds]);

  // Excel Import
  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    
    try {
      const text = await file.text();
      let importedData: Array<Record<string, string>> = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          toast.error('No data found in CSV file');
          return;
        }
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].match(/("[^"]*"|[^,]+)/g) || [];
          const row: Record<string, string> = {};
          values.forEach((val, idx) => {
            if (headers[idx]) {
              row[headers[idx]] = val.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
            }
          });
          if (row['Finding Title']) {
            importedData.push(row);
          }
        }
      } else {
        // Parse Excel XML
        importedData = parseExcelXML(text);
      }

      if (importedData.length === 0) {
        toast.error('No valid data found in file');
        return;
      }

      // Create findings from imported data
      let successCount = 0;
      let errorCount = 0;

      for (const row of importedData) {
        const findingTitle = row['Finding Title'];
        if (!findingTitle) continue;

        // Find matching control and owner by name
        const matchingControl = controls.find(c => 
          c.controlname.toLowerCase() === (row['Control'] || '').toLowerCase()
        );
        const matchingOwner = findingOwners.find(o => 
          o.findingownername.toLowerCase() === (row['Owner'] || '').toLowerCase()
        );
        const matchingSeverity = severityOptions.find(s =>
          s.label.toLowerCase() === (row['Severity'] || '').toLowerCase()
        );

        try {
          await createMutation.mutateAsync({
            findingtitle: findingTitle,
            recommendation: row['Recommendation'] || undefined,
            severityKey: matchingSeverity?.key,
            controlname: matchingControl ? { id: matchingControl.id, controlname: matchingControl.controlname } : undefined,
            findingownername: matchingOwner ? { id: matchingOwner.id, findingownername: matchingOwner.findingownername } : undefined,
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} finding${successCount !== 1 ? 's' : ''} successfully`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} finding${errorCount !== 1 ? 's' : ''}`);
      }
    } catch {
      toast.error('Failed to parse file');
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  }, [createMutation, controls, findingOwners]);

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id))
      );
      toast.success(`Deleted ${selectedIds.size} finding${selectedIds.size !== 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    } catch {
      toast.error('Failed to delete some findings');
    }
  };

  const openCreateDialog = () => {
    setEditingFinding(null);
    reset({ findingtitle: '', recommendation: '', severityKey: undefined, controlId: '', auditUserId: '', findingOwnerId: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (finding: Finding) => {
    setEditingFinding(finding);
    reset({
      findingtitle: finding.findingtitle,
      recommendation: finding.recommendation || '',
      severityKey: finding.severityKey,
      controlId: finding.controlname?.id || '',
      auditUserId: finding.auditusername?.id || '',
      findingOwnerId: finding.findingownername?.id || '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: FindingFormData) => {
    try {
      const control = controls.find(c => c.id === data.controlId);
      const auditUser = auditUsers.find(u => u.id === data.auditUserId);
      const findingOwner = findingOwners.find(o => o.id === data.findingOwnerId);
      
      const payload = {
        findingtitle: data.findingtitle,
        recommendation: data.recommendation,
        severityKey: data.severityKey,
        controlname: control ? { id: control.id, controlname: control.controlname } : undefined,
        auditusername: auditUser ? { id: auditUser.id, auditusername: auditUser.auditusername } : undefined,
        findingownername: findingOwner ? { id: findingOwner.id, findingownername: findingOwner.findingownername } : undefined,
      };

      if (editingFinding) {
        await updateMutation.mutateAsync({ id: editingFinding.id, changedFields: payload });
        toast.success('Finding updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Finding created successfully');
      }
      setIsDialogOpen(false);
      reset();
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!deleteFinding) return;
    try {
      await deleteMutation.mutateAsync(deleteFinding.id);
      toast.success('Finding deleted successfully');
      setDeleteFinding(null);
    } catch {
      toast.error('Failed to delete finding');
    }
  };

  const selectedSeverity = watch('severityKey');
  const selectedControlId = watch('controlId');
  const selectedAuditUserId = watch('auditUserId');
  const selectedFindingOwnerId = watch('findingOwnerId');

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' as const }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-chart-3/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-chart-3" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Audit Findings
              </h1>
              <p className="text-muted-foreground text-sm">
                {findings.length} finding{findings.length !== 1 ? 's' : ''} logged
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv,.xls,.xml"
                className="hidden"
                onChange={handleImport}
                disabled={isImporting}
              />
              <Button variant="outline" className="gap-2" asChild disabled={isImporting}>
                <span>
                  {isImporting ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                  Import
                </span>
              </Button>
            </label>
            <Button variant="outline" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Log Finding
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-chart-3/20 bg-chart-3/5 shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-chart-3" />
                    <span className="font-medium text-foreground">
                      {selectedIds.size} finding{selectedIds.size !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Export Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkDeleteDialog(true)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Selected
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search and Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search findings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    {severityOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="w-8 h-8" />
              </div>
            ) : filteredAndSortedFindings.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="font-medium text-foreground">No findings found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || severityFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by logging your first finding'}
                </p>
                {!searchQuery && severityFilter === 'all' && (
                  <Button onClick={openCreateDialog} className="gap-2 mt-4">
                    <Plus className="w-4 h-4" />
                    Log Finding
                  </Button>
                )}
                {(searchQuery || severityFilter !== 'all') && (
                  <Button variant="outline" onClick={clearFilters} className="gap-2 mt-4">
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                        className={isSomeSelected ? 'data-[state=checked]:bg-chart-3/50' : ''}
                      />
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('findingtitle')}
                    >
                      <div className="flex items-center">
                        Finding Title
                        {getSortIcon('findingtitle')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('severity')}
                    >
                      <div className="flex items-center">
                        Severity
                        {getSortIcon('severity')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('control')}
                    >
                      <div className="flex items-center">
                        Control
                        {getSortIcon('control')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('owner')}
                    >
                      <div className="flex items-center">
                        Owner
                        {getSortIcon('owner')}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredAndSortedFindings.map((finding, index) => (
                      <motion.tr
                        key={finding.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${selectedIds.has(finding.id) ? 'bg-chart-3/5' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(finding.id)}
                            onCheckedChange={() => toggleSelect(finding.id)}
                            aria-label={`Select ${finding.findingtitle}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{finding.findingtitle}</p>
                            {finding.recommendation && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {finding.recommendation}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSeverityColor(finding.severityKey)}>
                            {finding.severityKey ? FindingSeverityKeyToLabel[finding.severityKey] : 'Unset'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {finding.controlname?.controlname || (
                            <span className="text-muted-foreground italic">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {finding.findingownername?.findingownername || (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(finding)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteFinding(finding)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingFinding ? 'Edit Finding' : 'Log New Finding'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="findingtitle">Finding Title *</Label>
              <Input
                id="findingtitle"
                {...register('findingtitle', { required: 'Finding title is required' })}
                placeholder="Enter finding title"
              />
              {errors.findingtitle && (
                <p className="text-sm text-destructive">{errors.findingtitle.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={selectedSeverity || ''}
                onValueChange={(value) => setValue('severityKey', value as FindingSeverityKey)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recommendation">Recommendation</Label>
              <Textarea
                id="recommendation"
                {...register('recommendation')}
                placeholder="Enter recommendation"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="control">Control</Label>
                <Select
                  value={selectedControlId || ''}
                  onValueChange={(value) => setValue('controlId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select control" />
                  </SelectTrigger>
                  <SelectContent>
                    {controls.map((control) => (
                      <SelectItem key={control.id} value={control.id}>
                        {control.controlname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="auditUser">Audit User</Label>
                <Select
                  value={selectedAuditUserId || ''}
                  onValueChange={(value) => setValue('auditUserId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {auditUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.auditusername}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="findingOwner">Finding Owner</Label>
              <Select
                value={selectedFindingOwnerId || ''}
                onValueChange={(value) => setValue('findingOwnerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {findingOwners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.findingownername}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Spinner className="w-4 h-4 mr-2" />}
                {editingFinding ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteFinding} onOpenChange={(open) => !open && setDeleteFinding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Finding</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteFinding?.findingtitle}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Finding{selectedIds.size !== 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected finding{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
              Delete {selectedIds.size} Finding{selectedIds.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
