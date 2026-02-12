import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, KeyRound, Pencil } from "lucide-react";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useResetPassword,
} from "@/hooks/use-users";
import type { UserDetail, CreateUserRequest, UpdateUserRequest } from "@/types/settings";
import { DataTable } from "@/components/data-table";
import { userColumns } from "./user-columns";
import { UserFormDialog } from "./user-form-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";

export function UsersTab() {
  const { data: users = [], isLoading } = useUsers(true);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const resetPassword = useResetPassword();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
  const [resetUser, setResetUser] = useState<UserDetail | null>(null);

  function handleCreate(values: CreateUserRequest) {
    createUser.mutate(values, {
      onSuccess: () => {
        toast.success("User created");
        setFormOpen(false);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to create user");
      },
    });
  }

  function handleEdit(values: UpdateUserRequest) {
    if (!editingUser) return;
    updateUser.mutate(
      { id: editingUser.id, data: values },
      {
        onSuccess: () => {
          toast.success("User updated");
          setEditingUser(null);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update user");
        },
      }
    );
  }

  function handleResetPassword(newPassword: string) {
    if (!resetUser) return;
    resetPassword.mutate(
      { id: resetUser.id, data: { newPassword } },
      {
        onSuccess: () => {
          toast.success("Password reset successfully");
          setResetUser(null);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to reset password");
        },
      }
    );
  }

  const actionsColumn: ColumnDef<UserDetail> = {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditingUser(row.original)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {(!row.original.authProvider || row.original.authProvider === "LOCAL") && (
            <DropdownMenuItem onClick={() => setResetUser(row.original)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Reset Password
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  const columns = [...userColumns, actionsColumn];

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <DataTable columns={columns} data={users} />

      <UserFormDialog
        open={formOpen || !!editingUser}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingUser(null);
          }
        }}
        user={editingUser}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        loading={createUser.isPending || updateUser.isPending}
      />

      {resetUser && (
        <ResetPasswordDialog
          open={!!resetUser}
          onOpenChange={(open) => {
            if (!open) setResetUser(null);
          }}
          userName={resetUser.displayName}
          onSubmit={handleResetPassword}
          loading={resetPassword.isPending}
        />
      )}
    </div>
  );
}
