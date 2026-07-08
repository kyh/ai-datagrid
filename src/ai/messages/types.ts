import type { UIMessage } from "ai";

import type { DataPart } from "./data-parts";

// Tool set type for spreadsheet agents (table + data)
// Using 'never' since we don't need to type individual tool results in messages
export type SpreadsheetToolSet = never;

// Metadata slot stays at ai@6's `unknown` default: nothing ever writes
// message metadata, so there is no schema to promise.
export type GenerateModeChatUIMessage = UIMessage<unknown, DataPart, SpreadsheetToolSet>;
