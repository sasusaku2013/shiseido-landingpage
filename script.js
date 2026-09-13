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

  // Kiểm tra môi trường chạy:
  // Nếu đang mở file trực tiếp trên máy (file:///), trình duyệt chặn gọi ngầm (CORS: Origin null)
  // Ta sẽ gửi trực tiếp (Native Form Submit) để FormSubmit nhận đơn ngay và gửi email kích hoạt tới toquynhanh@gmail.com!
  const isLocalFile = window.location.protocol === 'file:';

  if (isLocalFile) {
    const form = document.getElementById('mainCheckoutForm');
    // Cập nhật tiêu đề email động
    const subjectInput = form.querySelector('input[name="_subject"]');
    if (subjectInput) {
      subjectInput.value = `🌸 [ĐƠN HÀNG SHISEIDO MỚI] ${name} - ${phone}`;
    }
    // Gửi form trực tiếp
    form.submit();
    return;
  }

  // Nếu đang chạy trên Website thật (GitHub Pages, tên miền riêng hoặc localhost)
  // Dùng Fetch gửi ngầm để hiển thị Modal Thành Công mượt mà không cần chuyển trang
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

  fetch("https://formsubmit.co/ajax/toquynhanh@gmail.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(orderData)
  })
  .then(response => {
    if (!response.ok) throw new Error("Gửi không thành công");
    return response.json();
  })
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

    document.getElementById('mainCheckoutForm').reset();
  })
  .catch(error => {
    console.warn("Chuyển sang gửi Form chuẩn do chính sách bảo mật trình duyệt:", error);
    // Fallback nếu fetch bị chặn: gửi form chuẩn
    const form = document.getElementById('mainCheckoutForm');
    form.submit();
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

/* ==========================================================================
   CHATBOT BÁN HÀNG — LÀM ĐẸP LƯỜI 3 PHÚT (THEO SALES_SCRIPT.MD)
   ========================================================================== */

let chatHasGreeted = false;

// Kịch bản bán hàng & tư vấn chi tiết từ sales_script.md
const CHATBOT_KB = {
  greeting: {
    text: `<p><strong>Chào chị ạ! Em là Quỳnh Anh đây.</strong></p>
           <p>Thấy chị đang ghé thăm trang, không biết da chị đợt này ngồi điều hòa có đang bị khô mốc hay đổ dầu khó chịu không, chị nhắn em tư vấn thật lòng nha :)))</p>
           <p style="font-size:0.8rem; color:#8E8D95; margin-top:6px;"><em>(Chị có thể bấm chọn nhanh các chủ đề bên dưới hoặc gõ tin nhắn trực tiếp cho em nhé!)</em></p>`
  },

  buyIntent: {
    text: `<p>Dạ đợt này em đang gom chung cho mấy chị em công ty nên mới được giá ưu đãi này đó chị:</p>
           <p>• <strong>Gói 1 (Trải nghiệm):</strong> Lọ 30ml chỉ <strong>590.000đ</strong> (giá gốc 850k).<br>
           • <strong>Gói 2 (Combo 3 phút bán chạy nhất):</strong> 1 Lọ Fullsize 50ml + 1 Hũ kem Vital 15ml chỉ <strong>850.000đ</strong> (tiết kiệm 500k) và được <strong>tặng luôn Hộp Quà VIP 450.000đ</strong> (gồm 3 mặt nạ lụa + băng đô nhung).</p>
           <p>Em khuyên thật lòng chị nên lấy Combo 850k vì vừa đủ bộ 2 bước khóa ẩm sâu, vừa được hời nguyên hộp quà VIP. Chị bấm nút bên dưới để vào danh sách nhận ưu đãi nhé!</p>`,
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
    question: "Giá 590k / 850k hơi chát, bên ngoài có chỗ bán rẻ hơn?",
    text: `<p>Chị bảo bên kia rẻ hơn là đúng thật, nhiều bên họ làm giá mềm lắm chị. Nhưng thật ra tiền nào của nấy: Các bên đó họ bán món đơn lẻ, chị muốn đủ ẩm ngồi điều hòa thì phải mua thêm cả kem dưỡng ẩm lẫn kem chống lão hóa, cộng lại cũng 600k–800k mà sáng ra bôi trát lỉnh kỉnh mất thời gian.</p>
           <p>Món của em là dòng sinh học tích hợp <strong>All-in-one cao cấp:</strong> Thoa 30 giây là xong cả cấp ẩm sâu lẫn phục hồi, không bóng nhờn. Tính ra chị vừa tiết kiệm tiền mua 2 món lỉnh kỉnh khác, vừa mua được thêm 15 phút ngủ thêm mỗi sáng, nhẹ đầu hơn nhiều chị ạ.</p>`,
    hasActionCard: true
  },

  faq10_lazy: {
    question: "Chị lười lắm, sáng dậy cuống cuồng sợ mua về lại vứt xó?",
    text: `<p>Trời ơi chị ơi, trước đây em cũng y chang chị vậy =))) Mua nguyên bộ 7 bước về nhìn hàng tá lọ là thấy áp lực rồi, mệt mỏi đi làm về chỉ muốn ngủ chứ ai rảnh đâu mà bôi trát.</p>
           <p>Đó là lý do em chỉ chọn đúng giải pháp <strong>'Làm đẹp lười 3 phút'</strong> này thôi! Chị không cần nhớ thứ tự phức tạp: Sáng rửa mặt xong ấn đúng 2 giọt thoa đều 30 giây là xong việc. Lười cỡ nào cũng làm được trong 30 giây mà da vẫn căng mọng. Chị thử xem, không hề tốn công chút nào đâu ạ!</p>`
  },

  hesitate_survey: {
    question: "Chưa vội mua, muốn tìm hiểu thêm & nhận cẩm nang?",
    text: `<p>Dạ vâng không sao chị ơi! Mua đồ dưỡng da cho mình thì cứ thong thả tìm hiểu cho ưng bụng và thoải mái nhất mới mua chị ạ!</p>
           <p>Nếu chị chưa vội mua ngay, chị lướt xuống cuối trang điền vào cái <strong>Form khảo sát nhanh 1 phút</strong> giúp em nhé. Điền xong em gửi tặng chị cẩm nang <strong>'3 Mẹo giữ ẩm cho da dân văn phòng ngồi điều hòa'</strong> qua Zalo đọc tham khảo chơi nha!</p>`,
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
  { key: "faq9_price", label: "💰 Giá 590k/850k sao cao hơn bên ngoài?" },
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
          <div class="chat-pkg-item">• <strong>Gói 30ml:</strong> <span class="chat-pkg-price">590.000đ</span> <em>(Tiết kiệm 260k)</em></div>
          <div class="chat-pkg-item">• <strong>Combo 50ml + Kem 15ml:</strong> <span class="chat-pkg-price">850.000đ</span> + 🎁 Hộp quà VIP <strong>450.000đ</strong></div>
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
        <div class="chat-action-card" style="background:#F0FDF4; border-color:#86EFAC;">
          <div class="chat-card-title" style="color:#16A34A;"><i class="fa-solid fa-clipboard-list"></i> Khảo Sát Nhận Cẩm Nang:</div>
          <p style="font-size:0.8rem; color:#1E3A8A; margin-bottom:8px;">Chỉ mất 1 phút điền form, em gửi cẩm nang qua Zalo và giữ suất ưu đãi 40% đến cuối tuần cho chị nhé!</p>
          <button type="button" class="chat-cta-btn" style="background:linear-gradient(135deg, #16A34A, #10B981);" onclick="goToSurveyForm()">
            <i class="fa-solid fa-arrow-right"></i> ĐIỀN FORM KHẢO SÁT NHẬN QUÀ (1 PHÚT)
          </button>
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
  const norm = removeAccents(text.toLowerCase());

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

  // 12. Suy nghĩ thêm / hỏi chồng / chưa mua / kẹt tiền
  if (hasKeywords(norm, ['suy nghi', 'hoi chong', 'chua mua', 'chua co tien', 'chua co luong', 'ket tien'])) {
    const item = CHATBOT_KB.hesitate_survey;
    triggerBotReply(item.text, false, true, 600);
    return;
  }

  // Fallback mặc định: Giọng tư vấn thân mật của Quỳnh Anh
  const fallbackText = `
    <p>Dạ em Quỳnh Anh đây ạ! Chị muốn em tư vấn kỹ hơn về tình trạng da (khô mốc, đổ dầu, lão hóa...) hay chị đang muốn nhận <strong>Gói ưu đãi gom chung kèm Hộp quà VIP 450k</strong> đợt này thế chị?</p>
    <p>Chị có thể bấm nhanh vào các nút gợi ý câu hỏi ở thanh trượt bên dưới hoặc nhắn trực tiếp cho em nha :)))</p>
  `;
  triggerBotReply(fallbackText, true, false, 600);
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

