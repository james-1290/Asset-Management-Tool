import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { useUsers, useSetUserActive } from "@/hooks/use-users";
import type { UserDetail } from "@/types/settings";
import { DataTable } from "@/components/data-table";
import { userColumns } from "./user-columns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { ColumnDef } from "@tanstack/react-table";

/**
 * Who has access to the application.
 *
 * Accounts are created by signing in, and names, emails and roles come from
 * Microsoft Entra — they are re-applied from the sign-in claims on every
 * request, so editing them here would be overwritten within moments. Access is
 * granted and removed by assigning app roles in Entra.
 *
 * The exception is deactivation, kept because an Entra assignment change can
 * take time to propagate and an administrator sometimes needs to cut off access
 * to this application right now.
 */
export function UsersTab() {
  const { data: users = [], isLoading } = useUsers(true);
  const setActive = useSetUserActive();

  const [pendingUser, setPendingUser] = useState<UserDetail | null>(null);

  function applyActiveChange() {
    if (!pendingUser) return;
    const isActive = !pendingUser.isActive;
    setActive.mutate(
      { id: pendingUser.id, data: { isActive } },
      {
        onSuccess: () => {
          toast.success(isActive ? "Access restored" : "Access revoked");
          setPendingUser(null);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update access");
        },
      }
    );
  }

  const actionsColumn: ColumnDef<UserDetail> = {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="User actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setPendingUser(row.original)}>
            {row.original.isActive ? (
              <>
                <ShieldOff className="mr-2 h-4 w-4" />
                Revoke access
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Restore access
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };

  const columns = [...userColumns, actionsColumn];

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <section className="bg-card rounded-xl border overflow-hidden shadow-sm">
        <div className="p-6 border-b flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Users</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-6">
            Accounts appear here after a person first signs in. Names, emails and roles are
            managed in Microsoft Entra — assign an <strong>Admin</strong>, <strong>Operator</strong>{" "}
            or <strong>User</strong> app role there to grant access. Revoking here blocks access to
            this application immediately, without waiting for Entra to propagate.
          </p>
          <DataTable columns={columns} data={users} />
        </div>
      </section>

      <ConfirmDialog
        open={!!pendingUser}
        onOpenChange={(open) => {
          if (!open) setPendingUser(null);
        }}
        title={pendingUser?.isActive ? "Revoke access?" : "Restore access?"}
        description={
          pendingUser?.isActive
            ? `${pendingUser?.displayName} will lose access to this application immediately, even though they can still sign in with Entra.`
            : `${pendingUser?.displayName} will regain access, provided they still hold an app role in Entra.`
        }
        confirmLabel={pendingUser?.isActive ? "Revoke access" : "Restore access"}
        onConfirm={applyActiveChange}
      />
    </div>
  );
}
