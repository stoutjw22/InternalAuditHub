import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Plus, Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Download, Upload, CheckSquare, FileSpreadsheet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  useRiskList,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
  useRiskOwnerList,
} from '@/generated/hooks';
import type { Risk, RiskLikelihood, RiskImpact, RiskRating } from '@/generated/models';

// Risk assessment options
const LIKELIHOOD_OPTIONS: { value: RiskLikelihood; label: string; order: number }[] = [
  { value: 'rare', label: 'Rare', order: 1 },
  { value: 'unlikely', label: 'Unlikely', order: 2 },
  { value: 'possible', label: 'Possible', order: 3 },
  { value: 'likely', label: 'Likely', order: 4 },
  { value: 'almost_certain', label: 'Almost Certain', order: 5 },
];

const IMPACT_OPTIONS: { value: RiskImpact; label: string; order: number }[] = [
  { value: 'insignificant', label: 'Insignificant', order: 1 },
  { value: 'minor', label: 'Minor', order: 2 },
  { value: 'moderate', label: 'Moderate', order: 3 },
  { value: 'major', label: 'Major', order: 4 },
  { value: 'catastrophic', label: 'Catastrophic', order: 5 },
];

const RATING_OPTIONS: { value: RiskRating; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-700 dark:text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
];

// Calculate risk rating from likelihood and impact
function calculateRiskRating(likelihood?: RiskLikelihood, impact?: RiskImpact): RiskRating | undefined {
  if (!likelihood || !impact) return undefined;
  const likelihoodOrder = LIKELIHOOD_OPTIONS.find(l => l.value === likelihood)?.order || 0;
  const impactOrder = IMPACT_OPTIONS.find(i => i.value === impact)?.order || 0;
  const score = likelihoodOrder * impactOrder;
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 16) return 'high';
  return 'critical';
}

function RatingBadge({ rating }: { rating?: RiskRating }) {
  if (!rating) return <span className="text-muted-foreground italic text-sm">—</span>;
  const config = RATING_OPTIONS.find(r => r.value === rating);
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${config?.color || ''}`}>
      {config?.label || rating}
    </span>
  );
}
// Excel XML generation helper
function generateExcelXML(data: Array<Record<string, string>>, headers: string[]): string {
  const escapeXml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<?mso-application progid="Excel.Sheet"?>';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
  xml += '<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E8E8E8" ss:Pattern="Solid"/></Style></Styles>';
  xml += '<Worksheet ss:Name="Risks"><Table>';
  
  // Header row
  xml += '<Row>';
  headers.forEach(h => {
    xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
  });
  xml += '</Row>';
  
  // Data rows
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

// Parse Excel XML helper
function parseExcelXML(xmlString: string): Array<Record<string, string>> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  const rows = doc.querySelectorAll('Row');
  const result: Array<Record<string, string>> = [];
  
  if (rows.length < 2) return result;
  
  // Get headers from first row
  const headerCells = rows[0].querySelectorAll('Cell Data');
  const headers: string[] = [];
  headerCells.forEach(cell => headers.push(cell.textContent || ''));
  
  // Parse data rows
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

interface RiskFormData {
  riskname: string;
  description?: string;
  riskownerId?: string;
  inherentLikelihood?: RiskLikelihood;
  inherentImpact?: RiskImpact;
  residualLikelihood?: RiskLikelihood;
  residualImpact?: RiskImpact;
}

type SortField = 'riskname' | 'description' | 'owner' | 'inherentRating' | 'residualRating';
type SortDirection = 'asc' | 'desc' | null;
export default function RisksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [deleteRisk, setDeleteRisk] = useState<Risk | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const [isImporting, setIsImporting] = useState(false);
  const { data: risks = [], isLoading } = useRiskList();
  const { data: riskOwners = [] } = useRiskOwnerList();
  const createMutation = useCreateRisk();
  const updateMutation = useUpdateRisk();
  const deleteMutation = useDeleteRisk();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RiskFormData>();

  const filteredAndSortedRisks = useMemo(() => {
    let result = risks.filter(risk =>
      risk.riskname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply owner filter
    if (ownerFilter !== 'all') {
      if (ownerFilter === 'unassigned') {
        result = result.filter(risk => !risk.riskownername);
      } else {
        result = result.filter(risk => risk.riskownername?.id === ownerFilter);
      }
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let aVal: string;
        let bVal: string;

        switch (sortField) {
          case 'riskname':
            aVal = a.riskname.toLowerCase();
            bVal = b.riskname.toLowerCase();
            break;
          case 'description':
            aVal = (a.description || '').toLowerCase();
            bVal = (b.description || '').toLowerCase();
            break;
          case 'owner':
            aVal = (a.riskownername?.riskownername || '').toLowerCase();
            bVal = (b.riskownername?.riskownername || '').toLowerCase();
            break;
          case 'inherentRating': {
            const aRating = RATING_OPTIONS.findIndex(r => r.value === a.inherentRating);
            const bRating = RATING_OPTIONS.findIndex(r => r.value === b.inherentRating);
            return sortDirection === 'asc' ? aRating - bRating : bRating - aRating;
          }
          case 'residualRating': {
            const aRating = RATING_OPTIONS.findIndex(r => r.value === a.residualRating);
            const bRating = RATING_OPTIONS.findIndex(r => r.value === b.residualRating);
            return sortDirection === 'asc' ? aRating - bRating : bRating - aRating;
          }
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [risks, searchQuery, ownerFilter, sortField, sortDirection]);

  const openCreateDialog = () => {
    setEditingRisk(null);
    reset({ 
      riskname: '', 
      description: '', 
      riskownerId: '',
      inherentLikelihood: undefined,
      inherentImpact: undefined,
      residualLikelihood: undefined,
      residualImpact: undefined,
    });
    setIsDialogOpen(true);
  };

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
    setOwnerFilter('all');
    setSortField(null);
    setSortDirection(null);
  };

  const hasActiveFilters = searchQuery || ownerFilter !== 'all' || sortField;

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredAndSortedRisks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedRisks.map(r => r.id)));
    }
  }, [selectedIds.size, filteredAndSortedRisks]);

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

  const isAllSelected = filteredAndSortedRisks.length > 0 && selectedIds.size === filteredAndSortedRisks.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredAndSortedRisks.length;

  // Excel Export
  const exportToExcel = useCallback(() => {
    const dataToExport = selectedIds.size > 0
      ? filteredAndSortedRisks.filter(r => selectedIds.has(r.id))
      : filteredAndSortedRisks;

    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Risk Name', 'Description', 'Owner', 'Inherent Likelihood', 'Inherent Impact', 'Inherent Rating', 'Residual Likelihood', 'Residual Impact', 'Residual Rating'];
    const rows = dataToExport.map(risk => ({
      'Risk Name': risk.riskname,
      'Description': risk.description || '',
      'Owner': risk.riskownername?.riskownername || '',
      'Inherent Likelihood': LIKELIHOOD_OPTIONS.find(l => l.value === risk.inherentLikelihood)?.label || '',
      'Inherent Impact': IMPACT_OPTIONS.find(i => i.value === risk.inherentImpact)?.label || '',
      'Inherent Rating': RATING_OPTIONS.find(r => r.value === risk.inherentRating)?.label || '',
      'Residual Likelihood': LIKELIHOOD_OPTIONS.find(l => l.value === risk.residualLikelihood)?.label || '',
      'Residual Impact': IMPACT_OPTIONS.find(i => i.value === risk.residualImpact)?.label || '',
      'Residual Rating': RATING_OPTIONS.find(r => r.value === risk.residualRating)?.label || ''
    }));

    const xmlContent = generateExcelXML(rows, headers);
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `risks-export-${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success(`Exported ${dataToExport.length} risk${dataToExport.length !== 1 ? 's' : ''} to Excel`);
  }, [filteredAndSortedRisks, selectedIds]);

  // CSV Export (keep for compatibility)
  const exportToCSV = useCallback(() => {
    const dataToExport = selectedIds.size > 0
      ? filteredAndSortedRisks.filter(r => selectedIds.has(r.id))
      : filteredAndSortedRisks;

    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Risk Name', 'Description', 'Owner', 'Inherent Likelihood', 'Inherent Impact', 'Inherent Rating', 'Residual Likelihood', 'Residual Impact', 'Residual Rating'];
    const rows = dataToExport.map(risk => [
      risk.riskname,
      risk.description || '',
      risk.riskownername?.riskownername || '',
      LIKELIHOOD_OPTIONS.find(l => l.value === risk.inherentLikelihood)?.label || '',
      IMPACT_OPTIONS.find(i => i.value === risk.inherentImpact)?.label || '',
      RATING_OPTIONS.find(r => r.value === risk.inherentRating)?.label || '',
      LIKELIHOOD_OPTIONS.find(l => l.value === risk.residualLikelihood)?.label || '',
      IMPACT_OPTIONS.find(i => i.value === risk.residualImpact)?.label || '',
      RATING_OPTIONS.find(r => r.value === risk.residualRating)?.label || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `risks-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success(`Exported ${dataToExport.length} risk${dataToExport.length !== 1 ? 's' : ''} to CSV`);
  }, [filteredAndSortedRisks, selectedIds]);

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
          if (row['Risk Name']) {
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

      // Create risks from imported data
      let successCount = 0;
      let errorCount = 0;

      for (const row of importedData) {
        const riskName = row['Risk Name'];
        if (!riskName) continue;

        // Find matching owner by name
        const matchingOwner = riskOwners.find(o => 
          o.riskownername.toLowerCase() === (row['Owner'] || '').toLowerCase()
        );

        // Parse likelihood and impact values
        const parseLikelihood = (val: string): RiskLikelihood | undefined => {
          const lower = val.toLowerCase();
          return LIKELIHOOD_OPTIONS.find(l => l.label.toLowerCase() === lower)?.value;
        };
        const parseImpact = (val: string): RiskImpact | undefined => {
          const lower = val.toLowerCase();
          return IMPACT_OPTIONS.find(i => i.label.toLowerCase() === lower)?.value;
        };

        const inherentLikelihood = parseLikelihood(row['Inherent Likelihood'] || '');
        const inherentImpact = parseImpact(row['Inherent Impact'] || '');
        const residualLikelihood = parseLikelihood(row['Residual Likelihood'] || '');
        const residualImpact = parseImpact(row['Residual Impact'] || '');

        try {
          await createMutation.mutateAsync({
            riskname: riskName,
            description: row['Description'] || undefined,
            riskownername: matchingOwner ? { id: matchingOwner.id, riskownername: matchingOwner.riskownername } : undefined,
            inherentLikelihood,
            inherentImpact,
            inherentRating: calculateRiskRating(inherentLikelihood, inherentImpact),
            residualLikelihood,
            residualImpact,
            residualRating: calculateRiskRating(residualLikelihood, residualImpact),
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} risk${successCount !== 1 ? 's' : ''} successfully`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} risk${errorCount !== 1 ? 's' : ''}`);
      }
    } catch {
      toast.error('Failed to parse file');
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  }, [createMutation, riskOwners]);

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id))
      );
      toast.success(`Deleted ${selectedIds.size} risk${selectedIds.size !== 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    } catch {
      toast.error('Failed to delete some risks');
    }
  };

  const openEditDialog = (risk: Risk) => {
    setEditingRisk(risk);
    reset({
      riskname: risk.riskname,
      description: risk.description || '',
      riskownerId: risk.riskownername?.id || '',
      inherentLikelihood: risk.inherentLikelihood,
      inherentImpact: risk.inherentImpact,
      residualLikelihood: risk.residualLikelihood,
      residualImpact: risk.residualImpact,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: RiskFormData) => {
    try {
      const riskOwner = riskOwners.find(o => o.id === data.riskownerId);
      const inherentRating = calculateRiskRating(data.inherentLikelihood, data.inherentImpact);
      const residualRating = calculateRiskRating(data.residualLikelihood, data.residualImpact);
      const payload = {
        riskname: data.riskname,
        description: data.description,
        riskownername: riskOwner ? { id: riskOwner.id, riskownername: riskOwner.riskownername } : undefined,
        inherentLikelihood: data.inherentLikelihood,
        inherentImpact: data.inherentImpact,
        inherentRating,
        residualLikelihood: data.residualLikelihood,
        residualImpact: data.residualImpact,
        residualRating,
      };

      if (editingRisk) {
        await updateMutation.mutateAsync({ id: editingRisk.id, changedFields: payload });
        toast.success('Risk updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Risk created successfully');
      }
      setIsDialogOpen(false);
      reset();
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!deleteRisk) return;
    try {
      await deleteMutation.mutateAsync(deleteRisk.id);
      toast.success('Risk deleted successfully');
      setDeleteRisk(null);
    } catch {
      toast.error('Failed to delete risk');
    }
  };

  const selectedOwnerId = watch('riskownerId');

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
            <div className="w-12 h-12 bg-chart-4/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-chart-4" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Risk Register
              </h1>
              <p className="text-muted-foreground text-sm">
                {risks.length} risk{risks.length !== 1 ? 's' : ''} identified
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
              Add Risk
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
              <Card className="border-chart-4/20 bg-chart-4/5 shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-chart-4" />
                    <span className="font-medium text-foreground">
                      {selectedIds.size} risk{selectedIds.size !== 1 ? 's' : ''} selected
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
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search risks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {riskOwners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.riskownername}
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
            ) : filteredAndSortedRisks.length === 0 ? (
              <div className="text-center py-16">
                <AlertTriangle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="font-medium text-foreground">No risks found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || ownerFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first risk'}
                </p>
                {!searchQuery && ownerFilter === 'all' && (
                  <Button onClick={openCreateDialog} className="gap-2 mt-4">
                    <Plus className="w-4 h-4" />
                    Add Risk
                  </Button>
                )}
                {(searchQuery || ownerFilter !== 'all') && (
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
                        className={isSomeSelected ? 'data-[state=checked]:bg-chart-4/50' : ''}
                      />
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('riskname')}
                    >
                      <div className="flex items-center">
                        Risk Name
                        {getSortIcon('riskname')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center">
                        Description
                        {getSortIcon('description')}
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
                    <TableHead 
                      className="font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('inherentRating')}
                    >
                      <div className="flex items-center">
                        Inherent Risk
                        {getSortIcon('inherentRating')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('residualRating')}
                    >
                      <div className="flex items-center">
                        Residual Risk
                        {getSortIcon('residualRating')}
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredAndSortedRisks.map((risk, index) => (
                      <motion.tr
                        key={risk.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${selectedIds.has(risk.id) ? 'bg-chart-4/5' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(risk.id)}
                            onCheckedChange={() => toggleSelect(risk.id)}
                            aria-label={`Select ${risk.riskname}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{risk.riskname}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {risk.description || '—'}
                        </TableCell>
                        <TableCell>
                          {risk.riskownername?.riskownername || (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <RatingBadge rating={risk.inherentRating} />
                        </TableCell>
                        <TableCell>
                          <RatingBadge rating={risk.residualRating} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(risk)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteRisk(risk)}
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingRisk ? 'Edit Risk' : 'Add New Risk'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="riskname">Risk Name *</Label>
              <Input
                id="riskname"
                {...register('riskname', { required: 'Risk name is required' })}
                placeholder="Enter risk name"
              />
              {errors.riskname && (
                <p className="text-sm text-destructive">{errors.riskname.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the risk"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="riskowner">Risk Owner</Label>
              <Select
                value={selectedOwnerId || ''}
                onValueChange={(value) => setValue('riskownerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {riskOwners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.riskownername}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inherent Risk Assessment */}
            <div className="space-y-3 p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <h4 className="font-medium text-sm text-orange-700 dark:text-orange-400">Inherent Risk (Before Controls)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Likelihood</Label>
                  <Select
                    value={watch('inherentLikelihood') || ''}
                    onValueChange={(value) => setValue('inherentLikelihood', value as RiskLikelihood)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select likelihood" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIKELIHOOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Impact</Label>
                  <Select
                    value={watch('inherentImpact') || ''}
                    onValueChange={(value) => setValue('inherentImpact', value as RiskImpact)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select impact" />
                    </SelectTrigger>
                    <SelectContent>
                      {IMPACT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Calculated Rating:</span>
                <RatingBadge rating={calculateRiskRating(watch('inherentLikelihood'), watch('inherentImpact'))} />
              </div>
            </div>

            {/* Residual Risk Assessment */}
            <div className="space-y-3 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <h4 className="font-medium text-sm text-green-700 dark:text-green-400">Residual Risk (After Controls)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Likelihood</Label>
                  <Select
                    value={watch('residualLikelihood') || ''}
                    onValueChange={(value) => setValue('residualLikelihood', value as RiskLikelihood)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select likelihood" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIKELIHOOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Impact</Label>
                  <Select
                    value={watch('residualImpact') || ''}
                    onValueChange={(value) => setValue('residualImpact', value as RiskImpact)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select impact" />
                    </SelectTrigger>
                    <SelectContent>
                      {IMPACT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Calculated Rating:</span>
                <RatingBadge rating={calculateRiskRating(watch('residualLikelihood'), watch('residualImpact'))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Spinner className="w-4 h-4 mr-2" />}
                {editingRisk ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRisk} onOpenChange={(open) => !open && setDeleteRisk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRisk?.riskname}"? This action cannot be undone.
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
            <AlertDialogTitle>Delete {selectedIds.size} Risk{selectedIds.size !== 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected risk{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
              Delete {selectedIds.size} Risk{selectedIds.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
