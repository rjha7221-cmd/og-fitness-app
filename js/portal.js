// OG Fitness - Gym Owner Management Portal Engine

// 1. Database & Initial State
const DB_KEYS = {
  MEMBERS: 'og_members',
  ATTENDANCE: 'og_attendance',
  PLANS: 'og_plans',
  PAYMENTS: 'og_payments',
  SETTINGS: 'og_gym_settings'
};

function getTodayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TODAY_STR = getTodayDateString();

const DEFAULT_PLANS = [
  { id: 'p1', name: '1 Month Essential', durationDays: 30, price: 1499, description: 'Gym floor & lockers' },
  { id: 'p2', name: '3 Months Strength', durationDays: 90, price: 3999, description: 'Gym + CrossFit batches' },
  { id: 'p3', name: '6 Months Pro Athlete', durationDays: 180, price: 6999, description: 'All access + Steam Sauna' },
  { id: 'p4', name: '12 Months Elite VIP', durationDays: 365, price: 11999, description: 'VIP all-inclusive + PT sessions' }
];

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
  plans: DEFAULT_PLANS
};

function getGymSettings() {
  try {
    const saved = localStorage.getItem(DB_KEYS.SETTINGS);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch(e){}
  return DEFAULT_SETTINGS;
}

function saveGymSettingsToStorage(settings) {
  localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(settings));
}

// Clean Live Database Initialization
async function initializeDatabase() {
  if (!localStorage.getItem(DB_KEYS.PLANS)) {
    localStorage.setItem(DB_KEYS.PLANS, JSON.stringify(DEFAULT_PLANS));
  }

  // Auto-switch to live mode (clear fake dummy members if present)
  if (localStorage.getItem('og_live_mode') !== 'true') {
    localStorage.setItem(DB_KEYS.MEMBERS, JSON.stringify([]));
    localStorage.setItem(DB_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem('og_live_mode', 'true');
  }

  // Sync with backend server
  try {
    const res = await fetch('/api/members');
    if (res.ok) {
      const serverMembers = await res.json();
      if (Array.isArray(serverMembers) && serverMembers.length > 0) {
        localStorage.setItem(DB_KEYS.MEMBERS, JSON.stringify(serverMembers));
      }
    }
  } catch (e) {}

  try {
    const resAtt = await fetch('/api/attendance');
    if (resAtt.ok) {
      const serverAtt = await resAtt.json();
      if (Array.isArray(serverAtt) && serverAtt.length > 0) {
        localStorage.setItem(DB_KEYS.ATTENDANCE, JSON.stringify(serverAtt));
      }
    }
  } catch (e) {}

  updateLiveDateHeaders();
}

async function clearDemoData() {
  if (!confirm('Kya aap saare demo/sample members ko clear karke 100% Real Live data use karna chahte hain?')) return;
  localStorage.setItem(DB_KEYS.MEMBERS, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.ATTENDANCE, JSON.stringify([]));
  localStorage.setItem('og_live_mode', 'true');
  try {
    await fetch('/api/members/clear', { method: 'POST' });
  } catch (e) {}
  renderAllViews();
  showNotification('🧹 Sample demo data cleared! Ab aap apna real gym member register karein.', 'success');
}

function updateLiveDateHeaders() {
  const now = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const formatted = now.toLocaleDateString('en-US', options);

  const headerDateEl = document.getElementById('live-header-date');
  if (headerDateEl) headerDateEl.textContent = `Live Gym Server • ${formatted}`;

  const welcomeDateEl = document.getElementById('live-welcome-date');
  if (welcomeDateEl) welcomeDateEl.textContent = `Gym Owner Dashboard • ${formatted}`;
}

// 2. Audio Chime Synthesizer (Zero External Dependencies)
class GymAudioEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playCheckInChime() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Joyful high two-tone chime
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880.00, now + 0.12); // A5

      osc2.frequency.setValueAtTime(1174.66, now + 0.12); // D6 harmonic

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.12);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.log('Audio playback error (browser policy):', e);
    }
  }

  playCheckOutChime() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(440.00, now + 0.15); // A4 (descending)

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  }
}

const audioEngine = new GymAudioEngine();

// 3. Helper Functions & Expiry Calculation
function getMembers() {
  return JSON.parse(localStorage.getItem(DB_KEYS.MEMBERS) || '[]');
}

function saveMembers(members) {
  localStorage.setItem(DB_KEYS.MEMBERS, JSON.stringify(members));
}

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

function autoResolveFloorAttendanceClient(attendance) {
  const settings = getGymSettings();
  const autoCheckoutMins = parseInt(settings.autoCheckoutMinutes) || 90;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let updated = false;

  attendance.forEach(rec => {
    if (!rec.checkOutTime) {
      if (rec.date && rec.date < TODAY_STR) {
        rec.checkOutTime = rec.checkInTime || 'Completed';
        rec.status = 'Completed (Auto)';
        updated = true;
        return;
      }
      if (rec.date === TODAY_STR && rec.checkInTime) {
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
    try {
      localStorage.setItem(DB_KEYS.ATTENDANCE, JSON.stringify(attendance));
    } catch(e) {}
  }
  return attendance;
}

function getAttendance() {
  const list = JSON.parse(localStorage.getItem(DB_KEYS.ATTENDANCE) || '[]');
  return autoResolveFloorAttendanceClient(list);
}

function saveAttendance(records) {
  localStorage.setItem(DB_KEYS.ATTENDANCE, JSON.stringify(records));
}

function getPlans() {
  return JSON.parse(localStorage.getItem(DB_KEYS.PLANS) || '[]');
}

function getDaysRemaining(expiryDateStr) {
  const today = new Date(TODAY_STR);
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getCurrentTimeFormatted() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// 4. Expiry Watchdog & WhatsApp Reminder Engine
function getExpiringMembers(targetDays = 2) {
  const members = getMembers();
  return members.filter(m => {
    const days = getDaysRemaining(m.expiryDate);
    return days === targetDays || (targetDays === 2 && days > 0 && days <= 2);
  });
}

function getExpiredMembers() {
  const members = getMembers();
  return members.filter(m => getDaysRemaining(m.expiryDate) < 0);
}

function buildWhatsAppExpiryMessage(member) {
  const days = getDaysRemaining(member.expiryDate);
  let urgency = days === 2 ? '2 din me' : days === 1 ? 'kal (1 din me)' : `${days} din me`;
  if (days <= 0) urgency = 'khatam ho chuki hai';

  const text = 
    `💪 *OG FITNESS CLUB - MEMBERSHIP ALERT*\n\n` +
    `Namaste *${member.name}* Ji,\n` +
    `Aapki OG Fitness membership (${member.planName}) *${urgency} (${member.expiryDate})* ko expire ho rahi hai.\n\n` +
    `Apni consistency aur transformation progress continue rakhne ke liye kripya reception desk par jakar ya online apna plan renew karwayein.\n\n` +
    `📍 OG Fitness Elite Hub\n` +
    `📞 Reception Helpline: +91 98765 43210\n` +
    `Stay Hard & Keep Grinding! 🏋️‍♂️`;

  return encodeURIComponent(text);
}

function sendWhatsAppReminder(memberId) {
  const members = getMembers();
  const member = members.find(m => m.id === memberId);
  if (!member) return;

  const phone = member.phone.replace(/[^0-9]/g, '');
  const formattedPhone = phone.length === 10 ? '91' + phone : phone;
  const msg = buildWhatsAppExpiryMessage(member);
  const waUrl = `https://wa.me/${formattedPhone}?text=${msg}`;

  window.open(waUrl, '_blank');
}

// 5. Excel / CSV Sheet Exporter
function exportMembersToCSV() {
  const members = getMembers();
  if (!members.length) {
    alert('Koi member data export karne ke liye nahi hai.');
    return;
  }

  const headers = [
    'Member ID',
    'Full Name',
    'Phone Number',
    'Gender',
    'Age',
    'Membership Plan',
    'Join Date',
    'Expiry Date',
    'Days Remaining',
    'Status',
    'Total Fees (INR)',
    'Fees Paid (INR)',
    'Pending Due (INR)',
    'Notes'
  ];

  const rows = members.map(m => {
    const daysLeft = getDaysRemaining(m.expiryDate);
    const due = Math.max(0, (m.feesTotal || 0) - (m.feesPaid || 0));
    return [
      `"${m.id}"`,
      `"${m.name}"`,
      `"${m.phone}"`,
      `"${m.gender}"`,
      m.age || '',
      `"${m.planName}"`,
      m.joinDate,
      m.expiryDate,
      daysLeft,
      `"${m.status}"`,
      m.feesTotal || 0,
      m.feesPaid || 0,
      due,
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `OG_Fitness_Members_Sheet_${TODAY_STR}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportAttendanceToCSV() {
  const attendance = getAttendance();
  const headers = ['Record ID', 'Date', 'Member ID', 'Member Name', 'Check-In Time', 'Check-Out Time', 'Status'];
  const rows = attendance.map(a => [
    `"${a.id}"`,
    `"${a.date}"`,
    `"${a.memberId}"`,
    `"${a.memberName}"`,
    `"${a.checkInTime}"`,
    `"${a.checkOutTime || 'On Floor'}"`,
    `"${a.status}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `OG_Fitness_Attendance_Sheet_${TODAY_STR}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 6. QR Attendance Punch Engine
function punchAttendance(memberId) {
  const members = getMembers();
  const member = members.find(m => m.id.toLowerCase() === memberId.toLowerCase() || m.phone === memberId);

  if (!member) {
    showNotification('Member not found with ID or Phone: ' + memberId, 'error');
    return null;
  }

  const attendance = getAttendance();
  const todayRecord = attendance.find(a => a.date === TODAY_STR && a.memberId === member.id && !a.checkOutTime);

  const currentTime = getCurrentTimeFormatted();

  if (todayRecord) {
    // Punch OUT
    todayRecord.checkOutTime = currentTime;
    todayRecord.status = 'Completed';
    saveAttendance(attendance);
    audioEngine.playCheckOutChime();

    showPunchModal(member, 'Check-Out', currentTime);
    showNotification(`Goodbye! ${member.name} punched OUT at ${currentTime}`, 'info');
  } else {
    // Punch IN
    const daysLeft = getDaysRemaining(member.expiryDate);
    const isExpired = daysLeft < 0;

    const newRecord = {
      id: 'att-' + Date.now(),
      date: TODAY_STR,
      memberId: member.id,
      memberName: member.name,
      checkInTime: currentTime,
      checkOutTime: null,
      status: 'On Floor'
    };

    attendance.unshift(newRecord);
    saveAttendance(attendance);
    audioEngine.playCheckInChime();

    showPunchModal(member, 'Check-In', currentTime, daysLeft);
    if (isExpired) {
      showNotification(`⚠️ Warning: ${member.name}'s membership is EXPIRED! Renew fees immediately.`, 'warning');
    } else {
      showNotification(`Welcome! ${member.name} punched IN at ${currentTime}`, 'success');
    }
  }

  renderAllViews();
  return member;
}

function showPunchModal(member, punchType, timeStr, daysLeft) {
  const modal = document.getElementById('punch-result-modal');
  if (!modal) return;

  const typeEl = document.getElementById('punch-modal-type');
  const nameEl = document.getElementById('punch-modal-name');
  const idEl = document.getElementById('punch-modal-id');
  const planEl = document.getElementById('punch-modal-plan');
  const timeEl = document.getElementById('punch-modal-time');
  const expiryBadgeEl = document.getElementById('punch-modal-expiry');

  if (typeEl) {
    typeEl.textContent = punchType === 'Check-In' ? 'PUNCH IN RECORDED' : 'PUNCH OUT RECORDED';
    typeEl.className = punchType === 'Check-In' ? 'text-orange-600 font-extrabold text-xs uppercase tracking-widest' : 'text-sky-600 font-extrabold text-xs uppercase tracking-widest';
  }
  if (nameEl) nameEl.textContent = member.name;
  if (idEl) idEl.textContent = member.id + ' • +91 ' + member.phone;
  if (planEl) planEl.textContent = member.planName;
  if (timeEl) timeEl.textContent = timeStr;

  const days = daysLeft !== undefined ? daysLeft : getDaysRemaining(member.expiryDate);
  if (expiryBadgeEl) {
    if (days < 0) {
      expiryBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200';
      expiryBadgeEl.textContent = `EXPIRED (${Math.abs(days)}d ago)`;
    } else if (days <= 2) {
      expiryBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse';
      expiryBadgeEl.textContent = `EXPIRING IN ${days} DAY${days > 1 ? 'S' : ''}!`;
    } else {
      expiryBadgeEl.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
      expiryBadgeEl.textContent = `Active (${days} days left)`;
    }
  }

  modal.classList.add('active');
}

// 7. Dynamic QR Generator for Member Card
function generateQrSvg(text) {
  const encoded = encodeURIComponent(text);
  // High-contrast black QR on crisp white background for phone cameras and paper printing
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&bgcolor=ffffff&color=0f172a&margin=1`;
}

function showMemberIdCard(memberId) {
  const members = getMembers();
  const member = members.find(m => m.id === memberId);
  if (!member) return;

  const cardModal = document.getElementById('id-card-modal');
  if (!cardModal) return;

  const nameEl = document.getElementById('card-name');
  const idEl = document.getElementById('card-id');
  const phoneEl = document.getElementById('card-phone');
  const planEl = document.getElementById('card-plan');
  const expiryEl = document.getElementById('card-expiry');
  const qrImg = document.getElementById('card-qr-img');
  const waWelcomeBtn = document.getElementById('card-wa-welcome');

  if (nameEl) nameEl.textContent = member.name;
  if (idEl) idEl.textContent = member.id;
  if (phoneEl) phoneEl.textContent = '+91 ' + member.phone;
  if (planEl) planEl.textContent = member.planName;
  if (expiryEl) expiryEl.textContent = member.expiryDate;

  if (qrImg) {
    qrImg.src = generateQrSvg(member.id);
  }

  if (waWelcomeBtn) {
    const welcomeMsg = encodeURIComponent(
      `👋 *WELCOME TO OG FITNESS FAMILY!*\n\n` +
      `Namaste *${member.name}* Ji,\n` +
      `Aapka OG Fitness membership pass ready hai!\n\n` +
      `🪪 *Member ID:* ${member.id}\n` +
      `🏋️ *Plan:* ${member.planName}\n` +
      `📅 *Valid Until:* ${member.expiryDate}\n\n` +
      `Gym aate waqt reception desk par apna Member ID ya Phone number batayein ya Desk QR scan karein. Let's make gains together! 💪🔥`
    );
    waWelcomeBtn.href = `https://wa.me/91${member.phone}?text=${welcomeMsg}`;
  }

  cardModal.classList.add('active');
}

// 8. Notifications / Toasts (SolarZent Clean White)
function showNotification(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  let icon = '<i class="fa-solid fa-circle-info text-sky-500"></i>';
  let borderClass = 'border-slate-200';

  if (type === 'success') {
    icon = '<i class="fa-solid fa-circle-check text-emerald-600"></i>';
    borderClass = 'border-emerald-200';
  } else if (type === 'warning') {
    icon = '<i class="fa-solid fa-triangle-exclamation text-amber-500"></i>';
    borderClass = 'border-amber-200';
  } else if (type === 'error') {
    icon = '<i class="fa-solid fa-circle-xmark text-rose-500"></i>';
    borderClass = 'border-rose-200';
  }

  toast.className = `p-4 rounded-2xl border ${borderClass} bg-white text-slate-900 shadow-xl flex items-center gap-3 text-xs sm:text-sm font-semibold max-w-md transform translate-y-2 transition-all duration-300`;
  toast.innerHTML = `${icon} <span class="flex-1 text-slate-800 leading-snug">${msg}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-4');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// 9. UI Rendering Functions (SolarZent White Theme, Black Text)
function renderAllViews() {
  renderMetrics();
  renderOnFloorTable();
  renderExpiryAlerts();
  renderMembersTable();
  renderDailyReportForDate(selectedReportDate);
}

// Dashboard Period State & Filter Engine
let selectedDashboardPeriod = 'this_month';

function isDateInPeriod(dateStr, period) {
  if (!dateStr || period === 'all') return true;

  const now = new Date();
  const todayStr = getTodayDateString();

  if (period === 'today') {
    return dateStr === todayStr;
  }

  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return false;

  if (period === 'this_week') {
    const startOfWeek = new Date(now);
    const day = now.getDay();
    startOfWeek.setDate(now.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return d >= startOfWeek && d <= endOfWeek;
  }

  if (period === 'this_month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  if (period === 'last_month') {
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
  }

  if (period === 'this_year') {
    return d.getFullYear() === now.getFullYear();
  }

  return true;
}

function setDashboardPeriod(period) {
  selectedDashboardPeriod = period;

  const periods = ['today', 'this_week', 'this_month', 'last_month', 'this_year', 'all'];
  periods.forEach(p => {
    const btn = document.getElementById(`period-btn-${p}`);
    if (btn) {
      if (p === period) {
        btn.className = 'px-3 py-1.5 rounded-lg bg-orange-600 text-white font-bold shadow-sm shadow-orange-500/30 transition flex-shrink-0';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex-shrink-0';
      }
    }
  });

  renderMetrics();
}

function renderMetrics() {
  const members = getMembers();
  const attendance = getAttendance();

  // Filter members by joinDate according to selectedDashboardPeriod
  const periodMembers = selectedDashboardPeriod === 'all'
    ? members
    : members.filter(m => isDateInPeriod(m.joinDate, selectedDashboardPeriod));

  // Filter attendance punches according to selectedDashboardPeriod
  const periodAtt = attendance.filter(a => isDateInPeriod(a.date, selectedDashboardPeriod));

  const todayAtt = attendance.filter(a => a.date === TODAY_STR);
  const onFloor = todayAtt.filter(a => !a.checkOutTime);
  const expiring2Days = getExpiringMembers(2);

  // Revenue for period
  let totalRevenue = 0;
  periodMembers.forEach(m => {
    totalRevenue += (m.feesPaid || 0);
  });

  const mCountEl = document.getElementById('metric-total-members');
  const attCountEl = document.getElementById('metric-today-attendance');
  const floorCountEl = document.getElementById('metric-on-floor');
  const expiringCountEl = document.getElementById('metric-expiring-2days');
  const revenueEl = document.getElementById('metric-total-revenue');

  const mLabelEl = document.getElementById('metric-members-label');
  const attLabelEl = document.getElementById('metric-attendance-label');
  const revLabelEl = document.getElementById('metric-revenue-label');

  if (mCountEl) mCountEl.textContent = periodMembers.length;
  if (attCountEl) attCountEl.textContent = periodAtt.length;
  if (floorCountEl) floorCountEl.textContent = onFloor.length;
  if (expiringCountEl) expiringCountEl.textContent = expiring2Days.length;
  if (revenueEl) revenueEl.textContent = '₹' + totalRevenue.toLocaleString('en-IN');

  const periodNames = {
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year',
    all: 'All Time'
  };
  const pName = periodNames[selectedDashboardPeriod] || 'This Month';

  if (mLabelEl) mLabelEl.textContent = `Members (${pName})`;
  if (attLabelEl) attLabelEl.textContent = `Punches (${pName})`;
  if (revLabelEl) revLabelEl.textContent = `Revenue (${pName})`;
}

function renderOnFloorTable() {
  const container = document.getElementById('on-floor-container');
  const dedicatedContainer = document.getElementById('on-floor-container-dedicated');

  const attendance = getAttendance();
  const onFloor = attendance.filter(a => a.date === TODAY_STR && !a.checkOutTime);
  const settings = getGymSettings();
  const autoCheckoutMins = parseInt(settings.autoCheckoutMinutes) || 90;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const html = onFloor.length === 0 ? `
    <div class="text-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
      <i class="fa-solid fa-person-running text-3xl mb-2 text-slate-300 block"></i>
      <span class="text-xs font-medium">Gym floor par filhal koi checked-in nahi hai.</span>
    </div>` : onFloor.map(rec => {
      const inMins = parseTimeStrToMinutes(rec.checkInTime);
      let durationBadge = '';
      if (inMins !== null) {
        const elapsed = Math.max(0, nowMins - inMins);
        const remaining = Math.max(0, autoCheckoutMins - elapsed);
        durationBadge = `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="Auto-checkout in ${remaining} minutes">
            <i class="fa-solid fa-stopwatch text-[9px]"></i>
            <span>${elapsed > 0 ? elapsed + 'm in gym' : 'Just now'} &bull; auto-out in ${remaining}m</span>
          </span>
        `;
      }

      return `
    <div class="p-3.5 sm:p-4 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition shadow-sm">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-xs shadow-sm flex-shrink-0">
          ${rec.memberName.split(' ').map(n=>n[0]).join('')}
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs sm:text-sm font-bold text-slate-900">${rec.memberName}</span>
            ${durationBadge}
          </div>
          <div class="text-[11px] text-slate-500 font-mono mt-0.5">${rec.memberId} &bull; Check-in: <span class="text-emerald-700 font-bold">${rec.checkInTime}</span></div>
        </div>
      </div>
      <button onclick="punchAttendance('${rec.memberId}')" class="self-end sm:self-center px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
        <i class="fa-solid fa-arrow-right-from-bracket"></i>
        <span>Punch Out</span>
      </button>
    </div>
      `;
    }).join('');

  if (container) container.innerHTML = html;
  if (dedicatedContainer) dedicatedContainer.innerHTML = html;
}

async function clearFloorNow() {
  const attendance = getAttendance();
  const onFloor = attendance.filter(a => a.date === TODAY_STR && !a.checkOutTime);
  if (onFloor.length === 0) {
    showNotification('Gym floor par filhal koi checked-in member nahi hai.', 'info');
    return;
  }

  if (!confirm(`Kya aap floor ke sabhi ${onFloor.length} active members ko Checkout mark karna chahte hain?`)) {
    return;
  }

  const nowFormatted = getCurrentTimeFormatted();
  attendance.forEach(rec => {
    if (!rec.checkOutTime && (rec.date === TODAY_STR || rec.date < TODAY_STR)) {
      rec.checkOutTime = nowFormatted;
      rec.status = 'Completed';
    }
  });
  saveAttendance(attendance);
  renderAllViews();

  try {
    const res = await fetch('/api/attendance/clear-floor', { method: 'POST' });
    if (res.ok) {
      const result = await res.json();
      showNotification(`🧹 Floor Cleared! ${result.clearedCount || onFloor.length} members checked out.`, 'success');
    }
  } catch (err) {
    showNotification(`🧹 Floor cleared: ${onFloor.length} members checked out.`, 'success');
  }
}

function renderExpiryAlerts() {
  const container = document.getElementById('expiry-alerts-list');
  const badgeEl = document.getElementById('expiry-banner-count');
  if (!container) return;

  const expiring = getExpiringMembers(2);
  const expired = getExpiredMembers();
  const allAlerts = [...expiring, ...expired];

  if (badgeEl) badgeEl.textContent = expiring.length;

  if (allAlerts.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-slate-500 bg-emerald-50/40 rounded-xl border border-emerald-200">
        <i class="fa-solid fa-shield-heart text-3xl mb-2 text-emerald-600 block"></i>
        <span class="text-xs font-semibold">Sabhi members ki membership safe hai! Next 2 din me koi expiry nahi hai.</span>
      </div>`;
    return;
  }

  container.innerHTML = allAlerts.map(m => {
    const days = getDaysRemaining(m.expiryDate);
    const isExpired = days < 0;
    const badgeText = isExpired ? `Expired (${Math.abs(days)}d ago)` : `Expiring in ${days} Day${days > 1 ? 's' : ''}!`;
    const badgeBg = isExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50/50 border-amber-200';
    const badgeTag = isExpired ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse';

    return `
      <div class="p-4 rounded-2xl bg-white border ${badgeBg} flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl ${isExpired ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center font-bold text-sm flex-shrink-0">
            <i class="fa-solid fa-bell"></i>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-bold text-slate-900">${m.name}</span>
              <span class="text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold">${m.id}</span>
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeTag}">${badgeText}</span>
            </div>
            <div class="text-xs text-slate-600 mt-1">
              Plan: <span class="text-slate-900 font-semibold">${m.planName}</span> &bull; 
              Expiry Date: <span class="text-slate-900 font-bold font-mono">${m.expiryDate}</span> &bull; 
              Phone: <span class="text-slate-700 font-mono font-medium">+91 ${m.phone}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center flex-wrap">
          <button onclick="sendSingleWhatsAppAuto('${m.id}')" title="Send direct via WhatsApp Gateway" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition">
            <i class="fa-solid fa-paper-plane text-xs"></i>
            <span>Auto Send</span>
          </button>
          <button onclick="sendWhatsAppReminder('${m.id}')" title="Open 1-Click WhatsApp Web/App" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-emerald-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition">
            <i class="fa-brands fa-whatsapp text-sm"></i>
            <span>1-Click</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function setMemberDirectoryDateQuick(period) {
  const dateSelect = document.getElementById('member-date-filter');
  const customDateInput = document.getElementById('member-custom-date');

  if (dateSelect) dateSelect.value = period;
  if (customDateInput) {
    if (period === 'custom') {
      customDateInput.classList.remove('hidden');
    } else {
      customDateInput.classList.add('hidden');
    }
  }

  // Update pill active styles
  const pills = ['all', 'today', 'this_week', 'this_month', 'last_month', 'this_year'];
  pills.forEach(p => {
    const pill = document.getElementById(`dir-pill-${p}`);
    if (pill) {
      if (p === period) {
        pill.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 transition';
      } else {
        pill.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition';
      }
    }
  });

  renderMembersTable();
}

function renderMembersTable(
  searchQuery = document.getElementById('member-search-input')?.value || '',
  statusFilter = document.getElementById('member-status-filter')?.value || 'all',
  dateFilter = document.getElementById('member-date-filter')?.value || 'all',
  customDate = document.getElementById('member-custom-date')?.value || ''
) {
  const tbody = document.getElementById('members-table-body');
  if (!tbody) return;

  let members = getMembers();

  // 1. Search Query Filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    members = members.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.phone.includes(q) || 
      m.id.toLowerCase().includes(q)
    );
  }

  // 2. Status Filter
  if (statusFilter !== 'all') {
    members = members.filter(m => {
      const days = getDaysRemaining(m.expiryDate);
      if (statusFilter === 'expiring') return days > 0 && days <= 2;
      if (statusFilter === 'expired') return days < 0;
      if (statusFilter === 'active') return days > 2;
      return true;
    });
  }

  // 3. Joining Date Period Filter
  if (dateFilter && dateFilter !== 'all') {
    if (dateFilter === 'custom' && customDate) {
      members = members.filter(m => m.joinDate === customDate);
    } else if (dateFilter !== 'custom') {
      members = members.filter(m => isDateInPeriod(m.joinDate, dateFilter));
    }
  }

  // Update count badge in header
  const countBadge = document.getElementById('directory-count-badge');
  if (countBadge) countBadge.textContent = `${members.length} Member${members.length === 1 ? '' : 's'}`;

  if (members.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-12 text-slate-500">
          <div class="max-w-sm mx-auto space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl mx-auto shadow-sm">
              <i class="fa-solid fa-users-slash"></i>
            </div>
            <div>
              <h4 class="font-bold text-slate-900 text-sm">Koi member nahi mila</h4>
              <p class="text-xs text-slate-400 mt-1">Chune gaye search ya date filter me koi member match nahi ho raha.</p>
            </div>
            <button onclick="setMemberDirectoryDateQuick('all')" class="btn-solar px-4 py-2 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5">
              <i class="fa-solid fa-rotate-left"></i>
              <span>Reset Date Filter</span>
            </button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = members.map(m => {
    const days = getDaysRemaining(m.expiryDate);
    let statusBadge = '';
    if (days < 0) {
      statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">Expired</span>';
    } else if (days <= 2) {
      statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">2 Days Left</span>`;
    } else {
      statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>`;
    }

    const due = Math.max(0, (m.feesTotal || 0) - (m.feesPaid || 0));

    return `
      <tr data-member-id="${m.id}" class="border-b border-slate-100 hover:bg-slate-50/80 transition">
        <td class="py-3.5 px-4 font-mono text-xs font-bold text-orange-600">${m.id}</td>
        <td class="py-3.5 px-4">
          <div class="text-xs sm:text-sm font-bold text-slate-900">${m.name}</div>
          <div class="text-[11px] text-slate-500 font-mono">+91 ${m.phone}</div>
        </td>
        <td class="py-3.5 px-4">
          <div class="text-xs font-semibold text-slate-800">${m.planName}</div>
          <div class="text-[11px] text-slate-500">Valid: <span class="font-mono text-slate-700 font-medium">${m.expiryDate}</span></div>
        </td>
        <td class="py-3.5 px-4">${statusBadge}</td>
        <td class="py-3.5 px-4 text-xs font-mono">
          <div class="text-slate-900 font-bold">₹${(m.feesPaid || 0).toLocaleString('en-IN')}</div>
          ${due > 0 ? `<div class="text-[10px] text-red-600 font-bold">Due: ₹${due}</div>` : `<div class="text-[10px] text-emerald-600 font-semibold">Paid in full</div>`}
        </td>
        <td class="py-3.5 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="showMemberIdCard('${m.id}')" title="View Pass & QR" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 border border-slate-200 flex items-center justify-center transition shadow-sm">
              <i class="fa-solid fa-qrcode text-xs"></i>
            </button>
            <button onclick="sendWhatsAppReminder('${m.id}')" title="Send WhatsApp Message" class="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition shadow-sm">
              <i class="fa-brands fa-whatsapp text-sm"></i>
            </button>
            <button onclick="punchAttendance('${m.id}')" title="Punch In/Out" class="w-8 h-8 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center transition shadow-sm">
              <i class="fa-solid fa-fingerprint text-xs"></i>
            </button>
            <button onclick="openDeleteMemberModal('${m.id}')" title="Gym chhod kar gaye / Delete Member" class="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center transition shadow-sm">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ----------------------------------------------------
// Member Deletion Engine (Gym chhod kar jaane wale)
// ----------------------------------------------------
let pendingDeleteMemberId = null;

function openDeleteMemberModal(memberId) {
  const members = getMembers();
  const member = members.find(m => m.id === memberId);
  if (!member) return;

  pendingDeleteMemberId = memberId;
  const nameEl = document.getElementById('delete-modal-name');
  const idEl = document.getElementById('delete-modal-id');
  const phoneEl = document.getElementById('delete-modal-phone');
  const targetInput = document.getElementById('delete-modal-target-id');

  if (nameEl) nameEl.textContent = member.name;
  if (idEl) idEl.textContent = member.id;
  if (phoneEl) phoneEl.textContent = '+91 ' + member.phone;
  if (targetInput) targetInput.value = member.id;

  const modal = document.getElementById('delete-member-modal');
  if (modal) modal.classList.add('active');
}

function closeDeleteMemberModal() {
  pendingDeleteMemberId = null;
  const modal = document.getElementById('delete-member-modal');
  if (modal) modal.classList.remove('active');
}

async function executeDeleteMember() {
  const targetId = pendingDeleteMemberId || document.getElementById('delete-modal-target-id')?.value;
  if (!targetId) return;

  let members = getMembers();
  const deletedMember = members.find(m => m.id === targetId);
  const memberName = deletedMember ? deletedMember.name : targetId;

  // Filter out from local database
  members = members.filter(m => m.id !== targetId);
  saveMembers(members);

  // Call backend deletion endpoint
  try {
    await fetch('/api/members/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: targetId })
    });
  } catch(e) {}

  closeDeleteMemberModal();
  renderAllViews();
  showNotification(`🗑️ Member ${memberName} ko gym database se hata diya gaya.`, 'info');
}

// ----------------------------------------------------
// Daily Reports Engine (Multi-Date Selector & PDF)
// ----------------------------------------------------
let selectedReportDate = TODAY_STR;

function setReportDatePreset(preset) {
  const d = new Date();
  if (preset === 'today') {
    // Current date
  } else if (preset === 'yesterday') {
    d.setDate(d.getDate() - 1);
  } else if (preset === '2days_ago') {
    d.setDate(d.getDate() - 2);
  } else if (preset === '3days_ago') {
    d.setDate(d.getDate() - 3);
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  selectedReportDate = `${y}-${m}-${day}`;

  // Update preset button active styles
  ['today', 'yesterday', '2days', '3days'].forEach(p => {
    const btn = document.getElementById(`rep-btn-${p}`);
    if (btn) {
      const isTarget = (preset === 'today' && p === 'today') ||
                       (preset === 'yesterday' && p === 'yesterday') ||
                       (preset === '2days_ago' && p === '2days') ||
                       (preset === '3days_ago' && p === '3days');
      if (isTarget) {
        btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 transition';
      } else {
        btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition';
      }
    }
  });

  const picker = document.getElementById('report-custom-date');
  if (picker) picker.value = selectedReportDate;

  renderDailyReportForDate(selectedReportDate);
}

function onReportCustomDateChange(val) {
  if (!val) return;
  selectedReportDate = val;

  // Clear presets
  ['today', 'yesterday', '2days', '3days'].forEach(p => {
    const btn = document.getElementById(`rep-btn-${p}`);
    if (btn) btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition';
  });

  renderDailyReportForDate(selectedReportDate);
}

function renderDailyReportForDate(dateStr) {
  const members = getMembers();
  const attendance = getAttendance();
  const settings = getGymSettings();

  // Selected date elements
  const dateDisplay = document.getElementById('rep-selected-date-display');
  const weekdayDisplay = document.getElementById('rep-selected-weekday');
  const gymNameEl = document.getElementById('report-gym-name');

  if (gymNameEl) gymNameEl.textContent = (settings.gymName || 'OG FITNESS').toUpperCase();

  const dObj = new Date(dateStr + 'T00:00:00');
  if (dateDisplay) dateDisplay.textContent = dateStr;
  if (weekdayDisplay) {
    weekdayDisplay.textContent = isNaN(dObj.getTime()) ? '' : dObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // 1. Footfall / Punches on this date
  const dayPunches = attendance.filter(a => a.date === dateStr);

  // 2. New Admissions on this date
  const dayAdmissions = members.filter(m => m.joinDate === dateStr);

  // 3. Revenue on this date (from new admissions / payments made on that date)
  let dayRevenue = 0;
  dayAdmissions.forEach(m => {
    dayRevenue += (m.feesPaid || 0);
  });

  // 4. Expiries on this date (whose membership expired on this date)
  const dayExpiries = members.filter(m => m.expiryDate === dateStr);

  // Update KPI Cards
  const kpiPunches = document.getElementById('rep-kpi-punches');
  const kpiAdmissions = document.getElementById('rep-kpi-admissions');
  const kpiRevenue = document.getElementById('rep-kpi-revenue');
  const kpiExpiries = document.getElementById('rep-kpi-expiries');

  if (kpiPunches) kpiPunches.textContent = dayPunches.length;
  if (kpiAdmissions) kpiAdmissions.textContent = dayAdmissions.length;
  if (kpiRevenue) kpiRevenue.textContent = '₹' + dayRevenue.toLocaleString('en-IN');
  if (kpiExpiries) kpiExpiries.textContent = dayExpiries.length;

  // Badges
  const admBadge = document.getElementById('rep-admissions-badge');
  if (admBadge) admBadge.textContent = `${dayAdmissions.length} Joined`;

  const attBadge = document.getElementById('rep-attendance-badge');
  if (attBadge) attBadge.textContent = `${dayPunches.length} Punches`;

  const expBadge = document.getElementById('rep-expiries-badge');
  if (expBadge) expBadge.textContent = `${dayExpiries.length} Expired`;

  // Render Section A: New Admissions
  const admContainer = document.getElementById('rep-admissions-container');
  if (admContainer) {
    if (dayAdmissions.length === 0) {
      admContainer.innerHTML = `
        <div class="text-center py-6 text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs">
          Is tareekh (${dateStr}) par koi naya member admission nahi hua.
        </div>`;
    } else {
      admContainer.innerHTML = `
        <div class="overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th class="py-2.5 px-3">Member ID</th>
                <th class="py-2.5 px-3">Name & Contact</th>
                <th class="py-2.5 px-3">Selected Plan</th>
                <th class="py-2.5 px-3">Valid Until</th>
                <th class="py-2.5 px-3 text-right">Fee Collected</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${dayAdmissions.map(m => `
                <tr class="hover:bg-slate-50/50">
                  <td class="py-2.5 px-3 font-mono font-bold text-orange-600">${m.id}</td>
                  <td class="py-2.5 px-3">
                    <span class="font-bold text-slate-900">${m.name}</span>
                    <span class="text-slate-400 font-mono text-[11px] ml-1.5">+91 ${m.phone}</span>
                  </td>
                  <td class="py-2.5 px-3 text-slate-700">${m.planName}</td>
                  <td class="py-2.5 px-3 font-mono text-slate-600">${m.expiryDate}</td>
                  <td class="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">₹${(m.feesPaid || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }
  }

  // Render Section B: Attendance Punches
  const attContainer = document.getElementById('rep-attendance-container');
  if (attContainer) {
    if (dayPunches.length === 0) {
      attContainer.innerHTML = `
        <div class="text-center py-6 text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs">
          Is tareekh (${dateStr}) par koi attendance punch record nahi hai.
        </div>`;
    } else {
      attContainer.innerHTML = dayPunches.map(a => `
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs hover:bg-white transition shadow-sm">
          <div class="flex items-center gap-3">
            <span class="w-2.5 h-2.5 rounded-full ${a.checkOutTime ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}"></span>
            <div>
              <span class="font-bold text-slate-900">${a.memberName}</span>
              <span class="text-slate-500 font-mono ml-1.5">(${a.memberId})</span>
            </div>
          </div>
          <div class="text-right font-mono text-slate-600">
            <span>In: <b class="text-slate-900 font-bold">${a.checkInTime}</b></span>
            ${a.checkOutTime ? `<span class="ml-2.5 text-slate-400">| Out: <b class="text-slate-700">${a.checkOutTime}</b></span>` : `<span class="ml-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">On Floor</span>`}
          </div>
        </div>
      `).join('');
    }
  }

  // Render Section C: Expiries
  const expContainer = document.getElementById('rep-expiries-container');
  if (expContainer) {
    if (dayExpiries.length === 0) {
      expContainer.innerHTML = `
        <div class="text-center py-5 text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs">
          Is tareekh (${dateStr}) par kisi bhi member ki membership expire nahi hui.
        </div>`;
    } else {
      expContainer.innerHTML = dayExpiries.map(m => `
        <div class="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2.5">
            <i class="fa-solid fa-triangle-exclamation text-rose-500"></i>
            <div>
              <span class="font-bold text-slate-900">${m.name}</span>
              <span class="text-slate-500 font-mono ml-1">(${m.id})</span>
              <span class="text-[11px] text-slate-600 ml-2">&bull; ${m.planName}</span>
            </div>
          </div>
          <button onclick="sendWhatsAppReminder('${m.id}')" class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition">
            <i class="fa-brands fa-whatsapp"></i>
            <span>Send Reminder</span>
          </button>
        </div>
      `).join('');
    }
  }
}

function downloadDailyReportPDF() {
  document.body.classList.add('print-report');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('print-report');
  }, 1000);
}

function exportDailyReportCSV() {
  const members = getMembers();
  const attendance = getAttendance().filter(a => a.date === selectedReportDate);
  const admissions = members.filter(m => m.joinDate === selectedReportDate);

  let csv = `OG FITNESS - DAILY AUDIT REPORT (${selectedReportDate})\n\n`;
  csv += `SECTION 1: NEW ADMISSIONS ON ${selectedReportDate}\n`;
  csv += `Member ID,Name,Phone,Plan,Fees Paid\n`;
  admissions.forEach(m => {
    csv += `"${m.id}","${m.name}","${m.phone}","${m.planName}",${m.feesPaid || 0}\n`;
  });

  csv += `\nSECTION 2: ATTENDANCE & PUNCH LOGS ON ${selectedReportDate}\n`;
  csv += `Member ID,Member Name,Check-In Time,Check-Out Time,Status\n`;
  attendance.forEach(a => {
    csv += `"${a.memberId}","${a.memberName}","${a.checkInTime}","${a.checkOutTime || 'On Floor'}","${a.status}"\n`;
  });

  const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csv);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `OG_Fitness_Daily_Report_${selectedReportDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ----------------------------------------------------
// Settings & Profile Management Engine
// ----------------------------------------------------
async function loadGymSettings() {
  let settings = getGymSettings();
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const apiSettings = await res.json();
      if (apiSettings && typeof apiSettings === 'object') {
        settings = { ...settings, ...apiSettings };
        saveGymSettingsToStorage(settings);
      }
    }
  } catch(e){}

  applyGymSettings(settings);
}

function applyGymSettings(s) {
  // Update inputs in settings form
  const nameInput = document.getElementById('settings-owner-name');
  const gymInput = document.getElementById('settings-gym-name');
  const phoneInput = document.getElementById('settings-phone');
  const emailInput = document.getElementById('settings-email');
  const addressInput = document.getElementById('settings-address');
  const morningInput = document.getElementById('settings-morning-timing');
  const eveningInput = document.getElementById('settings-evening-timing');
  const upiInput = document.getElementById('settings-upi-id');

  if (nameInput) nameInput.value = s.ownerName || '';
  if (gymInput) gymInput.value = s.gymName || '';
  if (phoneInput) phoneInput.value = s.phone || '';
  if (emailInput) emailInput.value = s.email || '';
  if (addressInput) addressInput.value = s.address || '';
  if (morningInput) morningInput.value = s.morningTiming || '';
  if (eveningInput) eveningInput.value = s.eveningTiming || '';
  if (upiInput) upiInput.value = s.upiId || '';

  const autoCheckoutInput = document.getElementById('settings-auto-checkout-mins');
  if (autoCheckoutInput) autoCheckoutInput.value = s.autoCheckoutMinutes || 90;

  // WhatsApp Gateway Settings
  const wa = s.whatsapp || {};
  const waAuto = document.getElementById('settings-wa-auto');
  const waHour = document.getElementById('settings-wa-hour');
  const waInst = document.getElementById('settings-wa-instance');
  const waTok = document.getElementById('settings-wa-token');
  const waTestPhone = document.getElementById('settings-wa-test-phone');

  if (waAuto) waAuto.checked = wa.autoSendEnabled !== false;
  if (waHour) waHour.value = wa.sendHour || 9;
  if (waInst) waInst.value = wa.instanceId || '';
  if (waTok) waTok.value = wa.token || '';
  if (waTestPhone) waTestPhone.value = wa.testPhone || s.phone || '7440858141';

  // Plan pricing
  if (s.plans && Array.isArray(s.plans)) {
    s.plans.forEach(p => {
      const el = document.getElementById(`settings-plan-${p.id}`);
      if (el) el.value = p.price;
    });
  }

  // Update UI Elements across dashboard
  const initials = (s.ownerName || 'RJ').split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase();

  // Sidebar
  const sbInitials = document.getElementById('sidebar-user-initials');
  const sbImg = document.getElementById('sidebar-user-avatar-img');
  const sbName = document.getElementById('sidebar-owner-name');
  const sbBrand = document.getElementById('sidebar-gym-brand');

  if (sbName) sbName.textContent = s.ownerName;
  if (sbBrand) sbBrand.textContent = `${s.gymName} Owner`;

  // Header
  const hdInitials = document.getElementById('header-user-initials');
  const hdImg = document.getElementById('header-user-avatar-img');

  // Settings tab preview
  const setInitials = document.getElementById('settings-avatar-initials');
  const setImg = document.getElementById('settings-avatar-img');

  if (s.profileImage) {
    if (sbImg) { sbImg.src = s.profileImage; sbImg.classList.remove('hidden'); }
    if (sbInitials) sbInitials.classList.add('hidden');

    if (hdImg) { hdImg.src = s.profileImage; hdImg.classList.remove('hidden'); }
    if (hdInitials) hdInitials.classList.add('hidden');

    if (setImg) { setImg.src = s.profileImage; setImg.classList.remove('hidden'); }
    if (setInitials) setInitials.classList.add('hidden');
  } else {
    if (sbImg) sbImg.classList.add('hidden');
    if (sbInitials) { sbInitials.textContent = initials; sbInitials.classList.remove('hidden'); }

    if (hdImg) hdImg.classList.add('hidden');
    if (hdInitials) { hdInitials.textContent = initials; hdInitials.classList.remove('hidden'); }

    if (setImg) setImg.classList.add('hidden');
    if (setInitials) { setInitials.textContent = initials; setInitials.classList.remove('hidden'); }
  }

  // Report Gym Name
  const repGymName = document.getElementById('report-gym-name');
  if (repGymName) repGymName.textContent = (s.gymName || 'OG FITNESS').toUpperCase();
}

function handleProfilePhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    const settings = getGymSettings();
    settings.profileImage = base64;
    saveGymSettingsToStorage(settings);
    applyGymSettings(settings);
    showNotification('📸 Profile photo uploaded! Save settings to persist.', 'info');
  };
  reader.readAsDataURL(file);
}

function removeProfilePhoto() {
  const settings = getGymSettings();
  settings.profileImage = '';
  saveGymSettingsToStorage(settings);
  applyGymSettings(settings);
  const input = document.getElementById('settings-photo-input');
  if (input) input.value = '';
  showNotification('Profile photo removed.', 'info');
}

async function saveGymSettings() {
  const current = getGymSettings();

  const ownerName = document.getElementById('settings-owner-name')?.value.trim() || current.ownerName;
  const gymName = document.getElementById('settings-gym-name')?.value.trim() || current.gymName;
  const phone = document.getElementById('settings-phone')?.value.trim() || current.phone;
  const email = document.getElementById('settings-email')?.value.trim() || current.email;
  const address = document.getElementById('settings-address')?.value.trim() || current.address;
  const morningTiming = document.getElementById('settings-morning-timing')?.value.trim() || current.morningTiming;
  const eveningTiming = document.getElementById('settings-evening-timing')?.value.trim() || current.eveningTiming;
  const upiId = document.getElementById('settings-upi-id')?.value.trim() || current.upiId;
  const autoCheckoutMinutes = parseInt(document.getElementById('settings-auto-checkout-mins')?.value) || 90;

  // Update plan prices
  const plans = getPlans();
  plans.forEach(p => {
    const el = document.getElementById(`settings-plan-${p.id}`);
    if (el) {
      const newPrice = parseFloat(el.value);
      if (!isNaN(newPrice)) p.price = newPrice;
    }
  });
  localStorage.setItem(DB_KEYS.PLANS, JSON.stringify(plans));

  // WhatsApp Gateway Settings
  const waAuto = document.getElementById('settings-wa-auto')?.checked ?? true;
  const waHour = parseInt(document.getElementById('settings-wa-hour')?.value) || 9;
  const waInstance = document.getElementById('settings-wa-instance')?.value.trim() || '';
  const waToken = document.getElementById('settings-wa-token')?.value.trim() || '';
  const waTestPhone = document.getElementById('settings-wa-test-phone')?.value.trim() || '';

  const whatsapp = {
    autoSendEnabled: waAuto,
    sendHour: waHour,
    instanceId: waInstance,
    token: waToken,
    testPhone: waTestPhone
  };

  const updatedSettings = {
    ...current,
    ownerName,
    gymName,
    phone,
    email,
    address,
    morningTiming,
    eveningTiming,
    upiId,
    autoCheckoutMinutes,
    whatsapp,
    plans
  };

  saveGymSettingsToStorage(updatedSettings);
  applyGymSettings(updatedSettings);

  // Send to backend
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings)
    });
  } catch(e) {}

  showNotification('✅ Gym Settings & Profile successfully saved!', 'success');
}

async function sendTestWhatsAppMessage() {
  const phone = document.getElementById('settings-wa-test-phone')?.value.trim();
  const instanceId = document.getElementById('settings-wa-instance')?.value.trim();
  const token = document.getElementById('settings-wa-token')?.value.trim();
  const statusEl = document.getElementById('wa-test-status');
  const btn = document.getElementById('btn-wa-test');

  if (!phone) {
    showNotification('⚠️ Kripya test mobile number daalein.', 'warning');
    return;
  }
  if (!instanceId || !token) {
    showNotification('⚠️ Kripya UltraMsg Instance ID aur Token fill karein.', 'warning');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
  }
  if (statusEl) {
    statusEl.textContent = 'Sending test WhatsApp message...';
    statusEl.className = 'text-xs font-medium text-slate-500';
  }

  try {
    const res = await fetch('/api/whatsapp/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, instanceId, token })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      if (statusEl) {
        statusEl.textContent = '✅ WhatsApp message sent successfully!';
        statusEl.className = 'text-xs font-bold text-emerald-600';
      }
      showNotification(`✅ Test WhatsApp message sent to ${phone}!`, 'success');
    } else {
      throw new Error(data.error || 'Failed to send');
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = `❌ Error: ${err.message}`;
      statusEl.className = 'text-xs font-bold text-rose-600';
    }
    showNotification(`❌ WhatsApp Error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Send Test</span>';
    }
  }
}

async function triggerAutoWhatsAppBatch() {
  const btn = document.getElementById('auto-whatsapp-batch-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending Auto WhatsApp...';
  }

  try {
    const res = await fetch('/api/whatsapp/trigger-daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showNotification(`🎉 Auto WhatsApp Batch Complete! Sent: ${data.sentCount}, Skipped: ${data.skippedCount}`, 'success');
      renderExpiryAlerts();
    } else {
      if (data.error && data.error.includes('not configured')) {
        showNotification('⚠️ UltraMsg Gateway connect nahi hai. Settings me jakar Instance ID & Token fill karein!', 'warning');
        switchTab('settings');
      } else {
        throw new Error(data.error || 'Batch send failed');
      }
    }
  } catch (err) {
    showNotification(`❌ Error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-bolt"></i> <span>⚡ Run Auto-Send WhatsApp Now</span>';
    }
  }
}

async function sendSingleWhatsAppAuto(memberId) {
  try {
    showNotification('Sending WhatsApp reminder via Gateway...', 'info');
    const res = await fetch('/api/whatsapp/send-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showNotification(data.message, 'success');
      renderExpiryAlerts();
    } else {
      if (data.error && data.error.includes('connect nahi hai')) {
        showNotification('Gateway connect nahi hai, 1-Click WhatsApp open kar rahe hain...', 'info');
        sendWhatsAppReminder(memberId);
      } else {
        throw new Error(data.error || 'Failed');
      }
    }
  } catch (err) {
    showNotification(`Error: ${err.message}. Opening 1-Click WhatsApp...`, 'warning');
    sendWhatsAppReminder(memberId);
  }
}

// 10. Initialization & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initializeDatabase();
  loadGymSettings();
  renderAllViews();
  initRealtimeSync();
  setupDeskStandeeQr();

  // Periodic 60-second floor auto-resolve and countdown ticker
  setInterval(() => {
    renderMetrics();
    renderOnFloorTable();
  }, 60 * 1000);

  // New Member Form Logic
  const newMemberForm = document.getElementById('new-member-form');
  const planSelect = document.getElementById('form-plan-select');
  const joinDateInput = document.getElementById('form-join-date');
  const expiryDateInput = document.getElementById('form-expiry-date');
  const feesInput = document.getElementById('form-fees-total');
  const paidInput = document.getElementById('form-fees-paid');

  if (joinDateInput) joinDateInput.value = TODAY_STR;

  function updateExpiryDate() {
    const plans = getPlans();
    const selectedPlanId = planSelect?.value;
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan || !joinDateInput?.value) return;

    const joinDate = new Date(joinDateInput.value);
    joinDate.setDate(joinDate.getDate() + plan.durationDays);

    const y = joinDate.getFullYear();
    const m = String(joinDate.getMonth() + 1).padStart(2, '0');
    const d = String(joinDate.getDate()).padStart(2, '0');
    if (expiryDateInput) expiryDateInput.value = `${y}-${m}-${d}`;

    if (feesInput && (!feesInput.value || feesInput.dataset.auto === 'true')) {
      feesInput.value = plan.price;
      feesInput.dataset.auto = 'true';
      if (paidInput) paidInput.value = plan.price;
    }
  }

  if (planSelect) planSelect.addEventListener('change', updateExpiryDate);
  if (joinDateInput) joinDateInput.addEventListener('change', updateExpiryDate);
  updateExpiryDate();

  if (newMemberForm) {
    newMemberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const members = getMembers();

      const newId = 'OG-' + (1000 + members.length + 1);
      const name = document.getElementById('form-name').value.trim();
      const phone = document.getElementById('form-phone').value.trim();
      const gender = document.getElementById('form-gender').value;
      const age = parseInt(document.getElementById('form-age')?.value) || 25;
      const planId = planSelect.value;
      const plans = getPlans();
      const plan = plans.find(p => p.id === planId);
      const joinDate = joinDateInput.value || TODAY_STR;
      const expiryDate = expiryDateInput.value;
      const feesTotal = parseFloat(feesInput.value) || (plan ? plan.price : 0);
      const feesPaid = parseFloat(paidInput.value) || feesTotal;

      const newMember = {
        id: newId,
        name,
        phone,
        gender,
        age,
        planId,
        planName: plan?.name || 'Standard Plan',
        joinDate,
        expiryDate,
        feesTotal,
        feesPaid,
        status: 'Active',
        notes: ''
      };

      members.unshift(newMember);
      saveMembers(members);

      // Save to backend server
      try {
        await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMember)
        });
      } catch (err) {}

      audioEngine.playCheckInChime();
      showNotification(`✅ Member ${name} registered successfully! ID: ${newId}`, 'success');

      newMemberForm.reset();
      if (joinDateInput) joinDateInput.value = TODAY_STR;
      updateExpiryDate();

      renderAllViews();

      // Show generated ID pass modal
      showMemberIdCard(newId);
    });
  }

  // Quick Punch Manual Input
  const quickPunchBtn = document.getElementById('quick-punch-submit');
  const quickPunchInput = document.getElementById('quick-punch-input');

  if (quickPunchBtn && quickPunchInput) {
    quickPunchBtn.addEventListener('click', () => {
      const val = quickPunchInput.value.trim();
      if (!val) {
        showNotification('Kripya Member ID ya Mobile number dalein.', 'warning');
        return;
      }
      punchAttendance(val);
      quickPunchInput.value = '';
    });

    quickPunchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        quickPunchBtn.click();
      }
    });
  }

  // Search & Filters in member directory
  const searchInput = document.getElementById('member-search-input');
  const statusFilterSelect = document.getElementById('member-status-filter');
  const dateFilterSelect = document.getElementById('member-date-filter');
  const customDateInput = document.getElementById('member-custom-date');

  function triggerMemberFilter() {
    renderMembersTable(
      searchInput?.value || '',
      statusFilterSelect?.value || 'all',
      dateFilterSelect?.value || 'all',
      customDateInput?.value || ''
    );
  }

  if (searchInput) searchInput.addEventListener('input', triggerMemberFilter);
  if (statusFilterSelect) statusFilterSelect.addEventListener('change', triggerMemberFilter);
  if (dateFilterSelect) {
    dateFilterSelect.addEventListener('change', () => {
      const val = dateFilterSelect.value;
      if (val === 'custom') {
        if (customDateInput) customDateInput.classList.remove('hidden');
      } else {
        if (customDateInput) customDateInput.classList.add('hidden');
      }

      // Update pills
      const pills = ['all', 'today', 'this_week', 'this_month', 'last_month', 'this_year'];
      pills.forEach(p => {
        const pill = document.getElementById(`dir-pill-${p}`);
        if (pill) {
          if (p === val) {
            pill.className = 'px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 transition';
          } else {
            pill.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition';
          }
        }
      });

      triggerMemberFilter();
    });
  }
  if (customDateInput) customDateInput.addEventListener('change', triggerMemberFilter);

  // Modal Closers
  document.querySelectorAll('.close-portal-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.portal-modal').forEach(m => m.classList.remove('active'));
    });
  });
});

// 11. Live Camera QR Scanner (using Html5Qrcode)
let html5QrCode = null;

function startQrScanner() {
  const readerEl = document.getElementById('qr-reader');
  if (!readerEl) return;

  if (typeof Html5Qrcode === 'undefined') {
    console.log('Html5Qrcode library loading...');
    return;
  }

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('qr-reader');
    }

    const config = { fps: 10, qrbox: { width: 240, height: 240 } };

    html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        console.log('QR Code Detected:', decodedText);
        // Play scan feedback
        punchAttendance(decodedText.trim());
        // Temporary pause to prevent rapid re-scans
        html5QrCode.pause();
        setTimeout(() => {
          try { html5QrCode.resume(); } catch(e){}
        }, 2500);
      },
      (error) => {
        // Continuous search frame error (normal)
      }
    ).catch(err => {
      console.warn('Camera start error / no camera permission:', err);
      const notice = document.getElementById('camera-permission-notice');
      if (notice) notice.style.display = 'block';
    });
  } catch (err) {
    console.warn('QR scanner init exception:', err);
  }
}

function stopQrScanner() {
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().then(() => {
      console.log('QR Scanner stopped.');
    }).catch(err => console.error(err));
  }
}

// 12. Real-Time Sync & Desk Standee Generator
function initRealtimeSync() {
  // BroadcastChannel listener (instant local sync)
  if (window.BroadcastChannel) {
    try {
      const channel = new BroadcastChannel('og_fitness_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'MEMBER_PUNCH') {
          handleIncomingRemotePunch(event.data.data);
        } else if (event.data?.type === 'MEMBER_DELETED') {
          const members = getMembers().filter(m => m.id !== event.data.data.memberId);
          saveMembers(members);
          renderAllViews();
        } else if (event.data?.type === 'SETTINGS_UPDATED') {
          saveGymSettingsToStorage(event.data.data);
          applyGymSettings(event.data.data);
        }
      };
    } catch(e) {}
  }

  // Server-Sent Events (SSE) listener (live across Wi-Fi devices)
  if (window.EventSource) {
    try {
      const es = new EventSource('/api/events');
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'MEMBER_PUNCH') {
            handleIncomingRemotePunch(payload.data);
          } else if (payload.type === 'FLOOR_CLEARED') {
            syncAttendanceFromBackend();
            showNotification(`🧹 Floor Cleared: ${payload.data.clearedCount} active members checked out at ${payload.data.time}.`, 'info');
          } else if (payload.type === 'WHATSAPP_AUTO_SENT') {
            showNotification(`📲 Auto WhatsApp Sent to ${payload.data.memberName} (${payload.data.phone})`, 'success');
          } else if (payload.type === 'MEMBER_DELETED') {
            const members = getMembers().filter(m => m.id !== payload.data.memberId);
            saveMembers(members);
            renderAllViews();
          } else if (payload.type === 'SETTINGS_UPDATED') {
            saveGymSettingsToStorage(payload.data);
            applyGymSettings(payload.data);
          }
        } catch(e) {}
      };
    } catch(e) {}
  }
}

async function syncAttendanceFromBackend() {
  try {
    const res = await fetch('/api/attendance');
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        localStorage.setItem(DB_KEYS.ATTENDANCE, JSON.stringify(list));
        renderAllViews();
      }
    }
  } catch(e) {}
}

function handleIncomingRemotePunch(data) {
  audioEngine.playCheckInChime();

  const punchType = data.punchType || 'Check-In';
  showNotification(`🔔 Real-Time Desk Scan: ${data.memberName} marked ${punchType} at ${data.punchTime}!`, 'success');

  // Verify attendance updated in local storage
  const attendance = getAttendance();
  const existing = attendance.find(a => a.date === TODAY_STR && a.memberId === data.memberId && a.checkInTime === data.punchTime);

  if (!existing) {
    attendance.unshift({
      id: 'att-' + Date.now(),
      date: TODAY_STR,
      memberId: data.memberId,
      memberName: data.memberName,
      checkInTime: data.punchTime,
      checkOutTime: punchType === 'Check-Out' ? data.punchTime : null,
      status: punchType === 'Check-Out' ? 'Completed' : 'On Floor'
    });
    saveAttendance(attendance);
  }

  // Refresh all UI metrics and rosters in real-time
  renderAllViews();
}

async function setupDeskStandeeQr() {
  let punchUrl = `${window.location.origin}/punch.html`;
  try {
    const res = await fetch('/api/info');
    if (res.ok) {
      const info = await res.json();
      if (info.deskPunchUrl) {
        punchUrl = info.deskPunchUrl;
      }
    }
  } catch (e) {}

  const qrImg = document.getElementById('standee-qr-img');
  const urlDisplay = document.getElementById('standee-url-display');
  const testBtn = document.getElementById('standee-test-btn');

  if (qrImg) {
    // Generate crisp QR code pointing to member self-check in page
    qrImg.src = generateQrSvg(punchUrl);
  }
  if (urlDisplay) {
    urlDisplay.textContent = punchUrl;
  }
  if (testBtn) {
    testBtn.href = punchUrl;
  }
}

function printTableStandee() {
  document.body.classList.add('print-standee');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('print-standee');
  }, 1000);
}

