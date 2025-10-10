/**
 * Role-based permissions management component
 */
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  Settings, 
  Plus, 
  Minus, 
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  UserCheck,
  UserX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  user_id: string;
  user_name: string;
  user_type: 'admin' | 'student' | 'faculty';
  roles: string[];
  department?: string;
  is_active: boolean;
}

interface RolePermissionsProps {
  roles: Role[];
  permissions: Permission[];
  userRoles: UserRole[];
  onUpdateRole: (roleId: string, updates: Partial<Role>) => Promise<void>;
  onCreateRole: (role: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteRole: (roleId: string) => Promise<void>;
  onAssignUserRole: (userId: string, roleId: string) => Promise<void>;
  onRemoveUserRole: (userId: string, roleId: string) => Promise<void>;
  isLoading?: boolean;
}

const PERMISSION_CATEGORIES = [
  'Authentication',
  'User Management',
  'Student Management',
  'Faculty Management',
  'Feedback Management',
  'Report Generation',
  'System Administration',
  'Audit & Logging'
];

const RESOURCES = [
  'students',
  'faculty',
  'admins',
  'feedback',
  'reports',
  'audit_logs',
  'system_settings',
  'user_management'
];

const ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'export',
  'import',
  'approve',
  'reject'
];

export function RolePermissions({
  roles,
  permissions,
  userRoles,
  onUpdateRole,
  onCreateRole,
  onDeleteRole,
  onAssignUserRole,
  onRemoveUserRole,
  isLoading = false
}: RolePermissionsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'users'>('roles');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: '',
    description: '',
    permissions: [],
    is_system: false
  });
  const [selectedUser, setSelectedUser] = useState<UserRole | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Handle create role
  const handleCreateRole = useCallback(async () => {
    if (!newRole.name?.trim()) {
      toast({
        title: 'Role Name Required',
        description: 'Please enter a role name.',
        variant: 'destructive',
      });
      return;
    }

    if (!newRole.permissions || newRole.permissions.length === 0) {
      toast({
        title: 'Permissions Required',
        description: 'Please select at least one permission.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      await onCreateRole(newRole as Omit<Role, 'id' | 'created_at' | 'updated_at'>);
      toast({
        title: 'Role Created',
        description: 'New role has been created successfully.',
      });
      setNewRole({
        name: '',
        description: '',
        permissions: [],
        is_system: false
      });
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Failed to create role. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  }, [newRole, onCreateRole, toast]);

  // Handle update role
  const handleUpdateRole = useCallback(async (roleId: string, updates: Partial<Role>) => {
    try {
      await onUpdateRole(roleId, updates);
      toast({
        title: 'Role Updated',
        description: 'Role has been updated successfully.',
      });
      setEditingRole(null);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update role. Please try again.',
        variant: 'destructive',
      });
    }
  }, [onUpdateRole, toast]);

  // Handle delete role
  const handleDeleteRole = useCallback(async (roleId: string) => {
    try {
      await onDeleteRole(roleId);
      toast({
        title: 'Role Deleted',
        description: 'Role has been deleted successfully.',
      });
    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: 'Failed to delete role. Please try again.',
        variant: 'destructive',
      });
    }
  }, [onDeleteRole, toast]);

  // Handle assign user role
  const handleAssignUserRole = useCallback(async (userId: string, roleId: string) => {
    try {
      await onAssignUserRole(userId, roleId);
      toast({
        title: 'Role Assigned',
        description: 'Role has been assigned to user successfully.',
      });
    } catch (error) {
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign role. Please try again.',
        variant: 'destructive',
      });
    }
  }, [onAssignUserRole, toast]);

  // Handle remove user role
  const handleRemoveUserRole = useCallback(async (userId: string, roleId: string) => {
    try {
      await onRemoveUserRole(userId, roleId);
      toast({
        title: 'Role Removed',
        description: 'Role has been removed from user successfully.',
      });
    } catch (error) {
      toast({
        title: 'Removal Failed',
        description: 'Failed to remove role. Please try again.',
        variant: 'destructive',
      });
    }
  }, [onRemoveUserRole, toast]);

  // Toggle permission in role
  const toggleRolePermission = useCallback((roleId: string, permissionId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    const hasPermission = role.permissions.includes(permissionId);
    const updatedPermissions = hasPermission
      ? role.permissions.filter(p => p !== permissionId)
      : [...role.permissions, permissionId];

    handleUpdateRole(roleId, { permissions: updatedPermissions });
  }, [roles, handleUpdateRole]);

  // Toggle permission in new role
  const toggleNewRolePermission = useCallback((permissionId: string) => {
    const hasPermission = newRole.permissions?.includes(permissionId) || false;
    const updatedPermissions = hasPermission
      ? newRole.permissions?.filter(p => p !== permissionId) || []
      : [...(newRole.permissions || []), permissionId];

    setNewRole({ ...newRole, permissions: updatedPermissions });
  }, [newRole]);

  // Get role color
  const getRoleColor = (role: Role) => {
    if (role.is_system) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  // Get user type color
  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'student':
        return 'bg-blue-100 text-blue-800';
      case 'faculty':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role-Based Permissions</h2>
          <p className="text-muted-foreground">
            Manage user roles and permissions for system access control
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setActiveTab('roles')}>
            <Shield className="h-4 w-4 mr-2" />
            Roles
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          {/* Create New Role */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Create New Role</span>
              </CardTitle>
              <CardDescription>
                Define a new role with specific permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input
                    id="role-name"
                    placeholder="Enter role name"
                    value={newRole.name || ''}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role-description">Description</Label>
                  <Input
                    id="role-description"
                    placeholder="Enter role description"
                    value={newRole.description || ''}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Permissions Selection */}
              <div className="space-y-4">
                <Label>Select Permissions</Label>
                {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium text-sm">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {categoryPermissions.map(permission => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`new-${permission.id}`}
                            checked={newRole.permissions?.includes(permission.id) || false}
                            onCheckedChange={() => toggleNewRolePermission(permission.id)}
                          />
                          <Label htmlFor={`new-${permission.id}`} className="text-sm">
                            {permission.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleCreateRole} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Roles */}
          <div className="space-y-4">
            {roles.map(role => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      <Badge className={cn("text-xs", getRoleColor(role))}>
                        {role.is_system ? 'System' : 'Custom'}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRole(role)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      {!role.is_system && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Permissions ({role.permissions.length})</Label>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map(permissionId => {
                        const permission = permissions.find(p => p.id === permissionId);
                        return permission ? (
                          <Badge key={permissionId} variant="outline" className="text-xs">
                            {permission.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>
                  {categoryPermissions.length} permissions in this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryPermissions.map(permission => (
                    <div key={permission.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">{permission.name}</div>
                        <div className="text-sm text-muted-foreground">{permission.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {permission.resource} • {permission.action}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {permission.resource}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* User Assignments Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="space-y-4">
            {userRoles.map(user => (
              <Card key={user.user_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">{user.user_name}</CardTitle>
                      <Badge className={cn("text-xs", getUserTypeColor(user.user_type))}>
                        {user.user_type}
                      </Badge>
                      {user.department && (
                        <Badge variant="outline" className="text-xs">
                          {user.department}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.is_active ? (
                        <UserCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <UserX className="h-4 w-4 text-red-500" />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Assigned Roles ({user.roles.length})</Label>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map(roleId => {
                        const role = roles.find(r => r.id === roleId);
                        return role ? (
                          <Badge key={roleId} variant="outline" className="text-xs">
                            {role.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Role Edit Modal */}
      {editingRole && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Role: {editingRole.name}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingRole(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Role Name</Label>
                  <Input
                    id="edit-name"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={editingRole.description}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium text-sm">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {categoryPermissions.map(permission => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${permission.id}`}
                            checked={editingRole.permissions.includes(permission.id)}
                            onCheckedChange={() => toggleRolePermission(editingRole.id, permission.id)}
                          />
                          <Label htmlFor={`edit-${permission.id}`} className="text-sm">
                            {permission.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingRole(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateRole(editingRole.id, editingRole)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </Card>
      )}

      {/* User Role Assignment Modal */}
      {selectedUser && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assign Roles: {selectedUser.user_name}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Available Roles</Label>
                <div className="space-y-2">
                  {roles.map(role => {
                    const hasRole = selectedUser.roles.includes(role.id);
                    return (
                      <div key={role.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <div className="font-medium">{role.name}</div>
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        </div>
                        <Button
                          variant={hasRole ? "destructive" : "default"}
                          size="sm"
                          onClick={() => {
                            if (hasRole) {
                              handleRemoveUserRole(selectedUser.user_id, role.id);
                            } else {
                              handleAssignUserRole(selectedUser.user_id, role.id);
                            }
                          }}
                        >
                          {hasRole ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Remove
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Assign
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedUser(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </Card>
      )}
    </div>
  );
}
