import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { UserMinus, ArrowRightLeft, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOffboardPerson } from "@/hooks/use-people";
import { peopleApi } from "@/lib/api/people";
import type { AssignedAsset, AssignedCertificate, AssignedApplication, OffboardAction, PersonSearchResult } from "@/types/person";

type ActionType = "free" | "transfer" | "keep";

interface OffboardItem {
  entityType: "Asset" | "Certificate" | "Application";
  entityId: string;
  name: string;
  status: string;
  action: ActionType;
  transferToPersonId: string | null;
  transferToPersonName: string | null;
}

interface OffboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  personName: string;
  assets: AssignedAsset[];
  certificates: AssignedCertificate[];
  applications: AssignedApplication[];
}

export function OffboardDialog({
  open,
  onOpenChange,
  personId,
  personName,
  assets,
  certificates,
  applications,
}: OffboardDialogProps) {
  const offboardMutation = useOffboardPerson();
  const [items, setItems] = useState<OffboardItem[]>([]);
  const [deactivatePerson, setDeactivatePerson] = useState(false);
  const [searchResults, setSearchResults] = useState<Record<string, PersonSearchResult[]>>({});
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  // Build items list when dialog opens
  useEffect(() => {
    if (!open) return;
    const newItems: OffboardItem[] = [
      ...assets.map((a) => ({
        entityType: "Asset" as const,
        entityId: a.id,
        name: a.name,
        status: a.status,
        action: "free" as ActionType,
        transferToPersonId: null,
        transferToPersonName: null,
      })),
      ...certificates.map((c) => ({
        entityType: "Certificate" as const,
        entityId: c.id,
        name: c.name,
        status: c.status,
        action: "free" as ActionType,
        transferToPersonId: null,
        transferToPersonName: null,
      })),
      ...applications.map((a) => ({
        entityType: "Application" as const,
        entityId: a.id,
        name: a.name,
        status: a.status,
        action: "free" as ActionType,
        transferToPersonId: null,
        transferToPersonName: null,
      })),
    ];
    setItems(newItems);
    setDeactivatePerson(false);
    setSearchResults({});
    setSearchQueries({});
  }, [open, assets, certificates, applications]);

  const updateItem = useCallback((index: number, updates: Partial<OffboardItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  }, []);

  const setAllAction = useCallback((action: ActionType) => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        action,
        transferToPersonId: action !== "transfer" ? null : item.transferToPersonId,
        transferToPersonName: action !== "transfer" ? null : item.transferToPersonName,
      }))
    );
  }, []);

  const handlePersonSearch = useCallback(async (itemKey: string, query: string) => {
    setSearchQueries((prev) => ({ ...prev, [itemKey]: query }));
    if (query.length < 2) {
      setSearchResults((prev) => ({ ...prev, [itemKey]: [] }));
      return;
    }
    try {
      const results = await peopleApi.search(query, 5);
      // Filter out the person being offboarded
      setSearchResults((prev) => ({
        ...prev,
        [itemKey]: results.filter((r) => r.id !== personId),
      }));
    } catch {
      // Silently fail search
    }
  }, [personId]);

  function handleConfirm() {
    // Validate: any transfer items must have a target person
    const invalidTransfers = items.filter(
      (item) => item.action === "transfer" && !item.transferToPersonId
    );
    if (invalidTransfers.length > 0) {
      toast.error(
        `Please select a person for all "Transfer to..." items (${invalidTransfers.length} missing)`
      );
      return;
    }

    const actions: OffboardAction[] = items.map((item) => ({
      entityType: item.entityType,
      entityId: item.entityId,
      action: item.action,
      transferToPersonId: item.action === "transfer" ? item.transferToPersonId : null,
    }));

    offboardMutation.mutate(
      { id: personId, request: { actions, deactivatePerson } },
      {
        onSuccess: (result) => {
          const summary = result.actions.join("\n");
          toast.success("Offboarding complete", { description: summary });
          onOpenChange(false);
        },
        onError: () => {
          toast.error("Offboarding failed");
        },
      }
    );
  }

  const totalItems = items.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Offboard: {personName}
          </DialogTitle>
        </DialogHeader>

        {totalItems === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No items assigned to this person.
          </p>
        ) : (
          <>
            {/* Bulk actions */}
            <div className="flex items-center gap-2 pb-2">
              <span className="text-sm text-muted-foreground">
                {totalItems} item{totalItems !== 1 ? "s" : ""} assigned
              </span>
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllAction("free")}
                >
                  Select All: Mark as Available
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAllAction("keep")}
                >
                  Select All: Keep
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[280px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const itemKey = `${item.entityType}-${item.entityId}`;
                  return (
                    <TableRow key={itemKey}>
                      <TableCell>
                        <Badge variant="outline">{item.entityType}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Select
                            value={item.action}
                            onValueChange={(value: string) => {
                              updateItem(index, {
                                action: value as ActionType,
                                transferToPersonId:
                                  value !== "transfer" ? null : item.transferToPersonId,
                                transferToPersonName:
                                  value !== "transfer" ? null : item.transferToPersonName,
                              });
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Mark as Available</SelectItem>
                              <SelectItem value="transfer">Transfer to...</SelectItem>
                              <SelectItem value="keep">Keep</SelectItem>
                            </SelectContent>
                          </Select>

                          {item.action === "transfer" && (
                            <div className="space-y-1">
                              {item.transferToPersonName ? (
                                <div className="flex items-center gap-2">
                                  <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm">{item.transferToPersonName}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() =>
                                      updateItem(index, {
                                        transferToPersonId: null,
                                        transferToPersonName: null,
                                      })
                                    }
                                  >
                                    Change
                                  </Button>
                                </div>
                              ) : (
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input
                                    placeholder="Search person..."
                                    className="h-8 pl-7 text-sm"
                                    value={searchQueries[itemKey] ?? ""}
                                    onChange={(e) =>
                                      handlePersonSearch(itemKey, e.target.value)
                                    }
                                  />
                                  {(searchResults[itemKey]?.length ?? 0) > 0 && (
                                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                                      {searchResults[itemKey]!.map((p) => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                                          onClick={() => {
                                            updateItem(index, {
                                              transferToPersonId: p.id,
                                              transferToPersonName: p.fullName,
                                            });
                                            setSearchQueries((prev) => ({
                                              ...prev,
                                              [itemKey]: "",
                                            }));
                                            setSearchResults((prev) => ({
                                              ...prev,
                                              [itemKey]: [],
                                            }));
                                          }}
                                        >
                                          {p.fullName}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}

        {/* Archive checkbox */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Checkbox
            id="deactivate-person"
            checked={deactivatePerson}
            onCheckedChange={(checked) => setDeactivatePerson(checked === true)}
          />
          <label htmlFor="deactivate-person" className="text-sm cursor-pointer">
            Archive this person after offboarding
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={offboardMutation.isPending || totalItems === 0}
          >
            {offboardMutation.isPending ? "Processing..." : "Confirm Offboarding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
