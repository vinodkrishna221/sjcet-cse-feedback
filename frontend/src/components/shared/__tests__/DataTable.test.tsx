/**
 * Unit tests for DataTable component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataTable } from '../DataTable';

const mockData = [
  { id: '1', name: 'John Doe', email: 'john@example.com', age: 25 },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', age: 30 },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
];

const mockColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'age', label: 'Age', sortable: true },
];

describe('DataTable', () => {
  it('should render table with data', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={() => {}}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('should handle sorting', () => {
    const onSort = jest.fn();
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={onSort}
        onRowClick={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith('name', 'asc');

    fireEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('should handle row clicks', () => {
    const onRowClick = jest.fn();
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={onRowClick}
      />
    );

    fireEvent.click(screen.getByText('John Doe'));
    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('should show loading state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={() => {}}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show empty state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={() => {}}
        isLoading={false}
      />
    );

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should show custom empty message', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={() => {}}
        isLoading={false}
        emptyMessage="No students found"
      />
    );

    expect(screen.getByText('No students found')).toBeInTheDocument();
  });

  it('should handle pagination', () => {
    const onPageChange = jest.fn();
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={() => {}}
        pagination={{
          page: 1,
          limit: 10,
          total: 25,
          pages: 3
        }}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('25 total items')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Next'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('should handle search', () => {
    const onSearch = jest.fn();
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={() => {}}
        onSearch={onSearch}
        searchable={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    expect(onSearch).toHaveBeenCalledWith('John');
  });

  it('should handle row selection', () => {
    const onSelectionChange = jest.fn();
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={() => {}}
        selectable={true}
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // Select first row

    expect(onSelectionChange).toHaveBeenCalledWith([mockData[0]]);
  });

  it('should handle bulk actions', () => {
    const onBulkAction = jest.fn();
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={() => {}}
        selectable={true}
        onSelectionChange={() => {}}
        bulkActions={[
          { label: 'Delete', action: 'delete', variant: 'destructive' },
          { label: 'Export', action: 'export', variant: 'default' }
        ]}
        onBulkAction={onBulkAction}
      />
    );

    // Select all rows
    const selectAllCheckbox = screen.getByLabelText('Select all');
    fireEvent.click(selectAllCheckbox);

    // Click bulk action
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(onBulkAction).toHaveBeenCalledWith('delete', mockData);
  });

  it('should handle custom cell rendering', () => {
    const customColumns = [
      { key: 'name', label: 'Name', sortable: true },
      { 
        key: 'email', 
        label: 'Email', 
        sortable: true,
        render: (value: string) => <a href={`mailto:${value}`}>{value}</a>
      },
    ];

    render(
      <DataTable
        data={mockData}
        columns={customColumns}
        onSort={() => {}}
        onRowClick={() => {}}
      />
    );

    const emailLink = screen.getByText('john@example.com');
    expect(emailLink).toHaveAttribute('href', 'mailto:john@example.com');
  });

  it('should handle keyboard navigation', () => {
    const onRowClick = jest.fn();
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={onRowClick}
      />
    );

    const firstRow = screen.getByText('John Doe').closest('tr');
    firstRow?.focus();
    
    fireEvent.keyDown(firstRow!, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);

    fireEvent.keyDown(firstRow!, { key: ' ' });
    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('should handle responsive design', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={() => {}}
        onRowClick={() => {}}
        responsive={true}
      />
    );

    // Should show mobile view
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
