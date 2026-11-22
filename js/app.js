// OG Fitness - Core Interactive Functionality

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initPricingToggle();
  initBmiCalculator();
  initScheduleTabs();
  initModal();
  initFaqAccordion();
  initScrollEffects();
  initMobileNavHighlight();
});

// 1. Mobile Drawer Navigation
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('close-drawer-btn');
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const navLinks = document.querySelectorAll('.drawer-link');

  function openDrawer() {
    drawer.classList.remove('translate-x-full');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.add('translate-x-full');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    document.body.style.overflow = '';
  }

  if (menuBtn) menuBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });
}

// 2. Pricing Toggle (Monthly vs Annual)
function initPricingToggle() {
  const billingToggle = document.getElementById('billing-toggle');
  const monthlyLabel = document.getElementById('monthly-label');
  const annualLabel = document.getElementById('annual-label');

  const prices = {
    standard: { monthly: '₹1,499', annual: '₹1,199', periodMonthly: '/month', periodAnnual: '/mo (billed yearly)' },
    pro: { monthly: '₹2,499', annual: '₹1,899', periodMonthly: '/month', periodAnnual: '/mo (billed yearly)' },
    elite: { monthly: '₹3,999', annual: '₹2,999', periodMonthly: '/month', periodAnnual: '/mo (billed yearly)' }
  };

  if (!billingToggle) return;

  billingToggle.addEventListener('change', () => {
    const isAnnual = billingToggle.checked;

    if (isAnnual) {
      annualLabel.classList.add('text-neon', 'font-bold');
      monthlyLabel.classList.remove('text-neon', 'font-bold');
      monthlyLabel.classList.add('text-gray-400');
    } else {
      monthlyLabel.classList.add('text-neon', 'font-bold');
      annualLabel.classList.remove('text-neon', 'font-bold');
      annualLabel.classList.add('text-gray-400');
    }

    document.querySelectorAll('[data-plan]').forEach(planCard => {
      const planKey = planCard.getAttribute('data-plan');
      const priceEl = planCard.querySelector('.plan-price');
      const periodEl = planCard.querySelector('.plan-period');
      const savingsEl = planCard.querySelector('.plan-savings');

      if (prices[planKey]) {
        priceEl.textContent = isAnnual ? prices[planKey].annual : prices[planKey].monthly;
        periodEl.textContent = isAnnual ? prices[planKey].periodAnnual : prices[planKey].periodMonthly;
        if (savingsEl) {
          savingsEl.style.display = isAnnual ? 'inline-flex' : 'none';
        }
      }
    });
  });
}

// 3. Interactive BMI & Calorie Calculator
function initBmiCalculator() {
  const heightSlider = document.getElementById('bmi-height');
  const weightSlider = document.getElementById('bmi-weight');
  const heightVal = document.getElementById('bmi-height-val');
  const weightVal = document.getElementById('bmi-weight-val');
  const calcBtn = document.getElementById('calculate-bmi-btn');

  const resultContainer = document.getElementById('bmi-result-card');
  const scoreEl = document.getElementById('bmi-score');
  const badgeEl = document.getElementById('bmi-badge');
  const msgEl = document.getElementById('bmi-message');
  const targetCaloriesEl = document.getElementById('bmi-calories');
  const recommendedProgramEl = document.getElementById('bmi-recommended-program');

  if (heightSlider && heightVal) {
    heightSlider.addEventListener('input', (e) => {
      heightVal.textContent = e.target.value;
      calculateBMI();
    });
  }

  if (weightSlider && weightVal) {
    weightSlider.addEventListener('input', (e) => {
      weightVal.textContent = e.target.value;
      calculateBMI();
    });
  }

  if (calcBtn) {
    calcBtn.addEventListener('click', calculateBMI);
  }

  function calculateBMI() {
    if (!heightSlider || !weightSlider) return;
    const hCm = parseFloat(heightSlider.value);
    const wKg = parseFloat(weightSlider.value);

    const hM = hCm / 100;
    const bmi = (wKg / (hM * hM)).toFixed(1);

    if (scoreEl) scoreEl.textContent = bmi;

    let category = '';
    let badgeClass = '';
    let advice = '';
    let calories = '';
    let program = '';

    if (bmi < 18.5) {
      category = 'Underweight';
      badgeClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      advice = 'Focus on high-protein caloric surplus and heavy compound hypertrophy lifts to build lean muscle mass.';
      calories = Math.round(wKg * 38) + ' kcal/day';
      program = 'Hypertrophy & Mass Building Plan';
    } else if (bmi >= 18.5 && bmi <= 24.9) {
      category = 'Healthy / Fit Weight';
      badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      advice = 'Great shape! You are in the ideal zone. Target strength conditioning, athletic mobility, and progressive overload.';
      calories = Math.round(wKg * 32) + ' kcal/day';
      program = 'Functional CrossFit & Athletic Performance';
    } else if (bmi >= 25 && bmi <= 29.9) {
      category = 'Overweight';
      badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      advice = 'Recommended approach: High-intensity interval training (HIIT) paired with steady-state cardio and calorie deficit.';
      calories = Math.round(wKg * 26) + ' kcal/day';
      program = 'Fat Shred & Functional HIIT Intensive';
    } else {
      category = 'Obese';
      badgeClass = 'bg-red-500/20 text-red-400 border-red-500/30';
      advice = 'Structured low-impact strength work, guided nutrition protocol, and personal coaching for safe, sustainable fat loss.';
      calories = Math.round(wKg * 23) + ' kcal/day';
      program = '1-on-1 Transformation & Metabolic Reboot';
    }

    if (badgeEl) {
      badgeEl.className = `px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${badgeClass}`;
      badgeEl.textContent = category;
    }

    if (msgEl) msgEl.textContent = advice;
    if (targetCaloriesEl) targetCaloriesEl.textContent = calories;
    if (recommendedProgramEl) recommendedProgramEl.textContent = program;

    if (resultContainer) {
      resultContainer.classList.remove('opacity-40');
      resultContainer.classList.add('opacity-100');
    }
  }

  // Initial calculation
  calculateBMI();
}

// 4. Weekly Class Schedule Day Selector
function initScheduleTabs() {
  const dayButtons = document.querySelectorAll('.schedule-day-btn');
  const scheduleRows = document.querySelectorAll('.schedule-item');

  dayButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedDay = btn.getAttribute('data-day');

      // Update button styles
      dayButtons.forEach(b => {
        b.classList.remove('bg-neon', 'text-black', 'shadow-lg');
        b.classList.add('bg-gray-800/80', 'text-gray-300');
      });
      btn.classList.add('bg-neon', 'text-black', 'shadow-lg');
      btn.classList.remove('bg-gray-800/80', 'text-gray-300');

      // Filter schedule cards
      scheduleRows.forEach(item => {
        const itemDays = item.getAttribute('data-days');
        if (selectedDay === 'all' || itemDays.includes(selectedDay)) {
          item.style.display = 'grid';
          item.style.animation = 'fadeIn 0.35s ease';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

// 5. Booking Modal & WhatsApp Lead Generator
function initModal() {
  const modal = document.getElementById('trial-modal');
  const openButtons = document.querySelectorAll('.open-trial-modal');
  const closeButtons = document.querySelectorAll('.close-trial-modal');
  const form = document.getElementById('trial-form');
  const successState = document.getElementById('modal-success-state');
  const formState = document.getElementById('modal-form-state');
  const modalProgramInput = document.getElementById('modal-preferred-program');

  function openModal(defaultProgram = '') {
    if (!modal) return;
    if (modalProgramInput && defaultProgram) {
      modalProgramInput.value = defaultProgram;
    }
    if (formState) formState.style.display = 'block';
    if (successState) successState.style.display = 'none';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const program = btn.getAttribute('data-program-name') || '';
      openModal(program);
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('modal-name')?.value.trim() || 'Fitness Enthusiast';
      const phone = document.getElementById('modal-phone')?.value.trim() || '';
      const goal = document.getElementById('modal-goal')?.value || 'Muscle Building';
      const slot = document.getElementById('modal-slot')?.value || 'Morning (6 AM - 9 AM)';
      const program = modalProgramInput?.value || 'General Fitness';

      // Switch to success animation
      if (formState) formState.style.display = 'none';
      if (successState) successState.style.display = 'block';

      // Format WhatsApp message
      const gymWhatsAppNumber = '919876543210'; // Customizable WhatsApp Business number
      const waMessage = encodeURIComponent(
        `💪 *OG FITNESS - FREE DAY PASS REQUEST*\n\n` +
        `👤 *Name:* ${name}\n` +
        `📱 *Phone:* ${phone}\n` +
        `🎯 *Fitness Goal:* ${goal}\n` +
        `⏰ *Preferred Slot:* ${slot}\n` +
        `🏋️ *Interested Program:* ${program}\n\n` +
        `Please confirm my 1-Day VIP pass and free trainer consultation!`
      );

      const waUrl = `https://wa.me/${gymWhatsAppNumber}?text=${waMessage}`;

      const waBtn = document.getElementById('direct-whatsapp-redirect');
      if (waBtn) {
        waBtn.href = waUrl;
      }

      // Automatically open in new tab after 1.2s delay for seamless UX
      setTimeout(() => {
        window.open(waUrl, '_blank');
      }, 1200);
    });
  }
}

// 6. FAQ Accordion
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    const answer = item.querySelector('.faq-answer');
    const icon = item.querySelector('.faq-icon');

    if (!header || !answer) return;

    header.addEventListener('click', () => {
      const isOpen = !answer.classList.contains('hidden');

      // Close all others
      faqItems.forEach(otherItem => {
        const otherAnswer = otherItem.querySelector('.faq-answer');
        const otherIcon = otherItem.querySelector('.faq-icon');
        if (otherAnswer && otherAnswer !== answer) {
          otherAnswer.classList.add('hidden');
          if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
        }
      });

      if (isOpen) {
        answer.classList.add('hidden');
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        answer.classList.remove('hidden');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });
}

// 7. Scroll & Header Effects
function initScrollEffects() {
  const header = document.getElementById('main-header');
  const backToTop = document.getElementById('back-to-top');

  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY;

    if (header) {
      if (scrollPos > 40) {
        header.classList.add('shadow-xl', 'py-3');
        header.classList.remove('py-4');
      } else {
        header.classList.remove('shadow-xl', 'py-3');
        header.classList.add('py-4');
      }
    }

    if (backToTop) {
      if (scrollPos > 500) {
        backToTop.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
        backToTop.classList.add('opacity-100', 'translate-y-0');
      } else {
        backToTop.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
        backToTop.classList.remove('opacity-100', 'translate-y-0');
      }
    }
  });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// 8. Mobile Bottom Navigation Active Highlight
function initMobileNavHighlight() {
  const navItems = document.querySelectorAll('.mobile-dock-item');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 120;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navItems.forEach(item => {
      const href = item.getAttribute('href')?.replace('#', '');
      const icon = item.querySelector('.dock-icon');
      const label = item.querySelector('.dock-label');

      if (href === current) {
        if (icon) icon.classList.add('text-neon');
        if (label) label.classList.add('text-neon', 'font-bold');
        item.classList.add('scale-105');
      } else {
        if (icon) icon.classList.remove('text-neon');
        if (label) label.classList.remove('text-neon', 'font-bold');
        item.classList.remove('scale-105');
      }
    });
  });
}
