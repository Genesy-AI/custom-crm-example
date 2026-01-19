# Custom CRM Test Server

A reference implementation for testing [Genesy](https://genesy.ai) Custom CRM integration. This server implements all the required endpoints for syncing contacts, companies, and tasks between Genesy and a custom CRM system.

## Quick Start

```bash
# Install dependencies
npm install

# Initialize the database
npm run setup

# Start the server
npm start
```

The server will start at `http://localhost:3456`

## Features

- **Contacts Management**: Create, update, sync, and batch fetch contacts
- **Companies Management**: Create, update, sync, and batch fetch companies
- **Associations**: Link contacts to companies
- **Tasks**: Create and manage tasks from Genesy sequences
- **Activities**: Capture LinkedIn and email activities synced from Genesy
- **CRM Record Links**: Deep links to view records directly in the CRM
- **Web Dashboard**: Visual interface to view and manage all data

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Server port |
| `API_KEY` | `test-api-key-123` | API key for authentication |
| `API_KEY_HEADER` | `x-api-key` | Header name for API key |
| `BASE_URL` | `http://localhost:3456` | Base URL for link templates |

## Genesy Configuration

When connecting your Custom CRM in Genesy, use these settings:

```
Base URL:              http://localhost:3456
API Key:               test-api-key-123
API Key Header:        x-api-key
Contact Link Template: http://localhost:3456/view/contact/{{crmId}}
Company Link Template: http://localhost:3456/view/company/{{crmId}}
```

## API Endpoints

### Health Check

```
GET /health
```

Returns `{ "status": "ok" }` - Used by Genesy to verify connection.

### Contacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/contacts` | Create contacts |
| `PUT` | `/contacts` | Update contacts |
| `POST` | `/contacts/sync` | Find existing contacts by externalId |
| `POST` | `/contacts/batch` | Fetch contacts by CRM IDs |

#### Create Contacts

```bash
curl -X POST http://localhost:3456/contacts \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "contacts": [
      {
        "externalId": "12345",
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "company": "Acme Inc",
        "title": "CEO"
      }
    ]
  }'
```

**Response:**
```json
{
  "results": [
    { "externalId": "12345", "crmId": "uuid-here" }
  ]
}
```

#### Update Contacts

```bash
curl -X PUT http://localhost:3456/contacts \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "contacts": [
      {
        "crmId": "uuid-here",
        "firstName": "John",
        "lastName": "Updated"
      }
    ]
  }'
```

**Response:**
```json
{
  "results": [
    { "crmId": "uuid-here", "success": true }
  ]
}
```

#### Sync Contacts

Find which contacts already exist in the CRM by their Genesy ID (externalId):

```bash
curl -X POST http://localhost:3456/contacts/sync \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "contacts": [
      { "externalId": "12345" },
      { "externalId": "67890" }
    ]
  }'
```

**Response:**
```json
{
  "results": [
    { "externalId": "12345", "crmId": "uuid-here", "properties": {} }
  ]
}
```

### Companies

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/companies` | Create companies |
| `PUT` | `/companies` | Update companies |
| `POST` | `/companies/sync` | Find existing companies by externalId |
| `POST` | `/companies/batch` | Fetch companies by CRM IDs |

Same request/response format as contacts.

### Associations

Link contacts to companies:

```bash
curl -X POST http://localhost:3456/associations \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "associations": [
      { "contactCRMId": "contact-uuid", "companyCRMId": "company-uuid" }
    ]
  }'
```

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tasks` | Create a task |
| `GET` | `/tasks/:id` | Get a task by ID |
| `PATCH` | `/tasks/:id` | Update/complete a task |
| `POST` | `/tasks/batch` | Get multiple tasks by IDs |
| `PATCH` | `/tasks/batch` | Complete multiple tasks |

#### Create Task

```bash
curl -X POST http://localhost:3456/tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "subject": "Follow up call",
    "description": "Discuss proposal",
    "type": "call",
    "dueDate": "2024-12-31T10:00:00Z",
    "contactId": "contact-uuid",
    "companyId": "company-uuid"
  }'
```

**Response:**
```json
{
  "id": "task-uuid",
  "subject": "Follow up call",
  "completed": false
}
```

#### Complete Task

```bash
curl -X PATCH http://localhost:3456/tasks/task-uuid \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{ "completed": true }'
```

### Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/activities` | Create an activity |

#### Create Activity

```bash
curl -X POST http://localhost:3456/activities \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "type": "EMAIL",
    "subject": "Re: Intro",
    "body": "<div>Thanks for the quick reply!</div>",
    "direction": "OUTBOUND",
    "occurredAt": "2024-12-31T10:00:00Z",
    "contactId": "contact-uuid",
    "companyId": "company-uuid",
    "metadata": { "sequenceIndex": 2 }
  }'
```

## CRM Record Links

The server provides view pages for contacts and companies that can be linked from Genesy:

- **Contact View**: `/view/contact/:crmId`
- **Company View**: `/view/company/:crmId`

Configure the link templates in Genesy to enable clickable links to CRM records.

## Web Dashboard

Access the web interface at `http://localhost:3456` to:

- View configuration and endpoints
- Browse contacts, companies, and tasks in tables
- Create test data
- Reset the database

### Pages

- `/` - Dashboard with stats and configuration
- `/contacts.html` - Contacts table
- `/companies.html` - Companies table
- `/tasks.html` - Tasks table

## Database

Uses SQLite with Prisma ORM. The database file is stored at `prisma/dev.db`.

### Commands

```bash
# Reset and recreate database
npm run setup

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Project Structure

```
custom-crm-test/
├── server.js           # Main Express server
├── package.json
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── dev.db          # SQLite database
└── public/
    ├── index.html      # Dashboard
    ├── contacts.html   # Contacts page
    ├── companies.html  # Companies page
    └── tasks.html      # Tasks page
```

## License

MIT
