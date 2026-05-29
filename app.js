const demoOrders = [
  {
    id: "SPX-150",
    shipper: "Đơn Shopee",
    receiver: "Bình Dương, Việt Nam",
    price: 150000,
    size: "M",
    compartment: "05",
    status: "ready",
    freeStorage: "3 giờ 15 phút",
    icon: "inventory_2",
    created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    id: "NHT-884",
    shipper: "Đơn người thân gửi",
    receiver: "Bình Dương, Việt Nam",
    price: 0,
    size: "S",
    compartment: "02",
    status: "ready",
    freeStorage: "12 giờ 30 phút",
    icon: "redeem",
    created_at: new Date(Date.now() - 62 * 60 * 1000).toISOString(),
  },
  {
    id: "LZD-420",
    shipper: "Đơn Lazada",
    receiver: "Bình Dương, Việt Nam",
    price: 100000,
    size: "L",
    compartment: "12",
    status: "ready",
    freeStorage: "5 giờ 45 phút",
    icon: "local_shipping",
    created_at: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
  },
];

const state = {
  route: "home",
  role: localStorage.getItem("smartlocker.role") || "resident",
  user: null,
  orders: JSON.parse(localStorage.getItem("smartlocker.orders") || "null") || demoOrders,
  selectedOrderId: "SPX-150",
  draft: {
    parcelCode: "",
    receiver: "Nguyễn Văn A",
    phone: "0957 684 876",
    amount: "0",
    size: "M",
  },
  receiverWallet: 200000,
  shipperWallet: 500000,
  todayEarnings: 0,
  selectedTopupAmount: 0,
  selectedWithdrawAmount: 0,
  barcodeScanned: false,
  dropoffPhotoCaptured: false,
  lastCod: 0,
};

const config = window.SUPABASE_CONFIG || {};
const hasSupabase = Boolean(config.url && config.anonKey && window.supabase);
const supabaseClient = hasSupabase ? window.supabase.createClient(config.url, config.anonKey) : null;
const view = document.querySelector("#view");
const toast = document.querySelector("#toast");
const roleBadge = document.querySelector("#roleBadge");
const ordersNavLabel = document.querySelector("#ordersNavLabel");
const accountName = document.querySelector("#accountName");

function icon(name, className = "") {
  return `<span class="material-symbols-outlined ${className}">${name}</span>`;
}

function money(value, suffix = "VNĐ") {
  return `${new Intl.NumberFormat("vi-VN").format(value || 0)} ${suffix}`;
}

function codValue() {
  return Number(String(state.draft.amount || "0").replace(/\D/g, "")) || 0;
}

function persistOrders() {
  localStorage.setItem("smartlocker.orders", JSON.stringify(state.orders));
}

function selectedOrder() {
  return state.orders.find((order) => order.id === state.selectedOrderId) || state.orders[0];
}

function routeForRole(route) {
  if (state.role === "shipper") {
    if (route === "home") return "shipperHome";
    if (route === "orders") return "shipperHistory";
  }
  return route;
}

function navRoute(route) {
  if (route === "shipperHome" || route === "home") return "home";
  if (route === "shipperHistory" || route === "orders") return "orders";
  return route;
}

function updateAppChrome() {
  const isShipper = state.role === "shipper";
  if (roleBadge) {
    roleBadge.textContent = isShipper ? "Shipper" : "Cư dân";
    roleBadge.classList.toggle("shipper", isShipper);
  }
  if (ordersNavLabel) ordersNavLabel.textContent = isShipper ? "Lịch sử" : "Đơn hàng";
}

function setRoute(route) {
  state.route = routeForRole(route);
  updateAppChrome();
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.route === navRoute(state.route));
  });
  render();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function render() {
  const templates = {
    home: state.user ? dashboard : landing,
    login,
    profile,
    orders,
    detail,
    receiveDone,
    lockerStatus: receiverDoorOpen,
    receiverTopup,
    receiverQr,
    receiverChooseOrder,
    receiverDoorOpen,
    receiverTakeParcel,
    receiverCloseLocker,
    receiverDone,
    receiverCancel,
    shipperHome,
    scanLocker,
    parcelForm,
    scanParcel,
    chooseSize,
    shipperConfirm,
    shipperDone,
    shipperHistory,
    shipperWithdraw,
    shipperNotifyCost: parcelForm,
    shipperWaitReceiver: chooseSize,
  };
  updateAppChrome();
  view.innerHTML = templates[state.route]();
  bindView();
}

function landing() {
  return `
    <div class="landing-screen">
      <span class="eyebrow">PLATFORM</span>
      <h1>Mạng Lưới Tủ Khóa Thông Minh</h1>
      <p class="lead">Hệ sinh thái giao nhận toàn diện kết nối trực tiếp Shipper và Cư dân thông qua công nghệ tủ thông minh SmartLocker.</p>
      <button class="btn-brand" data-action="login" type="button">${icon("login")} Đăng nhập để dùng ngay</button>
      <figure class="locker-hero">
        <img src="./assets/green-locker.png" alt="Tủ khóa thông minh SmartLocker" />
      </figure>
      <section class="guide-card">
        <h2>Hướng Dẫn Đăng Ký</h2>
        <p>Tham gia hệ thống chỉ trong vài phút</p>
        ${guideStep("smartphone", "01. Đăng ký OTP", "Xác thực nhanh qua số điện thoại để tạo tài khoản cá nhân.")}
        ${guideStep("badge", "02. Chọn Vai Trò", "Lựa chọn hồ sơ là Đối tác Giao hàng hoặc Người nhận.")}
        ${guideStep("verified_user", "03. Bắt đầu sử dụng", "Hệ thống sẵn sàng phục vụ các nhu cầu giao và nhận hàng.")}
      </section>
    </div>
  `;
}

function guideStep(symbol, title, copy) {
  return `
    <article class="guide-step">
      <span>${icon(symbol)}</span>
      <div>
        <strong>${title}</strong>
        <small>${copy}</small>
      </div>
    </article>
  `;
}

function login() {
  return `
    <div class="login-screen">
      <button class="icon-back" data-route="home" type="button">${icon("arrow_back_ios_new")}</button>
      <h2>Đăng nhập</h2>
      <p class="lead center">Chọn vai trò demo để xem đúng workflow như bản prototype.</p>
      <div class="role-grid">
        <button class="role-card ${state.role === "resident" ? "active" : ""}" data-role="resident" type="button">
          ${icon("home")}
          <strong>Cư dân</strong>
          <span>Nhận hàng, thanh toán COD, nạp ví</span>
        </button>
        <button class="role-card ${state.role === "shipper" ? "active" : ""}" data-role="shipper" type="button">
          ${icon("local_shipping")}
          <strong>Shipper</strong>
          <span>Quét tủ, gửi hàng, nhận COD</span>
        </button>
      </div>
      <button class="btn-outline" data-action="google" type="button">${icon("mail")} Đăng nhập bằng Gmail</button>
      <button class="btn-brand" data-action="demoLogin" type="button">${icon("login")} Dùng tài khoản demo</button>
    </div>
  `;
}

function dashboard() {
  return state.role === "shipper" ? shipperHome() : residentHome();
}

function residentHome() {
  const pending = state.orders.filter((order) => order.status !== "received").length;
  return `
    <div class="resident-home">
      ${walletBanner(state.receiverWallet, "receiverTopup")}
      <section class="section-title">
        <h2>Tủ đồ của tôi</h2>
        <p>${pending} đơn đang chờ nhận tại SmartLocker</p>
      </section>
      <div class="order-list">${state.orders.map(orderCard).join("")}</div>
      <button class="btn-brand" data-route="receiverQr" type="button">${icon("qr_code_scanner")} Quét QR tủ để nhận hàng</button>
    </div>
  `;
}

function walletBanner(balance, route) {
  return `
    <section class="wallet-banner">
      <div>
        ${icon("account_balance_wallet")}
        <strong>Ví: <span>${money(balance)}</span></strong>
      </div>
      <button class="mini-btn" data-route="${route}" type="button">Nạp tiền</button>
    </section>
  `;
}

function orderCard(order) {
  const received = order.status === "received";
  return `
    <button class="ref-order-card ${received ? "received" : ""}" data-order="${order.id}" type="button">
      <span class="order-badge">${icon(order.icon || "inventory_2")}</span>
      <span class="order-info">
        <strong>${order.shipper}</strong>
        <small>Tủ sảnh A (Ngăn ${order.compartment})</small>
        <em>${received ? "Trạng thái: Đã lấy" : "Trạng thái: Chưa lấy"}</em>
      </span>
      ${icon("chevron_right", "chevron")}
    </button>
  `;
}

function orders() {
  return `
    <div class="stack">
      <section class="section-title">
        <h2>Lịch sử đơn</h2>
        <p>Theo dõi trạng thái các đơn trong tủ.</p>
      </section>
      <div class="order-list">${state.orders.map(orderCard).join("")}</div>
    </div>
  `;
}

function detail() {
  const order = selectedOrder();
  return `
    <div class="detail-screen">
      <button class="icon-back" data-route="home" type="button">${icon("arrow_back_ios_new")}</button>
      <h2>Chi tiết Đơn</h2>
      <article class="detail-card">
        <div class="proof-image">
          <img src="./assets/green-locker.png" alt="Bằng chứng giao hàng" />
          <span>12/05/2026 14:30</span>
        </div>
        <div class="detail-body">
          <h3>${order.shipper} - Ngăn ${order.compartment}</h3>
          <div class="fee-line"><span>Tiền hàng (COD):</span><strong>${money(order.price)}</strong></div>
          <p class="auto-note">(Hệ thống sẽ tự động trừ vào ví khi mở tủ)</p>
          <div class="fee-line"><span>Phí lưu tủ:</span><strong class="free">Miễn phí</strong></div>
          <p class="muted">Thời gian lưu kho miễn phí còn lại: <strong>${order.freeStorage}</strong></p>
        </div>
      </article>
      <button class="btn-brand sticky-action" data-action="showOpenConfirm" type="button">${icon("lock_open")} Mở tủ lấy hàng</button>
    </div>
  `;
}

function receiverTopup() {
  const amounts = [50000, 100000, 200000, 500000];
  return `
    <div class="topup-screen">
      <button class="icon-back" data-route="home" type="button">${icon("arrow_back_ios_new")}</button>
      <h2>Nạp Tiền Vào Ví</h2>
      <form class="money-form" data-form="topup">
        ${selectCard("Nguồn tiền", "topupSource", ["Ví MoMo", "Ví ZaloPay", "Ngân hàng Vietcombank", "Ngân hàng MBBank", "Ngân hàng TPBank"])}
        <section class="finance-card">
          <span class="mini-label">Tài khoản liên kết</span>
          <div class="linked-account"><span>N</span><strong>Nguyễn Văn A</strong></div>
        </section>
        <section class="finance-card">
          <span class="mini-label">Số tiền muốn nạp (VNĐ)</span>
          <div class="amount-grid">${amounts.map((amount) => amountChip(amount, "topup", state.selectedTopupAmount)).join("")}</div>
          <label class="currency-input"><span>đ</span><input name="customAmount" inputmode="numeric" placeholder="Hoặc nhập số tiền khác..." /></label>
        </section>
        <button class="btn-brand" type="submit">${icon("payments")} Xác nhận nạp tiền</button>
      </form>
    </div>
  `;
}

function selectCard(label, id, options) {
  return `
    <section class="finance-card">
      <label class="mini-label" for="${id}">${label}</label>
      <select id="${id}" name="${id}">${options.map((option) => `<option>${option}</option>`).join("")}</select>
    </section>
  `;
}

function amountChip(amount, type, selected) {
  return `<button class="amount-chip ${selected === amount ? "active" : ""}" data-${type}="${amount}" type="button">${new Intl.NumberFormat("vi-VN").format(amount)}</button>`;
}

function receiverQr() {
  return scannerScreen("QR xác định tủ", "Đưa mã QR trên tủ vào khung", "confirmReceiverQr", "home", "qr_code_scanner");
}

function receiverChooseOrder() {
  return `
    <div class="stack">
      <button class="icon-back" data-route="receiverQr" type="button">${icon("arrow_back_ios_new")}</button>
      <h2>Chọn đơn hàng cần nhận</h2>
      <div class="order-list">${state.orders.filter((order) => order.status !== "received").map(orderCard).join("")}</div>
    </div>
  `;
}

function receiverDoorOpen() {
  const order = selectedOrder();
  return `
    <div class="locker-action">
      <h2>Trạng thái Tủ</h2>
      <div class="door-pulse">${icon("door_open")}</div>
      <h3>Cửa số ${order.compartment} đã mở!</h3>
      <p>${order.price ? `Đã tự động thanh toán <strong>-${money(order.price, "đ")}</strong> (COD).` : "Không phát sinh phí thu hộ (COD)."}</p>
      <b>Vui lòng đóng chặt cửa<br />sau khi lấy hàng.</b>
      <div class="bottom-actions">
        <button class="issue-btn" data-action="reportIssue" type="button">${icon("warning")} Hàng hóa có vấn đề?</button>
        <button class="btn-brand" data-route="receiverTakeParcel" type="button">${icon("task_alt")} Xác nhận lấy hàng</button>
      </div>
    </div>
  `;
}

function receiverTakeParcel() {
  const order = selectedOrder();
  return `
    <div class="locker-action">
      <h2>Lấy hàng</h2>
      <div class="door-pulse">${icon("inventory_2")}</div>
      <h3>Lấy đơn ${order.id}</h3>
      <p>Kiểm tra đúng đơn hàng trước khi đóng tủ.</p>
      <button class="btn-brand sticky-action" data-route="receiverCloseLocker" type="button">${icon("door_front")} Đóng tủ</button>
    </div>
  `;
}

function receiverCloseLocker() {
  return `
    <div class="locker-action">
      <h2>Cửa tủ đã đóng</h2>
      <div class="door-pulse">${icon("lock")}</div>
      <p>Hệ thống khóa lại ngăn tủ và chuyển đơn vào lịch sử.</p>
      <button class="btn-brand sticky-action" data-action="confirmReceive" type="button">${icon("task_alt")} Hoàn tất</button>
    </div>
  `;
}

function receiverDone() {
  return successScreen("task_alt", "Nhận hàng thành công!", "Đơn đã chuyển vào lịch sử. Cửa tủ đã được khóa lại sau xác nhận.", "Về trang chủ", "home");
}

function receiverCancel() {
  return successScreen("warning", "Đã hủy giao hàng", "Yêu cầu nhận hàng đã dừng lại. Hệ thống sẽ thông báo lại cho shipper.", "Về trang chủ", "home");
}

function receiveDone() {
  return receiverDone();
}

function shipperHome() {
  const completed = state.orders.filter((order) => order.status === "ready" || order.status === "stored" || order.status === "received").length;
  return `
    <div class="shipper-home">
      <section class="wallet-banner">
        <div>${icon("account_balance_wallet")}<strong>Ví: <span>${money(state.shipperWallet)}</span></strong></div>
        <button class="mini-btn" data-route="shipperWithdraw" type="button">Rút tiền</button>
      </section>
      <section class="earnings">
        <p>Tổng hàng đã giao hôm nay</p>
        <strong>${money(state.todayEarnings)}</strong>
      </section>
      <button class="qr-main" data-route="scanLocker" type="button">
        ${icon("qr_code_scanner")}
        <span>QUÉT QR<br />TRẠM TỦ</span>
      </button>
      <section class="shipper-stats">
        <article><span>Cần giao</span><strong>12</strong></article>
        <article><span>Đã hoàn thành</span><strong>${completed}</strong></article>
        <article><span>Đơn lỗi</span><strong>0</strong></article>
      </section>
    </div>
  `;
}

function scanLocker() {
  return scannerScreen("Quét mã QR", "Đưa QR trạm tủ vào khung", "confirmLockerScan", "shipperHome", "qr_code_scanner");
}

function parcelForm() {
  const canContinue = state.barcodeScanned;
  return `
    <div class="parcel-screen">
      <button class="icon-back" data-route="shipperHome" type="button">${icon("arrow_back_ios_new")}</button>
      <section class="locker-info">
        <strong>${icon("pin_drop")} Mã tủ: A32</strong>
        <small>Nhà ở xã hội Định Hòa, Bình Dương, Việt Nam</small>
      </section>
      <button class="scan-card" data-route="scanParcel" type="button">
        ${icon("barcode_scanner")}
        <strong>Quét mã vạch đơn hàng</strong>
      </button>
      <form class="money-form" data-form="parcel">
        <section class="finance-card">
          <label class="mini-label">Mã đơn hàng</label>
          <input name="parcelCode" value="${state.draft.parcelCode}" placeholder="Quét mã để tự điền" />
        </section>
        <section class="finance-card">
          <label class="mini-label">Người nhận</label>
          <input name="receiver" value="${state.draft.receiver}" />
        </section>
        <section class="finance-card">
          <label class="mini-label">Số tiền COD cần thu (VNĐ)</label>
          <input name="amount" inputmode="numeric" value="${codValue()}" />
        </section>
        <button class="${canContinue ? "btn-brand" : "btn-disabled"}" ${canContinue ? "" : "disabled"} type="submit">Tiếp tục</button>
      </form>
    </div>
  `;
}

function scanParcel() {
  return scannerScreen("Quét mã đơn hàng", "Đưa mã vạch/QR đơn hàng vào khung", "confirmBarcode", "parcelForm", "barcode_scanner");
}

function chooseSize() {
  return `
    <div class="size-screen">
      <button class="icon-back" data-route="parcelForm" type="button">${icon("arrow_back_ios_new")}</button>
      <h2>Chọn Kích Thước Ngăn</h2>
      <div class="size-grid">
        ${["S", "M", "L"].map((size) => `<button class="size-card" data-size="${size}" type="button"><strong>${size}</strong><span>${size === "S" ? "Ngăn nhỏ" : size === "M" ? "Ngăn trung" : "Ngăn lớn"}</span></button>`).join("")}
      </div>
    </div>
  `;
}

function shipperConfirm() {
  const cod = codValue();
  return `
    <div class="confirm-screen">
      <h2>Xác minh giao hàng</h2>
      <section class="dropoff-card ${state.dropoffPhotoCaptured ? "captured" : ""}">
        <div class="dropoff-status">${state.dropoffPhotoCaptured ? "ĐÃ LƯU ẢNH MINH CHỨNG" : `ĐANG MỞ: NGĂN ${state.draft.size} - SỐ 05`}</div>
        <div class="dropoff-photo"></div>
        ${state.dropoffPhotoCaptured ? `
          <div class="success-mini">
            ${icon("task_alt")}
            <strong>Giao hàng thành công!</strong>
            <span>Tiền COD (+${money(cod, "đ")}) sẽ được cộng vào ví.</span>
          </div>
        ` : `
          <div class="dropoff-instruction">
            <p>Bỏ hàng vào tủ<br />rồi <strong>ĐÓNG TỦ</strong></p>
            <button class="btn-brand" data-action="captureDropoff" type="button">${icon("photo_camera")} Xác nhận đã giao</button>
          </div>
        `}
      </section>
      <button class="${state.dropoffPhotoCaptured ? "btn-outline" : "btn-disabled"}" ${state.dropoffPhotoCaptured ? "" : "disabled"} data-action="confirmDropoff" type="button">Hoàn thành giao hàng</button>
    </div>
  `;
}

function shipperDone() {
  const cod = state.lastCod || codValue();
  return successScreen("task_alt", "Giao hàng thành công!", `Đã chụp ảnh minh chứng. Tiền COD (+${money(cod, "đ")}) đã được cộng vào ví.`, "Giao đơn tiếp theo", "shipperHome");
}

function shipperHistory() {
  const delivered = state.orders.filter((order) => order.status === "ready" || order.status === "stored" || order.status === "received");
  return `
    <div class="history-screen">
      <section class="history-summary">
        <span>Đã hoàn thành</span>
        <strong>${delivered.length}</strong>
        <small>COD đã thu: ${money(delivered.reduce((sum, order) => sum + order.price, 0))}</small>
      </section>
      <div class="delivery-list">
        ${delivered.map((order) => `
          <article class="delivery-card">
            ${icon("task_alt")}
            <div><strong>${order.id}</strong><span>${order.receiver}</span><small>Ngăn ${order.compartment}</small></div>
            <b>${money(order.price)}</b>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function shipperWithdraw() {
  const amounts = [50000, 100000, 200000];
  return `
    <div class="topup-screen">
      <button class="icon-back" data-route="shipperHome" type="button">${icon("arrow_back_ios_new")}</button>
      <h2>Rút Tiền</h2>
      <form class="money-form" data-form="withdraw">
        ${selectCard("Chuyển về", "withdrawTarget", ["Ví MoMo", "Ví ZaloPay", "Ngân hàng Vietcombank", "Ngân hàng MBBank"])}
        <section class="finance-card">
          <span class="mini-label">Số dư khả dụng</span>
          <strong class="available-money">${money(state.shipperWallet)}</strong>
          <div class="amount-grid">
            ${amounts.map((amount) => amountChip(amount, "withdraw", state.selectedWithdrawAmount)).join("")}
            <button class="amount-chip ${state.selectedWithdrawAmount === state.shipperWallet ? "active" : ""}" data-withdraw="${state.shipperWallet}" type="button">Rút hết</button>
          </div>
        </section>
        <button class="btn-brand" type="submit">${icon("payments")} Rút tiền ngay</button>
      </form>
    </div>
  `;
}

function scannerScreen(title, copy, action, backRoute, symbol) {
  return `
    <div class="scanner-screen">
      <button class="scanner-back" data-route="${backRoute}" type="button">${icon("arrow_back_ios_new")}</button>
      <h2>${title}</h2>
      <div class="scan-stage">
        <div class="scan-frame">
          <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
          ${icon(symbol)}
          <i></i>
        </div>
        <p>${copy}</p>
      </div>
      <button class="btn-brand" data-action="${action}" type="button">${icon("check_circle")} Xác nhận mã</button>
    </div>
  `;
}

function successScreen(symbol, title, copy, button, route) {
  return `
    <div class="success-panel">
      <div class="success-icon">${icon(symbol)}</div>
      <h2>${title}</h2>
      <p>${copy}</p>
      <button class="btn-brand" data-route="${route}" type="button">${button}</button>
    </div>
  `;
}

function profile() {
  return `
    <div class="profile-screen">
      <h2>Tài khoản</h2>
      <section class="finance-card">
        <div class="fee-line"><span>Vai trò</span><strong>${state.role === "shipper" ? "Shipper" : "Cư dân"}</strong></div>
        <div class="fee-line"><span>Email</span><strong>${state.user?.email || "demo@smartlocker.vn"}</strong></div>
        <div class="fee-line"><span>Backend</span><strong>${hasSupabase ? "Supabase" : "Demo local"}</strong></div>
      </section>
      <button class="btn-outline" data-action="switchRole" type="button">Đổi vai trò demo</button>
      <button class="danger-btn" data-action="logout" type="button">Đăng xuất</button>
    </div>
  `;
}

function bindView() {
  view.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
  });

  view.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", () => {
      state.role = button.dataset.role;
      localStorage.setItem("smartlocker.role", state.role);
      showToast(`Đã chọn vai trò ${state.role === "shipper" ? "shipper" : "cư dân"}`);
      render();
    });
  });

  view.querySelectorAll("[data-order]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedOrderId = button.dataset.order;
      setRoute(state.route === "receiverChooseOrder" ? "detail" : "detail");
    });
  });

  view.querySelectorAll("[data-size]").forEach((button) => {
    button.addEventListener("click", () => {
      state.draft.size = button.dataset.size;
      setRoute("shipperConfirm");
    });
  });

  view.querySelectorAll("[data-topup]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTopupAmount = Number(button.dataset.topup) || 0;
      render();
    });
  });

  view.querySelectorAll("[data-withdraw]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedWithdrawAmount = Number(button.dataset.withdraw) || 0;
      render();
    });
  });

  const parcelFormEl = view.querySelector('[data-form="parcel"]');
  if (parcelFormEl) {
    parcelFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(parcelFormEl);
      state.draft.parcelCode = data.get("parcelCode") || state.draft.parcelCode;
      state.draft.receiver = data.get("receiver") || state.draft.receiver;
      state.draft.amount = data.get("amount") || "0";
      setRoute("chooseSize");
    });
  }

  const topupForm = view.querySelector('[data-form="topup"]');
  if (topupForm) {
    topupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(topupForm);
      const customAmount = Number(String(data.get("customAmount") || "").replace(/\D/g, ""));
      const amount = customAmount || state.selectedTopupAmount;
      if (amount < 10000) {
        showToast("Vui lòng chọn hoặc nhập số tiền nạp tối thiểu 10.000đ");
        return;
      }
      state.receiverWallet += amount;
      state.selectedTopupAmount = 0;
      showToast(`Nạp tiền thành công ${money(amount, "đ")}`);
      setRoute("home");
    });
  }

  const withdrawForm = view.querySelector('[data-form="withdraw"]');
  if (withdrawForm) {
    withdrawForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const amount = state.selectedWithdrawAmount;
      if (!amount || amount > state.shipperWallet) {
        showToast("Vui lòng chọn số tiền rút hợp lệ");
        return;
      }
      state.shipperWallet -= amount;
      state.selectedWithdrawAmount = 0;
      showToast(`Rút thành công ${money(amount, "đ")}`);
      setRoute("shipperHome");
    });
  }

  view.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
}

async function handleAction(action) {
  if (action === "login") setRoute("login");
  if (action === "demoLogin") {
    state.user = { email: state.role === "shipper" ? "shipper@smartlocker.vn" : "resident@smartlocker.vn" };
    if (accountName) accountName.textContent = "demo_account";
    setRoute(state.role === "shipper" ? "shipperHome" : "home");
  }
  if (action === "google") await signInWithGoogle();
  if (action === "confirmLockerScan") {
    showToast("Đã xác nhận trạm tủ A32");
    setRoute("parcelForm");
  }
  if (action === "confirmBarcode") {
    state.barcodeScanned = true;
    state.draft.parcelCode = "435962506434";
    state.draft.amount = "150000";
    showToast("Đã nhận mã vận đơn và COD");
    setRoute("parcelForm");
  }
  if (action === "showOpenConfirm") {
    const order = selectedOrder();
    if (state.receiverWallet < order.price) {
      showToast(`Số dư không đủ. Vui lòng nạp thêm tiền để thanh toán COD ${money(order.price, "đ")}`);
      setRoute("receiverTopup");
      return;
    }
    state.receiverWallet -= order.price;
    setRoute("receiverDoorOpen");
  }
  if (action === "confirmReceiverQr") {
    showToast("Đã xác định tủ sảnh A");
    setRoute("receiverChooseOrder");
  }
  if (action === "confirmReceive") {
    const order = selectedOrder();
    order.status = "received";
    persistOrders();
    setRoute("receiverDone");
  }
  if (action === "reportIssue") showToast("Đã ghi nhận báo cáo sự cố cho đơn hàng");
  if (action === "captureDropoff") {
    state.dropoffPhotoCaptured = true;
    showToast("Đã lưu ảnh minh chứng");
    render();
  }
  if (action === "confirmDropoff") {
    await createParcel();
    const cod = codValue();
    state.lastCod = cod;
    state.shipperWallet += cod;
    state.todayEarnings += cod;
    state.barcodeScanned = false;
    state.dropoffPhotoCaptured = false;
    state.draft.amount = "0";
    setRoute("shipperDone");
  }
  if (action === "switchRole") {
    state.role = state.role === "shipper" ? "resident" : "shipper";
    localStorage.setItem("smartlocker.role", state.role);
    setRoute("home");
  }
  if (action === "logout") {
    if (supabaseClient) await supabaseClient.auth.signOut();
    state.user = null;
    setRoute("home");
  }
}

async function signInWithGoogle() {
  if (!supabaseClient) {
    showToast("Chưa cấu hình Supabase. Đang dùng demo local.");
    return;
  }
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) showToast(error.message);
}

async function hydrateAuth() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getUser();
  if (data?.user) {
    state.user = data.user;
    if (accountName) accountName.textContent = data.user.email?.split("@")[0] || "account";
    setRoute("home");
  }
}

async function createParcel() {
  const cod = codValue();
  const order = {
    id: state.draft.parcelCode || `SL-${Date.now().toString().slice(-5)}`,
    shipper: "SmartLocker Delivery",
    receiver: state.draft.receiver,
    price: cod,
    size: state.draft.size,
    compartment: "05",
    status: "ready",
    freeStorage: "6 giờ 00 phút",
    icon: "inventory_2",
    created_at: new Date().toISOString(),
  };
  state.orders.unshift(order);
  state.selectedOrderId = order.id;
  persistOrders();

  if (supabaseClient) {
    await supabaseClient.from("parcels").insert({
      code: order.id,
      recipient_name: order.receiver,
      recipient_phone: state.draft.phone,
      size: order.size,
      locker_code: "A32",
      compartment_number: order.compartment,
      cod_amount: cod,
      status: "stored",
    });
  }
}

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => setRoute(item.dataset.route));
});

hydrateAuth();
render();
