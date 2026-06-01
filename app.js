const config = window.SUPABASE_CONFIG || {};
const hasSupabase = Boolean(config.url && config.anonKey && window.supabase);
const supabaseClient = hasSupabase ? window.supabase.createClient(config.url, config.anonKey) : null;

const view = document.querySelector("#view");
const stepPanel = document.querySelector("#stepPanel");
const toast = document.querySelector("#toast");
const roleBadge = document.querySelector("#roleBadge");
const accountName = document.querySelector("#accountName");
const ordersNavLabel = document.querySelector("#ordersNavLabel");
const historyNavLabel = document.querySelector("#historyNavLabel");

const receiverSteps = ["Quét QR", "Chọn đơn", "Xác thực", "Lấy hàng", "Đóng tủ", "Hoàn tất"];
const shipperSteps = ["Quét QR", "Đăng nhập", "Vận đơn", "Thanh toán", "Chọn ngăn", "Bỏ hàng", "Đóng tủ", "Cập nhật", "Hoàn tất"];

const receiverOrders = [
  { id: "DH001", shop: "Shopee", locker: "A12", sent: "09:30 hôm nay", remain: "Còn 2 giờ 15 phút", fee: "0đ", status: "Chờ nhận" },
  { id: "DH002", shop: "Lazada", locker: "B02", sent: "10:10 hôm nay", remain: "Sắp hết hạn", fee: "5.000đ", status: "Cần thanh toán phí" },
];

const shipperTasks = [
  { id: "DH118", receiver: "Nguyễn Văn A", status: "Chờ chọn ngăn", action: "Tiếp tục" },
  { id: "DH119", receiver: "Trần Minh Khang", status: "Chưa thanh toán", action: "Kiểm tra lại" },
];

const state = {
  route: "home",
  role: localStorage.getItem("smartlocker.role") || "resident",
  user: JSON.parse(localStorage.getItem("smartlocker.user") || "null"),
  currentStep: 0,
  selectedOrderId: "DH001",
  helperPhone: "",
  helperCode: "",
  doorAttempt: 0,
  otp: makeOtp(),
  draft: {
    parcelCode: "DH118",
    receiverPhone: "0901234567",
    receiverName: "Nguyễn Văn A",
    note: "",
    size: "Vừa",
    compartment: "A04",
  },
  history: JSON.parse(localStorage.getItem("smartlocker.history") || "null") || [
    { title: "DH000 - Shopee", status: "Đã lấy hàng lúc 08:45 hôm nay" },
    { title: "DH099 - Giao hàng", status: "Đã giao thành công, thưởng 700đ" },
  ],
};

const routes = {
  home,
  orders,
  history,
  profile,
  receiverQr,
  receiverOrdersScreen,
  receiverHelper,
  receiverProcess,
  receiverClose,
  receiverDoorCheck,
  receiverDone,
  shipperQr,
  shipperLogin,
  shipperParcel,
  shipperPayment,
  shipperPaymentWaiting,
  shipperCancelled,
  shipperChooseCompartment,
  shipperDropoff,
  shipperClose,
  shipperDoorCheck,
  shipperDone,
};

function makeOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function icon(name, className = "") {
  return `<span class="material-symbols-outlined ${className}" aria-hidden="true">${name}</span>`;
}

function saveState() {
  localStorage.setItem("smartlocker.role", state.role);
  localStorage.setItem("smartlocker.user", JSON.stringify(state.user));
  localStorage.setItem("smartlocker.history", JSON.stringify(state.history));
}

function setRoute(route) {
  state.route = route;
  if (!route.includes("DoorCheck")) state.doorAttempt = 0;
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2300);
}

function render() {
  updateChrome();
  view.innerHTML = (routes[state.route] || home)();
  stepPanel.innerHTML = stepper();
}

function updateChrome() {
  const isShipper = state.role === "shipper";
  roleBadge.textContent = isShipper ? "Người giao hàng" : "Cư dân";
  roleBadge.classList.toggle("shipper", isShipper);
  accountName.textContent = state.user?.name || "Nguyễn Văn A";
  ordersNavLabel.textContent = isShipper ? "Đơn giao" : "Đơn hàng";
  historyNavLabel.textContent = "Lịch sử";

  document.querySelectorAll(".nav-item").forEach((item) => {
    const route = item.dataset.route;
    const active = route === state.route || (route === "home" && state.route === "home");
    item.classList.toggle("active", active && !item.dataset.action);
  });
}

function currentSteps() {
  return state.role === "shipper" ? shipperSteps : receiverSteps;
}

function stepper() {
  const steps = currentSteps();
  return `
    <div class="stack">
      <span class="eyebrow">${state.role === "shipper" ? "Luồng giao hàng" : "Luồng nhận hàng"}</span>
      <h3>${state.role === "shipper" ? "Giao hàng nhanh" : "Nhận hàng nhanh"}</h3>
      <p class="muted">Chỉ hiển thị các bước người dùng cần thao tác. Trạng thái hệ thống được gộp trong màn xử lý.</p>
      <ol class="step-list compact">
        ${steps.map((step, index) => {
          const cls = index < state.currentStep ? "done" : index === state.currentStep ? "current" : "";
          return `<li class="${cls}">${step}</li>`;
        }).join("")}
      </ol>
    </div>
  `;
}

function progress(step, total = currentSteps().length) {
  const percent = Math.round((step / total) * 100);
  return `
    <div class="progress">
      <div class="progress-top">
        <span>Bước ${step}/${total}</span>
        <span>${percent}%</span>
      </div>
      <div class="bar"><span style="width:${percent}%"></span></div>
    </div>
  `;
}

function titleBlock(label, title, copy = "") {
  return `
    <div class="title-stack">
      <span class="eyebrow">${label}</span>
      <h2>${title}</h2>
      ${copy ? `<p class="lead">${copy}</p>` : ""}
    </div>
  `;
}

function sectionHeader(title, copy = "") {
  return `<div class="section-head"><h2>${title}</h2>${copy ? `<p class="muted">${copy}</p>` : ""}</div>`;
}

function home() {
  state.currentStep = 0;
  return state.role === "shipper" ? shipperDashboard() : residentDashboard();
}

function residentDashboard() {
  return `
    <div class="page">
      <section class="dashboard-hero">
        <div>
          <span class="eyebrow">Cư dân</span>
          <h1>Xin chào, Nguyễn Văn A</h1>
          <p class="lead">Bạn có <strong>2 đơn</strong> đang chờ nhận tại SmartLocker.</p>
        </div>
        <img src="./assets/green-locker.png" alt="Tủ khóa thông minh SmartLocker" />
      </section>
      <section class="action-panel">
        <div>
          <h2>Tác vụ chính</h2>
          <p class="muted">Đang đứng trước tủ? Quét QR để mở đúng ngăn.</p>
        </div>
        <div class="choice-grid">
          <button class="primary-btn tall-btn" data-route="receiverQr" type="button">${icon("qr_code_scanner")} Quét QR tủ</button>
          <button class="secondary-btn tall-btn" data-action="manualLocker" type="button">${icon("pin")} Nhập mã tủ thủ công</button>
        </div>
      </section>
      <section class="card button-stack">
        ${sectionHeader("Đơn đang chờ nhận", "Thông tin đủ để quyết định lấy đơn nào trước.")}
        <div class="list-stack">${receiverOrders.map(orderCard).join("")}</div>
      </section>
      <section class="card button-stack">
        ${sectionHeader("Không thấy đơn của bạn?", "Dùng khi nhận hàng giúp người thân hoặc bạn cùng nhà.")}
        <button class="secondary-btn" data-route="receiverHelper" type="button">${icon("group")} Lấy hộ người khác</button>
      </section>
    </div>
  `;
}

function shipperDashboard() {
  return `
    <div class="page">
      <section class="dashboard-hero shipper">
        <div>
          <span class="eyebrow">Người giao hàng - Đã duyệt</span>
          <h1>Giao hàng hôm nay</h1>
          <p class="lead">Ưu tiên quét tủ, nhập vận đơn và xử lý đơn đang giao.</p>
        </div>
        <img src="./assets/green-locker.png" alt="Tủ khóa thông minh SmartLocker" />
      </section>
      <section class="action-panel">
        <div>
          <h2>Bắt đầu giao hàng</h2>
          <p class="muted">Quét QR tủ trước, sau đó nhập hoặc quét mã vận đơn.</p>
        </div>
        <div class="choice-grid">
          <button class="primary-btn tall-btn" data-route="shipperQr" type="button">${icon("qr_code_scanner")} Quét QR tủ</button>
          <button class="secondary-btn tall-btn" data-route="shipperParcel" type="button">${icon("barcode_scanner")} Nhập mã vận đơn</button>
        </div>
      </section>
      <section class="metric-grid">
        ${metric("Cần giao", "12", "inventory_2")}
        ${metric("Đã hoàn thành", "45", "task_alt")}
        ${metric("Đơn lỗi", "0", "error")}
        ${metric("Thu nhập", "31.500đ", "payments")}
      </section>
      <section class="card button-stack">
        ${sectionHeader("Đơn đang xử lý", "Tiếp tục đúng bước, không cần xem lại hướng dẫn.")}
        <div class="list-stack">
          ${shipperTasks.map((task) => `
            <article class="task-card">
              <span class="order-icon">${icon("local_shipping")}</span>
              <div>
                <strong>${task.id}</strong>
                <p class="muted">${task.receiver} • ${task.status}</p>
              </div>
              <button class="mini-btn" data-route="shipperPayment" type="button">${task.action}</button>
            </article>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function metric(label, value, symbol) {
  return `
    <button class="metric-card" data-route="orders" type="button">
      <span>${icon(symbol)}</span>
      <small>${label}</small>
      <strong>${value}</strong>
    </button>
  `;
}

function orderCard(order) {
  return `
    <article class="rich-order-card">
      <div class="order-topline">
        <div>
          <strong>${order.id} - ${order.shop}</strong>
          <p class="muted">Ngăn ${order.locker} • ${order.status}</p>
        </div>
        <button class="mini-btn" data-action="selectReceiverOrder" data-order="${order.id}" type="button">Lấy hàng</button>
      </div>
      <div class="order-meta">
        <span>Đã gửi: ${order.sent}</span>
        <span>${order.remain}</span>
        <span>Phí: ${order.fee}</span>
      </div>
    </article>
  `;
}

function orders() {
  return `
    <section class="hero-card button-stack">
      ${titleBlock(state.role === "shipper" ? "Đơn giao" : "Đơn hàng", state.role === "shipper" ? "Đơn đang xử lý" : "Đơn đang chờ nhận")}
      <div class="list-stack">
        ${state.role === "shipper"
          ? shipperTasks.map((task) => `<article class="task-card"><span class="order-icon">${icon("local_shipping")}</span><div><strong>${task.id}</strong><p class="muted">${task.receiver} • ${task.status}</p></div><button class="mini-btn" data-route="shipperPayment" type="button">${task.action}</button></article>`).join("")
          : receiverOrders.map(orderCard).join("")}
      </div>
    </section>
  `;
}

function history() {
  return `
    <section class="hero-card button-stack">
      ${titleBlock("Lịch sử", state.role === "shipper" ? "Lịch sử giao hàng" : "Lịch sử nhận hàng")}
      <div class="list-stack">
        ${state.history.map((item) => `<article class="history-item metric-row"><div><strong>${item.title}</strong><p class="muted">${item.status}</p></div>${icon("chevron_right")}</article>`).join("")}
      </div>
    </section>
  `;
}

function profile() {
  return `
    <section class="hero-card button-stack">
      ${titleBlock("Tài khoản", state.user?.name || "Nguyễn Văn A", hasSupabase ? "Supabase đã cấu hình." : "Đang chạy demo trên máy.")}
      <div class="metric-row"><span>Vai trò</span><strong>${state.role === "shipper" ? "Người giao hàng" : "Cư dân"}</strong></div>
      <div class="metric-row"><span>Email</span><strong>${state.user?.email || "demo@smartlocker.vn"}</strong></div>
      <div class="metric-row"><span>Trạng thái</span><strong>${state.role === "shipper" ? "Đã duyệt" : "Đã xác thực"}</strong></div>
      <button class="secondary-btn" data-action="switchRole" type="button">Đổi vai trò demo</button>
      <button class="secondary-btn" data-action="googleLogin" type="button">${icon("mail")} Đăng nhập bằng Gmail</button>
    </section>
  `;
}

function scannerScreen(label, title, copy, action, backRoute) {
  return `
    <div class="page">
      ${progress(state.currentStep + 1)}
      <section class="hero-card button-stack">
        ${titleBlock(label, title, copy)}
        <div class="camera-card">
          <div class="scan-frame">
            <span class="corner-a"></span><span class="corner-b"></span>
            ${icon("qr_code_scanner")}
          </div>
        </div>
        <div class="choice-grid">
          <button class="secondary-btn" data-action="manualLocker" type="button">${icon("pin")} Nhập mã tủ thủ công</button>
          <button class="primary-btn" data-action="${action}" type="button">Quét QR tủ</button>
        </div>
        <button class="mini-btn" data-route="${backRoute}" type="button">Quay lại</button>
      </section>
    </div>
  `;
}

function receiverQr() {
  state.currentStep = 0;
  return scannerScreen("Quét QR", "Quét mã QR dán trên tủ", "Sau khi nhận diện, hệ thống sẽ xác định vị trí tủ và ngăn cần mở.", "receiverQrDone", "home");
}

function receiverOrdersScreen() {
  state.currentStep = 1;
  return `
    <section class="hero-card button-stack">
      ${progress(2)}
      ${titleBlock("Chọn đơn", "Đơn đang chờ nhận", "Chọn đúng đơn cần lấy sau khi đã quét tủ.")}
      <div class="list-stack">${receiverOrders.map(orderCard).join("")}</div>
      <button class="secondary-btn" data-route="receiverHelper" type="button">${icon("group")} Lấy hộ người khác</button>
    </section>
  `;
}

function receiverHelper() {
  state.currentStep = 1;
  return `
    <section class="hero-card button-stack">
      ${progress(2)}
      ${titleBlock("Lấy hộ người khác", "Nhập thông tin xác thực", "Mã mở tủ gồm 4 đến 6 chữ số do người nhận cung cấp.")}
      <div class="form-stack">
        ${field("Số điện thoại người nhận", "helperPhone", "0901234567")}
        ${field("Mã mở tủ", "helperCode", "1234")}
      </div>
      <button class="primary-btn" data-route="receiverProcess" type="button">Xác thực và mở tủ</button>
      <button class="secondary-btn" data-route="home" type="button">Quay về trang chủ</button>
    </section>
  `;
}

function receiverProcess() {
  state.currentStep = 2;
  const order = receiverOrders.find((item) => item.id === state.selectedOrderId) || receiverOrders[0];
  return `
    <section class="hero-card button-stack">
      ${progress(3)}
      ${titleBlock("Đang xử lý nhận hàng", `Ngăn ${order.locker} đã mở`, "Vui lòng lấy hàng ra khỏi tủ rồi đóng cửa lại.")}
      ${statusTimeline([
        ["done", "Xác thực đơn hàng"],
        ["done", "Gửi lệnh mở tủ"],
        ["current", "Chờ bạn lấy hàng và đóng cửa"],
        ["todo", "Cập nhật trạng thái"],
      ])}
      <button class="primary-btn" data-route="receiverClose" type="button">${icon("inventory_2")} Tôi đã lấy hàng</button>
    </section>
  `;
}

function receiverClose() {
  state.currentStep = 4;
  return `
    <section class="hero-card button-stack">
      ${progress(5)}
      ${titleBlock("Đóng cửa tủ", "Cửa tủ đang mở", "Vui lòng đóng cửa tủ để hoàn tất nhận hàng.")}
      <div class="door-state warning">${icon("door_open")} Cửa tủ A12 đang mở</div>
      <button class="primary-btn" data-route="receiverDoorCheck" type="button">${icon("door_front")} Tôi đã đóng cửa</button>
    </section>
  `;
}

function receiverDoorCheck() {
  state.currentStep = 4;
  if (state.doorAttempt === 0) {
    return alertScreen(5, 6, "Cửa tủ chưa đóng", "Hãy đóng cửa tủ để hoàn tất nhận hàng.", "receiverDoorRetry");
  }
  return `
    <section class="hero-card button-stack">
      ${progress(5)}
      ${titleBlock("Cửa tủ đã đóng", "Đang hoàn tất nhận hàng", "Hệ thống cập nhật trạng thái đơn hàng và chuyển ngăn tủ về trạng thái trống.")}
      ${statusTimeline([
        ["done", "Kiểm tra cửa tủ"],
        ["done", "Cập nhật trạng thái: Đã lấy hàng"],
        ["done", "Ngăn tủ về trạng thái trống"],
      ])}
      <button class="primary-btn" data-route="receiverDone" type="button">Hoàn tất</button>
    </section>
  `;
}

function receiverDone() {
  state.currentStep = 5;
  return successScreen(6, 6, "Nhận hàng thành công", `${state.selectedOrderId} đã được cập nhật: Đã lấy hàng.`, "Về trang chủ", "home");
}

function shipperQr() {
  state.currentStep = 0;
  return scannerScreen("Quét QR", "Quét QR tủ để giao hàng", "Xác định đúng trạm tủ trước khi nhập vận đơn.", "shipperQrDone", "home");
}

function shipperLogin() {
  state.currentStep = 1;
  return `
    <section class="hero-card button-stack">
      ${progress(2)}
      ${titleBlock("Đăng nhập", "Xác thực người giao hàng", "Chế độ demo: tài khoản đã được duyệt để giao hàng.")}
      <div class="form-stack">
        ${field("Số điện thoại", "helperPhone", "0901234567")}
        ${field("Mã OTP", "helperCode", "123456")}
      </div>
      <button class="primary-btn" data-action="shipperLoginDone" type="button">Đăng nhập</button>
    </section>
  `;
}

function shipperParcel() {
  state.currentStep = 2;
  return `
    <section class="hero-card button-stack">
      ${progress(3)}
      ${titleBlock("Vận đơn", "Nhập hoặc quét mã vận đơn", "Thông tin người nhận dùng để gửi thông báo và mã mở tủ.")}
      <div class="form-stack">
        ${field("Mã vận đơn", "parcelCode", "DH118")}
        ${field("Số điện thoại người nhận", "receiverPhone", "0901234567")}
        ${field("Tên người nhận", "receiverName", "Nguyễn Văn A")}
        <div class="field"><label>Ghi chú</label><textarea data-field="note" placeholder="Ghi chú nếu có">${state.draft.note}</textarea></div>
      </div>
      <button class="primary-btn" data-route="shipperPayment" type="button">Kiểm tra thanh toán</button>
    </section>
  `;
}

function shipperPayment() {
  state.currentStep = 3;
  return `
    <section class="hero-card button-stack">
      ${progress(4)}
      ${titleBlock("Thanh toán", "Đang kiểm tra thanh toán", "Chọn kết quả demo để đi tiếp nhánh giao hàng.")}
      <div class="status-card compact-status">
        <div class="spinner"></div>
        <h3>Đang kiểm tra thanh toán...</h3>
      </div>
      <div class="choice-grid">
        <button class="primary-btn" data-action="paymentPaid" type="button">Đơn đã thanh toán</button>
        <button class="secondary-btn" data-action="paymentUnpaid" type="button">Đơn chưa thanh toán</button>
      </div>
    </section>
  `;
}

function shipperPaymentWaiting() {
  state.currentStep = 3;
  return `
    <section class="hero-card button-stack">
      ${progress(4)}
      ${titleBlock("Đơn chưa thanh toán", "Đã gửi thông báo cho người nhận", "Chờ người nhận thanh toán trước khi bỏ hàng vào tủ.")}
      <div class="choice-grid">
        <button class="primary-btn" data-action="receiverPays" type="button">Người nhận đã thanh toán</button>
        <button class="danger-btn" data-route="shipperCancelled" type="button">Hủy giao hàng</button>
      </div>
    </section>
  `;
}

function shipperCancelled() {
  state.currentStep = 3;
  return successScreen(4, 9, "Giao hàng bị hủy", "Đơn hàng chưa thanh toán. Thông báo hủy đã gửi cho người giao hàng.", "Quay về trang chủ", "home", "warning");
}

function shipperChooseCompartment() {
  state.currentStep = 4;
  return `
    <section class="hero-card button-stack">
      ${progress(5)}
      ${titleBlock("Chọn ngăn tủ", "Chọn kích thước và ngăn khả dụng", "Chỉ chọn ngăn sau khi đơn đã thanh toán.")}
      <div class="choice-grid">
        ${["Nhỏ", "Vừa", "Lớn"].map((size) => `<button class="secondary-btn" data-action="chooseSize" data-size="${size}" type="button">${size}</button>`).join("")}
      </div>
      <div class="list-stack">
        ${["A01 - Nhỏ", "A04 - Vừa", "B02 - Lớn"].map((slot) => `<button class="order-card" data-action="chooseSlot" data-slot="${slot}" type="button"><span class="order-icon">${icon("inventory")}</span><span><strong>${slot}</strong><small class="muted">Còn trống</small></span>${icon("chevron_right")}</button>`).join("")}
      </div>
    </section>
  `;
}

function shipperDropoff() {
  state.currentStep = 5;
  return `
    <section class="hero-card button-stack">
      ${progress(6)}
      ${titleBlock("Bỏ hàng vào tủ", "Ngăn A04 đã mở", "Chụp minh chứng sau khi bỏ đúng kiện hàng vào tủ.")}
      <div class="proof-card">
        <span>${icon("photo_camera")}</span>
        <div>
          <strong>Mã vận đơn: ${state.draft.parcelCode}</strong>
          <p class="muted">Ngăn A04 • Người nhận: ${state.draft.receiverName}</p>
        </div>
      </div>
      <div class="choice-grid">
        <button class="secondary-btn" data-action="photoProof" type="button">${icon("photo_camera")} Chụp ảnh minh chứng</button>
        <button class="primary-btn" data-route="shipperClose" type="button">Xác nhận đã bỏ hàng</button>
      </div>
    </section>
  `;
}

function shipperClose() {
  state.currentStep = 6;
  return `
    <section class="hero-card button-stack">
      ${progress(7)}
      ${titleBlock("Đóng cửa tủ", "Vui lòng đóng cửa ngăn A04", "Hệ thống chỉ hoàn tất khi cửa tủ đã đóng.")}
      <div class="door-state warning">${icon("door_open")} Cửa ngăn A04 đang mở</div>
      <button class="primary-btn" data-route="shipperDoorCheck" type="button">${icon("door_front")} Tôi đã đóng cửa</button>
    </section>
  `;
}

function shipperDoorCheck() {
  state.currentStep = 6;
  if (state.doorAttempt === 0) {
    return alertScreen(7, 9, "Cửa tủ chưa đóng", "Vui lòng đóng cửa lại để hoàn tất giao hàng.", "shipperDoorRetry");
  }
  state.currentStep = 7;
  return `
    <section class="hero-card button-stack">
      ${progress(8)}
      ${titleBlock("Đang cập nhật giao hàng", "Cửa tủ đã đóng", "Hệ thống cập nhật trạng thái, gửi mã mở tủ và cộng thưởng.")}
      ${statusTimeline([
        ["done", "Cập nhật trạng thái: Đã giao hàng"],
        ["done", `Gửi mã mở tủ ${state.otp} cho cư dân`],
        ["done", "Ngăn tủ chuyển sang trạng thái đang chứa hàng"],
        ["done", "Cộng thưởng 700đ"],
      ])}
      <button class="primary-btn" data-route="shipperDone" type="button">Hoàn tất</button>
    </section>
  `;
}

function shipperDone() {
  state.currentStep = 8;
  return successScreen(9, 9, "Giao hàng thành công", `Mã mở tủ ${state.otp} đã được gửi cho cư dân. Bạn nhận: 700đ.`, "Giao đơn tiếp theo", "shipperQr");
}

function statusTimeline(items) {
  return `
    <div class="status-timeline">
      ${items.map(([type, text]) => `<div class="${type}"><span>${type === "done" ? icon("task_alt") : type === "current" ? icon("pending") : icon("radio_button_unchecked")}</span><strong>${text}</strong></div>`).join("")}
    </div>
  `;
}

function field(label, key, placeholder) {
  const value = key in state.draft ? state.draft[key] : state[key] || "";
  return `<div class="field"><label>${label}</label><input data-field="${key}" value="${value}" placeholder="${placeholder}" /></div>`;
}

function alertScreen(step, total, title, copy, action) {
  return `
    <section class="alert-card">
      ${progress(step, total)}
      <h2>${title}</h2>
      <p>${copy}</p>
      <div class="choice-grid">
        <button class="danger-btn" data-action="${action}" type="button">Kiểm tra lại</button>
        <button class="secondary-btn" data-route="profile" type="button">Gọi hỗ trợ</button>
      </div>
    </section>
  `;
}

function successScreen(step, total, title, copy, button, route, symbol = "task_alt") {
  return `
    <section class="hero-card button-stack">
      ${progress(step, total)}
      <div class="status-card">
        <div class="success-icon">${icon(symbol)}</div>
        <h2>${title}</h2>
        <p class="lead">${copy}</p>
      </div>
      <div class="choice-grid">
        <button class="primary-btn" data-route="${route}" type="button">${button}</button>
        <button class="secondary-btn" data-route="history" type="button">Xem lịch sử</button>
      </div>
    </section>
  `;
}

async function handleAction(action, button) {
  if (action === "quickScan") setRoute(state.role === "shipper" ? "shipperQr" : "receiverQr");
  if (action === "manualLocker") showToast("Demo: đã nhập mã tủ B-04");
  if (action === "googleLogin") await signInWithGoogle();
  if (action === "receiverQrDone") {
    showToast("Đã xác định tủ: Sảnh A - Tầng 1");
    setRoute("receiverOrdersScreen");
  }
  if (action === "selectReceiverOrder") {
    state.selectedOrderId = button.dataset.order;
    setRoute("receiverProcess");
  }
  if (action === "receiverDoorRetry") {
    state.doorAttempt = 1;
    setRoute("receiverDoorCheck");
  }
  if (action === "shipperQrDone") {
    showToast("Đã xác định tủ giao hàng B-04");
    setRoute("shipperLogin");
  }
  if (action === "shipperLoginDone") setRoute("shipperParcel");
  if (action === "paymentPaid" || action === "receiverPays") setRoute("shipperChooseCompartment");
  if (action === "paymentUnpaid") setRoute("shipperPaymentWaiting");
  if (action === "chooseSize") {
    state.draft.size = button.dataset.size;
    showToast(`Đã chọn kích thước ${button.dataset.size}`);
  }
  if (action === "chooseSlot") {
    state.draft.compartment = button.dataset.slot;
    setRoute("shipperDropoff");
  }
  if (action === "photoProof") showToast("Đã lưu ảnh minh chứng demo");
  if (action === "shipperDoorRetry") {
    state.doorAttempt = 1;
    setRoute("shipperDoorCheck");
  }
  if (action === "switchRole") {
    state.role = state.role === "shipper" ? "resident" : "shipper";
    setRoute("home");
  }
}

async function signInWithGoogle() {
  if (!hasSupabase) {
    showToast("Chưa cấu hình Supabase. Đang dùng demo local.");
    return;
  }
  await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

document.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  const routeButton = event.target.closest("[data-route]");
  if (actionButton) {
    event.preventDefault();
    handleAction(actionButton.dataset.action, actionButton);
    return;
  }
  if (routeButton) {
    event.preventDefault();
    setRoute(routeButton.dataset.route);
  }
});

document.addEventListener("input", (event) => {
  const fieldKey = event.target.dataset.field;
  if (!fieldKey) return;
  if (fieldKey in state.draft) state.draft[fieldKey] = event.target.value;
  else state[fieldKey] = event.target.value;
});

(async function init() {
  if (hasSupabase) {
    const { data } = await supabaseClient.auth.getUser();
    if (data?.user) {
      state.user = {
        name: data.user.email?.split("@")[0] || "google_user",
        email: data.user.email,
      };
    }
  }
  render();
})();
