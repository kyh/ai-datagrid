import { faker } from "@faker-js/faker";
import type { ColumnDef } from "@tanstack/react-table";
import type { FilterFn } from "@tanstack/react-table";
import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { FileCellData } from "@/lib/data-grid-types";

export interface Person {
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

faker.seed(12345);

export const departments = [
  "Engineering",
  "Marketing",
  "Sales",
  "HR",
  "Finance",
] as const;

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
  { name: "Resume.pdf", type: "application/pdf", sizeRange: [50, 500] },
  { name: "Contract.pdf", type: "application/pdf", sizeRange: [100, 300] },
  { name: "ID_Document.pdf", type: "application/pdf", sizeRange: [200, 400] },
  { name: "Profile_Photo.jpg", type: "image/jpeg", sizeRange: [500, 2000] },
  {
    name: "Presentation.pptx",
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    sizeRange: [1000, 5000],
  },
  {
    name: "Report.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sizeRange: [100, 800],
  },
  {
    name: "Timesheet.xlsx",
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeRange: [50, 200],
  },
  { name: "Certificate.pdf", type: "application/pdf", sizeRange: [200, 500] },
  {
    name: "Background_Check.pdf",
    type: "application/pdf",
    sizeRange: [300, 600],
  },
  { name: "Training_Video.mp4", type: "video/mp4", sizeRange: [5000, 15000] },
] as const;

function generatePerson(id: number): Person {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  const fileCount = faker.number.int({ min: 0, max: 3 });
  const selectedFiles = faker.helpers.arrayElements(sampleFiles, fileCount);

  const attachments: FileCellData[] = selectedFiles.map((file, index) => {
    const sizeKB = faker.number.int({
      min: file.sizeRange[0],
      max: file.sizeRange[1],
    });
    return {
      id: `${id}-file-${index}`,
      name: file.name,
      size: sizeKB * 1024,
      type: file.type,
      url: `https://example.com/files/${id}/${file.name}`,
    };
  });

  return {
    id: faker.string.nanoid(8),
    name: `${firstName} ${lastName}`,
    age: faker.number.int({ min: 22, max: 65 }),
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    website: faker.internet.url().replace(/\/$/, ""),
    notes: faker.helpers.arrayElement(notes),
    salary: faker.number.int({ min: 40000, max: 150000 }),
    department: faker.helpers.arrayElement(departments),
    status: faker.helpers.arrayElement(statuses),
    isActive: faker.datatype.boolean(),
    startDate:
      faker.date
        .between({ from: "2018-01-01", to: "2024-01-01" })
        .toISOString()
        .split("T")[0] ?? "",
    skills: faker.helpers.arrayElements(skills, { min: 1, max: 5 }),
    attachments,
  };
}

export function getPeopleData(): Person[] {
  return Array.from({ length: 50 }, (_, i) => generatePerson(i + 1));
}

export const initialData = getPeopleData();

// Company data
export interface Company {
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

export const companyStatuses = [
  "Active",
  "Acquired",
  "IPO",
  "Private",
  "Startup",
] as const;

const companyDescriptions = [
  "A leading provider of innovative solutions in the industry. Known for exceptional customer service and cutting-edge technology.",
  "Fast-growing company focused on disrupting traditional markets with modern approaches and sustainable practices.",
  "Established enterprise with a strong track record of delivering value to shareholders and customers alike.",
  "Innovative startup backed by top-tier venture capital firms, focused on solving complex industry challenges.",
  "Global corporation with operations in over 50 countries, serving millions of customers worldwide.",
];

function generateCompany(id: number): Company {
  const companyName = faker.company.name();

  return {
    id: faker.string.nanoid(8),
    name: companyName,
    industry: faker.helpers.arrayElement(industries),
    employees: faker.number.int({ min: 10, max: 50000 }),
    website: `https://${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
    description: faker.helpers.arrayElement(companyDescriptions),
    revenue: faker.number.int({ min: 100000, max: 10000000000 }),
    founded: faker.date
      .between({ from: "1950-01-01", to: "2023-01-01" })
      .getFullYear()
      .toString(),
    headquarters: `${faker.location.city()}, ${faker.location.country()}`,
    status: faker.helpers.arrayElement(companyStatuses),
    isPublic: faker.datatype.boolean(),
  };
}

export function getCompaniesData(): Company[] {
  return Array.from({ length: 50 }, (_, i) => generateCompany(i + 1));
}

export function getCompaniesColumns(
  filterFn: FilterFn<Company>,
): ColumnDef<Company>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
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
      size: 40,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Company Name",
      minSize: 200,
      filterFn,
      meta: {
        label: "Company Name",
        cell: {
          variant: "short-text",
        },
      },
    },
    {
      id: "industry",
      accessorKey: "industry",
      header: "Industry",
      minSize: 150,
      filterFn,
      meta: {
        label: "Industry",
        cell: {
          variant: "select",
          options: industries.map((i) => ({ label: i, value: i })),
        },
      },
    },
    {
      id: "employees",
      accessorKey: "employees",
      header: "Employees",
      minSize: 120,
      filterFn,
      meta: {
        label: "Employees",
        cell: {
          variant: "number",
          min: 1,
          max: 1000000,
        },
      },
    },
    {
      id: "website",
      accessorKey: "website",
      header: "Website",
      minSize: 200,
      filterFn,
      meta: {
        label: "Website",
        cell: {
          variant: "url",
        },
      },
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      minSize: 200,
      filterFn,
      meta: {
        label: "Description",
        cell: {
          variant: "long-text",
        },
      },
    },
    {
      id: "revenue",
      accessorKey: "revenue",
      header: "Revenue",
      minSize: 140,
      filterFn,
      meta: {
        label: "Revenue",
        cell: {
          variant: "number",
        },
      },
    },
    {
      id: "founded",
      accessorKey: "founded",
      header: "Founded",
      minSize: 100,
      filterFn,
      meta: {
        label: "Founded",
        cell: {
          variant: "short-text",
        },
      },
    },
    {
      id: "headquarters",
      accessorKey: "headquarters",
      header: "Headquarters",
      minSize: 180,
      filterFn,
      meta: {
        label: "Headquarters",
        cell: {
          variant: "short-text",
        },
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      minSize: 120,
      filterFn,
      meta: {
        label: "Status",
        cell: {
          variant: "select",
          options: companyStatuses.map((s) => ({ label: s, value: s })),
        },
      },
    },
    {
      id: "isPublic",
      accessorKey: "isPublic",
      header: "Public",
      minSize: 100,
      filterFn,
      meta: {
        label: "Public",
        cell: {
          variant: "checkbox",
        },
      },
    },
  ];
}

export interface SpreadsheetRow {
  [key: string]: string;
}

export function getSpreadsheetData(): SpreadsheetRow[] {
  const columns = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i),
  ); // A-Z
  return Array.from({ length: 1001 }, () => {
    const row: SpreadsheetRow = {};
    for (const col of columns) {
      row[col] = "";
    }
    return row;
  });
}

export function getSpreadsheetColumns(
  filterFn: FilterFn<SpreadsheetRow>,
): ColumnDef<SpreadsheetRow>[] {
  const columns = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i),
  ); // A-Z

  return [
    {
      id: "index",
      header: () => (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm" />
      ),
      cell: ({ row }) => (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          {row.index + 1}
        </div>
      ),
      size: 60,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      enablePinning: false,
    },
    ...columns.map((col) => ({
      id: col,
      accessorKey: col,
      header: col,
      minSize: 180,
      filterFn,
      meta: {
        label: col,
        cell: {
          variant: "short-text" as const,
        },
        hideVariantLabel: true,
      },
    })),
  ];
}

export function getPeopleColumns(
  filterFn: FilterFn<Person>,
): ColumnDef<Person>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
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
      size: 40,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      minSize: 180,
      filterFn,
      meta: {
        label: "Name",
        cell: {
          variant: "short-text",
        },
      },
    },
    {
      id: "age",
      accessorKey: "age",
      header: "Age",
      minSize: 100,
      filterFn,
      meta: {
        label: "Age",
        cell: {
          variant: "number",
          min: 18,
          max: 100,
          step: 1,
        },
      },
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      minSize: 240,
      filterFn,
      meta: {
        label: "Email",
        cell: {
          variant: "short-text",
        },
      },
    },
    {
      id: "website",
      accessorKey: "website",
      header: "Website",
      minSize: 240,
      filterFn,
      meta: {
        label: "Website",
        cell: {
          variant: "url",
        },
      },
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: "Notes",
      minSize: 200,
      filterFn,
      meta: {
        label: "Notes",
        cell: {
          variant: "long-text",
        },
      },
    },
    {
      id: "salary",
      accessorKey: "salary",
      header: "Salary",
      minSize: 180,
      filterFn,
      meta: {
        label: "Salary",
        cell: {
          variant: "number",
          min: 0,
          step: 1000,
        },
      },
    },
    {
      id: "department",
      accessorKey: "department",
      header: "Department",
      minSize: 180,
      filterFn,
      meta: {
        label: "Department",
        cell: {
          variant: "select",
          options: departments.map((dept) => ({
            label: dept,
            value: dept,
          })),
        },
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      minSize: 180,
      filterFn,
      meta: {
        label: "Status",
        cell: {
          variant: "select",
          options: statuses.map((status) => ({
            label: status,
            value: status,
          })),
        },
      },
    },
    {
      id: "skills",
      accessorKey: "skills",
      header: "Skills",
      minSize: 240,
      filterFn,
      meta: {
        label: "Skills",
        cell: {
          variant: "multi-select",
          options: skills.map((skill) => ({
            label: skill,
            value: skill,
          })),
        },
      },
    },
    {
      id: "isActive",
      accessorKey: "isActive",
      header: "Active",
      minSize: 140,
      filterFn,
      meta: {
        label: "Active",
        cell: {
          variant: "checkbox",
        },
      },
    },
    {
      id: "startDate",
      accessorKey: "startDate",
      header: "Start Date",
      minSize: 150,
      filterFn,
      meta: {
        label: "Start Date",
        cell: {
          variant: "date",
        },
      },
    },
    {
      id: "attachments",
      accessorKey: "attachments",
      header: "Attachments",
      minSize: 240,
      filterFn,
      meta: {
        label: "Attachments",
        cell: {
          variant: "file",
          maxFileSize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          accept:
            "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx",
          multiple: true,
        },
      },
    },
  ];
}

// Article data
export interface Article {
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

function generateArticle(): Article {
  const title = faker.lorem.sentence({ min: 4, max: 8 }).slice(0, -1);
  return {
    id: faker.string.nanoid(8),
    title,
    author: faker.person.fullName(),
    category: faker.helpers.arrayElement(articleCategories),
    publishDate: faker.date.recent({ days: 90 }).toISOString().split("T")[0],
    readTime: faker.number.int({ min: 2, max: 15 }),
    tags: faker.helpers.arrayElements(articleTags, {
      min: 1,
      max: 3,
    }) as string[],
    excerpt: faker.lorem.paragraph(),
    url: `https://example.com/articles/${faker.helpers.slugify(title).toLowerCase()}`,
    isFeatured: faker.datatype.boolean({ probability: 0.2 }),
  };
}

export function getArticlesData(): Article[] {
  return Array.from({ length: 50 }, () => generateArticle());
}

export function getArticlesColumns(
  filterFn: FilterFn<Article>,
): ColumnDef<Article>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
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
      size: 40,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
    },
    {
      id: "title",
      accessorKey: "title",
      header: "Title",
      minSize: 250,
      filterFn,
      meta: {
        label: "Title",
        cell: { variant: "short-text" },
      },
    },
    {
      id: "author",
      accessorKey: "author",
      header: "Author",
      minSize: 150,
      filterFn,
      meta: {
        label: "Author",
        cell: { variant: "short-text" },
      },
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      minSize: 130,
      filterFn,
      meta: {
        label: "Category",
        cell: {
          variant: "select",
          options: articleCategories.map((c) => ({ label: c, value: c })),
        },
      },
    },
    {
      id: "publishDate",
      accessorKey: "publishDate",
      header: "Published",
      minSize: 130,
      filterFn,
      meta: {
        label: "Published",
        cell: { variant: "date" },
      },
    },
    {
      id: "readTime",
      accessorKey: "readTime",
      header: "Read Time (min)",
      minSize: 120,
      filterFn,
      meta: {
        label: "Read Time",
        cell: { variant: "number", min: 1, max: 60 },
      },
    },
    {
      id: "tags",
      accessorKey: "tags",
      header: "Tags",
      minSize: 200,
      filterFn,
      meta: {
        label: "Tags",
        cell: {
          variant: "multi-select",
          options: articleTags.map((t) => ({ label: t, value: t })),
        },
      },
    },
    {
      id: "excerpt",
      accessorKey: "excerpt",
      header: "Excerpt",
      minSize: 200,
      filterFn,
      meta: {
        label: "Excerpt",
        cell: { variant: "long-text" },
      },
    },
    {
      id: "url",
      accessorKey: "url",
      header: "URL",
      minSize: 200,
      filterFn,
      meta: {
        label: "URL",
        cell: { variant: "url" },
      },
    },
    {
      id: "isFeatured",
      accessorKey: "isFeatured",
      header: "Featured",
      minSize: 100,
      filterFn,
      meta: {
        label: "Featured",
        cell: { variant: "checkbox" },
      },
    },
  ];
}

// Recipe Demo - Generate columns demo
export interface Recipe {
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

export function getRecipesData(): Recipe[] {
  return recipeNames.map((name, i) => ({
    id: `recipe-${i}`,
    name,
  }));
}

export function getRecipesColumns(
  filterFn: FilterFn<Recipe>,
): ColumnDef<Recipe>[] {
  return [
    {
      id: "index",
      header: () => (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm" />
      ),
      cell: ({ row }) => (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          {row.index + 1}
        </div>
      ),
      size: 60,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      enablePinning: false,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Recipe Name",
      minSize: 200,
      filterFn,
      meta: {
        label: "Recipe Name",
        cell: { variant: "short-text" },
      },
    },
  ];
}

export const recipeDemoPrompt =
  "Add columns for cuisine type, difficulty level, prep time (minutes), cooking time (minutes), and calories";

// Email Demo - Enrich cells demo
export interface EmailContact {
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

export function getEmailContactsData(): EmailContact[] {
  return emailContacts.map((email, i) => ({
    id: `contact-${i}`,
    email,
  }));
}

export function getEmailContactsColumns(
  filterFn: FilterFn<EmailContact>,
): ColumnDef<EmailContact>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          className="after:-inset-2.5 relative transition-[shadow,border] after:absolute after:content-[''] hover:border-primary/40"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
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
      size: 40,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      minSize: 220,
      filterFn,
      meta: {
        label: "Email",
        cell: { variant: "short-text" },
      },
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      minSize: 150,
      filterFn,
      meta: {
        label: "Name",
        cell: { variant: "short-text" },
        prompt: "Extract the full name from the email address pattern",
      },
    },
    {
      id: "company",
      accessorKey: "company",
      header: "Company",
      minSize: 150,
      filterFn,
      meta: {
        label: "Company",
        cell: { variant: "short-text" },
        prompt: "Infer the company name from the email domain",
      },
    },
    {
      id: "role",
      accessorKey: "role",
      header: "Role",
      minSize: 150,
      filterFn,
      meta: {
        label: "Role",
        cell: { variant: "short-text" },
        prompt: "Guess a likely job role based on the email and company",
      },
    },
    {
      id: "location",
      accessorKey: "location",
      header: "Location",
      minSize: 150,
      filterFn,
      meta: {
        label: "Location",
        cell: { variant: "short-text" },
        prompt: "Guess a likely location based on the company type",
      },
    },
  ];
}
