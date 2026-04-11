import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
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
import { Empty } from '@/components/ui/empty';

import {
  useApprovalRequestList,
  useCreateApprovalRequest,
  useUpdateApprovalRequest,
  useDeleteApprovalRequest,
  useFindingList,
  useAuditUserList,
  useAuditManagerList,
} from '@/generated/hooks';
import type { ApprovalRequest, ApprovalRequestApprovalstatusKey } from '@/generated/models';
import { ApprovalRequestApprovalstatusKeyToLabel } from '@/generated/models';

interface ApprovalFormData {
  requesttitle: string;
  approvalstatusKey?: ApprovalRequestApprovalstatusKey;
  requestdate?: string;
  findingId?: string;
  requestedById?: string;
  approvedById?: string;
}

const statusOptions: { key: ApprovalRequestApprovalstatusKey; label: string }[] = [
  { key: 'ApprovalstatusKey0', label: 'Pending' },
  { key: 'ApprovalstatusKey1', label: 'Approved' },
  { key: 'ApprovalstatusKey2', label: 'Rejected' },
];

function getStatusColor(status?: ApprovalRequestApprovalstatusKey): string {
  switch (status) {
    case 'ApprovalstatusKey1':
      return 'bg-accent/10 text-accent border-accent/30';
    case 'ApprovalstatusKey2':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'ApprovalstatusKey0':
    default:
      return 'bg-chart-3/10 text-chart-3 border-chart-3/30';
  }
}

function getStatusIcon(status?: ApprovalRequestApprovalstatusKey) {
  switch (status) {
    case 'ApprovalstatusKey1':
      return <CheckCircle className="w-4 h-4" />;
    case 'ApprovalstatusKey2':
      return <XCircle className="w-4 h-4" />;
    case 'ApprovalstatusKey0':
    default:
      return <Clock className="w-4 h-4" />;
  }
}

export default function ApprovalsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApproval, setEditingApproval] = useState<ApprovalRequest | null>(null);
  const [deleteApproval, setDeleteApproval] = useState<ApprovalRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: approvals = [], isLoading } = useApprovalRequestList();
  const { data: findings = [] } = useFindingList();
  const { data: auditUsers = [] } = useAuditUserList();
  const { data: auditManagers = [] } = useAuditManagerList();
  const createMutation = useCreateApprovalRequest();
  const updateMutation = useUpdateApprovalRequest();
  const deleteMutation = useDeleteApprovalRequest();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ApprovalFormData>();

  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = approval.requesttitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || approval.approvalstatusKey === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = approvals.filter(a => a.approvalstatusKey === 'ApprovalstatusKey0').length;

  const openCreateDialog = () => {
    setEditingApproval(null);
    reset({
      requesttitle: '',
      approvalstatusKey: 'ApprovalstatusKey0',
      requestdate: new Date().toISOString().split('T')[0],
      findingId: '',
      requestedById: '',
      approvedById: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (approval: ApprovalRequest) => {
    setEditingApproval(approval);
    reset({
      requesttitle: approval.requesttitle,
      approvalstatusKey: approval.approvalstatusKey,
      requestdate: approval.requestdate || '',
      findingId: approval.findingtitle?.id || '',
      requestedById: approval.requestedby?.id || '',
      approvedById: approval.approvedby?.id || '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ApprovalFormData) => {
    try {
      const finding = findings.find(f => f.id === data.findingId);
      const requestedBy = auditUsers.find(u => u.id === data.requestedById);
      const approvedBy = auditManagers.find(m => m.id === data.approvedById);

      const payload = {
        requesttitle: data.requesttitle,
        approvalstatusKey: data.approvalstatusKey,
        requestdate: data.requestdate,
        findingtitle: finding ? { id: finding.id, findingtitle: finding.findingtitle } : undefined,
        requestedby: requestedBy ? { id: requestedBy.id, auditusername: requestedBy.auditusername } : undefined,
        approvedby: approvedBy ? { id: approvedBy.id, auditmanagername: approvedBy.auditmanagername } : undefined,
      };

      if (editingApproval) {
        await updateMutation.mutateAsync({ id: editingApproval.id, changedFields: payload });
        toast.success('Approval request updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Approval request created successfully');
      }
      setIsDialogOpen(false);
      reset();
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!deleteApproval) return;
    try {
      await deleteMutation.mutateAsync(deleteApproval.id);
      toast.success('Approval request deleted successfully');
      setDeleteApproval(null);
    } catch {
      toast.error('Failed to delete approval request');
    }
  };

  const handleQuickStatusUpdate = async (approval: ApprovalRequest, newStatus: ApprovalRequestApprovalstatusKey) => {
    try {
      await updateMutation.mutateAsync({
        id: approval.id,
        changedFields: { approvalstatusKey: newStatus },
      });
      toast.success(`Request ${newStatus === 'ApprovalstatusKey1' ? 'approved' : 'rejected'}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const selectedStatus = watch('approvalstatusKey');
  const selectedFindingId = watch('findingId');
  const selectedRequestedById = watch('requestedById');
  const selectedApprovedById = watch('approvedById');

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
            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Approval Requests
              </h1>
              <p className="text-muted-foreground text-sm">
                {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            ) : filteredApprovals.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="font-medium text-foreground">No approval requests found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by creating your first approval request'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button onClick={openCreateDialog} className="gap-2 mt-4">
                    <Plus className="w-4 h-4" />
                    New Request
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Request Title</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Finding</TableHead>
                    <TableHead className="font-semibold">Requested By</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredApprovals.map((approval, index) => (
                      <motion.tr
                        key={approval.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">{approval.requesttitle}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${getStatusColor(approval.approvalstatusKey)}`}>
                            {getStatusIcon(approval.approvalstatusKey)}
                            {approval.approvalstatusKey ? ApprovalRequestApprovalstatusKeyToLabel[approval.approvalstatusKey] : 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {approval.findingtitle?.findingtitle || (
                            <span className="text-muted-foreground italic">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {approval.requestedby?.auditusername || (
                            <span className="text-muted-foreground italic">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {approval.requestdate ? format(new Date(approval.requestdate), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {approval.approvalstatusKey === 'ApprovalstatusKey0' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleQuickStatusUpdate(approval, 'ApprovalstatusKey1')}
                                  className="h-8 w-8 text-accent hover:text-accent hover:bg-accent/10"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleQuickStatusUpdate(approval, 'ApprovalstatusKey2')}
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(approval)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteApproval(approval)}
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
              {editingApproval ? 'Edit Approval Request' : 'New Approval Request'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requesttitle">Request Title *</Label>
              <Input
                id="requesttitle"
                {...register('requesttitle', { required: 'Request title is required' })}
                placeholder="Enter request title"
              />
              {errors.requesttitle && (
                <p className="text-sm text-destructive">{errors.requesttitle.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={selectedStatus || ''}
                  onValueChange={(value) => setValue('approvalstatusKey', value as ApprovalRequestApprovalstatusKey)}
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
              <div className="space-y-2">
                <Label htmlFor="requestdate">Request Date</Label>
                <Input
                  id="requestdate"
                  type="date"
                  {...register('requestdate')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="finding">Related Finding</Label>
              <Select
                value={selectedFindingId || ''}
                onValueChange={(value) => setValue('findingId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select finding" />
                </SelectTrigger>
                <SelectContent>
                  {findings.map((finding) => (
                    <SelectItem key={finding.id} value={finding.id}>
                      {finding.findingtitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestedBy">Requested By</Label>
                <Select
                  value={selectedRequestedById || ''}
                  onValueChange={(value) => setValue('requestedById', value)}
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
              <div className="space-y-2">
                <Label htmlFor="approvedBy">Approved By</Label>
                <Select
                  value={selectedApprovedById || ''}
                  onValueChange={(value) => setValue('approvedById', value)}
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Spinner className="w-4 h-4 mr-2" />}
                {editingApproval ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteApproval} onOpenChange={(open) => !open && setDeleteApproval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Approval Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteApproval?.requesttitle}"? This action cannot be undone.
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
