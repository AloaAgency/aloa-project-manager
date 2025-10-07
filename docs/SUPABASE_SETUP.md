# Supabase Setup Instructions

## Using Existing Tables

Your Supabase project already has the required tables:
- `forms` - Stores form metadata
- `form_fields` - Stores form field definitions  
- `form_responses` - Stores response submissions
- `form_response_answers` - Stores individual field answers

### Update Your Existing Schema (if needed)
1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**  
3. Copy and paste the contents of `supabase-existing-schema.sql`
4. Click **Run** to add any missing columns or constraints

## Quick Setup

### 1. Use Your Existing Supabase Project
Since you already have the tables created, you just need to ensure they have all the required columns.

### 3. Get Your API Keys
1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon/Public Key**: `eyJhbGc...`

### 4. Configure Environment Variables

#### For Local Development:
Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### For Vercel Deployment:
Add the same variables in Vercel dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add both variables

## Testing the Connection

1. Run the app locally:
```bash
npm run dev
```

2. Try creating a form:
   - Go to http://localhost:3000/create
   - Upload a markdown file
   - If successful, you'll be redirected to the form

3. Check Supabase dashboard:
   - Go to **Table Editor** → **forms**
   - You should see your new form entry

## Troubleshooting

### "Missing Supabase environment variables" Error
- Ensure `.env.local` file exists and has both variables
- Restart the development server after adding env variables

### Forms/Responses Not Saving
- Check that tables were created successfully in Supabase
- Verify Row Level Security is enabled (should be from our SQL)
- Check browser console for specific error messages

### Connection Refused
- Verify your Supabase project is active (not paused)
- Double-check the Project URL is correct
- Ensure anon key is copied completely

## Database Schema Overview

### Forms Table
- `id`: UUID primary key
- `title`: Form title
- `description`: Optional description
- `url_id`: Unique URL identifier
- `fields`: JSONB containing form fields
- `created_at`: Timestamp
- `updated_at`: Auto-updating timestamp

### Responses Table
- `id`: UUID primary key
- `form_id`: Foreign key to forms table
- `data`: JSONB containing response data
- `submitted_at`: Timestamp

## Security Notes

- The anon key is safe to expose in frontend code
- Row Level Security (RLS) is enabled on both tables
- Current policies allow public read/write (adjust as needed)
- For production, consider adding authentication