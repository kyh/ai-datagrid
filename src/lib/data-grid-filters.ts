import type { DataGridFeatures } from "@/lib/data-grid-features";
import type { FilterFn, RowData } from "@tanstack/react-table";
import { z } from "zod";
import type {
  BooleanFilterOperator,
  CellValue,
  DateFilterOperator,
  FileCellData,
  FilterOperator,
  FilterValue,
  NumberFilterOperator,
  SelectFilterOperator,
  TextFilterOperator,
} from "@/lib/data-grid-types";

export const TEXT_FILTER_OPERATORS: readonly {
  label: string;
  value: TextFilterOperator;
}[] = [
  { label: "Contains", value: "contains" },
  { label: "Does not contain", value: "notContains" },
  { label: "Is", value: "equals" },
  { label: "Is not", value: "notEquals" },
  { label: "Starts with", value: "startsWith" },
  { label: "Ends with", value: "endsWith" },
  { label: "Is empty", value: "isEmpty" },
  { label: "Is not empty", value: "isNotEmpty" },
];

export const NUMBER_FILTER_OPERATORS: readonly {
  label: string;
  value: NumberFilterOperator;
}[] = [
  { label: "Is", value: "equals" },
  { label: "Is not", value: "notEquals" },
  { label: "Is less than", value: "lessThan" },
  { label: "Is less than or equal to", value: "lessThanOrEqual" },
  { label: "Is greater than", value: "greaterThan" },
  { label: "Is greater than or equal to", value: "greaterThanOrEqual" },
  { label: "Is between", value: "isBetween" },
  { label: "Is empty", value: "isEmpty" },
  { label: "Is not empty", value: "isNotEmpty" },
];

export const DATE_FILTER_OPERATORS: readonly {
  label: string;
  value: DateFilterOperator;
}[] = [
  { label: "Is", value: "equals" },
  { label: "Is not", value: "notEquals" },
  { label: "Is before", value: "before" },
  { label: "Is after", value: "after" },
  { label: "Is on or before", value: "onOrBefore" },
  { label: "Is on or after", value: "onOrAfter" },
  { label: "Is between", value: "isBetween" },
  { label: "Is empty", value: "isEmpty" },
  { label: "Is not empty", value: "isNotEmpty" },
];

export const SELECT_FILTER_OPERATORS: readonly {
  label: string;
  value: SelectFilterOperator;
}[] = [
  { label: "Is", value: "is" },
  { label: "Is not", value: "isNot" },
  { label: "Has any of", value: "isAnyOf" },
  { label: "Has none of", value: "isNoneOf" },
  { label: "Is empty", value: "isEmpty" },
  { label: "Is not empty", value: "isNotEmpty" },
];

export const BOOLEAN_FILTER_OPERATORS: readonly {
  label: string;
  value: BooleanFilterOperator;
}[] = [
  { label: "Is", value: "isTrue" },
  { label: "Is not", value: "isFalse" },
];

export const getDefaultOperator = (variant: string): FilterOperator => {
  switch (variant) {
    case "number": {
      return "equals";
    }
    case "date": {
      return "equals";
    }
    case "select":
    case "multi-select": {
      return "is";
    }
    case "checkbox": {
      return "isTrue";
    }
    default: {
      return "contains";
    }
  }
};

export const getOperatorsForVariant = (
  variant: string,
): readonly {
  label: string;
  value: FilterOperator;
}[] => {
  switch (variant) {
    case "number": {
      return NUMBER_FILTER_OPERATORS;
    }
    case "date": {
      return DATE_FILTER_OPERATORS;
    }
    case "select":
    case "multi-select": {
      return SELECT_FILTER_OPERATORS;
    }
    case "checkbox": {
      return BOOLEAN_FILTER_OPERATORS;
    }
    default: {
      return TEXT_FILTER_OPERATORS;
    }
  }
};

const filterOperatorSchema = z.enum([
  "contains",
  "notContains",
  "equals",
  "notEquals",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
  "lessThan",
  "lessThanOrEqual",
  "greaterThan",
  "greaterThanOrEqual",
  "isBetween",
  "before",
  "after",
  "onOrBefore",
  "onOrAfter",
  "is",
  "isNot",
  "isAnyOf",
  "isNoneOf",
  "isTrue",
  "isFalse",
]) satisfies z.ZodType<FilterOperator>;

/**
 * TanStack stores column filter state as `unknown`, so every read of it is a
 * boundary. This is the one schema that turns it into a `FilterValue`.
 */
export const filterValueSchema = z.object({
  endValue: z.union([z.string(), z.number()]).optional(),
  operator: filterOperatorSchema,
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
}) satisfies z.ZodType<FilterValue>;

const numberSchema = z.number();
const stringSchema = z.string();

type Parsed<T> = ReturnType<z.ZodType<T>["safeParse"]>;
type FilterScalar = string | number | string[];

const isEmptyCell = (cellValue: CellValue): boolean =>
  cellValue === null ||
  cellValue === undefined ||
  cellValue === "" ||
  (Array.isArray(cellValue) && cellValue.length === 0);

const matchPresence = (operator: FilterOperator, cellValue: CellValue): boolean | undefined => {
  switch (operator) {
    case "isEmpty": {
      return isEmptyCell(cellValue);
    }
    case "isNotEmpty": {
      return !isEmptyCell(cellValue);
    }
    case "isTrue": {
      return cellValue === true;
    }
    case "isFalse": {
      return cellValue === false || !cellValue;
    }
    default: {
      return undefined;
    }
  }
};

const matchEquality = (params: {
  cellValue: CellValue;
  cellNumber: Parsed<number>;
  filterNumber: Parsed<number>;
  filterString: Parsed<string>;
  cellValueStr: string;
  filterValueStr: string;
}): boolean => {
  const { cellValue, cellNumber, filterNumber, filterString, cellValueStr, filterValueStr } =
    params;
  if (cellNumber.success && filterNumber.success) {
    return cellNumber.data === filterNumber.data;
  }
  if (cellValue instanceof Date && filterString.success) {
    const cellDate = new Date(cellValue);
    const filterDate = new Date(filterString.data);
    return cellDate.toDateString() === filterDate.toDateString();
  }
  return cellValueStr === filterValueStr;
};

const matchText = (params: {
  operator: FilterOperator;
  cellValue: CellValue;
  cellNumber: Parsed<number>;
  filterNumber: Parsed<number>;
  filterString: Parsed<string>;
  cellValueStr: string;
  filterValueStr: string;
}): boolean | undefined => {
  const { operator, cellValueStr, filterValueStr } = params;
  switch (operator) {
    case "contains": {
      return cellValueStr.includes(filterValueStr);
    }
    case "notContains": {
      return !cellValueStr.includes(filterValueStr);
    }
    case "equals": {
      return matchEquality(params);
    }
    case "notEquals": {
      return !matchEquality(params);
    }
    case "startsWith": {
      return cellValueStr.startsWith(filterValueStr);
    }
    case "endsWith": {
      return cellValueStr.endsWith(filterValueStr);
    }
    default: {
      return undefined;
    }
  }
};

const matchNumber = (params: {
  operator: FilterOperator;
  cellNumber: Parsed<number>;
  filterNumber: Parsed<number>;
  endValue: string | number | undefined;
}): boolean | undefined => {
  const { operator, cellNumber, filterNumber, endValue } = params;
  if (!(cellNumber.success && filterNumber.success)) {
    return undefined;
  }
  const cellNum = cellNumber.data;
  const filterNum = filterNumber.data;

  switch (operator) {
    case "greaterThan": {
      return cellNum > filterNum;
    }
    case "greaterThanOrEqual": {
      return cellNum >= filterNum;
    }
    case "lessThan": {
      return cellNum < filterNum;
    }
    case "lessThanOrEqual": {
      return cellNum <= filterNum;
    }
    case "isBetween": {
      const endNumber = numberSchema.safeParse(endValue);
      return endNumber.success ? cellNum >= filterNum && cellNum <= endNumber.data : undefined;
    }
    default: {
      return undefined;
    }
  }
};

const getCellDateSource = (
  cellValue: CellValue,
  cellString: Parsed<string>,
): Date | string | null => {
  if (cellValue instanceof Date) {
    return cellValue;
  }
  return cellString.success ? cellString.data : null;
};

const matchDate = (params: {
  operator: FilterOperator;
  cellValue: CellValue;
  cellString: Parsed<string>;
  filterString: Parsed<string>;
  endValue: string | number | undefined;
}): boolean | undefined => {
  const { operator, cellValue, cellString, filterString, endValue } = params;
  const cellDateSource = getCellDateSource(cellValue, cellString);
  if (cellDateSource === null) {
    return undefined;
  }
  const cellDate = new Date(cellDateSource);
  if (Number.isNaN(cellDate.getTime()) || !filterString.success) {
    return undefined;
  }
  const filterDate = new Date(filterString.data);

  switch (operator) {
    case "before": {
      return cellDate < filterDate;
    }
    case "after": {
      return cellDate > filterDate;
    }
    case "onOrBefore": {
      return cellDate <= filterDate;
    }
    case "onOrAfter": {
      return cellDate >= filterDate;
    }
    case "isBetween": {
      const endString = stringSchema.safeParse(endValue);
      if (!endString.success) {
        return undefined;
      }
      const filterDate2 = new Date(endString.data);
      return cellDate >= filterDate && cellDate <= filterDate2;
    }
    default: {
      return undefined;
    }
  }
};

const equalsIgnoreCase = (a: CellValue | FileCellData, b: FilterScalar): boolean =>
  String(a).toLowerCase() === String(b).toLowerCase();

const cellHasValue = (cellValue: CellValue, value: FilterScalar): boolean =>
  Array.isArray(cellValue)
    ? cellValue.some((v) => equalsIgnoreCase(v, value))
    : equalsIgnoreCase(cellValue, value);

const cellHasAnyOf = (cellValue: CellValue, values: string[]): boolean =>
  Array.isArray(cellValue)
    ? cellValue.some((v) => values.some((fv) => equalsIgnoreCase(v, fv)))
    : values.some((fv) => equalsIgnoreCase(cellValue, fv));

const matchSelect = (
  operator: FilterOperator,
  cellValue: CellValue,
  value: FilterScalar,
): boolean | undefined => {
  switch (operator) {
    case "is": {
      return cellHasValue(cellValue, value);
    }
    case "isNot": {
      return !cellHasValue(cellValue, value);
    }
    case "isAnyOf": {
      return Array.isArray(value) ? cellHasAnyOf(cellValue, value) : undefined;
    }
    case "isNoneOf": {
      return Array.isArray(value) ? !cellHasAnyOf(cellValue, value) : undefined;
    }
    default: {
      return undefined;
    }
  }
};

export const getFilterFn =
  <TData extends RowData>(): FilterFn<DataGridFeatures, TData> =>
  (row, columnId, filterValue): boolean => {
    const parsedFilter = filterValueSchema.safeParse(filterValue);
    if (!parsedFilter.success) {
      return true;
    }

    const { operator, value, endValue } = parsedFilter.data;

    const cellValue = row.getValue<CellValue>(columnId);

    const presence = matchPresence(operator, cellValue);
    if (presence !== undefined) {
      return presence;
    }

    if (value === undefined || value === null || value === "") {
      return true;
    }

    const cellNumber = numberSchema.safeParse(cellValue);
    const cellString = stringSchema.safeParse(cellValue);
    const filterNumber = numberSchema.safeParse(value);
    const filterString = stringSchema.safeParse(value);

    const cellValueStr = String(cellValue ?? "").toLowerCase();
    const filterValueStr = filterString.success ? filterString.data.toLowerCase() : String(value);

    return (
      matchText({
        cellNumber,
        cellValue,
        cellValueStr,
        filterNumber,
        filterString,
        filterValueStr,
        operator,
      }) ??
      matchNumber({ cellNumber, endValue, filterNumber, operator }) ??
      matchDate({ cellString, cellValue, endValue, filterString, operator }) ??
      matchSelect(operator, cellValue, value) ??
      true
    );
  };
