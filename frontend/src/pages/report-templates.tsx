import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Calendar,
  User,
  FileUp,
  MoreHorizontal,
  Search,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

import {
  useAuditReportTemplateList,
  useCreateAuditReportTemplate,
  useUpdateAuditReportTemplate,
  useDeleteAuditReportTemplate,
  useAuditUserList,
} from '@/generated/hooks';
import type { AuditReportTemplate } from '@/generated/models';

interface TemplateFormData {
  templatename: string;
  description?: string;
  sharepointtemplateurl: string;
  createdById?: string;
}

export default function ReportTemplatesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AuditReportTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<AuditReportTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: templates = [], isLoading } = useAuditReportTemplateList();
  const { data: auditUsers = [] } = useAuditUserList();

  const createMutation = useCreateAuditReportTemplate();
  const updateMutation = useUpdateAuditReportTemplate();
  const deleteMutation = useDeleteAuditReportTemplate();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TemplateFormData>();

  const filteredTemplates = templates.filter(template =>
    template.templatename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCreatedById = watch('createdById');

  const openCreateDialog = () => {
    setEditingTemplate(null);
    reset({ templatename: '', description: '', sharepointtemplateurl: '', createdById: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: AuditReportTemplate) => {
    setEditingTemplate(template);
    reset({
      templatename: template.templatename,
      description: template.description || '',
      sharepointtemplateurl: template.sharepointtemplateurl,
      createdById: template.createdby?.id || '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: TemplateFormData) => {
    try {
      const creator = auditUsers.find(u => u.id === data.createdById) || auditUsers[0];
      if (!creator) {
        toast.error('Please select a creator');
        return;
      }

      const payload = {
        templatename: data.templatename,
        description: data.description,
        sharepointtemplateurl: data.sharepointtemplateurl,
        createdby: { id: creator.id, auditusername: creator.auditusername },
        createddate: new Date().toISOString().split('T')[0],
      };

      if (editingTemplate) {
        await updateMutation.mutateAsync({ id: editingTemplate.id, changedFields: payload });
        toast.success('Template updated successfully');
      } else {
        await createMutation.mutateAsync(payload as Omit<AuditReportTemplate, 'id'>);
        toast.success('Template created successfully');
      }
      setIsDialogOpen(false);
      reset();
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    try {
      await deleteMutation.mutateAsync(deleteTemplate.id);
      toast.success('Template deleted successfully');
      setDeleteTemplate(null);
    } catch {
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' as const }}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-chart-2/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-chart-2" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Report Templates
              </h1>
              <p className="text-muted-foreground text-sm">
                {templates.length} template{templates.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <FileUp className="w-5 h-5 text-chart-2" />
              Word Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="w-6 h-6" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-medium text-foreground">No templates found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? 'Try adjusting your search' : 'Create your first report template'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>SharePoint URL</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredTemplates.map((template, index) => (
                      <motion.tr
                        key={template.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className="group"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-chart-2/10 rounded-lg flex items-center justify-center">
                              <FileText className="w-4 h-4 text-chart-2" />
                            </div>
                            <span className="font-medium text-foreground">{template.templatename}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px]">
                          <p className="truncate">{template.description || '—'}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm">{template.createdby?.auditusername || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm">
                              {template.createddate ? new Date(template.createddate).toLocaleDateString() : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {template.sharepointtemplateurl ? (
                            <a
                              href={template.sharepointtemplateurl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(template)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTemplate(template)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Create/Edit Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <FileText className="w-5 h-5 text-chart-2" />
              {editingTemplate ? 'Edit Template' : 'New Report Template'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templatename">Template Name *</Label>
              <Input
                id="templatename"
                {...register('templatename', { required: 'Template name is required' })}
                placeholder="e.g., Standard Audit Report"
              />
              {errors.templatename && (
                <p className="text-sm text-destructive">{errors.templatename.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the template purpose and structure..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sharepointtemplateurl">SharePoint Template URL *</Label>
              <Input
                id="sharepointtemplateurl"
                {...register('sharepointtemplateurl', { required: 'SharePoint URL is required' })}
                placeholder="https://sharepoint.com/sites/.../template.docx"
              />
              {errors.sharepointtemplateurl && (
                <p className="text-sm text-destructive">{errors.sharepointtemplateurl.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Link to the Word template stored in SharePoint
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="createdById">Created By</Label>
              <Select
                value={selectedCreatedById || ''}
                onValueChange={(value) => setValue('createdById', value)}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Spinner className="w-4 h-4 mr-2" />}
                {editingTemplate ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.templatename}"? This action cannot be undone.
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
