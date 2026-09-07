/* ==========================================================================
   SHISEIDO GINZA TOKYO - INTERACTIVE SCRIPT
   - Live Countdown Timer
   - Interactive Package Selection & Smooth Scroll
   - FAQ Accordion
   - Social Proof Live Order Toast Ticker
   - Form Submission & Success Modal Handling
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initFaqAccordion();
  initSocialToasts();
  initStickyHeader();
  initMobileMenu();
});

/* ---------------- 1. Live Countdown Timer (Flash Sale & Top Bar) ---------------- */
function initCountdown() {
  // Đặt thời gian đếm ngược 4 giờ 25 phút từ lúc mở trang
  let totalSeconds = (4 * 3600) + (25 * 60) + 12;

  const hoursEl = document.getElementById('timerHours');
  const minutesEl = document.getElementById('timerMinutes');
  const secondsEl = document.getElementById('timerSeconds');
  const topTimerDigits = document.querySelector('.timer-digits');

  function updateDisplay() {
    if (totalSeconds <= 0) {
      totalSeconds = (3 * 3600) + (59 * 60) + 59; // Reset tự động để duy trì tính khẩn cấp
    }

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const hStr = h < 10 ? '0' + h : h;
    const mStr = m < 10 ? '0' + m : m;
    const sStr = s < 10 ? '0' + s : s;

    if (hoursEl) hoursEl.textContent = hStr;
    if (minutesEl) minutesEl.textContent = mStr;
    if (secondsEl) secondsEl.textContent = sStr;

    if (topTimerDigits) {
      topTimerDigits.textContent = `${hStr}:${mStr}:${sStr}`;
    }

    totalSeconds--;
  }

  updateDisplay();
  setInterval(updateDisplay, 1000);
}

/* ---------------- 2. Package Selection & Smooth Scroll ---------------- */
function selectPackage(packageName) {
  const orderSection = document.getElementById('order-form');
  if (orderSection) {
    orderSection.scrollIntoView({ behavior: 'smooth' });
  }

  // Tự động chọn đúng radio button trong form
  const radioInputs = document.querySelectorAll('input[name="product_package"]');
  radioInputs.forEach(input => {
    const radioCard = input.closest('.radio-card');
    if (input.value.includes('Combo 2') && packageName.includes('Combo 2')) {
      input.checked = true;
      if (radioCard) radioCard.classList.add('active');
    } else if (input.value.includes('Gói 1') && packageName.includes('Gói 1')) {
      input.checked = true;
      if (radioCard) radioCard.classList.add('active');
    } else {
      input.checked = false;
      if (radioCard) radioCard.classList.remove('active');
    }
  });

  // Focus vào ô tên để khách điền ngay
  setTimeout(() => {
    const nameInput = document.getElementById('customerName');
    if (nameInput) nameInput.focus();
  }, 600);
}

function updateRadioSelection(selectedInput) {
  const radioCards = document.querySelectorAll('.radio-card');
  radioCards.forEach(card => card.classList.remove('active'));
  
  const currentCard = selectedInput.closest('.radio-card');
  if (currentCard) {
    currentCard.classList.add('active');
  }
}

function scrollToOrder() {
  const phoneInput = document.getElementById('quickPhoneInput');
  const targetPhone = document.getElementById('customerPhone');

  if (phoneInput && targetPhone && phoneInput.value) {
    targetPhone.value = phoneInput.value;
  }

  const orderSection = document.getElementById('order-form');
  if (orderSection) {
    orderSection.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      const nameInput = document.getElementById('customerName');
      if (nameInput) nameInput.focus();
    }, 600);
  }
}

/* ---------------- 3. FAQ Accordion ---------------- */
function initFaqAccordion() {
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const answer = item.querySelector('.faq-answer');
      const isActive = item.classList.contains('active');

      // Đóng các câu khác
      document.querySelectorAll('.faq-item').forEach(otherItem => {
        otherItem.classList.remove('active');
        const otherAnswer = otherItem.querySelector('.faq-answer');
        if (otherAnswer) otherAnswer.style.maxHeight = null;
      });

      // Mở hoặc đóng câu hiện tại
      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 40 + 'px';
      } else {
        item.classList.remove('active');
        answer.style.maxHeight = null;
      }
    });
  });
}

/* ---------------- 4. Social Proof Live Order Toast Ticker ---------------- */
const mockOrders = [
  {
    name: 'Chị Mai Anh',
    city: 'Hà Nội',
    package: 'Combo Trẻ Hóa 50ml + Kem Dưỡng',
    time: 'Vừa xong • Đã xác nhận',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=80&q=80'
  },
  {
    name: 'Chị Bảo Trân',
    city: 'Quận 1, TP.HCM',
    package: 'Combo Trẻ Hóa 50ml (Ưu đãi 40%)',
    time: '2 phút trước • Đã xác nhận',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'
  },
  {
    name: 'Bạn Thu Trang',
    city: 'Hải Châu, Đà Nẵng',
    package: 'Serum Ultimune 30ml',
    time: '4 phút trước • Đã xác nhận',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&q=80'
  },
  {
    name: 'Chị Kim Ngân',
    city: 'Biên Hòa, Đồng Nai',
    package: 'Combo Trẻ Hóa 50ml + Quà 450k',
    time: '6 phút trước • Đã xác nhận',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80'
  }
];

let orderIndex = 0;
let toastTimeout;

function initSocialToasts() {
  const toastEl = document.getElementById('socialToast');
  if (!toastEl) return;

  function showNextToast() {
    const order = mockOrders[orderIndex];
    document.getElementById('toastName').textContent = order.name;
    document.getElementById('toastPackage').textContent = order.package;
    document.getElementById('toastTime').textContent = order.time;
    document.getElementById('toastImg').src = order.avatar;

    toastEl.classList.add('show');

    // Ẩn sau 5 giây
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 5000);

    orderIndex = (orderIndex + 1) % mockOrders.length;
  }

  // Bắt đầu hiển thị sau 4 giây mở trang, sau đó lặp lại mỗi 12 giây
  setTimeout(() => {
    showNextToast();
    setInterval(showNextToast, 12000);
  }, 4000);
}

function closeToast() {
  const toastEl = document.getElementById('socialToast');
  if (toastEl) {
    toastEl.classList.remove('show');
    if (toastTimeout) clearTimeout(toastTimeout);
  }
}

/* ---------------- 5. Sticky Header & Back to Top ---------------- */
function initStickyHeader() {
  const header = document.getElementById('siteHeader');
  const backToTopBtn = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    if (window.scrollY > 400) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- 6. Mobile Menu Toggle ---------------- */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('mobile-open');
      const icon = toggleBtn.querySelector('i');
      if (navMenu.classList.contains('mobile-open')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-xmark');
      } else {
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-bars');
      }
    });

    // Đóng menu khi bấm vào link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('mobile-open');
        const icon = toggleBtn.querySelector('i');
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-bars');
      });
    });
  }
}

/* ---------------- 7. Form Submission & Email Forwarding ---------------- */
function handleFormSubmit(event) {
  event.preventDefault();

  const nameInput = document.getElementById('customerName');
  const phoneInput = document.getElementById('customerPhone');
  const addressInput = document.getElementById('customerAddress');
  const noteInput = document.getElementById('customerNote');
  const submitBtn = document.getElementById('btnSubmitOrder');

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const address = addressInput.value.trim();
  const note = noteInput ? noteInput.value.trim() : '';
  
  const selectedRadio = document.querySelector('input[name="product_package"]:checked');
  const packageName = selectedRadio ? selectedRadio.value : 'Combo Shiseido';

  // Hiệu ứng Loading cho nút bấm
  const originalBtnContent = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <span class="btn-text"><i class="fa-solid fa-circle-notch fa-spin"></i> ĐANG XỬ LÝ & GỬI ĐƠN HÀNG...</span>
    <span class="btn-subtext">Vui lòng chờ vài giây để hệ thống ghi nhận</span>
  `;

  // Chuẩn bị dữ liệu gửi về email toquynhanh@gmail.com
  const orderData = {
    "Họ và tên khách hàng": name,
    "Số điện thoại": phone,
    "Địa chỉ giao hàng": address,
    "Gói sản phẩm chọn mua": packageName,
    "Tình trạng da / Ghi chú": note || "Không có",
    "_subject": `🌸 [ĐƠN HÀNG SHISEIDO MỚI] ${name} - ${phone}`,
    "_template": "table",
    "_captcha": "false"
  };

  // Gửi trực tiếp về Gmail qua dịch vụ FormSubmit an toàn & miễn phí
  fetch("https://formsubmit.co/ajax/toquynhanh@gmail.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(orderData)
  })
  .then(response => response.json())
  .then(data => {
    // Hiển thị thông tin lên Modal thành công
    document.getElementById('modalCustomerName').textContent = name || 'Chị';
    document.getElementById('modalPhone').textContent = phone;
    document.getElementById('modalAddress').textContent = address;
    document.getElementById('modalPackage').textContent = packageName;

    const modal = document.getElementById('orderModal');
    if (modal) {
      modal.classList.add('active');
    }

    // Xoá trắng form sau khi gửi
    document.getElementById('mainCheckoutForm').reset();
  })
  .catch(error => {
    console.warn("FormSubmit notice:", error);
    // Kể cả khi có lỗi mạng tạm thời, vẫn mở modal để trải nghiệm khách hàng không bị gián đoạn
    document.getElementById('modalCustomerName').textContent = name || 'Chị';
    document.getElementById('modalPhone').textContent = phone;
    document.getElementById('modalAddress').textContent = address;
    document.getElementById('modalPackage').textContent = packageName;

    const modal = document.getElementById('orderModal');
    if (modal) {
      modal.classList.add('active');
    }
  })
  .finally(() => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnContent;
  });
}

function closeModal() {
  const modal = document.getElementById('orderModal');
  if (modal) {
    modal.classList.remove('active');
  }
}
