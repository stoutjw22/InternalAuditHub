import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Pencil, Trash2, Search, Mail, Phone, UserCircle, ShieldCheck, AlertTriangle, FileSearch, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Spinner } from '@/components/ui/spinner';

import {
  useAuditUserList,
  useCreateAuditUser,
  useUpdateAuditUser,
  useDeleteAuditUser,
  useAuditManagerList,
  useCreateAuditManager,
  useUpdateAuditManager,
  useDeleteAuditManager,
  useRiskOwnerList,
  useCreateRiskOwner,
  useUpdateRiskOwner,
  useDeleteRiskOwner,
  useFindingOwnerList,
  useCreateFindingOwner,
  useUpdateFindingOwner,
  useDeleteFindingOwner,
  useControlOwnerList,
  useCreateControlOwner,
  useUpdateControlOwner,
  useDeleteControlOwner,
} from '@/generated/hooks';

interface UserFormData {
  name: string;
  email?: string;
  phone?: string;
}

type UserTab = 'auditUsers' | 'auditManagers' | 'riskOwners' | 'findingOwners' | 'controlOwners';

const userTypeConfig = {
  auditUsers: {
    label: 'Audit Users',
    singular: 'Audit User',
    nameField: 'auditusername' as const,
    icon: UserCircle,
    color: 'text-primary bg-primary/10',
  },
  auditManagers: {
    label: 'Audit Managers',
    singular: 'Audit Manager',
    nameField: 'auditmanagername' as const,
    icon: ShieldCheck,
    color: 'text-accent bg-accent/10',
  },
  riskOwners: {
    label: 'Risk Owners',
    singular: 'Risk Owner',
    nameField: 'riskownername' as const,
    icon: AlertTriangle,
    color: 'text-chart-4 bg-chart-4/10',
  },
  findingOwners: {
    label: 'Finding Owners',
    singular: 'Finding Owner',
    nameField: 'findingownername' as const,
    icon: FileSearch,
    color: 'text-chart-3 bg-chart-3/10',
  },
  controlOwners: {
    label: 'Control Owners',
    singular: 'Control Owner',
    nameField: 'controlownername' as const,
    icon: Settings,
    color: 'text-chart-5 bg-chart-5/10',
  },
};

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<UserTab>('auditUsers');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Audit Users
  const { data: auditUsers = [], isLoading: loadingAuditUsers } = useAuditUserList();
  const createAuditUser = useCreateAuditUser();
  const updateAuditUser = useUpdateAuditUser();
  const deleteAuditUserMutation = useDeleteAuditUser();

  // Audit Managers
  const { data: auditManagers = [], isLoading: loadingAuditManagers } = useAuditManagerList();
  const createAuditManager = useCreateAuditManager();
  const updateAuditManager = useUpdateAuditManager();
  const deleteAuditManagerMutation = useDeleteAuditManager();

  // Risk Owners
  const { data: riskOwners = [], isLoading: loadingRiskOwners } = useRiskOwnerList();
  const createRiskOwner = useCreateRiskOwner();
  const updateRiskOwner = useUpdateRiskOwner();
  const deleteRiskOwnerMutation = useDeleteRiskOwner();

  // Finding Owners
  const { data: findingOwners = [], isLoading: loadingFindingOwners } = useFindingOwnerList();
  const createFindingOwner = useCreateFindingOwner();
  const updateFindingOwner = useUpdateFindingOwner();
  const deleteFindingOwnerMutation = useDeleteFindingOwner();

  // Control Owners
  const { data: controlOwners = [], isLoading: loadingControlOwners } = useControlOwnerList();
  const createControlOwner = useCreateControlOwner();
  const updateControlOwner = useUpdateControlOwner();
  const deleteControlOwnerMutation = useDeleteControlOwner();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>();

  const config = userTypeConfig[activeTab];

  const getData = () => {
    switch (activeTab) {
      case 'auditUsers': return auditUsers;
      case 'auditManagers': return auditManagers;
      case 'riskOwners': return riskOwners;
      case 'findingOwners': return findingOwners;
      case 'controlOwners': return controlOwners;
    }
  };

  const getIsLoading = () => {
    switch (activeTab) {
      case 'auditUsers': return loadingAuditUsers;
      case 'auditManagers': return loadingAuditManagers;
      case 'riskOwners': return loadingRiskOwners;
      case 'findingOwners': return loadingFindingOwners;
      case 'controlOwners': return loadingControlOwners;
    }
  };

  const getName = (user: any) => {
    return user[config.nameField] || '';
  };

  const data = getData();
  const isLoading = getIsLoading();

  const filteredData = data.filter((user: any) =>
    getName(user).toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateDialog = () => {
    setEditingUser(null);
    reset({ name: '', email: '', phone: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    reset({
      name: getName(user),
      email: user.email || '',
      phone: user.phone || '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (formData: UserFormData) => {
    try {
      const payload: any = {
        email: formData.email,
        phone: formData.phone,
      };
      payload[config.nameField] = formData.name;

      if (editingUser) {
        switch (activeTab) {
          case 'auditUsers':
            await updateAuditUser.mutateAsync({ id: editingUser.id, changedFields: payload });
            break;
          case 'auditManagers':
            await updateAuditManager.mutateAsync({ id: editingUser.id, changedFields: payload });
            break;
          case 'riskOwners':
            await updateRiskOwner.mutateAsync({ id: editingUser.id, changedFields: payload });
            break;
          case 'findingOwners':
            await updateFindingOwner.mutateAsync({ id: editingUser.id, changedFields: payload });
            break;
          case 'controlOwners':
            await updateControlOwner.mutateAsync({ id: editingUser.id, changedFields: payload });
            break;
        }
        toast.success(`${config.singular} updated successfully`);
      } else {
        switch (activeTab) {
          case 'auditUsers':
            await createAuditUser.mutateAsync(payload);
            break;
          case 'auditManagers':
            await createAuditManager.mutateAsync(payload);
            break;
          case 'riskOwners':
            await createRiskOwner.mutateAsync(payload);
            break;
          case 'findingOwners':
            await createFindingOwner.mutateAsync(payload);
            break;
          case 'controlOwners':
            await createControlOwner.mutateAsync(payload);
            break;
        }
        toast.success(`${config.singular} created successfully`);
      }
      setIsDialogOpen(false);
      reset();
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      switch (activeTab) {
        case 'auditUsers':
          await deleteAuditUserMutation.mutateAsync(deleteUser.id);
          break;
        case 'auditManagers':
          await deleteAuditManagerMutation.mutateAsync(deleteUser.id);
          break;
        case 'riskOwners':
          await deleteRiskOwnerMutation.mutateAsync(deleteUser.id);
          break;
        case 'findingOwners':
          await deleteFindingOwnerMutation.mutateAsync(deleteUser.id);
          break;
        case 'controlOwners':
          await deleteControlOwnerMutation.mutateAsync(deleteUser.id);
          break;
      }
      toast.success(`${config.singular} deleted successfully`);
      setDeleteUser(null);
    } catch {
      toast.error(`Failed to delete ${config.singular.toLowerCase()}`);
    }
  };

  const isPending = createAuditUser.isPending || updateAuditUser.isPending ||
    createAuditManager.isPending || updateAuditManager.isPending ||
    createRiskOwner.isPending || updateRiskOwner.isPending ||
    createFindingOwner.isPending || updateFindingOwner.isPending ||
    createControlOwner.isPending || updateControlOwner.isPending;

  const isDeleting = deleteAuditUserMutation.isPending || deleteAuditManagerMutation.isPending ||
    deleteRiskOwnerMutation.isPending || deleteFindingOwnerMutation.isPending ||
    deleteControlOwnerMutation.isPending;

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
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                User Management
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage users and their roles
              </p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="w-4 h-4" />
            Add {config.singular}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {(Object.keys(userTypeConfig) as UserTab[]).map((type) => {
            const typeConfig = userTypeConfig[type];
            const count = type === 'auditUsers' ? auditUsers.length :
              type === 'auditManagers' ? auditManagers.length :
              type === 'riskOwners' ? riskOwners.length :
              type === 'findingOwners' ? findingOwners.length : controlOwners.length;
            const Icon = typeConfig.icon;
            return (
              <Card
                key={type}
                className={`border-0 shadow-sm cursor-pointer transition-all duration-200 ${
                  activeTab === type ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md hover:-translate-y-0.5'
                }`}
                onClick={() => setActiveTab(type)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${typeConfig.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{count}</p>
                      <p className="text-xs text-muted-foreground">{typeConfig.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* User Sub-tabs & Table */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UserTab)}>
          <TabsList className="grid w-full grid-cols-5">
            {(Object.keys(userTypeConfig) as UserTab[]).map((type) => (
              <TabsTrigger key={type} value={type} className="text-xs md:text-sm">
                {userTypeConfig[type].label}
              </TabsTrigger>
            ))}
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-4 space-y-4"
            >
              {/* Search */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${config.label.toLowerCase()}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
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
                  ) : filteredData.length === 0 ? (
                    <div className="text-center py-16">
                      <config.icon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="font-medium text-foreground">No {config.label.toLowerCase()} found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? 'Try adjusting your search terms' : `Get started by adding your first ${config.singular.toLowerCase()}`}
                      </p>
                      {!searchQuery && (
                        <Button onClick={openCreateDialog} className="gap-2 mt-4">
                          <Plus className="w-4 h-4" />
                          Add {config.singular}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold">Email</TableHead>
                          <TableHead className="font-semibold">Phone</TableHead>
                          <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((user: any, index: number) => (
                          <motion.tr
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.2 }}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${config.color}`}>
                                  <config.icon className="w-4 h-4" />
                                </div>
                                <span className="font-medium">{getName(user)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.email ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Mail className="w-4 h-4" />
                                  {user.email}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.phone ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="w-4 h-4" />
                                  {user.phone}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(user)}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteUser(user)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </motion.div>

      {/* Create/Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingUser ? `Edit ${config.singular}` : `Add ${config.singular}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                placeholder="Enter name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Enter phone"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Spinner className="w-4 h-4 mr-2" />}
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {config.singular}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteUser && getName(deleteUser)}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Spinner className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
or you want the ui files
