/**
 * Undo actions component for reversing admin operations
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Undo2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  Shield,
  Trash2,
  Edit,
  Plus,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface UndoableAction {
  id: string;
  timestamp: string;
  user_id: string;
  user_type: string;
  action: string;
  resource_type: string;
  resource_id: string;
  description: string;
  original_data: Record<string, any>;
  can_undo: boolean;
  undo_reason?: string;
  expires_at: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface UndoActionsProps {
  actions: UndoableAction[];
  onUndo: (actionId: string, reason: string) => Promise<void>;
  onRefresh: () => void;
  isLoading?: boolean;
  canUndo?: boolean;
}

export function UndoActions({
  actions,
  onUndo,
  onRefresh,
  isLoading = false,
  canUndo = true
}: UndoActionsProps) {
  const { toast } = useToast();
  const [undoing, setUndoing] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<UndoableAction | null>(null);
  const [undoReason, setUndoReason] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Filter actions that can be undone
  const undoableActions = actions.filter(action => 
    action.can_undo && new Date(action.expires_at) > new Date()
  );

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes('create')) return Plus;
    if (action.includes('update')) return Edit;
    if (action.includes('delete')) return Trash2;
    if (action.includes('login')) return User;
    if (action.includes('security')) return Shield;
    return RotateCcw;
  };

  // Get risk level color
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Get time until expiration
  const getTimeUntilExpiration = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Handle undo action
  const handleUndo = async (action: UndoableAction) => {
    if (!undoReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for undoing this action.',
        variant: 'destructive',
      });
      return;
    }

    setUndoing(action.id);
    try {
      await onUndo(action.id, undoReason);
      toast({
        title: 'Action Undone',
        description: `Successfully undone ${action.action} action.`,
      });
      setShowConfirmDialog(false);
      setSelectedAction(null);
      setUndoReason('');
      onRefresh();
    } catch (error) {
      toast({
        title: 'Undo Failed',
        description: 'Failed to undo action. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUndoing(null);
    }
  };

  // Open undo dialog
  const openUndoDialog = (action: UndoableAction) => {
    setSelectedAction(action);
    setShowConfirmDialog(true);
    setUndoReason('');
  };

  // Get action description
  const getActionDescription = (action: UndoableAction) => {
    switch (action.action) {
      case 'create_student':
        return `Create student ${action.resource_id}`;
      case 'update_student':
        return `Update student ${action.resource_id}`;
      case 'delete_student':
        return `Delete student ${action.resource_id}`;
      case 'create_faculty':
        return `Create faculty ${action.resource_id}`;
      case 'update_faculty':
        return `Update faculty ${action.resource_id}`;
      case 'delete_faculty':
        return `Delete faculty ${action.resource_id}`;
      case 'admin_login':
        return `Admin login by ${action.user_id}`;
      case 'password_reset':
        return `Password reset for ${action.user_id}`;
      default:
        return action.description;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Undo Actions</h2>
          <p className="text-muted-foreground">
            Reverse recent admin operations within the allowed time window
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RotateCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Undo2 className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{undoableActions.length}</div>
                <div className="text-xs text-muted-foreground">Undoable Actions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {undoableActions.filter(a => getTimeUntilExpiration(a.expires_at) !== 'Expired').length}
                </div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold">
                  {undoableActions.filter(a => a.risk_level === 'high' || a.risk_level === 'critical').length}
                </div>
                <div className="text-xs text-muted-foreground">High Risk</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-2xl font-bold">
                  {actions.filter(a => !a.can_undo || new Date(a.expires_at) <= new Date()).length}
                </div>
                <div className="text-xs text-muted-foreground">Expired</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        {undoableActions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Undo2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Undoable Actions</h3>
              <p className="text-muted-foreground">
                There are currently no actions that can be undone.
              </p>
            </CardContent>
          </Card>
        ) : (
          undoableActions.map(action => {
            const ActionIcon = getActionIcon(action.action);
            const timeLeft = getTimeUntilExpiration(action.expires_at);
            const isExpired = timeLeft === 'Expired';
            const isHighRisk = action.risk_level === 'high' || action.risk_level === 'critical';

            return (
              <Card
                key={action.id}
                className={cn(
                  "transition-all hover:shadow-md",
                  isHighRisk && "border-red-200 bg-red-50/50",
                  isExpired && "opacity-50"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        getRiskColor(action.risk_level)
                      )}>
                        <ActionIcon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-sm font-medium">
                            {getActionDescription(action)}
                          </h4>
                          <Badge className={cn("text-xs", getRiskColor(action.risk_level))}>
                            {action.risk_level}
                          </Badge>
                          {isHighRisk && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center space-x-4">
                            <span>User: {action.user_id}</span>
                            <span>Type: {action.user_type}</span>
                            <span>Resource: {action.resource_type}</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span>Time: {new Date(action.timestamp).toLocaleString()}</span>
                            <span className={cn(
                              "flex items-center space-x-1",
                              isExpired ? "text-red-600" : "text-orange-600"
                            )}>
                              <Clock className="h-3 w-3" />
                              <span>{isExpired ? 'Expired' : `Expires in ${timeLeft}`}</span>
                            </span>
                          </div>
                        </div>

                        {action.undo_reason && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <strong>Undo Reason:</strong> {action.undo_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {canUndo && !isExpired && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUndoDialog(action)}
                          disabled={undoing === action.id}
                        >
                          {undoing === action.id ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Undoing...
                            </>
                          ) : (
                            <>
                              <Undo2 className="h-4 w-4 mr-2" />
                              Undo
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Undo Confirmation Dialog */}
      {showConfirmDialog && selectedAction && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Confirm Undo Action</span>
              </CardTitle>
              <CardDescription>
                This action cannot be undone. Please provide a reason for undoing this operation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium mb-2">Action Details:</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Action: {getActionDescription(selectedAction)}</div>
                  <div>User: {selectedAction.user_id} ({selectedAction.user_type})</div>
                  <div>Time: {new Date(selectedAction.timestamp).toLocaleString()}</div>
                  <div>Risk Level: {selectedAction.risk_level}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for Undo *</label>
                <textarea
                  className="w-full p-2 border rounded-md resize-none"
                  rows={3}
                  placeholder="Please provide a detailed reason for undoing this action..."
                  value={undoReason}
                  onChange={(e) => setUndoReason(e.target.value)}
                />
              </div>

              {selectedAction.risk_level === 'high' || selectedAction.risk_level === 'critical' ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This is a high-risk action. Undoing it may have significant consequences.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setSelectedAction(null);
                    setUndoReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUndo(selectedAction)}
                  disabled={!undoReason.trim() || undoing === selectedAction.id}
                  className={cn(
                    selectedAction.risk_level === 'high' || selectedAction.risk_level === 'critical'
                      ? "bg-red-600 hover:bg-red-700"
                      : ""
                  )}
                >
                  {undoing === selectedAction.id ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Undoing...
                    </>
                  ) : (
                    <>
                      <Undo2 className="h-4 w-4 mr-2" />
                      Confirm Undo
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </Card>
      )}
    </div>
  );
}
