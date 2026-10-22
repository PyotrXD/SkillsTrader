# SkillsTrader Developer Guide

This guide is designed to help junior developers understand and contribute to the SkillsTrader project. It's based on the actual code implementation rather than outdated requirements documentation.

## Project Overview

SkillsTrader is a PocketBase-backed recruiting operations system with a React frontend. The system manages recruitment workflows including candidates, employers, job orders, placements, and document tracking.

### Architecture

- **Backend/Data/Auth**: PocketBase (`pocketbase.exe`, `pb_data/`, `pb_migrations/`, `pb_hooks/`)
- **Frontend**: Vite + React (`skillstrader-frontend/`)
- **Operations tooling**: PowerShell scripts in `scripts/`

## Development Setup

### Quick Start

```bash
npm run setup
npm run dev
```

Default local URLs:
- Frontend: `http://127.0.0.1:5173/dashboard`
- PocketBase Dashboard: `http://127.0.0.1:8091/_/`

### Environment Variables

The frontend uses environment variables from `.env` files:
- `VITE_POCKETBASE_URL`: URL of the PocketBase instance
- `VITE_POCKETBASE_PORT`: Port for PocketBase during development (default: 8091)

## Core Data Models

The system uses PocketBase collections to store data. Here are the main collections:

### Candidates (`candidates`)
Stores candidate information including personal details, education, work history, and documents.

Fields:
- `id` (text, primary key): Unique identifier
- `last_name`
- `first_name`
- `middle_name`
- `full_name` (text): Candidate's full name
- `email` (email): Contact email
- `phone` (text): Phone number
- `address` (text): Physical address
- `field` (file): Profile photo
- `education` (editor): Educational background
- `work_history` (editor): Work experience
- `skills` (json): Skills data
- `certifications` (editor): Certifications
- `desired_salary` (text): Expected salary
- `resume` (file): Resume document
- `passport` (file): Passport document
- `visa` (file): Visa document
- `others` (file): Other supporting documents
- `status` (select): Application status (Applied, Screening, For Interview, Rejected, For Placement)
- `created` (autodate): Creation timestamp
- `updated` (autodate): Last update timestamp

### Employers (`employers`)
Stores employer/company information.

Fields:
- `id` (text, primary key): Unique identifier
- `company_name` (text): Company name
- `contact_person` (text): Primary contact person
- `contact_info` (text): Contact information
- `country` (text): Country of operation
- `industry` (text): Industry sector
- `job_order_history` (json): History of job orders
- `billing_info` (json): Billing information
- `created` (autodate): Creation timestamp
- `updated` (autodate): Last update timestamp

### Job Orders (`job_orders`)
Represents job positions available for candidates.

Fields:
- `id` (text, primary key): Unique identifier
- `title` (text): Job title
- `description` (text): Job description
- `salary_range` (text): Salary range
- `required_skills` (json): Required skills
- `openings` (number): Number of positions available
- `employer` (relation): Relation to employer
- `status` (select): Status (open, closed, filled)
- `created` (autodate): Creation timestamp
- `updated` (autodate): Last update timestamp

### Placements (`placements`)
Tracks hiring placements between candidates and job orders.

Fields:
- `id` (text, primary key): Unique identifier
- `created` (autodate): Creation timestamp
- `updated` (autodate): Last update timestamp

### Documents (`documents`)
Stores uploaded documents for candidates and employers.

Fields:
- `id` (text, primary key): Unique identifier
- `candidate` (relation): Relation to candidate
- `employer` (relation): Relation to employer
- `doc_type` (select): Document type (resume, passport, visa, nbi_clearance, police_clearance, offer_letter, dmw_approved_contract, overseas_employment_certificate, peos_certificate, e_registration_file, other)
- `file` (file): Uploaded file
- `issued_date` (date): Issued date
- `expiry_date` (date): Expiry date
- `status` (select): Document status (Draft, Submitted, Verified, Rejected, Expired)
- `notes` (editor): Additional notes
- `verified_by` (relation): User who verified the document
- `verified_at` (date): Verification timestamp
- `created` (autodate): Creation timestamp
- `updated` (autodate): Last update timestamp

### Users (`_pb_users_auth_`)
PocketBase's built-in user authentication collection.

Fields:
- `id` (text, primary key): Unique identifier
- `email` (email): User email
- `role` (select): User role (administrator, manager, staff)
- `created` (autodate): Creation timestamp
- `updated` (autodate): Last update timestamp

## Frontend Structure

The frontend is built with React and Vite. Key files and folders:

### Main Application Flow
- `skillstrader-frontend/src/main.tsx`: Entry point that sets up React Router
- `skillstrader-frontend/src/App.tsx`: Main routing component with authentication guards

### Authentication System
- `skillstrader-frontend/src/lib/pocketbase/pb.ts`: PocketBase client initialization and auth utilities
- `skillstrader-frontend/src/components/custom/Login.tsx`: Login component
- `skillstrader-frontend/src/components/custom/Dashboard.tsx`: Main dashboard component
- `skillstrader-frontend/src/components/custom/Users.tsx`: Admin user creation component

### Routing Logic
The application uses React Router with authentication guards:
- `/` - Redirects to `/login` or `/dashboard` based on auth status
- `/login` - Login page (redirects to dashboard if already authenticated)
- `/dashboard` - Main dashboard (authenticated users only)
- `/dashboard/admin/users/new` - Admin user creation (administrators only)
- `*` - Redirects to dashboard or login

### Authentication Flow
1. Users authenticate via PocketBase
2. The system determines user role using `getUserRole()` function
3. Role-based routing controls access to different parts of the application
4. Sessions expire after 3 hours of inactivity
5. When PocketBase is restarted, all sessions are invalidated

## Key Components

### Authentication Utilities
Located in `skillstrader-frontend/src/lib/pocketbase/pb.ts`:
- `pb`: PocketBase client instance
- `getUserRole()`: Returns user role (administrator, manager, staff)
- `getAuthCollection()`: Returns authentication collection name
- `logout()`: Clears authentication store

### Session Management
- Automatic logout after 3 hours of inactivity
- Session invalidation on PocketBase restart via hooks
- Token-based authentication with automatic refresh

## Development Scripts

### Available Scripts
- `npm run setup`: Sets up the development environment
- `npm run dev`: Starts development server
- `npm run build`: Builds the frontend for production
- `npm run install:local-server`: Installs local server dependencies

### PocketBase Operations
- `scripts/pb-backup.ps1`: Creates database backup
- `scripts/pb-restore.ps1`: Restores database from backup
- `scripts/pb-restore-drill.ps1`: Performs restore drill
- `scripts/pb-healthcheck.ps1`: Checks PocketBase health
- `scripts/serve-production.ps1`: Starts production server

## Deployment

### Local Development
1. Run `npm run setup` to install dependencies
2. Run `npm run dev` to start both frontend and backend
3. Access frontend at `http://127.0.0.1:5173/dashboard`
4. Access PocketBase dashboard at `http://127.0.0.1:8091/_/`

### Production Deployment
1. Build frontend: `npm run build`
2. Run production server: `powershell -ExecutionPolicy Bypass -File scripts/serve-production.ps1`
3. Configure environment variables:
   - `PB_ENCRYPTION_KEY`: 32-character encryption key
   - `VITE_POCKETBASE_URL`: URL of the PocketBase instance

## Contributing Guidelines

### Code Style
- TypeScript for type safety
- React with functional components and hooks
- Tailwind CSS for styling
- Follow existing code patterns and naming conventions

### Adding New Features
1. Understand the data model before implementing new features
2. Follow the existing component structure
3. Implement proper authentication guards where needed
4. Test with different user roles
5. Ensure proper error handling

### Database Changes
When adding new collections or fields:
1. Create a new migration file in `pb_migrations/`
2. Follow the existing migration pattern
3. Test the migration in development
4. Update the PocketBase schema accordingly

## Troubleshooting

### Common Issues
1. **Authentication problems**: Check that `PB_ENCRYPTION_KEY` is set correctly
2. **Missing dependencies**: Run `npm run setup` to reinstall dependencies
3. **Port conflicts**: Ensure no other services are using ports 8091 (PocketBase) or 5173 (frontend)
4. **Session timeouts**: Sessions automatically expire after 3 hours of inactivity

### Debugging Tips
1. Check browser console for JavaScript errors
2. Inspect PocketBase logs for backend issues
3. Use PocketBase dashboard to verify data integrity
4. Check network tab to see API requests/responses