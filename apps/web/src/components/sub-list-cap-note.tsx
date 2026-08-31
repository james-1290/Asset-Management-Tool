import { Link } from "react-router-dom";

/** Must match SUB_LIST_LIMIT in the API's Locations/People controllers. */
export const SUB_LIST_LIMIT = 200;

interface SubListCapNoteProps {
  /** How many rows came back for this sub-list. */
  count: number;
  /** Where the full, filtered list lives. */
  href: string;
  /** Plural noun, e.g. "assets". */
  noun: string;
}

/**
 * Says so when a detail-page sub-list has been truncated.
 *
 * These lists are capped so a location holding tens of thousands of records
 * can't be loaded in full just to render a summary card — but a silent
 * truncation is its own lie, since the card's count would read as the total.
 */
export function SubListCapNote({ count, href, noun }: SubListCapNoteProps) {
  if (count < SUB_LIST_LIMIT) return null;
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      Showing the first {SUB_LIST_LIMIT} {noun}.{" "}
      <Link to={href} className="text-primary hover:underline">
        View all {noun}
      </Link>
    </p>
  );
}
