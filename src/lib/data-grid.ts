import type { Column, RowData } from "@tanstack/react-table";

import type { DataGridFeatures, DataGridTable } from "@/lib/data-grid-features";
import {
  BaselineIcon,
  CalendarIcon,
  CheckSquareIcon,
  File,
  FileArchive,
  FileAudio,
  FileIcon,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  HashIcon,
  LinkIcon,
  ListChecksIcon,
  ListIcon,
  Presentation,
  TextInitialIcon,
} from "lucide-react";
import type * as React from "react";
import type { CellOpts, CellPosition, Direction, RowHeightValue } from "@/lib/data-grid-types";
import { isFunction } from "@/lib/is-function";

export const flexRender = <TProps extends object>(
  Comp: ((props: TProps) => React.ReactNode) | string | undefined,
  props: TProps,
): React.ReactNode => {
  if (Comp === undefined) {
    return undefined;
  }
  if (isFunction(Comp)) {
    return Comp(props);
  }
  return Comp;
};

export const matchSelectOption = (
  value: string,
  options: { value: string; label: string }[],
): string | undefined =>
  options.find(
    (o) =>
      o.value === value ||
      o.value.toLowerCase() === value.toLowerCase() ||
      o.label.toLowerCase() === value.toLowerCase(),
  )?.value;

export const getCellKey = (rowIndex: number, columnId: string) => `${rowIndex}:${columnId}`;

export const parseCellKey = (cellKey: string): Required<CellPosition> => {
  const [rowIndexStr, columnId] = cellKey.split(":");
  if (rowIndexStr && columnId) {
    const rowIndex = Math.trunc(Number(rowIndexStr));
    if (!Number.isNaN(rowIndex)) {
      return { columnId, rowIndex };
    }
  }
  return { columnId: "", rowIndex: 0 };
};

export const getRowHeightValue = (rowHeight: RowHeightValue): number => {
  const rowHeightMap = {
    "extra-tall": 96,
    medium: 56,
    short: 36,
    tall: 76,
  } satisfies Record<RowHeightValue, number>;

  return rowHeightMap[rowHeight];
};

export const getLineCount = (rowHeight: RowHeightValue): number => {
  const lineCountMap = {
    "extra-tall": 4,
    medium: 2,
    short: 1,
    tall: 3,
  } satisfies Record<RowHeightValue, number>;

  return lineCountMap[rowHeight];
};

export const getColumnBorderVisibility = <TData extends RowData>(params: {
  column: Column<DataGridFeatures, TData>;
  nextColumn?: Column<DataGridFeatures, TData>;
  isLastColumn: boolean;
}) => {
  const { column, nextColumn, isLastColumn } = params;

  const isPinned = column.getIsPinned();
  const isFirstRightPinnedColumn = isPinned === "end" && column.getIsFirstColumn("end");
  const isLastRightPinnedColumn = isPinned === "end" && column.getIsLastColumn("end");

  const nextIsPinned = nextColumn?.getIsPinned();
  const isBeforeRightPinned = nextIsPinned === "end" && nextColumn?.getIsFirstColumn("end");

  const showEndBorder = !isBeforeRightPinned && (isLastColumn || !isLastRightPinnedColumn);

  const showStartBorder = isFirstRightPinnedColumn;

  return {
    showEndBorder,
    showStartBorder,
  };
};

const INSET_SHADOW_START = "4px 0 4px -4px var(--border) inset";
const INSET_SHADOW_END = "-4px 0 4px -4px var(--border) inset";

const getPinnedBorderShadow = (params: {
  isLastLeftPinnedColumn: boolean;
  isFirstRightPinnedColumn: boolean;
  isRtl: boolean;
}): string | undefined => {
  const { isLastLeftPinnedColumn, isFirstRightPinnedColumn, isRtl } = params;
  if (isLastLeftPinnedColumn) {
    return isRtl ? INSET_SHADOW_START : INSET_SHADOW_END;
  }
  if (isFirstRightPinnedColumn) {
    return isRtl ? INSET_SHADOW_END : INSET_SHADOW_START;
  }
  return undefined;
};

export const getColumnPinningStyle = <TData extends RowData>(params: {
  column: Column<DataGridFeatures, TData>;
  withBorder?: boolean;
  dir?: Direction;
}): React.CSSProperties => {
  const { column, withBorder = false, dir = "ltr" } = params;

  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn = isPinned === "start" && column.getIsLastColumn("start");
  const isFirstRightPinnedColumn = isPinned === "end" && column.getIsFirstColumn("end");

  const isRtl = dir === "rtl";

  const leftPosition = isPinned === "start" ? `${column.getStart("start")}px` : undefined;
  const rightPosition = isPinned === "end" ? `${column.getAfter("end")}px` : undefined;

  const boxShadow = withBorder
    ? getPinnedBorderShadow({ isFirstRightPinnedColumn, isLastLeftPinnedColumn, isRtl })
    : undefined;

  return {
    background: "var(--background)",
    boxShadow,
    left: isRtl ? rightPosition : leftPosition,
    opacity: isPinned ? 0.97 : 1,
    position: isPinned ? "sticky" : "relative",
    right: isRtl ? leftPosition : rightPosition,
    width: column.getSize(),
    zIndex: isPinned ? 1 : undefined,
  };
};

export const getScrollDirection = (
  direction: string,
): "left" | "right" | "home" | "end" | undefined => {
  if (
    direction === "left" ||
    direction === "right" ||
    direction === "home" ||
    direction === "end"
  ) {
    return direction;
  }
  if (direction === "pageleft") {
    return "left";
  }
  if (direction === "pageright") {
    return "right";
  }
  return undefined;
};

export const scrollCellIntoView = <TData extends RowData>(params: {
  container: HTMLDivElement;
  targetCell: HTMLDivElement;
  tableRef: React.RefObject<DataGridTable<TData> | null>;
  viewportOffset: number;
  direction?: "left" | "right" | "home" | "end";
  isRtl: boolean;
}): void => {
  const { container, targetCell, tableRef, direction, viewportOffset, isRtl } = params;

  const containerRect = container.getBoundingClientRect();
  const cellRect = targetCell.getBoundingClientRect();

  const hasNegativeScroll = container.scrollLeft < 0;
  const isActuallyRtl = isRtl || hasNegativeScroll;

  const currentTable = tableRef.current;
  const leftPinnedColumns = currentTable?.getStartVisibleLeafColumns() ?? [];
  const rightPinnedColumns = currentTable?.getEndVisibleLeafColumns() ?? [];

  const leftPinnedWidth = leftPinnedColumns.reduce((sum, c) => sum + c.getSize(), 0);
  const rightPinnedWidth = rightPinnedColumns.reduce((sum, c) => sum + c.getSize(), 0);

  const viewportLeft = isActuallyRtl
    ? containerRect.left + rightPinnedWidth + viewportOffset
    : containerRect.left + leftPinnedWidth + viewportOffset;
  const viewportRight = isActuallyRtl
    ? containerRect.right - leftPinnedWidth - viewportOffset
    : containerRect.right - rightPinnedWidth - viewportOffset;

  const isFullyVisible = cellRect.left >= viewportLeft && cellRect.right <= viewportRight;

  if (isFullyVisible) {
    return;
  }

  const isClippedLeft = cellRect.left < viewportLeft;
  const isClippedRight = cellRect.right > viewportRight;

  let scrollDelta = 0;

  if (direction) {
    const shouldScrollRight = isActuallyRtl
      ? direction === "right" || direction === "home"
      : direction === "right" || direction === "end";

    scrollDelta = shouldScrollRight
      ? cellRect.right - viewportRight
      : -(viewportLeft - cellRect.left);
  } else if (isClippedRight) {
    scrollDelta = cellRect.right - viewportRight;
  } else if (isClippedLeft) {
    scrollDelta = -(viewportLeft - cellRect.left);
  }

  container.scrollLeft += scrollDelta;
};

/**
 * Parse clipboard TSV into a 2D string array.
 *
 * Two shapes are handled:
 * - Standard quoted TSV (Excel/Google Sheets), where a field containing a tab
 *   or newline is wrapped in double quotes and `""` escapes a literal quote.
 *   This is the only unambiguous way to represent multiline cell content, and
 *   it is what spreadsheet apps emit — so it round-trips exactly.
 * - Plain unquoted TSV: one row per line, one cell per tab.
 *
 * Unquoted embedded newlines are inherently ambiguous — nothing marks a
 * newline as cell data rather than a row break — so we don't try to
 * reconstruct them: each physical line becomes its own row. Copy from a real
 * spreadsheet (which quotes such fields) for multiline cells to survive.
 */
const isBlankRow = (row: string[]): boolean => row.length <= 1 && row.every((f) => f.length === 0);

const parseQuotedTsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  const endRow = () => {
    currentRow.push(currentField);
    if (!isBlankRow(currentRow)) {
      rows.push(currentRow);
    }
    currentRow = [];
    currentField = "";
  };

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 2;
      } else if (char === '"') {
        inQuotes = false;
        i += 1;
      } else {
        currentField += char;
        i += 1;
      }
    } else if (char === '"' && currentField === "") {
      inQuotes = true;
      i += 1;
    } else if (char === "\t") {
      currentRow.push(currentField);
      currentField = "";
      i += 1;
    } else if (char === "\n") {
      endRow();
      i += 1;
    } else if (char === "\r" && nextChar === "\n") {
      endRow();
      i += 2;
    } else {
      currentField += char;
      i += 1;
    }
  }

  endRow();

  return rows;
};

export const parseTsv = (text: string): string[][] => {
  // Route to the quoted parser when a field starts with a double quote — at the
  // start of the text, after a tab, or after a newline (a quoted field leading
  // a later row, which Excel emits with no `\t"` anywhere).
  if (text.startsWith('"') || text.includes('\t"') || text.includes('\n"')) {
    return parseQuotedTsv(text);
  }

  return text
    .split("\n")
    .map((line) => line.replace(/\r$/u, ""))
    .filter((line) => line.length > 0)
    .map((line) => line.split("\t"));
};

export const getIsInPopover = (element: EventTarget | null): boolean =>
  element instanceof Element &&
  (element.closest("[data-grid-cell-editor]") ||
    element.closest("[data-grid-popover]") ||
    element.closest("[data-grid-chat]")) !== null;

export const getColumnVariant = (
  variant?: CellOpts["variant"],
): {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
} | null => {
  switch (variant) {
    case "short-text": {
      return { icon: BaselineIcon, label: "Short text" };
    }
    case "long-text": {
      return { icon: TextInitialIcon, label: "Long text" };
    }
    case "number": {
      return { icon: HashIcon, label: "Number" };
    }
    case "url": {
      return { icon: LinkIcon, label: "URL" };
    }
    case "checkbox": {
      return { icon: CheckSquareIcon, label: "Checkbox" };
    }
    case "select": {
      return { icon: ListIcon, label: "Select" };
    }
    case "multi-select": {
      return { icon: ListChecksIcon, label: "Multi-select" };
    }
    case "date": {
      return { icon: CalendarIcon, label: "Date" };
    }
    case "file": {
      return { icon: FileIcon, label: "File" };
    }
    default: {
      return null;
    }
  }
};

export const getUrlHref = (urlString: string): string => {
  if (!urlString || urlString.trim() === "") {
    return "";
  }

  const trimmed = urlString.trim();

  // Reject dangerous protocols (extra safety, though our http:// prefix would neutralize them)
  if (/^(?:javascript|data|vbscript|file):/iu.test(trimmed)) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `http://${trimmed}`;
};

export const parseLocalDate = (dateStr: string | Date | null | undefined): Date | null => {
  if (!dateStr) {
    return null;
  }
  if (dateStr instanceof Date) {
    return dateStr;
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  // Verify date wasn't auto-corrected (e.g. Feb 30 -> Mar 1)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Locale and zone are both pinned so a date cell renders identically on the
// server, on the client, and for every visitor — `toLocaleDateString()` gives
// "19/07/2026" in en-GB and can hydrate-mismatch when a grid is prerendered.
// Module level so it isn't rebuilt once per cell.
const dateCellFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "numeric",
  timeZone: "UTC",
  year: "numeric",
});

export const formatDateForDisplay = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) {
    return "";
  }
  const date = parseLocalDate(dateStr);
  if (!date) {
    return dateStr instanceof Date ? "" : dateStr;
  }
  // parseLocalDate returns a *local* midnight Date, so hand the formatter the
  // calendar parts rebased to UTC — formatting the raw instant in a fixed zone
  // would shift the day for anyone east of UTC.
  return dateCellFormatter.format(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

export const formatFileSize = (bytes: number): string => {
  if (bytes <= 0 || !Number.isFinite(bytes)) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${Number((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

export const getFileIcon = (type: string): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
  if (type.startsWith("image/")) {
    return FileImage;
  }
  if (type.startsWith("video/")) {
    return FileVideo;
  }
  if (type.startsWith("audio/")) {
    return FileAudio;
  }
  if (type.includes("pdf")) {
    return FileText;
  }
  if (type.includes("zip") || type.includes("rar")) {
    return FileArchive;
  }
  if (type.includes("word") || type.includes("document") || type.includes("doc")) {
    return FileText;
  }
  if (type.includes("sheet") || type.includes("excel") || type.includes("xls")) {
    return FileSpreadsheet;
  }
  if (type.includes("presentation") || type.includes("powerpoint") || type.includes("ppt")) {
    return Presentation;
  }
  return File;
};
