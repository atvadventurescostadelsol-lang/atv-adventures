import { NextResponse } from 'next/server';
const { initializeGoogleSheet } = require('@/lib/init-sheets');
const {
  getSheetData,
  appendSheetData,
  updateSheetData,
  batchUpdateSheetData,
  parseSheetToObjects,
  objectsToSheetRows,
} = require('@/lib/google-sheets');
const { safeAppendSheetData } = require('@/lib/safe-append');
import { v4 as uuidv4 } from 'uuid';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Helper to parse numbers that may use comma as decimal separator (Spanish format)
function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  // Convert string, replace comma with period for parsing
  const strValue = String(value).replace(',', '.');
  const parsed = parseFloat(strValue);
  return isNaN(parsed) ? 0 : parsed;
}

// Helper to add audit log
async function addAuditLog(action, entityType, entityId, changes, userId = 'system', userName = 'System') {
  try {
    const logEntry = [
      uuidv4(),
      new Date().toISOString(),
      userId,
      userName,
      action,
      entityType,
      entityId,
      JSON.stringify(changes),
      'N/A'
    ];
    await appendSheetData(SPREADSHEET_ID, 'AuditLog!A:I', [logEntry]);
  } catch (error) {
    console.error('Error adding audit log:', error);
  }
}

// Calculate financial values with proper decimal precision
function calculateFinancials(vehiclesCount, pricePerVehicle, depositPercent = 0.20) {
  const totalGross = vehiclesCount * pricePerVehicle;
  const vatRate = 0.21;
  // IVA calculation: totalGross = netBase * (1 + vatRate)
  // So: netBase = totalGross / (1 + vatRate)
  const netBase = totalGross / (1 + vatRate);
  const vatAmount = totalGross - netBase;
  const depositAmount = totalGross * depositPercent;
  const remainingAmount = totalGross - depositAmount;

  return {
    totalGross: parseFloat(totalGross.toFixed(2)),
    vatRate,
    netBase: parseFloat(netBase.toFixed(2)),
    vatAmount: parseFloat(vatAmount.toFixed(2)),
    depositAmount: parseFloat(depositAmount.toFixed(2)),
    remainingAmount: parseFloat(remainingAmount.toFixed(2)),
  };
}

// Calculate IVA2 (excluding cash payments) - IVA only on non-cash payments
function calculateIVA2(totalGross, cashAmount) {
  const vatRate = 0.21;
  const nonCashGross = totalGross - cashAmount;
  if (nonCashGross <= 0) return 0;
  const netBase = nonCashGross / (1 + vatRate);
  const vatAmount = nonCashGross - netBase;
  return parseFloat(vatAmount.toFixed(2));
}

// Calculate expected payout date
function calculatePayoutDate(salesChannel, date) {
  const departureDate = new Date(date);
  
  switch(salesChannel) {
    case 'gyg':
      // First 10 days of next month
      const nextMonth = new Date(departureDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(10);
      return nextMonth.toISOString().split('T')[0];
    
    case 'cruceros':
      // Approximately 30 days later
      const cruiseDate = new Date(departureDate);
      cruiseDate.setDate(cruiseDate.getDate() + 30);
      return cruiseDate.toISOString().split('T')[0];
    
    default:
      // Immediate (same day)
      return departureDate.toISOString().split('T')[0];
  }
}

// ==================== AUTH HANDLERS ====================

// Initialize Users sheet if it doesn't exist or has no users
async function ensureUsersSheet() {
  try {
    let data;
    try {
      data = await getSheetData(SPREADSHEET_ID, 'Users!A:E');
    } catch (e) {
      console.log('Users sheet might not exist, will create it');
      data = null;
    }
    
    // Check if we need to initialize - sheet doesn't exist or has only header or is empty
    const needsInit = !data || data.length === 0 || (data.length === 1 && data[0][0] === 'username');
    
    if (needsInit) {
      console.log('Initializing Users sheet with default users...');
      const headers = ['username', 'password', 'role', 'createdAt', 'lastLogin'];
      const initialUsers = [
        ['Zorrouad', '25592776', 'admin', new Date().toISOString(), ''],
        ['Jesus', 'GECA2023', 'user', new Date().toISOString(), ''],
        ['Charly', 'Sajer', 'user', new Date().toISOString(), ''],
        ['Laurence', 'Penacchio', 'user', new Date().toISOString(), '']
      ];
      
      // If sheet exists but is empty, just add data
      if (data && data.length > 0) {
        // Sheet has headers, just add users
        await appendSheetData(SPREADSHEET_ID, 'Users!A:E', initialUsers);
      } else {
        // Need to create or fully initialize
        try {
          await updateSheetData(SPREADSHEET_ID, 'Users!A1:E1', [headers]);
          await appendSheetData(SPREADSHEET_ID, 'Users!A:E', initialUsers);
        } catch (e) {
          // Sheet might not exist, try to create it
          const { getSheetsClient } = require('@/lib/google-sheets');
          const sheets = await getSheetsClient();
          
          try {
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: SPREADSHEET_ID,
              requestBody: {
                requests: [{
                  addSheet: {
                    properties: { title: 'Users' }
                  }
                }]
              }
            });
          } catch (sheetErr) {
            // Sheet might already exist
            console.log('Sheet creation error (might already exist):', sheetErr.message);
          }
          
          await updateSheetData(SPREADSHEET_ID, 'Users!A1:E1', [headers]);
          await appendSheetData(SPREADSHEET_ID, 'Users!A:E', initialUsers);
        }
      }
      console.log('Users sheet initialized with default users');
    }
    return true;
  } catch (error) {
    console.error('Error ensuring Users sheet:', error);
    return false;
  }
}

// Force initialize users (for setup endpoint)
async function forceInitUsers() {
  try {
    const { getSheetsClient } = require('@/lib/google-sheets');
    const sheets = await getSheetsClient();
    
    // Try to create the sheet first
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'Users' }
            }
          }]
        }
      });
      console.log('Users sheet created');
    } catch (e) {
      console.log('Users sheet already exists or error:', e.message);
    }
    
    const headers = ['username', 'password', 'role', 'createdAt', 'lastLogin'];
    const initialUsers = [
      ['Zorrouad', '25592776', 'admin', new Date().toISOString(), ''],
      ['Jesus', 'GECA2023', 'user', new Date().toISOString(), ''],
      ['Charly', 'Sajer', 'user', new Date().toISOString(), ''],
      ['Laurence', 'Penacchio', 'user', new Date().toISOString(), '']
    ];
    
    await updateSheetData(SPREADSHEET_ID, 'Users!A1:E1', [headers]);
    await appendSheetData(SPREADSHEET_ID, 'Users!A:E', initialUsers);
    
    return { success: true, message: 'Users initialized', users: 4 };
  } catch (error) {
    console.error('Force init users error:', error);
    return { success: false, error: error.message };
  }
}

// Auth: Login
async function handleLogin(body) {
  try {
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }
    
    await ensureUsersSheet();
    
    const data = await getSheetData(SPREADSHEET_ID, 'Users!A:E');
    const users = parseSheetToObjects(data);
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Update last login
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
      const now = new Date().toISOString();
      await updateSheetData(SPREADSHEET_ID, `Users!E${userIndex + 2}`, [[now]]);
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: username,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Auth: Change own password
async function handleChangePassword(body) {
  try {
    const { userId, currentPassword, newPassword } = body;
    
    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const data = await getSheetData(SPREADSHEET_ID, 'Users!A:E');
    const users = parseSheetToObjects(data);
    
    const userIndex = users.findIndex(u => u.username === userId);
    
    if (userIndex === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    const user = users[userIndex];
    
    if (user.password !== currentPassword) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 401 });
    }
    
    // Update password
    await updateSheetData(SPREADSHEET_ID, `Users!B${userIndex + 2}`, [[newPassword]]);
    
    await addAuditLog('PASSWORD_CHANGE', 'User', userId, { action: 'self_password_change' }, userId, userId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ==================== USER MANAGEMENT HANDLERS (Admin only) ====================

// Get all users
async function handleGetUsers() {
  try {
    await ensureUsersSheet();
    
    const data = await getSheetData(SPREADSHEET_ID, 'Users!A:E');
    const users = parseSheetToObjects(data);
    
    // Return users without passwords
    const safeUsers = users.map(u => ({
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin || null
    }));
    
    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create new user (Admin)
async function handleCreateUser(body) {
  try {
    const { username, password, role, adminUser } = body;
    
    if (!username || !password || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    
    const data = await getSheetData(SPREADSHEET_ID, 'Users!A:E');
    const users = parseSheetToObjects(data);
    
    // Check if username already exists
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 400 });
    }
    
    const now = new Date().toISOString();
    const newUser = [username, password, role, now, ''];
    
    await appendSheetData(SPREADSHEET_ID, 'Users!A:E', [newUser]);
    
    await addAuditLog('CREATE_USER', 'User', username, { role }, adminUser || 'admin', 'Admin');
    
    return NextResponse.json({
      success: true,
      user: {
        username,
        role,
        createdAt: now
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Delete user (Admin)
async function handleDeleteUser(username, adminUser) {
  try {
    if (!username) {
      return NextResponse.json({ success: false, error: 'Username required' }, { status: 400 });
    }
    
    const data = await getSheetData(SPREADSHEET_ID, 'Users!A:E');
    const users = parseSheetToObjects(data);
    
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    // Clear the row (soft delete)
    const headers = data[0];
    const emptyRow = headers.map(() => '');
    await updateSheetData(SPREADSHEET_ID, `Users!A${userIndex + 2}:E${userIndex + 2}`, [emptyRow]);
    
    await addAuditLog('DELETE_USER', 'User', username, { deleted: true }, adminUser || 'admin', 'Admin');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Reset user password (Admin)
async function handleResetPassword(body) {
  try {
    const { username, newPassword, adminUser } = body;
    
    if (!username || !newPassword) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const data = await getSheetData(SPREADSHEET_ID, 'Users!A:E');
    const users = parseSheetToObjects(data);
    
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    // Update password
    await updateSheetData(SPREADSHEET_ID, `Users!B${userIndex + 2}`, [[newPassword]]);
    
    await addAuditLog('RESET_PASSWORD', 'User', username, { action: 'admin_password_reset' }, adminUser || 'admin', 'Admin');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Collect payment (mark GYG or Cruise payment as collected and move to bank)
async function handleCollectPayment(body) {
  try {
    const { departureId, paymentType, collectionDate, amount } = body;
    
    if (!departureId || !paymentType || !collectionDate) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    if (paymentType !== 'gyg' && paymentType !== 'cruise') {
      return NextResponse.json({ success: false, error: 'Invalid payment type' }, { status: 400 });
    }
    
    // Get current departure data
    const data = await getSheetData(SPREADSHEET_ID, 'Departures!A:AT');
    const departures = parseSheetToObjects(data);
    const index = departures.findIndex(d => d.id === departureId);
    
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Departure not found' }, { status: 404 });
    }
    
    const departure = departures[index];
    const headers = data[0];
    
    // Calculate new values
    let updates = {};
    const currentBank = parseNumber(departure.paymentSplitBank);
    
    if (paymentType === 'gyg') {
      const gygAmount = parseNumber(departure.paymentSplitGyg);
      updates = {
        paymentSplitBank: (currentBank + gygAmount).toFixed(2),
        paymentSplitGyg: '0.00',
        gygCollected: 'true',
        gygCollectedDate: collectionDate
      };
    } else {
      const cruiseAmount = parseNumber(departure.paymentSplitCruise);
      updates = {
        paymentSplitBank: (currentBank + cruiseAmount).toFixed(2),
        paymentSplitCruise: '0.00',
        cruiseCollected: 'true',
        cruiseCollectedDate: collectionDate,
        isPendingCruise: 'false'
      };
    }
    
    // Apply updates
    const updatedDeparture = { ...departure, ...updates, updatedAt: new Date().toISOString() };
    
    // Build row data
    const rowData = headers.map(header => {
      if (updatedDeparture[header] !== undefined) {
        return updatedDeparture[header];
      }
      return departure[header] || '';
    });
    
    await updateSheetData(SPREADSHEET_ID, `Departures!A${index + 2}:AO${index + 2}`, [rowData]);
    
    await addAuditLog('COLLECT_PAYMENT', 'Departure', departureId, { 
      paymentType, 
      collectionDate, 
      amount,
      movedToBank: true 
    }, 'system', 'System');
    
    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error('Collect payment error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ==================== EXISTING HANDLERS ====================

// GET handlers
async function handleGet(request, path) {
  const { searchParams } = new URL(request.url);

  // Initialize users (force)
  if (path === 'init-users') {
    const result = await forceInitUsers();
    return NextResponse.json(result);
  }

  // Get all users (Admin)
  if (path === 'users') {
    return handleGetUsers();
  }

  // Initialize sheet
  if (path === 'init') {
    try {
      const result = await initializeGoogleSheet();
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update Departures headers to include new columns
  if (path === 'fix-headers') {
    try {
      const newHeaders = [
        'id', 'date', 'timeSlot', 'category', 'productId', 'productName',
        'vehiclesCount', 'groupLabel', 'notes', 'pricePerVehicleGross',
        'totalGross', 'vatRate', 'netBase', 'vatAmount', 'depositPercent',
        'depositAmount', 'depositPaid', 'depositPaidMethod', 'depositPaidDate',
        'remainingAmount', 'remainingPaid', 'remainingPaidMethod', 'remainingPaidDate',
        'salesChannel', 'expectedPayoutDate', 
        'paymentSplitWeb', 'paymentSplitCash', 'paymentSplitBank', 'paymentSplitGyg',
        'paymentSplitCruise', 'gygDiscount', 'isPendingCruise',
        'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 
        'commission', 'commissionMethod',
        'gygCollected', 'gygCollectedDate', 'cruiseCollected', 'cruiseCollectedDate'
      ];
      
      await updateSheetData(SPREADSHEET_ID, 'Departures!A1:AT1', [newHeaders]);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Headers updated successfully',
        columns: newHeaders.length
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Get all departures
  if (path === 'departures') {
    try {
      const data = await getSheetData(SPREADSHEET_ID, 'Departures!A:AT');
      const departures = parseSheetToObjects(data);
      
      // Apply filters
      const date = searchParams.get('date');
      const category = searchParams.get('category');
      const channel = searchParams.get('channel');
      
      let filtered = departures;
      if (date) filtered = filtered.filter(d => d.date === date);
      if (category) filtered = filtered.filter(d => d.category === category);
      if (channel) filtered = filtered.filter(d => d.salesChannel === channel);
      
      return NextResponse.json(filtered);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Get capacity for date/slot
  if (path === 'capacity') {
    try {
      const date = searchParams.get('date');
      const timeSlot = searchParams.get('timeSlot');
      const category = searchParams.get('category');

      if (!date || !timeSlot || !category) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
      }

      // Get capacity limits
      const capacityData = await getSheetData(SPREADSHEET_ID, 'Capacity!A:D');
      const capacities = parseSheetToObjects(capacityData);
      const capacityLimit = capacities.find(c => c.category === category);
      
      if (!capacityLimit) {
        return NextResponse.json({ error: 'Capacity not found' }, { status: 404 });
      }

      // Get existing departures for this slot
      const departuresData = await getSheetData(SPREADSHEET_ID, 'Departures!A:AT');
      const departures = parseSheetToObjects(departuresData);
      
      const existingDepartures = departures.filter(d => 
        d.date === date && 
        d.timeSlot === timeSlot && 
        d.category === category
      );

      const usedCapacity = existingDepartures.reduce((sum, d) => 
        sum + parseInt(d.vehiclesCount || 0), 0
      );

      const maxCapacity = parseInt(capacityLimit.maxVehicles);
      const available = maxCapacity - usedCapacity;

      return NextResponse.json({
        max: maxCapacity,
        used: usedCapacity,
        available,
        departures: existingDepartures,
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Get products
  if (path === 'products') {
    try {
      const data = await getSheetData(SPREADSHEET_ID, 'Products!A:H');
      const products = parseSheetToObjects(data);
      
      const category = searchParams.get('category');
      const filtered = category 
        ? products.filter(p => p.category === category && p.active.toLowerCase() === 'true')
        : products.filter(p => p.active.toLowerCase() === 'true');
      
      return NextResponse.json(filtered);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Get time slots
  if (path === 'timeslots') {
    try {
      const data = await getSheetData(SPREADSHEET_ID, 'TimeSlots!A:E');
      const slots = parseSheetToObjects(data);
      const active = slots.filter(s => s.active.toLowerCase() === 'true');
      return NextResponse.json(active);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Get pricing (with rules applied)
  if (path === 'pricing') {
    try {
      const productId = searchParams.get('productId');
      const date = searchParams.get('date');

      if (!productId) {
        return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
      }

      // Get product base price
      const productsData = await getSheetData(SPREADSHEET_ID, 'Products!A:H');
      const products = parseSheetToObjects(productsData);
      const product = products.find(p => p.id === productId);

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      let price = parseFloat(product.basePrice);

      // Check for pricing rules
      if (date) {
        const rulesData = await getSheetData(SPREADSHEET_ID, 'PricingRules!A:H');
        const rules = parseSheetToObjects(rulesData);
        
        const applicableRule = rules.find(r => 
          r.productId === productId &&
          r.active === 'true' &&
          date >= r.startDate &&
          date <= r.endDate
        );

        if (applicableRule) {
          price = parseFloat(applicableRule.overridePrice);
        }
      }

      return NextResponse.json({
        productId,
        productName: product.name,
        basePrice: parseFloat(product.basePrice),
        effectivePrice: price,
        date,
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Get dashboard stats
  if (path === 'dashboard') {
    try {
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
      
      // Read all columns including paymentSplitCruise, gygDiscount, isPendingCruise
      const departuresData = await getSheetData(SPREADSHEET_ID, 'Departures!A:AT');
      const departures = parseSheetToObjects(departuresData);
      
      const todayDepartures = departures.filter(d => d.date === date);

      const stats = {
        totalGross: 0,
        netBase: 0,
        vatAmount: 0,
        quadCount: 0,
        buggyCount: 0,
        cashTotal: 0,
        bankTotal: 0,
        webTotal: 0,
        gygTotal: 0,
        cruiseTotal: 0,
        depositsCollected: 0,
        remainingExpected: 0,
        commissionTotal: 0,
        departuresBySlot: {},
      };

      todayDepartures.forEach(d => {
        const gross = parseNumber(d.totalGross);
        // Calculate IVA with proper decimals
        const vatRate = 0.21;
        const net = gross / (1 + vatRate);
        const vat = gross - net;

        stats.totalGross += gross;
        stats.netBase += net;
        stats.vatAmount += vat;

        if (d.category === 'quad') {
          stats.quadCount += parseInt(d.vehiclesCount || 0);
        } else {
          stats.buggyCount += parseInt(d.vehiclesCount || 0);
        }

        // Accumulate payment splits (already saved with point decimal)
        stats.webTotal += parseNumber(d.paymentSplitWeb);
        stats.cashTotal += parseNumber(d.paymentSplitCash);
        stats.bankTotal += parseNumber(d.paymentSplitBank);
        stats.gygTotal += parseNumber(d.paymentSplitGyg);
        stats.cruiseTotal += parseNumber(d.paymentSplitCruise);
        
        // Accumulate commissions
        stats.commissionTotal += parseNumber(d.commission);

        // Group by time slot
        if (!stats.departuresBySlot[d.timeSlot]) {
          stats.departuresBySlot[d.timeSlot] = [];
        }
        stats.departuresBySlot[d.timeSlot].push(d);
      });

      return NextResponse.json({
        date,
        stats,
        departures: todayDepartures,
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Get audit log
  if (path === 'audit') {
    try {
      const data = await getSheetData(SPREADSHEET_ID, 'AuditLog!A:I');
      const logs = parseSheetToObjects(data);
      
      const limit = parseInt(searchParams.get('limit') || '100');
      const sorted = logs.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      ).slice(0, limit);
      
      return NextResponse.json(sorted);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Get product by ID
  if (path.startsWith('products/') && path.split('/').length === 2) {
    try {
      const productId = path.split('/')[1];
      const data = await getSheetData(SPREADSHEET_ID, 'Products!A:H');
      const products = parseSheetToObjects(data);
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      
      return NextResponse.json(product);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ message: 'ATV Operations API' });
}

// POST handlers
async function handlePost(request, path) {
  const body = await request.json();

  // Auth: Login
  if (path === 'auth/login') {
    return handleLogin(body);
  }

  // Auth: Change own password
  if (path === 'auth/change-password') {
    return handleChangePassword(body);
  }

  // Admin: Create user
  if (path === 'users') {
    return handleCreateUser(body);
  }

  // Admin: Reset user password
  if (path === 'users/reset-password') {
    return handleResetPassword(body);
  }

  // Collect payment (mark GYG or Cruise payment as collected)
  if (path === 'collect-payment') {
    return handleCollectPayment(body);
  }

  // Create single departure
  if (path === 'departures') {
    try {
      const {
        date,
        timeSlot,
        category,
        productId,
        vehiclesCount,
        groupLabel,
        notes,
        depositPercent,
        salesChannel,
        paymentSplit, // New: array of {method: 'web'|'cash'|'bank'|'gyg', percentage: 20}
        userId = 'system',
        userName = 'System',
      } = body;

      // Validate required fields
      if (!date || !timeSlot || !category || !productId || !vehiclesCount) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Check capacity
      const capacityUrl = new URL(request.url);
      capacityUrl.pathname = '/api/capacity';
      capacityUrl.searchParams.set('date', date);
      capacityUrl.searchParams.set('timeSlot', timeSlot);
      capacityUrl.searchParams.set('category', category);
      
      const capacityRes = await fetch(capacityUrl);
      const capacity = await capacityRes.json();
      
      if (capacity.available < parseInt(vehiclesCount)) {
        return NextResponse.json({ 
          error: 'Insufficient capacity',
          available: capacity.available,
          requested: vehiclesCount,
        }, { status: 400 });
      }

      // Get product and pricing
      const pricingUrl = new URL(request.url);
      pricingUrl.pathname = '/api/pricing';
      pricingUrl.searchParams.set('productId', productId);
      pricingUrl.searchParams.set('date', date);
      
      const pricingRes = await fetch(pricingUrl);
      const pricing = await pricingRes.json();

      // Calculate financials
      const financials = calculateFinancials(
        parseInt(vehiclesCount),
        pricing.effectivePrice,
        parseFloat(depositPercent || 0.20)
      );

      // Calculate payout date
      const expectedPayoutDate = calculatePayoutDate(salesChannel || 'otros', date);

      // Process payment splits (now using exact amounts instead of percentages)
      const totalGross = financials.totalGross;
      let paymentSplitWeb = 0;
      let paymentSplitCash = 0;
      let paymentSplitBank = 0;
      let paymentSplitGyg = 0;

      if (paymentSplit && Array.isArray(paymentSplit)) {
        paymentSplit.forEach(split => {
          const amount = parseFloat(split.amount || 0);
          switch(split.method) {
            case 'web':
              paymentSplitWeb = amount;
              break;
            case 'cash':
              paymentSplitCash = amount;
              break;
            case 'bank':
              paymentSplitBank = amount;
              break;
            case 'gyg':
              paymentSplitGyg = amount;
              break;
          }
        });
      } else {
        // Default: all to cash
        paymentSplitCash = totalGross;
      }

      // Create entry
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const entry = [
        id,
        date,
        timeSlot,
        category,
        productId,
        pricing.productName,
        vehiclesCount,
        groupLabel || '',
        notes || '',
        pricing.effectivePrice,
        financials.totalGross,
        financials.vatRate,
        financials.netBase,
        financials.vatAmount,
        depositPercent || 0.20,
        financials.depositAmount,
        'false', // depositPaid
        '', // depositPaidMethod
        '', // depositPaidDate
        financials.remainingAmount,
        'false', // remainingPaid
        '', // remainingPaidMethod
        '', // remainingPaidDate
        salesChannel || 'otros',
        expectedPayoutDate,
        paymentSplitWeb.toFixed(2),
        paymentSplitCash.toFixed(2),
        paymentSplitBank.toFixed(2),
        paymentSplitGyg.toFixed(2),
        '0.00', // paymentSplitCruise
        '0.00', // gygDiscount
        'false', // isPendingCruise
        now,
        userId,
        now,
        userId,
      ];

      await appendSheetData(SPREADSHEET_ID, 'Departures!A:AT', [entry]);
      
      await addAuditLog('CREATE', 'Departure', id, { entry }, userId, userName);

      return NextResponse.json({ 
        success: true,
        id,
        entry: {
          id,
          date,
          timeSlot,
          category,
          productId,
          productName: pricing.productName,
          vehiclesCount,
          groupLabel,
          notes,
          ...financials,
          salesChannel: salesChannel || 'otros',
          expectedPayoutDate,
        }
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Create batch departures
  if (path === 'departures/batch') {
    try {
      const { entries, userId = 'system', userName = 'System' } = body;

      console.log('Batch request received:', {
        entriesCount: entries?.length,
        userId,
        firstEntry: entries?.[0]
      });

      if (!Array.isArray(entries) || entries.length === 0) {
        return NextResponse.json({ error: 'Invalid entries array' }, { status: 400 });
      }

      const created = [];
      const errors = [];

      for (const entryData of entries) {
        console.log('Processing entry:', entryData);
        try {
          const {
            date,
            timeSlot,
            category,
            productId,
            vehiclesCount,
            groupLabel,
            notes,
            depositPercent,
            salesChannel,
            paymentSplit,
          } = entryData;

          // Validate required fields
          if (!date || !timeSlot || !category || !productId || !vehiclesCount) {
            errors.push({ entry: entryData, error: 'Missing required fields' });
            continue;
          }

          // Get product and pricing
          const productsData = await getSheetData(SPREADSHEET_ID, 'Products!A:H');
          const products = parseSheetToObjects(productsData);
          const product = products.find(p => p.id === productId);

          if (!product) {
            errors.push({ entry: entryData, error: 'Product not found' });
            continue;
          }

          // Apply GYG discount if present
          const gygDiscount = parseFloat(entryData.gygDiscount || 0);
          let effectivePrice = parseFloat(product.basePrice);
          if (gygDiscount > 0) {
            effectivePrice = effectivePrice * (1 - gygDiscount);
          }

          // Get commission first (commission is a separate expense, NOT subtracted from gross)
          const commission = parseFloat(entryData.commission || 0);
          const commissionMethod = entryData.commissionMethod || 'cash';

          // Calculate financials based on full price (commission doesn't reduce gross)
          const financials = calculateFinancials(
            parseInt(vehiclesCount),
            effectivePrice,
            parseFloat(depositPercent || 0.20)
          );

          // Calculate payout date
          const expectedPayoutDate = calculatePayoutDate(salesChannel || 'otros', date);

          // Process payment splits - these should sum to totalGross (full amount)
          let paymentSplitWeb = 0;
          let paymentSplitCash = 0;
          let paymentSplitBank = 0;
          let paymentSplitGyg = 0;
          let paymentSplitCruise = 0;

          if (paymentSplit && Array.isArray(paymentSplit)) {
            paymentSplit.forEach(split => {
              const amount = parseFloat(split.amount || 0);
              switch(split.method) {
                case 'web':
                  paymentSplitWeb = amount;
                  break;
                case 'cash':
                  paymentSplitCash = amount;
                  break;
                case 'bank':
                  paymentSplitBank = amount;
                  break;
                case 'gyg':
                  paymentSplitGyg = amount;
                  break;
                case 'cruceros':
                  paymentSplitCruise = amount;
                  break;
              }
            });
          } else {
            // Default: all to cash
            paymentSplitCash = financials.totalGross;
          }

          // Check if pending cruise
          const isPendingCruise = entryData.isPendingCruise || false;

          // Create entry
          const id = uuidv4();
          const now = new Date().toISOString();
          
          const entry = [
            id,
            date,
            timeSlot,
            category,
            productId,
            product.name,
            vehiclesCount,
            '', // groupLabel removed - keeping for backwards compatibility
            notes || '',
            effectivePrice, // Original price per vehicle
            financials.totalGross, // Actual gross after commission
            financials.vatRate,
            financials.netBase,
            financials.vatAmount,
            depositPercent || 0.20,
            financials.depositAmount,
            isPendingCruise ? 'false' : 'false', // depositPaid
            '',
            '',
            financials.remainingAmount,
            isPendingCruise ? 'false' : 'false', // remainingPaid
            isPendingCruise ? 'cruceros' : '', // remainingPaidMethod
            '',
            salesChannel || 'otros',
            expectedPayoutDate,
            paymentSplitWeb.toFixed(2),
            paymentSplitCash.toFixed(2),
            paymentSplitBank.toFixed(2),
            paymentSplitGyg.toFixed(2),
            (paymentSplitCruise || 0).toFixed(2), // cruise split
            gygDiscount.toFixed(2), // gygDiscount
            isPendingCruise ? 'true' : 'false', // isPendingCruise flag
            now,
            userId,
            now,
            userId,
            commission.toFixed(2), // collaborator commission
            commissionMethod, // 'cash' or 'bank'
          ];

          console.log('Appending entry:', {
            id,
            date,
            timeSlot,
            category,
            productName: product.name,
            vehiclesCount,
            totalGross: financials.totalGross,
            entryLength: entry.length
          });

          try {
            console.log('About to append to sheet:', {
              spreadsheetId: SPREADSHEET_ID,
              range: 'Departures!A:AT',
              valuesLength: [entry].length,
              firstValues: entry.slice(0, 5)
            });
            
            const appendResult = await safeAppendSheetData(SPREADSHEET_ID, 'Departures', [entry]);
            console.log('Entry appended successfully, result:', appendResult);
          } catch (appendError) {
            console.error('ERROR appending to sheet:', appendError);
            throw appendError;
          }
          
          await addAuditLog('CREATE', 'Departure', id, { entry }, userId, userName);

          created.push({
            success: true,
            id,
            entry: {
              id,
              date,
              timeSlot,
              category,
              productId,
              productName: product.name,
              vehiclesCount,
              groupLabel,
              notes,
              ...financials,
              salesChannel: salesChannel || 'otros',
              expectedPayoutDate,
            }
          });
        } catch (error) {
          errors.push({ entry: entryData, error: error.message });
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        created: created.length,
        errors: errors.length,
        results: created,
        errorDetails: errors,
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Create/Update product
  if (path === 'products') {
    try {
      const { name, category, duration, basePrice, active = true, userId = 'system' } = body;

      if (!name || !category || !duration || !basePrice) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const id = uuidv4();
      const now = new Date().toISOString();

      const productRow = [
        id,
        category,
        name,
        duration,
        basePrice,
        active ? 'TRUE' : 'FALSE',
        now,
        now,
      ];

      await appendSheetData(SPREADSHEET_ID, 'Products!A:H', [productRow]);
      await addAuditLog('CREATE', 'Product', id, { product: productRow }, userId, 'Admin');

      return NextResponse.json({
        success: true,
        id,
        product: {
          id,
          name,
          category,
          duration,
          basePrice,
          active,
          createdAt: now,
          updatedAt: now,
        }
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Create time slot
  if (path === 'timeslots') {
    try {
      const { time, active = true, userId = 'system' } = body;

      if (!time) {
        return NextResponse.json({ error: 'Time is required' }, { status: 400 });
      }

      const id = uuidv4();

      const slotRow = [
        id,
        time,
        '10', // default quad capacity
        '6',  // default buggy capacity
        active ? 'TRUE' : 'FALSE',
      ];

      await appendSheetData(SPREADSHEET_ID, 'TimeSlots!A:E', [slotRow]);
      await addAuditLog('CREATE', 'TimeSlot', id, { slot: slotRow }, userId, 'Admin');

      return NextResponse.json({
        success: true,
        id,
        slot: {
          id,
          time,
          quadCapacity: '10',
          buggyCapacity: '6',
          active,
        }
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// PUT handlers
async function handlePut(request, path) {
  const body = await request.json();

  // Update departure
  if (path.startsWith('departures/')) {
    try {
      const id = path.split('/')[1];
      const { userId = 'system', userName = 'System', ...updates } = body;

      // Get current data
      const data = await getSheetData(SPREADSHEET_ID, 'Departures!A:AT');
      const departures = parseSheetToObjects(data);
      const index = departures.findIndex(d => d.id === id);

      if (index === -1) {
        return NextResponse.json({ error: 'Departure not found' }, { status: 404 });
      }

      const current = departures[index];
      const updated = { ...current, ...updates, updatedAt: new Date().toISOString(), updatedBy: userId };

      // Recalculate financials if needed
      if (updates.vehiclesCount || updates.productId || updates.depositPercent) {
        const pricingUrl = new URL(request.url);
        pricingUrl.pathname = '/api/pricing';
        pricingUrl.searchParams.set('productId', updated.productId);
        pricingUrl.searchParams.set('date', updated.date);
        
        const pricingRes = await fetch(pricingUrl);
        const pricing = await pricingRes.json();

        const financials = calculateFinancials(
          parseInt(updated.vehiclesCount),
          pricing.effectivePrice,
          parseFloat(updated.depositPercent || 0.20)
        );

        Object.assign(updated, financials);
        updated.pricePerVehicleGross = pricing.effectivePrice;
      }

      // Update in sheet
      const headers = data[0];
      const rowData = headers.map(header => updated[header] !== undefined ? updated[header] : '');
      await updateSheetData(SPREADSHEET_ID, `Departures!A${index + 2}:AT${index + 2}`, [rowData]);

      await addAuditLog('UPDATE', 'Departure', id, { before: current, after: updated }, userId, userName);

      return NextResponse.json({ success: true, updated });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update product
  if (path.startsWith('products/')) {
    try {
      const id = path.split('/')[1];
      const { name, category, duration, basePrice, active, userId = 'system' } = body;

      // Get current data
      const data = await getSheetData(SPREADSHEET_ID, 'Products!A:H');
      const products = parseSheetToObjects(data);
      const index = products.findIndex(p => p.id === id);

      if (index === -1) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      const current = products[index];
      const now = new Date().toISOString();
      
      const updated = [
        id,
        category || current.category,
        name || current.name,
        duration || current.duration,
        basePrice || current.basePrice,
        active !== undefined ? (active ? 'TRUE' : 'FALSE') : current.active,
        current.createdAt,
        now,
      ];

      await updateSheetData(SPREADSHEET_ID, `Products!A${index + 2}:H${index + 2}`, [updated]);
      await addAuditLog('UPDATE', 'Product', id, { before: current, after: updated }, userId, 'Admin');

      return NextResponse.json({
        success: true,
        product: {
          id,
          category: updated[1],
          name: updated[2],
          duration: updated[3],
          basePrice: updated[4],
          active: updated[5] === 'TRUE',
          createdAt: updated[6],
          updatedAt: updated[7],
        }
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Update time slot
  if (path.startsWith('timeslots/')) {
    try {
      const id = path.split('/')[1];
      const { time, active, userId = 'system' } = body;

      // Get current data
      const data = await getSheetData(SPREADSHEET_ID, 'TimeSlots!A:E');
      const slots = parseSheetToObjects(data);
      const index = slots.findIndex(s => s.id === id);

      if (index === -1) {
        return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
      }

      const current = slots[index];
      const now = new Date().toISOString();
      
      const updated = [
        id,
        time || current.time,
        current.quadCapacity || '10',
        current.buggyCapacity || '6',
        active !== undefined ? (active ? 'TRUE' : 'FALSE') : current.active,
      ];

      await updateSheetData(SPREADSHEET_ID, `TimeSlots!A${index + 2}:E${index + 2}`, [updated]);
      await addAuditLog('UPDATE', 'TimeSlot', id, { before: current, after: updated }, userId, 'Admin');

      return NextResponse.json({
        success: true,
        slot: {
          id,
          time: updated[1],
          quadCapacity: updated[2],
          buggyCapacity: updated[3],
          active: updated[4] === 'TRUE',
        }
      });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// DELETE handlers
async function handleDelete(request, path) {
  const { searchParams } = new URL(request.url);

  // Delete user (Admin)
  if (path.startsWith('users/')) {
    const username = path.split('/')[1];
    const adminUser = searchParams.get('adminUser') || 'admin';
    return handleDeleteUser(username, adminUser);
  }

  // Delete departure
  if (path.startsWith('departures/')) {
    try {
      const id = path.split('/')[1];
      const userId = searchParams.get('userId') || 'system';
      const userName = searchParams.get('userName') || 'System';

      // Get current data
      const data = await getSheetData(SPREADSHEET_ID, 'Departures!A:AT');
      const departures = parseSheetToObjects(data);
      const departure = departures.find(d => d.id === id);

      if (!departure) {
        return NextResponse.json({ error: 'Departure not found' }, { status: 404 });
      }

      // Mark as deleted (soft delete) or actually remove the row
      // For now, we'll do soft delete by updating a status
      const index = departures.findIndex(d => d.id === id);
      const headers = data[0];
      const emptyRow = headers.map(() => '');
      
      await updateSheetData(SPREADSHEET_ID, `Departures!A${index + 2}:AT${index + 2}`, [emptyRow]);

      await addAuditLog('DELETE', 'Departure', id, { deleted: departure }, userId, userName);

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Delete product
  if (path.startsWith('products/')) {
    try {
      const id = path.split('/')[1];

      const data = await getSheetData(SPREADSHEET_ID, 'Products!A:H');
      const products = parseSheetToObjects(data);
      const index = products.findIndex(p => p.id === id);

      if (index === -1) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      const product = products[index];
      const headers = data[0];
      const emptyRow = headers.map(() => '');
      
      await updateSheetData(SPREADSHEET_ID, `Products!A${index + 2}:H${index + 2}`, [emptyRow]);
      await addAuditLog('DELETE', 'Product', id, { deleted: product }, 'system', 'Admin');

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Delete time slot
  if (path.startsWith('timeslots/')) {
    try {
      const id = path.split('/')[1];

      const data = await getSheetData(SPREADSHEET_ID, 'TimeSlots!A:E');
      const slots = parseSheetToObjects(data);
      const index = slots.findIndex(s => s.id === id);

      if (index === -1) {
        return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
      }

      const slot = slots[index];
      const headers = data[0];
      const emptyRow = headers.map(() => '');
      
      await updateSheetData(SPREADSHEET_ID, `TimeSlots!A${index + 2}:E${index + 2}`, [emptyRow]);
      await addAuditLog('DELETE', 'TimeSlot', id, { deleted: slot }, 'system', 'Admin');

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// Main handler
export async function GET(request, { params }) {
  const path = params?.path?.join('/') || '';
  return handleGet(request, path);
}

export async function POST(request, { params }) {
  const path = params?.path?.join('/') || '';
  return handlePost(request, path);
}

export async function PUT(request, { params }) {
  const path = params?.path?.join('/') || '';
  return handlePut(request, path);
}

export async function DELETE(request, { params }) {
  const path = params?.path?.join('/') || '';
  return handleDelete(request, path);
}
