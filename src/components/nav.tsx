"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BuildingIcon,
  FileSpreadsheetIcon,
  GithubIcon,
  MenuIcon,
  NewspaperIcon,
  SparklesIcon,
  UsersIcon,
  WandIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const dataItems = [
  { label: "Spreadsheet", path: "/", icon: FileSpreadsheetIcon },
  { label: "Companies", path: "/companies", icon: BuildingIcon },
  { label: "People", path: "/people", icon: UsersIcon },
  { label: "Articles", path: "/articles", icon: NewspaperIcon },
] as const;

const aiItems = [
  { label: "Generate Demo", path: "/generate-demo", icon: WandIcon },
  { label: "Enrich Demo", path: "/enrich-demo", icon: SparklesIcon },
] as const;

export function Nav() {
  const pathname = usePathname();
  const allNavItems = [...dataItems, ...aiItems];
  const title =
    allNavItems.find((item) => item.path === pathname)?.label ?? "AI Datagrid";

  return (
    <header className="flex items-center gap-2 p-2 [grid-area:nav]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MenuIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {dataItems.map((item) => (
            <DropdownMenuItem key={item.path} asChild>
              <Link
                href={item.path}
                className={pathname === item.path ? "bg-accent" : ""}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {aiItems.map((item) => (
            <DropdownMenuItem key={item.path} asChild>
              <Link
                href={item.path}
                className={pathname === item.path ? "bg-accent" : ""}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a
              href="https://github.com/kyh/ai-datagrid"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubIcon className="size-4" />
              GitHub
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <h1>{title}</h1>
    </header>
  );
}
