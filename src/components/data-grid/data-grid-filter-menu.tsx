"use client";

import type { Column, ColumnFilter, Table } from "@tanstack/react-table";
import {
  BaselineIcon,
  CalendarIcon,
  Check,
  CheckSquareIcon,
  FileIcon,
  HashIcon,
  LinkIcon,
  ListChecksIcon,
  ListFilter,
  ListIcon,
  TextInitialIcon,
  Trash2,
  XIcon,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import {
  getDefaultOperator,
  getOperatorsForVariant,
} from "@/lib/data-grid-filters";
import { formatDate } from "@/components/ui/utils";
import { cn } from "@/components/ui/utils";
import type { FilterOperator, FilterValue, CellOpts } from "@/types/data-grid";

const FILTER_SHORTCUT_KEY = "f";
const REMOVE_FILTER_SHORTCUTS = ["backspace", "delete"];
const FILTER_DEBOUNCE_MS = 300;
const OPERATORS_WITHOUT_VALUE = ["isEmpty", "isNotEmpty", "isTrue", "isFalse"];

interface DataGridFilterMenuProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>;
  disabled?: boolean;
}

function getColumnVariantIcon(
  variant?: CellOpts["variant"]
): React.ComponentType<React.SVGProps<SVGSVGElement>> | null {
  switch (variant) {
    case "short-text":
      return BaselineIcon;
    case "long-text":
      return TextInitialIcon;
    case "number":
      return HashIcon;
    case "url":
      return LinkIcon;
    case "checkbox":
      return CheckSquareIcon;
    case "select":
      return ListIcon;
    case "multi-select":
      return ListChecksIcon;
    case "date":
      return CalendarIcon;
    case "file":
      return FileIcon;
    default:
      return null;
  }
}

function formatFilterSummary(
  filter: ColumnFilter,
  columnLabel: string,
  operator: FilterOperator,
  value: FilterValue | undefined,
  columnVariant: string
): string {
  const operators = getOperatorsForVariant(columnVariant);
  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ?? operator;

  if (!value || value.value === undefined || value.value === "") {
    return `${columnLabel} ${operatorLabel}`;
  }

  if (Array.isArray(value.value)) {
    const selectedCount = value.value.length;
    if (selectedCount === 0) {
      return `${columnLabel} ${operatorLabel}`;
    }
    return `${columnLabel} ${operatorLabel} ${selectedCount} selected`;
  }

  if (typeof value.value === "number") {
    return `${columnLabel} ${operatorLabel} ${value.value}`;
  }

  if (typeof value.value === "string") {
    if (columnVariant === "date") {
      try {
        const date = new Date(value.value);
        return `${columnLabel} ${operatorLabel} ${formatDate(date)}`;
      } catch {
        return `${columnLabel} ${operatorLabel} ${value.value}`;
      }
    }
    return `${columnLabel} ${operatorLabel} ${value.value}`;
  }

  return `${columnLabel} ${operatorLabel}`;
}

export function DataGridFilterMenu<TData>({
  table,
  className,
  disabled,
  ...props
}: DataGridFilterMenuProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const [selectedFilterId, setSelectedFilterId] = React.useState<string | null>(
    null
  );

  const columnFilters = table.getState().columnFilters;

  const { allFilterableColumns, columnLabels, columnVariants } =
    React.useMemo(() => {
      const labels = new Map<string, string>();
      const variants = new Map<string, string>();
      const allColumns: {
        id: string;
        label: string;
        variant: string;
      }[] = [];

      for (const column of table.getAllColumns()) {
        if (!column.getCanFilter()) continue;

        const label = column.columnDef.meta?.label ?? column.id;
        const variant = column.columnDef.meta?.cell?.variant ?? "short-text";

        labels.set(column.id, label);
        variants.set(column.id, variant);
        allColumns.push({ id: column.id, label, variant });
      }

      return {
        allFilterableColumns: allColumns,
        columnLabels: labels,
        columnVariants: variants,
      };
    }, [table]);

  const activeFilterSummary = React.useMemo(() => {
    if (columnFilters.length === 0) return "";

    return columnFilters
      .map((filter) => {
        const label = columnLabels.get(filter.id) ?? filter.id;
        const variant = columnVariants.get(filter.id) ?? "short-text";
        const filterValue = filter.value as FilterValue | undefined;
        const operator = filterValue?.operator ?? getDefaultOperator(variant);

        return formatFilterSummary(
          filter,
          label,
          operator,
          filterValue,
          variant
        );
      })
      .join(", ");
  }, [columnFilters, columnLabels, columnVariants]);

  const onFilterAdd = React.useCallback(
    (columnId: string) => {
      const variant = columnVariants.get(columnId) ?? "short-text";
      const defaultOperator = getDefaultOperator(variant);

      table.setColumnFilters((prevFilters) => [
        ...prevFilters,
        {
          id: columnId,
          value: {
            operator: defaultOperator,
            value: "",
          },
        },
      ]);
      setSelectedFilterId(columnId);
    },
    [columnVariants, table]
  );

  const onFilterUpdate = React.useCallback(
    (filterId: string, updates: Partial<ColumnFilter>) => {
      table.setColumnFilters((prevFilters) => {
        if (!prevFilters) return prevFilters;
        return prevFilters.map((filter) =>
          filter.id === filterId ? { ...filter, ...updates } : filter
        );
      });
    },
    [table]
  );

  const onFilterRemove = React.useCallback(
    (filterId: string) => {
      table.setColumnFilters((prevFilters) =>
        prevFilters.filter((item) => item.id !== filterId)
      );
      // If we removed the selected filter, select the first available
      if (selectedFilterId === filterId) {
        const remaining = columnFilters.filter((f) => f.id !== filterId);
        if (remaining.length > 0) {
          setSelectedFilterId(remaining[0].id);
        } else if (allFilterableColumns.length > 0) {
          setSelectedFilterId(allFilterableColumns[0].id);
        } else {
          setSelectedFilterId(null);
        }
      }
    },
    [table, selectedFilterId, columnFilters, allFilterableColumns]
  );

  const onFiltersReset = React.useCallback(() => {
    table.setColumnFilters(table.initialState.columnFilters ?? []);
    if (allFilterableColumns.length > 0) {
      setSelectedFilterId(allFilterableColumns[0].id);
    } else {
      setSelectedFilterId(null);
    }
  }, [table, allFilterableColumns]);

  const handleCategoryClick = React.useCallback((columnId: string) => {
    setSelectedFilterId(columnId);
  }, []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement &&
          event.target.contentEditable === "true")
      ) {
        return;
      }

      if (
        event.key.toLowerCase() === FILTER_SHORTCUT_KEY &&
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey
      ) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onTriggerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        REMOVE_FILTER_SHORTCUTS.includes(event.key.toLowerCase()) &&
        columnFilters.length > 0
      ) {
        event.preventDefault();
        onFiltersReset();
      }
    },
    [columnFilters.length, onFiltersReset]
  );

  const selectedFilter = React.useMemo(() => {
    if (!selectedFilterId) return null;
    return columnFilters.find((f) => f.id === selectedFilterId) ?? null;
  }, [selectedFilterId, columnFilters]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-normal"
          onKeyDown={onTriggerKeyDown}
          disabled={disabled}
        >
          <ListFilter className="text-muted-foreground" />
          Filter
          {columnFilters.length > 0 && (
            <Badge
              variant="secondary"
              className="h-[18.24px] rounded-[3.2px] px-[5.12px] font-mono font-normal text-[10.4px]"
            >
              {columnFilters.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "flex w-full max-w-[800px] flex-col gap-0 p-0",
          className
        )}
        {...props}
      >
        <FilterHeader
          activeFilterSummary={activeFilterSummary}
          onReset={onFiltersReset}
          hasActiveFilters={columnFilters.length > 0}
        />
        <div className="flex min-h-[400px] max-h-[600px]">
          <FilterCategoryList
            columns={allFilterableColumns}
            columnLabels={columnLabels}
            columnVariants={columnVariants}
            activeFilterIds={new Set(columnFilters.map((f) => f.id))}
            selectedFilterId={selectedFilterId}
            onCategoryClick={handleCategoryClick}
            onFilterRemove={onFilterRemove}
          />
          <Separator orientation="vertical" />
          <FilterConfigurationPanel
            selectedFilterId={selectedFilterId}
            selectedFilter={selectedFilter}
            columnLabels={columnLabels}
            columnVariants={columnVariants}
            table={table}
            onFilterUpdate={onFilterUpdate}
            onFilterRemove={onFilterRemove}
            onFilterAdd={onFilterAdd}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface FilterHeaderProps {
  activeFilterSummary: string;
  onReset: () => void;
  hasActiveFilters: boolean;
}

function FilterHeader({
  activeFilterSummary,
  onReset,
  hasActiveFilters,
}: FilterHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex-1">
        {hasActiveFilters ? (
          <p className="text-sm text-muted-foreground">{activeFilterSummary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No filters applied</p>
        )}
      </div>
      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      )}
    </div>
  );
}

interface FilterCategoryListProps<TData> {
  columns: { id: string; label: string; variant: string }[];
  columnLabels: Map<string, string>;
  columnVariants: Map<string, string>;
  activeFilterIds: Set<string>;
  selectedFilterId: string | null;
  onCategoryClick: (columnId: string) => void;
  onFilterRemove: (columnId: string) => void;
}

function FilterCategoryList<TData>({
  columns,
  columnLabels,
  columnVariants,
  activeFilterIds,
  selectedFilterId,
  onCategoryClick,
  onFilterRemove,
}: FilterCategoryListProps<TData>) {
  return (
    <div className="w-48 shrink-0 overflow-y-auto border-r">
      <div className="p-2">
        {columns.map((column) => {
          const isActive = activeFilterIds.has(column.id);
          const isSelected = selectedFilterId === column.id;
          const Icon = getColumnVariantIcon(
            columnVariants.get(column.id) as CellOpts["variant"]
          );

          return (
            <button
              key={column.id}
              type="button"
              onClick={() => onCategoryClick(column.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
                isActive && "font-medium"
              )}
            >
              {Icon && (
                <Icon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{column.label}</span>
              {isActive && (
                <button
                  type="button"
                  className="size-4 shrink-0 text-primary hover:text-primary/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterRemove(column.id);
                  }}
                  aria-label={`Remove ${column.label} filter`}
                >
                  <Check className="size-4" />
                </button>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface FilterConfigurationPanelProps<TData> {
  selectedFilterId: string | null;
  selectedFilter: ColumnFilter | null;
  columnLabels: Map<string, string>;
  columnVariants: Map<string, string>;
  table: Table<TData>;
  onFilterUpdate: (filterId: string, updates: Partial<ColumnFilter>) => void;
  onFilterRemove: (filterId: string) => void;
  onFilterAdd: (columnId: string) => void;
}

function FilterConfigurationPanel<TData>({
  selectedFilterId,
  selectedFilter,
  columnLabels,
  columnVariants,
  table,
  onFilterUpdate,
  onFilterRemove,
  onFilterAdd,
}: FilterConfigurationPanelProps<TData>) {
  if (!selectedFilterId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Select a filter category to configure
        </p>
      </div>
    );
  }

  const columnLabel = columnLabels.get(selectedFilterId) ?? selectedFilterId;
  const variant = columnVariants.get(selectedFilterId) ?? "short-text";
  const column = table.getColumn(selectedFilterId);

  if (!column) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Column not found</p>
      </div>
    );
  }

  const filterValue = selectedFilter
    ? (selectedFilter.value as FilterValue | undefined)
    : undefined;
  const operator = filterValue?.operator ?? getDefaultOperator(variant);
  const operators = getOperatorsForVariant(variant);
  const needsValue = !OPERATORS_WITHOUT_VALUE.includes(operator);

  const onOperatorChange = React.useCallback(
    (newOperator: FilterOperator) => {
      if (!selectedFilter) {
        onFilterAdd(selectedFilterId);
        // Wait for filter to be added, then update operator
        setTimeout(() => {
          onFilterUpdate(selectedFilterId, {
            value: {
              operator: newOperator,
              value: "",
            },
          });
        }, 0);
        return;
      }

      onFilterUpdate(selectedFilterId, {
        value: {
          operator: newOperator,
          value: filterValue?.value,
          endValue: filterValue?.endValue,
        },
      });
    },
    [
      selectedFilter,
      selectedFilterId,
      filterValue?.value,
      filterValue?.endValue,
      onFilterUpdate,
      onFilterAdd,
    ]
  );

  const onValueChange = React.useCallback(
    (newValue: string | number | string[] | undefined) => {
      if (!selectedFilter) {
        onFilterAdd(selectedFilterId);
        setTimeout(() => {
          onFilterUpdate(selectedFilterId, {
            value: {
              operator,
              value: newValue,
              endValue: filterValue?.endValue,
            },
          });
        }, 0);
        return;
      }

      onFilterUpdate(selectedFilterId, {
        value: {
          operator,
          value: newValue,
          endValue: filterValue?.endValue,
        },
      });
    },
    [
      selectedFilter,
      selectedFilterId,
      operator,
      filterValue?.endValue,
      onFilterUpdate,
      onFilterAdd,
    ]
  );

  const onEndValueChange = React.useCallback(
    (newValue: string | number | string[] | undefined) => {
      if (!selectedFilter) {
        onFilterAdd(selectedFilterId);
        setTimeout(() => {
          onFilterUpdate(selectedFilterId, {
            value: {
              operator,
              value: filterValue?.value,
              endValue: newValue as string | number | undefined,
            },
          });
        }, 0);
        return;
      }

      onFilterUpdate(selectedFilterId, {
        value: {
          operator,
          value: filterValue?.value,
          endValue: newValue as string | number | undefined,
        },
      });
    },
    [
      selectedFilter,
      selectedFilterId,
      operator,
      filterValue?.value,
      onFilterUpdate,
      onFilterAdd,
    ]
  );

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex-1 p-4">
        <div className="mb-4">
          <h3 className="mb-1 text-sm font-medium">{columnLabel}</h3>
          <p className="text-xs text-muted-foreground">
            Configure filter options for this column
          </p>
        </div>

        <div className="space-y-4">
          <InputGroup>
            <Select value={operator} onValueChange={onOperatorChange}>
              <SelectTrigger className="rounded-l-md rounded-r-none border-0 bg-transparent shadow-none focus-visible:ring-0 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {needsValue && (
              <FilterValueInput
                variant={variant}
                operator={operator}
                column={column}
                value={filterValue?.value}
                endValue={filterValue?.endValue}
                onValueChange={onValueChange}
                onEndValueChange={onEndValueChange}
              />
            )}
          </InputGroup>

          {selectedFilter && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFilterRemove(selectedFilterId)}
              >
                <Trash2 className="mr-2 size-4" />
                Remove filter
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FilterValueInputProps<TData> {
  variant: string;
  operator: FilterOperator;
  column: Column<TData>;
  value: string | number | string[] | undefined;
  endValue?: string | number;
  onValueChange: (value: string | number | string[] | undefined) => void;
  onEndValueChange?: (value: string | number | string[] | undefined) => void;
}

function FilterValueInput<TData>({
  variant,
  operator,
  column,
  value,
  endValue,
  onValueChange,
  onEndValueChange,
}: FilterValueInputProps<TData>) {
  const [showValueSelector, setShowValueSelector] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);
  const [localEndValue, setLocalEndValue] = React.useState(endValue);

  const debouncedOnChange = useDebouncedCallback(
    (newValue: string | number | string[] | undefined) => {
      onValueChange(newValue);
    },
    FILTER_DEBOUNCE_MS
  );

  const debouncedOnEndValueChange = useDebouncedCallback(
    (newValue: string | number | string[] | undefined) => {
      onEndValueChange?.(newValue);
    },
    FILTER_DEBOUNCE_MS
  );

  const cellVariant = column.columnDef.meta?.cell;

  const selectOptions = React.useMemo(() => {
    return cellVariant?.variant === "select" ||
      cellVariant?.variant === "multi-select"
      ? cellVariant.options
      : [];
  }, [cellVariant]);

  const isBetween = operator === "isBetween";
  const isMultiValueOperator =
    operator === "isAnyOf" || operator === "isNoneOf";

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  React.useEffect(() => {
    setLocalEndValue(endValue);
  }, [endValue]);

  if (variant === "number") {
    if (isBetween) {
      return (
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Start"
            value={(localValue as number | undefined) ?? ""}
            onChange={(event) => {
              const val = event.target.value;
              const newValue = val === "" ? undefined : Number(val);
              setLocalValue(newValue);
              debouncedOnChange(newValue);
            }}
            className="h-9"
          />
          <Input
            type="number"
            inputMode="numeric"
            placeholder="End"
            value={(localEndValue as number | undefined) ?? ""}
            onChange={(event) => {
              const val = event.target.value;
              const newValue = val === "" ? undefined : Number(val);
              setLocalEndValue(newValue);
              debouncedOnEndValueChange(newValue);
            }}
            className="h-9"
          />
        </div>
      );
    }

    return (
      <InputGroupInput
        type="number"
        inputMode="numeric"
        placeholder="Value"
        value={(localValue as number | undefined) ?? ""}
        onChange={(event) => {
          const val = event.target.value;
          const newValue = val === "" ? undefined : Number(val);
          setLocalValue(newValue);
          debouncedOnChange(newValue);
        }}
      />
    );
  }

  if (variant === "date") {
    const inputListboxId = `date-input-${column.id}`;

    if (isBetween) {
      const startDate =
        localValue && typeof localValue === "string"
          ? new Date(localValue)
          : undefined;
      const endDate =
        localEndValue && typeof localEndValue === "string"
          ? new Date(localEndValue)
          : undefined;

      const isSameDate =
        startDate &&
        endDate &&
        startDate.toDateString() === endDate.toDateString();

      const displayValue =
        startDate && endDate && !isSameDate
          ? `${formatDate(startDate, { month: "short" })} - ${formatDate(
              endDate,
              { month: "short" }
            )}`
          : startDate
          ? formatDate(startDate, { month: "short" })
          : "Pick a range";

      return (
        <Popover open={showValueSelector} onOpenChange={setShowValueSelector}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex-1 justify-start rounded-none border-0 bg-transparent shadow-none font-normal h-auto py-1.5",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 size-4" />
              {displayValue}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              autoFocus
              captionLayout="dropdown"
              mode="range"
              selected={
                startDate && endDate
                  ? { from: startDate, to: endDate }
                  : startDate
                  ? { from: startDate, to: startDate }
                  : undefined
              }
              onSelect={(range) => {
                const fromValue = range?.from
                  ? range.from.toISOString()
                  : undefined;
                const toValue = range?.to ? range.to.toISOString() : undefined;
                setLocalValue(fromValue);
                setLocalEndValue(toValue);
                onValueChange(fromValue);
                onEndValueChange?.(toValue);
              }}
            />
          </PopoverContent>
        </Popover>
      );
    }

    const dateValue =
      localValue && typeof localValue === "string"
        ? new Date(localValue)
        : undefined;

    return (
      <Popover open={showValueSelector} onOpenChange={setShowValueSelector}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "flex-1 justify-start rounded-none border-0 bg-transparent shadow-none font-normal h-auto py-1.5",
              !dateValue && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {dateValue
              ? formatDate(dateValue, { month: "short" })
              : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            autoFocus
            captionLayout="dropdown"
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              const newValue = date ? date.toISOString() : undefined;
              setLocalValue(newValue);
              onValueChange(newValue);
              setShowValueSelector(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
  }

  const isSelectVariant = variant === "select" || variant === "multi-select";

  if (isSelectVariant && selectOptions.length > 0) {
    if (isMultiValueOperator) {
      const selectedValues = Array.isArray(value) ? value : [];
      const selectedCount = selectedValues.length;
      const displayText =
        selectedCount === 0
          ? "Select options"
          : selectedCount === 1
          ? selectOptions.find((opt) => opt.value === selectedValues[0])
              ?.label ?? "1 selected"
          : `${selectedCount} selected`;

      return (
        <Popover open={showValueSelector} onOpenChange={setShowValueSelector}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="flex-1 justify-start rounded-none border-0 bg-transparent shadow-none font-normal h-auto py-1.5"
            >
              <span
                className={cn(selectedCount === 0 && "text-muted-foreground")}
              >
                {displayText}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search options..." />
              <CommandList>
                <CommandEmpty>No options found.</CommandEmpty>
                <CommandGroup>
                  {selectOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => {
                          const newValues = isSelected
                            ? selectedValues.filter((v) => v !== option.value)
                            : [...selectedValues, option.value];
                          onValueChange(
                            newValues.length > 0 ? newValues : undefined
                          );
                        }}
                      >
                        {option.icon && <option.icon className="mr-2 size-4" />}
                        <span>{option.label}</span>
                        {option.count !== undefined && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {option.count}
                          </span>
                        )}
                        <Check
                          className={cn(
                            "ml-auto",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    const selectedOption = selectOptions.find(
      (opt) => opt.value === (value as string)
    );

    return (
      <Popover open={showValueSelector} onOpenChange={setShowValueSelector}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="flex-1 justify-start rounded-none border-0 bg-transparent shadow-none font-normal h-auto py-1.5"
          >
            {selectedOption ? (
              <>
                {selectedOption.icon && (
                  <selectedOption.icon className="mr-2 size-4" />
                )}
                {selectedOption.label}
              </>
            ) : (
              <span className="text-muted-foreground">Select an option</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search options..." />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {selectOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onValueChange(option.value);
                      setShowValueSelector(false);
                    }}
                  >
                    {option.icon && <option.icon className="mr-2 size-4" />}
                    <span>{option.label}</span>
                    {option.count !== undefined && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {option.count}
                      </span>
                    )}
                    <Check
                      className={cn(
                        "ml-auto",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  if (isBetween) {
    return (
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Start"
          value={(localValue as string | undefined) ?? ""}
          onChange={(event) => {
            const val = event.target.value;
            const newValue = val === "" ? undefined : val;
            setLocalValue(newValue);
            debouncedOnChange(newValue);
          }}
          className="h-9"
        />
        <Input
          type="text"
          placeholder="End"
          value={(localEndValue as string | undefined) ?? ""}
          onChange={(event) => {
            const val = event.target.value;
            const newValue = val === "" ? undefined : val;
            setLocalEndValue(newValue);
            debouncedOnEndValueChange(newValue);
          }}
          className="h-9"
        />
      </div>
    );
  }

  return (
    <InputGroupInput
      type="text"
      placeholder="Value"
      value={(localValue as string | undefined) ?? ""}
      onChange={(event) => {
        const val = event.target.value;
        const newValue = val === "" ? undefined : val;
        setLocalValue(newValue);
        debouncedOnChange(newValue);
      }}
    />
  );
}
