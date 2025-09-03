# Custom Forms - Markdown to Beautiful Forms

Transform markdown files into beautiful, responsive forms with unique URLs for collecting responses from multiple users.

## Features

- **Markdown-based Form Creation**: Upload `.md` files or paste markdown content to instantly generate forms
- **Beautiful UI**: Modern, responsive design with gradient styling and smooth animations
- **Unique URLs**: Each form gets a custom shareable URL for response collection
- **Real-time Analytics**: Track responses, view statistics, and export data
- **Multi-section Forms**: Support for complex forms with progress tracking
- **Field Types**: Text, textarea, email, number, date, select, radio, checkbox
- **Response Management**: View, analyze, and export responses as CSV
- **Form Dashboard**: Manage all your forms from a central location

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, React Router, React Hook Form
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **File Upload**: Multer
- **Styling**: Tailwind CSS with custom gradients
- **Icons**: Lucide React

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd custom-forms
```

2. Install dependencies:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

Or use the convenience script:
```bash
npm run install:all
```

3. Set up environment variables:

Create/edit `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/custom-forms
CLIENT_URL=http://localhost:5173
```

4. Start MongoDB:
```bash
# If using local MongoDB
mongod
```

5. Run the application:
```bash
# Development mode (runs both frontend and backend)
npm run dev

# Or run separately:
# Backend
cd backend && npm run dev

# Frontend (in another terminal)
cd frontend && npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Markdown Format

Create forms using this simple markdown syntax:

```markdown
# Form Title
Optional description text

## Section: Section Name
Optional section description

- type* | field_name | Label | Placeholder (optional)
  - Option 1 (for select/radio/checkbox)
  - Option 2
  - Option 3
```

### Field Types

- `text` - Single line text input
- `textarea` - Multi-line text area
- `email` - Email input with validation
- `number` - Numeric input
- `date` - Date picker
- `select` - Dropdown selection
- `radio` - Radio buttons (single choice)
- `checkbox` - Checkboxes (multiple choices)

Add `*` after the type to make a field required.

### Example Form

```markdown
# Customer Feedback Survey
We value your opinion!

## Section: Personal Information
- text* | name | Your Full Name
- email* | email | Email Address
- text | company | Company Name

## Section: Service Rating
- radio* | satisfaction | Overall Satisfaction
  - Very Satisfied
  - Satisfied
  - Neutral
  - Dissatisfied
  - Very Dissatisfied

- textarea* | comments | Additional Comments | Share your thoughts...

## Section: Interests
- checkbox | topics | Topics of Interest
  - Product Updates
  - Newsletters
  - Special Offers
  - Events
```

## Usage

1. **Create a Form**:
   - Navigate to `/create`
   - Upload a `.md` file or paste markdown content
   - Click "Create Form"
   - Copy the generated URL

2. **Share the Form**:
   - Share the unique URL with respondents
   - Forms are accessible without authentication
   - Responses are collected automatically

3. **View Responses**:
   - Go to Dashboard (`/dashboard`)
   - Click on the chart icon next to your form
   - View individual responses or analytics
   - Export data as CSV

## API Endpoints

### Forms
- `POST /api/forms/upload` - Upload markdown file to create form
- `POST /api/forms/create` - Create form from markdown text
- `GET /api/forms/public/:urlId` - Get public form for responses
- `GET /api/forms` - Get all forms (admin)
- `GET /api/forms/:id` - Get form details with stats
- `PATCH /api/forms/:id` - Update form settings
- `DELETE /api/forms/:id` - Delete form

### Responses
- `POST /api/responses/submit/:urlId` - Submit form response
- `GET /api/responses/form/:formId` - Get form responses
- `GET /api/responses/stats/:formId` - Get response statistics
- `DELETE /api/responses/:id` - Delete response

## Project Structure

```
custom-forms/
├── backend/
│   ├── src/
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── utils/          # API utilities
│   │   └── App.jsx         # Main app component
│   └── package.json
└── package.json            # Root package.json for workspaces
```

## Development

### Add New Field Types

1. Update the markdown parser in `backend/src/utils/markdownParser.js`
2. Add the field type to the Form model schema
3. Implement the field rendering in `frontend/src/pages/FormPage.jsx`

### Customize Styling

Edit the Tailwind configuration in `frontend/tailwind.config.js` or modify the component styles directly.

## Production Deployment

1. Build the frontend:
```bash
cd frontend && npm run build
```

2. Set production environment variables:
```env
NODE_ENV=production
MONGODB_URI=<production-mongodb-url>
CLIENT_URL=<production-frontend-url>
```

3. Start the backend server:
```bash
cd backend && npm start
```

## License

MIT

## Contributing

Pull requests are welcome! Please follow the existing code style and add tests for new features.