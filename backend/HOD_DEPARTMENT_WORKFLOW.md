# HOD-Department Management Workflow

## Problem Solved
Previously, there was a circular dependency issue:
- To create a department → You needed to assign an HOD
- To create an HOD → You needed to assign them to a department
- This created an infinite loop where neither could be created without the other existing first

## Solution Implemented

### 1. Flexible Creation
Both departments and HODs can now be created independently:

#### Create Department (HOD assignment is optional)
```http
POST /admin/departments
{
  "name": "Computer Science",
  "code": "CS",
  "description": "Computer Science Department",
  "hod_id": null  // Optional - can be assigned later
}
```

#### Create HOD (Department assignment is optional)
```http
POST /admin/hods
{
  "username": "hod_cs",
  "password": "password123",
  "name": "Dr. John Smith",
  "email": "john@example.com",
  "phone": "1234567890",
  "department": null  // Optional - can be assigned later
}
```

### 2. Assignment Endpoints

#### Assign HOD to Department
```http
PUT /admin/hods/{hod_id}/assign-department?department_code=CS
```

#### Assign Department to HOD
```http
PUT /admin/departments/{dept_id}/assign-hod?hod_id={hod_id}
```

#### Unassign HOD from Department
```http
PUT /admin/hods/{hod_id}/unassign-department
```

## Workflow Examples

### Scenario 1: Create Department First, Then Assign HOD
1. Create department without HOD
2. Create HOD without department
3. Assign HOD to department using assignment endpoint

### Scenario 2: Create HOD First, Then Assign to Department
1. Create HOD without department
2. Create department without HOD
3. Assign HOD to department using assignment endpoint

### Scenario 3: Create Both with Assignment
1. Create department with HOD assignment (if HOD exists)
2. Or create HOD with department assignment (if department exists)

## Validation Rules

### Department Creation
- Department code must be unique
- If HOD is provided, it must exist and not be assigned to another department
- If HOD is provided, department must not already have an HOD

### HOD Creation
- Username must be unique
- If department is provided, it must exist and not have an HOD already
- If department is provided, HOD must not be assigned to another department

### Assignment Operations
- HOD must exist and have role "hod"
- Department must exist and be active
- Neither can already be assigned to another entity
- Both sides are updated atomically

## Benefits

1. **No More Circular Dependencies**: Can create entities in any order
2. **Flexible Management**: Easy to reassign HODs between departments
3. **Better Data Integrity**: Proper validation prevents conflicts
4. **Atomic Operations**: Assignment operations update both sides consistently
5. **Clear Separation**: Creation and assignment are separate concerns

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/departments` | Create department (HOD optional) |
| POST | `/admin/hods` | Create HOD (department optional) |
| PUT | `/admin/hods/{hod_id}/assign-department` | Assign HOD to department |
| PUT | `/admin/departments/{dept_id}/assign-hod` | Assign department to HOD |
| PUT | `/admin/hods/{hod_id}/unassign-department` | Unassign HOD from department |
| GET | `/admin/departments` | List all departments |
| GET | `/admin/hods` | List all HODs |

This solution eliminates the infinite loop problem and provides a clean, flexible way to manage HODs and departments.
