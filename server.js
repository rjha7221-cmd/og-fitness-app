const http = require('http');
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

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

// Data persistence files
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

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
  plans: [
    { id: 'p1', name: '1 Month Essential', price: 1499, durationDays: 30 },
    { id: 'p2', name: '3 Months Strength', price: 3999, durationDays: 90 },
    { id: 'p3', name: '6 Months Pro Athlete', price: 6999, durationDays: 180 },
    { id: 'p4', name: '12 Months Elite VIP', price: 11999, durationDays: 365 }
  ]
};

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
  if (fs.existsSync(ATTENDANCE_FILE)) {
    try { return JSON.parse(fs.readFileSync(ATTENDANCE_FILE, 'utf8')); } catch (e) {}
  }
  return [];
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
