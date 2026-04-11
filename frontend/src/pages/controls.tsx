import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Plus, Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Download, Upload, CheckSquare, FileSpreadsheet } from 'lucide-react';
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
  useControlList,
  useCreateControl,
  useUpdateControl,
  useDeleteControl,
  useRiskList,
  useRiskOwnerList,
} from '@/generated/hooks';
import type { Control } from '@/generated/models';

// Excel XML generation helper
function generateExcelXML(data: Array<Record<string, string>>, headers: string[]): string {
  const escapeXml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<?mso-application progid="Excel.Sheet"?>';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
  xml += '<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E8E8E8" ss:Pattern="Solid"/></Style></Styles>';
  xml += '<Worksheet ss:Name="Controls"><Table>';
  
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

interface ControlFormData {
  controlname: string;
  description?: string;
  riskId?: string;
  riskownerId?: string;
}

type SortField = 'controlname' | 'description' | 'risk' | 'owner';
type SortDirection = 'asc' | 'desc' | null;

export default function ControlsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<Control | null>(null);
  const [deleteControl, setDeleteControl] = useState<Control | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { data: controls = [], isLoading } = useControlList();
  const { data: risks = [] } = useRiskList();
  const { data: riskOwners = [] } = useRiskOwnerList();
  const createMutation = useCreateControl();
  const updateMutation = useUpdateControl();
  const deleteMutation = useDeleteControl();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ControlFormData>();

  const filteredAndSortedControls = useMemo(() => {
    let result = controls.filter(control =>
      control.controlname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      control.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply owner filter
    if (ownerFilter !== 'all') {
      if (ownerFilter === 'unassigned') {
        result = result.filter(control => !control.riskownername);
      } else {
        result = result.filter(control => control.riskownername?.id === ownerFilter);
      }
    }

    // Apply risk filter
    if (riskFilter !== 'all') {
      if (riskFilter === 'none') {
        result = result.filter(control => !control.riskname);
      } else {
        result = result.filter(control => control.riskname?.id === riskFilter);
      }
    }

    // Apply sorting
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let aVal: string;
        let bVal: string;

        switch (sortField) {
          case 'controlname':
            aVal = a.controlname.toLowerCase();
            bVal = b.controlname.toLowerCase();
            break;
          case 'description':
            aVal = (a.description || '').toLowerCase();
            bVal = (b.description || '').toLowerCase();
            break;
          case 'risk':
            aVal = (a.riskname?.riskname || '').toLowerCase();
            bVal = (b.riskname?.riskname || '').toLowerCase();
            break;
          case 'owner':
            aVal = (a.riskownername?.riskownername || '').toLowerCase();
            bVal = (b.riskownername?.riskownername || '').toLowerCase();
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
  }, [controls, searchQuery, ownerFilter, riskFilter, sortField, sortDirection]);

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
    setRiskFilter('all');
    setSortField(null);
    setSortDirection(null);
  };

  const hasActiveFilters = searchQuery || ownerFilter !== 'all' || riskFilter !== 'all' || sortField;

  // Selection handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredAndSortedControls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedControls.map(c => c.id)));
    }
  }, [selectedIds.size, filteredAndSortedControls]);

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

  const isAllSelected = filteredAndSortedControls.length > 0 && selectedIds.size === filteredAndSortedControls.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredAndSortedControls.length;

  // Excel Export
  const exportToExcel = useCallback(() => {
    const dataToExport = selectedIds.size > 0
      ? filteredAndSortedControls.filter(c => selectedIds.has(c.id))
      : filteredAndSortedControls;

    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Control Name', 'Description', 'Linked Risk', 'Owner'];
    const rows = dataToExport.map(control => ({
      'Control Name': control.controlname,
      'Description': control.description || '',
      'Linked Risk': control.riskname?.riskname || '',
      'Owner': control.riskownername?.riskownername || ''
    }));

    const xmlContent = generateExcelXML(rows, headers);
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `controls-export-${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success(`Exported ${dataToExport.length} control${dataToExport.length !== 1 ? 's' : ''} to Excel`);
  }, [filteredAndSortedControls, selectedIds]);

  // CSV Export (keep for compatibility)
  const exportToCSV = useCallback(() => {
    const dataToExport = selectedIds.size > 0
      ? filteredAndSortedControls.filter(c => selectedIds.has(c.id))
      : filteredAndSortedControls;

    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Control Name', 'Description', 'Linked Risk', 'Owner'];
    const rows = dataToExport.map(control => [
      control.controlname,
      control.description || '',
      control.riskname?.riskname || '',
      control.riskownername?.riskownername || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `controls-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast.success(`Exported ${dataToExport.length} control${dataToExport.length !== 1 ? 's' : ''} to CSV`);
  }, [filteredAndSortedControls, selectedIds]);

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
          if (row['Control Name']) {
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

      // Create controls from imported data
      let successCount = 0;
      let errorCount = 0;

      for (const row of importedData) {
        const controlName = row['Control Name'];
        if (!controlName) continue;

        // Find matching risk and owner by name
        const matchingRisk = risks.find(r => 
          r.riskname.toLowerCase() === (row['Linked Risk'] || '').toLowerCase()
        );
        const matchingOwner = riskOwners.find(o => 
          o.riskownername.toLowerCase() === (row['Owner'] || '').toLowerCase()
        );

        try {
          await createMutation.mutateAsync({
            controlname: controlName,
            description: row['Description'] || undefined,
            riskname: matchingRisk ? { id: matchingRisk.id, riskname: matchingRisk.riskname } : undefined,
            riskownername: matchingOwner ? { id: matchingOwner.id, riskownername: matchingOwner.riskownername } : undefined,
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} control${successCount !== 1 ? 's' : ''} successfully`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to import ${errorCount} control${errorCount !== 1 ? 's' : ''}`);
      }
    } catch {
      toast.error('Failed to parse file');
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  }, [createMutation, risks, riskOwners]);

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => deleteMutation.mutateAsync(id))
      );
      toast.success(`Deleted ${selectedIds.size} control${selectedIds.size !== 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    } catch {
      toast.error('Failed to delete some controls');
    }
  };

  const openCreateDialog = () => {
    setEditingControl(null);
    reset({ controlname: '', description: '', riskId: '', riskownerId: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (control: Control) => {
    setEditingControl(control);
    reset({
      controlname: control.controlname,
      description: control.description || '',
      riskId: control.riskname?.id || '',
      riskownerId: control.riskownername?.id || '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ControlFormData) => {
    try {
      const risk = risks.find(r => r.id === data.riskId);
      const riskOwner = riskOwners.find(o => o.id === data.riskownerId);
      const payload = {
        controlname: data.controlname,
        description: data.description,
        riskname: risk ? { id: risk.id, riskname: risk.riskname } : undefined,
        riskownername: riskOwner ? { id: riskOwner.id, riskownername: riskOwner.riskownername } : undefined,
      };

      if (editingControl) {
        await updateMutation.mutateAsync({ id: editingControl.id, changedFields: payload });
        toast.success('Control updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Control created successfully');
      }
      setIsDialogOpen(false);
      reset();
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!deleteControl) return;
    try {
      await deleteMutation.mutateAsync(deleteControl.id);
      toast.success('Control deleted successfully');
      setDeleteControl(null);
    } catch {
      toast.error('Failed to delete control');
    }
  };

  const selectedRiskId = watch('riskId');
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
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Control Library
              </h1>
              <p className="text-muted-foreground text-sm">
                {controls.length} control{controls.length !== 1 ? 's' : ''} documented
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
              Add Control
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
              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">
                      {selectedIds.size} control{selectedIds.size !== 1 ? 's' : ''} selected
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
                  placeholder="Search controls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risks</SelectItem>
                    <SelectItem value="none">No Linked Risk</SelectItem>
                    {risks.map((risk) => (
                      <SelectItem key={risk.id} value={risk.id}>
                        {risk.riskname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="w-[160px]">
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
            ) : filteredAndSortedControls.length === 0 ? (
              <div className="text-center py-16">
                <Shield className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="font-medium text-foreground">No controls found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || ownerFilter !== 'all' || riskFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first control'}
                </p>
                {!searchQuery && ownerFilter === 'all' && riskFilter === 'all' && (
                  <Button onClick={openCreateDialog} className="gap-2 mt-4">
                    <Plus className="w-4 h-4" />
                    Add Control
                  </Button>
                )}
                {(searchQuery || ownerFilter !== 'all' || riskFilter !== 'all') && (
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
                        className={isSomeSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                      />
                    </TableHead>
                    <TableHead 
                      className="font-semibold cursor-pointer select-none hover:bg-muted/70 transition-colors"
                      onClick={() => handleSort('controlname')}
                    >
                      <div className="flex items-center">
                        Control Name
                        {getSortIcon('controlname')}
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
                      onClick={() => handleSort('risk')}
                    >
                      <div className="flex items-center">
                        Linked Risk
                        {getSortIcon('risk')}
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
                    {filteredAndSortedControls.map((control, index) => (
                      <motion.tr
                        key={control.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${selectedIds.has(control.id) ? 'bg-primary/5' : ''}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(control.id)}
                            onCheckedChange={() => toggleSelect(control.id)}
                            aria-label={`Select ${control.controlname}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{control.controlname}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {control.description || '—'}
                        </TableCell>
                        <TableCell>
                          {control.riskname?.riskname ? (
                            <Badge variant="outline" className="bg-chart-4/5 text-chart-4 border-chart-4/30">
                              {control.riskname.riskname}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {control.riskownername?.riskownername || (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(control)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteControl(control)}
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
              {editingControl ? 'Edit Control' : 'Add New Control'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="controlname">Control Name *</Label>
              <Input
                id="controlname"
                {...register('controlname', { required: 'Control name is required' })}
                placeholder="Enter control name"
              />
              {errors.controlname && (
                <p className="text-sm text-destructive">{errors.controlname.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the control"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk">Linked Risk</Label>
              <Select
                value={selectedRiskId || ''}
                onValueChange={(value) => setValue('riskId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select risk" />
                </SelectTrigger>
                <SelectContent>
                  {risks.map((risk) => (
                    <SelectItem key={risk.id} value={risk.id}>
                      {risk.riskname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Spinner className="w-4 h-4 mr-2" />}
                {editingControl ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteControl} onOpenChange={(open) => !open && setDeleteControl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Control</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteControl?.controlname}"? This action cannot be undone.
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
            <AlertDialogTitle>Delete {selectedIds.size} Control{selectedIds.size !== 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected control{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
              Delete {selectedIds.size} Control{selectedIds.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
