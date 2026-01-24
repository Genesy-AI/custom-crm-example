const express = require('express');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const app = express();
const prisma = new PrismaClient();

// Config - set your API key here
const API_KEY = process.env.API_KEY || 'test-api-key-123';
const API_KEY_HEADER = process.env.API_KEY_HEADER || 'x-api-key';

// Link templates - these are returned to Genesy for generating clickable links
const BASE_URL = process.env.BASE_URL || 'http://localhost:3456';
const CONTACT_LINK_TEMPLATE = `${BASE_URL}/view/contact/{{crmId}}`;
const COMPANY_LINK_TEMPLATE = `${BASE_URL}/view/company/{{crmId}}`;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use((req, res, next) => {
  if (req.path !== '/health' && !req.path.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
  }
  next();
});

// API Key auth middleware (skip for public routes)
const authMiddleware = (req, res, next) => {
  // Skip auth for public routes (dashboard, debug APIs, health, view pages)
  if (req.path === '/' || req.path.startsWith('/api/') || req.path === '/health' || req.path.startsWith('/view/')) {
    return next();
  }

  const providedKey = req.headers[API_KEY_HEADER.toLowerCase()];
  if (providedKey !== API_KEY) {
    console.log(`Auth failed. Expected header "${API_KEY_HEADER}" with key "${API_KEY}", got "${providedKey}"`);
    return res.status(401).json({ error: 'Unauthorized - invalid API key' });
  }
  next();
};

app.use(authMiddleware);

// ============== HEALTH CHECK ==============
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============== CONTACTS ==============

// POST /contacts - Create contacts
app.post('/contacts', async (req, res) => {
  try {
    const { contacts } = req.body;
    const results = [];

    for (const contact of contacts) {
      const created = await prisma.contact.create({
        data: {
          externalId: contact.externalId,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          company: contact.company,
          title: contact.title,
          linkedinUrl: contact.linkedinUrl,
          data: JSON.stringify(contact),
        },
      });
      results.push({ externalId: contact.externalId, crmId: created.id });
    }

    console.log(`Created ${results.length} contacts`);
    res.json({ results });
  } catch (error) {
    console.error('Error creating contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /contacts - Update contacts
app.put('/contacts', async (req, res) => {
  try {
    const { contacts } = req.body;
    const results = [];

    for (const contact of contacts) {
      try {
        await prisma.contact.update({
          where: { id: contact.crmId },
          data: {
            email: contact.email,
            firstName: contact.firstName,
            lastName: contact.lastName,
            phone: contact.phone,
            company: contact.company,
            title: contact.title,
            linkedinUrl: contact.linkedinUrl,
            data: JSON.stringify(contact),
          },
        });
        results.push({ crmId: contact.crmId, success: true });
      } catch (e) {
        results.push({ crmId: contact.crmId, success: false });
      }
    }

    console.log(`Updated ${results.filter(r => r.success).length}/${results.length} contacts`);
    res.json({ results });
  } catch (error) {
    console.error('Error updating contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /contacts/sync - Sync contacts (find existing by externalId)
app.post('/contacts/sync', async (req, res) => {
  try {
    const { contacts } = req.body;
    const results = [];

    for (const contact of contacts) {
      const existing = await prisma.contact.findUnique({
        where: { externalId: contact.externalId },
      });

      if (existing) {
        results.push({
          externalId: contact.externalId,
          crmId: existing.id,
          properties: existing.data ? JSON.parse(existing.data) : {},
        });
      }
    }

    console.log(`Synced contacts: ${results.length}/${contacts.length} found`);
    res.json({ results });
  } catch (error) {
    console.error('Error syncing contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /contacts/batch - Fetch contacts by CRM IDs
app.post('/contacts/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    const contacts = await prisma.contact.findMany({
      where: { id: { in: ids } },
    });

    const results = contacts.map(c => ({
      id: c.id,
      externalId: c.externalId,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      company: c.company,
      title: c.title,
      linkedinUrl: c.linkedinUrl,
      properties: c.data ? JSON.parse(c.data) : {},
    }));

    console.log(`Batch fetch contacts: ${results.length}/${ids.length} found`);
    res.json({ results });
  } catch (error) {
    console.error('Error batch fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============== COMPANIES ==============

// POST /companies - Create companies
app.post('/companies', async (req, res) => {
  try {
    const { companies } = req.body;
    const results = [];

    for (const company of companies) {
      const created = await prisma.company.create({
        data: {
          externalId: company.externalId,
          name: company.name,
          domain: company.domain,
          industry: company.industry,
          data: JSON.stringify(company),
        },
      });
      results.push({ externalId: company.externalId, crmId: created.id });
    }

    console.log(`Created ${results.length} companies`);
    res.json({ results });
  } catch (error) {
    console.error('Error creating companies:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /companies - Update companies
app.put('/companies', async (req, res) => {
  try {
    const { companies } = req.body;
    const results = [];

    for (const company of companies) {
      try {
        await prisma.company.update({
          where: { id: company.crmId },
          data: {
            name: company.name,
            domain: company.domain,
            industry: company.industry,
            data: JSON.stringify(company),
          },
        });
        results.push({ crmId: company.crmId, success: true });
      } catch (e) {
        results.push({ crmId: company.crmId, success: false });
      }
    }

    console.log(`Updated ${results.filter(r => r.success).length}/${results.length} companies`);
    res.json({ results });
  } catch (error) {
    console.error('Error updating companies:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /companies/sync - Sync companies (find existing by externalId)
app.post('/companies/sync', async (req, res) => {
  try {
    const { companies } = req.body;
    const results = [];

    for (const company of companies) {
      const existing = await prisma.company.findUnique({
        where: { externalId: company.externalId },
      });

      if (existing) {
        results.push({
          externalId: company.externalId,
          crmId: existing.id,
          properties: existing.data ? JSON.parse(existing.data) : {},
        });
      }
    }

    console.log(`Synced companies: ${results.length}/${companies.length} found`);
    res.json({ results });
  } catch (error) {
    console.error('Error syncing companies:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /companies/batch - Fetch companies by CRM IDs
app.post('/companies/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    const companies = await prisma.company.findMany({
      where: { id: { in: ids } },
    });

    const results = companies.map(c => ({
      id: c.id,
      externalId: c.externalId,
      name: c.name,
      domain: c.domain,
      industry: c.industry,
      properties: c.data ? JSON.parse(c.data) : {},
    }));

    console.log(`Batch fetch companies: ${results.length}/${ids.length} found`);
    res.json({ results });
  } catch (error) {
    console.error('Error batch fetching companies:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============== ASSOCIATIONS ==============

// POST /associations - Create associations
app.post('/associations', async (req, res) => {
  try {
    const { associations } = req.body;

    for (const assoc of associations) {
      await prisma.association.upsert({
        where: {
          contactId_companyId: {
            contactId: assoc.contactCRMId,
            companyId: assoc.companyCRMId,
          },
        },
        update: {},
        create: {
          contactId: assoc.contactCRMId,
          companyId: assoc.companyCRMId,
        },
      });
    }

    console.log(`Created ${associations.length} associations`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating associations:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============== TASKS ==============

// POST /tasks - Create task
app.post('/tasks', async (req, res) => {
  try {
    const task = await prisma.task.create({
      data: {
        subject: req.body.subject,
        description: req.body.description,
        type: req.body.type,
        ownerId: req.body.ownerId,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        contactId: req.body.contactId,
        companyId: req.body.companyId,
      },
    });
    console.log(`Created task: ${task.id}`);
    res.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /tasks/:id - Get task
app.get('/tasks/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /tasks/:id - Update task
app.patch('/tasks/:id', async (req, res) => {
  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        completed: req.body.completed,
        completedAt: req.body.completed ? new Date() : null,
      },
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /tasks/batch - Get multiple tasks
app.post('/tasks/batch', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { id: { in: req.body.ids } },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /tasks/batch - Complete multiple tasks
app.patch('/tasks/batch', async (req, res) => {
  try {
    await prisma.task.updateMany({
      where: { id: { in: req.body.ids } },
      data: {
        completed: req.body.completed,
        completedAt: req.body.completed ? new Date() : null,
      },
    });
    const tasks = await prisma.task.findMany({
      where: { id: { in: req.body.ids } },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== ACTIVITIES ==============

// POST /activities - Create activity
app.post('/activities', async (req, res) => {
  try {
    const activity = await prisma.activity.create({
      data: {
        type: req.body.type,
        subject: req.body.subject,
        body: req.body.body,
        direction: req.body.direction,
        ownerId: req.body.ownerId,
        occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : null,
        contactId: req.body.contactId,
        companyId: req.body.companyId,
        metadata: req.body.metadata ? JSON.stringify(req.body.metadata) : null,
      },
    });
    console.log(`Created activity: ${activity.id} (${activity.type})`);
    res.json(activity);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /activities/:id - Get activity
app.get('/activities/:id', async (req, res) => {
  try {
    const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== UI/DEBUG ENDPOINTS ==============

app.get('/api/contacts', async (req, res) => {
  const contacts = await prisma.contact.findMany({
    include: { associations: { include: { company: true } } },
  });
  res.json(contacts);
});

app.get('/api/companies', async (req, res) => {
  const companies = await prisma.company.findMany({
    include: { associations: { include: { contact: true } } },
  });
  res.json(companies);
});

app.get('/api/tasks', async (req, res) => {
  const tasks = await prisma.task.findMany();
  res.json(tasks);
});

app.get('/api/activities', async (req, res) => {
  const activities = await prisma.activity.findMany({
    orderBy: { occurredAt: 'desc' },
  });
  res.json(activities);
});

app.delete('/api/reset', async (req, res) => {
  await prisma.association.deleteMany();
  await prisma.task.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  console.log('Database reset');
  res.json({ success: true });
});

app.get('/api/config', (req, res) => {
  res.json({
    apiKey: API_KEY,
    apiKeyHeader: API_KEY_HEADER,
    contactLinkTemplate: CONTACT_LINK_TEMPLATE,
    companyLinkTemplate: COMPANY_LINK_TEMPLATE,
  });
});

// ============== VIEW PAGES (for CRM record links) ==============

// GET /view/contact/:id - View a contact record
app.get('/view/contact/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: { associations: { include: { company: true } } },
    });

    if (!contact) {
      return res.status(404).send('<h1>Contact not found</h1>');
    }

    const activities = await prisma.activity.findMany({
      where: { contactId: req.params.id },
      orderBy: { occurredAt: 'desc' },
    });

    const data = contact.data ? JSON.parse(contact.data) : {};

    const activitiesHtml = activities.length ? `
      <h3>Activities (${activities.length})</h3>
      <div class="activities">
        ${activities.map(a => `
          <div class="activity ${a.direction === 'INBOUND' ? 'inbound' : 'outbound'}">
            <div class="activity-header">
              <span class="activity-type">${a.type}</span>
              <span class="activity-direction">${a.direction || '-'}</span>
              <span class="activity-date">${a.occurredAt ? new Date(a.occurredAt).toLocaleString() : '-'}</span>
            </div>
            <div class="activity-subject">${a.subject || '-'}</div>
            <div class="activity-body">${a.body || ''}</div>
          </div>
        `).join('')}
      </div>
    ` : '<h3>Activities</h3><p>No activities yet.</p>';

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Contact: ${contact.firstName || ''} ${contact.lastName || ''}</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { color: #333; }
          .field { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          .label { font-weight: bold; color: #666; }
          .value { color: #333; }
          .back { margin-top: 20px; }
          a { color: #007bff; }
          pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; overflow: auto; }
          .activities { margin-top: 10px; }
          .activity { margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #ccc; background: #fafafa; }
          .activity.outbound { border-left-color: #28a745; background: #f0fff4; }
          .activity.inbound { border-left-color: #007bff; background: #f0f8ff; }
          .activity-header { display: flex; gap: 10px; margin-bottom: 8px; font-size: 0.85em; }
          .activity-type { font-weight: bold; background: #e9ecef; padding: 2px 8px; border-radius: 4px; }
          .activity-direction { color: #666; }
          .activity-date { color: #999; margin-left: auto; }
          .activity-subject { font-weight: 600; margin-bottom: 5px; }
          .activity-body { color: #555; font-size: 0.95em; white-space: pre-wrap; max-height: 200px; overflow: auto; }
        </style>
      </head>
      <body>
        <h1>Contact Record</h1>
        <div class="field"><span class="label">CRM ID:</span> <span class="value">${contact.id}</span></div>
        <div class="field"><span class="label">External ID:</span> <span class="value">${contact.externalId}</span></div>
        <div class="field"><span class="label">Name:</span> <span class="value">${contact.firstName || ''} ${contact.lastName || ''}</span></div>
        <div class="field"><span class="label">Email:</span> <span class="value">${contact.email || '-'}</span></div>
        <div class="field"><span class="label">Phone:</span> <span class="value">${contact.phone || '-'}</span></div>
        <div class="field"><span class="label">Company:</span> <span class="value">${contact.company || '-'}</span></div>
        <div class="field"><span class="label">Title:</span> <span class="value">${contact.title || '-'}</span></div>
        <div class="field"><span class="label">LinkedIn:</span> <span class="value">${contact.linkedinUrl ? `<a href="${contact.linkedinUrl}" target="_blank">${contact.linkedinUrl}</a>` : '-'}</span></div>
        ${contact.associations.length ? `<div class="field"><span class="label">Associated Companies:</span> <span class="value">${contact.associations.map(a => `<a href="/view/company/${a.company.id}">${a.company.name || a.company.id}</a>`).join(', ')}</span></div>` : ''}
        ${activitiesHtml}
        <h3>All Data</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
        <div class="back"><a href="/">← Back to Dashboard</a></div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error: ${error.message}</h1>`);
  }
});

// GET /view/company/:id - View a company record
app.get('/view/company/:id', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: { associations: { include: { contact: true } } },
    });

    if (!company) {
      return res.status(404).send('<h1>Company not found</h1>');
    }

    const activities = await prisma.activity.findMany({
      where: { companyId: req.params.id },
      orderBy: { occurredAt: 'desc' },
    });

    const data = company.data ? JSON.parse(company.data) : {};

    const activitiesHtml = activities.length ? `
      <h3>Activities (${activities.length})</h3>
      <div class="activities">
        ${activities.map(a => `
          <div class="activity ${a.direction === 'INBOUND' ? 'inbound' : 'outbound'}">
            <div class="activity-header">
              <span class="activity-type">${a.type}</span>
              <span class="activity-direction">${a.direction || '-'}</span>
              <span class="activity-date">${a.occurredAt ? new Date(a.occurredAt).toLocaleString() : '-'}</span>
            </div>
            <div class="activity-subject">${a.subject || '-'}</div>
            <div class="activity-body">${a.body || ''}</div>
          </div>
        `).join('')}
      </div>
    ` : '<h3>Activities</h3><p>No activities yet.</p>';

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Company: ${company.name || 'Unknown'}</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { color: #333; }
          .field { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          .label { font-weight: bold; color: #666; }
          .value { color: #333; }
          .back { margin-top: 20px; }
          a { color: #007bff; }
          pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; overflow: auto; }
          .activities { margin-top: 10px; }
          .activity { margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #ccc; background: #fafafa; }
          .activity.outbound { border-left-color: #28a745; background: #f0fff4; }
          .activity.inbound { border-left-color: #007bff; background: #f0f8ff; }
          .activity-header { display: flex; gap: 10px; margin-bottom: 8px; font-size: 0.85em; }
          .activity-type { font-weight: bold; background: #e9ecef; padding: 2px 8px; border-radius: 4px; }
          .activity-direction { color: #666; }
          .activity-date { color: #999; margin-left: auto; }
          .activity-subject { font-weight: 600; margin-bottom: 5px; }
          .activity-body { color: #555; font-size: 0.95em; white-space: pre-wrap; max-height: 200px; overflow: auto; }
        </style>
      </head>
      <body>
        <h1>Company Record</h1>
        <div class="field"><span class="label">CRM ID:</span> <span class="value">${company.id}</span></div>
        <div class="field"><span class="label">External ID:</span> <span class="value">${company.externalId}</span></div>
        <div class="field"><span class="label">Name:</span> <span class="value">${company.name || '-'}</span></div>
        <div class="field"><span class="label">Domain:</span> <span class="value">${company.domain ? `<a href="https://${company.domain}" target="_blank">${company.domain}</a>` : '-'}</span></div>
        <div class="field"><span class="label">Industry:</span> <span class="value">${company.industry || '-'}</span></div>
        ${company.associations.length ? `<div class="field"><span class="label">Associated Contacts:</span> <span class="value">${company.associations.map(a => `<a href="/view/contact/${a.contact.id}">${a.contact.firstName || ''} ${a.contact.lastName || a.contact.id}</a>`).join(', ')}</span></div>` : ''}
        ${activitiesHtml}
        <h3>All Data</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
        <div class="back"><a href="/">← Back to Dashboard</a></div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error: ${error.message}</h1>`);
  }
});

const PORT = process.env.PORT || 3456;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\n==========================================`);
  console.log(`Custom CRM Test Server`);
  console.log(`==========================================`);
  console.log(`Listening on: http://${HOST}:${PORT}`);
  console.log(`Local URL:    http://localhost:${PORT}`);
  console.log(`\nAPI Key:      ${API_KEY}`);
  console.log(`API Header:   ${API_KEY_HEADER}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health           - Health check`);
  console.log(`  POST /contacts         - Create contacts`);
  console.log(`  PUT  /contacts         - Update contacts`);
  console.log(`  POST /contacts/sync    - Sync contacts (by externalId)`);
  console.log(`  POST /contacts/batch   - Fetch contacts (by crmId)`);
  console.log(`  POST /companies        - Create companies`);
  console.log(`  PUT  /companies        - Update companies`);
  console.log(`  POST /companies/sync   - Sync companies (by externalId)`);
  console.log(`  POST /companies/batch  - Fetch companies (by crmId)`);
  console.log(`  POST /associations     - Create associations`);
  console.log(`  POST /tasks            - Create task`);
  console.log(`  POST /activities       - Create activity`);
  console.log(`==========================================\n`);
});
