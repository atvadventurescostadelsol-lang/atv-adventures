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
 * Find the first truly empty row (where column A is empty)
 * This handles sheets that have "deleted" rows (rows cleared but not removed)
 */
async function findFirstEmptyRow(spreadsheetId, sheetName, numColumns) {
  try {
    // Get all data up to column specified
    const endColumn = columnToLetter(numColumns);
    const range = `${sheetName}!A:${endColumn}`;
    const existingData = await getSheetData(spreadsheetId, range);
    
    // Find first row where column A is empty (skip header at row 0)
    for (let i = 1; i < existingData.length; i++) {
      const row = existingData[i];
      // Row is empty if it doesn't exist, or first cell (ID column) is empty
      if (!row || !row[0] || row[0].toString().trim() === '') {
        return i + 1; // Convert to 1-based row number
      }
    }
    
    // No empty rows found, append at the end
    return existingData.length + 1;
  } catch (error) {
    console.error('Error finding empty row:', error);
    throw error;
  }
}

/**
 * Append data to sheet by finding the next empty row manually
 * This is more reliable than using Google Sheets append API
 * It properly handles sheets with "deleted" rows (cleared but not removed)
 */
async function safeAppendSheetData(spreadsheetId, sheetName, values) {
  try {
    const numColumns = values[0].length;
    
    // Find the first truly empty row
    const nextRow = await findFirstEmptyRow(spreadsheetId, sheetName, numColumns);
    
    // Determine the column range based on values length
    const endColumn = columnToLetter(numColumns);
    const targetRange = `${sheetName}!A${nextRow}:${endColumn}${nextRow}`;
    
    console.log(`SafeAppend: Writing ${numColumns} columns to row ${nextRow} (${targetRange})`);
    
    // Use update instead of append - this writes to exact position
    return await updateSheetData(spreadsheetId, targetRange, values);
  } catch (error) {
    console.error('SafeAppend error:', error);
    throw error;
  }
}

module.exports = { safeAppendSheetData, findFirstEmptyRow };
