import type { DataGridFeatures } from "@/lib/data-grid-features";
import { faker } from "@faker-js/faker";
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataGridRowData, FileCellData } from "@/lib/data-grid-types";

export interface Person extends DataGridRowData {
  id: string;
  name?: string;
  age?: number;
  email?: string;
  website?: string;
  notes?: string;
  salary?: number;
  department?: string;
  status?: string;
  skills?: string[];
  isActive?: boolean;
  startDate?: string;
  attachments?: FileCellData[];
}

const FIXTURE_SEED = 12_345;

/**
 * `faker` is a module singleton, so its RNG position depends on how many
 * generator calls preceded it in the same JS realm. Re-seeding at the top of
 * every `get*Data()` makes each dataset order-independent: `/people` renders
 * the same 50 rows whether it was opened directly or navigated to after
 * `/articles`. Without this, in-app `<Link>` navigation silently shifts every
 * fixture and assertions stop reproducing.
 */
const resetFixtureRng = () => {
  faker.seed(FIXTURE_SEED);
};

resetFixtureRng();

export const departments = ["Engineering", "Marketing", "Sales", "HR", "Finance"] as const;

export const statuses = ["Active", "On Leave", "Remote", "In Office"] as const;

export const skills = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "SQL",
  "AWS",
  "Docker",
  "Git",
  "Agile",
] as const;

const notes = [
  "Excellent team player with strong communication skills. Consistently meets deadlines and delivers high-quality work.",
  "Currently working on the Q4 project initiative. Requires additional training in advanced analytics tools.",
  "Relocated from the Seattle office last month. Adjusting well to the new team dynamics and company culture.",
  "Submitted request for professional development courses. Shows great initiative in learning new technologies.",
  "Outstanding performance in the last quarter. Recommended for leadership training program next year.",
  "Recently completed certification in project management. Looking to take on more responsibility in upcoming projects.",
  "Needs improvement in time management. Working with mentor to develop better organizational skills.",
  "Transferred from the marketing department. Bringing valuable cross-functional experience to the team.",
  "On track for promotion consideration. Has exceeded expectations in client relationship management.",
  "Participating in the company mentorship program. Showing strong potential for career advancement.",
  "Recently returned from parental leave. Successfully reintegrated into current project workflows.",
  "Fluent in three languages. Often assists with international client communications and translations.",
  "Leading the diversity and inclusion initiative. Organizing monthly team building events and workshops.",
  "Requested flexible work arrangement for family care. Maintaining productivity while working remotely.",
  "Completed advanced training in data visualization. Now serving as the team's go-to expert for dashboards.",
  `This employee has demonstrated exceptional growth over the past year. Starting as a junior developer, they quickly mastered our tech stack and began contributing to major features within their first month.

Key accomplishments include:
- Led the migration of our legacy authentication system to OAuth 2.0
- Reduced API response times by 40% through query optimization
- Mentored two interns who are now full-time employees
- Presented at three internal tech talks on React best practices

Areas for continued development:
- Public speaking skills for external conferences
- System design for distributed architectures
- Cross-team collaboration on larger initiatives

Overall, this is one of our strongest performers and a key contributor to team morale. Highly recommended for the senior engineer promotion track.`,
  `Performance Review Summary - Q4 2024

Strengths:
The employee consistently demonstrates strong problem-solving abilities and technical expertise. They have taken ownership of several critical projects and delivered them on time with high quality.

Growth Areas:
- Documentation could be more thorough
- Sometimes takes on too much work without delegating
- Could benefit from more proactive communication

Goals for Next Quarter:
1. Complete AWS Solutions Architect certification
2. Lead the new customer dashboard project
3. Improve test coverage to 85% on owned modules
4. Participate in at least two cross-functional initiatives

Manager Notes:
This team member is a valuable asset to the organization. Their dedication and work ethic serve as an example for others. We should ensure they have opportunities for advancement to retain this talent long-term.`,
];

const sampleFiles = [
  { name: "Resume.pdf", sizeRange: [50, 500], type: "application/pdf" },
  { name: "Contract.pdf", sizeRange: [100, 300], type: "application/pdf" },
  { name: "ID_Document.pdf", sizeRange: [200, 400], type: "application/pdf" },
  { name: "Profile_Photo.jpg", sizeRange: [500, 2000], type: "image/jpeg" },
  {
    name: "Presentation.pptx",
    sizeRange: [1000, 5000],
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  {
    name: "Report.docx",
    sizeRange: [100, 800],
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  {
    name: "Timesheet.xlsx",
    sizeRange: [50, 200],
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  { name: "Certificate.pdf", sizeRange: [200, 500], type: "application/pdf" },
  {
    name: "Background_Check.pdf",
    sizeRange: [300, 600],
    type: "application/pdf",
  },
  { name: "Training_Video.mp4", sizeRange: [5000, 15_000], type: "video/mp4" },
] as const;

const generatePerson = (id: number): Person => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  const fileCount = faker.number.int({ max: 3, min: 0 });
  const selectedFiles = faker.helpers.arrayElements(sampleFiles, fileCount);

  const attachments: FileCellData[] = selectedFiles.map((file, index) => {
    const sizeKB = faker.number.int({
      max: file.sizeRange[1],
      min: file.sizeRange[0],
    });
    return {
      id: `${id}-file-${index}`,
      name: file.name,
      size: sizeKB * 1024,
      type: file.type,
      url: `https://example.com/files/${id}/${file.name}`,
    };
  });

  // oxlint-disable-next-line sort-keys -- faker draws are consumed in property order; reordering changes the seeded fixtures
  return {
    id: faker.string.nanoid(8),
    name: `${firstName} ${lastName}`,
    age: faker.number.int({ max: 65, min: 22 }),
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    website: faker.internet.url().replace(/\/$/u, ""),
    notes: faker.helpers.arrayElement(notes),
    salary: faker.number.int({ max: 150_000, min: 40_000 }),
    department: faker.helpers.arrayElement(departments),
    status: faker.helpers.arrayElement(statuses),
    isActive: faker.datatype.boolean(),
    startDate:
      faker.date.between({ from: "2018-01-01", to: "2024-01-01" }).toISOString().split("T")[0] ??
      "",
    skills: faker.helpers.arrayElements(skills, { max: 5, min: 1 }),
    attachments,
  };
};

export const getPeopleData = (): Person[] => {
  resetFixtureRng();
  return Array.from({ length: 50 }, (_, i) => generatePerson(i + 1));
};

// Company data
export interface Company extends DataGridRowData {
  id: string;
  name?: string;
  industry?: string;
  employees?: number;
  website?: string;
  description?: string;
  revenue?: number;
  founded?: string;
  headquarters?: string;
  status?: string;
  isPublic?: boolean;
}

export const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Manufacturing",
  "Education",
  "Energy",
  "Real Estate",
] as const;

export const companyStatuses = ["Active", "Acquired", "IPO", "Private", "Startup"] as const;

const companyDescriptions = [
  "A leading provider of innovative solutions in the industry. Known for exceptional customer service and cutting-edge technology.",
  "Fast-growing company focused on disrupting traditional markets with modern approaches and sustainable practices.",
  "Established enterprise with a strong track record of delivering value to shareholders and customers alike.",
  "Innovative startup backed by top-tier venture capital firms, focused on solving complex industry challenges.",
  "Global corporation with operations in over 50 countries, serving millions of customers worldwide.",
];

const generateCompany = (): Company => {
  const companyName = faker.company.name();

  // oxlint-disable-next-line sort-keys -- faker draws are consumed in property order; reordering changes the seeded fixtures
  return {
    id: faker.string.nanoid(8),
    name: companyName,
    industry: faker.helpers.arrayElement(industries),
    employees: faker.number.int({ max: 50_000, min: 10 }),
    website: `https://${companyName.toLowerCase().replaceAll(/[^a-z0-9]/gu, "")}.com`,
    description: faker.helpers.arrayElement(companyDescriptions),
    revenue: faker.number.int({ max: 10_000_000_000, min: 100_000 }),
    founded: faker.date.between({ from: "1950-01-01", to: "2023-01-01" }).getFullYear().toString(),
    headquarters: `${faker.location.city()}, ${faker.location.country()}`,
    status: faker.helpers.arrayElement(companyStatuses),
    isPublic: faker.datatype.boolean(),
  };
};

export const getCompaniesData = (): Company[] => {
  resetFixtureRng();
  return Array.from({ length: 50 }, () => generateCompany());
};

export const getCompaniesColumns = (
  filterFn: FilterFn<DataGridFeatures, Company>,
): ColumnDef<DataGridFeatures, Company>[] => [
  {
    cell: ({ row, table }) => (
      <Checkbox
        aria-label="Select row"
        className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          const onRowSelect = table.options.meta?.onRowSelect;
          if (onRowSelect) {
            onRowSelect(row.index, !!value, false);
          } else {
            row.toggleSelected(!!value);
          }
        }}
        onClick={(event: React.MouseEvent) => {
          if (event.shiftKey) {
            event.preventDefault();
            const onRowSelect = table.options.meta?.onRowSelect;
            if (onRowSelect) {
              onRowSelect(row.index, !row.getIsSelected(), true);
            }
          }
        }}
      />
    ),
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    id: "select",
    size: 40,
  },
  {
    accessorKey: "name",
    filterFn,
    header: "Company Name",
    id: "name",
    meta: {
      cell: {
        variant: "short-text",
      },
      label: "Company Name",
    },
    minSize: 200,
  },
  {
    accessorKey: "industry",
    filterFn,
    header: "Industry",
    id: "industry",
    meta: {
      cell: {
        options: industries.map((i) => ({ label: i, value: i })),
        variant: "select",
      },
      label: "Industry",
    },
    minSize: 150,
  },
  {
    accessorKey: "employees",
    filterFn,
    header: "Employees",
    id: "employees",
    meta: {
      cell: {
        max: 1_000_000,
        min: 1,
        variant: "number",
      },
      label: "Employees",
    },
    minSize: 120,
  },
  {
    accessorKey: "website",
    filterFn,
    header: "Website",
    id: "website",
    meta: {
      cell: {
        variant: "url",
      },
      label: "Website",
    },
    minSize: 200,
  },
  {
    accessorKey: "description",
    filterFn,
    header: "Description",
    id: "description",
    meta: {
      cell: {
        variant: "long-text",
      },
      label: "Description",
    },
    minSize: 200,
  },
  {
    accessorKey: "revenue",
    filterFn,
    header: "Revenue",
    id: "revenue",
    meta: {
      cell: {
        variant: "number",
      },
      label: "Revenue",
    },
    minSize: 140,
  },
  {
    accessorKey: "founded",
    filterFn,
    header: "Founded",
    id: "founded",
    meta: {
      cell: {
        variant: "short-text",
      },
      label: "Founded",
    },
    minSize: 100,
  },
  {
    accessorKey: "headquarters",
    filterFn,
    header: "Headquarters",
    id: "headquarters",
    meta: {
      cell: {
        variant: "short-text",
      },
      label: "Headquarters",
    },
    minSize: 180,
  },
  {
    accessorKey: "status",
    filterFn,
    header: "Status",
    id: "status",
    meta: {
      cell: {
        options: companyStatuses.map((s) => ({ label: s, value: s })),
        variant: "select",
      },
      label: "Status",
    },
    minSize: 120,
  },
  {
    accessorKey: "isPublic",
    filterFn,
    header: "Public",
    id: "isPublic",
    meta: {
      cell: {
        variant: "checkbox",
      },
      label: "Public",
    },
    minSize: 100,
  },
];

export interface SpreadsheetRow {
  [key: string]: string;
}

export const getSpreadsheetData = (): SpreadsheetRow[] => {
  const columns = Array.from({ length: 26 }, (_, i) => String.fromCodePoint(65 + i));
  return Array.from({ length: 1001 }, () => {
    const row: SpreadsheetRow = {};
    for (const col of columns) {
      row[col] = "";
    }
    return row;
  });
};

export const getSpreadsheetColumns = (
  filterFn: FilterFn<DataGridFeatures, SpreadsheetRow>,
): ColumnDef<DataGridFeatures, SpreadsheetRow>[] => {
  const columns = Array.from({ length: 26 }, (_, i) => String.fromCodePoint(65 + i));

  return [
    {
      cell: ({ row }) => (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          {row.index + 1}
        </div>
      ),
      enableHiding: false,
      enablePinning: false,
      enableResizing: false,
      enableSorting: false,
      header: () => (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm" />
      ),
      id: "index",
      size: 60,
    },
    ...columns.map((col) => ({
      accessorKey: col,
      filterFn,
      header: col,
      id: col,
      meta: {
        cell: {
          variant: "short-text" as const,
        },
        hideVariantLabel: true,
        label: col,
      },
      minSize: 180,
    })),
  ];
};

export const getPeopleColumns = (
  filterFn: FilterFn<DataGridFeatures, Person>,
): ColumnDef<DataGridFeatures, Person>[] => [
  {
    cell: ({ row, table }) => (
      <Checkbox
        aria-label="Select row"
        className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          const onRowSelect = table.options.meta?.onRowSelect;
          if (onRowSelect) {
            onRowSelect(row.index, !!value, false);
          } else {
            row.toggleSelected(!!value);
          }
        }}
        onClick={(event: React.MouseEvent) => {
          if (event.shiftKey) {
            event.preventDefault();
            const onRowSelect = table.options.meta?.onRowSelect;
            if (onRowSelect) {
              onRowSelect(row.index, !row.getIsSelected(), true);
            }
          }
        }}
      />
    ),
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    id: "select",
    size: 40,
  },
  {
    accessorKey: "name",
    filterFn,
    header: "Name",
    id: "name",
    meta: {
      cell: {
        variant: "short-text",
      },
      label: "Name",
    },
    minSize: 180,
  },
  {
    accessorKey: "age",
    filterFn,
    header: "Age",
    id: "age",
    meta: {
      cell: {
        max: 100,
        min: 18,
        step: 1,
        variant: "number",
      },
      label: "Age",
    },
    minSize: 100,
  },
  {
    accessorKey: "email",
    filterFn,
    header: "Email",
    id: "email",
    meta: {
      cell: {
        variant: "short-text",
      },
      label: "Email",
    },
    minSize: 240,
  },
  {
    accessorKey: "website",
    filterFn,
    header: "Website",
    id: "website",
    meta: {
      cell: {
        variant: "url",
      },
      label: "Website",
    },
    minSize: 240,
  },
  {
    accessorKey: "notes",
    filterFn,
    header: "Notes",
    id: "notes",
    meta: {
      cell: {
        variant: "long-text",
      },
      label: "Notes",
    },
    minSize: 200,
  },
  {
    accessorKey: "salary",
    filterFn,
    header: "Salary",
    id: "salary",
    meta: {
      cell: {
        min: 0,
        step: 1000,
        variant: "number",
      },
      label: "Salary",
    },
    minSize: 180,
  },
  {
    accessorKey: "department",
    filterFn,
    header: "Department",
    id: "department",
    meta: {
      cell: {
        options: departments.map((dept) => ({
          label: dept,
          value: dept,
        })),
        variant: "select",
      },
      label: "Department",
    },
    minSize: 180,
  },
  {
    accessorKey: "status",
    filterFn,
    header: "Status",
    id: "status",
    meta: {
      cell: {
        options: statuses.map((status) => ({
          label: status,
          value: status,
        })),
        variant: "select",
      },
      label: "Status",
    },
    minSize: 180,
  },
  {
    accessorKey: "skills",
    filterFn,
    header: "Skills",
    id: "skills",
    meta: {
      cell: {
        options: skills.map((skill) => ({
          label: skill,
          value: skill,
        })),
        variant: "multi-select",
      },
      label: "Skills",
    },
    minSize: 240,
  },
  {
    accessorKey: "isActive",
    filterFn,
    header: "Active",
    id: "isActive",
    meta: {
      cell: {
        variant: "checkbox",
      },
      label: "Active",
    },
    minSize: 140,
  },
  {
    accessorKey: "startDate",
    filterFn,
    header: "Start Date",
    id: "startDate",
    meta: {
      cell: {
        variant: "date",
      },
      label: "Start Date",
    },
    minSize: 150,
  },
  {
    accessorKey: "attachments",
    filterFn,
    header: "Attachments",
    id: "attachments",
    meta: {
      cell: {
        accept: "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx",
        maxFileSize: 10 * 1024 * 1024,
        maxFiles: 5,
        multiple: true,
        variant: "file",
      },
      label: "Attachments",
    },
    minSize: 240,
  },
];

// Article data
export interface Article extends DataGridRowData {
  id: string;
  title?: string;
  author?: string;
  category?: string;
  publishDate?: string;
  readTime?: number;
  tags?: string[];
  excerpt?: string;
  url?: string;
  isFeatured?: boolean;
}

export const articleCategories = [
  "Technology",
  "Business",
  "Science",
  "Health",
  "Entertainment",
  "Sports",
  "Politics",
  "Travel",
] as const;

export const articleTags = [
  "Breaking",
  "Opinion",
  "Analysis",
  "Interview",
  "Review",
  "Tutorial",
  "News",
  "Feature",
] as const;

const generateArticle = (): Article => {
  const title = faker.lorem.sentence({ max: 8, min: 4 }).slice(0, -1);
  // oxlint-disable-next-line sort-keys -- faker draws are consumed in property order; reordering changes the seeded fixtures
  return {
    id: faker.string.nanoid(8),
    title,
    author: faker.person.fullName(),
    category: faker.helpers.arrayElement(articleCategories),
    // Fixed range, not `faker.date.recent()` — the latter is relative to today,
    // so it drifts daily and defeats the `faker.seed(12345)` determinism the
    // rest of the fixtures rely on (and that agent assertions are written against).
    publishDate: faker.date
      .between({ from: "2025-01-01", to: "2026-01-01" })
      .toISOString()
      .split("T")[0],
    readTime: faker.number.int({ max: 15, min: 2 }),
    tags: faker.helpers.arrayElements(articleTags, {
      max: 3,
      min: 1,
    }),
    excerpt: faker.lorem.paragraph(),
    url: `https://example.com/articles/${faker.helpers.slugify(title).toLowerCase()}`,
    isFeatured: faker.datatype.boolean({ probability: 0.2 }),
  };
};

export const getArticlesData = (): Article[] => {
  resetFixtureRng();
  return Array.from({ length: 50 }, () => generateArticle());
};

export const getArticlesColumns = (
  filterFn: FilterFn<DataGridFeatures, Article>,
): ColumnDef<DataGridFeatures, Article>[] => [
  {
    cell: ({ row, table }) => (
      <Checkbox
        aria-label="Select row"
        className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          const onRowSelect = table.options.meta?.onRowSelect;
          if (onRowSelect) {
            onRowSelect(row.index, !!value, false);
          } else {
            row.toggleSelected(!!value);
          }
        }}
        onClick={(event: React.MouseEvent) => {
          if (event.shiftKey) {
            event.preventDefault();
            const onRowSelect = table.options.meta?.onRowSelect;
            if (onRowSelect) {
              onRowSelect(row.index, !row.getIsSelected(), true);
            }
          }
        }}
      />
    ),
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    id: "select",
    size: 40,
  },
  {
    accessorKey: "title",
    filterFn,
    header: "Title",
    id: "title",
    meta: {
      cell: { variant: "short-text" },
      label: "Title",
    },
    minSize: 250,
  },
  {
    accessorKey: "author",
    filterFn,
    header: "Author",
    id: "author",
    meta: {
      cell: { variant: "short-text" },
      label: "Author",
    },
    minSize: 150,
  },
  {
    accessorKey: "category",
    filterFn,
    header: "Category",
    id: "category",
    meta: {
      cell: {
        options: articleCategories.map((c) => ({ label: c, value: c })),
        variant: "select",
      },
      label: "Category",
    },
    minSize: 130,
  },
  {
    accessorKey: "publishDate",
    filterFn,
    header: "Published",
    id: "publishDate",
    meta: {
      cell: { variant: "date" },
      label: "Published",
    },
    minSize: 130,
  },
  {
    accessorKey: "readTime",
    filterFn,
    header: "Read Time (min)",
    id: "readTime",
    meta: {
      cell: { max: 60, min: 1, variant: "number" },
      label: "Read Time",
    },
    minSize: 120,
  },
  {
    accessorKey: "tags",
    filterFn,
    header: "Tags",
    id: "tags",
    meta: {
      cell: {
        options: articleTags.map((t) => ({ label: t, value: t })),
        variant: "multi-select",
      },
      label: "Tags",
    },
    minSize: 200,
  },
  {
    accessorKey: "excerpt",
    filterFn,
    header: "Excerpt",
    id: "excerpt",
    meta: {
      cell: { variant: "long-text" },
      label: "Excerpt",
    },
    minSize: 200,
  },
  {
    accessorKey: "url",
    filterFn,
    header: "URL",
    id: "url",
    meta: {
      cell: { variant: "url" },
      label: "URL",
    },
    minSize: 200,
  },
  {
    accessorKey: "isFeatured",
    filterFn,
    header: "Featured",
    id: "isFeatured",
    meta: {
      cell: { variant: "checkbox" },
      label: "Featured",
    },
    minSize: 100,
  },
];

// Recipe Demo - Generate columns demo
export interface Recipe extends DataGridRowData {
  id: string;
  name: string;
}

const recipeNames = [
  "Spaghetti Carbonara",
  "Chicken Tikka Masala",
  "Beef Tacos",
  "Caesar Salad",
  "Mushroom Risotto",
  "Fish and Chips",
  "Pad Thai",
  "Margherita Pizza",
  "Beef Bourguignon",
  "Chocolate Lava Cake",
];

export const getRecipesData = (): Recipe[] =>
  recipeNames.map((name, i) => ({
    id: `recipe-${i}`,
    name,
  }));

export const getRecipesColumns = (
  filterFn: FilterFn<DataGridFeatures, Recipe>,
): ColumnDef<DataGridFeatures, Recipe>[] => [
  {
    cell: ({ row }) => (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        {row.index + 1}
      </div>
    ),
    enableHiding: false,
    enablePinning: false,
    enableResizing: false,
    enableSorting: false,
    header: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm" />
    ),
    id: "index",
    size: 60,
  },
  {
    accessorKey: "name",
    filterFn,
    header: "Recipe Name",
    id: "name",
    meta: {
      cell: { variant: "short-text" },
      label: "Recipe Name",
    },
    minSize: 200,
  },
];

export const recipeDemoPrompt =
  "Add columns for cuisine type, difficulty level, prep time (minutes), cooking time (minutes), and calories";

// Tweet data
export interface Tweet extends DataGridRowData {
  id: string;
  url?: string;
  author?: string;
  banger?: boolean;
  createdAt?: string;
}

const tweetAuthors = [
  "@elonmusk",
  "@kikiswanson",
  "@naval",
  "@paulg",
  "@levelsio",
  "@dhh",
  "@raikitten",
  "@tsaborov",
  "@sama",
  "@patrickc",
] as const;

const generateTweet = (): Tweet => {
  const author = faker.helpers.arrayElement(tweetAuthors);
  const tweetId = faker.string.numeric(19);
  // oxlint-disable-next-line sort-keys -- faker draws are consumed in property order; reordering changes the seeded fixtures
  return {
    id: faker.string.nanoid(8),
    url: `https://x.com/${author.slice(1)}/status/${tweetId}`,
    author,
    banger: faker.datatype.boolean({ probability: 0.3 }),
    createdAt: faker.date
      .between({ from: "2023-01-01", to: "2025-01-01" })
      .toISOString()
      .split("T")[0],
  };
};

export const getTweetsData = (): Tweet[] => {
  resetFixtureRng();
  // Ensure @levelsio has 3 bangers
  const levelsioBangers: Tweet[] = [
    {
      author: "@levelsio",
      banger: true,
      createdAt: "2024-03-15",
      id: "lvls-001",
      url: "https://x.com/levelsio/status/1234567890123456789",
    },
    {
      author: "@levelsio",
      banger: true,
      createdAt: "2024-06-22",
      id: "lvls-002",
      url: "https://x.com/levelsio/status/1234567890123456790",
    },
    {
      author: "@levelsio",
      banger: true,
      createdAt: "2024-09-10",
      id: "lvls-003",
      url: "https://x.com/levelsio/status/1234567890123456791",
    },
  ];
  const randomTweets = Array.from({ length: 47 }, () => generateTweet());
  return faker.helpers.shuffle([...levelsioBangers, ...randomTweets]);
};

export const getTweetsColumns = (
  filterFn: FilterFn<DataGridFeatures, Tweet>,
): ColumnDef<DataGridFeatures, Tweet>[] => [
  {
    cell: ({ row, table }) => (
      <Checkbox
        aria-label="Select row"
        className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          const onRowSelect = table.options.meta?.onRowSelect;
          if (onRowSelect) {
            onRowSelect(row.index, !!value, false);
          } else {
            row.toggleSelected(!!value);
          }
        }}
        onClick={(event: React.MouseEvent) => {
          if (event.shiftKey) {
            event.preventDefault();
            const onRowSelect = table.options.meta?.onRowSelect;
            if (onRowSelect) {
              onRowSelect(row.index, !row.getIsSelected(), true);
            }
          }
        }}
      />
    ),
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    id: "select",
    size: 40,
  },
  {
    accessorKey: "url",
    filterFn,
    header: "URL",
    id: "url",
    meta: {
      cell: { variant: "url" },
      label: "URL",
    },
    minSize: 300,
  },
  {
    accessorKey: "author",
    filterFn,
    header: "Author",
    id: "author",
    meta: {
      cell: { variant: "short-text" },
      label: "Author",
    },
    minSize: 150,
  },
  {
    accessorKey: "banger",
    filterFn,
    header: "Banger",
    id: "banger",
    meta: {
      cell: { variant: "checkbox" },
      label: "Banger",
    },
    minSize: 100,
  },
  {
    accessorKey: "createdAt",
    filterFn,
    header: "Created At",
    id: "createdAt",
    meta: {
      cell: { variant: "date" },
      label: "Created At",
    },
    minSize: 150,
  },
];

// Email Demo - Enrich cells demo
export interface EmailContact extends DataGridRowData {
  id: string;
  email: string;
  name?: string;
  company?: string;
  role?: string;
  location?: string;
}

const emailContacts = [
  "sarah.chen@techcorp.io",
  "m.rodriguez@globalbank.com",
  "james.wilson@startup.co",
  "a.patel@consulting.net",
  "emma.davis@healthcare.org",
  "l.kim@university.edu",
  "robert.brown@retail.com",
  "n.silva@marketing.io",
  "michael.lee@finance.com",
  "j.anderson@media.net",
];

export const getEmailContactsData = (): EmailContact[] =>
  emailContacts.map((email, i) => ({
    email,
    id: `contact-${i}`,
  }));

export const getEmailContactsColumns = (
  filterFn: FilterFn<DataGridFeatures, EmailContact>,
): ColumnDef<DataGridFeatures, EmailContact>[] => [
  {
    cell: ({ row, table }) => (
      <Checkbox
        aria-label="Select row"
        className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          const onRowSelect = table.options.meta?.onRowSelect;
          if (onRowSelect) {
            onRowSelect(row.index, !!value, false);
          } else {
            row.toggleSelected(!!value);
          }
        }}
        onClick={(event: React.MouseEvent) => {
          if (event.shiftKey) {
            event.preventDefault();
            const onRowSelect = table.options.meta?.onRowSelect;
            if (onRowSelect) {
              onRowSelect(row.index, !row.getIsSelected(), true);
            }
          }
        }}
      />
    ),
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    id: "select",
    size: 40,
  },
  {
    accessorKey: "email",
    filterFn,
    header: "Email",
    id: "email",
    meta: {
      cell: { variant: "short-text" },
      label: "Email",
    },
    minSize: 220,
  },
  {
    accessorKey: "name",
    filterFn,
    header: "Name",
    id: "name",
    meta: {
      cell: { variant: "short-text" },
      label: "Name",
      prompt: "Extract the full name from the email address pattern",
    },
    minSize: 150,
  },
  {
    accessorKey: "company",
    filterFn,
    header: "Company",
    id: "company",
    meta: {
      cell: { variant: "short-text" },
      label: "Company",
      prompt: "Infer the company name from the email domain",
    },
    minSize: 150,
  },
  {
    accessorKey: "role",
    filterFn,
    header: "Role",
    id: "role",
    meta: {
      cell: { variant: "short-text" },
      label: "Role",
      prompt: "Guess a likely job role based on the email and company",
    },
    minSize: 150,
  },
  {
    accessorKey: "location",
    filterFn,
    header: "Location",
    id: "location",
    meta: {
      cell: { variant: "short-text" },
      label: "Location",
      prompt: "Guess a likely location based on the company type",
    },
    minSize: 150,
  },
];
