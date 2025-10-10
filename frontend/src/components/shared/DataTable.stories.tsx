import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from '../DataTable';

const meta: Meta<typeof DataTable> = {
  title: 'Components/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A reusable data table component with sorting, pagination, and selection capabilities.',
      },
    },
  },
  argTypes: {
    data: {
      description: 'Array of data objects to display',
      control: 'object',
    },
    columns: {
      description: 'Array of column definitions',
      control: 'object',
    },
    onSort: {
      description: 'Callback function for sorting',
      action: 'sorted',
    },
    onRowClick: {
      description: 'Callback function for row clicks',
      action: 'row-clicked',
    },
    onPageChange: {
      description: 'Callback function for pagination',
      action: 'page-changed',
    },
    onSearch: {
      description: 'Callback function for search',
      action: 'searched',
    },
    onSelectionChange: {
      description: 'Callback function for selection changes',
      action: 'selection-changed',
    },
    onBulkAction: {
      description: 'Callback function for bulk actions',
      action: 'bulk-action',
    },
    isLoading: {
      description: 'Loading state',
      control: 'boolean',
    },
    selectable: {
      description: 'Enable row selection',
      control: 'boolean',
    },
    searchable: {
      description: 'Enable search functionality',
      control: 'boolean',
    },
    responsive: {
      description: 'Enable responsive design',
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof DataTable>;

const sampleData = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    age: 25,
    department: 'Engineering',
    status: 'Active',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    age: 30,
    department: 'Marketing',
    status: 'Active',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    age: 35,
    department: 'Sales',
    status: 'Inactive',
  },
];

const sampleColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'age', label: 'Age', sortable: true },
  { key: 'department', label: 'Department', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

export const Default: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    onSort: () => {},
    onRowClick: () => {},
  },
};

export const WithPagination: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    onSort: () => {},
    onRowClick: () => {},
    pagination: {
      page: 1,
      limit: 10,
      total: 25,
      pages: 3,
    },
    onPageChange: () => {},
  },
};

export const WithSearch: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    onSort: () => {},
    onRowClick: () => {},
    searchable: true,
    onSearch: () => {},
  },
};

export const WithSelection: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    onSort: () => {},
    onRowClick: () => {},
    selectable: true,
    onSelectionChange: () => {},
    bulkActions: [
      { label: 'Delete', action: 'delete', variant: 'destructive' },
      { label: 'Export', action: 'export', variant: 'default' },
    ],
    onBulkAction: () => {},
  },
};

export const Loading: Story = {
  args: {
    data: [],
    columns: sampleColumns,
    onSort: () => {},
    onRowClick: () => {},
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    data: [],
    columns: sampleColumns,
    onSort: () => {},
    onRowClick: () => {},
    isLoading: false,
    emptyMessage: 'No data available',
  },
};

export const Responsive: Story = {
  args: {
    data: sampleData,
    columns: sampleColumns,
    onSort: () => {},
    onRowClick: () => {},
    responsive: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const WithCustomCellRenderer: Story = {
  args: {
    data: sampleData,
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        render: (value: string) => (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
            {value}
          </a>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => (
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              value === 'Active'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {value}
          </span>
        ),
      },
    ],
    onSort: () => {},
    onRowClick: () => {},
  },
};
