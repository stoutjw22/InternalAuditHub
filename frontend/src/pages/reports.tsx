import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Plus,
  Eye,
  Trash2,
  ExternalLink,
  Calendar,
  User,
  Search,
  MoreHorizontal,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  FileCheck,
  Target,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  useAuditReportList,
  useCreateAuditReport,
  useUpdateAuditReport,
  useDeleteAuditReport,
  useAuditReportTemplateList,
  useAuditEngagementList,
  useAuditUserList,
  useBusinessObjectiveList,
  useEngagementRiskList,
  useEngagementControlList,
  useFindingList,
} from '@/generated/hooks';
import type { AuditReport, AuditReportStatusKey } from '@/generated/models';
import { AuditReportStatusKeyToLabel } from '@/generated/models';

interface GenerateReportFormData {
  engagementId: string;
  templateId: string;
}

function getStatusIcon(status?: AuditReportStatusKey) {
  switch (status) {
    case 'StatusKey0': return Clock;
    case 'StatusKey1': return Loader2;
    case 'StatusKey2': return CheckCircle2;
    case 'StatusKey3': return AlertCircle;
    default: return Clock;
  }
}

function getStatusColor(status?: AuditReportStatusKey): string {
  switch (status) {
    case 'StatusKey0': return 'bg-muted text-muted-foreground';
    case 'StatusKey1': return 'bg-chart-1/10 text-chart-1 border-chart-1/30';
    case 'StatusKey2': return 'bg-accent/10 text-accent border-accent/30';
    case 'StatusKey3': return 'bg-destructive/10 text-destructive border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function ReportsPage() {
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<AuditReport | null>(null);
  const [deleteReport, setDeleteReport] = useState<AuditReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: reports = [], isLoading } = useAuditReportList();
  const { data: templates = [] } = useAuditReportTemplateList();
  const { data: engagements = [] } = useAuditEngagementList();
  const { data: auditUsers = [] } = useAuditUserList();
  const { data: allObjectives = [] } = useBusinessObjectiveList();
  const { data: allEngagementRisks = [] } = useEngagementRiskList();
  const { data: allEngagementControls = [] } = useEngagementControlList();
  const { data: allFindings = [] } = useFindingList();

  const createMutation = useCreateAuditReport();
  const updateMutation = useUpdateAuditReport();
  const deleteMutation = useDeleteAuditReport();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<GenerateReportFormData>();

  const selectedEngagementId = watch('engagementId');
  const selectedTemplateId = watch('templateId');

  // Get engagement data for report preview
  const selectedEngagement = engagements.find(e => e.id === selectedEngagementId);
  const engagementObjectives = selectedEngagement ? allObjectives : [];
  const engagementRisks = useMemo(() => {
    if (!selectedEngagement) return [];
    const objectiveIds = new Set(engagementObjectives.map(o => o.id));
    return allEngagementRisks.filter(er => er.objectivename && objectiveIds.has(er.objectivename.id));
  }, [selectedEngagement, engagementObjectives, allEngagementRisks]);
  const engagementControls = useMemo(() => {
    const riskIds = new Set(engagementRisks.map(r => r.id));
    return allEngagementControls.filter(ec => ec.engagementriskname && riskIds.has(ec.engagementriskname.id));
  }, [engagementRisks, allEngagementControls]);
  const engagementFindings = useMemo(() => {
    const controlIds = new Set(engagementControls.map(ec => ec.controlname?.id));
    return allFindings.filter(f => f.controlname && controlIds.has(f.controlname.id));
  }, [engagementControls, allFindings]);

  const filteredReports = reports.filter(report =>
    report.reporttitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.auditengagement?.engagementname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const draftCount = reports.filter(r => r.statusKey === 'StatusKey0').length;
  const inProgressCount = reports.filter(r => r.statusKey === 'StatusKey1').length;
  const completedCount = reports.filter(r => r.statusKey === 'StatusKey2').length;

  const openGenerateDialog = () => {
    reset({ engagementId: '', templateId: '' });
    setIsGenerateDialogOpen(true);
  };

  const onSubmitGenerate = async (data: GenerateReportFormData) => {
    try {
      const engagement = engagements.find(e => e.id === data.engagementId);
      const template = templates.find(t => t.id === data.templateId);
      const generator = auditUsers[0];

      if (!engagement || !template || !generator) {
        toast.error('Please select all required fields');
        return;
      }

      setIsGenerating(true);

      // Simulate report generation with a delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Build scope and summaries from engagement data
      const scope = `This audit engagement covers ${engagementObjectives.length} business objective(s), ${engagementRisks.length} identified risk(s), and ${engagementControls.length} control(s).`;
      
      const businessObjectivesSummary = engagementObjectives
        .map(o => `• ${o.objectivename}${o.description ? `: ${o.description}` : ''}`)
        .join('\n') || 'No business objectives defined.';

      const rcmSummary = engagementRisks.map(er => {
        const linkedControls = engagementControls.filter(ec => ec.engagementriskname?.id === er.id);
        return `Risk: ${er.riskname?.riskname}\nControls: ${linkedControls.map(c => c.controlname?.controlname).join(', ') || 'None mapped'}`;
      }).join('\n\n') || 'No risks or controls mapped.';

      const findingsSummary = engagementFindings
        .map(f => `• ${f.findingtitle}: ${f.recommendation || 'No recommendation'}`)
        .join('\n') || 'No findings recorded.';

      const payload = {
        reporttitle: `${engagement.engagementname} - Audit Report`,
        auditengagement: { id: engagement.id, engagementname: engagement.engagementname },
        templatename: { id: template.id, templatename: template.templatename },
        generatedby: { id: generator.id, auditusername: generator.auditusername },
        generateddate: new Date().toISOString().split('T')[0],
        statusKey: 'StatusKey2' as AuditReportStatusKey,
        sharepointreporturl: `https://example.com/reports/${engagement.id}`,
        scope,
        businessobjectives: businessObjectivesSummary,
        rcmsummary: rcmSummary,
        findingssummary: findingsSummary,
      };

      await createMutation.mutateAsync(payload);
      toast.success('Report generated successfully!');
      setIsGenerateDialogOpen(false);
      reset();
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryGeneration = async (report: AuditReport) => {
    try {
      await updateMutation.mutateAsync({
        id: report.id,
        changedFields: {
          statusKey: 'StatusKey1',
        },
      });
      // Simulate retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      await updateMutation.mutateAsync({
        id: report.id,
        changedFields: {
          statusKey: 'StatusKey2',
        },
      });
      toast.success('Report regenerated successfully');
    } catch {
      toast.error('Failed to regenerate report');
    }
  };

  const handleDelete = async () => {
    if (!deleteReport) return;
    try {
      await deleteMutation.mutateAsync(deleteReport.id);
      toast.success('Report deleted successfully');
      setDeleteReport(null);
    } catch {
      toast.error('Failed to delete report');
    }
  };

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
              <FileCheck className="w-6 h-6 text-chart-3" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Audit Reports
              </h1>
              <p className="text-muted-foreground text-sm">
                {reports.length} report{reports.length !== 1 ? 's' : ''} generated
              </p>
            </div>
          </div>
          <Button onClick={openGenerateDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Generate Report
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{draftCount}</p>
                  <p className="text-sm text-muted-foreground">Draft</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-chart-1/10 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{inProgressCount}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{completedCount}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <FileText className="w-5 h-5 text-chart-3" />
              Generated Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="w-6 h-6" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-medium text-foreground">No reports found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? 'Try adjusting your search' : 'Generate your first audit report'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Title</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Generated By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredReports.map((report, index) => {
                      const StatusIcon = getStatusIcon(report.statusKey);
                      return (
                        <motion.tr
                          key={report.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.03, duration: 0.2 }}
                          className="group"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-chart-3/10 rounded-lg flex items-center justify-center">
                                <FileCheck className="w-4 h-4 text-chart-3" />
                              </div>
                              <span className="font-medium text-foreground">{report.reporttitle}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">{report.auditengagement?.engagementname || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{report.templatename?.templatename || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">{report.generatedby?.auditusername || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm">
                                {report.generateddate ? new Date(report.generateddate).toLocaleDateString() : '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(report.statusKey)}`}>
                              <StatusIcon className={`w-3 h-3 mr-1 ${report.statusKey === 'StatusKey1' ? 'animate-spin' : ''}`} />
                              {AuditReportStatusKeyToLabel[report.statusKey]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewingReport(report)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {report.sharepointreporturl && (
                                <a
                                  href={report.sharepointreporturl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </a>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {report.statusKey === 'StatusKey3' && (
                                    <DropdownMenuItem onClick={() => handleRetryGeneration(report)}>
                                      <RefreshCw className="w-4 h-4 mr-2" />
                                      Retry Generation
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => setDeleteReport(report)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Generate Report Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-chart-3" />
              Generate Audit Report
            </DialogTitle>
            <DialogDescription>
              Select an engagement and template to generate a comprehensive audit report.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitGenerate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Audit Engagement *</Label>
                <Select
                  value={selectedEngagementId || ''}
                  onValueChange={(value) => setValue('engagementId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    {engagements.map((engagement) => (
                      <SelectItem key={engagement.id} value={engagement.id}>
                        {engagement.engagementname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Report Template *</Label>
                <Select
                  value={selectedTemplateId || ''}
                  onValueChange={(value) => setValue('templateId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.templatename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Report Preview */}
            {selectedEngagement && (
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Report Content Preview
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-chart-2 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Business Objectives ({engagementObjectives.length})</p>
                      <p className="text-muted-foreground">
                        {engagementObjectives.slice(0, 3).map(o => o.objectivename).join(', ')}
                        {engagementObjectives.length > 3 && ` +${engagementObjectives.length - 3} more`}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-chart-4 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Risk & Control Matrix ({engagementRisks.length} risks, {engagementControls.length} controls)</p>
                      <p className="text-muted-foreground">
                        {engagementRisks.slice(0, 2).map(r => r.riskname?.riskname).join(', ')}
                        {engagementRisks.length > 2 && ` +${engagementRisks.length - 2} more`}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Audit Findings ({engagementFindings.length})</p>
                      <p className="text-muted-foreground">
                        {engagementFindings.length > 0 
                          ? engagementFindings.slice(0, 2).map(f => f.findingtitle).join(', ')
                          : 'No findings recorded'}
                        {engagementFindings.length > 2 && ` +${engagementFindings.length - 2} more`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isGenerating || !selectedEngagementId || !selectedTemplateId}
              >
                {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-chart-3" />
              {viewingReport?.reporttitle}
            </DialogTitle>
            <DialogDescription>
              Generated on {viewingReport?.generateddate ? new Date(viewingReport.generateddate).toLocaleDateString() : '—'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 p-1">
              {/* Report Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Engagement</p>
                  <p className="text-sm font-medium">{viewingReport?.auditengagement?.engagementname}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Template</p>
                  <p className="text-sm font-medium">{viewingReport?.templatename?.templatename}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Generated By</p>
                  <p className="text-sm font-medium">{viewingReport?.generatedby?.auditusername}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(viewingReport?.statusKey)}`}>
                    {viewingReport?.statusKey ? AuditReportStatusKeyToLabel[viewingReport.statusKey] : '—'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Scope */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-chart-1" />
                  Scope
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {viewingReport?.scope || 'No scope defined.'}
                </p>
              </div>

              <Separator />

              {/* Business Objectives */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-chart-2" />
                  Business Objectives
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {viewingReport?.businessobjectives || 'No business objectives defined.'}
                </p>
              </div>

              <Separator />

              {/* RCM Summary */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-chart-4" />
                  Risk & Control Matrix
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {viewingReport?.rcmsummary || 'No risks or controls mapped.'}
                </p>
              </div>

              <Separator />

              {/* Findings */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  Audit Findings
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {viewingReport?.findingssummary || 'No findings recorded.'}
                </p>
              </div>

              {/* SharePoint Link */}
              {viewingReport?.sharepointreporturl && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Full report available in SharePoint</span>
                    </div>
                    <a
                      href={viewingReport.sharepointreporturl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in SharePoint
                      </Button>
                    </a>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReport} onOpenChange={(open) => !open && setDeleteReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteReport?.reporttitle}"? This action cannot be undone.
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
    </div>
  );
}
