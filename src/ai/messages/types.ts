import type { UIMessage } from "ai";

import type { GenerateToolSet } from "../tools";
import type { DataPart } from "./data-parts";
import type { Metadata } from "./metadata";

export type GenerateModeChatUIMessage = UIMessage<
  Metadata,
  DataPart,
  GenerateToolSet
>;
