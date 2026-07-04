import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export function HistoryDialog({ open, onOpenChange, title, children }: HistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>History &mdash; {title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
