"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/use-local-storage";

export const GATEWAY_API_KEY_STORAGE_KEY = "gateway-api-key";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  const [apiKey, setApiKey, removeApiKey] = useLocalStorage(GATEWAY_API_KEY_STORAGE_KEY, "");
  const [apiKeyInput, setApiKeyInput] = React.useState(apiKey);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setApiKeyInput(apiKey);
    }
    onOpenChange(nextOpen);
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      toast.success("API key saved");
    } else {
      removeApiKey();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Vercel Gateway API Key</DialogTitle>
          <DialogDescription>
            Enter your{" "}
            <a
              className="underline"
              href="https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys%3Futm_source%3Ddatagrid.kyh.io&title=Get+an+API+Key"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel Gateway API key
            </a>{" "}
            to use AI features. Your key will be stored locally in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex flex-col gap-2">
          <Input
            type="password"
            placeholder="vck_..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && apiKeyInput.trim()) {
                handleSaveApiKey();
              }
            }}
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- opened by explicit user action
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveApiKey}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
