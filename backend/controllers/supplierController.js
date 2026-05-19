const { Supplier } = require('../models/DataModels');
const path = require('path');
const fs   = require('fs');

// ── Simple CSV parser (handles quoted fields with commas inside) ───────────────
function parseCSV(text) {
  const lines = text.replace(/\r/g, '').trim().split('\n');
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase().trim());

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim(); });
    return obj;
  });
}

function splitCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { values.push(current); current = ''; }
    else { current += ch; }
  }
  values.push(current);
  return values;
}

// POST /api/suppliers/upload  (multipart: file = CSV)
async function uploadSuppliers(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

    const text = req.file.buffer.toString('utf-8');
    const rows = parseCSV(text);

    if (!rows.length) return res.status(400).json({ error: 'CSV is empty or malformed' });

    // Validate required columns
    const required = ['supplier_name', 'email'];
    const missing = required.filter(c => !(c in rows[0]));
    if (missing.length) {
      return res.status(400).json({
        error: `Missing columns: ${missing.join(', ')}`,
        hint: 'Required: supplier_name, email, phone (optional), products (comma-separated SKUs)',
      });
    }

    let upserted = 0, skipped = 0;
    for (const row of rows) {
      const email = row.email?.toLowerCase().trim();
      if (!email) { skipped++; continue; }

      // products column: "LAYS-MAS-70,LAYS-FRENCH-70" → array
      const products = (row.products || '')
        .split(',')
        .map(p => p.trim().toUpperCase())
        .filter(Boolean);

      await Supplier.findOneAndUpdate(
        { email, organizationId: req.user.organizationId },
        {
          organizationId: req.user.organizationId,
          name:       row.supplier_name || row.name || email,
          email,
          phone:      row.phone || '',
          products,
          uploadedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      upserted++;
    }

    res.json({ success: true, upserted, skipped, total: rows.length });
  } catch (err) {
    console.error('[Supplier Upload]', err.message);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/suppliers
async function getSuppliers(req, res) {
  try {
    const suppliers = await Supplier.find({ organizationId: req.user.organizationId }).sort({ uploadedAt: -1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/suppliers/:id
async function deleteSupplier(req, res) {
  try {
    await Supplier.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/suppliers/add  (single supplier, JSON body)
async function addSupplier(req, res) {
  try {
    const { name, email, phone, products } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });

    const emailLower = email.toLowerCase().trim();

    const existing = await Supplier.findOne({ email: emailLower, organizationId: req.user.organizationId });
    if (existing) return res.status(409).json({ error: `A supplier with email ${emailLower} already exists in your organization` });

    const productList = typeof products === 'string'
      ? products.split(',').map(p => p.trim().toUpperCase()).filter(Boolean)
      : (Array.isArray(products) ? products.map(p => String(p).trim().toUpperCase()).filter(Boolean) : []);

    const supplier = await Supplier.create({
      organizationId: req.user.organizationId,
      name: name.trim(), email: emailLower, phone: phone || '', products: productList, uploadedAt: new Date(),
    });

    res.json({ success: true, supplier });
  } catch (err) {
    console.error('[Supplier Add]', err.message);
    res.status(500).json({ error: err.message });
  }
}

// Helper used by orchestrator: get suppliers that carry a given SKU
async function getSuppliersForSku(sku, organizationId) {
  return Supplier.find({ products: sku.toUpperCase(), organizationId });
}

// Seed from data/suppliers.csv if DB is empty for this org
async function seedSuppliers(orgId) {
  const count = await Supplier.countDocuments({ organizationId: orgId });
  if (count > 0) return;
  const csvPath = path.join(__dirname, '../data/suppliers.csv');
  if (!fs.existsSync(csvPath)) return;
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf-8'));
  for (const row of rows) {
    const email = row.email?.toLowerCase().trim();
    if (!email) continue;
    const products = (row.products || '').split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
    await Supplier.findOneAndUpdate(
      { email, organizationId: orgId },
      { organizationId: orgId, name: row.supplier_name || email, email, phone: row.phone || '', products, uploadedAt: new Date() },
      { upsert: true, new: true }
    );
  }
  console.log(`[Suppliers] Seeded for org: ${orgId}`);
}

module.exports = { uploadSuppliers, getSuppliers, deleteSupplier, addSupplier, getSuppliersForSku, seedSuppliers };
