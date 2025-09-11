# Supabase Database Configuration

This directory contains all SQL schemas and database-related files for the Aloa Project Management System.

## Files

### schema.sql
The complete database schema for the Aloa system. This includes:
- All table definitions with the `aloa_` prefix
- Indexes for performance optimization
- Foreign key relationships
- Permission grants

## Setup Instructions

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the entire contents of `schema.sql`
4. Paste and run the SQL in the editor

## Important Notes

- All tables use the `aloa_` prefix to maintain complete separation from the legacy custom forms application
- The schema is idempotent - it uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times
- No modifications are made to any existing `forms` tables from the legacy system

## Table Structure

- **Core Tables**: `aloa_projects`, `aloa_projectlets`
- **Applets System**: `aloa_applets`, `aloa_applet_library`, `aloa_applet_interactions`
- **Forms System**: `aloa_forms`, `aloa_form_fields`, `aloa_form_responses`
- **Supporting Tables**: `aloa_project_timeline`, `aloa_project_team`, `aloa_project_documents`, etc.

All tables are fully documented in the schema.sql file with inline comments.