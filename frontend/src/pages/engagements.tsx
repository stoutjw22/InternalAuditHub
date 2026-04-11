import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Users,
  ChevronRight,
  Clock,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Target,
  ShieldCheck,
  AlertTriangle,
  Link2,
  Layers,
  CalendarDays,
  ArrowRight,
  MoreHorizontal,
  ClipboardList,
  FileCheck,
  FileText,
  Loader2,
  Eye,
  ExternalLink,
  Upload,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { DialogDescription } from '@/components/ui/dialog';
import {
  useAuditEngagementList,
  useCreateAuditEngagement,
  useUpdateAuditEngagement,
  useDeleteAuditEngagement,
  useAuditManagerList,
  useBusinessProcessList,
  useBusinessObjectiveList,
  useCreateBusinessProcess,
  useDeleteBusinessProcess,
  useCreateBusinessObjective,
  useDeleteBusinessObjective,
  useRiskList,
  useControlList,
  useEngagementRiskList,
  useEngagementControlList,
  useCreateEngagementRisk,
  useDeleteEngagementRisk,
  useCreateEngagementControl,
  useDeleteEngagementControl,
  useFindingList,
  useFindingOwnerList,
  useRemediationActionList,
  useCreateRemediationAction,
  useUpdateRemediationAction,
  useDeleteRemediationAction,
  useEvidenceList,
  useCreateEvidence,
  useAuditUserList,
  useEngagementAuditorList,
  useCreateEngagementAuditor,
  useDeleteEngagementAuditor,
  useAuditReportList,
  useAuditReportTemplateList,
  useCreateAuditReport,
} from '@/generated/hooks';
import type {
  AuditEngagement,
  AuditEngagementStatusKey,
  BusinessProcess,
  BusinessObjective,
  EngagementRisk,
  EngagementControl,
  RemediationAction,
  RemediationActionStatusKey,
  Evidence,
  EngagementAuditor,
  AuditReportStatusKey,
} from '@/generated/models';
import { AuditEngagementStatusKeyToLabel, RemediationActionStatusKeyToLabel, EvidenceEvidencetypeKeyToLabel, EngagementAuditorRoleKeyToLabel, AuditReportStatusKeyToLabel } from '@/generated/models';
import type { EvidenceEvidencetypeKey } from '@/generated/models/evidence-model';
import type { EngagementAuditorRoleKey } from '@/generated/models/engagement-auditor-model';

interface EngagementFormData {
  engagementname: string;
  period: string;
  statusKey: AuditEngagementStatusKey;
  auditManagerId?: string;
}

interface ProcessFormData {
  processname: string;
  description?: string;
}

interface ObjectiveFormData {
  objectivename: string;
  description?: string;
  processId?: string;
}

interface RiskScopeFormData {
  objectiveId: string;
  riskId: string;
}

interface ControlScopeFormData {
  engagementRiskId: string;
  controlId: string;
}

interface RemediationFormData {
  actiondescription: string;
  findingId: string;
  ownerId: string;
  duedate: string;
  statusKey: RemediationActionStatusKey;
  comments?: string;
}

interface EvidenceFormData {
  evidencename: string;
  evidencetypeKey: EvidenceEvidencetypeKey;
  sharepointdocumenturl: string;
}

interface AuditorAssignmentFormData {
  auditorId: string;
  roleKey: EngagementAuditorRoleKey;
}

const auditorRoleOptions: { key: EngagementAuditorRoleKey; label: string }[] = [
  { key: 'RoleKey0', label: 'Lead Auditor' },
  { key: 'RoleKey1', label: 'Team Member' },
];

const remediationStatusOptions: { key: RemediationActionStatusKey; label: string; color: string }[] = [
  { key: 'StatusKey0', label: 'Not Started', color: 'bg-muted text-muted-foreground' },
  { key: 'StatusKey1', label: 'In Progress', color: 'bg-chart-1/10 text-chart-1 border-chart-1/30' },
  { key: 'StatusKey2', label: 'Completed', color: 'bg-accent/10 text-accent border-accent/30' },
  { key: 'StatusKey3', label: 'Overdue', color: 'bg-destructive/10 text-destructive border-destructive/30' },
];

const evidenceTypeOptions: { key: EvidenceEvidencetypeKey; label: string }[] = [
  { key: 'EvidencetypeKey0', label: 'Workpaper' },
  { key: 'EvidencetypeKey1', label: 'Policy' },
  { key: 'EvidencetypeKey2', label: 'Manual' },
  { key: 'EvidencetypeKey3', label: 'Screenshot' },
  { key: 'EvidencetypeKey4', label: 'Report' },
  { key: 'EvidencetypeKey5', label: 'Training Material' },
  { key: 'EvidencetypeKey6', label: 'Other' },
];

function getRemediationStatusColor(status?: RemediationActionStatusKey): string {
  switch (status) {
    case 'StatusKey0': return 'bg-muted text-muted-foreground';
    case 'StatusKey1': return 'bg-chart-1/10 text-chart-1 border-chart-1/30';
    case 'StatusKey2': return 'bg-accent/10 text-accent border-accent/30';
    case 'StatusKey3': return 'bg-destructive/10 text-destructive border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

const statusOptions: { key: AuditEngagementStatusKey; label: string; icon: typeof Clock }[] = [
  { key: 'StatusKey0', label: 'Planned', icon: Calendar },
  { key: 'StatusKey1', label: 'In Progress', icon: PlayCircle },
  { key: 'StatusKey2', label: 'Completed', icon: CheckCircle2 },
  { key: 'StatusKey3', label: 'On Hold', icon: PauseCircle },
];

function getStatusColor(status?: AuditEngagementStatusKey): string {
  switch (status) {
    case 'StatusKey0':
      return 'bg-chart-4/10 text-chart-4 border-chart-4/30';
    case 'StatusKey1':
      return 'bg-chart-1/10 text-chart-1 border-chart-1/30';
    case 'StatusKey2':
      return 'bg-accent/10 text-accent border-accent/30';
    case 'StatusKey3':
      return 'bg-chart-3/10 text-chart-3 border-chart-3/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getStatusIcon(status?: AuditEngagementStatusKey) {
  switch (status) {
    case 'StatusKey0':
      return Calendar;
    case 'StatusKey1':
      return PlayCircle;
    case 'StatusKey2':
      return CheckCircle2;
    case 'StatusKey3':
      return PauseCircle;
    default:
      return Clock;
  }
}

// Timeline phases for engagement planning
const planningPhases = [
  { id: 'scoping', label: 'Scoping', description: 'Define processes, objectives, and risks' },
  { id: 'planning', label: 'Planning', description: 'Assign team and create audit plan' },
  { id: 'fieldwork', label: 'Fieldwork', description: 'Execute testing and gather evidence' },
  { id: 'reporting', label: 'Reporting', description: 'Document findings and recommendations' },
  { id: 'followup', label: 'Follow-up', description: 'Track remediation progress' },
];

function getPhaseIndex(status?: AuditEngagementStatusKey): number {
  switch (status) {
    case 'StatusKey0': return 0;
    case 'StatusKey1': return 2;
    case 'StatusKey2': return 4;
    case 'StatusKey3': return 1;
    default: return 0;
  }
}

export default function EngagementsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEngagement, setEditingEngagement] = useState<AuditEngagement | null>(null);
  const [deleteEngagement, setDeleteEngagement] = useState<AuditEngagement | null>(null);
  const [selectedEngagement, setSelectedEngagement] = useState<AuditEngagement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Process & Objective dialogs
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [isObjectiveDialogOpen, setIsObjectiveDialogOpen] = useState(false);
  const [deleteProcess, setDeleteProcess] = useState<BusinessProcess | null>(null);
  const [deleteObjective, setDeleteObjective] = useState<BusinessObjective | null>(null);

  // Risk & Control scoping dialogs
  const [isRiskScopeDialogOpen, setIsRiskScopeDialogOpen] = useState(false);
  const [isControlScopeDialogOpen, setIsControlScopeDialogOpen] = useState(false);
  const [isAuditorDialogOpen, setIsAuditorDialogOpen] = useState(false);
  const [deleteEngagementAuditorState, setDeleteEngagementAuditorState] = useState<EngagementAuditor | null>(null);
  const [deleteEngagementRisk, setDeleteEngagementRisk] = useState<EngagementRisk | null>(null);
  const [deleteEngagementControl, setDeleteEngagementControl] = useState<EngagementControl | null>(null);

  // Remediation tracking state
  const [isRemediationDialogOpen, setIsRemediationDialogOpen] = useState(false);
  const [editingRemediation, setEditingRemediation] = useState<RemediationAction | null>(null);
  const [deleteRemediation, setDeleteRemediation] = useState<RemediationAction | null>(null);
  const [viewingRemediation, setViewingRemediation] = useState<RemediationAction | null>(null);
  const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false);
  const [evidenceForRemediationId, setEvidenceForRemediationId] = useState<string | null>(null);

  // Report generation state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { data: engagements = [], isLoading } = useAuditEngagementList();
  const { data: allEngagementAuditors = [] } = useEngagementAuditorList();
  const { data: auditManagers = [] } = useAuditManagerList();
  const { data: allProcesses = [] } = useBusinessProcessList();
  const { data: allObjectives = [] } = useBusinessObjectiveList();
  const { data: allRisks = [] } = useRiskList();
  const { data: allControls = [] } = useControlList();
  const { data: allEngagementRisks = [] } = useEngagementRiskList();
  const { data: allEngagementControls = [] } = useEngagementControlList();
  const { data: allFindings = [] } = useFindingList();
  const { data: allFindingOwners = [] } = useFindingOwnerList();
  const { data: allRemediationActions = [] } = useRemediationActionList();
  const { data: allEvidence = [] } = useEvidenceList();
  const { data: allAuditUsers = [] } = useAuditUserList();
  const { data: allReports = [] } = useAuditReportList();
  const { data: allReportTemplates = [] } = useAuditReportTemplateList();

  const createMutation = useCreateAuditEngagement();
  const updateMutation = useUpdateAuditEngagement();
  const deleteMutation = useDeleteAuditEngagement();
  const createProcessMutation = useCreateBusinessProcess();
  const createEngagementAuditorMutation = useCreateEngagementAuditor();
  const deleteEngagementAuditorMutation = useDeleteEngagementAuditor();
  const deleteProcessMutation = useDeleteBusinessProcess();
  const createObjectiveMutation = useCreateBusinessObjective();
  const createRemediationMutation = useCreateRemediationAction();
  const updateRemediationMutation = useUpdateRemediationAction();
  const auditorAssignmentForm = useForm<AuditorAssignmentFormData>();
  const deleteRemediationMutation = useDeleteRemediationAction();
  const createEvidenceMutation = useCreateEvidence();
  const deleteObjectiveMutation = useDeleteBusinessObjective();
  const createEngagementRiskMutation = useCreateEngagementRisk();
  const remediationForm = useForm<RemediationFormData>();
  const evidenceForm = useForm<EvidenceFormData>();
  const deleteEngagementRiskMutation = useDeleteEngagementRisk();
  const createEngagementControlMutation = useCreateEngagementControl();
  const deleteEngagementControlMutation = useDeleteEngagementControl();
  const createReportMutation = useCreateAuditReport();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EngagementFormData>();
  const processForm = useForm<ProcessFormData>();
  const objectiveForm = useForm<ObjectiveFormData>();
  const riskScopeForm = useForm<RiskScopeFormData>();
  const controlScopeForm = useForm<ControlScopeFormData>();

  // Filter data for selected engagement
  const engagementProcesses = selectedEngagement
    ? allProcesses.filter(p => p.engagementname?.id === selectedEngagement.id)
    : [];
  const engagementObjectives = selectedEngagement
    ? allObjectives.filter(o => o.engagementname?.id === selectedEngagement.id)
    : [];

  // Get engagement risks (linked to objectives in this engagement)
  const engagementRisks = useMemo(() => {
    if (!selectedEngagement) return [];
    const objectiveIds = new Set(engagementObjectives.map(o => o.id));
    return allEngagementRisks.filter(er => er.objectivename && objectiveIds.has(er.objectivename.id));
  }, [selectedEngagement, engagementObjectives, allEngagementRisks]);

  // Get engagement controls (linked to engagement risks)
  const engagementControls = useMemo(() => {
    const riskIds = new Set(engagementRisks.map(r => r.id));
    return allEngagementControls.filter(ec => ec.engagementriskname && riskIds.has(ec.engagementriskname.id));
  }, [engagementRisks, allEngagementControls]);

  // Get engagement auditors
  const engagementAuditors = useMemo(() => {
    if (!selectedEngagement) return [];
    return allEngagementAuditors.filter(ea => ea.auditengagement?.id === selectedEngagement.id);
  }, [selectedEngagement, allEngagementAuditors]);

  // Available auditors (not already assigned to this engagement)
  const assignedAuditorIds = new Set(engagementAuditors.map(ea => ea.audituser?.id));
  const availableAuditors = allAuditUsers.filter(u => !assignedAuditorIds.has(u.id));

  // Get remediation actions for findings in this engagement
  // We'll filter by finding owners linked to findings associated with controls in this engagement
  const engagementRemediations = useMemo(() => {
    if (!selectedEngagement) return [];
    const engagementControlIds = new Set(engagementControls.map(ec => ec.controlname?.id));
    // Get findings that relate to controls in this engagement
    const relevantFindings = allFindings.filter(f => f.controlname && engagementControlIds.has(f.controlname.id));
    const findingIds = new Set(relevantFindings.map(f => f.id));
    return allRemediationActions.filter(ra => ra.findingtitle && findingIds.has(ra.findingtitle.id));
  }, [selectedEngagement, engagementControls, allFindings, allRemediationActions]);

  // Get evidence linked to remediation actions
  const getEvidenceForRemediation = (remediationId: string) => {
    return allEvidence.filter(e => allRemediationActions.find(ra => ra.id === remediationId && ra.evidencename?.id === e.id));
  };

  // Check if remediation is overdue
  const isOverdue = (remediation: RemediationAction) => {
    if (remediation.statusKey === 'StatusKey2') return false; // Completed
    const dueDate = new Date(remediation.duedate);
    return dueDate < new Date();
  };

  // Available risks (not already scoped to this engagement)
  const scopedRiskIds = new Set(engagementRisks.map(er => er.riskname?.id));
  const availableRisks = allRisks.filter(r => !scopedRiskIds.has(r.id));

  // Available controls (not already scoped)
  const scopedControlIds = new Set(engagementControls.map(ec => ec.controlname?.id));
  const availableControls = allControls.filter(c => !scopedControlIds.has(c.id));

  const filteredEngagements = engagements.filter(engagement =>
    engagement.engagementname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    engagement.period?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateDialog = () => {
    setEditingEngagement(null);
    reset({ engagementname: '', period: '', statusKey: 'StatusKey0', auditManagerId: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (engagement: AuditEngagement) => {
    setEditingEngagement(engagement);
    reset({
      engagementname: engagement.engagementname,
      period: engagement.period || '',
      statusKey: engagement.statusKey,
      auditManagerId: engagement.auditmanagername?.id || '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: EngagementFormData) => {
    try {
      const manager = auditManagers.find(m => m.id === data.auditManagerId);

      const payload = {
        engagementname: data.engagementname,
        period: data.period,
        statusKey: data.statusKey,
        auditmanagername: manager ? { id: manager.id, auditmanagername: manager.auditmanagername } : undefined,
      };

      if (editingEngagement) {
        await updateMutation.mutateAsync({ id: editingEngagement.id, changedFields: payload });
        toast.success('Engagement updated successfully');
      } else {
        await createMutation.mutateAsync(payload as Omit<AuditEngagement, 'id'>);
        toast.success('Engagement created successfully');
      }
      setIsDialogOpen(false);
      reset();
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!deleteEngagement) return;
    try {
      await deleteMutation.mutateAsync(deleteEngagement.id);
      toast.success('Engagement deleted successfully');
      setDeleteEngagement(null);
      if (selectedEngagement?.id === deleteEngagement.id) {
        setSelectedEngagement(null);
      }
    } catch {
      toast.error('Failed to delete engagement');
    }
  };

  const onSubmitProcess = async (data: ProcessFormData) => {
    if (!selectedEngagement) return;
    try {
      await createProcessMutation.mutateAsync({
        processname: data.processname,
        description: data.description,
        engagementname: { id: selectedEngagement.id, engagementname: selectedEngagement.engagementname },
      });
      toast.success('Business process added');
      setIsProcessDialogOpen(false);
      processForm.reset();
    } catch {
      toast.error('Failed to add process');
    }
  };

  const onSubmitObjective = async (data: ObjectiveFormData) => {
    if (!selectedEngagement) return;
    try {
      const process = engagementProcesses.find(p => p.id === data.processId);
      await createObjectiveMutation.mutateAsync({
        objectivename: data.objectivename,
        description: data.description,
        engagementname: { id: selectedEngagement.id, engagementname: selectedEngagement.engagementname },
        processname: process ? { id: process.id, processname: process.processname } : undefined,
      });
      toast.success('Business objective added');
      setIsObjectiveDialogOpen(false);
      objectiveForm.reset();
    } catch {
      toast.error('Failed to add objective');
    }
  };

  const onSubmitRiskScope = async (data: RiskScopeFormData) => {
    try {
      const objective = engagementObjectives.find(o => o.id === data.objectiveId);
      const risk = allRisks.find(r => r.id === data.riskId);
      if (!objective || !risk) return;

      await createEngagementRiskMutation.mutateAsync({
        engagementriskname: `${risk.riskname} - ${objective.objectivename}`,
        objectivename: { id: objective.id, objectivename: objective.objectivename },
        riskname: { id: risk.id, riskname: risk.riskname },
      });
      toast.success('Risk linked to objective');
      setIsRiskScopeDialogOpen(false);
      riskScopeForm.reset();
    } catch {
      toast.error('Failed to link risk');
    }
  };

  const onSubmitControlScope = async (data: ControlScopeFormData) => {
    try {
      const engRisk = engagementRisks.find(r => r.id === data.engagementRiskId);
      const control = allControls.find(c => c.id === data.controlId);
      if (!engRisk || !control) return;

      await createEngagementControlMutation.mutateAsync({
        engagementcontrolname: `${control.controlname} - ${engRisk.engagementriskname}`,
        controlname: { id: control.id, controlname: control.controlname },
        engagementriskname: { id: engRisk.id, engagementriskname: engRisk.engagementriskname },
      });
      toast.success('Control linked to risk');
      setIsControlScopeDialogOpen(false);
      controlScopeForm.reset();
    } catch {
      toast.error('Failed to link control');
    }
  };

  const handleDeleteProcess = async () => {
    if (!deleteProcess) return;
    try {
      await deleteProcessMutation.mutateAsync(deleteProcess.id);
      toast.success('Process deleted');
      setDeleteProcess(null);
    } catch {
      toast.error('Failed to delete process');
    }
  };

  const handleDeleteObjective = async () => {
    if (!deleteObjective) return;
    try {
      await deleteObjectiveMutation.mutateAsync(deleteObjective.id);
      toast.success('Objective deleted');
      setDeleteObjective(null);
    } catch {
      toast.error('Failed to delete objective');
    }
  };

  const handleDeleteEngagementRisk = async () => {
    if (!deleteEngagementRisk) return;
    try {
      await deleteEngagementRiskMutation.mutateAsync(deleteEngagementRisk.id);
      toast.success('Risk removed from scope');
      setDeleteEngagementRisk(null);
    } catch {
      toast.error('Failed to remove risk');
    }
  };

  const handleDeleteEngagementControl = async () => {
    if (!deleteEngagementControl) return;
    try {
      await deleteEngagementControlMutation.mutateAsync(deleteEngagementControl.id);
      toast.success('Control removed from scope');
      setDeleteEngagementControl(null);
    } catch {
      toast.error('Failed to remove control');
    }
  };

  // Remediation action handlers
  const openCreateRemediationDialog = () => {
    setEditingRemediation(null);
    remediationForm.reset({
      actiondescription: '',
      findingId: '',
      ownerId: '',
      duedate: '',
      statusKey: 'StatusKey0',
      comments: '',
    });
    setIsRemediationDialogOpen(true);
  };

  const openEditRemediationDialog = (remediation: RemediationAction) => {
    setEditingRemediation(remediation);
    remediationForm.reset({
      actiondescription: remediation.actiondescription,
      findingId: remediation.findingtitle?.id || '',
      ownerId: remediation.ownername?.id || '',
      duedate: remediation.duedate,
      statusKey: remediation.statusKey,
      comments: remediation.comments || '',
    });
    setIsRemediationDialogOpen(true);
  };

  const onSubmitRemediation = async (data: RemediationFormData) => {
    try {
      const finding = allFindings.find(f => f.id === data.findingId);
      const owner = allFindingOwners.find(o => o.id === data.ownerId);
      if (!finding || !owner) {
        toast.error('Please select a finding and owner');
        return;
      }

      const payload = {
        actiondescription: data.actiondescription,
        findingtitle: { id: finding.id, findingtitle: finding.findingtitle },
        ownername: { id: owner.id, findingownername: owner.findingownername },
        duedate: data.duedate,
        statusKey: data.statusKey,
        comments: data.comments,
        completiondate: data.statusKey === 'StatusKey2' ? new Date().toISOString().split('T')[0] : undefined,
      };

      if (editingRemediation) {
        await updateRemediationMutation.mutateAsync({
          id: editingRemediation.id,
          changedFields: payload,
        });
        toast.success('Remediation action updated');
      } else {
        await createRemediationMutation.mutateAsync(payload as Omit<RemediationAction, 'id'>);
        toast.success('Remediation action created');
      }
      setIsRemediationDialogOpen(false);
      remediationForm.reset();
    } catch {
      toast.error('Failed to save remediation action');
    }
  };

  const handleDeleteRemediation = async () => {
    if (!deleteRemediation) return;
    try {
      await deleteRemediationMutation.mutateAsync(deleteRemediation.id);
      toast.success('Remediation action deleted');
      setDeleteRemediation(null);
    } catch {
      toast.error('Failed to delete remediation action');
    }
  };

  const openEvidenceDialog = (remediationId: string) => {
    setEvidenceForRemediationId(remediationId);
    evidenceForm.reset({
      evidencename: '',
      evidencetypeKey: 'EvidencetypeKey6',
      sharepointdocumenturl: '',
    });
    setIsEvidenceDialogOpen(true);
  };

  const onSubmitEvidence = async (data: EvidenceFormData) => {
    if (!evidenceForRemediationId) return;
    const remediation = allRemediationActions.find(r => r.id === evidenceForRemediationId);
    if (!remediation) return;

    try {
      // Get first audit user for uploadedby (in real app, would use current user)
      const uploadedBy = allAuditUsers[0];
      if (!uploadedBy) {
        toast.error('No audit user available');
        return;
      }

      const newEvidence = await createEvidenceMutation.mutateAsync({
        evidencename: data.evidencename,
        evidencetypeKey: data.evidencetypeKey,
        sharepointdocumenturl: data.sharepointdocumenturl,
        uploaddate: new Date().toISOString().split('T')[0],
        uploadedby: { id: uploadedBy.id, auditusername: uploadedBy.auditusername },
        finding: remediation.findingtitle ? { id: remediation.findingtitle.id, findingtitle: remediation.findingtitle.findingtitle } : undefined,
      });

      // Link evidence to remediation
      await updateRemediationMutation.mutateAsync({
        id: remediation.id,
        changedFields: {
          evidencename: { id: newEvidence.id, evidencename: newEvidence.evidencename },
        },
      });

      toast.success('Evidence submitted successfully');
      setIsEvidenceDialogOpen(false);
      setEvidenceForRemediationId(null);
      evidenceForm.reset();
    } catch {
      toast.error('Failed to submit evidence');
    }
  };

  // Auditor assignment handlers
  const openAuditorAssignmentDialog = () => {
    auditorAssignmentForm.reset({
      auditorId: '',
      roleKey: 'RoleKey1',
    });
    setIsAuditorDialogOpen(true);
  };

  const onSubmitAuditorAssignment = async (data: AuditorAssignmentFormData) => {
    if (!selectedEngagement) return;
    try {
      const auditor = allAuditUsers.find(u => u.id === data.auditorId);
      if (!auditor) {
        toast.error('Please select an auditor');
        return;
      }

      await createEngagementAuditorMutation.mutateAsync({
        engagementauditorname: `${auditor.auditusername} - ${selectedEngagement.engagementname}`,
        auditengagement: { id: selectedEngagement.id, engagementname: selectedEngagement.engagementname },
        audituser: { id: auditor.id, auditusername: auditor.auditusername },
        roleKey: data.roleKey,
        assigneddate: new Date().toISOString().split('T')[0],
      });
      toast.success('Auditor assigned to engagement');
      setIsAuditorDialogOpen(false);
      auditorAssignmentForm.reset();
    } catch {
      toast.error('Failed to assign auditor');
    }
  };

  const handleDeleteEngagementAuditor = async () => {
    if (!deleteEngagementAuditorState) return;
    try {
      await deleteEngagementAuditorMutation.mutateAsync(deleteEngagementAuditorState.id);
      toast.success('Auditor removed from engagement');
      setDeleteEngagementAuditorState(null);
    } catch {
      toast.error('Failed to remove auditor');
    }
  };

  // Remediation stats for selected engagement
  const remediationStats = useMemo(() => {
    const notStarted = engagementRemediations.filter(r => r.statusKey === 'StatusKey0').length;
    const inProgress = engagementRemediations.filter(r => r.statusKey === 'StatusKey1').length;
    const completed = engagementRemediations.filter(r => r.statusKey === 'StatusKey2').length;
    const overdue = engagementRemediations.filter(r => isOverdue(r)).length;
    return { notStarted, inProgress, completed, overdue, total: engagementRemediations.length };
  }, [engagementRemediations]);

  // Get engagement findings for reports
  const engagementFindings = useMemo(() => {
    const controlIds = new Set(engagementControls.map(ec => ec.controlname?.id));
    return allFindings.filter(f => f.controlname && controlIds.has(f.controlname.id));
  }, [engagementControls, allFindings]);

  // Get reports for this engagement
  const engagementReports = useMemo(() => {
    if (!selectedEngagement) return [];
    return allReports.filter(r => r.auditengagement?.id === selectedEngagement.id);
  }, [selectedEngagement, allReports]);

  // Report generation handler
  const handleGenerateReport = async () => {
    if (!selectedEngagement || allReportTemplates.length === 0) {
      toast.error('Please ensure an engagement is selected and templates are available');
      return;
    }

    const template = allReportTemplates[0];
    const generator = allAuditUsers[0];
    if (!generator) {
      toast.error('No audit user available');
      return;
    }

    setIsGeneratingReport(true);
    try {
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

      await createReportMutation.mutateAsync({
        reporttitle: `${selectedEngagement.engagementname} - Audit Report`,
        auditengagement: { id: selectedEngagement.id, engagementname: selectedEngagement.engagementname },
        templatename: { id: template.id, templatename: template.templatename },
        generatedby: { id: generator.id, auditusername: generator.auditusername },
        generateddate: new Date().toISOString().split('T')[0],
        statusKey: 'StatusKey2' as AuditReportStatusKey,
        sharepointreporturl: `https://example.com/reports/${selectedEngagement.id}`,
        scope,
        businessobjectives: businessObjectivesSummary,
        rcmsummary: rcmSummary,
        findingssummary: findingsSummary,
      });

      toast.success('Report generated successfully!');
      setIsReportDialogOpen(false);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const selectedStatus = watch('statusKey');
  const selectedManagerId = watch('auditManagerId');
  const selectedProcessId = objectiveForm.watch('processId');
  const selectedObjectiveId = riskScopeForm.watch('objectiveId');
  const selectedRiskId = riskScopeForm.watch('riskId');
  const selectedEngagementRiskId = controlScopeForm.watch('engagementRiskId');
  const selectedControlId = controlScopeForm.watch('controlId');

  // Summary stats
  const plannedCount = engagements.filter(e => e.statusKey === 'StatusKey0').length;
  const inProgressCount = engagements.filter(e => e.statusKey === 'StatusKey1').length;
  const completedCount = engagements.filter(e => e.statusKey === 'StatusKey2').length;

  const currentPhaseIndex = selectedEngagement ? getPhaseIndex(selectedEngagement.statusKey) : 0;

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
            <div className="w-12 h-12 bg-chart-1/10 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-chart-1" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Audit Engagements
              </h1>
              <p className="text-muted-foreground text-sm">
                {engagements.length} engagement{engagements.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            New Engagement
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
                <div className="w-10 h-10 bg-chart-4/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{plannedCount}</p>
                  <p className="text-sm text-muted-foreground">Planned</p>
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
                  <PlayCircle className="w-5 h-5 text-chart-1" />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Engagements List */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Search engagements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />

                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Spinner className="w-6 h-6" />
                    </div>
                  ) : filteredEngagements.length === 0 ? (
                    <div className="text-center py-12">
                      <Briefcase className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="font-medium text-foreground">No engagements</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? 'Try adjusting search' : 'Create your first engagement'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      <AnimatePresence>
                        {filteredEngagements.map((engagement, index) => {
                          const StatusIcon = getStatusIcon(engagement.statusKey);
                          const isSelected = selectedEngagement?.id === engagement.id;
                          return (
                            <motion.div
                              key={engagement.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ delay: index * 0.03, duration: 0.2 }}
                            >
                              <button
                                onClick={() => setSelectedEngagement(engagement)}
                                className={`w-full text-left p-3 rounded-lg transition-all border ${
                                  isSelected
                                    ? 'bg-primary/5 border-primary/30'
                                    : 'bg-card border-transparent hover:bg-muted/50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">
                                      {engagement.engagementname}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                      {engagement.period}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="outline" className={`text-xs ${getStatusColor(engagement.statusKey)}`}>
                                        <StatusIcon className="w-3 h-3 mr-1" />
                                        {AuditEngagementStatusKeyToLabel[engagement.statusKey]}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditDialog(engagement)}>
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => setDeleteEngagement(engagement)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    {isSelected && (
                                      <ChevronRight className="w-4 h-4 text-primary" />
                                    )}
                                  </div>
                                </div>
                              </button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Detail */}
          <div className="lg:col-span-2">
            {selectedEngagement ? (
              <motion.div
                key={selectedEngagement.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Engagement Header Card */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">
                          {selectedEngagement.engagementname}
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className={getStatusColor(selectedEngagement.statusKey)}>
                            {AuditEngagementStatusKeyToLabel[selectedEngagement.statusKey]}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Period: {selectedEngagement.period}
                          </span>
                        </div>
                        {selectedEngagement.auditmanagername && (
                          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Manager: {selectedEngagement.auditmanagername.auditmanagername}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedEngagement)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>

                    {/* Timeline Progress */}
                    <div className="mt-6 pt-6 border-t border-border">
                      <div className="flex items-center gap-2 mb-4">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Engagement Timeline</span>
                      </div>
                      <div className="relative">
                        <div className="flex items-center justify-between">
                          {planningPhases.map((phase, index) => {
                            const isCompleted = index < currentPhaseIndex;
                            const isCurrent = index === currentPhaseIndex;
                            return (
                              <div key={phase.id} className="flex flex-col items-center relative z-10">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                    isCompleted
                                      ? 'bg-accent border-accent text-accent-foreground'
                                      : isCurrent
                                      ? 'bg-primary border-primary text-primary-foreground'
                                      : 'bg-muted border-border text-muted-foreground'
                                  }`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : (
                                    <span className="text-xs font-bold">{index + 1}</span>
                                  )}
                                </div>
                                <span className={`text-xs mt-2 text-center max-w-[70px] ${
                                  isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                                }`}>
                                  {phase.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Progress line */}
                        <div className="absolute top-4 left-4 right-4 h-0.5 bg-border -translate-y-1/2">
                          <div
                            className="h-full bg-accent transition-all duration-500"
                            style={{ width: `${(currentPhaseIndex / (planningPhases.length - 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Scope Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                      <Layers className="w-5 h-5 text-chart-1 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{engagementProcesses.length}</p>
                      <p className="text-xs text-muted-foreground">Processes</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                      <Target className="w-5 h-5 text-chart-2 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{engagementObjectives.length}</p>
                      <p className="text-xs text-muted-foreground">Objectives</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                      <AlertTriangle className="w-5 h-5 text-chart-4 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{engagementRisks.length}</p>
                      <p className="text-xs text-muted-foreground">Risks</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                      <ShieldCheck className="w-5 h-5 text-accent mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">{engagementControls.length}</p>
                      <p className="text-xs text-muted-foreground">Controls</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs for Scope Management */}
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <Tabs defaultValue="processes" className="w-full">
                      <TabsList className="grid w-full grid-cols-7">
                        <TabsTrigger value="processes" className="gap-1.5">
                          <Layers className="w-4 h-4" />
                          <span className="hidden sm:inline">Processes</span>
                        </TabsTrigger>
                        <TabsTrigger value="objectives" className="gap-1.5">
                          <Target className="w-4 h-4" />
                          <span className="hidden sm:inline">Objectives</span>
                        </TabsTrigger>
                        <TabsTrigger value="risks" className="gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="hidden sm:inline">Risks</span>
                        </TabsTrigger>
                        <TabsTrigger value="controls" className="gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="hidden sm:inline">Controls</span>
                        </TabsTrigger>
                        <TabsTrigger value="remediation" className="gap-1.5">
                          <ClipboardList className="w-4 h-4" />
                          <span className="hidden sm:inline">Remediation</span>
                          {remediationStats.overdue > 0 && (
                            <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1 text-xs">
                              {remediationStats.overdue}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="auditors" className="gap-1.5">
                          <Users className="w-4 h-4" />
                          <span className="hidden sm:inline">Auditors</span>
                          {engagementAuditors.length > 0 && (
                            <Badge variant="outline" className="ml-1 h-5 min-w-[20px] px-1 text-xs bg-primary/10 text-primary border-primary/30">
                              {engagementAuditors.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span className="hidden sm:inline">Reports</span>
                          {engagementReports.length > 0 && (
                            <Badge variant="outline" className="ml-1 h-5 min-w-[20px] px-1 text-xs bg-chart-3/10 text-chart-3 border-chart-3/30">
                              {engagementReports.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>

                      {/* Processes Tab */}
                      <TabsContent value="processes" className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            {engagementProcesses.length} process{engagementProcesses.length !== 1 ? 'es' : ''} in scope
                          </p>
                          <Button size="sm" variant="outline" onClick={() => setIsProcessDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add Process
                          </Button>
                        </div>
                        {engagementProcesses.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <Layers className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No processes defined yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Add business processes to define audit scope</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Process Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[80px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {engagementProcesses.map(process => (
                                <TableRow key={process.id}>
                                  <TableCell className="font-medium">{process.processname}</TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {process.description || '—'}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:text-destructive"
                                      onClick={() => setDeleteProcess(process)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>

                      {/* Remediation Tab */}
                      <TabsContent value="remediation" className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <p className="text-sm text-muted-foreground">
                              {engagementRemediations.length} remediation action{engagementRemediations.length !== 1 ? 's' : ''}
                            </p>
                            {remediationStats.overdue > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {remediationStats.overdue} overdue
                              </Badge>
                            )}
                          </div>
                          <Button size="sm" variant="outline" onClick={openCreateRemediationDialog}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add Action
                          </Button>
                        </div>

                        {/* Remediation Stats Mini Cards */}
                        {engagementRemediations.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className="bg-muted/30 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-foreground">{remediationStats.notStarted}</p>
                              <p className="text-xs text-muted-foreground">Not Started</p>
                            </div>
                            <div className="bg-chart-1/10 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-chart-1">{remediationStats.inProgress}</p>
                              <p className="text-xs text-muted-foreground">In Progress</p>
                            </div>
                            <div className="bg-accent/10 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-accent">{remediationStats.completed}</p>
                              <p className="text-xs text-muted-foreground">Completed</p>
                            </div>
                            <div className="bg-destructive/10 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-destructive">{remediationStats.overdue}</p>
                              <p className="text-xs text-muted-foreground">Overdue</p>
                            </div>
                          </div>
                        )}

                        {engagementRemediations.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <ClipboardList className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No remediation actions yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Track remediation progress for audit findings</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Action</TableHead>
                                <TableHead>Finding</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[120px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {engagementRemediations.map(remediation => {
                                const overdue = isOverdue(remediation);
                                const effectiveStatus = overdue && remediation.statusKey !== 'StatusKey2' ? 'StatusKey3' : remediation.statusKey;
                                return (
                                  <TableRow key={remediation.id}>
                                    <TableCell>
                                      <p className="font-medium text-foreground line-clamp-2">
                                        {remediation.actiondescription}
                                      </p>
                                      {remediation.evidencename && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <FileCheck className="w-3 h-3 text-accent" />
                                          <span className="text-xs text-accent">Evidence attached</span>
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm">{remediation.findingtitle?.findingtitle || '—'}</span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm">{remediation.ownername?.findingownername || '—'}</span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className={`text-sm ${overdue && remediation.statusKey !== 'StatusKey2' ? 'text-destructive font-medium' : ''}`}>
                                          {new Date(remediation.duedate).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={`text-xs ${getRemediationStatusColor(effectiveStatus)}`}>
                                        {effectiveStatus === 'StatusKey3' ? 'Overdue' : RemediationActionStatusKeyToLabel[remediation.statusKey]}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => setViewingRemediation(remediation)}
                                        >
                                          <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => openEditRemediationDialog(remediation)}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        {remediation.statusKey !== 'StatusKey2' && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-accent hover:text-accent"
                                            onClick={() => openEvidenceDialog(remediation.id)}
                                          >
                                            <Upload className="w-4 h-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 hover:text-destructive"
                                          onClick={() => setDeleteRemediation(remediation)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>

                      {/* Objectives Tab */}
                      <TabsContent value="objectives" className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            {engagementObjectives.length} objective{engagementObjectives.length !== 1 ? 's' : ''} defined
                          </p>
                          <Button size="sm" variant="outline" onClick={() => setIsObjectiveDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add Objective
                          </Button>
                        </div>
                        {engagementObjectives.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <Target className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No objectives defined yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Add business objectives to link risks</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Objective Name</TableHead>
                                <TableHead>Process</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[80px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {engagementObjectives.map(objective => (
                                <TableRow key={objective.id}>
                                  <TableCell className="font-medium">{objective.objectivename}</TableCell>
                                  <TableCell>
                                    {objective.processname?.processname ? (
                                      <Badge variant="secondary" className="text-xs">
                                        {objective.processname.processname}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {objective.description || '—'}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:text-destructive"
                                      onClick={() => setDeleteObjective(objective)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>

                      {/* Risks Tab */}
                      <TabsContent value="risks" className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            {engagementRisks.length} risk{engagementRisks.length !== 1 ? 's' : ''} in scope
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsRiskScopeDialogOpen(true)}
                            disabled={engagementObjectives.length === 0 || availableRisks.length === 0}
                          >
                            <Link2 className="w-4 h-4 mr-1" />
                            Link Risk
                          </Button>
                        </div>
                        {engagementObjectives.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <Target className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Add objectives first</p>
                            <p className="text-xs text-muted-foreground mt-1">Risks are linked to business objectives</p>
                          </div>
                        ) : engagementRisks.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <AlertTriangle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No risks linked yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Link risks to objectives for risk assessment</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Risk</TableHead>
                                <TableHead>Linked Objective</TableHead>
                                <TableHead className="w-[80px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {engagementRisks.map(er => (
                                <TableRow key={er.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-chart-4" />
                                      <span className="font-medium">{er.riskname?.riskname}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      <Target className="w-3 h-3 mr-1" />
                                      {er.objectivename?.objectivename}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:text-destructive"
                                      onClick={() => setDeleteEngagementRisk(er)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>

                      {/* Controls Tab */}
                      <TabsContent value="controls" className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            {engagementControls.length} control{engagementControls.length !== 1 ? 's' : ''} mapped
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsControlScopeDialogOpen(true)}
                            disabled={engagementRisks.length === 0 || availableControls.length === 0}
                          >
                            <Link2 className="w-4 h-4 mr-1" />
                            Link Control
                          </Button>
                        </div>
                        {engagementRisks.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <AlertTriangle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Add risks first</p>
                            <p className="text-xs text-muted-foreground mt-1">Controls are linked to engagement risks</p>
                          </div>
                        ) : engagementControls.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <ShieldCheck className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No controls mapped yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Map controls to risks for testing scope</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Control</TableHead>
                                <TableHead>Mitigates Risk</TableHead>
                                <TableHead className="w-[80px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {engagementControls.map(ec => (
                                <TableRow key={ec.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <ShieldCheck className="w-4 h-4 text-accent" />
                                      <span className="font-medium">{ec.controlname?.controlname}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs bg-chart-4/5 text-chart-4 border-chart-4/30">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      {ec.engagementriskname?.engagementriskname?.split(' - ')[0] || 'Risk'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:text-destructive"
                                      onClick={() => setDeleteEngagementControl(ec)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>

                      {/* Auditors Tab */}
                      <TabsContent value="auditors" className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            {engagementAuditors.length} auditor{engagementAuditors.length !== 1 ? 's' : ''} assigned
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={openAuditorAssignmentDialog}
                            disabled={availableAuditors.length === 0}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Assign Auditor
                          </Button>
                        </div>
                        {engagementAuditors.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No auditors assigned yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Assign team members to this engagement</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Auditor</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Assigned Date</TableHead>
                                <TableHead className="w-[80px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {engagementAuditors.map(ea => (
                                <TableRow key={ea.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-primary" />
                                      </div>
                                      <span className="font-medium">{ea.audituser?.auditusername}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={`text-xs ${
                                      ea.roleKey === 'RoleKey0' ? 'bg-chart-1/10 text-chart-1 border-chart-1/30' : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {ea.roleKey ? EngagementAuditorRoleKeyToLabel[ea.roleKey] : 'Team Member'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {ea.assigneddate ? new Date(ea.assigneddate).toLocaleDateString() : '—'}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:text-destructive"
                                      onClick={() => setDeleteEngagementAuditorState(ea)}
                                    >

                      {/* Reports Tab */}
                      <TabsContent value="reports" className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-muted-foreground">
                            {engagementReports.length} report{engagementReports.length !== 1 ? 's' : ''} generated
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setIsReportDialogOpen(true)}
                            disabled={allReportTemplates.length === 0}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Generate Report
                          </Button>
                        </div>
                        {engagementReports.length === 0 ? (
                          <div className="text-center py-8 bg-muted/30 rounded-lg">
                            <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No reports generated yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Generate a comprehensive audit report with scope, RCM, and findings</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Report Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Generated Date</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {engagementReports.map(report => (
                                <TableRow key={report.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <FileCheck className="w-4 h-4 text-chart-3" />
                                      <span className="font-medium">{report.reporttitle}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={`text-xs ${
                                      report.statusKey === 'StatusKey2' ? 'bg-accent/10 text-accent border-accent/30' :
                                      report.statusKey === 'StatusKey1' ? 'bg-chart-1/10 text-chart-1 border-chart-1/30' :
                                      'bg-muted text-muted-foreground'
                                    }`}>
                                      {AuditReportStatusKeyToLabel[report.statusKey]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {report.generateddate ? new Date(report.generateddate).toLocaleDateString() : '—'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      {report.sharepointreporturl && (
                                        <a href={report.sharepointreporturl} target="_blank" rel="noopener noreferrer">
                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <ExternalLink className="w-4 h-4" />
                                          </Button>
                                        </a>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="border-0 shadow-sm h-full min-h-[400px]">
                <CardContent className="p-6 flex items-center justify-center h-full">
                  <div className="text-center">
                    <Briefcase className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-medium text-foreground">Select an engagement</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose an engagement from the list to view details and manage scope
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </motion.div>

      {/* Create/Edit Engagement Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingEngagement ? 'Edit Engagement' : 'New Audit Engagement'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="engagementname">Engagement Name *</Label>
              <Input
                id="engagementname"
                {...register('engagementname', { required: 'Engagement name is required' })}
                placeholder="e.g., Q1 2026 Financial Audit"
              />
              {errors.engagementname && (
                <p className="text-sm text-destructive">{errors.engagementname.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">Period *</Label>
                <Input
                  id="period"
                  {...register('period', { required: 'Period is required' })}
                  placeholder="e.g., Q1 2026"
                />
                {errors.period && (
                  <p className="text-sm text-destructive">{errors.period.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={selectedStatus || ''}
                  onValueChange={(value) => setValue('statusKey', value as AuditEngagementStatusKey)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager">Audit Manager</Label>
              <Select
                value={selectedManagerId || ''}
                onValueChange={(value) => setValue('auditManagerId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  {auditManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.auditmanagername}
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
                {editingEngagement ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Process Dialog */}
      <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Business Process</DialogTitle>
          </DialogHeader>
          <form onSubmit={processForm.handleSubmit(onSubmitProcess)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="processname">Process Name *</Label>
              <Input
                id="processname"
                {...processForm.register('processname', { required: true })}
                placeholder="e.g., Accounts Payable"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processdesc">Description</Label>
              <Textarea
                id="processdesc"
                {...processForm.register('description')}
                placeholder="Brief description of the process"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProcessMutation.isPending}>
                {createProcessMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
                Add Process
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Objective Dialog */}
      <Dialog open={isObjectiveDialogOpen} onOpenChange={setIsObjectiveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Business Objective</DialogTitle>
          </DialogHeader>
          <form onSubmit={objectiveForm.handleSubmit(onSubmitObjective)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="objectivename">Objective Name *</Label>
              <Input
                id="objectivename"
                {...objectiveForm.register('objectivename', { required: true })}
                placeholder="e.g., Ensure timely payments"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objectivedesc">Description</Label>
              <Textarea
                id="objectivedesc"
                {...objectiveForm.register('description')}
                placeholder="Brief description of the objective"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relatedprocess">Related Process</Label>
              <Select
                value={selectedProcessId || ''}
                onValueChange={(value) => objectiveForm.setValue('processId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select process (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {engagementProcesses.map((process) => (
                    <SelectItem key={process.id} value={process.id}>
                      {process.processname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsObjectiveDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createObjectiveMutation.isPending}>
                {createObjectiveMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
                Add Objective
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Risk to Objective Dialog */}
      <Dialog open={isRiskScopeDialogOpen} onOpenChange={setIsRiskScopeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-chart-4" />
              Link Risk to Objective
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={riskScopeForm.handleSubmit(onSubmitRiskScope)} className="space-y-4">
            <div className="space-y-2">
              <Label>Business Objective *</Label>
              <Select
                value={selectedObjectiveId || ''}
                onValueChange={(value) => riskScopeForm.setValue('objectiveId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select objective" />
                </SelectTrigger>
                <SelectContent>
                  {engagementObjectives.map((obj) => (
                    <SelectItem key={obj.id} value={obj.id}>
                      {obj.objectivename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-center py-2">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Risk *</Label>
              <Select
                value={selectedRiskId || ''}
                onValueChange={(value) => riskScopeForm.setValue('riskId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select risk to link" />
                </SelectTrigger>
                <SelectContent>
                  {availableRisks.map((risk) => (
                    <SelectItem key={risk.id} value={risk.id}>
                      {risk.riskname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableRisks.length === 0 && (
                <p className="text-xs text-muted-foreground">All risks have been linked</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRiskScopeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEngagementRiskMutation.isPending || !selectedObjectiveId || !selectedRiskId}>
                {createEngagementRiskMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
                Link Risk
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Control to Risk Dialog */}
      <Dialog open={isControlScopeDialogOpen} onOpenChange={setIsControlScopeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-accent" />
              Link Control to Risk
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={controlScopeForm.handleSubmit(onSubmitControlScope)} className="space-y-4">
            <div className="space-y-2">
              <Label>Engagement Risk *</Label>
              <Select
                value={selectedEngagementRiskId || ''}
                onValueChange={(value) => controlScopeForm.setValue('engagementRiskId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select risk" />
                </SelectTrigger>
                <SelectContent>
                  {engagementRisks.map((er) => (
                    <SelectItem key={er.id} value={er.id}>
                      {er.riskname?.riskname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-center py-2">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Control *</Label>
              <Select
                value={selectedControlId || ''}
                onValueChange={(value) => controlScopeForm.setValue('controlId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select control to link" />
                </SelectTrigger>
                <SelectContent>
                  {availableControls.map((control) => (
                    <SelectItem key={control.id} value={control.id}>
                      {control.controlname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableControls.length === 0 && (
                <p className="text-xs text-muted-foreground">All controls have been linked</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsControlScopeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEngagementControlMutation.isPending || !selectedEngagementRiskId || !selectedControlId}>
                {createEngagementControlMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
                Link Control
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Engagement Confirmation */}
      <AlertDialog open={!!deleteEngagement} onOpenChange={(open) => !open && setDeleteEngagement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Engagement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteEngagement?.engagementname}"? This will also remove all associated processes, objectives, and risk mappings.
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

      {/* Delete Process Confirmation */}
      <AlertDialog open={!!deleteProcess} onOpenChange={(open) => !open && setDeleteProcess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Process</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProcess?.processname}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProcess}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Objective Confirmation */}
      <AlertDialog open={!!deleteObjective} onOpenChange={(open) => !open && setDeleteObjective(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Objective</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteObjective?.objectivename}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteObjective}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Engagement Risk Confirmation */}
      <AlertDialog open={!!deleteEngagementRisk} onOpenChange={(open) => !open && setDeleteEngagementRisk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Risk from Scope</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteEngagementRisk?.riskname?.riskname}" from this engagement? This will also remove any linked controls.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEngagementRisk}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Engagement Control Confirmation */}
      <AlertDialog open={!!deleteEngagementControl} onOpenChange={(open) => !open && setDeleteEngagementControl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Control from Scope</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteEngagementControl?.controlname?.controlname}" from this engagement?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEngagementControl}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remediation Action Dialog */}
      <Dialog open={isRemediationDialogOpen} onOpenChange={setIsRemediationDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-chart-1" />
              {editingRemediation ? 'Edit Remediation Action' : 'New Remediation Action'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={remediationForm.handleSubmit(onSubmitRemediation)} className="space-y-4">
            <div className="space-y-2">
              <Label>Action Description *</Label>
              <Textarea
                {...remediationForm.register('actiondescription', { required: true })}
                placeholder="Describe the remediation action to be taken..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Finding *</Label>
                <Select
                  value={remediationForm.watch('findingId') || ''}
                  onValueChange={(value) => remediationForm.setValue('findingId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select finding" />
                  </SelectTrigger>
                  <SelectContent>
                    {allFindings.map((finding) => (
                      <SelectItem key={finding.id} value={finding.id}>
                        {finding.findingtitle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Owner *</Label>
                <Select
                  value={remediationForm.watch('ownerId') || ''}
                  onValueChange={(value) => remediationForm.setValue('ownerId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {allFindingOwners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.findingownername}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  {...remediationForm.register('duedate', { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={remediationForm.watch('statusKey') || 'StatusKey0'}
                  onValueChange={(value) => remediationForm.setValue('statusKey', value as RemediationActionStatusKey)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {remediationStatusOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea
                {...remediationForm.register('comments')}
                placeholder="Additional comments or notes..."
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRemediationDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRemediationMutation.isPending || updateRemediationMutation.isPending}>
                {(createRemediationMutation.isPending || updateRemediationMutation.isPending) && <Spinner className="w-4 h-4 mr-2" />}
                {editingRemediation ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Evidence Submission Dialog */}
      <Dialog open={isEvidenceDialogOpen} onOpenChange={setIsEvidenceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-accent" />
              Submit Evidence
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={evidenceForm.handleSubmit(onSubmitEvidence)} className="space-y-4">
            <div className="space-y-2">
              <Label>Evidence Name *</Label>
              <Input
                {...evidenceForm.register('evidencename', { required: true })}
                placeholder="e.g., Policy Document v2.1"
              />
            </div>
            <div className="space-y-2">
              <Label>Evidence Type *</Label>
              <Select
                value={evidenceForm.watch('evidencetypeKey') || 'EvidencetypeKey6'}
                onValueChange={(value) => evidenceForm.setValue('evidencetypeKey', value as EvidenceEvidencetypeKey)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {evidenceTypeOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Document URL *</Label>
              <Input
                {...evidenceForm.register('sharepointdocumenturl', { required: true })}
                placeholder="https://example.com/documents/evidence.pdf"
              />
              <p className="text-xs text-muted-foreground">Enter the SharePoint or document repository URL</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEvidenceDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEvidenceMutation.isPending}>
                {createEvidenceMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
                Submit Evidence
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Remediation Detail Dialog */}
      <Dialog open={!!viewingRemediation} onOpenChange={(open) => !open && setViewingRemediation(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-chart-1" />
              Remediation Details
            </DialogTitle>
          </DialogHeader>
          {viewingRemediation && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Action Description</Label>
                <p className="mt-1 text-foreground">{viewingRemediation.actiondescription}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Finding</Label>
                  <p className="mt-1 text-foreground">{viewingRemediation.findingtitle?.findingtitle || '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Owner</Label>
                  <p className="mt-1 text-foreground">{viewingRemediation.ownername?.findingownername || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <p className="mt-1 text-foreground">{new Date(viewingRemediation.duedate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant="outline" className={`mt-1 ${getRemediationStatusColor(viewingRemediation.statusKey)}`}>
                    {RemediationActionStatusKeyToLabel[viewingRemediation.statusKey]}
                  </Badge>
                </div>
              </div>
              {viewingRemediation.completiondate && (
                <div>
                  <Label className="text-xs text-muted-foreground">Completion Date</Label>
                  <p className="mt-1 text-foreground">{new Date(viewingRemediation.completiondate).toLocaleDateString()}</p>
                </div>
              )}
              {viewingRemediation.comments && (
                <div>
                  <Label className="text-xs text-muted-foreground">Comments</Label>
                  <p className="mt-1 text-foreground">{viewingRemediation.comments}</p>
                </div>
              )}
              {viewingRemediation.evidencename && (
                <div className="border-t pt-4">
                  <Label className="text-xs text-muted-foreground">Attached Evidence</Label>
                  <div className="mt-2 flex items-center gap-2 p-3 bg-accent/5 rounded-lg border border-accent/20">
                    <FileCheck className="w-5 h-5 text-accent" />
                    <span className="font-medium text-foreground">{viewingRemediation.evidencename.evidencename}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingRemediation(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (viewingRemediation) {
                openEditRemediationDialog(viewingRemediation);
                setViewingRemediation(null);
              }
            }}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Remediation Confirmation */}
      <AlertDialog open={!!deleteRemediation} onOpenChange={(open) => !open && setDeleteRemediation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Remediation Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this remediation action? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRemediation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRemediationMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Auditor Dialog */}
      <Dialog open={isAuditorDialogOpen} onOpenChange={setIsAuditorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Assign Auditor
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={auditorAssignmentForm.handleSubmit(onSubmitAuditorAssignment)} className="space-y-4">
            <div className="space-y-2">
              <Label>Auditor *</Label>
              <Select
                value={auditorAssignmentForm.watch('auditorId') || ''}
                onValueChange={(value) => auditorAssignmentForm.setValue('auditorId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select auditor" />
                </SelectTrigger>
                <SelectContent>
                  {availableAuditors.map((auditor) => (
                    <SelectItem key={auditor.id} value={auditor.id}>
                      {auditor.auditusername}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableAuditors.length === 0 && (
                <p className="text-xs text-muted-foreground">All auditors have been assigned</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={auditorAssignmentForm.watch('roleKey') || 'RoleKey1'}
                onValueChange={(value) => auditorAssignmentForm.setValue('roleKey', value as EngagementAuditorRoleKey)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {auditorRoleOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAuditorDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEngagementAuditorMutation.isPending || !auditorAssignmentForm.watch('auditorId')}
              >
                {createEngagementAuditorMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
                Assign Auditor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Engagement Auditor Confirmation */}
      <AlertDialog open={!!deleteEngagementAuditorState} onOpenChange={(open) => !open && setDeleteEngagementAuditorState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Auditor from Engagement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteEngagementAuditorState?.audituser?.auditusername}" from this engagement?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEngagementAuditor}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEngagementAuditorMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-chart-3" />
              Generate Audit Report
            </DialogTitle>
            <DialogDescription>
              Generate a comprehensive audit report for this engagement including scope, business objectives, RCM, and findings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                      {engagementObjectives.length === 0 && 'No objectives defined'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-chart-4 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">RCM ({engagementRisks.length} risks, {engagementControls.length} controls)</p>
                    <p className="text-muted-foreground">
                      {engagementRisks.slice(0, 2).map(r => r.riskname?.riskname).join(', ')}
                      {engagementRisks.length > 2 && ` +${engagementRisks.length - 2} more`}
                      {engagementRisks.length === 0 && 'No risks mapped'}
                    </p>
                  </div>
                </div>
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
            {allReportTemplates.length === 0 && (
              <p className="text-sm text-destructive">No report templates available. Please create a template first.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport || allReportTemplates.length === 0}
            >
              {isGeneratingReport && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Pencil, Trash2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Download, Upload, CheckSquare, FileSpreadsheet } from 'lucide-react';
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
  useCreateFinding,
  useUpdateFinding,
  useDeleteFinding,
  useControlList,
  useAuditUserList,
  useFindingOwnerList,
} from '@/generated/hooks';
import type { Finding, FindingSeverityKey } from '@/generated/models';
import { FindingSeverityKeyToLabel } from '@/generated/models';

// Excel XML generation helper
function generateExcelXML(data: Array<Record<string, string>>, headers: string[]): string {
  const escapeXml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<?mso-application progid="Excel.Sheet"?>';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
  xml += '<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E8E8E8" ss:Pattern="Solid"/></Style></Styles>';
  xml += '<Worksheet ss:Name="Findings"><Table>';
  
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

interface FindingFormData {
  findingtitle: string;
  recommendation?: string;
  severityKey?: FindingSeverityKey;
  controlId?: string;
  auditUserId?: string;
  findingOwnerId?: string;
}

const severityOptions: { key: FindingSeverityKey; label: string }[] = [
  { key: 'SeverityKey0', label: 'Low' },
  { key: 'SeverityKey1', label: 'Medium' },
  { key: 'SeverityKey2', label: 'High' },
];

function getSeverityColor(severity?: FindingSeverityKey): string {
  switch (severity) {
    case 'SeverityKey2':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'SeverityKey1':
      return 'bg-chart-3/10 text-chart-3 border-chart-3/30';
    case 'SeverityKey0':
      return 'bg-accent/10 text-accent border-accent/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

type SortField = 'findingtitle' | 'severity' | 'control' | 'owner';
type SortDirection = 'asc' | 'desc' | null;
