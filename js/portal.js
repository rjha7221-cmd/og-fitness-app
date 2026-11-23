// OG Fitness - Gym Owner Management Portal Engine

// 1. Database & Initial State
const DB_KEYS = {
  MEMBERS: 'og_members',
  ATTENDANCE: 'og_attendance',
  PLANS: 'og_plans',
  PAYMENTS: 'og_payments',
  SETTINGS: 'og_gym_settings',
  EXPENSES: 'og_expenses'
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

  try {
    const resExp = await fetch('/api/expenses');
    if (resExp.ok) {
      const serverExp = await resExp.json();
      if (Array.isArray(serverExp)) {
        localStorage.setItem(DB_KEYS.EXPENSES, JSON.stringify(serverExp));
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

// 5. Excel / CSV Sheet Exporter Helpers
function downloadCsvBlob(filename, csvContent) {
  // Prepend \uFEFF (UTF-8 Byte Order Mark) so Microsoft Excel opens cleanly with UTF-8 encoding
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportMembersToCSV() {
  const members = getMembers();
  if (!members.length) {
    showNotification('Export karne ke liye koi member record nahi hai.', 'warning');
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
    'Total Fees (₹)',
    'Fees Paid (₹)',
    'Pending Due (₹)',
    'Notes'
  ];

  const rows = members.map(m => {
    const daysLeft = getDaysRemaining(m.expiryDate);
    const due = Math.max(0, (m.feesTotal || 0) - (m.feesPaid || 0));
    const cleanPhone = m.phone ? `="${m.phone}"` : '""';
    return [
      `"${m.id}"`,
      `"${(m.name || '').replace(/"/g, '""')}"`,
      cleanPhone,
      `"${m.gender || ''}"`,
      m.age || '',
      `"${(m.planName || '').replace(/"/g, '""')}"`,
      m.joinDate || '',
      m.expiryDate || '',
      daysLeft,
      `"${m.status || 'Active'}"`,
      m.feesTotal || 0,
      m.feesPaid || 0,
      due,
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = headers.join(',') + '\r\n' + rows.join('\r\n');
  downloadCsvBlob(`OG_Fitness_Members_Master_${TODAY_STR}.csv`, csvContent);
  showNotification('📊 Members master directory downloaded as Excel CSV!', 'success');
}

function exportAttendanceToCSV() {
  const attendance = getAttendance();
  if (!attendance.length) {
    showNotification('Export karne ke liye koi attendance record nahi hai.', 'warning');
    return;
  }

  const headers = [
    'Record ID',
    'Date',
    'Member ID',
    'Member Name',
    'Check-In Time',
    'Check-Out Time',
    'Workout Duration',
    'Attendance Status'
  ];

  const rows = attendance.map(a => {
    let durationText = 'Active / On Floor';
    if (a.checkInTime && a.checkOutTime) {
      const inMins = parseTimeStrToMinutes(a.checkInTime);
      const outMins = parseTimeStrToMinutes(a.checkOutTime);
      if (inMins !== null && outMins !== null) {
        durationText = `${Math.max(0, outMins - inMins)} mins`;
      } else {
        durationText = 'Completed';
      }
    }

    return [
      `"${a.id}"`,
      `"${a.date}"`,
      `"${a.memberId}"`,
      `"${(a.memberName || '').replace(/"/g, '""')}"`,
      `"${a.checkInTime || ''}"`,
      `"${a.checkOutTime || 'On Floor'}"`,
      `"${durationText}"`,
      `"${a.status || 'Completed'}"`
    ].join(',');
  });

  const csvContent = headers.join(',') + '\r\n' + rows.join('\r\n');
  downloadCsvBlob(`OG_Fitness_Attendance_${TODAY_STR}.csv`, csvContent);
  showNotification('📊 Attendance punch sheet downloaded as Excel CSV!', 'success');
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

  currentActiveCardMemberId = member.id;

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
  renderBirthdayBanner();
  renderInactiveMembers();
  populateDietMemberSelect();
  renderDietPlanCanvas();
  renderExpensesView();
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
            <button onclick="openReceiptModal('${m.id}')" title="Fees Receipt / WhatsApp Bill" class="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center transition shadow-sm">
              <i class="fa-solid fa-receipt text-xs"></i>
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
  document.body.classList.remove('print-standee', 'print-id-card');
  document.body.classList.add('print-report');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('print-report');
  }, 1000);
}

function printMemberIdCard() {
  document.body.classList.remove('print-standee', 'print-report');
  document.body.classList.add('print-id-card');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('print-id-card');
  }, 1000);
}

function exportDailyReportCSV() {
  const members = getMembers();
  const attendance = getAttendance().filter(a => a.date === selectedReportDate);
  const admissions = members.filter(m => m.joinDate === selectedReportDate);
  const expiries = members.filter(m => m.expiryDate === selectedReportDate);

  const headers = [
    'Audit Date',
    'Activity Category',
    'Member ID',
    'Member Name',
    'Phone Number',
    'Plan Name',
    'Check-In Time',
    'Check-Out Time',
    'Workout Duration',
    'Status',
    'Amount Paid (₹)',
    'Audit Notes'
  ];

  const rows = [];

  // 1. Add Admissions
  admissions.forEach(m => {
    const cleanPhone = m.phone ? `="${m.phone}"` : '""';
    rows.push([
      `"${selectedReportDate}"`,
      `"New Admission"`,
      `"${m.id}"`,
      `"${(m.name || '').replace(/"/g, '""')}"`,
      cleanPhone,
      `"${(m.planName || '').replace(/"/g, '""')}"`,
      `"-"`,
      `"-"`,
      `"-"`,
      `"${m.status || 'Active'}"`,
      m.feesPaid || 0,
      `"Enrolled (Fees: ₹${m.feesTotal || 0})"`
    ].join(','));
  });

  // 2. Add Attendance Records
  attendance.forEach(a => {
    const member = members.find(m => m.id === a.memberId) || {};
    const cleanPhone = member.phone ? `="${member.phone}"` : '""';
    let durationText = 'Active / On Floor';
    if (a.checkInTime && a.checkOutTime) {
      const inM = parseTimeStrToMinutes(a.checkInTime);
      const outM = parseTimeStrToMinutes(a.checkOutTime);
      if (inM !== null && outM !== null) {
        durationText = `${Math.max(0, outM - inM)} mins`;
      } else {
        durationText = 'Completed';
      }
    }

    rows.push([
      `"${selectedReportDate}"`,
      `"Attendance Punch"`,
      `"${a.memberId}"`,
      `"${(a.memberName || '').replace(/"/g, '""')}"`,
      cleanPhone,
      `"${(member.planName || '-').replace(/"/g, '""')}"`,
      `"${a.checkInTime || ''}"`,
      `"${a.checkOutTime || 'On Floor'}"`,
      `"${durationText}"`,
      `"${a.status || 'Completed'}"`,
      0,
      `"Floor workout session"`
    ].join(','));
  });

  // 3. Add Expired Members
  expiries.forEach(m => {
    const cleanPhone = m.phone ? `="${m.phone}"` : '""';
    rows.push([
      `"${selectedReportDate}"`,
      `"Membership Expired"`,
      `"${m.id}"`,
      `"${(m.name || '').replace(/"/g, '""')}"`,
      cleanPhone,
      `"${(m.planName || '').replace(/"/g, '""')}"`,
      `"-"`,
      `"-"`,
      `"-"`,
      `"Expired"`,
      0,
      `"Plan expired on ${selectedReportDate} - Renewal due"`
    ].join(','));
  });

  if (rows.length === 0) {
    rows.push([
      `"${selectedReportDate}"`,
      `"Summary"`,
      `"-"`,
      `"-"`,
      `"-"`,
      `"-"`,
      `"-"`,
      `"-"`,
      `"-"`,
      `"No Activity"`,
      0,
      `"No admissions or attendance recorded on this date"`
    ].join(','));
  }

  const csvContent = headers.join(',') + '\r\n' + rows.join('\r\n');
  downloadCsvBlob(`OG_Fitness_Daily_Audit_${selectedReportDate}.csv`, csvContent);
  showNotification(`📊 Daily audit report for ${selectedReportDate} downloaded as Excel CSV!`, 'success');
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
      const dob = document.getElementById('form-dob')?.value || '';
      const paymentMode = document.getElementById('form-payment-mode')?.value || 'UPI';
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
        dob,
        paymentMode,
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
  document.body.classList.remove('print-report', 'print-id-card');
  document.body.classList.add('print-standee');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('print-standee');
  }, 1000);
}

// ========================================================
// CORE SUPER-GYM SUITE: 5 FEATURES IMPLEMENTATION
// ========================================================

// Generic 1-Click WhatsApp Sender (UltraMsg Server Gateway + wa.me Fallback)
async function sendCustomWhatsAppMessage(phone, message, title = 'WhatsApp Message') {
  let cleanPhone = String(phone).replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  // 1. Try automated background gateway first
  try {
    const res = await fetch('/api/whatsapp/send-custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, message, title })
    });
    const result = await res.json();
    if (result.success) {
      showNotification(`📲 WhatsApp sent to +${cleanPhone}!`, 'success');
      return true;
    }
  } catch (e) {}

  // 2. Direct 1-Click Fallback to WhatsApp Web / Mobile App
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  showNotification(`📲 Opening WhatsApp for +${cleanPhone}...`, 'info');
  return true;
}

// --------------------------------------------------------
// FEATURE 1: 1-Click WhatsApp Fees Receipt / Bill & Slip
// --------------------------------------------------------
let currentReceiptMember = null;
let currentActiveCardMemberId = null;

function buildReceiptText(member, receiptNo) {
  const settings = getGymSettings();
  const gymName = settings.gymName || 'OG Fitness';
  const phone = settings.phone || '9876543210';
  const total = (member.feesTotal || 0).toLocaleString('en-IN');
  const paid = (member.feesPaid || 0).toLocaleString('en-IN');
  const due = Math.max(0, (member.feesTotal || 0) - (member.feesPaid || 0));
  const dueStr = due > 0 ? `₹${due.toLocaleString('en-IN')} (Pending)` : `₹0 (Paid in Full ✅)`;
  const payMode = member.paymentMode || 'UPI';

  return `🧾 *${gymName.toUpperCase()} - OFFICIAL PAYMENT RECEIPT* 🧾\n` +
    `----------------------------------------\n` +
    `*Receipt No:* ${receiptNo}\n` +
    `*Date:* ${TODAY_STR}\n` +
    `*Member Name:* ${member.name}\n` +
    `*Member ID:* ${member.id}\n` +
    `*Contact:* +91 ${member.phone}\n` +
    `----------------------------------------\n` +
    `*Plan:* ${member.planName}\n` +
    `*Valid:* ${member.joinDate} to ${member.expiryDate}\n` +
    `*Total Fees:* ₹${total}\n` +
    `*Amount Paid:* ₹${paid} (${payMode})\n` +
    `*Balance Due:* ${dueStr}\n` +
    `----------------------------------------\n` +
    `_Thank you for choosing ${gymName}! Sweat Today, Smile Tomorrow._ 💪🔥\n` +
    `Gym Helpline: ${phone}`;
}

function openReceiptModal(memberId) {
  const members = getMembers();
  const member = members.find(m => m.id === memberId);
  if (!member) return;

  currentReceiptMember = member;
  const settings = getGymSettings();
  const receiptNo = `RCP-${TODAY_STR.replace(/-/g, '')}-${member.id}`;

  const gymNameEl = document.getElementById('receipt-gym-name');
  const gymAddrEl = document.getElementById('receipt-gym-address');
  const receiptNoEl = document.getElementById('receipt-no');
  const receiptDateEl = document.getElementById('receipt-date');
  const nameEl = document.getElementById('receipt-member-name');
  const phoneEl = document.getElementById('receipt-member-phone');
  const idEl = document.getElementById('receipt-member-id');
  const planEl = document.getElementById('receipt-member-plan');
  const rowPlanEl = document.getElementById('receipt-row-plan');
  const rowValidityEl = document.getElementById('receipt-row-validity');
  const rowTotalEl = document.getElementById('receipt-row-total');
  const payModeEl = document.getElementById('receipt-payment-mode');
  const rowPaidEl = document.getElementById('receipt-row-paid');
  const rowDueEl = document.getElementById('receipt-row-due');

  if (gymNameEl) gymNameEl.textContent = settings.gymName || 'OG FITNESS';
  if (gymAddrEl) gymAddrEl.textContent = settings.address || 'City Center, Main Road';
  if (receiptNoEl) receiptNoEl.textContent = receiptNo;
  if (receiptDateEl) receiptDateEl.textContent = TODAY_STR;
  if (nameEl) nameEl.textContent = member.name;
  if (phoneEl) phoneEl.textContent = '+91 ' + member.phone;
  if (idEl) idEl.textContent = member.id;
  if (planEl) planEl.textContent = member.planName;
  if (rowPlanEl) rowPlanEl.textContent = `${member.planName} Membership`;
  if (rowValidityEl) rowValidityEl.textContent = `Validity: ${member.joinDate} to ${member.expiryDate}`;
  
  const total = member.feesTotal || 0;
  const paid = member.feesPaid || 0;
  const due = Math.max(0, total - paid);

  if (rowTotalEl) rowTotalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
  if (payModeEl) payModeEl.textContent = member.paymentMode || 'UPI';
  if (rowPaidEl) rowPaidEl.textContent = `₹${paid.toLocaleString('en-IN')}`;
  if (rowDueEl) rowDueEl.textContent = `₹${due.toLocaleString('en-IN')}`;

  const modal = document.getElementById('receipt-modal');
  if (modal) modal.classList.add('active');
}

function closeReceiptModal() {
  const modal = document.getElementById('receipt-modal');
  if (modal) modal.classList.remove('active');
}

function openReceiptModalForCurrentCard() {
  if (currentActiveCardMemberId) {
    openReceiptModal(currentActiveCardMemberId);
  }
}

function printReceipt() {
  document.body.classList.remove('print-report', 'print-id-card', 'print-standee', 'print-diet');
  document.body.classList.add('print-receipt');
  window.print();
  setTimeout(() => document.body.classList.remove('print-receipt'), 1000);
}

async function sendReceiptViaWhatsApp() {
  if (!currentReceiptMember) return;
  const receiptNo = `RCP-${TODAY_STR.replace(/-/g, '')}-${currentReceiptMember.id}`;
  const message = buildReceiptText(currentReceiptMember, receiptNo);
  await sendCustomWhatsAppMessage(currentReceiptMember.phone, message, `Fee Receipt: ${currentReceiptMember.name}`);
}

// --------------------------------------------------------
// FEATURE 2: Inactive / Absent Member Watchdog (Drop-out Prevention)
// --------------------------------------------------------
function getInactiveMembers(thresholdDays = 5) {
  const members = getMembers();
  const attendance = getAttendance();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inactiveList = [];

  members.forEach(member => {
    // Only monitor active non-expired members
    const daysRemaining = getDaysRemaining(member.expiryDate);
    if (daysRemaining < 0) return;

    // Find latest attendance punch
    const memberPunches = attendance.filter(a => a.memberId === member.id && a.date);
    let daysAbsent = 0;
    let lastSeenText = '';

    if (memberPunches.length > 0) {
      memberPunches.sort((a, b) => new Date(b.date) - new Date(a.date));
      const latestDateStr = memberPunches[0].date;
      const latestDate = new Date(latestDateStr + 'T00:00:00');
      const diffMs = today.getTime() - latestDate.getTime();
      daysAbsent = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      lastSeenText = `${daysAbsent} din pehle (${latestDateStr})`;
    } else {
      const joinDate = new Date(member.joinDate + 'T00:00:00');
      if (!isNaN(joinDate.getTime())) {
        const diffMs = today.getTime() - joinDate.getTime();
        daysAbsent = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        lastSeenText = `Kabhi nahi aaye (${daysAbsent} din se enrolled)`;
      } else {
        daysAbsent = 0;
        lastSeenText = 'N/A';
      }
    }

    if (daysAbsent >= thresholdDays) {
      inactiveList.push({
        ...member,
        daysAbsent,
        lastSeenText
      });
    }
  });

  inactiveList.sort((a, b) => b.daysAbsent - a.daysAbsent);
  return inactiveList;
}

function renderInactiveMembers() {
  const badge = document.getElementById('dashboard-absentee-badge');
  const container = document.getElementById('dashboard-absentee-list');
  if (!container) return;

  const inactive = getInactiveMembers(5);
  if (badge) badge.textContent = `${inactive.length} Absent`;

  if (inactive.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center rounded-xl bg-white border border-amber-100 text-xs text-slate-500">
        <i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i>
        Sabhi members regular hain! 5+ dino se koi absent nahi hai.
      </div>
    `;
    return;
  }

  container.innerHTML = inactive.map(m => `
    <div class="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs hover:border-amber-300 transition">
      <div>
        <div class="text-xs font-bold text-slate-900">${m.name}</div>
        <div class="text-[10px] text-amber-700 font-medium">${m.daysAbsent} Din se Absent &bull; <span class="text-slate-400">${m.lastSeenText}</span></div>
      </div>
      <button onclick="sendAbsenteeNudge('${m.id}', ${m.daysAbsent})" class="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition">
        <i class="fa-brands fa-whatsapp"></i>
        <span>Nudge</span>
      </button>
    </div>
  `).join('');
}

async function sendAbsenteeNudge(memberId, daysAbsent) {
  const members = getMembers();
  const member = members.find(m => m.id === memberId);
  if (!member) return;

  const settings = getGymSettings();
  const gymName = settings.gymName || 'OG Fitness';

  const message = `Namaste *${member.name}* Ji! 💪\n\n` +
    `${gymName} me aapko miss kiya ja raha hai! Pichle *${daysAbsent} dino* se aap gym nahi aaye.\n\n` +
    `Consistency is the key to real fitness results. Aaj workout par milte hain? Let's crush your goals together! 🔥🏋️\n\n` +
    `- Team ${gymName}`;

  await sendCustomWhatsAppMessage(member.phone, message, `Absentee Nudge: ${member.name}`);
}

// --------------------------------------------------------
// FEATURE 3: Automatic Birthday Wish Engine
// --------------------------------------------------------
function getTodayBirthdays() {
  const members = getMembers();
  const todayMMDD = TODAY_STR.substring(5); // "MM-DD"
  return members.filter(m => m.dob && m.dob.substring(5) === todayMMDD);
}

function renderBirthdayBanner() {
  const banner = document.getElementById('dashboard-birthday-banner');
  if (!banner) return;

  const bdays = getTodayBirthdays();
  if (bdays.length === 0) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    return;
  }

  banner.classList.remove('hidden');
  const names = bdays.map(m => `<b>${m.name}</b> (${m.id})`).join(', ');

  banner.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white flex items-center justify-center text-lg shadow-sm flex-shrink-0 animate-bounce">
        🎂
      </div>
      <div>
        <div class="text-xs font-bold uppercase tracking-wider text-pink-700 flex items-center gap-1.5">
          <span>🎉 Aaj ${bdays.length} Member${bdays.length > 1 ? 's' : ''} Ka Birthday Hai!</span>
        </div>
        <p class="text-xs text-slate-700 mt-0.5">${names}</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button onclick="sendBirthdayWishBatch()" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition">
        <i class="fa-brands fa-whatsapp text-sm"></i>
        <span>Send Birthday Wishes</span>
      </button>
    </div>
  `;
}

async function sendBirthdayWishBatch() {
  const bdays = getTodayBirthdays();
  if (bdays.length === 0) return;
  for (const member of bdays) {
    await sendBirthdayWish(member.id);
  }
}

async function sendBirthdayWish(memberId) {
  const members = getMembers();
  const member = members.find(m => m.id === memberId);
  if (!member) return;

  const settings = getGymSettings();
  const gymName = settings.gymName || 'OG Fitness';

  const message = `🎂 *HAPPY BIRTHDAY ${member.name.toUpperCase()} JI!* 🎉🎈\n\n` +
    `${gymName} ki poori team aur sabhi trainers ki taraf se aapko Janamdin ki dheron shubh-kamnayein!\n\n` +
    `May this year bring you great health, unmatched strength, and unstoppable fitness gains! Stay disciplined, stay strong! 💪🔥\n\n` +
    `- ${gymName} Family`;

  await sendCustomWhatsAppMessage(member.phone, message, `Birthday Wish: ${member.name}`);
}

// --------------------------------------------------------
// FEATURE 4: 1-Click Diet & Workout Plan Generator
// --------------------------------------------------------
const DIET_WORKOUT_PLANS = {
  'fat-loss': {
    title: 'Fat Loss & Lean Muscle Indian Diet Plan',
    category: 'Nutrition & Diet',
    calories: '1,600 - 1,800 kcal (Deficit)',
    protein: '110g - 130g Protein',
    target: 'Burn stubborn fat while preserving lean muscle',
    water: '3.5 - 4 Litres daily',
    meals: [
      { time: '07:30 AM (Wake Up)', items: '1 Glass lukewarm lemon water + 5 Soaked almonds & 1 walnut' },
      { time: '08:30 AM (Breakfast)', items: 'Oats porridge with skimmed milk & chia seeds OR 3 Boiled egg whites + 1 whole wheat toast' },
      { time: '11:30 AM (Mid-Morning)', items: '1 Cup Green Tea + 1 Seasonal Fruit (Apple / Papaya / Guava) + Handful roasted chana' },
      { time: '01:30 PM (Lunch)', items: '2 Multigrain rotis (no ghee) + 1 Bowl Yellow Dal + 100g Low-fat Paneer / Grilled Chicken Breast + Large green salad' },
      { time: '05:00 PM (Pre-Workout)', items: '1 Cup Black Coffee (no sugar) + 1 Banana OR 2 Rice cakes' },
      { time: '08:30 PM (Dinner)', items: '1 Large bowl mixed vegetable clear soup + 150g Sautéed paneer / tofu / soya chunks / fish + Cucumber slices' },
      { time: '10:00 PM (Bedtime)', items: '1 Cup warm chamomile tea or cinnamon water' }
    ],
    guidelines: [
      'Strictly avoid refined sugars, deep fried snacks, and carbonated cold drinks.',
      'Maintain 10,000 steps daily outside gym workout for active fat burn.',
      'Sleep minimum 7-8 hours for optimal hormonal balance.'
    ]
  },
  'muscle-bulking': {
    title: 'High Protein Muscle Bulking & Hypertrophy Diet Plan',
    category: 'Nutrition & Diet',
    calories: '2,600 - 2,900 kcal (Clean Surplus)',
    protein: '140g - 160g Protein',
    target: 'Gain solid muscle mass with minimal fat gain',
    water: '4 - 5 Litres daily',
    meals: [
      { time: '07:30 AM (Wake Up)', items: 'High Calorie Shake: 300ml full cream milk + 1 Banana + 2 tbsp Peanut Butter + 40g Oats blended' },
      { time: '09:00 AM (Breakfast)', items: '4 Whole eggs scrambled OR 150g Paneer bhurji + 2 Slices brown bread + Handful of soaked raisins & cashews' },
      { time: '12:00 PM (Mid-Morning)', items: '1 Sweet potato boiled OR 1 Bowl boiled sprouts with lemon + Coconut water' },
      { time: '02:00 PM (Lunch)', items: '3 Rotis + 1 Large bowl Rajma / Chhole + 150g Paneer / Chicken curry + 1 Bowl curd (Dahi) + Rice' },
      { time: '05:30 PM (Pre-Workout)', items: '2 Bananas + 1 Cup black coffee + 2 Brown bread peanut butter toast' },
      { time: '07:30 PM (Post-Workout)', items: '1 Scoop Whey Protein with water OR 4 Boiled egg whites + 1 Sweet potato' },
      { time: '09:30 PM (Dinner)', items: '3 Rotis + 1 Bowl Soya chunks curry / grilled chicken + Dal tadka + Fresh salad' }
    ],
    guidelines: [
      'Focus on progressive overload in every gym session.',
      'Never skip your post-workout meal to maximize protein synthesis.',
      'Take 5g Creatine Monohydrate daily with plenty of water.'
    ]
  },
  'beginner-routine': {
    title: '3-Day Beginner Full Body Strength Workout Routine',
    category: 'Training Program',
    frequency: '3 Days / Week (Monday - Wednesday - Friday)',
    target: 'Build foundational strength, master form, and activate muscle fibers',
    warmup: '5 mins treadmill walk + joint mobility arm/hip circles',
    days: [
      {
        day: 'Day 1: Full Body Foundations A',
        exercises: [
          'Goblet Squats (Dumbbell) - 3 sets x 12 reps',
          'Flat Dumbbell Bench Press - 3 sets x 10-12 reps',
          'Lat Pulldowns (Wide Grip) - 3 sets x 12 reps',
          'Seated Dumbbell Shoulder Press - 3 sets x 10 reps',
          'Plank Hold - 3 sets x 30-45 seconds'
        ]
      },
      {
        day: 'Day 2: Full Body Foundations B',
        exercises: [
          'Romanian Deadlifts (Dumbbells) - 3 sets x 10 reps',
          'Seated Cable Rows - 3 sets x 12 reps',
          'Incline Dumbbell Press - 3 sets x 10-12 reps',
          'Standing Dumbbell Bicep Curls - 3 sets x 12 reps',
          'Cable Tricep Pushdowns - 3 sets x 12 reps'
        ]
      },
      {
        day: 'Day 3: Full Body Foundations C',
        exercises: [
          'Leg Press Machine - 3 sets x 12 reps',
          'Dumbbell Walking Lunges - 3 sets x 10 steps/leg',
          'Standing Overhead Barbell Press - 3 sets x 10 reps',
          'Dumbbell Lateral Raises - 3 sets x 15 reps',
          'Hanging Knee Raises / Ab Crunches - 3 sets x 15 reps'
        ]
      }
    ],
    guidelines: [
      'Take 90 seconds rest between sets. Focus 100% on proper posture and controlled tempo.',
      'End each session with 10 minutes steady-state cardio (Cycle or Elliptical).'
    ]
  },
  'ppl-split': {
    title: '6-Day Push-Pull-Legs (PPL) Athlete Hypertrophy Split',
    category: 'Advanced Training Program',
    frequency: '6 Days / Week (Push - Pull - Legs - Push - Pull - Legs - Rest)',
    target: 'Maximum muscle hypertrophy and aesthetic physique development',
    warmup: 'Rotator cuff warmups, band pull-aparts, bodyweight squats',
    days: [
      {
        day: 'Push Day 1 (Chest / Shoulders / Triceps)',
        exercises: [
          'Barbell Flat Bench Press - 4 sets x 6-8 reps (Heavy)',
          'Incline Dumbbell Press - 3 sets x 8-10 reps',
          'Seated Overhead Dumbbell Press - 3 sets x 10 reps',
          'Cable Chest Flyes - 3 sets x 12-15 reps',
          'Dumbbell Lateral Raises - 4 sets x 15 reps (Strict)',
          'Tricep Rope Pushdowns superset with Overhead Cable Extension - 3 sets x 12 reps'
        ]
      },
      {
        day: 'Pull Day 1 (Back / Rear Delts / Biceps)',
        exercises: [
          'Conventional Barbell Deadlifts / Rack Pulls - 4 sets x 5 reps',
          'Wide-Grip Lat Pulldowns - 3 sets x 8-10 reps',
          'Chest-Supported T-Bar Rows - 3 sets x 10-12 reps',
          'Face Pulls (Rope) - 4 sets x 15 reps',
          'Incline Dumbbell Bicep Curls - 3 sets x 10-12 reps',
          'Hammer Curls (Forearms & Brachialis) - 3 sets x 12 reps'
        ]
      },
      {
        day: 'Leg Day 1 (Quads / Hamstrings / Calves)',
        exercises: [
          'Barbell Back Squats - 4 sets x 6-8 reps',
          'Romanian Deadlifts (RDL) - 3 sets x 8-10 reps',
          'Leg Press (Feet low & narrow for Quads) - 3 sets x 12 reps',
          'Lying Hamstring Curls - 3 sets x 12-15 reps',
          'Standing Machine Calf Raises - 4 sets x 15-20 reps',
          'Hanging Leg Raises - 3 sets to failure'
        ]
      }
    ],
    guidelines: [
      'Track your weights every week and aim for progressive overload (1 extra rep or 2.5kg more).',
      'Sunday is dedicated strictly for rest and muscle recovery.'
    ]
  }
};

let currentDietPlanKey = 'fat-loss';
let currentDietMemberId = '';

function populateDietMemberSelect() {
  const select = document.getElementById('diet-member-select');
  if (!select) return;

  const members = getMembers();
  const currentVal = select.value;
  select.innerHTML = '<option value="">-- Choose Member --</option>' +
    members.map(m => `<option value="${m.id}">${m.name} (${m.id}) - ${m.planName}</option>`).join('');

  if (currentVal && members.some(m => m.id === currentVal)) {
    select.value = currentVal;
    currentDietMemberId = currentVal;
  }
}

function onDietMemberSelected(memberId) {
  currentDietMemberId = memberId;
  renderDietPlanCanvas();
}

function selectDietTemplate(planKey) {
  currentDietPlanKey = planKey;

  document.querySelectorAll('.diet-template-btn').forEach(btn => {
    btn.classList.remove('bg-orange-500', 'text-white', 'border-orange-500');
    btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
  });

  const activeBtn = document.getElementById(`diet-tab-${planKey}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
    activeBtn.classList.add('bg-orange-500', 'text-white', 'border-orange-500');
  }

  renderDietPlanCanvas();
}

function renderDietPlanCanvas() {
  const container = document.getElementById('printable-diet-plan');
  if (!container) return;

  const plan = DIET_WORKOUT_PLANS[currentDietPlanKey];
  if (!plan) return;

  const settings = getGymSettings();
  const gymName = settings.gymName || 'OG FITNESS';
  const members = getMembers();
  const member = members.find(m => m.id === currentDietMemberId);

  const memberName = member ? member.name : 'Gym Member';
  const memberId = member ? member.id : 'OG-XXXX';
  const memberPlan = member ? member.planName : 'Fitness Member';

  let contentHtml = '';

  if (plan.meals) {
    contentHtml = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-orange-50/60 border border-orange-200 text-xs">
          <div><span class="text-slate-500 block">Daily Target:</span> <span class="font-bold text-slate-900">${plan.calories}</span></div>
          <div><span class="text-slate-500 block">Protein Intake:</span> <span class="font-bold text-orange-600">${plan.protein}</span></div>
          <div><span class="text-slate-500 block">Hydration:</span> <span class="font-bold text-sky-600">${plan.water}</span></div>
        </div>

        <div class="space-y-2.5">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <i class="fa-solid fa-utensils text-orange-600"></i> Meal-by-Meal Schedule:
          </h4>
          <div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            ${plan.meals.map(m => `
              <div class="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span class="font-bold text-orange-700 sm:w-1/3 flex items-center gap-1.5">
                  <i class="fa-regular fa-clock text-slate-400 text-[10px]"></i> ${m.time}
                </span>
                <span class="text-slate-700 sm:w-2/3">${m.items}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } else if (plan.days) {
    contentHtml = `
      <div class="space-y-4">
        <div class="p-3 rounded-xl bg-orange-50/60 border border-orange-200 text-xs flex flex-wrap justify-between gap-2">
          <div><span class="text-slate-500 block">Frequency:</span> <span class="font-bold text-slate-900">${plan.frequency}</span></div>
          <div><span class="text-slate-500 block">Target:</span> <span class="font-bold text-orange-600">${plan.target}</span></div>
        </div>

        <div class="space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <i class="fa-solid fa-dumbbell text-orange-600"></i> Workout Routine Breakdown:
          </h4>
          <div class="grid grid-cols-1 gap-3">
            ${plan.days.map(d => `
              <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div class="font-bold text-xs text-orange-700 uppercase flex items-center gap-1.5">
                  <i class="fa-solid fa-play text-[10px]"></i> ${d.day}
                </div>
                <ul class="space-y-1 pl-2 text-xs text-slate-700">
                  ${d.exercises.map(ex => `<li class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0"></span> ${ex}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Branded Header -->
    <div class="flex items-center justify-between pb-4 border-b border-slate-200">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-lg">
          <i class="fa-solid fa-dumbbell"></i>
        </div>
        <div>
          <h2 class="text-xl font-black text-slate-900 leading-tight">${gymName}</h2>
          <div class="text-[11px] text-slate-500">Certified Coaching & Workout Protocol</div>
        </div>
      </div>
      <div class="text-right">
        <div class="text-[10px] uppercase font-bold text-slate-400">Date Issued:</div>
        <div class="font-mono text-xs font-bold text-slate-700">${TODAY_STR}</div>
      </div>
    </div>

    <!-- Member Info Strip -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
      <div>
        <span class="text-slate-400 text-[10px] uppercase font-semibold block">Member:</span>
        <span class="font-bold text-slate-900 text-sm">${memberName}</span>
        <span class="font-mono text-slate-500 text-[11px] ml-1.5">(${memberId})</span>
      </div>
      <div>
        <span class="text-slate-400 text-[10px] uppercase font-semibold block">Plan:</span>
        <span class="font-semibold text-slate-800">${memberPlan}</span>
      </div>
      <div>
        <span class="text-slate-400 text-[10px] uppercase font-semibold block">Program Assigned:</span>
        <span class="font-bold text-orange-600">${plan.title}</span>
      </div>
    </div>

    <!-- Dynamic Content -->
    ${contentHtml}

    <!-- Guidelines & Coach Signature -->
    <div class="pt-3 border-t border-dashed border-slate-200 space-y-2 text-xs">
      <div class="text-[11px] text-slate-600 space-y-1">
        <span class="font-bold text-slate-800">💡 Coach's Golden Rules:</span>
        ${plan.guidelines.map(g => `<p class="text-[11px] text-slate-500">&bull; ${g}</p>`).join('')}
      </div>
      <div class="flex justify-between items-end pt-3 text-[10px] text-slate-400">
        <span>Consistency &bull; Discipline &bull; Hard Work</span>
        <span class="font-bold text-slate-700">Official Coach Signature: __________________</span>
      </div>
    </div>
  `;
}

function printSelectedDietPlan() {
  document.body.classList.remove('print-report', 'print-id-card', 'print-standee', 'print-receipt');
  document.body.classList.add('print-diet');
  window.print();
  setTimeout(() => document.body.classList.remove('print-diet'), 1000);
}

async function sendSelectedDietWhatsApp() {
  const plan = DIET_WORKOUT_PLANS[currentDietPlanKey];
  if (!plan) return;

  const members = getMembers();
  const member = members.find(m => m.id === currentDietMemberId);
  if (!member) {
    showNotification('Kripya pehle upar dropdown me se Target Member select karein!', 'warning');
    return;
  }

  const settings = getGymSettings();
  const gymName = settings.gymName || 'OG Fitness';

  let msg = `📋 *${gymName.toUpperCase()} - CUSTOM FITNESS PROTOCOL* 📋\n` +
    `----------------------------------------\n` +
    `*Member:* ${member.name} (${member.id})\n` +
    `*Program:* ${plan.title}\n` +
    `----------------------------------------\n\n`;

  if (plan.meals) {
    msg += `🎯 *Target:* ${plan.target}\n` +
      `🔥 *Calories:* ${plan.calories}\n` +
      `🥩 *Protein:* ${plan.protein}\n` +
      `💧 *Water:* ${plan.water}\n\n` +
      `*MEAL SCHEDULE:*\n`;
    plan.meals.forEach(m => {
      msg += `⏰ *${m.time}:*\n👉 ${m.items}\n\n`;
    });
  } else if (plan.days) {
    msg += `🎯 *Frequency:* ${plan.frequency}\n\n` +
      `*WORKOUT ROUTINE:*\n`;
    plan.days.forEach(d => {
      msg += `🏋️ *${d.day}:*\n`;
      d.exercises.forEach(ex => {
        msg += `  • ${ex}\n`;
      });
      msg += `\n`;
    });
  }

  msg += `----------------------------------------\n` +
    `💡 *Coach Rules:*\n`;
  plan.guidelines.forEach(g => {
    msg += `• ${g}\n`;
  });
  msg += `\n_Stay disciplined, track your progress daily!_ 💪🔥\n` +
    `- Team ${gymName}`;

  await sendCustomWhatsAppMessage(member.phone, msg, `${plan.title} for ${member.name}`);
}

// --------------------------------------------------------
// FEATURE 5: Gym Expenses & Net Profit Tracker
// --------------------------------------------------------
function getExpenses() {
  return JSON.parse(localStorage.getItem(DB_KEYS.EXPENSES) || '[]');
}

function saveExpenses(expenses) {
  localStorage.setItem(DB_KEYS.EXPENSES, JSON.stringify(expenses));
}

async function fetchExpensesFromBackend() {
  try {
    const res = await fetch('/api/expenses');
    if (res.ok) {
      const serverExpenses = await res.json();
      if (Array.isArray(serverExpenses)) {
        saveExpenses(serverExpenses);
      }
    }
  } catch (e) {}
}

function renderExpensesView() {
  const periodFilter = document.getElementById('expenses-month-filter')?.value || 'current_month';
  const expenses = getExpenses();
  const members = getMembers();

  const filteredExpenses = expenses.filter(e => isDateInPeriod(e.date, periodFilter));
  const filteredMembers = members.filter(m => isDateInPeriod(m.joinDate, periodFilter));

  const totalRevenue = filteredMembers.reduce((sum, m) => sum + (parseFloat(m.feesPaid) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : (totalExpenses > 0 ? -100 : 0);

  const revEl = document.getElementById('exp-kpi-revenue');
  const expEl = document.getElementById('exp-kpi-total-expenses');
  const profitEl = document.getElementById('exp-kpi-net-profit');
  const marginEl = document.getElementById('exp-kpi-margin');
  const profitStatusEl = document.getElementById('exp-profit-status');
  const profitCard = document.getElementById('exp-net-profit-card');
  const countBadge = document.getElementById('expenses-count-badge');
  const summaryLabel = document.getElementById('expenses-summary-label');
  const tbody = document.getElementById('expenses-table-body');

  if (revEl) revEl.textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
  if (expEl) expEl.textContent = `₹${totalExpenses.toLocaleString('en-IN')}`;
  if (profitEl) {
    profitEl.textContent = `${netProfit < 0 ? '-' : ''}₹${Math.abs(netProfit).toLocaleString('en-IN')}`;
  }
  if (marginEl) marginEl.textContent = `${margin}%`;

  if (profitCard && profitStatusEl) {
    if (netProfit >= 0) {
      profitCard.className = 'p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200';
      if (profitEl) profitEl.className = 'text-2xl sm:text-3xl font-black text-emerald-800 font-mono';
      profitStatusEl.innerHTML = `<span class="text-emerald-700 font-bold">✨ Profitable Gym (+₹${netProfit.toLocaleString('en-IN')})</span>`;
    } else {
      profitCard.className = 'p-4 rounded-2xl bg-rose-50/50 border border-rose-200';
      if (profitEl) profitEl.className = 'text-2xl sm:text-3xl font-black text-rose-800 font-mono';
      profitStatusEl.innerHTML = `<span class="text-rose-700 font-bold">⚠️ Net Loss (-₹${Math.abs(netProfit).toLocaleString('en-IN')})</span>`;
    }
  }

  if (summaryLabel) {
    summaryLabel.textContent = `${filteredMembers.length} Admissions &bull; ${filteredExpenses.length} Expense Records`;
  }
  if (countBadge) {
    countBadge.textContent = `${filteredExpenses.length} Items`;
  }

  if (!tbody) return;

  if (filteredExpenses.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-slate-500">
          <div class="max-w-xs mx-auto space-y-2">
            <i class="fa-solid fa-receipt text-2xl text-slate-300"></i>
            <p class="text-xs font-semibold text-slate-700">Koi expense record nahi mila</p>
            <p class="text-[11px] text-slate-400">Iss period me koi kharcha darj nahi hai. Upar "Add Expense" dabakar naya kharcha jodein.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = filteredExpenses.map(e => `
    <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition">
      <td class="py-3 px-4 font-mono text-slate-600">${e.date}</td>
      <td class="py-3 px-4 font-bold text-slate-900">${e.title}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">${e.category || 'Other'}</span>
      </td>
      <td class="py-3 px-4 text-slate-600">${e.paymentMode || 'UPI'}</td>
      <td class="py-3 px-4 font-mono font-bold text-rose-600">₹${(parseFloat(e.amount) || 0).toLocaleString('en-IN')}</td>
      <td class="py-3 px-4 text-slate-500 text-[11px]">${e.notes || '-'}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="deleteExpense('${e.id}')" title="Delete Expense" class="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 inline-flex items-center justify-center transition shadow-2xs">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openAddExpenseModal() {
  const modal = document.getElementById('add-expense-modal');
  const dateInput = document.getElementById('exp-form-date');
  if (dateInput) dateInput.value = TODAY_STR;
  if (modal) modal.classList.add('active');
}

function closeAddExpenseModal() {
  const modal = document.getElementById('add-expense-modal');
  if (modal) modal.classList.remove('active');
}

async function handleExpenseFormSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('exp-form-title')?.value.trim();
  const category = document.getElementById('exp-form-category')?.value || 'Other';
  const amount = parseFloat(document.getElementById('exp-form-amount')?.value) || 0;
  const date = document.getElementById('exp-form-date')?.value || TODAY_STR;
  const paymentMode = document.getElementById('exp-form-mode')?.value || 'UPI';
  const notes = document.getElementById('exp-form-notes')?.value.trim() || '';

  if (!title || amount <= 0) {
    showNotification('Kripya valid title aur amount bharein!', 'warning');
    return;
  }

  const newExpense = {
    id: 'exp-' + Date.now(),
    title,
    category,
    amount,
    date,
    paymentMode,
    notes
  };

  const expenses = getExpenses();
  expenses.unshift(newExpense);
  saveExpenses(expenses);

  try {
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense)
    });
  } catch (err) {}

  showNotification(`✅ Kharcha darj hua: ₹${amount.toLocaleString('en-IN')} (${title})`, 'success');
  document.getElementById('add-expense-form')?.reset();
  closeAddExpenseModal();
  renderExpensesView();
}

async function deleteExpense(expenseId) {
  if (!confirm('Kya aap is expense record ko delete karna chahte hain?')) return;

  let expenses = getExpenses();
  expenses = expenses.filter(e => e.id !== expenseId);
  saveExpenses(expenses);

  try {
    await fetch('/api/expenses/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseId })
    });
  } catch (err) {}

  showNotification('🗑️ Expense entry hata di gayi.', 'info');
  renderExpensesView();
}

function exportExpensesToCSV() {
  const periodFilter = document.getElementById('expenses-month-filter')?.value || 'all';
  const expenses = getExpenses().filter(e => isDateInPeriod(e.date, periodFilter));

  if (expenses.length === 0) {
    showNotification('Export karne ke liye koi expense data nahi mila.', 'warning');
    return;
  }

  const headers = ['Date', 'Expense Title', 'Category', 'Payment Mode', 'Amount (INR)', 'Notes'];
  const rows = expenses.map(e => [
    e.date,
    `"${(e.title || '').replace(/"/g, '""')}"`,
    `"${(e.category || '').replace(/"/g, '""')}"`,
    `"${(e.paymentMode || '').replace(/"/g, '""')}"`,
    e.amount || 0,
    `"${(e.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  downloadCsvBlob(`og_fitness_expenses_${TODAY_STR}.csv`, csvContent);
  showNotification('📊 Expenses CSV Downloaded!', 'success');
}

// ========================================================
// EXPENSE SMART ENTRY & BULK IMPORT ENGINE (CSV & PDF)
// ========================================================

// 1. Natural Language & Voice Entry Engine ("Likh kar / Bol kar jodein")
function parseNaturalExpenseText(rawText) {
  if (!rawText || !rawText.trim()) return null;
  const text = rawText.trim();

  // 1. Extract Amount (e.g. ₹3500, 3,500, 3500 rs, rs 3500, 3500/-)
  let amount = 0;
  const amountMatch = text.match(/(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(?:\/-\s*|rs\.?|rupees|rupaye)?/i);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // 2. Extract Payment Mode
  let paymentMode = 'UPI';
  if (/\b(?:cash|nakad|rokar)\b/i.test(text)) {
    paymentMode = 'Cash';
  } else if (/\b(?:bank|neft|rtgs|imps|cheque|check|transfer)\b/i.test(text)) {
    paymentMode = 'Bank Transfer';
  } else if (/\b(?:card|debit|credit|pos)\b/i.test(text)) {
    paymentMode = 'Card';
  } else if (/\b(?:upi|gpay|phonepe|paytm|online)\b/i.test(text)) {
    paymentMode = 'UPI';
  }

  // 3. Extract Category
  let category = 'Other';
  const lower = text.toLowerCase();
  if (/(?:bijli|electricity|power|light|current|eb bill)/i.test(lower)) {
    category = 'Electricity';
  } else if (/(?:rent|kiraya|room rent|gym rent|lease)/i.test(lower)) {
    category = 'Rent';
  } else if (/(?:salary|trainer|trainer salary|vetan|staff|housekeeping|sweeper)/i.test(lower)) {
    category = 'Trainer Salary';
  } else if (/(?:equipment|machine|dumbbell|barbell|plate|treadmill|cable)/i.test(lower)) {
    category = 'Equipment';
  } else if (/(?:repair|maintenance|marammat|service|oil|plumbing|welding)/i.test(lower)) {
    category = 'Maintenance';
  } else if (/(?:supplement|whey|protein|creatine|shaker|inventory)/i.test(lower)) {
    category = 'Supplements';
  } else if (/(?:marketing|ad|advertisement|flex|banner|poster|pamphlet)/i.test(lower)) {
    category = 'Marketing';
  }

  // 4. Clean Title by removing matched payment mode and amount words
  let title = text
    .replace(/(?:₹|rs\.?|inr)?\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?\s*(?:\/-\s*|rs\.?|rupees|rupaye)?/gi, '')
    .replace(/\b(?:by\s+cash|by\s+upi|cash|nakad|upi|gpay|phonepe|paytm|online|bank transfer|card)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (title) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  } else {
    title = `${category} Expense`;
  }

  return {
    title,
    category,
    amount,
    date: TODAY_STR,
    paymentMode,
    notes: `Smart Entry: "${rawText.trim()}"`
  };
}

async function handleQuickExpenseSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('quick-expense-input');
  if (!input) return;
  const rawText = input.value.trim();
  if (!rawText) {
    showNotification('Kripya kharcha likhein ya mic se bolkar batayein!', 'warning');
    return;
  }

  const parsed = parseNaturalExpenseText(rawText);
  if (!parsed || parsed.amount <= 0) {
    showNotification('Kripya amount (₹) bhi likhein! (e.g. "Bijli bill 3500 cash")', 'warning');
    return;
  }

  const newExpense = {
    id: 'exp-' + Date.now(),
    ...parsed
  };

  const expenses = getExpenses();
  expenses.unshift(newExpense);
  saveExpenses(expenses);

  try {
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense)
    });
  } catch (err) {}

  showNotification(`✅ Kharcha darj hua: ₹${parsed.amount.toLocaleString('en-IN')} - ${parsed.title} (${parsed.paymentMode})`, 'success');
  input.value = '';
  renderExpensesView();
}

let expenseSpeechRecognition = null;
let isExpenseVoiceListening = false;

function toggleExpenseVoiceInput() {
  const statusEl = document.getElementById('quick-expense-voice-status');
  const micBtn = document.getElementById('btn-expense-voice');
  const input = document.getElementById('quick-expense-input');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showNotification('Aapke browser me speech recognition support nahi hai. Kripya Chrome ya Edge use karein ya text likhein.', 'warning');
    return;
  }

  if (isExpenseVoiceListening && expenseSpeechRecognition) {
    expenseSpeechRecognition.stop();
    isExpenseVoiceListening = false;
    if (statusEl) statusEl.classList.add('hidden');
    if (micBtn) micBtn.classList.remove('text-red-600', 'animate-pulse');
    return;
  }

  try {
    expenseSpeechRecognition = new SpeechRecognition();
    expenseSpeechRecognition.lang = 'hi-IN';
    expenseSpeechRecognition.continuous = false;
    expenseSpeechRecognition.interimResults = false;

    expenseSpeechRecognition.onstart = () => {
      isExpenseVoiceListening = true;
      if (statusEl) statusEl.classList.remove('hidden');
      if (micBtn) micBtn.classList.add('text-red-600', 'animate-pulse');
    };

    expenseSpeechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (input && transcript) {
        input.value = transcript;
        showNotification(`🎙️ Suna gaya: "${transcript}"`, 'info');
        handleQuickExpenseSubmit();
      }
    };

    expenseSpeechRecognition.onerror = (err) => {
      if (statusEl) statusEl.classList.add('hidden');
      if (micBtn) micBtn.classList.remove('text-red-600', 'animate-pulse');
      isExpenseVoiceListening = false;
      showNotification('Voice input error: ' + (err.error || 'mic error'), 'warning');
    };

    expenseSpeechRecognition.onend = () => {
      isExpenseVoiceListening = false;
      if (statusEl) statusEl.classList.add('hidden');
      if (micBtn) micBtn.classList.remove('text-red-600', 'animate-pulse');
    };

    expenseSpeechRecognition.start();
  } catch (err) {
    showNotification('Mic access error: ' + err.message, 'warning');
  }
}

// --------------------------------------------------------
// 2. Bulk Import Modal & Parsing Engines (CSV & PDF)
// --------------------------------------------------------
let currentImportQueue = [];

function openImportExpensesModal() {
  const modal = document.getElementById('import-expenses-modal');
  currentImportQueue = [];
  resetImportPreview();
  if (modal) modal.classList.add('active');
}

function closeImportExpensesModal() {
  const modal = document.getElementById('import-expenses-modal');
  if (modal) modal.classList.remove('active');
}

function switchImportTab(tab) {
  const filePanel = document.getElementById('import-panel-file');
  const pastePanel = document.getElementById('import-panel-paste');
  const fileBtn = document.getElementById('import-tab-btn-file');
  const pasteBtn = document.getElementById('import-tab-btn-paste');

  if (tab === 'file') {
    if (filePanel) filePanel.classList.remove('hidden');
    if (pastePanel) pastePanel.classList.add('hidden');
    if (fileBtn) {
      fileBtn.className = 'pb-2.5 text-xs font-bold border-b-2 border-orange-500 text-orange-600 transition flex items-center gap-2';
    }
    if (pasteBtn) {
      pasteBtn.className = 'pb-2.5 text-xs font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition flex items-center gap-2';
    }
  } else {
    if (filePanel) filePanel.classList.add('hidden');
    if (pastePanel) pastePanel.classList.remove('hidden');
    if (pasteBtn) {
      pasteBtn.className = 'pb-2.5 text-xs font-bold border-b-2 border-orange-500 text-orange-600 transition flex items-center gap-2';
    }
    if (fileBtn) {
      fileBtn.className = 'pb-2.5 text-xs font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition flex items-center gap-2';
    }
  }
}

function resetImportPreview() {
  const previewSection = document.getElementById('import-preview-section');
  const previewTbody = document.getElementById('import-preview-tbody');
  const previewCount = document.getElementById('import-preview-count');
  const previewTotal = document.getElementById('import-preview-total');
  const confirmBtn = document.getElementById('btn-confirm-import');
  const fileStatus = document.getElementById('import-file-status');

  if (previewSection) previewSection.classList.add('hidden');
  if (previewTbody) previewTbody.innerHTML = '';
  if (previewCount) previewCount.textContent = '0 items found';
  if (previewTotal) previewTotal.textContent = '₹0';
  if (confirmBtn) confirmBtn.disabled = true;
  if (fileStatus) fileStatus.textContent = '';
}

function downloadSampleExpenseCSV() {
  const sampleHeaders = ['Date', 'Expense Title', 'Category', 'Payment Mode', 'Amount (INR)', 'Notes'];
  const sampleRows = [
    ['2026-11-20', 'Gym Rent for Month', 'Rent', 'Bank Transfer', '25000', 'Paid to Landlord'],
    ['2026-11-21', 'Electricity Bill', 'Electricity', 'UPI', '3500', 'MPEB Online Pay'],
    ['2026-11-22', 'Trainer Salary - Rohit', 'Trainer Salary', 'UPI', '15000', 'Nov 2026 Salary'],
    ['2026-11-22', 'Treadmill Belt Repair', 'Maintenance', 'Cash', '1200', 'Technician visit'],
    ['2026-11-23', 'Whey Protein Stock', 'Supplements', 'Card', '8500', '10 Jars received']
  ];

  const csvContent = [sampleHeaders.join(','), ...sampleRows.map(r => r.join(','))].join('\r\n');
  downloadCsvBlob('sample_gym_expenses_template.csv', csvContent);
  showNotification('📥 Sample CSV template downloaded! Is format me apna data fill karke import karein.', 'success');
}

// Normalize Date to YYYY-MM-DD
function normalizeDateStr(raw) {
  if (!raw) return TODAY_STR;
  const cleaned = String(raw).trim().replace(/\./g, '-').replace(/\//g, '-');

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
    const parts = cleaned.split('-');
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleaned)) {
    const parts = cleaned.split('-');
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  // MM-DD-YYYY or other parseable date
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return TODAY_STR;
}

// Smart CSV Parser
function parseExpensesCSV(csvText) {
  if (!csvText || !csvText.trim()) return [];

  let cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const rawLines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (rawLines.length === 0) return [];

  function parseCSVLine(line) {
    const entries = [];
    let insideQuote = false;
    let entry = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          entry += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        entries.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    entries.push(entry.trim());
    return entries;
  }

  const headerLine = parseCSVLine(rawLines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  let dateIdx = -1;
  let titleIdx = -1;
  let categoryIdx = -1;
  let amountIdx = -1;
  let modeIdx = -1;
  let notesIdx = -1;

  headerLine.forEach((h, idx) => {
    if (h.includes('date') || h.includes('tareekh') || h.includes('time') || h.includes('dt')) dateIdx = idx;
    else if (h.includes('title') || h.includes('desc') || h.includes('particular') || h.includes('item') || h.includes('name') || h.includes('naam') || h.includes('details')) titleIdx = idx;
    else if (h.includes('cat') || h.includes('head') || h.includes('type')) categoryIdx = idx;
    else if (h.includes('amount') || h.includes('debit') || h.includes('dr') || h.includes('rashi') || h.includes('cost') || h.includes('price') || h.includes('inr')) amountIdx = idx;
    else if (h.includes('mode') || h.includes('payment') || h.includes('channel')) modeIdx = idx;
    else if (h.includes('note') || h.includes('remark') || h.includes('comment') || h.includes('narration')) notesIdx = idx;
  });

  const parsedItems = [];
  const startRow = (dateIdx !== -1 || amountIdx !== -1 || titleIdx !== -1) ? 1 : 0;

  for (let i = startRow; i < rawLines.length; i++) {
    const cols = parseCSVLine(rawLines[i]);
    if (cols.length === 0) continue;

    let rawAmount = amountIdx !== -1 ? cols[amountIdx] : cols[cols.length - 1];
    let amount = 0;
    if (rawAmount) {
      const numMatch = String(rawAmount).replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
      if (numMatch) amount = parseFloat(numMatch[1]);
    }

    if (amount <= 0) continue;

    let title = titleIdx !== -1 ? cols[titleIdx] : (cols[1] || 'Gym Expense');
    let date = dateIdx !== -1 ? normalizeDateStr(cols[dateIdx]) : TODAY_STR;
    let paymentMode = modeIdx !== -1 ? cols[modeIdx] : 'UPI';
    let notes = notesIdx !== -1 ? cols[notesIdx] : 'CSV Imported';
    let category = categoryIdx !== -1 ? cols[categoryIdx] : 'Other';

    if (!category || category === 'Other') {
      const smart = parseNaturalExpenseText(title);
      if (smart && smart.category !== 'Other') category = smart.category;
    }

    parsedItems.push({
      date,
      title: title || 'Gym Expense',
      category: category || 'Other',
      paymentMode: paymentMode || 'UPI',
      amount,
      notes: notes || 'CSV Import'
    });
  }

  return parsedItems;
}

// Smart PDF Parser using PDF.js
async function parseExpensesPDF(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF.js library load nahi ho saki. Kripya internet connection check karein ya CSV use karein.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const extractedLines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const lineMap = new Map();
    textContent.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push(item.str);
    });

    const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
    sortedY.forEach(y => {
      const lineStr = lineMap.get(y).join(' ').trim();
      if (lineStr.length > 0) extractedLines.push(lineStr);
    });
  }

  const parsedItems = [];
  const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/;
  const amountRegex = /(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)\b/i;

  extractedLines.forEach(line => {
    const dateMatch = line.match(dateRegex);
    const amountMatch = line.match(amountRegex);

    if (dateMatch && amountMatch) {
      const rawAmt = amountMatch[1].replace(/,/g, '');
      const amount = parseFloat(rawAmt);
      if (amount > 0 && amount < 10000000) {
        const date = normalizeDateStr(dateMatch[1]);
        
        let title = line
          .replace(dateMatch[0], '')
          .replace(amountMatch[0], '')
          .replace(/[|\-,;]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!title || title.length < 3) title = 'Bank / Statement Debit';
        
        const smart = parseNaturalExpenseText(title);

        parsedItems.push({
          date,
          title,
          category: smart.category || 'Other',
          paymentMode: smart.paymentMode || 'Bank Transfer',
          amount,
          notes: 'PDF Statement Import'
        });
      }
    }
  });

  return parsedItems;
}

// Handle File Upload Event (CSV or PDF)
async function handleExpenseFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const statusEl = document.getElementById('import-file-status');
  if (statusEl) {
    statusEl.innerHTML = `<span class="text-orange-600 font-bold"><i class="fa-solid fa-spinner fa-spin mr-1"></i> File process ho rahi hai: ${file.name}...</span>`;
  }

  try {
    let items = [];
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    if (isPdf) {
      items = await parseExpensesPDF(file);
    } else {
      const text = await file.text();
      items = parseExpensesCSV(text);
    }

    if (items.length === 0) {
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-rose-600 font-bold">⚠️ Koi valid expense record nahi mila. Kripya file format check karein ya Sample CSV template dekhein.</span>`;
      }
      return;
    }

    if (statusEl) {
      statusEl.innerHTML = `<span class="text-emerald-700 font-bold">✅ File read successful: ${items.length} transactions mili!</span>`;
    }

    renderImportPreview(items);
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-rose-600 font-bold">❌ Error: ${err.message}</span>`;
    }
  }
}

// Handle Pasted Text Parsing
function parsePastedExpenseText() {
  const textarea = document.getElementById('import-paste-text');
  if (!textarea || !textarea.value.trim()) {
    showNotification('Kripya pehle text paste karein!', 'warning');
    return;
  }

  const rawText = textarea.value.trim();
  let items = parseExpensesCSV(rawText);

  if (items.length === 0) {
    const lines = rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
    lines.forEach(line => {
      const parsed = parseNaturalExpenseText(line);
      if (parsed && parsed.amount > 0) {
        items.push(parsed);
      }
    });
  }

  if (items.length === 0) {
    showNotification('Koi valid transactions detect nahi huin. Kripya Amount aur Title likhein.', 'warning');
    return;
  }

  renderImportPreview(items);
}

// Render Preview Table
function renderImportPreview(items) {
  currentImportQueue = items;

  const previewSection = document.getElementById('import-preview-section');
  const previewTbody = document.getElementById('import-preview-tbody');
  const previewCount = document.getElementById('import-preview-count');
  const previewTotal = document.getElementById('import-preview-total');
  const confirmBtn = document.getElementById('btn-confirm-import');

  if (!previewSection || !previewTbody) return;

  const totalSum = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  if (previewCount) previewCount.textContent = `${items.length} records ready to import`;
  if (previewTotal) previewTotal.textContent = `Total: ₹${totalSum.toLocaleString('en-IN')}`;
  if (confirmBtn) {
    confirmBtn.disabled = items.length === 0;
    confirmBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Confirm & Import All (${items.length} Entries)</span>`;
  }

  const categories = ['Rent', 'Electricity', 'Trainer Salary', 'Maintenance', 'Equipment', 'Supplements', 'Marketing', 'Other'];

  previewTbody.innerHTML = items.map((item, idx) => `
    <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
      <td class="py-2 px-3 text-slate-600">${item.date}</td>
      <td class="py-2 px-3 font-bold text-slate-900">${item.title}</td>
      <td class="py-2 px-3">
        <select onchange="updateQueueCategory(${idx}, this.value)" class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800">
          ${categories.map(cat => `<option value="${cat}" ${cat === item.category ? 'selected' : ''}>${cat}</option>`).join('')}
        </select>
      </td>
      <td class="py-2 px-3 text-slate-600 text-[11px]">${item.paymentMode}</td>
      <td class="py-2 px-3 text-right font-bold text-rose-600 font-mono">₹${item.amount.toLocaleString('en-IN')}</td>
      <td class="py-2 px-2 text-center">
        <button type="button" onclick="removeFromImportQueue(${idx})" class="w-6 h-6 rounded text-slate-400 hover:text-rose-600 flex items-center justify-center transition">
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </td>
    </tr>
  `).join('');

  previewSection.classList.remove('hidden');
}

function updateQueueCategory(idx, newCat) {
  if (currentImportQueue[idx]) {
    currentImportQueue[idx].category = newCat;
  }
}

function removeFromImportQueue(idx) {
  currentImportQueue.splice(idx, 1);
  if (currentImportQueue.length === 0) {
    resetImportPreview();
  } else {
    renderImportPreview(currentImportQueue);
  }
}

// Execute Bulk Import to Backend & Local Storage
async function executeBulkImport() {
  if (!currentImportQueue || currentImportQueue.length === 0) return;

  const itemsToImport = [...currentImportQueue];
  const confirmBtn = document.getElementById('btn-confirm-import');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Importing...</span>`;
  }

  try {
    const res = await fetch('/api/expenses/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemsToImport)
    });

    const result = await res.json();
    if (result.success) {
      const existing = getExpenses();
      const newItems = result.expenses || itemsToImport.map((item, i) => ({
        id: `exp-${Date.now()}-${i}`,
        ...item
      }));
      saveExpenses([...newItems, ...existing]);

      showNotification(`🎉 Shabaash! ${result.count} expenses successfully import ho gaye (Total: ₹${result.totalAmount.toLocaleString('en-IN')})!`, 'success');
      closeImportExpensesModal();
      renderExpensesView();
    } else {
      showNotification('Import failed: ' + (result.error || 'Server error'), 'warning');
    }
  } catch (err) {
    showNotification('Error importing: ' + err.message, 'warning');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>Confirm & Import All</span>`;
    }
  }
}

// Setup Drag & Drop listener for #import-drop-zone
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('import-drop-zone');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('border-orange-500', 'bg-orange-50/50');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-orange-500', 'bg-orange-50/50');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      const mockEvent = { target: { files: [files[0]] } };
      handleExpenseFileUpload(mockEvent);
    }
  }, false);
});



