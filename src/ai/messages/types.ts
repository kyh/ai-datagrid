import type { UIMessage } from "ai";

import type { DataPart } from "./data-parts";
import type { Metadata } from "./metadata";

// Tool set type for spreadsheet agents (table + data)
// Using 'never' since we don't need to type individual tool results in messages
export type SpreadsheetToolSet = never;

export type GenerateModeChatUIMessage = UIMessage<
  Metadata,
  DataPart,
  SpreadsheetToolSet
>;
