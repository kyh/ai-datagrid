"use client";

import { DataGridContainer } from "@/components/data-grid/data-grid-container";
import { getFilterFn } from "@/lib/data-grid-filters";
import { getRecipesColumns, getRecipesData, recipeDemoPrompt } from "@/data/seed";
import type { Recipe } from "@/data/seed";

const createRecipe = (): Recipe => ({ id: `recipe-${Date.now()}`, name: "" });

const createRecipes = (count: number): Recipe[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `recipe-${Date.now()}-${i}`,
    name: "",
  }));

const GenerateDemoPage = () => {
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
};

export default GenerateDemoPage;
