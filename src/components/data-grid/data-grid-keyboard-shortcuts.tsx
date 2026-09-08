"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { SearchIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";

const SHORTCUT_KEY = "/";

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

interface DataGridKeyboardShortcutsProps {
  enableSearch?: boolean;
  enableUndoRedo?: boolean;
  enablePaste?: boolean;
  enableRowAdd?: boolean;
  enableRowsDelete?: boolean;
}

const ShortcutCard = ({ keys, description }: ShortcutGroup["shortcuts"][number]) => (
  <div className="flex items-center gap-4 px-3 py-2">
    <span className="flex-1 text-sm">{description}</span>
    <KbdGroup className="shrink-0">
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 && <span className="text-muted-foreground text-xs">+</span>}
          <Kbd>{key}</Kbd>
        </React.Fragment>
      ))}
    </KbdGroup>
  </div>
);
const DataGridKeyboardShortcutsImpl = ({
  enableSearch = false,
  enableUndoRedo = false,
  enablePaste = false,
  enableRowAdd = false,
  enableRowsDelete = false,
}: DataGridKeyboardShortcutsProps) => {
  const dir = useDirection();
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isMac =
    typeof navigator === "undefined" ? false : /Mac|iPhone|iPad|iPod/u.test(navigator.userAgent);

  const modKey = isMac ? "⌘" : "Ctrl";

  const onOpenChange = React.useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setInput("");
    }
  }, []);

  const onInitialFocus = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const onInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  }, []);

  const shortcutGroups: ShortcutGroup[] = React.useMemo(
    () => [
      {
        shortcuts: [
          {
            description: "Navigate between cells",
            keys: ["↑", "↓", "←", "→"],
          },
          {
            description: "Move to next cell",
            keys: ["Tab"],
          },
          {
            description: "Move to previous cell",
            keys: ["Shift", "Tab"],
          },
          {
            description: "Move to first column",
            keys: ["Home"],
          },
          {
            description: "Move to last column",
            keys: ["End"],
          },
          {
            description: "Move to first row (same column)",
            keys: [modKey, "↑"],
          },
          {
            description: "Move to last row (same column)",
            keys: [modKey, "↓"],
          },
          {
            description: "Move to first column (same row)",
            keys: [modKey, "←"],
          },
          {
            description: "Move to last column (same row)",
            keys: [modKey, "→"],
          },
          {
            description: "Move to first cell",
            keys: [modKey, "Home"],
          },
          {
            description: "Move to last cell",
            keys: [modKey, "End"],
          },
          {
            description: "Move up one page",
            keys: ["PgUp"],
          },
          {
            description: "Move down one page",
            keys: ["PgDn"],
          },
          {
            description: "Scroll up one page",
            keys: ["⌥", "↑"],
          },
          {
            description: "Scroll down one page",
            keys: ["⌥", "↓"],
          },
          {
            description: "Scroll left one page of columns",
            keys: ["⌥", "PgUp"],
          },
          {
            description: "Scroll right one page of columns",
            keys: ["⌥", "PgDn"],
          },
        ],
        title: "Navigation",
      },
      {
        shortcuts: [
          {
            description: "Extend selection",
            keys: ["Shift", "↑↓←→"],
          },
          {
            description: "Select to top of table",
            keys: [modKey, "Shift", "↑"],
          },
          {
            description: "Select to bottom of table",
            keys: [modKey, "Shift", "↓"],
          },
          {
            description: "Select to first column",
            keys: [modKey, "Shift", "←"],
          },
          {
            description: "Select to last column",
            keys: [modKey, "Shift", "→"],
          },
          {
            description: "Select all cells",
            keys: [modKey, "A"],
          },
          {
            description: "Toggle cell selection",
            keys: [modKey, "Click"],
          },
          {
            description: "Select range",
            keys: ["Shift", "Click"],
          },
          {
            description: "Clear selection",
            keys: ["Esc"],
          },
        ],
        title: "Selection",
      },
      {
        shortcuts: [
          {
            description: "Start editing cell",
            keys: ["Enter"],
          },
          {
            description: "Start editing cell",
            keys: ["F2"],
          },
          {
            description: "Start editing cell",
            keys: ["Double Click"],
          },
          ...(enableRowAdd
            ? [
                {
                  description: "Insert row below",
                  keys: ["Shift", "Enter"],
                },
              ]
            : []),
          {
            description: "Copy selected cells",
            keys: [modKey, "C"],
          },
          {
            description: "Cut selected cells",
            keys: [modKey, "X"],
          },
          ...(enablePaste
            ? [
                {
                  description: "Paste cells",
                  keys: [modKey, "V"],
                },
              ]
            : []),
          {
            description: "Clear selected cells",
            keys: ["Delete"],
          },
          {
            description: "Clear selected cells",
            keys: ["Backspace"],
          },
          ...(enableRowsDelete
            ? [
                {
                  description: "Delete selected rows",
                  keys: [modKey, "Backspace"],
                },
                {
                  description: "Delete selected rows",
                  keys: [modKey, "Delete"],
                },
              ]
            : []),
          ...(enableUndoRedo
            ? [
                {
                  description: "Undo last action",
                  keys: [modKey, "Z"],
                },
                {
                  description: "Redo last action",
                  keys: [modKey, "Shift", "Z"],
                },
              ]
            : []),
        ],
        title: "Editing",
      },
      ...(enableSearch
        ? [
            {
              shortcuts: [
                {
                  description: "Open search",
                  keys: [modKey, "F"],
                },
                {
                  description: "Next match",
                  keys: ["Enter"],
                },
                {
                  description: "Previous match",
                  keys: ["Shift", "Enter"],
                },
                {
                  description: "Close search",
                  keys: ["Esc"],
                },
              ],
              title: "Search",
            },
          ]
        : []),
      {
        shortcuts: [
          {
            description: "Toggle the filter menu",
            keys: [modKey, "Shift", "F"],
          },
          {
            description: "Remove filter (when focused)",
            keys: ["Backspace"],
          },
          {
            description: "Remove filter (when focused)",
            keys: ["Delete"],
          },
        ],
        title: "Filtering",
      },
      {
        shortcuts: [
          {
            description: "Toggle the sort menu",
            keys: [modKey, "Shift", "S"],
          },
          {
            description: "Remove sort (when focused)",
            keys: ["Backspace"],
          },
          {
            description: "Remove sort (when focused)",
            keys: ["Delete"],
          },
        ],
        title: "Sorting",
      },
      {
        shortcuts: [
          {
            description: "Show keyboard shortcuts",
            keys: [modKey, "/"],
          },
        ],
        title: "General",
      },
    ],
    [modKey, enableSearch, enableUndoRedo, enablePaste, enableRowAdd, enableRowsDelete],
  );

  const filteredGroups = React.useMemo(() => {
    if (!input.trim()) {
      return shortcutGroups;
    }

    const query = input.toLowerCase();
    return shortcutGroups
      .map((group) => ({
        ...group,
        shortcuts: group.shortcuts.filter(
          (shortcut) =>
            shortcut.description.toLowerCase().includes(query) ||
            shortcut.keys.some((key) => key.toLowerCase().includes(query)),
        ),
      }))
      .filter((group) => group.shortcuts.length > 0);
  }, [shortcutGroups, input]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === SHORTCUT_KEY) {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={dir}
        className="max-w-2xl px-0"
        initialFocus={onInitialFocus}
        showCloseButton={false}
      >
        <DialogClose
          className="absolute end-6 top-6"
          render={
            <Button variant="ghost" size="icon" className="size-6">
              <XIcon />
            </Button>
          }
        />
        <DialogHeader className="px-6">
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription className="sr-only">
            Use these keyboard shortcuts to navigate and interact with the data grid more
            efficiently.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6">
          <div className="relative">
            <SearchIcon className="absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search shortcuts..."
              className="h-8 ps-8"
              value={input}
              onChange={onInputChange}
            />
          </div>
        </div>
        <Separator className="mx-auto data-[orientation=horizontal]:w-[calc(100%-(--spacing(12)))]" />
        <div className="h-[40vh] overflow-y-auto px-6">
          {filteredGroups.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <SearchIcon className="pointer-events-none size-6" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="font-medium text-lg tracking-tight">No shortcuts found</div>
                <p className="text-muted-foreground text-sm">Try searching for a different term.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {filteredGroups.map((shortcutGroup) => (
                <div key={shortcutGroup.title} className="flex flex-col gap-2">
                  <h3 className="font-semibold text-foreground text-sm">{shortcutGroup.title}</h3>
                  <div className="divide-y divide-border rounded-md border">
                    {shortcutGroup.shortcuts.map((shortcut) => (
                      <ShortcutCard
                        key={shortcut.description}
                        keys={shortcut.keys}
                        description={shortcut.description}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
export const DataGridKeyboardShortcuts = React.memo(
  DataGridKeyboardShortcutsImpl,
  (prev, next) =>
    prev.enableSearch === next.enableSearch &&
    prev.enableUndoRedo === next.enableUndoRedo &&
    prev.enablePaste === next.enablePaste &&
    prev.enableRowAdd === next.enableRowAdd &&
    prev.enableRowsDelete === next.enableRowsDelete,
);
