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
- **Activities**: Log LinkedIn messages, emails, InMails, and connection requests
- **Engagement Field Updates**: Receive campaign engagement status updates
- **CRM Record Links**: Deep links to view records directly in the CRM
- **Web Dashboard**: Visual interface to view and manage all data with activity timeline

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

### Quick Reference

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Health | `/health` | GET | Connection validation |
| Contacts | `/contacts` | POST | Create contacts |
| Contacts | `/contacts` | PUT | Update contacts (incl. engagement fields) |
| Contacts | `/contacts/sync` | POST | Find existing contacts |
| Contacts | `/contacts/batch` | POST | Fetch by CRM IDs |
| Companies | `/companies` | POST | Create companies |
| Companies | `/companies` | PUT | Update companies |
| Companies | `/companies/sync` | POST | Find existing companies |
| Companies | `/companies/batch` | POST | Fetch by CRM IDs |
| Associations | `/associations` | POST | Link contacts to companies |
| Tasks | `/tasks` | POST | Create a task |
| Tasks | `/tasks/:id` | GET | Get a task |
| Tasks | `/tasks/:id` | PATCH | Complete a task |
| Tasks | `/tasks/batch` | POST | Get multiple tasks |
| Tasks | `/tasks/batch` | PATCH | Complete multiple tasks |
| Activities | `/activities` | POST | Log activity (message, email, etc.) |
| Activities | `/activities/:id` | GET | Get an activity |

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

Log conversation activity from Genesy campaigns (LinkedIn messages, emails, InMails, connection requests).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/activities` | Create an activity record |
| `GET` | `/activities/:id` | Get an activity by ID |

#### Activity Types

| Type | Description |
|------|-------------|
| `EMAIL` | Email messages sent/received |
| `LINKEDIN` | LinkedIn messages sent/received |
| `LINKEDIN_INMAIL` | LinkedIn InMail sent/received |
| `LINKEDIN_CONNECTION` | Connection requests sent/accepted |

#### Create Activity

```bash
curl -X POST http://localhost:3456/activities \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "type": "LINKEDIN",
    "subject": "[1/3] [FROM Acme Corp] John Smith",
    "body": "Hi Jane, I noticed your company is expanding...",
    "direction": "OUTBOUND",
    "occurredAt": "2024-12-31T10:00:00Z",
    "contactId": "contact-uuid",
    "companyId": "company-uuid",
    "metadata": {
      "messageId": "msg-123",
      "sequenceIndex": 1,
      "sequenceMessageCount": 3
    }
  }'
```

**Response:**
```json
{
  "id": "activity-uuid",
  "type": "LINKEDIN",
  "subject": "[1/3] [FROM Acme Corp] John Smith",
  "direction": "OUTBOUND",
  "occurredAt": "2024-12-31T10:00:00Z"
}
```

#### Subject Format

Genesy formats the subject to provide context:

- **Outbound**: `[{sequenceIndex}/{total}] [FROM {YourCompany}] {SenderName}`
- **Inbound**: `[{ContactCompany}] {ContactFirstName} {ContactLastName}`

### Engagement Field Updates

When contacts engage with campaigns (reply, connect, click links), Genesy sends engagement updates via `PUT /contacts`:

```bash
curl -X PUT http://localhost:3456/contacts \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{
    "contacts": [
      {
        "crmId": "contact-uuid",
        "genesy_engagement_status": "Message Replied (2/3) - LINKEDIN",
        "genesy_sequence_status": "Replied",
        "genesy_last_activity": "2024-12-31T10:00:00Z"
      }
    ]
  }'
```

#### Available Engagement Fields

| Field | Example Value | Description |
|-------|---------------|-------------|
| `campaignEngagementStatus` | `Message Replied (2/3) - LINKEDIN` | Current engagement status |
| `campaignSequenceStatus` | `Ongoing` | `Not Started`, `Ongoing`, `Finished`, `Replied` |
| `campaignOpens` | `5` | Number of email opens |
| `campaignClicks` | `2` | Number of link clicks |
| `activities` | `Connection Request Sent, Message Sent` | Activity log |

> **Note**: Field names are user-configurable in Genesy. This server stores all fields in a flexible JSON `data` column.

## CRM Record Links

The server provides view pages for contacts and companies that can be linked from Genesy:

- **Contact View**: `/view/contact/:crmId` - Shows contact details and activity timeline
- **Company View**: `/view/company/:crmId` - Shows company details and activity timeline

Activities are displayed in reverse chronological order with:
- **Outbound messages**: Green border/background
- **Inbound messages**: Blue border/background

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

### Models

| Model | Description |
|-------|-------------|
| `Contact` | Contacts with email, name, company, etc. |
| `Company` | Companies with name, domain, industry |
| `Association` | Links contacts to companies (many-to-many) |
| `Task` | Tasks with subject, due date, completion status |
| `Activity` | LinkedIn/email activities with type, direction, body |

All models store additional custom fields in a flexible JSON `data` column.

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
├── server.js           # Main Express server with all endpoints
├── package.json
├── prisma/
│   ├── schema.prisma   # Database schema (Contact, Company, Task, Activity)
│   └── dev.db          # SQLite database
└── public/
    ├── index.html      # Dashboard with stats and config
    ├── contacts.html   # Contacts table
    ├── companies.html  # Companies table
    └── tasks.html      # Tasks table
```

## License

MIT
