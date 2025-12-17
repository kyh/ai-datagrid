import type { InferUITools, UIMessage, UIMessageStreamWriter } from "ai";

import type { DataPart } from "../messages/data-parts";
import { generateColumns } from "./generate-columns";
import { enrichData } from "./enrich-data";

type WriterParams = {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
  gatewayApiKey?: string;
};

export function generateTools({ writer }: WriterParams) {
  return {
    generateColumns: generateColumns({ writer }),
    enrichData: enrichData({ writer }),
  };
}

export type GenerateToolSet = InferUITools<ReturnType<typeof generateTools>>;
