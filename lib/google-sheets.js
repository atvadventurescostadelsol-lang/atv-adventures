import { google } from 'googleapis';

let sheetsClient = null;
let driveClient = null;

export function getGoogleAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
  return auth;
}

export async function getSheetsClient() {
  if (!sheetsClient) {
    const auth = getGoogleAuth();
    sheetsClient = google.sheets({ version: 'v4', auth });
  }
  return sheetsClient;
}

export async function getDriveClient() {
  if (!driveClient) {
    const auth = getGoogleAuth();
    driveClient = google.drive({ version: 'v3', auth });
  }
  return driveClient;
}

export async function getSheetData(spreadsheetId, range) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values || [];
}

export async function appendSheetData(spreadsheetId, range, values) {
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

export async function updateSheetData(spreadsheetId, range, values) {
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

export async function batchUpdateSheetData(spreadsheetId, data) {
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

export async function clearSheetData(spreadsheetId, range) {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });
  return response.data;
}

export function parseSheetToObjects(data) {
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

export function objectsToSheetRows(objects, headers) {
  return objects.map(obj => headers.map(header => obj[header] || ''));
}
