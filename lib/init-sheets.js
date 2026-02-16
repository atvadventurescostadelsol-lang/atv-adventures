import { google } from 'googleapis';
import { getGoogleAuth } from './google-sheets.js';

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

export async function initializeGoogleSheet() {
  try {
    console.log('Initializing Google Sheet...');
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Create new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `ATV Operations Control - ${new Date().toISOString()}`,
        },
        sheets: Object.keys(SHEET_STRUCTURES).map(sheetName => ({
          properties: {
            title: sheetName,
          },
        })),
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    console.log(`Created spreadsheet: ${spreadsheetId}`);

    // Add headers to each sheet
    const batchUpdateData = [];
    Object.entries(SHEET_STRUCTURES).forEach(([sheetName, headers]) => {
      batchUpdateData.push({
        range: `${sheetName}!A1`,
        values: [headers],
      });
    });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: batchUpdateData,
      },
    });

    console.log('Added headers to all sheets');

    // Add seed data
    for (const [sheetName, data] of Object.entries(SEED_DATA)) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data,
        },
      });
      console.log(`Added seed data to ${sheetName}`);
    }

    // Share with service account (already has access)
    // Make it viewable by anyone with link (optional)
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'anyone',
      },
    });

    console.log('Sheet initialized successfully!');
    console.log(`Spreadsheet ID: ${spreadsheetId}`);
    console.log(`URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);

    return {
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    };
  } catch (error) {
    console.error('Error initializing Google Sheet:', error);
    throw error;
  }
}
