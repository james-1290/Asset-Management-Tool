import type { ColumnDef } from "@tanstack/react-table";
import type { UserDetail } from "@/types/settings";
import { Badge } from "@/components/ui/badge";

export const userColumns: ColumnDef<UserDetail>[] = [
  {
    accessorKey: "username",
    header: "Username",
  },
  {
    accessorKey: "displayName",
    header: "Display Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "roles",
    header: "Role",
    cell: ({ row }) => {
      const roles = row.original.roles;
      return roles.map((role) => (
        <Badge key={role} variant={role === "Admin" ? "default" : "secondary"}>
          {role}
        </Badge>
      ));
    },
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "outline"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
  },
];
