const { getSheetData, updateSheetData } = require('./google-sheets');

/**
 * Convert column number to letter (1=A, 26=Z, 27=AA, etc.)
 */
function columnToLetter(column) {
  let letter = '';
  while (column > 0) {
    const mod = (column - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    column = Math.floor((column - 1) / 26);
  }
  return letter;
}

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
    const numColumns = values[0].length;
    const endColumn = columnToLetter(numColumns);
    const targetRange = `${sheetName}!A${nextRow}:${endColumn}${nextRow}`;
    
    console.log(`SafeAppend: Writing ${numColumns} columns to ${targetRange}`);
    
    // Use update instead of append
    return await updateSheetData(spreadsheetId, targetRange, values);
  } catch (error) {
    console.error('SafeAppend error:', error);
    throw error;
  }
}

module.exports = { safeAppendSheetData };
