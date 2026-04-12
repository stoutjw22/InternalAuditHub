import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { FlaskConical, Plus, Pencil, Trash2, Search, Filter, X, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
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
  useTestPlanList, useCreateTestPlan, useUpdateTestPlan, useDeleteTestPlan,
  useControlList, useEngagementList,
} from '@/generated/hooks';
import type { TestPlan } from '@/generated/models';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const DESIGN_BADGE: Record<string, string> = {
  not_assessed: 'bg-gray-100 text-gray-600',
  effective: 'bg-green-100 text-green-700',
  partially_effective: 'bg-yellow-100 text-yellow-700',
  ineffective: 'bg-red-100 text-red-700',
};

type FormValues = {
  name: string;
  description: string;
  control: string;
  engagement: string;
  sampling_method: string;
  population_size: string;
  sample_size: string;
  planned_date: string;
  tolerable_exception_rate: string;
  acceptance_criteria: string;
  procedure_template: string;
};

export default function TestingPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TestPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TestPlan | null>(null);

  const params: Record<string, unknown> = {};
  if (search) params.search = search;
  if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

  const { data: plans = [], isLoading } = useTestPlanList(params);
  const { data: controls = [] } = useControlList();
  const { data: engagements = [] } = useEngagementList();

  const createMutation = useCreateTestPlan();
  const updateMutation = useUpdateTestPlan();
  const deleteMutation = useDeleteTestPlan();

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      name: '', description: '', control: '', engagement: '',
      sampling_method: 'random', population_size: '', sample_size: '',
      planned_date: '', tolerable_exception_rate: '', acceptance_criteria: '', procedure_template: '',
    },
  });

  function openCreate() {
    setEditTarget(null);
    reset({
      name: '', description: '', control: '', engagement: '',
      sampling_method: 'random', population_size: '', sample_size: '',
      planned_date: '', tolerable_exception_rate: '', acceptance_criteria: '', procedure_template: '',
    });
    setDialogOpen(true);
  }

  function openEdit(plan: TestPlan) {
    setEditTarget(plan);
    reset({
      name: plan.name,
      description: plan.description ?? '',
      control: plan.control,
      engagement: plan.engagement ?? '',
      sampling_method: plan.sampling_method,
      population_size: plan.population_size?.toString() ?? '',
      sample_size: plan.sample_size?.toString() ?? '',
      planned_date: plan.planned_date ?? '',
      tolerable_exception_rate: plan.tolerable_exception_rate ?? '',
      acceptance_criteria: plan.acceptance_criteria ?? '',
      procedure_template: plan.procedure_template ?? '',
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const payload: Partial<TestPlan> = {
      name: values.name,
      description: values.description || undefined,
      control: values.control,
      engagement: values.engagement || undefined,
      sampling_method: values.sampling_method as TestPlan['sampling_method'],
      population_size: values.population_size ? parseInt(values.population_size) : null,
      sample_size: values.sample_size ? parseInt(values.sample_size) : null,
      planned_date: values.planned_date || undefined,
      tolerable_exception_rate: values.tolerable_exception_rate || null,
      acceptance_criteria: values.acceptance_criteria,
      procedure_template: values.procedure_template,
    };

    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, data: payload });
        toast.success('Test plan updated');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Test plan created');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save test plan');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Test plan deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete test plan');
    }
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
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Testing</h1>
            <p className="text-sm text-muted-foreground">Manage test plans and track testing workflows</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Test Plan
        </Button>
      </motion.div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search test plans..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-44">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <FlaskConical className="w-10 h-10 opacity-30" />
              <p>No test plans found</p>
              <Button variant="outline" size="sm" onClick={openCreate}>Create first test plan</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Design Effectiveness</TableHead>
                  <TableHead className="text-right">Sample Size</TableHead>
                  <TableHead className="text-right">Instances</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map(plan => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/testing/${plan.id}`)}
                  >
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{plan.control_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[plan.status] ?? 'bg-gray-100 text-gray-700'}>
                        {plan.status_display ?? plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={DESIGN_BADGE[plan.design_effectiveness_status] ?? ''}>
                        {plan.design_effectiveness_display ?? plan.design_effectiveness_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{plan.sample_size ?? '—'}</TableCell>
                    <TableCell className="text-right text-sm">{plan.instance_count ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{plan.planned_date ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(plan)}>
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

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Test Plan' : 'New Test Plan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register('name', { required: true })} placeholder="e.g. Q2 2026 Access Control Test" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Control *</Label>
                <Select
                  value={watch('control')}
                  onValueChange={v => setValue('control', v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select control" /></SelectTrigger>
                  <SelectContent>
                    {controls.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Engagement</Label>
                <Select
                  value={watch('engagement') || '_none'}
                  onValueChange={v => setValue('engagement', v === '_none' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Optional engagement" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {engagements.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.engagementname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sampling Method</Label>
                <Select value={watch('sampling_method')} onValueChange={v => setValue('sampling_method', v)}>
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
                <Label htmlFor="population_size">Population Size</Label>
                <Input id="population_size" type="number" {...register('population_size')} placeholder="e.g. 500" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sample_size">Sample Size</Label>
                <Input id="sample_size" type="number" {...register('sample_size')} placeholder="e.g. 25" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tolerable_exception_rate">Tolerable Exception Rate (%)</Label>
                <Input id="tolerable_exception_rate" type="number" step="0.01" {...register('tolerable_exception_rate')} placeholder="e.g. 5.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="planned_date">Planned Date</Label>
                <Input id="planned_date" type="date" {...register('planned_date')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="acceptance_criteria">Acceptance Criteria</Label>
                <Textarea id="acceptance_criteria" {...register('acceptance_criteria')} rows={2} placeholder="What constitutes a pass or fail..." />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="procedure_template">Procedure Template</Label>
                <Textarea id="procedure_template" {...register('procedure_template')} rows={3} placeholder="Standard steps to follow during test execution..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                {editTarget ? 'Save Changes' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete test plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all associated instances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
