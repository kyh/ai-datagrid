"use client";

import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getRecipesColumns, getRecipesData, recipeDemoPrompt, type Recipe } from "@/data/seed";

function createRecipe(): Recipe {
  return { id: `recipe-${Date.now()}`, name: "" };
}

function createRecipes(count: number): Recipe[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `recipe-${Date.now()}-${i}`,
    name: "",
  }));
}

export default function GenerateDemoPage() {
  const data = getRecipesData();
  const columns = getRecipesColumns(getFilterFn());

  return (
    <DataGridContainer<Recipe>
      initialData={data}
      initialColumns={columns}
      getRowId={(row) => row.id}
      createNewRow={createRecipe}
      createNewRows={createRecipes}
      pinnedColumns={["index"]}
      defaultColumnId="name"
      initialChatInput={recipeDemoPrompt}
    />
  );
}
