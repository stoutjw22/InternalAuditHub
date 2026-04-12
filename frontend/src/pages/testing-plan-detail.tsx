import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FlaskConical, ArrowLeft, Plus, Pencil, Trash2, ChevronRight,
  Calendar, BarChart2, ClipboardList,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

import {
  useTestPlan, useUpdateTestPlan,
  useTestInstanceList, useCreateTestInstance, useDeleteTestInstance,
  useEngagementControlList,
} from '@/generated/hooks';
import type { TestInstance, TestPlan } from '@/generated/models';

const OE_BADGE: Record<string, string> = {
  not_tested: 'bg-gray-100 text-gray-600',
  effective: 'bg-green-100 text-green-700',
  partially_effective: 'bg-yellow-100 text-yellow-700',
  ineffective: 'bg-red-100 text-red-700',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

type InstanceFormValues = {
  test_period_start: string;
  test_period_end: string;
  notes: string;
  engagement_control: string;
};

type PlanFormValues = {
  name: string;
  description: string;
  sampling_method: string;
  population_size: string;
  sample_size: string;
  planned_date: string;
  tolerable_exception_rate: string;
  acceptance_criteria: string;
  procedure_template: string;
};

export default function TestPlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [instanceDialogOpen, setInstanceDialogOpen] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TestInstance | null>(null);

  const { data: plan, isLoading: planLoading } = useTestPlan(planId!);
  const { data: instances = [], isLoading: instancesLoading } = useTestInstanceList(planId!);
  const { data: engagementControls = [] } = useEngagementControlList(
    plan?.engagement ? String(plan.engagement) : undefined
  );

  const updatePlan = useUpdateTestPlan();
  const createInstance = useCreateTestInstance(planId!);
  const deleteInstance = useDeleteTestInstance();

  const instanceForm = useForm<InstanceFormValues>({
    defaultValues: { test_period_start: '', test_period_end: '', notes: '', engagement_control: '' },
  });

  const planForm = useForm<PlanFormValues>({
    defaultValues: {
      name: '', description: '', sampling_method: 'random',
      population_size: '', sample_size: '', planned_date: '',
      tolerable_exception_rate: '', acceptance_criteria: '', procedure_template: '',
    },
  });

  function openEditPlan() {
    if (!plan) return;
    planForm.reset({
      name: plan.name,
      description: plan.description ?? '',
      sampling_method: plan.sampling_method,
      population_size: plan.population_size?.toString() ?? '',
      sample_size: plan.sample_size?.toString() ?? '',
      planned_date: plan.planned_date ?? '',
      tolerable_exception_rate: plan.tolerable_exception_rate ?? '',
      acceptance_criteria: plan.acceptance_criteria ?? '',
      procedure_template: plan.procedure_template ?? '',
    });
    setEditPlanOpen(true);
  }

  async function onSubmitPlan(values: PlanFormValues) {
    if (!plan) return;
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        data: {
          name: values.name,
          description: values.description || undefined,
          sampling_method: values.sampling_method as TestPlan['sampling_method'],
          population_size: values.population_size ? parseInt(values.population_size) : null,
          sample_size: values.sample_size ? parseInt(values.sample_size) : null,
          planned_date: values.planned_date || undefined,
          tolerable_exception_rate: values.tolerable_exception_rate || null,
          acceptance_criteria: values.acceptance_criteria,
          procedure_template: values.procedure_template,
        },
      });
      toast.success('Test plan updated');
      setEditPlanOpen(false);
    } catch {
      toast.error('Failed to update test plan');
    }
  }

  async function onSubmitInstance(values: InstanceFormValues) {
    try {
      await createInstance.mutateAsync({
        test_period_start: values.test_period_start || undefined,
        test_period_end: values.test_period_end || undefined,
        notes: values.notes || undefined,
        engagement_control: values.engagement_control || undefined,
      });
      toast.success('Test instance created');
      instanceForm.reset({ test_period_start: '', test_period_end: '', notes: '', engagement_control: '' });
      setInstanceDialogOpen(false);
    } catch {
      toast.error('Failed to create test instance');
    }
  }

  async function confirmDeleteInstance() {
    if (!deleteTarget) return;
    try {
      await deleteInstance.mutateAsync({ id: deleteTarget.id, planId: planId! });
      toast.success('Test instance deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete test instance');
    }
  }

  if (planLoading) {
    return <div className="flex justify-center py-24"><Spinner /></div>;
  }

  if (!plan) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Test plan not found.</p>
        <Button variant="link" onClick={() => navigate('/testing')}>Back to Testing</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/testing')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
            <p className="text-sm text-muted-foreground">
              {plan.control_name ?? 'No control'}{plan.engagement_name ? ` · ${plan.engagement_name}` : ''}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={openEditPlan}>
          <Pencil className="w-4 h-4 mr-2" /> Edit Plan
        </Button>
      </motion.div>

      {/* Plan metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Status</span>
            </div>
            <Badge className={STATUS_BADGE[plan.status] ?? 'bg-gray-100 text-gray-700'}>
              {plan.status_display ?? plan.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Planned Date</span>
            </div>
            <p className="text-sm font-medium">{plan.planned_date ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Sampling</span>
            </div>
            <p className="text-sm font-medium capitalize">{plan.sampling_method}</p>
            {(plan.population_size || plan.sample_size) && (
              <p className="text-xs text-muted-foreground mt-1">
                {plan.sample_size ?? '?'} of {plan.population_size ?? '?'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail fields */}
      {(plan.acceptance_criteria || plan.procedure_template || plan.description) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm">{plan.description}</p>
              </div>
            )}
            {plan.acceptance_criteria && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Acceptance Criteria</p>
                <p className="text-sm whitespace-pre-wrap">{plan.acceptance_criteria}</p>
              </div>
            )}
            {plan.tolerable_exception_rate && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Tolerable Exception Rate</p>
                <p className="text-sm">{plan.tolerable_exception_rate}%</p>
              </div>
            )}
            {plan.procedure_template && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Procedure Template</p>
                <p className="text-sm whitespace-pre-wrap">{plan.procedure_template}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Instances */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Test Instances</CardTitle>
            <Button size="sm" onClick={() => setInstanceDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Instance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {instancesLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : instances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <FlaskConical className="w-8 h-8 opacity-30" />
              <p className="text-sm">No test instances yet</p>
              <Button variant="outline" size="sm" onClick={() => setInstanceDialogOpen(true)}>
                Create first instance
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instance #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>OE Status</TableHead>
                  <TableHead className="text-right">Compliance</TableHead>
                  <TableHead className="text-right">Exceptions</TableHead>
                  <TableHead className="text-right">Samples</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map(inst => (
                  <TableRow
                    key={inst.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/testing/${planId}/instances/${inst.id}`)}
                  >
                    <TableCell className="font-medium">#{inst.instance_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inst.test_period_start
                        ? `${inst.test_period_start}${inst.test_period_end ? ` – ${inst.test_period_end}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inst.performed_by_detail
                        ? `${inst.performed_by_detail.first_name} ${inst.performed_by_detail.last_name}`.trim() || inst.performed_by_detail.email
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={OE_BADGE[inst.operating_effectiveness_status] ?? ''}>
                        {inst.operating_effectiveness_display ?? inst.operating_effectiveness_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {inst.compliance_rate != null ? `${inst.compliance_rate}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">{inst.exception_count ?? 0}</TableCell>
                    <TableCell className="text-right text-sm">{inst.sample_count ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(inst)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Instance Dialog */}
      <Dialog open={instanceDialogOpen} onOpenChange={setInstanceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Test Instance</DialogTitle>
          </DialogHeader>
          <form onSubmit={instanceForm.handleSubmit(onSubmitInstance)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="test_period_start">Period Start</Label>
                <Input id="test_period_start" type="date" {...instanceForm.register('test_period_start')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="test_period_end">Period End</Label>
                <Input id="test_period_end" type="date" {...instanceForm.register('test_period_end')} />
              </div>
            </div>
            {engagementControls.length > 0 && (
              <div className="space-y-1.5">
                <Label>Engagement Control (optional)</Label>
                <Select
                  value={instanceForm.watch('engagement_control')}
                  onValueChange={v => instanceForm.setValue('engagement_control', v === '_none' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Link to engagement control..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {engagementControls.map(ec => (
                      <SelectItem key={ec.id} value={ec.id}>
                        {(ec as unknown as Record<string, string>)['display_name'] ?? ec.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="inst_notes">Notes</Label>
              <Textarea id="inst_notes" {...instanceForm.register('notes')} rows={3} placeholder="Scope, approach, or context..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInstanceDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={instanceForm.formState.isSubmitting}>
                {instanceForm.formState.isSubmitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                Create Instance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Test Plan</DialogTitle>
          </DialogHeader>
          <form onSubmit={planForm.handleSubmit(onSubmitPlan)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="edit_name">Name *</Label>
                <Input id="edit_name" {...planForm.register('name', { required: true })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea id="edit_description" {...planForm.register('description')} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Sampling Method</Label>
                <Select value={planForm.watch('sampling_method')} onValueChange={v => planForm.setValue('sampling_method', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random</SelectItem>
                    <SelectItem value="systematic">Systematic</SelectItem>
                    <SelectItem value="haphazard">Haphazard</SelectItem>
                    <SelectItem value="judgmental">Judgmental</SelectItem>
                    <SelectItem value="stratified">Stratified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_planned_date">Planned Date</Label>
                <Input id="edit_planned_date" type="date" {...planForm.register('planned_date')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_pop">Population Size</Label>
                <Input id="edit_pop" type="number" {...planForm.register('population_size')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_sample">Sample Size</Label>
                <Input id="edit_sample" type="number" {...planForm.register('sample_size')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="edit_ter">Tolerable Exception Rate (%)</Label>
                <Input id="edit_ter" type="number" step="0.01" {...planForm.register('tolerable_exception_rate')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="edit_ac">Acceptance Criteria</Label>
                <Textarea id="edit_ac" {...planForm.register('acceptance_criteria')} rows={2} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="edit_pt">Procedure Template</Label>
                <Textarea id="edit_pt" {...planForm.register('procedure_template')} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPlanOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={planForm.formState.isSubmitting}>
                {planForm.formState.isSubmitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Instance Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete test instance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete Instance <strong>#{deleteTarget?.instance_number}</strong> and all associated samples and exceptions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInstance} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
