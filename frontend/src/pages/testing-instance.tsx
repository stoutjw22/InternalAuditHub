import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  FlaskConical, ArrowLeft, Plus, Pencil, Trash2, AlertCircle, CheckCircle2,
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
  useTestInstance,
  useTestInstanceStatistics,
  useConcludeTestInstance,
  useSampleItemList,
  useCreateSampleItem,
  useUpdateSampleItem,
  useDeleteSampleItem,
  useTestExceptionList,
  useCreateTestException,
  useUpdateTestException,
  useDeleteTestException,
  useEscalateTestException,
} from '@/generated/hooks';
import type { SampleItem, TestException } from '@/generated/models';

const OE_BADGE: Record<string, string> = {
  not_tested: 'bg-gray-100 text-gray-600',
  effective: 'bg-green-100 text-green-700',
  partially_effective: 'bg-yellow-100 text-yellow-700',
  ineffective: 'bg-red-100 text-red-700',
};

const RESULT_BADGE: Record<string, string> = {
  not_tested: 'bg-gray-100 text-gray-600',
  pass: 'bg-green-100 text-green-700',
  fail: 'bg-red-100 text-red-700',
  exception: 'bg-orange-100 text-orange-700',
  na: 'bg-slate-100 text-slate-600',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
};

type SampleFormValues = {
  item_identifier: string;
  description: string;
  result: string;
  tested_date: string;
  population_segment: string;
  notes: string;
};

type ExceptionFormValues = {
  title: string;
  description: string;
  exception_type: string;
  severity: string;
  root_cause: string;
  sample_item: string;
};

export default function TestInstancePage() {
  const { planId, instanceId } = useParams<{ planId: string; instanceId: string }>();
  const navigate = useNavigate();

  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [editSampleTarget, setEditSampleTarget] = useState<SampleItem | null>(null);
  const [deleteSampleTarget, setDeleteSampleTarget] = useState<SampleItem | null>(null);

  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [editExceptionTarget, setEditExceptionTarget] = useState<TestException | null>(null);
  const [deleteExceptionTarget, setDeleteExceptionTarget] = useState<TestException | null>(null);
  const [escalateTarget, setEscalateTarget] = useState<TestException | null>(null);
  const [concludeOpen, setConcludeOpen] = useState(false);

  const { data: instance, isLoading: instanceLoading } = useTestInstance(instanceId!);
  const { data: stats } = useTestInstanceStatistics(instanceId!);
  const { data: samples = [], isLoading: samplesLoading } = useSampleItemList(instanceId!);
  const { data: exceptions = [], isLoading: exceptionsLoading } = useTestExceptionList(instanceId!);

  const concludeMutation = useConcludeTestInstance();
  const createSample = useCreateSampleItem(instanceId!);
  const updateSample = useUpdateSampleItem(instanceId!);
  const deleteSample = useDeleteSampleItem(instanceId!);
  const createException = useCreateTestException(instanceId!);
  const updateException = useUpdateTestException(instanceId!);
  const deleteException = useDeleteTestException(instanceId!);
  const escalateException = useEscalateTestException(instanceId!);

  const sampleForm = useForm<SampleFormValues>({
    defaultValues: { item_identifier: '', description: '', result: 'not_tested', tested_date: '', population_segment: '', notes: '' },
  });

  const exceptionForm = useForm<ExceptionFormValues>({
    defaultValues: { title: '', description: '', exception_type: 'operating', severity: 'medium', root_cause: '', sample_item: '' },
  });

  function openCreateSample() {
    setEditSampleTarget(null);
    sampleForm.reset({ item_identifier: '', description: '', result: 'not_tested', tested_date: '', population_segment: '', notes: '' });
    setSampleDialogOpen(true);
  }

  function openEditSample(item: SampleItem) {
    setEditSampleTarget(item);
    sampleForm.reset({
      item_identifier: item.item_identifier,
      description: item.description ?? '',
      result: item.result,
      tested_date: item.tested_date ?? '',
      population_segment: item.population_segment ?? '',
      notes: item.notes ?? '',
    });
    setSampleDialogOpen(true);
  }

  function openCreateException() {
    setEditExceptionTarget(null);
    exceptionForm.reset({ title: '', description: '', exception_type: 'operating', severity: 'medium', root_cause: '', sample_item: '' });
    setExceptionDialogOpen(true);
  }

  function openEditException(exc: TestException) {
    setEditExceptionTarget(exc);
    exceptionForm.reset({
      title: exc.title,
      description: exc.description,
      exception_type: exc.exception_type,
      severity: exc.severity,
      root_cause: exc.root_cause ?? '',
      sample_item: exc.sample_item ? String(exc.sample_item) : '',
    });
    setExceptionDialogOpen(true);
  }

  async function onSubmitSample(values: SampleFormValues) {
    const payload: Partial<SampleItem> = {
      item_identifier: values.item_identifier,
      description: values.description || undefined,
      result: values.result as SampleItem['result'],
      tested_date: values.tested_date || undefined,
      population_segment: values.population_segment || undefined,
      notes: values.notes || undefined,
    };
    try {
      if (editSampleTarget) {
        await updateSample.mutateAsync({ id: editSampleTarget.id, data: payload });
        toast.success('Sample updated');
      } else {
        await createSample.mutateAsync(payload);
        toast.success('Sample added');
      }
      setSampleDialogOpen(false);
    } catch {
      toast.error('Failed to save sample');
    }
  }

  async function onSubmitException(values: ExceptionFormValues) {
    const payload: Partial<TestException> = {
      title: values.title,
      description: values.description,
      exception_type: values.exception_type as TestException['exception_type'],
      severity: values.severity as TestException['severity'],
      root_cause: values.root_cause || undefined,
      sample_item: (values.sample_item && values.sample_item !== '_none') ? values.sample_item as unknown as import('@/generated/models').UUID : null,
    };
    try {
      if (editExceptionTarget) {
        await updateException.mutateAsync({ id: editExceptionTarget.id, data: payload });
        toast.success('Exception updated');
      } else {
        await createException.mutateAsync(payload);
        toast.success('Exception logged');
      }
      setExceptionDialogOpen(false);
    } catch {
      toast.error('Failed to save exception');
    }
  }

  async function handleInlineResultChange(item: SampleItem, newResult: string) {
    try {
      await updateSample.mutateAsync({ id: item.id, data: { result: newResult as SampleItem['result'] } });
    } catch {
      toast.error('Failed to update result');
    }
  }

  async function confirmDeleteSample() {
    if (!deleteSampleTarget) return;
    try {
      await deleteSample.mutateAsync(deleteSampleTarget.id);
      toast.success('Sample deleted');
      setDeleteSampleTarget(null);
    } catch {
      toast.error('Failed to delete sample');
    }
  }

  async function confirmDeleteException() {
    if (!deleteExceptionTarget) return;
    try {
      await deleteException.mutateAsync(deleteExceptionTarget.id);
      toast.success('Exception deleted');
      setDeleteExceptionTarget(null);
    } catch {
      toast.error('Failed to delete exception');
    }
  }

  async function confirmEscalate() {
    if (!escalateTarget) return;
    try {
      await escalateException.mutateAsync(escalateTarget.id);
      toast.success('Finding created and linked');
      setEscalateTarget(null);
    } catch {
      toast.error('Failed to escalate exception');
    }
  }

  async function confirmConclude() {
    try {
      await concludeMutation.mutateAsync(instanceId!);
      toast.success('Instance concluded');
      setConcludeOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to conclude';
      toast.error(msg);
    }
  }

  if (instanceLoading) {
    return <div className="flex justify-center py-24"><Spinner /></div>;
  }

  if (!instance) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Test instance not found.</p>
        <Button variant="link" onClick={() => navigate(`/testing/${planId}`)}>Back to Plan</Button>
      </div>
    );
  }

  const canConclude = instance.operating_effectiveness_status === 'not_tested';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/testing/${planId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                Instance #{instance.instance_number}
              </h1>
              <Badge className={OE_BADGE[instance.operating_effectiveness_status] ?? ''}>
                {instance.operating_effectiveness_display ?? instance.operating_effectiveness_status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {instance.test_plan_name ?? ''}
              {(instance.test_period_start || instance.test_period_end) && (
                <span className="ml-2">
                  {instance.test_period_start ?? '?'} – {instance.test_period_end ?? '?'}
                </span>
              )}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setConcludeOpen(true)}
          disabled={!canConclude || concludeMutation.isPending}
          variant={canConclude ? 'default' : 'outline'}
        >
          {concludeMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          {canConclude ? 'Conclude' : 'Concluded'}
        </Button>
      </motion.div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Compliance Rate</p>
              <p className="text-2xl font-bold">
                {stats.compliance_rate != null ? `${stats.compliance_rate}%` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Samples</p>
              <p className="text-2xl font-bold">{stats.total_samples}</p>
              <p className="text-xs text-muted-foreground">{stats.testable_samples} testable</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Passed / Failed</p>
              <p className="text-2xl font-bold">
                <span className="text-green-600">{stats.passed}</span>
                <span className="text-muted-foreground text-lg"> / </span>
                <span className="text-red-600">{stats.failed}</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Exceptions</p>
              <p className="text-2xl font-bold">{stats.exception_count}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Samples */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sample Items</CardTitle>
            <Button size="sm" onClick={openCreateSample}>
              <Plus className="w-4 h-4 mr-2" /> Add Sample
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {samplesLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : samples.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
              <p className="text-sm">No samples yet</p>
              <Button variant="outline" size="sm" onClick={openCreateSample}>Add first sample</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Tested Date</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {samples.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">{item.item_identifier}</TableCell>
                    <TableCell>
                      <Select
                        value={item.result}
                        onValueChange={val => handleInlineResultChange(item, val)}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_tested">Not Tested</SelectItem>
                          <SelectItem value="pass">Pass</SelectItem>
                          <SelectItem value="fail">Fail</SelectItem>
                          <SelectItem value="exception">Exception</SelectItem>
                          <SelectItem value="na">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.tested_date ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.population_segment || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-40 truncate">{item.notes || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSample(item)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteSampleTarget(item)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Exceptions */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Exceptions</CardTitle>
            <Button size="sm" variant="outline" onClick={openCreateException}>
              <AlertCircle className="w-4 h-4 mr-2" /> Log Exception
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {exceptionsLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : exceptions.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
              <p className="text-sm">No exceptions logged</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Root Cause</TableHead>
                  <TableHead>Finding</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.map(exc => (
                  <TableRow key={exc.id}>
                    <TableCell className="font-medium text-sm max-w-48 truncate">{exc.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {exc.exception_type_display ?? exc.exception_type.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <Badge className={SEVERITY_BADGE[exc.severity] ?? ''}>
                        {exc.severity_display ?? exc.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {exc.root_cause ? exc.root_cause.replace('_', ' ') : '—'}
                    </TableCell>
                    <TableCell>
                      {exc.finding ? (
                        <Badge className="bg-purple-100 text-purple-700">Linked</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {!exc.finding && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => setEscalateTarget(exc)}
                          >
                            Escalate
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditException(exc)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteExceptionTarget(exc)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sample Create/Edit Dialog */}
      <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSampleTarget ? 'Edit Sample' : 'Add Sample'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={sampleForm.handleSubmit(onSubmitSample)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="item_identifier">Item Identifier *</Label>
                <Input id="item_identifier" {...sampleForm.register('item_identifier', { required: true })} placeholder="e.g. TXN-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Result</Label>
                <Select value={sampleForm.watch('result')} onValueChange={v => sampleForm.setValue('result', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_tested">Not Tested</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="exception">Exception</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tested_date">Tested Date</Label>
                <Input id="tested_date" type="date" {...sampleForm.register('tested_date')} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="population_segment">Population Segment</Label>
                <Input id="population_segment" {...sampleForm.register('population_segment')} placeholder="e.g. High Value" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="sample_description">Description</Label>
                <Textarea id="sample_description" {...sampleForm.register('description')} rows={2} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="sample_notes">Notes</Label>
                <Textarea id="sample_notes" {...sampleForm.register('notes')} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSampleDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={sampleForm.formState.isSubmitting}>
                {sampleForm.formState.isSubmitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                {editSampleTarget ? 'Save Changes' : 'Add Sample'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Exception Create/Edit Dialog */}
      <Dialog open={exceptionDialogOpen} onOpenChange={setExceptionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editExceptionTarget ? 'Edit Exception' : 'Log Exception'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={exceptionForm.handleSubmit(onSubmitException)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="exc_title">Title *</Label>
                <Input id="exc_title" {...exceptionForm.register('title', { required: true })} placeholder="e.g. Missing approval signature" />
              </div>
              <div className="space-y-1.5">
                <Label>Exception Type</Label>
                <Select value={exceptionForm.watch('exception_type')} onValueChange={v => exceptionForm.setValue('exception_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="operating">Operating</SelectItem>
                    <SelectItem value="data_quality">Data Quality</SelectItem>
                    <SelectItem value="missing_evidence">Missing Evidence</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select value={exceptionForm.watch('severity')} onValueChange={v => exceptionForm.setValue('severity', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Root Cause</Label>
                <Select value={exceptionForm.watch('root_cause') || '_none'} onValueChange={v => exceptionForm.setValue('root_cause', v === '_none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select root cause..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    <SelectItem value="process">Process</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="people">People</SelectItem>
                    <SelectItem value="control_design">Control Design</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {samples.length > 0 && (
                <div className="col-span-2 space-y-1.5">
                  <Label>Related Sample Item</Label>
                  <Select
                    value={exceptionForm.watch('sample_item') || '_none'}
                    onValueChange={v => exceptionForm.setValue('sample_item', v === '_none' ? '' : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select sample..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {samples.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.item_identifier}
                          {s.result !== 'not_tested' ? ` (${s.result})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="exc_description">Description *</Label>
                <Textarea
                  id="exc_description"
                  {...exceptionForm.register('description', { required: true })}
                  rows={3}
                  placeholder="Describe the exception in detail..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExceptionDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={exceptionForm.formState.isSubmitting}>
                {exceptionForm.formState.isSubmitting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                {editExceptionTarget ? 'Save Changes' : 'Log Exception'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Conclude Confirmation */}
      <AlertDialog open={concludeOpen} onOpenChange={setConcludeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conclude this test instance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will calculate the operating effectiveness rating from the current sample results and mark the instance as concluded.
              {instance.engagement_control && ' The linked engagement control will also be updated.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConclude} disabled={concludeMutation.isPending}>
              {concludeMutation.isPending ? <Spinner className="w-4 h-4 mr-2" /> : null}
              Conclude
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Sample Confirmation */}
      <AlertDialog open={!!deleteSampleTarget} onOpenChange={open => !open && setDeleteSampleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sample item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteSampleTarget?.item_identifier}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSample} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Exception Confirmation */}
      <AlertDialog open={!!deleteExceptionTarget} onOpenChange={open => !open && setDeleteExceptionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete exception?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete exception <strong>{deleteExceptionTarget?.title}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteException} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Escalate Confirmation */}
      <AlertDialog open={!!escalateTarget} onOpenChange={open => !open && setEscalateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Escalate to Finding?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a formal Finding in the engagement from exception <strong>{escalateTarget?.title}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEscalate} disabled={escalateException.isPending}>
              {escalateException.isPending ? <Spinner className="w-4 h-4 mr-2" /> : null}
              Escalate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
