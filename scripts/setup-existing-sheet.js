const { google } = require('googleapis');
require('dotenv').config();

const SHEET_STRUCTURES = {
  Departures: [
    'id', 'date', 'timeSlot', 'category', 'productId', 'productName',
    'vehiclesCount', 'groupLabel', 'notes', 'pricePerVehicleGross',
    'totalGross', 'vatRate', 'netBase', 'vatAmount', 'depositPercent',
    'depositAmount', 'depositPaid', 'depositPaidMethod', 'depositPaidDate',
    'remainingAmount', 'remainingPaid', 'remainingPaidMethod', 'remainingPaidDate',
    'salesChannel', 'expectedPayoutDate', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'
  ],
  Products: [
    'id', 'category', 'name', 'duration', 'basePrice', 'active', 'createdAt', 'updatedAt'
  ],
  TimeSlots: [
    'id', 'time', 'active', 'createdAt', 'updatedAt'
  ],
  Users: [
    'id', 'email', 'name', 'role', 'active', 'createdAt', 'lastLogin'
  ],
  AuditLog: [
    'id', 'timestamp', 'userId', 'userName', 'action', 'entityType',
    'entityId', 'changes', 'ipAddress'
  ],
  Capacity: [
    'id', 'category', 'maxVehicles', 'updatedAt', 'updatedBy'
  ],
  PricingRules: [
    'id', 'productId', 'productName', 'startDate', 'endDate',
    'overridePrice', 'active', 'createdAt', 'updatedAt'
  ]
};

const SEED_DATA = {
  Products: [
    ['1', 'quad', '1 hora', '1h', '40', 'true', new Date().toISOString(), new Date().toISOString()],
    ['2', 'quad', '2 horas', '2h', '70', 'true', new Date().toISOString(), new Date().toISOString()],
    ['3', 'quad', '3 horas', '3h', '95', 'true', new Date().toISOString(), new Date().toISOString()],
    ['4', 'quad', 'Tour Sunset', 'sunset', '85', 'true', new Date().toISOString(), new Date().toISOString()],
    ['5', 'buggy', '1 hora', '1h', '60', 'true', new Date().toISOString(), new Date().toISOString()],
    ['6', 'buggy', '2 horas', '2h', '100', 'true', new Date().toISOString(), new Date().toISOString()],
    ['7', 'buggy', '3 horas', '3h', '135', 'true', new Date().toISOString(), new Date().toISOString()],
    ['8', 'buggy', 'Tour Sunset', 'sunset', '110', 'true', new Date().toISOString(), new Date().toISOString()],
  ],
  TimeSlots: [
    ['1', '10:00', 'true', new Date().toISOString(), new Date().toISOString()],
    ['2', '13:00', 'true', new Date().toISOString(), new Date().toISOString()],
    ['3', '16:00', 'true', new Date().toISOString(), new Date().toISOString()],
    ['4', '18:00', 'true', new Date().toISOString(), new Date().toISOString()],
  ],
  Capacity: [
    ['1', 'quad', '10', new Date().toISOString(), 'system'],
    ['2', 'buggy', '6', new Date().toISOString(), 'system'],
  ],
};

async function setupSheet() {
  try {
    console.log('🚀 Setting up Google Sheet...');

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not found in .env');
    }

    console.log(`📄 Sheet ID: ${spreadsheetId}`);

    // Load private key from .env
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
    
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key: privateKey,
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      client_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    };

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get existing sheets
    console.log('📋 Getting existing sheets...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
    console.log(`  Found: ${existingSheets.join(', ')}`);

    // Create missing sheets
    console.log('➕ Creating missing sheets...');
    const requests = [];
    
    for (const sheetName of Object.keys(SHEET_STRUCTURES)) {
      if (!existingSheets.includes(sheetName)) {
        requests.push({
          addSheet: {
            properties: {
              title: sheetName,
            },
          },
        });
        console.log(`  Will create: ${sheetName}`);
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests,
        },
      });
      console.log(`✅ Created ${requests.length} new sheets`);
    } else {
      console.log('✅ All sheets already exist');
    }

    // Add headers to each sheet
    console.log('📝 Adding headers...');
    const batchUpdateData = [];
    
    for (const [sheetName, headers] of Object.entries(SHEET_STRUCTURES)) {
      batchUpdateData.push({
        range: `${sheetName}!A1`,
        values: [headers],
      });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: batchUpdateData,
      },
    });

    console.log('✅ Added headers to all sheets');

    // Add seed data
    console.log('🌱 Adding seed data...');
    for (const [sheetName, data] of Object.entries(SEED_DATA)) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data,
        },
      });
      console.log(`  ✅ Added seed data to ${sheetName}`);
    }

    console.log('\n🎉 Sheet setup complete!');
    console.log(`🔗 URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);

    return {
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    };
  } catch (error) {
    console.error('❌ Error setting up Google Sheet:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupSheet()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupSheet };
