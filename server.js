const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Store active Server-Sent Events clients (Owner dashboard screens)
let sseClients = [];

function broadcastToClients(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (e) {
      // client disconnected
    }
  });
}

// ==========================================
// WhatsApp Automated Engine & Gateway Helper
// ==========================================
function sendWhatsAppViaUltraMsg(instanceId, token, phone, message) {
  return new Promise((resolve, reject) => {
    if (!instanceId || !token) {
      return reject(new Error('WhatsApp instanceId or token is missing'));
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    const postData = JSON.stringify({
      token: token,
      to: formattedPhone,
      body: message
    });

    const options = {
      hostname: 'api.ultramsg.com',
      port: 443,
      path: `/${instanceId}/messages/chat`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 12000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.sent === 'true' || parsed.id || res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || parsed.error || `Send failed (HTTP ${res.statusCode})`));
          }
        } catch(e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ raw: data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('WhatsApp Gateway request timed out'));
    });
    req.write(postData);
    req.end();
  });
}

// ==========================================
// Data Persistence & Storage Configuration
// ==========================================
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const EXPENSES_FILE = path.join(DATA_DIR, 'expenses.json');

const DEFAULT_SETTINGS = {
  ownerName: 'Rishi Jha',
  gymName: 'OG Fitness',
  phone: '9876543210',
  email: 'owner@ogfitness.com',
  address: 'City Center, Main Road',
  profileImage: '',
  morningTiming: '06:00 AM - 11:30 AM',
  eveningTiming: '04:30 PM - 10:00 PM',
  upiId: 'ogfitness@upi',
  standeeUrl: 'https://og-fitness-app.onrender.com/punch.html',
  autoCheckoutMinutes: 90,
  whatsapp: {
    autoSendEnabled: true,
    sendHour: 9,
    instanceId: '',
    token: '',
    testPhone: '7440858141'
  },
  plans: [
    { id: 'p1', name: '1 Month Essential', price: 1499, durationDays: 30 },
    { id: 'p2', name: '3 Months Strength', price: 3999, durationDays: 90 },
    { id: 'p3', name: '6 Months Pro Athlete', price: 6999, durationDays: 180 },
    { id: 'p4', name: '12 Months Elite VIP', price: 11999, durationDays: 365 }
  ]
};

function parseTimeStrToMinutes(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3] ? match[3].toUpperCase() : null;
  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatMinutesToTimeStr(totalMinutes) {
  let mins = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  const meridian = hours >= 12 ? 'PM' : 'AM';
  const displayHours = String(hours % 12 || 12).padStart(2, '0');
  const displayMins = String(remainingMins).padStart(2, '0');
  return `${displayHours}:${displayMins} ${meridian}`;
}

function getTodayStrIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function getNowMinutesIST() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
  return h * 60 + m;
}

function autoResolveFloorAttendance(attendance) {
  const settings = getStoredSettings();
  const autoCheckoutMins = parseInt(settings.autoCheckoutMinutes) || 90;
  const todayStr = getTodayStrIST();
  const nowMins = getNowMinutesIST();
  let updated = false;

  attendance.forEach(rec => {
    if (!rec.checkOutTime) {
      if (rec.date && rec.date < todayStr) {
        rec.checkOutTime = rec.checkInTime || 'Completed';
        rec.status = 'Completed (Auto)';
        updated = true;
        return;
      }
      if (rec.date === todayStr && rec.checkInTime) {
        const inMins = parseTimeStrToMinutes(rec.checkInTime);
        if (inMins !== null) {
          const elapsedMins = nowMins - inMins;
          if (elapsedMins >= autoCheckoutMins) {
            rec.checkOutTime = formatMinutesToTimeStr(inMins + autoCheckoutMins);
            rec.status = 'Completed (Auto)';
            updated = true;
          }
        }
      }
    }
  });

  if (updated) {
    saveStoredAttendance(attendance);
  }
  return attendance;
}

function getStoredMembers() {
  if (fs.existsSync(MEMBERS_FILE)) {
    try { return JSON.parse(fs.readFileSync(MEMBERS_FILE, 'utf8')); } catch (e) {}
  }
  return [];
}
function saveStoredMembers(members) {
  fs.writeFileSync(MEMBERS_FILE, JSON.stringify(members, null, 2), 'utf8');
}

function getStoredAttendance() {
  let list = [];
  if (fs.existsSync(ATTENDANCE_FILE)) {
    try { list = JSON.parse(fs.readFileSync(ATTENDANCE_FILE, 'utf8')); } catch (e) {}
  }
  return autoResolveFloorAttendance(list);
}
function saveStoredAttendance(att) {
  fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(att, null, 2), 'utf8');
}

function getStoredSettings() {
  if (fs.existsSync(SETTINGS_FILE)) {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }; } catch (e) {}
  }
  return DEFAULT_SETTINGS;
}
function saveStoredSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

function getStoredExpenses() {
  if (fs.existsSync(EXPENSES_FILE)) {
    try { return JSON.parse(fs.readFileSync(EXPENSES_FILE, 'utf8')); } catch (e) {}
  }
  return [];
}
function saveStoredExpenses(expenses) {
  fs.writeFileSync(EXPENSES_FILE, JSON.stringify(expenses, null, 2), 'utf8');
}

function generateExpiryReminderText(member, gymName, gymPhone, daysRemaining) {
  let urgency = 'khatam ho chuki hai';
  if (daysRemaining === 2) urgency = '2 din me';
  else if (daysRemaining === 1) urgency = 'kal (1 din me)';
  else if (daysRemaining > 0) urgency = `${daysRemaining} din me`;

  return (
    `💪 *${gymName || 'OG FITNESS'} - MEMBERSHIP ALERT*\n\n` +
    `Namaste *${member.name}* Ji,\n` +
    `Aapki gym membership (${member.planName || 'Workout Plan'}) *${urgency} (${member.expiryDate})* ko expire ho rahi hai.\n\n` +
    `Apni transformation progress continue rakhne ke liye kripya reception desk par jakar ya online apna plan renew karwayein.\n\n` +
    `📍 ${gymName || 'OG Fitness Elite Hub'}\n` +
    `📞 Helpline / Reception: +91 ${gymPhone || '9876543210'}\n` +
    `Stay Hard & Keep Grinding! 🏋️‍♂️`
  );
}

async function processDailyWhatsAppReminders(forceAll = false) {
  const settings = getStoredSettings();
  const wa = settings.whatsapp || {};

  if (!wa.instanceId || !wa.token) {
    return { success: false, error: 'WhatsApp Gateway instanceId or token not configured' };
  }

  const members = getStoredMembers();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const results = {
    totalChecked: members.length,
    sentCount: 0,
    skippedCount: 0,
    errors: []
  };

  for (const m of members) {
    if (!m.expiryDate || !m.phone) {
      results.skippedCount++;
      continue;
    }

    const expDate = new Date(m.expiryDate);
    const diffTime = expDate - new Date(todayStr);
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Target: Expiring in 2 days or expired recently (up to 7 days past)
    const isTarget = (daysRemaining <= 2 && daysRemaining >= -7);

    if (!isTarget) {
      results.skippedCount++;
      continue;
    }

    // Skip if already reminded today (unless forceAll is true)
    if (!forceAll && m.lastReminderDate === todayStr) {
      results.skippedCount++;
      continue;
    }

    const message = generateExpiryReminderText(m, settings.gymName, settings.phone, daysRemaining);

    try {
      await sendWhatsAppViaUltraMsg(wa.instanceId, wa.token, m.phone, message);
      m.lastReminderDate = todayStr;
      results.sentCount++;

      // Broadcast live event to owner screen!
      broadcastToClients({
        type: 'WHATSAPP_AUTO_SENT',
        data: {
          memberId: m.id,
          memberName: m.name,
          phone: m.phone,
          expiryDate: m.expiryDate,
          sentTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      });
    } catch (err) {
      results.errors.push({ memberId: m.id, name: m.name, error: err.message });
    }
  }

  if (results.sentCount > 0) {
    saveStoredMembers(members);
  }

  return { success: true, ...results };
}

async function processDailyBirthdayWishes() {
  const settings = getStoredSettings();
  const wa = settings.whatsapp || {};
  if (!wa.instanceId || !wa.token) return { success: false, sent: 0 };

  const members = getStoredMembers();
  const todayStr = getTodayStrIST(); // YYYY-MM-DD
  const currentMonthDay = todayStr.slice(5); // MM-DD
  const currentYear = todayStr.slice(0, 4);

  let sent = 0;
  for (const m of members) {
    if (!m.dob || !m.phone) continue;
    const memberMonthDay = m.dob.slice(5);
    if (memberMonthDay === currentMonthDay && m.lastBirthdayWishYear !== currentYear) {
      const wishText = 
        `🎉 *HAPPY BIRTHDAY ${m.name.toUpperCase()} JI!* 🎂\n\n` +
        `OG Fitness family ki taraf se aapko janamdin ki dher saari shubhkamnayein!\n\n` +
        `Bhagwan aapko hamesha fit, healthy aur strong rakhe. Apne transformation goals achieve karte rahiye! 💪\n\n` +
        `Stay Hard & Keep Grinding! 🏋️‍♂️\n` +
        `— *${settings.gymName || 'OG FITNESS'} Team*`;

      try {
        await sendWhatsAppViaUltraMsg(wa.instanceId, wa.token, m.phone, wishText);
        m.lastBirthdayWishYear = currentYear;
        sent++;
        broadcastToClients({
          type: 'WHATSAPP_AUTO_SENT',
          data: {
            memberId: m.id,
            memberName: m.name,
            phone: m.phone,
            note: 'Birthday Wish Sent 🎂',
            sentTime: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
          }
        });
      } catch (e) {
        console.error('[Birthday Engine] Error sending wish:', e.message);
      }
    }
  }

  if (sent > 0) {
    saveStoredMembers(members);
  }
  return { success: true, sent };
}

let lastAutoSendDate = '';
function startDailyReminderScheduler() {
  setInterval(async () => {
    try {
      const settings = getStoredSettings();
      const wa = settings.whatsapp || {};
      if (!wa.autoSendEnabled || !wa.instanceId || !wa.token) return;

      const now = new Date();
      // Indian Standard Time (UTC + 5:30)
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const currentHour = istTime.getUTCHours();
      const todayStr = istTime.toISOString().split('T')[0];

      const targetHour = parseInt(wa.sendHour) || 9;

      if (currentHour >= targetHour && lastAutoSendDate !== todayStr) {
        lastAutoSendDate = todayStr;
        console.log(`[WhatsApp Auto-Scheduler] Running daily morning reminder check for ${todayStr}...`);
        const result = await processDailyWhatsAppReminders(false);
        console.log(`[WhatsApp Auto-Scheduler] Sent: ${result.sentCount}, Skipped: ${result.skippedCount}`);
        const bdayResult = await processDailyBirthdayWishes();
        console.log(`[Birthday Engine] Sent: ${bdayResult.sent || 0}`);
      }
    } catch (e) {
      console.error('[WhatsApp Auto-Scheduler] Error:', e.message);
    }
  }, 15 * 60 * 1000); // Check every 15 minutes
}

startDailyReminderScheduler();

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. API: Get Local IP & Standee QR URL
  if (pathname === '/api/info' && req.method === 'GET') {
    const localIp = getLocalIpAddress();
    const settings = getStoredSettings();
    const deskPunchUrl = (settings.standeeUrl && settings.standeeUrl.trim())
      ? settings.standeeUrl.trim()
      : `http://${localIp}:${PORT}/punch.html`;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      localIp,
      port: PORT,
      deskPunchUrl,
      standeeUrl: settings.standeeUrl || '',
      localhostPunchUrl: `http://localhost:${PORT}/punch.html`
    }));
    return;
  }

  // 2. API: Server-Sent Events (SSE) Stream for Live Real-Time Dashboard Updates
  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 5000\n\n');

    const clientId = Date.now() + Math.random();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c.id !== clientId);
    });
    return;
  }

  // 3. API: Members CRUD
  if (pathname === '/api/members' && req.method === 'GET') {
    const members = getStoredMembers();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(members));
    return;
  }

  if (pathname === '/api/members' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const member = JSON.parse(body);
        const members = getStoredMembers();
        // Remove existing if duplicate ID
        const filtered = members.filter(m => m.id !== member.id);
        filtered.unshift(member);
        saveStoredMembers(filtered);

        broadcastToClients({
          type: 'MEMBER_ADDED',
          data: member,
          timestamp: new Date().toISOString()
        });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, member }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  if (pathname === '/api/members/clear' && req.method === 'POST') {
    saveStoredMembers([]);
    saveStoredAttendance([]);
    broadcastToClients({
      type: 'DATABASE_CLEARED',
      timestamp: new Date().toISOString()
    });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: true, message: 'All demo data cleared' }));
    return;
  }

  // API: Delete Single Member (gym chhod kar jaane wale members)
  if (pathname === '/api/members/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { memberId } = JSON.parse(body);
        if (!memberId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'memberId required' }));
          return;
        }

        const members = getStoredMembers();
        const updated = members.filter(m => m.id !== memberId);
        saveStoredMembers(updated);

        broadcastToClients({
          type: 'MEMBER_DELETED',
          data: { memberId },
          timestamp: new Date().toISOString()
        });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, message: 'Member deleted successfully' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // API: Get Settings
  if (pathname === '/api/settings' && req.method === 'GET') {
    const settings = getStoredSettings();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(settings));
    return;
  }

  // API: Update Settings
  if (pathname === '/api/settings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const current = getStoredSettings();
        const updated = { ...current, ...payload };
        saveStoredSettings(updated);

        broadcastToClients({
          type: 'SETTINGS_UPDATED',
          data: updated,
          timestamp: new Date().toISOString()
        });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, settings: updated }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 4. API: Attendance
  if (pathname === '/api/attendance' && req.method === 'GET') {
    const att = getStoredAttendance();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(att));
    return;
  }

  // 5. API: Post Punch from Member's Phone or Manual Desk
  if (pathname === '/api/punch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const attendance = getStoredAttendance();
        
        // Check if member already checked in today without check-out
        const todayStr = new Date().toISOString().split('T')[0];
        const existing = attendance.find(a => (a.date === todayStr || a.date === payload.date) && a.memberId === payload.memberId && !a.checkOutTime);

        if (existing && payload.punchType === 'Check-Out') {
          existing.checkOutTime = payload.punchTime;
          existing.status = 'Completed';
        } else if (!existing) {
          attendance.unshift({
            id: 'att-' + Date.now(),
            date: payload.date || todayStr,
            memberId: payload.memberId,
            memberName: payload.memberName,
            checkInTime: payload.punchTime,
            checkOutTime: payload.punchType === 'Check-Out' ? payload.punchTime : null,
            status: payload.punchType === 'Check-Out' ? 'Completed' : 'On Floor'
          });
        }
        saveStoredAttendance(attendance);

        // Broadcast this live punch to all connected Owner desks!
        broadcastToClients({
          type: 'MEMBER_PUNCH',
          data: payload,
          timestamp: new Date().toISOString()
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, message: 'Punch recorded and broadcasted' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 5b. API: Manual Clear Floor (Checkout All Active Members)
  if (pathname === '/api/attendance/clear-floor' && req.method === 'POST') {
    const attendance = getStoredAttendance();
    const todayStr = getTodayStrIST();
    const currentTimeStr = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    let clearedCount = 0;

    attendance.forEach(rec => {
      if (!rec.checkOutTime && (rec.date === todayStr || rec.date < todayStr)) {
        rec.checkOutTime = currentTimeStr;
        rec.status = 'Completed';
        clearedCount++;
      }
    });

    saveStoredAttendance(attendance);

    broadcastToClients({
      type: 'FLOOR_CLEARED',
      data: { clearedCount, time: currentTimeStr }
    });

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: true, clearedCount, message: `Floor cleared: ${clearedCount} members checked out.` }));
    return;
  }

  // 6. API: Test WhatsApp Message
  if (pathname === '/api/whatsapp/send-test' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const settings = getStoredSettings();
        const wa = settings.whatsapp || {};

        const instanceId = payload.instanceId || wa.instanceId;
        const token = payload.token || wa.token;
        const phone = payload.phone || wa.testPhone || settings.phone;

        if (!instanceId || !token) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, error: 'Instance ID aur Token zaroori hai. Settings me UltraMsg credentials bharein.' }));
          return;
        }

        const testMsg = `🏋️‍♂️ *OG FITNESS - TEST WHATSAPP ALERT*\n\n` +
          `Namaste *${settings.ownerName || 'Owner'}* Ji,\n` +
          `Aapka WhatsApp Gateway successfully connect ho gaya hai! 🎉\n` +
          `Ab roz subah 9:00 baje gym members ko unki membership expiry ka reminder apne aap chala jayega.\n\n` +
          `Gym: ${settings.gymName || 'OG Fitness'}\n` +
          `Status: ✅ Active & Ready`;

        const resp = await sendWhatsAppViaUltraMsg(instanceId, token, phone, testMsg);

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, message: `Test WhatsApp message sent to ${phone}!`, data: resp }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 7. API: Manual Trigger for Daily Expiry Auto-Send Batch
  if (pathname === '/api/whatsapp/trigger-daily' && req.method === 'POST') {
    processDailyWhatsAppReminders(true)
      .then(summary => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(summary));
      })
      .catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
    return;
  }

  // 8. API: Send Single Member Reminder via Gateway
  if (pathname === '/api/whatsapp/send-single' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const settings = getStoredSettings();
        const wa = settings.whatsapp || {};

        if (!wa.instanceId || !wa.token) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, error: 'UltraMsg Gateway connect nahi hai. Settings me Instance ID & Token fill karein.' }));
          return;
        }

        const members = getStoredMembers();
        const member = members.find(m => m.id === payload.memberId);
        if (!member) {
          res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, error: 'Member nahi mila' }));
          return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const expDate = new Date(member.expiryDate);
        const daysRemaining = Math.ceil((expDate - new Date(todayStr)) / (1000 * 60 * 60 * 24));
        const message = generateExpiryReminderText(member, settings.gymName, settings.phone, daysRemaining);

        const resp = await sendWhatsAppViaUltraMsg(wa.instanceId, wa.token, member.phone, message);
        member.lastReminderDate = todayStr;
        saveStoredMembers(members);

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, message: `WhatsApp reminder sent to ${member.name}!`, data: resp }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 9. API: Expenses CRUD
  if (pathname === '/api/expenses' && req.method === 'GET') {
    const expenses = getStoredExpenses();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(expenses));
    return;
  }

  if (pathname === '/api/expenses' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const expense = JSON.parse(body);
        if (!expense.id) expense.id = 'exp-' + Date.now();
        if (!expense.date) expense.date = getTodayStrIST();
        const expenses = getStoredExpenses();
        expenses.unshift(expense);
        saveStoredExpenses(expenses);

        broadcastToClients({
          type: 'EXPENSE_ADDED',
          data: expense
        });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, expense }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  if (pathname === '/api/expenses/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { expenseId } = JSON.parse(body);
        const expenses = getStoredExpenses();
        const updated = expenses.filter(e => e.id !== expenseId);
        saveStoredExpenses(updated);

        broadcastToClients({
          type: 'EXPENSE_DELETED',
          data: { expenseId }
        });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, message: 'Expense deleted successfully' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 10. API: Send Custom WhatsApp Message (Receipts, Diet Plans, Absentee Nudges)
  if (pathname === '/api/whatsapp/send-custom' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { phone, message, title } = JSON.parse(body || '{}');
        const settings = getStoredSettings();
        const wa = settings.whatsapp || {};

        if (!phone || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, error: 'Phone number aur message required hain.' }));
          return;
        }

        if (!wa.instanceId || !wa.token) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, error: 'UltraMsg Gateway connect nahi hai. Settings me credentials save karein ya 1-Click WhatsApp use karein.' }));
          return;
        }

        const resp = await sendWhatsAppViaUltraMsg(wa.instanceId, wa.token, phone, message);

        broadcastToClients({
          type: 'WHATSAPP_AUTO_SENT',
          data: {
            phone,
            note: title || 'Custom WhatsApp Sent',
            sentTime: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: true, message: 'WhatsApp message successfully sent!', data: resp }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 4. Static File Serving
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log('\n======================================================');
  console.log(' 🔥 OG FITNESS GYM OWNER & DESK QR SYSTEM RUNNING');
  console.log('======================================================');
  console.log(` 💻 Owner Dashboard:    http://localhost:${PORT}`);
  console.log(` 📱 Member Standee QR:  http://${localIp}:${PORT}/punch.html`);
  console.log('======================================================\n');
});

module.exports = server;
