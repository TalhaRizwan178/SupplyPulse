const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const User = require('../models/User');

const { seedStockIfEmpty } = require('./stockSimulator');
const { seedSuppliers } = require('../controllers/supplierController');
const { seedCrisisData } = require('../controllers/crisisController');
const { seedExecutionData } = require('../controllers/executionController');
const { seedDashboardData } = require('../controllers/dashboardController');
const { seedDataSources } = require('./seedDataSources');
const { seedMockData } = require('../controllers/dataController');

async function migrateToMultiTenant() {
  console.log('[Migration] Starting Multi-Tenant Migration & Seeding Service...');
  try {
    // 1. Ensure at least one default organization exists
    let defaultOrg = await Organization.findOne({ name: 'Default DistCo' });
    if (!defaultOrg) {
      defaultOrg = new Organization({
        name: 'Default DistCo',
        businessEmail: 'skillspherefyp@gmail.com',
      });
      await defaultOrg.save();
      console.log(`[Migration] Created default organization: "${defaultOrg.name}" (${defaultOrg._id})`);
    }

    const defaultOrgId = defaultOrg._id;

    // 2. Ensure Super Admin user exists and is associated with Default DistCo
    const adminEmail = (process.env.SUPER_ADMIN_EMAIL || 'skillspherefyp@gmail.com').toLowerCase().trim();
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = new User({
        organizationId: defaultOrgId,
        fullName: 'Super Admin',
        email: adminEmail,
        password: process.env.SUPER_ADMIN_PASSWORD || 'skillsphere@123',
        role: 'admin',
      });
      await adminUser.save();
      console.log(`[Migration] Created default admin user: ${adminEmail}`);
    } else if (!adminUser.organizationId) {
      adminUser.organizationId = defaultOrgId;
      await adminUser.save();
      console.log(`[Migration] Updated existing admin user ${adminEmail} to belong to default organization`);
    }

    // 3. Migrate any legacy documents in Mongoose collections that do not have organizationId
    const modelsToMigrate = [
      { name: 'User', model: require('../models/User') },
      { name: 'StockLevel', model: require('../models/StockLevel') },
      { name: 'PendingTrigger', model: require('../models/PendingTrigger') },
      { name: 'Trace', model: require('../models/index').Trace },
      { name: 'ActionChain', model: require('../models/index').ActionChain },
      { name: 'Crisis', model: require('../models/DataModels').Crisis },
      { name: 'Source', model: require('../models/DataModels').Source },
      { name: 'Contradiction', model: require('../models/DataModels').Contradiction },
      { name: 'Outcome', model: require('../models/DataModels').Outcome },
      { name: 'DashboardMetric', model: require('../models/DataModels').DashboardMetric },
      { name: 'Supplier', model: require('../models/DataModels').Supplier },
      { name: 'WarehouseItem', model: require('../models/DataSources').WarehouseItem },
      { name: 'PosOutlet', model: require('../models/DataSources').PosOutlet },
      { name: 'PosSkuSummary', model: require('../models/DataSources').PosSkuSummary },
      { name: 'SupplierEmailThread', model: require('../models/DataSources').SupplierEmailThread },
      { name: 'Complaint', model: require('../models/DataSources').Complaint },
      { name: 'ComplaintSummary', model: require('../models/DataSources').ComplaintSummary },
      { name: 'NewsArticle', model: require('../models/DataSources').NewsArticle },
      { name: 'FeedMeta', model: require('../models/DataSources').FeedMeta },
      { name: 'SystemSetting', model: require('../models/SystemSetting') }
    ];

    for (const entry of modelsToMigrate) {
      try {
        const result = await entry.model.updateMany(
          { organizationId: { $exists: false } },
          { $set: { organizationId: defaultOrgId } }
        );
        if (result.modifiedCount > 0) {
          console.log(`[Migration] Scoped ${result.modifiedCount} legacy records in ${entry.name} to default org`);
        }
      } catch (err) {
        console.error(`[Migration] Failed to migrate ${entry.name}:`, err.message);
      }
    }

    // 4. Run seeding for the default organization
    console.log(`[Migration] Running organization-specific seeding for default organization: ${defaultOrgId}`);
    await seedStockIfEmpty(defaultOrgId);
    await seedSuppliers(defaultOrgId);
    await seedCrisisData(defaultOrgId);
    await seedExecutionData(defaultOrgId);
    await seedDashboardData(defaultOrgId);
    await seedDataSources(defaultOrgId);
    await seedMockData(defaultOrgId);

    console.log('[Migration] Migration & Seeding complete.');
  } catch (err) {
    console.error('[Migration] Critical migration failure:', err.message);
  }
}

module.exports = migrateToMultiTenant;
