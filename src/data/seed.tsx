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
  return Array.from({ length: 10000 }, (_, i) => generatePerson(i + 1));
}

export const initialData = getPeopleData();

export interface BlankRow {
  [key: string]: string;
}

export function getBlankData(): BlankRow[] {
  const columns = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i)
  ); // A-Z
  return Array.from({ length: 1001 }, () => {
    const row: BlankRow = {};
    for (const col of columns) {
      row[col] = "";
    }
    return row;
  });
}

export function getBlankColumns(
  filterFn: FilterFn<BlankRow>
): ColumnDef<BlankRow>[] {
  const columns = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i)
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
  filterFn: FilterFn<Person>
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
