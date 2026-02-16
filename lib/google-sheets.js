const { google } = require('googleapis');

let sheetsClient = null;
let driveClient = null;
let authClient = null;

function getGoogleAuth() {
  if (authClient) return authClient;
  
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('GOOGLE_PRIVATE_KEY not found in environment');
  }
  
  const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key: privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    client_id: '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  };

  authClient = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
  return authClient;
}

async function getSheetsClient() {
  if (!sheetsClient) {
    const auth = getGoogleAuth();
    sheetsClient = google.sheets({ version: 'v4', auth });
  }
  return sheetsClient;
}

async function getDriveClient() {
  if (!driveClient) {
    const auth = getGoogleAuth();
    driveClient = google.drive({ version: 'v3', auth });
  }
  return driveClient;
}

async function getSheetData(spreadsheetId, range) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values || [];
}

async function appendSheetData(spreadsheetId, range, values) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
  return response.data;
}

async function updateSheetData(spreadsheetId, range, values) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
  return response.data;
}

async function batchUpdateSheetData(spreadsheetId, data) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });
  return response.data;
}

async function clearSheetData(spreadsheetId, range) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });
  return response.data;
}

function parseSheetToObjects(data) {
  if (!data || data.length === 0) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}

function objectsToSheetRows(objects, headers) {
  return objects.map(obj => headers.map(header => obj[header] || ''));
}

module.exports = {
  getGoogleAuth,
  getSheetsClient,
  getDriveClient,
  getSheetData,
  appendSheetData,
  updateSheetData,
  batchUpdateSheetData,
  clearSheetData,
  parseSheetToObjects,
  objectsToSheetRows,
};
