import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { Person } from "../../types/person";

interface ColumnActions {
  onEdit: (person: Person) => void;
  onArchive: (person: Person) => void;
}

export function getPersonColumns({
  onEdit,
  onArchive,
}: ColumnActions): ColumnDef<Person, unknown>[] {
  return [
    {
      accessorKey: "fullName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Full Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.getValue("email") || "—",
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => row.getValue("department") || "—",
    },
    {
      accessorKey: "jobTitle",
      header: "Job Title",
      cell: ({ row }) => row.getValue("jobTitle") || "—",
    },
    {
      accessorKey: "locationName",
      header: "Location",
      cell: ({ row }) => row.getValue("locationName") || "—",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const person = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(person)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onArchive(person)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
