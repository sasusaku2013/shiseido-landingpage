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
  initChatbot();
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
    } else if ((input.value.includes('PDF') || input.value.includes('Checklist')) && (packageName.includes('PDF') || packageName.includes('Checklist'))) {
      input.checked = true;
      if (radioCard) radioCard.classList.add('active');
    } else {
      input.checked = false;
      if (radioCard) radioCard.classList.remove('active');
    }
  });

  const checkedRadio = document.querySelector('input[name="product_package"]:checked');
  if (checkedRadio) updateRadioSelection(checkedRadio);

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

  // Ẩn/hiện trường địa chỉ nếu là sản phẩm số (PDF)
  const val = selectedInput.value || '';
  const isPdf = val.includes('PDF') || val.includes('Checklist');
  const addrGroup = document.getElementById('mainAddressGroup');
  const addrInput = document.getElementById('customerAddress');
  if (addrGroup && addrInput) {
    if (isPdf) {
      addrGroup.style.display = 'none';
      addrInput.required = false;
    } else {
      addrGroup.style.display = 'block';
      addrInput.required = true;
    }
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
  const emailInput = document.getElementById('customerEmail');
  const addressInput = document.getElementById('customerAddress');
  const noteInput = document.getElementById('customerNote');
  const submitBtn = document.getElementById('btnSubmitOrder');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const address = addressInput ? addressInput.value.trim() : '';
  const note = noteInput ? noteInput.value.trim() : '';
  
  const selectedRadio = document.querySelector('input[name="product_package"]:checked');
  const packageName = selectedRadio ? selectedRadio.value : 'Combo 2: Trọn Gói 3 Phút 50ml - 2.780.000đ';
  const isPdf = packageName.includes('PDF') || packageName.includes('Checklist');

  if (!name || !phone || !email) {
    alert('Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Địa chỉ Email!');
    return;
  }
  if (!isPdf && !address) {
    alert('Vui lòng nhập địa chỉ nhận hàng!');
    return;
  }

  // Hiệu ứng Loading cho nút bấm
  const originalBtnContent = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <span class="btn-text"><i class="fa-solid fa-spinner fa-spin"></i> ĐANG CHUYỂN ĐẾN TRANG THANH TOÁN...</span>
    <span class="btn-subtext">Vui lòng chờ trong giây lát</span>
  `;

  // Xác định mã gói để truyền sang trang thanh toán
  let pkgParam = 'combo2';
  if (packageName.includes('30ml') || packageName.includes('Gói 1')) pkgParam = 'serum30';
  if (isPdf) pkgParam = 'pdf';

  const orderRef = 'DH' + phone.slice(-4) + Date.now().toString().slice(-4);
  const checkoutUrl = `/thanh-toan?package=${pkgParam}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}&address=${encodeURIComponent(address)}&notes=${encodeURIComponent(note)}&ref=${encodeURIComponent(orderRef)}&step=2`;

  // 1. Gửi thông báo về FormSubmit email trong nền
  fetch("https://formsubmit.co/ajax/toquynhanh@gmail.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      "_subject": `🌸 [ĐƠN HÀNG MỚI] ${name} - ${phone} (${orderRef})`,
      "Mã đơn hàng": orderRef,
      "Gói chọn": packageName,
      "Họ tên": name,
      "Số điện thoại": phone,
      "Email": email,
      "Địa chỉ": address || 'Không có (Sản phẩm số)',
      "Ghi chú": note,
      "_template": "table",
      "_captcha": "false"
    })
  }).catch(() => {});

  // 2. Tạo Đơn hàng & Khách hàng trên Backend (Railway hoặc local)
  const isStatic = window.location.hostname.includes('github.io') || window.location.hostname === 'dealngon.online';
  const ADMIN_SERVER = localStorage.getItem('adminServerUrl') || (isStatic ? 'https://web-production-42cec4.up.railway.app' : window.location.origin);

  if (ADMIN_SERVER) {
    fetch(ADMIN_SERVER + '/api/orders/from-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone, email, address,
        package: packageName,
        payment_ref: orderRef,
        notes: note
      })
    })
    .catch(err => console.warn('Lỗi kết nối admin server:', err))
    .finally(() => {
      // Chuyển hướng sang trang thanh toán
      window.location.href = checkoutUrl;
    });
  } else {
    window.location.href = checkoutUrl;
  }
}

function closeModal() {
  const modal = document.getElementById('orderModal');
  if (modal) modal.classList.remove('active');
}

// ── Payment Polling ───────────────────────────────────────────
let _pollInterval = null;
function startPaymentPolling(orderRef, serverBase) {
  if (_pollInterval) clearInterval(_pollInterval);
  let attempts = 0;
  const MAX = 60; // poll tối đa 8 phút (60 × 8s)

  _pollInterval = setInterval(async () => {
    attempts++;
    if (attempts > MAX) { clearInterval(_pollInterval); return; }
    try {
      const res = await fetch(`${serverBase}/api/check-payment/${orderRef}`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return;
      const data = await res.json();
      if (data.found && (data.status === 'success' || data.status === 'confirmed' || data.status === 'delivered')) {
        clearInterval(_pollInterval);
        showPaymentSuccess(orderRef);
      }
    } catch(e) { /* server offline → bỏ qua */ }
  }, 8000);
}

function showPaymentSuccess(orderRef) {
  // Thay nội dung QR section bằng thông báo thành công
  const qrSection = document.querySelector('.modal-col-qr') || document.getElementById('modalQrWrap')?.parentElement;
  if (qrSection) {
    qrSection.innerHTML = `
      <div style="text-align:center;padding:12px 8px">
        <div style="font-size:2.5rem;margin-bottom:6px">✅</div>
        <p style="font-weight:700;color:#10b981;font-size:.95rem;margin-bottom:4px">Thanh toán thành công!</p>
        <p style="font-size:.78rem;color:#555">Mã đơn: <strong>${orderRef}</strong></p>
        <p style="font-size:.75rem;color:#888;margin-top:6px">DealNgon sẽ gọi xác nhận trong 15 phút tới 🌸</p>
      </div>`;
  }
  // Cũng hiển thị banner nhỏ ở đầu modal
  const modalCard = document.querySelector('.order-modal-card');
  if (modalCard) {
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#d1fae5;border-radius:10px;padding:10px 16px;text-align:center;font-size:.85rem;font-weight:600;color:#065f46;margin-bottom:14px';
    banner.innerHTML = '🎉 Đã nhận được chuyển khoản! Đơn hàng đang được xử lý.';
    modalCard.insertBefore(banner, modalCard.firstChild);
  }
}

function closeModal() {
  const modal = document.getElementById('orderModal');
  if (modal) modal.classList.remove('active');
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
}

/* ==========================================================================
   CHATBOT BÁN HÀNG — LÀM ĐẸP LƯỜI 3 PHÚT (THEO SALES_SCRIPT.MD)
   ========================================================================== */

let chatHasGreeted = false;

// Kịch bản bán hàng & tư vấn chi tiết từ sales_script.md
const CHATBOT_KB = {
  greeting: {
    text: `<p><strong>Chào chị ạ! Em là DealNgon đây.</strong></p>
           <p>Thấy chị đang ghé thăm trang, không biết da chị đợt này ngồi điều hòa có đang bị khô mốc hay đổ dầu khó chịu không, chị nhắn em tư vấn thật lòng nha :)))</p>
           <p style="font-size:0.8rem; color:#8E8D95; margin-top:6px;"><em>(Chị có thể bấm chọn nhanh các chủ đề bên dưới hoặc gõ tin nhắn trực tiếp cho em nhé!)</em></p>`
  },

  buyIntent: {
    text: `<p>Dạ đợt này em đang gom chung cho mấy chị em công ty nên mới được giá ưu đãi này đó chị:</p>
           <p>• <strong>Gói 1 (Trải nghiệm):</strong> Lọ 30ml chỉ <strong>2.480.000đ</strong> (giá gốc 2.980k).<br>
           • <strong>Gói 2 (Combo 3 phút bán chạy nhất):</strong> 1 Lọ Fullsize 50ml + 1 Hũ kem Vital 15ml chỉ <strong>2.780.000đ</strong> (tiết kiệm 500k) và được <strong>tặng luôn Hộp Quà VIP 450.000đ</strong> (gồm 3 mặt nạ lụa + băng đô nhung).</p>
           <p>Em khuyên thật lòng chị nên lấy Combo 2.780k vì vừa đủ bộ 2 bước khóa ẩm sâu, vừa được hời nguyên hộp quà VIP. Chị bấm nút bên dưới để vào danh sách nhận ưu đãi nhé!</p>`,
    hasActionCard: true
  },

  faq1_oily: {
    question: "Da dầu ngồi máy lạnh có bị bí hay bóng nhờn không?",
    text: `<p>Dạ chị yên tâm 100% về khoản này nha. Thật ra, da chị ngồi máy lạnh mà càng đổ dầu là vì bên dưới da đang bị <strong>thiếu nước trầm trọng</strong>, tuyến bã nhờn phải tiết dầu ra để tự chữa cháy.</p>
           <p>Serum Ultimune này lỏng nhẹ như giọt sương, chấm 5 điểm thoa đúng 30 giây là thấm ráo mịn vào da liền, không để lại lớp màng bóng nhờn. Chị thoa xong lấy tờ giấy thấm dầu áp lên má là thấy khô ráo ngay.</p>
           <p>Đến 2–3h chiều sờ hai bên cánh mũi vẫn êm ru, không bị bóng nhờn hay bết vào cổ áo sơ mi trắng đâu ạ!</p>`
  },

  faq2_sunscreen: {
    question: "Thoa xong sáng ra có cần bôi kem chống nắng hay kem lót nữa không?",
    text: `<p>Đơn giản thôi chị:</p>
           <p>• <strong>Nếu công việc chị ngồi văn phòng, đi ô tô hoặc chạy xe máy 10–15 phút sáng sớm:</strong> Thoa serum hoặc combo 3 phút này là đủ cấp ẩm sâu và bảo vệ da cả ngày rồi, không cần bôi trát thêm lớp nào nữa cho nặng mặt.</p>
           <p>• <strong>Còn nếu hôm nào chị phải đi ra ngoài trời nắng gắt giữa trưa:</strong> Em khuyên thật lòng chị cứ vỗ thêm một lớp kem chống nắng mỏng nhẹ bên ngoài cho an tâm nhé. Bản thân combo này đã cấp ẩm rất mướt nên bôi chống nắng lên sẽ không bao giờ bị vón cục hay trắng bệch ạ.</p>`
  },

  faq3_results: {
    question: "Dùng bao lâu thì da đỡ khô mốc ở khóe mũi & thấy hiệu quả?",
    text: `<p>Em nói thật lòng không dám chém gió đâu ạ:</p>
           <p>• <strong>Ngay ngày đầu tiên:</strong> Chị thoa buổi sáng, đến trưa sờ mặt thấy mềm êm, không còn cảm giác khô căng rát rát khi ngồi ngay dưới họng gió máy lạnh.<br>
           • <strong>Sau 7 đến 14 ngày:</strong> Nền da ngậm đủ nước sẽ sáng hồng và mướt hơn rõ rệt, chấm dứt hẳn tình trạng bong vảy mốc trắng ở cánh mũi.<br>
           • <strong>Sau 1 tháng (1 chu kỳ thay da tự nhiên):</strong> Da đàn hồi săn chắc, khóe cười đỡ hằn nếp nhăn. Đây là dưỡng phục hồi sinh học bền vững cho tế bào, chứ không phải kem trộn lột tẩy 3 ngày trắng bóc chị nha.</p>`
  },

  faq4_aging: {
    question: "Chị 38-40 tuổi có nếp nhăn, dùng 1-2 bước này có đủ chống lão hóa?",
    text: `<p>Dạ em hiểu nỗi lo này của chị. Nhưng thật ra, da sau tuổi 35 bị lão hóa nhanh là do 2 nguyên nhân cốt tử: <strong>mất nước tầng sâu</strong> và <strong>hàng rào đề kháng của da bị suy yếu</strong> vì ánh sáng máy tính và máy lạnh.</p>
           <p>Combo 3 phút này giải quyết đúng 2 việc đó: Serum Ultimune kích hoạt đề kháng sinh học, còn kem Vital Perfection khóa ẩm sâu và nâng cơ mặt.</p>
           <p>Rất nhiều chị 38–42 tuổi bên em dùng đều bảo: Bôi đúng 2 bước này buổi sáng thấy da săn chắc hơn hẳn việc bôi 5–7 món lỉnh kỉnh mà bề mặt cứ trôi tuột đi chị ạ.</p>`
  },

  faq5_minimal: {
    question: "Sao người ta bảo phải dưỡng 7-10 bước? Bôi ít thế này có ăn thua?",
    text: `<p>Thật ra cái quan niệm 7–10 bước đó chỉ hợp với mấy bạn trẻ 18–20 tuổi nhiều thời gian rảnh thôi chị ơi.</p>
           <p>Ở tuổi 35+ như chị em mình, da bắt đầu chuyển hóa chậm lại. Bôi 7–8 lớp lên mặt da không những không nuốt nổi mà còn gây bít tắc lỗ chân lông sinh mụn ẩn và đổ dầu. Bên Nhật họ chuộng triết lý <strong>'Skincare Diet'</strong> — tối giản dưỡng chất.</p>
           <p>Da tuổi này cần <strong>ĐÚNG THỨ NÓ THIẾU</strong> chứ không cần bội thực mỹ phẩm. Chị cứ thử xem, bôi đúng 1 món xịn thấm sâu hiệu quả hơn bôi 5 món loãng xẹp nhiều lắm ạ :)))</p>`
  },

  faq6_sensitive: {
    question: "Da chị nhạy cảm, dễ mẩn đỏ có dùng an toàn không?",
    text: `<p>Chị cẩn thận vậy là hoàn toàn đúng, da mặt mình mà, không thể ẩu được. Em cam kết với chị 2 điều này để chị an tâm tuyệt đối:</p>
           <p>1. Dòng Ultimune này thành phần từ <strong>nấm Linh chi đỏ và rễ Diên vĩ thảo mộc</strong>, không cồn khô, không paraben, đã được kiểm nghiệm da liễu trên 1.200 phụ nữ có làn da nhạy cảm nhất.<br>
           2. Em có chính sách <strong>Bảo hiểm làn da 7 ngày:</strong> Chị dùng thử trong tuần đầu tiên, nếu có bất kỳ hiện tượng kích ứng hay ngứa rát nào, chị cứ gửi lại hàng em hoàn tiền 100% không hỏi thêm câu nào. Em bán bằng uy tín đi làm của em nên chị cứ yên tâm nhé!</p>`
  },

  faq7_pregnancy: {
    question: "Đang mang thai hoặc cho con bú có dùng được không?",
    text: `<p>Dạ sản phẩm thuần chiết xuất thảo mộc lành tính, không có hoạt chất lột tẩy mạnh nên mẹ bầu và mẹ sau sinh dùng rất nhiều chị ạ.</p>
           <p>Tuy nhiên lúc này nội tiết tố chị em mình thay đổi thất thường, nếu cơ địa chị trước giờ cực kỳ kén đồ thì chị cứ nhắn em tình trạng da hiện tại, em soi kỹ từng thành phần xem có món nào kén da chị không rồi hẵng quyết định, không việc gì phải vội chị nha!</p>`
  },

  faq8_authentic: {
    question: "Nguồn gốc ở đâu, làm sao biết hàng chuẩn chính hãng Shiseido Nhật?",
    text: `<p>Em hiểu nỗi lo này của chị, giờ mỹ phẩm giả tinh vi nhìn vỏ giống y đúc. Hàng của em là dòng Shiseido Ginza Tokyo nhập khẩu chính ngạch từ Nhật Bản, có tem phụ tiếng Việt và mã QR code đầy đủ.</p>
           <p>Khi shipper giao tới, chị cứ <strong>mở hộp đồng kiểm</strong> thoải mái trước khi trả tiền. Nếu phát hiện hàng nhái hay hàng không chuẩn, em đền gấp 10 lần giá trị và chịu hoàn toàn trách nhiệm trước pháp luật chị nhé!</p>`
  },

  faq9_price: {
    question: "Giá 2.480k / 2.780k hơi chát, bên ngoài có chỗ bán rẻ hơn?",
    text: `<p>Chị bảo bên kia rẻ hơn là đúng thật, nhiều bên họ làm giá mềm lắm chị. Nhưng thật ra tiền nào của nấy: Các bên đó họ bán món đơn lẻ, chị muốn đủ ẩm ngồi điều hòa thì phải mua thêm cả kem dưỡng ẩm lẫn kem chống lão hóa, cộng lại cũng tiền triệu mà sáng ra bôi trát lỉnh kỉnh mất thời gian.</p>
           <p>Món của em là dòng sinh học tích hợp <strong>All-in-one cao cấp:</strong> Thoa 30 giây là xong cả cấp ẩm sâu lẫn phục hồi, không bóng nhờn. Tính ra chị vừa tiết kiệm tiền mua 2 món lỉnh kỉnh khác, vừa mua được thêm 15 phút ngủ thêm mỗi sáng, nhẹ đầu hơn nhiều chị ạ.</p>`,
    hasActionCard: true
  },

  faq10_lazy: {
    question: "Chị lười lắm, sáng dậy cuống cuồng sợ mua về lại vứt xó?",
    text: `<p>Trời ơi chị ơi, trước đây em cũng y chang chị vậy =))) Mua nguyên bộ 7 bước về nhìn hàng tá lọ là thấy áp lực rồi, mệt mỏi đi làm về chỉ muốn ngủ chứ ai rảnh đâu mà bôi trát.</p>
           <p>Đó là lý do em chỉ chọn đúng giải pháp <strong>'Làm đẹp lười 3 phút'</strong> này thôi! Chị không cần nhớ thứ tự phức tạp: Sáng rửa mặt xong ấn đúng 2 giọt thoa đều 30 giây là xong việc. Lười cỡ nào cũng làm được trong 30 giây mà da vẫn căng mọng. Chị thử xem, không hề tốn công chút nào đâu ạ!</p>`
  },

  hesitate_survey: {
    question: "Để tôi nghĩ thêm / Chưa vội mua ngay?",
    text: `<p><strong>Dạ vâng hoàn toàn không sao chị ơi!</strong> Mua đồ chăm sóc da cho mình thì chị cứ thong thả tìm hiểu kỹ, khi nào thấy thật sự cần và ưng bụng nhất thì hãy mua, không việc gì phải vội chị nha 😊</p>
           <p>Thật ra em hiểu mà, sản phẩm tiền triệu ai cũng cần đắn đo, nhất là nỗi sợ mua về lại không hợp da hoặc bận quá rồi lười bôi bỏ xó.</p>
           <p>Dù chị chưa mua ngay, DealNgon xin phép gửi tặng chị bản <strong>Checklist Da Đẹp 3 Phút (File PDF in dán gương)</strong> hoàn toàn miễn phí nhé! Trong này có mẹo <em>'15 giây áp tay ấm'</em> độc quyền cho dân văn phòng ngồi điều hòa — không cần mua thêm mỹ phẩm đắt tiền mà da vẫn đủ ẩm êm ru suốt 8 tiếng.</p>
           <p style="font-size:0.82rem; color:#8E8D95; margin-top:6px;"><em>(Em đã ghi chú giữ nguyên suất Hộp quà VIP 450.000đ và giá ưu đãi này cho chị đến hết tuần. Lúc nào thảnh thơi muốn dùng, chị chỉ cần nhắn em là được nha!)</em></p>`,
    hasSurveyCard: true
  }
};

// Danh sách gợi ý nút bấm nhanh
const QUICK_CHIPS = [
  { key: "buyIntent", label: "🎁 Ưu đãi & Đặt mua ngay", highlight: true },
  { key: "faq1_oily", label: "💧 Da dầu có bí/bóng nhờn?" },
  { key: "faq2_sunscreen", label: "☀️ Có cần kem chống nắng?" },
  { key: "faq3_results", label: "⏳ Dùng bao lâu hết mốc khóe mũi?" },
  { key: "faq4_aging", label: "✨ 38-40 tuổi đủ chống lão hóa?" },
  { key: "faq5_minimal", label: "🌿 Bôi ít có ăn thua (Skincare Diet)?" },
  { key: "faq6_sensitive", label: "🛡️ Da nhạy cảm có an toàn?" },
  { key: "faq7_pregnancy", label: "🤰 Bầu bí / cho con bú dùng được?" },
  { key: "faq8_authentic", label: "🇯🇵 Nguồn gốc chính hãng Shiseido?" },
  { key: "faq9_price", label: "💰 Giá 2.480k/2.780k sao cao hơn bên ngoài?" },
  { key: "faq10_lazy", label: "😴 Lười & bận sợ mua về vứt xó?" },
  { key: "hesitate_survey", label: "📋 Chưa vội mua, nhận cẩm nang quà tặng" }
];

/* ---------------- Khởi tạo Chatbot ---------------- */
function initChatbot() {
  const chatWrapper = document.getElementById('chatbotWrapper');
  if (!chatWrapper) return;

  renderQuickChips();

  // Hiển thị teaser lời chào sau 2.5 giây nếu khách chưa mở
  setTimeout(() => {
    const teaser = document.getElementById('chatTeaser');
    if (teaser && !chatWrapper.classList.contains('open')) {
      teaser.style.display = 'flex';
    }
  }, 2500);
}

function renderQuickChips() {
  const chipsContainer = document.getElementById('chatQuickChips');
  if (!chipsContainer) return;

  chipsContainer.innerHTML = '';
  QUICK_CHIPS.forEach(chip => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `quick-chip ${chip.highlight ? 'highlight' : ''}`;
    btn.textContent = chip.label;
    btn.onclick = () => handleChipClick(chip.key, chip.label);
    chipsContainer.appendChild(btn);
  });
}

function toggleChatWindow(forceState) {
  const chatWrapper = document.getElementById('chatbotWrapper');
  const chatWindow = document.getElementById('chatWindow');
  const chatBadge = document.getElementById('chatBadge');
  const teaser = document.getElementById('chatTeaser');

  if (!chatWrapper) return;

  const isOpen = forceState !== undefined ? forceState : !chatWrapper.classList.contains('open');

  if (isOpen) {
    chatWrapper.classList.add('open');
    if (chatWindow) chatWindow.setAttribute('aria-hidden', 'false');
    if (chatBadge) chatBadge.style.display = 'none';
    if (teaser) teaser.style.display = 'none';

    // Tự động chào lần đầu tiên mở chat
    if (!chatHasGreeted) {
      chatHasGreeted = true;
      triggerBotReply(CHATBOT_KB.greeting.text, false, false, 300);
    }

    // Tự động focus vào ô nhập
    setTimeout(() => {
      const input = document.getElementById('chatInput');
      if (input && window.innerWidth > 768) input.focus();
    }, 400);
  } else {
    chatWrapper.classList.remove('open');
    if (chatWindow) chatWindow.setAttribute('aria-hidden', 'true');
  }
}

function closeChatTeaser() {
  const teaser = document.getElementById('chatTeaser');
  if (teaser) {
    teaser.style.opacity = '0';
    setTimeout(() => { teaser.style.display = 'none'; }, 300);
  }
}

/* ---------------- Gửi & Xử lý tin nhắn ---------------- */
function handleChipClick(key, labelText) {
  addUserMessage(labelText);

  const kbItem = CHATBOT_KB[key];
  if (kbItem) {
    triggerBotReply(kbItem.text, kbItem.hasActionCard, kbItem.hasSurveyCard, 500);
  }
}

function handleChatSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('chatInput');
  if (!input) return;

  const userText = input.value.trim();
  if (!userText) return;

  addUserMessage(userText);
  input.value = '';

  // Nhận diện từ khóa thông minh
  processUserQuery(userText);
}

function addUserMessage(text) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;

  const timeStr = getCurrentTimeStr();
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg user';
  msgDiv.innerHTML = `
    <div class="user-bubble">${escapeHtml(text)}</div>
    <span class="msg-time">${timeStr}</span>
  `;
  messagesContainer.appendChild(msgDiv);
  scrollChatToBottom();
}

function triggerBotReply(htmlContent, hasActionCard = false, hasSurveyCard = false, delayMs = 600) {
  const typingEl = document.getElementById('chatTyping');
  if (typingEl) typingEl.style.display = 'flex';
  scrollChatToBottom();

  setTimeout(() => {
    if (typingEl) typingEl.style.display = 'none';

    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    let extraHtml = '';
    if (hasActionCard) {
      extraHtml = `
        <div class="chat-action-card">
          <div class="chat-card-title"><i class="fa-solid fa-gift"></i> Suất Ưu Đãi Gom Chung Hôm Nay:</div>
          <div class="chat-pkg-item">• <strong>Gói 30ml:</strong> <span class="chat-pkg-price">2.480.000đ</span> <em>(Tiết kiệm 500k)</em></div>
          <div class="chat-pkg-item">• <strong>Combo 50ml + Kem 15ml:</strong> <span class="chat-pkg-price">2.780.000đ</span> + 🎁 Hộp quà VIP <strong>450.000đ</strong></div>
          <button type="button" class="chat-cta-btn" onclick="goToOrderForm()">
            <i class="fa-solid fa-cart-shopping"></i> ĐẶT HÀNG / VÀO DANH SÁCH CHỜ NGAY
          </button>
          <button type="button" class="chat-sub-btn" onclick="goToSurveyForm()">
            📋 Chưa vội mua? Điền khảo sát 1 phút nhận quà
          </button>
        </div>
      `;
    } else if (hasSurveyCard) {
      extraHtml = `
        <div class="chat-action-card chat-checklist-card" style="background:#F0FDF4; border:1.5px dashed #86EFAC; border-radius:14px; padding:12px; margin-top:10px;">
          <div class="chat-card-title" style="color:#16A34A; font-weight:800; font-size:0.84rem; display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <i class="fa-solid fa-gift"></i> Quà Tặng Miễn Phí Dành Riêng Cho Chị:
          </div>
          <div style="font-size:0.82rem; color:#1E3A8A; margin:4px 0 8px; line-height:1.5;">
            📄 <strong>Checklist Da Đẹp 3 Phút (PDF in dán gương)</strong><br>
            • Bí quyết 1 bước thay 5 bước mỗi sáng<br>
            • Mẹo 15 giây áp tay ấm chống khô mốc cánh mũi suốt 8 tiếng
          </div>

          <div class="chat-email-box" style="background:#FFFFFF; border:1.5px solid #86EFAC; border-radius:10px; padding:10px; margin-top:8px;">
            <div style="font-size:0.79rem; color:#166534; font-weight:700; display:flex; align-items:center; gap:5px; margin-bottom:6px;">
              <i class="fa-solid fa-envelope"></i> Chị nhập email để nhận file PDF tự động nhé:
            </div>
            <form class="chat-email-form" onsubmit="handleChatEmailSubmit(event, this)">
              <div style="display:flex; gap:6px;">
                <input type="email" class="chat-inline-email" placeholder="Nhập địa chỉ email của chị..." required autocomplete="email" style="flex:1; min-width:0; padding:8px 10px; border:1.5px solid #CBD5E1; border-radius:8px; font-size:0.82rem; outline:none; background:#F8FAFC;">
                <button type="submit" class="chat-inline-submit" style="background:linear-gradient(135deg, #16A34A 0%, #10B981 100%); color:#fff; border:none; border-radius:8px; padding:8px 12px; font-weight:700; font-size:0.8rem; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:4px; box-shadow:0 3px 10px rgba(16, 185, 129, 0.3);">
                  <i class="fa-solid fa-paper-plane"></i> Gửi ngay
                </button>
              </div>
              <div style="font-size:0.71rem; color:#64748B; margin-top:4px;">
                🔒 File PDF sẽ tự động gửi vào hòm thư sau 10 giây
              </div>
            </form>
          </div>

          <div style="margin-top:10px; padding-top:8px; border-top:1px dashed #CBD5E1; text-align:center;">
            <span style="font-size:0.75rem; color:#64748B;">Chị còn lăn tăn điểm nào? Bấm hỏi em giải đáp thật lòng nha:</span>
            <div style="display:flex; flex-wrap:wrap; gap:4px; justify-content:center; margin-top:6px;">
              <button type="button" class="quick-chip" style="font-size:0.72rem; padding:4px 8px;" onclick="handleChipClick('faq9_price', 'Giá tiền triệu liệu có đắt quá không em?')">💰 Giá có đắt quá?</button>
              <button type="button" class="quick-chip" style="font-size:0.72rem; padding:4px 8px;" onclick="handleChipClick('faq6_sensitive', 'Da nhạy cảm mẩn đỏ dùng có an toàn?')">🛡️ Da nhạy cảm?</button>
              <button type="button" class="quick-chip" style="font-size:0.72rem; padding:4px 8px;" onclick="handleChipClick('faq10_lazy', 'Chị bận và lười lắm, 3 phút có ăn thua?')">😴 Lười có dùng được?</button>
            </div>
          </div>
        </div>
      `;
    }

    const timeStr = getCurrentTimeStr();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg bot';
    msgDiv.innerHTML = `
      <div class="bot-bubble">
        ${htmlContent}
        ${extraHtml}
      </div>
      <span class="msg-time">${timeStr}</span>
    `;
    messagesContainer.appendChild(msgDiv);
    scrollChatToBottom();
  }, delayMs);
}

/* ---------------- Nhận diện từ khóa trả lời thông minh ---------------- */
function processUserQuery(text) {
  // 0. Khách nhập email trực tiếp vào ô chat -> Gửi tự động Checklist Da Đẹp 3 Phút
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    const email = emailMatch[1];
    sendChatbotChecklistEmail(email, null);
    return;
  }

  // 1. Khách do dự / suy nghĩ thêm / chưa mua ngay / cân nhắc (Đặt lên đầu để không bị nhận nhầm từ khóa "mua")
  const lower = text.toLowerCase();
  const norm = removeAccents(lower);

  const isDeNghiYeuCau = lower.includes('đề nghị') || norm.includes('de nghi giup') || norm.includes('de nghi ho tro');
  const hesitationRegex = /(suy nghi|nghi them|nghi lai|nghi da|de\s+(?:toi|chi|em|minh|to|tao|anh)?\s*nghi)/;
  const hesitationKeywords = [
    'nghi them', 'suy nghi', 'can nhac', 'chua voi', 'tu tu', 'xem da', 'de xem', 'xem them',
    'hoi chong', 'hoi y kien', 'hoi ban', 'hoi gia dinh',
    'chua mua', 'chua muon mua', 'chua co tien', 'chua co luong', 'ket tien',
    'tham khao', 'de do da', 'de sau', 'khi khac', 'luc khac', 'dip khac',
    'dan do', 'phan van', 'lan tan', 'chua can', 'chua lay', 'de do',
    'tinh sau', 'thoi de'
  ];

  if (!isDeNghiYeuCau && (hesitationRegex.test(norm) || hasKeywords(norm, hesitationKeywords))) {
    const item = CHATBOT_KB.hesitate_survey;
    triggerBotReply(item.text, false, true, 600);
    return;
  }

  // 1. Ý định mua hàng / xem giá / đặt hàng / combo / quà tặng -> Hiện ngay kịch bản chốt đơn & Nút danh sách chờ
  if (hasKeywords(norm, ['mua', 'dat hang', 'dat mua', 'order', 'gia', 'bao nhieu', 'combo', 'khuyen mai', 'qua tang', 'danh sach cho', 'lay 1 lo', 'lay 1 bo', 'ship', 'tien'])) {
    const item = CHATBOT_KB.buyIntent;
    triggerBotReply(item.text, true, false, 600);
    return;
  }

  // 2. Da dầu / đổ dầu / bóng nhờn / bí da
  if (hasKeywords(norm, ['dau', 'bi da', 'bong nhay', 'nhon', 'bi lo chan long', 'do dau'])) {
    const item = CHATBOT_KB.faq1_oily;
    triggerBotReply(item.text, false, false, 600);
    return;
  }

  // 3. Kem chống nắng / kem lót / trang điểm
  if (hasKeywords(norm, ['chong nang', 'kem lot', 'trang diem', 'make up', 'bb cream', 'phan'])) {
    const item = CHATBOT_KB.faq2_sunscreen;
    triggerBotReply(item.text, false, false, 600);
    return;
  }

  // 4. Bao lâu hiệu quả / khô mốc khóe mũi
  if (hasKeywords(norm, ['bao lau', 'may ngay', 'hieu qua', 'kho moc', 'canh mui', 'kho da', 'tac dung'])) {
    const item = CHATBOT_KB.faq3_results;
    triggerBotReply(item.text, false, false, 600);
    return;
  }

  // 5. Tuổi 35, 38, 40 / chống lão hóa / nếp nhăn / rãnh cười
  if (hasKeywords(norm, ['35', '38', '40', '42', '45', 'tuoi', 'ranh cuoi', 'nep nhan', 'lao hoa', 'chay xe', 'du do'])) {
    const item = CHATBOT_KB.faq4_aging;
    triggerBotReply(item.text, false, false, 600);
    return;
  }

  // 6. Nhiều bước / 7 bước / 10 bước / ít bước / skincare diet
  if (hasKeywords(norm, ['7 buoc', '10 buoc', 'it buoc', 'toi gian', 'skincare diet', 'boi it', 'an thua', 'nhieu buoc'])) {
    const item = CHATBOT_KB.faq5_minimal;
    triggerBotReply(item.text, false, false, 600);
    return;
  }

  // 7. Da nhạy cảm / mẩn đỏ / dị ứng / kích ứng
  if (hasKeywords(norm, ['nhay cam', 'man do', 'di ung', 'kich ung', 'ngua', 'rat', 'an toan'])) {
    const item = CHATBOT_KB.faq6_sensitive;
    triggerBotReply(item.text, false, false, 600);
    return;
  }

  // 8. Bầu bí / mang thai / cho con bú
  if (hasKeywords(norm, ['bau', 'mang thai', 'cho con bu', 'sau sinh', 'me bim'])) {
    const item = CHATBOT_KB.faq7_pregnancy;
    triggerBotReply(item.text, false, false, 600);
    return;
  }

  // 9. Nguồn gốc / chính hãng / thật giả / Nhật Bản
  if (hasKeywords(norm, ['chinh hang', 'that', 'gia', 'nhai', 'nguon goc', 'xuat xu', 'nhat ban', 'shiseido'])) {
    const item = CHATBOT_KB.faq8_authentic;
    triggerBotReply(item.text, false, false, 600);
    return;
  }

  // 10. Chê đắt / so sánh giá bên ngoài rẻ hơn
  if (hasKeywords(norm, ['chat', 'dat', 'cao', 're hon', 'ben kia', 'dat the', 'mac'])) {
    const item = CHATBOT_KB.faq9_price;
    triggerBotReply(item.text, true, false, 600);
    return;
  }

  // 11. Lười / bận con cái / sợ vứt xó
  if (hasKeywords(norm, ['luoi', 'ban', 'con cai', 'vut xo', 'ngai', 'khong co thoi gian'])) {
    const item = CHATBOT_KB.faq10_lazy;
    triggerBotReply(item.text, false, false, 600);
    return;
  }

  // Fallback mặc định: Giọng tư vấn thân mật của DealNgon (không chèn bảng giá khi khách không hỏi)
  const fallbackText = `
    <p>Dạ em DealNgon đây ạ! Chị muốn em tư vấn thêm về tình trạng da (khô mốc, đổ dầu, lão hóa...) hay chị đang quan tâm điểm nào thế chị?</p>
    <p>Chị có thể bấm nhanh vào các nút gợi ý câu hỏi ở thanh trượt bên dưới hoặc nhắn trực tiếp cho em nha :)))</p>
  `;
  triggerBotReply(fallbackText, false, false, 600);
}

function hasKeywords(text, keywords) {
  return keywords.some(kw => text.includes(kw));
}

function removeAccents(str) {
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getCurrentTimeStr() {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function scrollChatToBottom() {
  const body = document.getElementById('chatBody');
  if (body) {
    setTimeout(() => {
      body.scrollTop = body.scrollHeight;
    }, 50);
  }
}

/* ---------------- Hành động dẫn đến Form ---------------- */

// Nút dẫn đến Form Đặt Hàng / Danh Sách Chờ
function goToOrderForm() {
  const orderSection = document.getElementById('order-form');
  if (orderSection) {
    orderSection.scrollIntoView({ behavior: 'smooth' });

    // Highlight nhẹ form để khách dễ chú ý
    const formBox = document.querySelector('.order-glass-box');
    if (formBox) {
      formBox.style.outline = '3px solid #D32F2F';
      formBox.style.boxShadow = '0 0 35px rgba(211, 47, 47, 0.45)';
      setTimeout(() => {
        formBox.style.outline = 'none';
        formBox.style.boxShadow = '';
      }, 2500);
    }

    // Tự động focus vào ô nhập họ tên
    setTimeout(() => {
      const nameInput = document.getElementById('customerName');
      if (nameInput) nameInput.focus();
    }, 700);
  }

  // Thu nhỏ chatbot trên màn hình nhỏ để khách thấy rõ form
  if (window.innerWidth <= 768) {
    toggleChatWindow(false);
  }
}

// Nút dẫn đến Form Khảo Sát Nhận Cẩm Nang & Quà
function goToSurveyForm() {
  const surveySection = document.getElementById('khao-sat');
  if (surveySection) {
    surveySection.scrollIntoView({ behavior: 'smooth' });
  }

  if (window.innerWidth <= 768) {
    toggleChatWindow(false);
  }
}

/* ---------------- Xử lý gửi email tự động nhận Checklist từ Chatbot ---------------- */
function handleChatEmailSubmit(event, formEl) {
  if (event) event.preventDefault();
  const inputEl = formEl ? formEl.querySelector('input[type="email"]') : null;
  const email = inputEl ? inputEl.value.trim() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Chị vui lòng nhập đúng định dạng email (ví dụ: ten@gmail.com) nha!');
    return;
  }
  const submitBtn = formEl ? formEl.querySelector('button[type="submit"]') : null;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
  }
  sendChatbotChecklistEmail(email, formEl);
}

async function sendChatbotChecklistEmail(email, formEl) {
  const isStatic = window.location.hostname.includes('github.io') || window.location.hostname === 'dealngon.online';
  const ADMIN_SERVER = localStorage.getItem('adminServerUrl') || (isStatic ? 'https://web-production-42cec4.up.railway.app' : window.location.origin);

  // 1. Đồng bộ lên Admin Server để kích hoạt chuỗi email Resend tự động
  try {
    fetch(ADMIN_SERVER + '/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Khách Chatbot',
        email: email,
        source: 'waitlist',
        notes: 'Nhận Checklist Da Đẹp 3 Phút (PDF) từ Chatbot'
      })
    }).catch(err => console.warn('Lỗi API customers:', err));
  } catch (e) {}

  // 2. Gửi dự phòng FormSubmit
  try {
    fetch('https://formsubmit.co/ajax/toquynhanh@gmail.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        '_subject': `🎁 [CHATBOT NHẬN CHECKLIST] ${email}`,
        'Email': email,
        'Nguồn': 'Chatbot Website DealNgon',
        'Nội dung': 'Yêu cầu gửi Checklist Da Đẹp 3 Phút (File PDF)',
        '_template': 'table',
        '_captcha': 'false'
      })
    }).catch(() => {});
  } catch (e) {}

  // 3. Cập nhật hộp email trong card tin nhắn (nếu có formEl)
  if (formEl) {
    const parentBox = formEl.closest('.chat-email-box');
    if (parentBox) {
      parentBox.innerHTML = `
        <div style="color:#16A34A; font-weight:700; font-size:0.83rem; display:flex; align-items:center; gap:6px; padding:4px 0;">
          <i class="fa-solid fa-circle-check" style="font-size:1.15rem; color:#10B981;"></i>
          <span>Đã gửi thành công tới: <u style="word-break:break-all;">${escapeHtml(email)}</u></span>
        </div>
      `;
    }
  }

  // 4. Chatbot gửi tin nhắn xác nhận ấm áp + Nút tải trực tiếp dự phòng
  const confirmHtml = `
    <p>🎉 <strong>DealNgon đã gửi tặng bản Checklist Da Đẹp 3 Phút tới hòm thư của chị rồi ạ!</strong></p>
    <div style="background:#ECFDF5; border-left:3.5px solid #10B981; padding:8px 12px; border-radius:6px; margin:8px 0; font-weight:700; color:#065F46; font-size:0.84rem; word-break:break-all;">
      📧 ${escapeHtml(email)}
    </div>
    <p>Chị mở hòm thư kiểm tra trong 1–2 phút tới nhé <em>(nếu chưa thấy chị nhớ ngó qua mục Spam hoặc Quảng cáo giúp em nha)</em>.</p>
    <p>🎁 <strong>Một lưu ý nhỏ xinh:</strong> Em đã ghi chú giữ nguyên suất <strong>Hộp quà VIP 450.000đ</strong> và giá ưu đãi này cho chị đến hết tuần này rồi ạ. Lúc nào chị thong thả muốn trải nghiệm để da thảnh thơi, chị cứ nhắn em là được nhận quà ngay nha!</p>
    <div style="margin-top:12px; padding:12px; background:#F8FAFC; border:1.5px dashed #CBD5E1; border-radius:12px; text-align:center;">
      <span style="font-size:0.79rem; color:#64748B; display:block; margin-bottom:8px;">Nếu chị muốn đọc ngay trên điện thoại không cần mở mail:</span>
      <a href="/Checklist-Da-Dep-3-Phut-DealNgon.pdf" download="Checklist-Da-Dep-3-Phut-DealNgon.pdf" target="_blank" class="chat-cta-btn" style="background:linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%); box-shadow:0 4px 14px rgba(2, 132, 199, 0.35); text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:6px; margin-top:0;">
        <i class="fa-solid fa-file-pdf"></i> BẤM TẢI TRỰC TIẾP FILE PDF NGAY
      </a>
    </div>
  `;
  triggerBotReply(confirmHtml, false, false, 700);
}


/* ── Digital Product Checkout ─────────────────────────────── */
function openDigitalCheckout() {
  window.location.href = '/thanh-toan?package=pdf';
}
function closeDigitalModal() {
  document.getElementById('digitalModal').classList.remove('active');
}

// ── Helper validate SĐT & Email chuẩn Việt Nam ───────────────
function normalizeVNPhone(phone) {
  if (!phone) return '';
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+84')) clean = '0' + clean.slice(3);
  else if (clean.startsWith('84') && clean.length >= 11) clean = '0' + clean.slice(2);
  return clean;
}

function isValidVNPhone(phone) {
  const clean = normalizeVNPhone(phone);
  return /^(0)(3|5|7|8|9)[0-9]{8}$/.test(clean) || /^(02)[0-9]{9}$/.test(clean);
}

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function submitDigitalOrder(event) {
  event.preventDefault();
  const contactInput = document.getElementById('digitalContact');
  const contact = (contactInput?.value || '').trim();
  const name    = document.getElementById('digitalName')?.value.trim() || 'bạn';
  const btn     = event.target.querySelector('button[type=submit]');

  // Validate SĐT/Zalo
  if (!isValidVNPhone(contact) && !isValidEmail(contact)) {
    alert('⚠️ Số điện thoại hoặc Zalo nhận file không hợp lệ!\nVui lòng nhập đúng số điện thoại di động Việt Nam (10 số, ví dụ: 0977 338 876) để DealNgon gửi file PDF qua Zalo nhé.');
    if (contactInput) {
      contactInput.style.borderColor = '#ef4444';
      contactInput.focus();
    }
    return;
  }
  if (contactInput) contactInput.style.borderColor = '';

  btn.disabled = true;
  btn.textContent = '⏳ Đang gửi...';

  // Gửi thông báo qua FormSubmit
  fetch('https://formsubmit.co/ajax/toquynhanh@gmail.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      '_subject': `📄 [MUA CHECKLIST PDF] ${name} - ${contact}`,
      'Tên khách': name,
      'Zalo nhận file': contact,
      'Sản phẩm': 'Checklist Da Đẹp 3 Phút - 2.000đ',
      '_template': 'table',
      '_captcha': 'false'
    })
  })
  .then(() => {
    closeDigitalModal();
    alert(`✅ Mình nhận được rồi ${name}!\n\nDealNgon sẽ gửi file PDF qua Zalo ${contact} trong 5 phút nhé 🌸`);
    document.getElementById('digitalForm').reset();
  })
  .catch(() => {
    alert('Mạng có vấn đề — bạn nhắn thẳng Zalo 0977338876 để mình gửi file nhé!');
  })
  .finally(() => {
    btn.disabled = false;
    btn.textContent = '✅ Đã chuyển khoản — Gửi thông tin nhận file';
  });
}

// Đóng digital modal khi click nền
document.getElementById('digitalModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeDigitalModal();
});


// ── Waitlist Survey Form Submission ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const surveyForm = document.getElementById('surveyForm');
  if (surveyForm) {
    const phoneInput = surveyForm.querySelector('#surveyPhone') || surveyForm.querySelector('input[name="sdt_zalo"]');
    const emailInput = surveyForm.querySelector('#surveyEmail') || surveyForm.querySelector('input[name="email"]');

    // Lắng nghe sự kiện người dùng gõ để tự xóa viền đỏ lỗi
    phoneInput?.addEventListener('input', () => { phoneInput.style.borderColor = ''; });
    emailInput?.addEventListener('input', () => { emailInput.style.borderColor = ''; });

    surveyForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const submitBtn = surveyForm.querySelector('.btn-survey-submit');
      const originalText = submitBtn ? submitBtn.innerHTML : '';

      const formData = new FormData(surveyForm);
      const ten = (formData.get('ten') || '').trim();
      const sdt = (formData.get('sdt_zalo') || '').trim();
      const email = (formData.get('email') || '').trim();
      const kenh = formData.get('kenh_mua_sam') || '';
      const sp = formData.get('san_pham_quan_tam') || '';
      const gia = formData.get('muc_gia') || '';

      // Reset viền lỗi
      if (phoneInput) phoneInput.style.borderColor = '';
      if (emailInput) emailInput.style.borderColor = '';

      // ── VALIDATION: Kiểm tra Số điện thoại ──
      if (!isValidVNPhone(sdt)) {
        alert('⚠️ Số điện thoại không hợp lệ!\n\nVui lòng nhập đúng số điện thoại di động Việt Nam (gồm 10 chữ số, ví dụ: 0912 345 678 hoặc 0977 338 876) để DealNgon gửi quà tặng và liên hệ.');
        if (phoneInput) {
          phoneInput.style.borderColor = '#ef4444';
          phoneInput.focus();
        }
        return;
      }

      // ── VALIDATION: Kiểm tra Email ──
      if (!isValidEmail(email)) {
        alert('⚠️ Địa chỉ Email không hợp lệ!\n\nVui lòng kiểm tra lại hòm thư (ví dụ: lananh@gmail.com) để nhận file Checklist Da Đẹp 3 Phút.');
        if (emailInput) {
          emailInput.style.borderColor = '#ef4444';
          emailInput.focus();
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span><i class="fa-solid fa-spinner fa-spin"></i> Đang gửi khảo sát...</span>';
      }

      const cleanPhone = normalizeVNPhone(sdt);
      const notes = `Kênh: ${kenh} · Quan tâm: ${sp} · Giá: ${gia}`;

      // 1. Đồng bộ khách hàng lên Admin (bảng customers, source: waitlist)
      const isStatic = window.location.hostname.includes('github.io') || window.location.hostname === 'dealngon.online';
      const ADMIN_SERVER = localStorage.getItem('adminServerUrl') || (isStatic ? 'https://web-production-42cec4.up.railway.app' : window.location.origin);
      if (ADMIN_SERVER && (cleanPhone || email)) {
        fetch(ADMIN_SERVER + '/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: ten || 'Khách waitlist',
            phone: cleanPhone,
            zalo: cleanPhone,
            email: email,
            source: 'waitlist',
            notes: notes
          })
        }).catch(err => console.warn('Lỗi lưu waitlist admin:', err));
      }

      // 2. Gửi thông báo về Email Admin & Tự động gửi quà tặng cho khách (FormSubmit)
      try {
        fetch("https://formsubmit.co/ajax/toquynhanh@gmail.com", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            "_subject": `📋 [KHẢO SÁT MỚI] ${ten || 'Khách'} - ${sdt || email}`,
            "Họ tên": ten || 'Khách khảo sát',
            "Số điện thoại / Zalo": sdt || '—',
            "email": email,
            "Email": email || '—',
            "Kênh mua sắm": kenh || '—',
            "Sản phẩm quan tâm": sp || '—',
            "Mức giá": gia || '—',
            "_replyto": email || 'toquynhanh@gmail.com',
            "_autoresponse": `Chào ${ten || 'bạn'},\n\nDealNgon cảm ơn bạn thật nhiều vì đã tin tưởng kết nối và dành 1 phút tham gia khảo sát!\n\nNhư đã hẹn, DealNgon xin phép gửi tặng bạn bản Checklist Da Đẹp 3 Phút (File PDF in dán gương) hoàn toàn miễn phí:\n👉 Bấm vào đây để tải ngay: https://dealngon.online/Checklist-Da-Dep-3-Phut-DealNgon.pdf\n\nCẩm nang này gói gọn bí quyết 1 bước thay 5 bước và mẹo 15 giây áp tay ấm giúp da căng mọng, êm ru suốt 8 tiếng ngồi máy lạnh.\n\nChúc bạn luôn rạng rỡ và thảnh thơi mỗi sớm mai! 🌸\n\nThương mến,\nDealNgon · https://dealngon.online`,
            "_template": "table",
            "_captcha": "false"
          })
        }).catch(() => {});
      } catch (e) {}

      // 3. Gửi dự phòng Formspree
      try {
        await fetch(surveyForm.action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });
      } catch (err) {}

      // 3. Hiển thị thông báo thành công
      surveyForm.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
      const successMsg = document.getElementById('surveySuccess');
      if (successMsg) {
        successMsg.style.display = 'block';
        successMsg.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
});
