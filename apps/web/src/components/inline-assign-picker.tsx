import { useState } from "react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { AvatarPlaceholder } from "./avatar-placeholder";
import { usePeople } from "../hooks/use-people";

interface InlineAssignPickerProps {
  onSelect: (personId: string) => void;
}

export function InlineAssignPicker({ onSelect }: InlineAssignPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: people } = usePeople();

  const filtered = (people ?? []).filter((p) =>
    !search || p.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-sm text-muted-foreground italic hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
        >
          Unassigned
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search employees..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No people found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((person) => (
                <CommandItem
                  key={person.id}
                  value={person.id}
                  className="flex items-center gap-2.5 py-2.5 px-3"
                  onSelect={() => {
                    onSelect(person.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <AvatarPlaceholder name={person.fullName} size="md" />
                  <span className="text-sm font-medium">{person.fullName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="border-t p-2 text-center">
            <Link
              to="/people"
              className="text-sm text-primary hover:underline underline-offset-2"
              onClick={() => setOpen(false)}
            >
              View all employees
            </Link>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
