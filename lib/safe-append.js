const { getSheetData, updateSheetData } = require('./google-sheets');

/**
 * Append data to sheet by finding the next empty row manually
 * This is more reliable than using Google Sheets append API
 */
async function safeAppendSheetData(spreadsheetId, sheetName, values) {
  try {
    // Get current data to find next empty row
    const range = `${sheetName}!A:A`;
    const existingData = await getSheetData(spreadsheetId, range);
    
    // Next row is length of existing data + 1
    const nextRow = existingData.length + 1;
    
    // Determine the column range based on values length
    const endColumn = String.fromCharCode(64 + values[0].length); // A=65, so 64+1=A
    const targetRange = `${sheetName}!A${nextRow}:${endColumn}${nextRow}`;
    
    console.log(`SafeAppend: Writing to ${targetRange}, row ${nextRow}`);
    
    // Use update instead of append
    return await updateSheetData(spreadsheetId, targetRange, values);
  } catch (error) {
    console.error('SafeAppend error:', error);
    throw error;
  }
}

module.exports = { safeAppendSheetData };
