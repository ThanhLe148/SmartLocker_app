const API_BASE = (window.SMARTLOCKER_API_BASE || "http://localhost:5000/api").replace(/\/$/, "");

const view = document.querySelector("#view");
const toast = document.querySelector("#toast");
const roleBadge = document.querySelector("#roleBadge");
const accountName = document.querySelector("#accountName");
const ordersNavLabel = document.querySelector("#ordersNavLabel");
const historyNavLabel = document.querySelector("#historyNavLabel");

const demoLockerBlocks = [
  {
    id: "BLOCK-DH-001",
    publicCode: "BLOCK-DH-001",
    qrCode: "SL-LOCKER-05",
    name: "Block tủ A",
    locationName: "Khu nhà ở xã hội Định Hòa",
    address: "Phường Định Hòa, TP. Thủ Dầu Một, Bình Dương",
    floorLabel: "Sảnh A - Tầng trệt",
    status: "Online",
    smallAvailable: 6,
    mediumAvailable: 8,
    largeAvailable: 3,
  },
  {
    id: "BLOCK-EIU-002",
    publicCode: "BLOCK-EIU-002",
    qrCode: "SL-LOCKER-EIU-02",
    name: "Block tủ EIU-02",
    locationName: "Ký túc xá EIU",
    address: "Đại học Quốc tế Miền Đông, Bình Dương",
    floorLabel: "Sảnh ký túc xá",
    status: "Planned",
    smallAvailable: 0,
    mediumAvailable: 0,
    largeAvailable: 0,
  },
];

const demoParcels = [
  {
    id: "demo-dh001",
    code: "DH001",
    receiverName: "Nguyễn Văn A",
    receiverPhone: "0901234567",
    receiverAddress: "Căn A1204, Khu nhà ở xã hội Định Hòa",
    lockerBlockName: "Block tủ A",
    compartmentCode: "A12",
    pickupFee: 2000,
    paymentStatus: "Pending",
    status: "PaymentPending",
    createdAt: new Date().toISOString(),
    storedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-dh002",
    code: "DH002",
    receiverName: "Nguyễn Văn A",
    receiverPhone: "0901234567",
    receiverAddress: "Căn A1204, Khu nhà ở xã hội Định Hòa",
    lockerBlockName: "Block tủ A",
    compartmentCode: "B02",
    pickupFee: 4000,
    paymentStatus: "Pending",
    status: "PaymentPending",
    createdAt: new Date().toISOString(),
    storedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

const demoCompartments = Array.from({ length: 12 }, (_, index) => {
  const code = `A${String(index).padStart(2, "0")}`;
  return {
    id: `demo-${code}`,
    code,
    size: index <= 2 ? "Small" : index <= 8 ? "Medium" : "Large",
    status: code === "A01" ? "Available" : "Unavailable",
  };
});

const state = {
  route: "lockerScan",
  apiOnline: false,
  isBusy: false,
  scanning: false,
  role: localStorage.getItem("shipmates.role") || "",
  token: localStorage.getItem("shipmates.token") || "",
  user: readJson("shipmates.user", null),
  lockerBlocks: demoLockerBlocks,
  locker: readJson("shipmates.locker", null),
  residentProfile: readJson("shipmates.residentProfile", {
    fullName: "",
    phone: "",
    apartmentAddress: "",
  }),
  shipperProfile: readJson("shipmates.shipperProfile", {
    fullName: "",
    phone: "",
    deliveryPartner: "",
  }),
  residentParcels: readJson("shipmates.residentParcels", null),
  selectedParcel: null,
  payment: null,
  auth: {
    phone: "",
    otp: "",
    otpSent: false,
    accountExists: null,
    fullName: "",
    apartmentAddress: "",
    deliveryPartner: "",
  },
  helper: { phone: "", otp: "", parcelCode: "" },
  dropoff: {
    parcelCode: "",
    receiverPhone: "",
    receiverName: "",
    receiverAddress: "",
    compartments: demoCompartments,
    selectedCompartmentCode: "",
    evidenceReady: false,
    openedParcel: null,
  },
  refreshingCompartments: false,
  history: readJson("shipmates.history", []),
};

const routes = {
  lockerScan,
  lockerLocation,
  lockerMap,
  roleSelect,
  login,
  home,
  residentProfile,
  residentOrders,
  residentHelper,
  residentPayment,
  residentOpen,
  residentClose,
  residentDone,
  shipperDropoff,
  shipperOpen,
  shipperProof,
  shipperClose,
  shipperDone,
  orders,
  history,
  profile,
};

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem("shipmates.role", state.role || "");
  localStorage.setItem("shipmates.token", state.token || "");
  localStorage.setItem("shipmates.user", JSON.stringify(state.user));
  localStorage.setItem("shipmates.locker", JSON.stringify(state.locker));
  localStorage.setItem("shipmates.residentProfile", JSON.stringify(state.residentProfile));
  localStorage.setItem("shipmates.shipperProfile", JSON.stringify(state.shipperProfile));
  localStorage.setItem("shipmates.residentParcels", JSON.stringify(state.residentParcels));
  localStorage.setItem("shipmates.history", JSON.stringify(state.history));
}

function icon(name, cls = "") {
  return `<span class="material-symbols-outlined ${cls}" aria-hidden="true">${name}</span>`;
}

function money(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function displayText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "object") {
    return displayText(value.label ?? value.name ?? value.title ?? value.code ?? value.value, fallback);
  }
  return fallback;
}

function storageInfo(parcel) {
  const storedAt = parcel?.storedAt || parcel?.createdAt;
  if (!storedAt) {
    return { fee: Number(parcel?.pickupFee || 0), label: "Đang cập nhật thời gian", isOvernight: false };
  }

  const storedTime = new Date(storedAt);
  const durationMinutes = Math.max(0, Math.floor((Date.now() - storedTime.getTime()) / 60000));
  const vietnamDate = (date) => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const isOvernight = vietnamDate(storedTime) !== vietnamDate(new Date());
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const durationLabel = days > 0
    ? `${days} ngày ${remainingHours} giờ`
    : hours > 0
      ? `${hours} giờ ${minutes} phút`
      : `${minutes} phút`;
  const fee = isOvernight
    ? 10000
    : durationMinutes <= 4 * 60
      ? 2000
      : durationMinutes <= 8 * 60
        ? 4000
        : 6000;

  return { fee, label: `Đã lưu trong tủ ${durationLabel}`, isOvernight };
}

function storageFeeGuide() {
  return `
    <article class="storage-rule-card">
      ${icon("schedule")}
      <div>
        <strong>Phí lưu trữ được tính tự động</strong>
        <dl class="storage-fee-list">
          <div><dt>Từ 0 đến 4 giờ</dt><dd>2.000đ</dd></div>
          <div><dt>Trên 4 đến 8 giờ</dt><dd>4.000đ</dd></div>
          <div><dt>Trên 8 giờ</dt><dd>6.000đ</dd></div>
          <div><dt>Qua đêm</dt><dd>10.000đ</dd></div>
        </dl>
      </div>
    </article>
  `;
}

function statusText(value) {
  return {
    Online: "Đang hoạt động",
    Planned: "Đang cập nhật",
    Offline: "Tạm ngưng",
    Maintenance: "Bảo trì",
    Stored: "Đang chờ nhận",
    PaymentPending: "Cần thanh toán phí",
    PickedUp: "Đã nhận",
    Paid: "Đã thanh toán",
    Pending: "Chờ thanh toán",
  }[value] || value || "Đang cập nhật";
}

function setRoute(route) {
  state.route = route;
  render();
  if (route === "shipperDropoff") loadLockerCompartments();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(window.shipmatesToastTimer);
  window.shipmatesToastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || "Không gọi được máy chủ.");
  state.apiOnline = true;
  return data;
}

async function loadLockerBlocks() {
  try {
    state.lockerBlocks = await api("/locker-blocks");
    if (!state.locker && state.lockerBlocks.length) state.locker = state.lockerBlocks[0];
  } catch {
    state.apiOnline = false;
    state.lockerBlocks = demoLockerBlocks;
    if (!state.locker) state.locker = demoLockerBlocks[0];
  }
}

function selectedLockerQr() {
  return state.locker?.qrCode || state.locker?.publicCode || "SL-LOCKER-05";
}

async function loadResidentParcels() {
  const phone = state.residentProfile.phone || "0901234567";
  try {
    const params = new URLSearchParams({ phone, lockerQrCode: selectedLockerQr() });
    state.residentParcels = await api(`/resident/parcels?${params.toString()}`);
  } catch {
    state.apiOnline = false;
    state.residentParcels = demoParcels.filter((item) => item.receiverPhone === phone || phone === "0901234567");
  }
  saveState();
}

async function boot() {
  await loadLockerBlocks();
  if (state.token) {
    try {
      state.user = await api("/auth/me");
      applySession(state.user);
    } catch {
      state.token = "";
      state.user = null;
    }
  }
  render();
}

function applySession(session) {
  state.user = session;
  state.token = session.token || state.token;
  state.role = session.role === "Shipper" ? "shipper" : "resident";
  if (session.residentProfile) state.residentProfile = session.residentProfile;
  if (session.shipperProfile) state.shipperProfile = {
    fullName: session.shipperProfile.fullName,
    phone: session.shipperProfile.phone,
    deliveryPartner: session.shipperProfile.deliveryPartner,
  };
  saveState();
}

function render() {
  updateChrome();
  view.innerHTML = (routes[state.route] || lockerScan)();
}

function updateChrome() {
  const loggedIn = Boolean(state.user);
  const roleLabel = state.role === "shipper"
    ? "Người giao hàng"
    : state.role === "resident"
      ? "Người nhận hàng"
      : "Chưa chọn";
  roleBadge.textContent = loggedIn ? roleLabel : "Chưa đăng nhập";
  roleBadge.classList.toggle("shipper", state.role === "shipper");
  accountName.textContent = loggedIn ? state.user.displayName || state.user.email : "Đăng nhập";
  ordersNavLabel.textContent = state.role === "shipper" ? "Đơn giao" : "Đơn hàng";
  historyNavLabel.textContent = "Lịch sử";

  document.querySelectorAll(".nav-item").forEach((button) => {
    const route = button.dataset.route;
    const needsLocker = route === "lockerMap";
    const needsLogin = ["home", "orders", "history", "profile"].includes(route);
    button.hidden = (needsLocker && !state.locker) || (needsLogin && !loggedIn);
    button.classList.toggle("active", route === state.route || (route === "home" && state.route.endsWith("Done")));
  });
}

function shell(title, subtitle, body, opts = {}) {
  return `
    <div class="page flow-page">
      ${opts.back ? backButton(opts.back.route, opts.back.label) : ""}
      ${opts.beforeTitle || ""}
      <div class="title-block">
        ${opts.eyebrow ? `<span class="eyebrow">${opts.eyebrow}</span>` : ""}
        <h1>${title}</h1>
        ${subtitle ? `<p class="lead">${subtitle}</p>` : ""}
      </div>
      ${body}
    </div>
  `;
}

function backButton(route, label = "Quay lại") {
  return `<button class="back-btn" data-route="${route}" type="button">${icon("arrow_back")} ${label}</button>`;
}

function lockerSummary() {
  const locker = state.locker || demoLockerBlocks[0];
  return `
    <article class="location-card">
      <div class="icon-tile">${icon("inventory_2")}</div>
      <div>
        <strong>${displayText(locker.name, "Block tủ A")}</strong>
        <p>${displayText(locker.locationName, "Khu nhà ở xã hội Định Hòa")}</p>
        <p class="muted">${displayText(locker.floorLabel)} · ${displayText(locker.address)}</p>
      </div>
      <span class="status-pill">${statusText(displayText(locker.status))}</span>
    </article>
  `;
}

function lockerScan() {
  const body = `
    <div class="scan-layout">
      <div class="qr-stage ${state.scanning ? "is-scanning" : ""}">
        <div class="qr-frame">
          <div class="qr-demo" aria-hidden="true"></div>
          <div class="scan-line"></div>
        </div>
        <p>${state.scanning ? "Đang nhận diện mã QR trên block tủ..." : "Căn mã QR dán vào khung quét"}</p>
      </div>
      <div class="button-grid">
        <button class="secondary-btn" data-action="manualLocker" type="button">${icon("pin_drop")} Dùng tủ Định Hòa</button>
        <button class="primary-btn next-cta" data-action="scanLocker" type="button" ${state.scanning ? "disabled" : ""}>
          ${icon("qr_code_scanner")} ${state.scanning ? "Đang quét..." : "Quét mã block tủ"}
        </button>
      </div>
    </div>
  `;
  return shell("Quét mã block tủ", "", body, { eyebrow: "SmartLocker" });
}

function lockerLocation() {
  const body = `
    ${lockerSummary()}
    <section class="metric-grid">
      ${metric("Ngăn nhỏ còn trống", state.locker?.smallAvailable ?? 0)}
      ${metric("Ngăn vừa còn trống", state.locker?.mediumAvailable ?? 0)}
      ${metric("Ngăn lớn còn trống", state.locker?.largeAvailable ?? 0)}
    </section>
    <div class="hero-card">
      <img src="./assets/green-locker.png" alt="Tủ khóa thông minh màu xanh" />
      <div>
        <h3>Vị trí tủ đã sẵn sàng</h3>
        <p class="muted">Bạn có thể xem bản đồ mạng lưới hoặc tiếp tục thao tác tại block tủ hiện tại.</p>
      </div>
    </div>
    <div class="button-grid">
      <button class="secondary-btn" data-route="lockerMap" type="button">${icon("map")} Xem bản đồ tủ</button>
      <button class="primary-btn next-cta" data-route="roleSelect" type="button">Tiếp tục</button>
    </div>
  `;
  return shell("Vị trí tủ đã sẵn sàng", "", body, { back: { route: "lockerScan", label: "Quay lại quét tủ" } });
}

function lockerMap() {
  const body = `
    <div class="map-board">
      ${state.lockerBlocks.map((block) => `
        <button class="locker-network-card ${block.publicCode === state.locker?.publicCode ? "selected" : ""}" data-action="selectLocker" data-locker="${block.publicCode}" type="button">
          <div class="icon-tile">${icon(block.status === "Online" ? "location_on" : "pending")}</div>
          <div>
            <strong>${block.locationName}</strong>
            <p>${block.name} · ${block.floorLabel}</p>
            <small>${statusText(block.status)}</small>
          </div>
        </button>
      `).join("")}
    </div>
    <div class="notice-card">${icon("hub")} Màn hình này dùng để mở rộng nhiều điểm đặt tủ trong tương lai.</div>
    <button class="primary-btn next-cta" data-route="roleSelect" type="button">Tiếp tục</button>
  `;
  return shell("Bản đồ mạng lưới tủ", "", body, { back: { route: "lockerLocation", label: "Quay về vị trí tủ" } });
}

function roleSelect() {
  const body = `
    <div class="role-grid">
      <button class="role-card" data-action="chooseRole" data-role="resident" type="button">
        <div class="icon-tile">${icon("home")}</div>
        <span><strong>Tôi là Người nhận hàng</strong><small>Nhận hàng của mình hoặc nhận hộ</small></span>
      </button>
      <button class="role-card" data-action="chooseRole" data-role="shipper" type="button">
        <div class="icon-tile">${icon("local_shipping")}</div>
        <span><strong>Tôi là Người giao hàng</strong><small>Gửi hàng nhanh vào tủ</small></span>
      </button>
    </div>
  `;
  return shell("Bạn đang thao tác với tư cách nào?", "", body, {
    back: { route: "lockerLocation", label: "Quay về vị trí tủ" },
    beforeTitle: lockerSummary(),
    eyebrow: "Chọn vai trò",
  });
}

function login() {
  const label = state.role === "shipper" ? "Người giao hàng" : "Người nhận hàng";
  const isShipper = state.role === "shipper";
  const needsRegistration = state.auth.otpSent && state.auth.accountExists === false;
  const body = `
    ${lockerSummary()}
    <article class="login-card phone-login-card">
      <div class="icon-tile">${icon("phone_iphone")}</div>
      <div>
        <strong>Đăng nhập hoặc đăng ký</strong>
        <p class="muted" style="font-weight: bold; color: rgb(63, 127, 178);">${label}</p>
      </div>
    </article>
    <div class="auth-form">
      ${input("Số điện thoại", "auth.phone", state.auth.phone, "Ví dụ: 0901234567", "tel")}
      ${state.auth.otpSent ? `
        <div class="demo-otp-notice">
          ${icon("key")}
          <span>Mã OTP dùng cho bản demo: <strong>123456</strong></span>
        </div>
        ${input("Mã OTP", "auth.otp", state.auth.otp, "Nhập 123456")}
      ` : ""}
      ${needsRegistration ? `
        <div class="registration-fields">
          <span class="eyebrow">Tạo tài khoản ${label}</span>
          ${input("Họ và tên", "auth.fullName", state.auth.fullName, isShipper ? "Tên người giao hàng" : "Tên người nhận hàng")}
          ${isShipper
            ? select("Đơn vị giao hàng", "auth.deliveryPartner", state.auth.deliveryPartner, [
                ["", "Chọn đơn vị giao hàng"],
                ["SPX Express", "SPX Express"],
                ["TikTok Shop", "TikTok Shop"],
                ["Lazada Logistics", "Lazada Logistics"],
                ["Giao Hàng Nhanh", "Giao Hàng Nhanh"],
                ["Giao Hàng Tiết Kiệm", "Giao Hàng Tiết Kiệm"],
                ["J&T Express", "J&T Express"],
                ["Viettel Post", "Viettel Post"],
                ["Khác", "Khác"],
              ])
            : input("Căn hộ", "auth.apartmentAddress", state.auth.apartmentAddress, "Ví dụ: Căn A1204")}
        </div>
      ` : ""}
      <div class="button-grid">
        <button class="primary-btn next-cta" data-action="${state.auth.otpSent ? "verifyPhoneOtp" : "requestPhoneOtp"}" type="button">
          ${icon(state.auth.otpSent ? "login" : "sms")}
          ${state.auth.otpSent ? (needsRegistration ? "Đăng ký và tiếp tục" : "Đăng nhập") : "Nhận mã OTP"}
        </button>
        <button class="secondary-btn" data-route="roleSelect" type="button">Chọn lại vai trò</button>
      </div>
    </div>
  `;
  return shell(`Tiếp tục với vai trò ${label}`, "", body, { back: { route: "roleSelect", label: "Quay lại chọn vai trò" } });
}

function home() {
  if (!state.user) return login();
  const isShipper = state.role === "shipper";
  const body = `
    <section class="dashboard-hero">
      <div>
        <span class="eyebrow">${isShipper ? "Giao hàng" : "Nhận hàng"}</span>
        <h1>${isShipper ? "Gửi hàng vào tủ nhanh hơn!" : "Hàng của bạn đang chờ nhận!"}</h1>
      </div>
      <img src="./assets/green-locker.png" alt="Tủ khóa thông minh" />
    </section>
    <section class="metric-grid">
      ${metric("Block tủ", state.locker?.name || "A")}
      ${metric(isShipper ? "Luồng chính" : "Đơn chờ nhận", isShipper ? "Gửi nhanh" : (state.residentParcels?.length ?? 0))}
      ${metric("Vai trò", isShipper ? "Người giao hàng" : "Người nhận hàng")}
    </section>
    <div class="button-stack">
      <button class="primary-btn next-cta" data-route="${isShipper ? "shipperDropoff" : "residentOrders"}" type="button">
        ${icon(isShipper ? "barcode_scanner" : "inventory_2")} ${isShipper ? "Giao đơn mới" : "Xem hàng cần nhận"}
      </button>
      ${!isShipper ? `<button class="secondary-btn" data-route="residentHelper" type="button">${icon("group")} Nhận hộ người khác</button>` : ""}
    </div>
  `;
  return shell(isShipper ? "Trang chủ Người giao hàng" : "Trang chủ Người nhận hàng", "", body);
}

function residentProfile() {
  const p = state.residentProfile;
  const body = `
    <div class="form-stack">
      ${input("Họ tên người nhận", "residentProfile.fullName", p.fullName, "Nguyễn Văn A")}
      ${input("Số điện thoại nhận hàng", "residentProfile.phone", p.phone, "0901234567")}
      ${input("Địa chỉ căn hộ", "residentProfile.apartmentAddress", p.apartmentAddress, "Căn A1204, Khu nhà ở xã hội Định Hòa")}
      <button class="primary-btn next-cta" data-action="saveResidentProfile" type="button">Lưu và xem đơn hàng</button>
    </div>
  `;
  return shell("Thông tin người nhận hàng", "Thông tin này dùng để lọc đúng các đơn đang nằm trong block tủ đã quét.", body, { back: { route: "home", label: "Quay về trang chủ" } });
}

function residentOrders() {
  const phoneMissing = !state.residentProfile.phone;
  const parcels = state.residentParcels || [];
  const body = phoneMissing ? `
    <div class="notice-card">${icon("info")} Bạn cần nhập thông tin người nhận trước khi xem danh sách đơn.</div>
    <button class="primary-btn next-cta" data-route="residentProfile" type="button">Nhập thông tin người nhận</button>
  ` : `
    ${storageFeeGuide()}
    <div class="section-head">
      <h3>Đơn đang chờ nhận</h3>
      <button class="mini-btn" data-action="refreshParcels" type="button">${icon("refresh")} Tải lại</button>
    </div>
    <div class="list-stack">
      ${parcels.length ? parcels.map(parcelCard).join("") : `<div class="empty-card">${icon("inventory_2")} Không còn đơn nào cần nhận tại block tủ này.</div>`}
    </div>
    <button class="secondary-btn" data-route="residentHelper" type="button">${icon("group")} Nhận hộ người khác</button>
  `;
  return shell("Danh sách hàng cần nhận", "", body, { back: { route: "home", label: "Quay về trang chủ" } });
}

function parcelCard(parcel) {
  const storage = storageInfo(parcel);
  return `
    <article class="parcel-card">
      <div>
        <strong>${displayText(parcel.code, "Chưa có mã")} - Ngăn ${displayText(parcel.compartmentCode, "đang cập nhật")}</strong>
        <p>${displayText(parcel.receiverName, "Người nhận hàng")} · ${displayText(parcel.receiverPhone, "Chưa có số điện thoại")}</p>
        <div class="storage-summary">
          <span>${icon("schedule")} ${storage.label}</span>
          <strong>${money(storage.fee)}</strong>
        </div>
        ${storage.isOvernight ? `<p class="storage-overnight">${icon("bedtime")} Đơn đã qua đêm</p>` : ""}
      </div>
      <button class="mini-btn" data-action="selectParcel" data-id="${parcel.id}" type="button">Lấy hàng</button>
    </article>
  `;
}

function residentHelper() {
  const body = `
    <div class="form-stack">
      ${input("Số điện thoại người nhận", "helper.phone", state.helper.phone, "0912345678")}
      ${input("Mã OTP", "helper.otp", state.helper.otp, "123456")}
      ${input("Mã đơn hàng cần lấy hộ", "helper.parcelCode", state.helper.parcelCode, "DH001")}
      <button class="primary-btn next-cta" data-action="verifyHelper" type="button">Xác thực nhận hộ</button>
    </div>
  `;
  return shell("Nhận hộ người khác", "", body, { back: { route: "residentOrders", label: "Quay về đơn của tôi" } });
}

function residentPayment() {
  const parcel = state.selectedParcel;
  if (!parcel) return residentOrders();
  const storage = storageInfo(parcel);
  parcel.pickupFee = storage.fee;
  const needsPayment = storage.fee > 0 && parcel.paymentStatus !== "Paid";
  const body = `
    ${parcelDetail(parcel)}
    ${needsPayment ? paymentBox() : `<div class="notice-card done">${icon("verified")} Đơn hàng không phát sinh phí hoặc đã thanh toán.</div>`}
    <button class="primary-btn next-cta" data-action="${needsPayment ? "createPayment" : "openResidentLocker"}" type="button">
      ${icon(needsPayment ? "qr_code_2" : "door_open")} ${needsPayment ? "Tạo QR thanh toán" : "Mở tủ lấy hàng"}
    </button>
  `;
  return shell("Xác thực đơn hàng", "Hệ thống kiểm tra đúng đơn, đúng người nhận và phí lưu trữ nếu có.", body, { back: { route: "residentOrders", label: "Quay về danh sách đơn" } });
}

function paymentBox() {
  if (!state.payment) {
    return `<div class="notice-card">${icon("payments")} Cần tạo mã QR thanh toán cho đơn này.</div>`;
  }
  return `
    <article class="payment-card">
      <div>
        <span class="eyebrow">Thanh toán phí lưu trữ</span>
        <h3>${money(state.payment.amount)}</h3>
        <p class="muted">Mã tham chiếu: ${state.payment.referenceCode}</p>
      </div>
      ${state.payment.qrImageUrl ? `<img class="payment-qr" src="${state.payment.qrImageUrl}" alt="Mã QR thanh toán" />` : ""}
      <div class="button-grid">
        ${state.payment.checkoutUrl ? `<a class="secondary-btn as-link" href="${state.payment.checkoutUrl}" target="_blank" rel="noreferrer">${icon("open_in_new")} Mở trang VNPAY</a>` : ""}
        <button class="primary-btn" data-action="simulatePayment" type="button">${icon("task_alt")} Mô phỏng đã thanh toán</button>
      </div>
    </article>
  `;
}

function residentOpen() {
  const parcel = state.selectedParcel;
  const body = `
    ${processList(["Xác thực đơn hàng", "Gửi lệnh mở tủ", "Chờ bạn lấy hàng và đóng cửa"], 2)}
    <button class="primary-btn next-cta" data-route="residentClose" type="button">${icon("inventory_2")} Tôi đã lấy hàng</button>
  `;
  return shell(`Ngăn ${parcel?.compartmentCode || ""} đã mở`, "Vui lòng lấy hàng ra khỏi tủ rồi đóng cửa lại.", body, { back: { route: "residentPayment", label: "Quay về xác thực" } });
}

function residentClose() {
  const parcel = state.selectedParcel;
  const body = `
    <div class="door-state warning">${icon("door_open")} Cửa ngăn ${parcel?.compartmentCode || ""} đang mở</div>
    <button class="primary-btn next-cta" data-action="completePickup" type="button">${icon("door_front")} Tôi đã đóng cửa</button>
  `;
  return shell("Đóng cửa tủ", "Sau khi cửa đóng, hệ thống cập nhật đơn đã lấy và chuyển ngăn về trạng thái trống.", body, { back: { route: "residentOpen", label: "Quay lại bước lấy hàng" } });
}

function residentDone() {
  return successScreen("Nhận hàng thành công", "Đơn đã được cập nhật đã nhận. Ngăn tủ chuyển về trạng thái trống.", "Về trang chủ", "home");
}

function shipperDropoff() {
  const d = state.dropoff;
  const body = `
    ${lockerSummary()}
    <div class="form-stack">
      ${input("Mã vận đơn", "dropoff.parcelCode", d.parcelCode, "DH118")}
      ${input("Số điện thoại người nhận", "dropoff.receiverPhone", d.receiverPhone, "0901234567")}
      ${input("Tên người nhận", "dropoff.receiverName", d.receiverName, "Nguyễn Văn A")}
      <button class="secondary-btn" data-action="fillDemoParcel" type="button">${icon("barcode_scanner")} Quét mã vạch đơn hàng để tự điền</button>

      ${compartmentPicker(d.compartments, d.selectedCompartmentCode)}
      ${storageFeeGuide()}
      <button class="primary-btn next-cta" data-action="createDropoff" type="button" ${d.selectedCompartmentCode ? "" : "disabled"}>${icon("door_open")} Xác nhận giao hàng vào ${d.selectedCompartmentCode || "ngăn đã chọn"}</button>
    </div>
  `;
  return shell("Thông tin đơn giao", "", body, { back: { route: "home", label: "Quay về trang chủ" } });
}

function compartmentPicker(compartments = demoCompartments, selectedCode = "") {
  const sizeLabels = { Small: "Nhỏ", Medium: "Vừa", Large: "Lớn" };
  const statusLabels = {
    Available: "Trống",
    Occupied: "Đang chứa hàng",
    Reserved: "Đã giữ chỗ",
    Maintenance: "Bảo trì",
    Unavailable: "Chưa hoạt động",
  };
  const byCode = new Map(compartments.map((item) => [item.code, item]));
  const ordered = demoCompartments.map((fallback) => byCode.get(fallback.code) || fallback);

  return `
    <section class="compartment-picker" aria-labelledby="compartmentPickerTitle">
      <div class="compartment-picker-heading">
        <div>
          <span class="eyebrow">Chọn ngăn tủ</span>
          <h3 id="compartmentPickerTitle">Block tủ A</h3>
        </div>
        <button class="refresh-compartments-btn" data-action="refreshCompartments" type="button" ${state.refreshingCompartments ? "disabled" : ""}>
          ${icon("refresh", state.refreshingCompartments ? "spin" : "")}
          ${state.refreshingCompartments ? "Đang tải" : "Tải lại"}
        </button>
      </div>
      <div class="compartment-legend" aria-label="Chú thích trạng thái">
        <span><i class="available"></i> Trống</span>
        <span><i class="occupied"></i> Đã dùng</span>
        <span><i class="unavailable"></i> Chưa hoạt động</span>
      </div>
      <div class="locker-front" role="group" aria-label="Sơ đồ 12 ngăn tủ">
        ${ordered.map((item) => {
          const status = displayText(item.status, "Unavailable");
          const size = displayText(item.size, "Medium");
          const selectable = status === "Available";
          const selected = selectedCode === item.code;
          return `
            <button
              class="locker-door status-${status.toLowerCase()} ${selected ? "selected" : ""}"
              data-action="selectCompartment"
              data-code="${item.code}"
              type="button"
              aria-pressed="${selected}"
              aria-label="Ngăn ${displayText(item.code)}, kích thước ${sizeLabels[size] || "Vừa"}, ${statusLabels[status] || "Chưa hoạt động"}"
              ${selectable ? "" : "disabled"}
            >
              <span class="door-code">${displayText(item.code)}</span>
              <span class="door-size">${sizeLabels[size] || "Vừa"}</span>
              <span class="door-status">${statusLabels[status] || "Chưa hoạt động"}</span>
              <span class="door-handle" aria-hidden="true"></span>
            </button>
          `;
        }).join("")}
      </div>
      <p class="compartment-selection">
        ${selectedCode
          ? `${icon("check_circle")} Đã chọn ngăn <strong>${selectedCode}</strong>`
          : `${icon("touch_app")} Chạm vào ngăn màu xanh để chọn`}
      </p>
    </section>
  `;
}

function shipperOpen() {
  const parcel = state.dropoff.openedParcel;
  const body = `
    ${parcelDetail(parcel)}
    ${processList(["Kiểm tra ngăn trống", "Gửi lệnh mở tủ", "Chờ người giao hàng bỏ hàng"], 2)}
    <button class="primary-btn next-cta" data-route="shipperProof" type="button">${icon("inventory_2")} Tôi đã bỏ hàng vào tủ</button>
  `;
  return shell(`Ngăn ${parcel?.compartmentCode || ""} đã mở`, "Đặt kiện hàng vào ngăn rồi chụp ảnh minh chứng.", body, { back: { route: "shipperDropoff", label: "Quay lại thông tin đơn" } });
}

function shipperProof() {
  const body = `
    <div class="capture-card ${state.dropoff.evidenceReady ? "done" : ""}">
      <div class="capture-frame">${icon(state.dropoff.evidenceReady ? "check_circle" : "photo_camera")}</div>
      <strong>${state.dropoff.evidenceReady ? "Đã chụp ảnh kiện hàng" : "Chụp ảnh kiện hàng trong ngăn"}</strong>
      <p class="muted">Ảnh minh chứng giúp giảm tranh chấp khi có khiếu nại.</p>
    </div>
    <div class="button-grid">
      <button class="secondary-btn" data-action="captureEvidence" type="button">${icon("photo_camera")} Chụp ảnh</button>
      <button class="primary-btn next-cta" data-route="shipperClose" type="button" ${state.dropoff.evidenceReady ? "" : "disabled"}>Tiếp tục đóng tủ</button>
    </div>
  `;
  return shell("Ảnh minh chứng", "Bước này ghi nhận kiện hàng đã được bỏ vào đúng ngăn.", body, { back: { route: "shipperOpen", label: "Quay lại mở tủ" } });
}

function shipperClose() {
  const parcel = state.dropoff.openedParcel;
  const body = `
    <div class="door-state warning">${icon("door_open")} Cửa ngăn ${parcel?.compartmentCode || ""} đang mở</div>
    <button class="primary-btn next-cta" data-action="completeDropoff" type="button">${icon("door_front")} Tôi đã đóng cửa</button>
  `;
  return shell("Đóng cửa tủ", "Sau khi cửa đóng, hệ thống lưu đơn trong tủ và gửi mã nhận hàng cho người nhận hàng.", body, { back: { route: "shipperProof", label: "Quay về ảnh minh chứng" } });
}

function shipperDone() {
  return successScreen("Giao hàng thành công", "Đơn đã lưu trong tủ. Hệ thống đã tạo mã nhận hàng và ghi lịch sử giao nhận.", "Giao đơn tiếp theo", "shipperDropoff");
}

function orders() {
  return state.role === "shipper" ? shipperDropoff() : residentOrders();
}

function history() {
  const body = `
    <div class="list-stack">
      ${state.history.length ? state.history.map((item) => `
        <article class="history-item">
          ${icon(item.type === "shipper" ? "local_shipping" : "inventory_2")}
          <div><strong>${displayText(item.title, "Hoạt động")}</strong><p class="muted">${displayText(item.status, "Đã cập nhật")}</p></div>
        </article>
      `).join("") : `<div class="empty-card">${icon("history")} Chưa có lịch sử thao tác.</div>`}
    </div>
  `;
  return shell("Lịch sử", "", body, { back: { route: "home", label: "Quay về trang chủ" } });
}

function profile() {
  if (!state.user) {
    return shell("Tài khoản", "Bạn cần quét block tủ, chọn vai trò rồi đăng nhập.", `
      <button class="primary-btn next-cta" data-route="lockerScan" type="button">Quét mã block tủ</button>
    `);
  }
  const isShipper = state.role === "shipper";
  const profile = isShipper ? state.shipperProfile : state.residentProfile;
  const body = `
    <article class="profile-card">
      <div class="avatar large">${isShipper ? "G" : "N"}</div>
      <div>
        <strong>${displayText(profile.fullName ?? state.user.displayName, "Người dùng")}</strong>
        <p>${displayText(state.user.email, state.user.phone || "")}</p>
        <p class="muted">${displayText(isShipper ? profile.deliveryPartner : profile.apartmentAddress, isShipper ? "Đơn vị giao hàng" : "Địa chỉ nhận hàng")}</p>
      </div>
    </article>
    ${metricRow("Vai trò", isShipper ? "Người giao hàng" : "Người nhận hàng")}
    ${metricRow("Số điện thoại", profile.phone || "Chưa cập nhật")}
    ${metricRow("Block tủ hiện tại", state.locker?.name || "Chưa quét")}
    <div class="button-stack">
      <button class="secondary-btn" data-route="${isShipper ? "shipperDropoff" : "residentProfile"}" type="button">Cập nhật thông tin</button>
      <button class="danger-btn" data-action="logout" type="button">${icon("logout")} Đăng xuất</button>
    </div>
  `;
  return shell("Tài khoản", "", body, { back: { route: "home", label: "Quay về trang chủ" } });
}

function successScreen(title, subtitle, cta, route) {
  return shell(title, subtitle, `
    <article class="success-card">
      ${icon("check_circle")}
      <strong>${title}</strong>
      <p class="muted">${subtitle}</p>
    </article>
    <button class="primary-btn next-cta" data-route="${route}" type="button">${cta}</button>
  `);
}

function parcelDetail(parcel) {
  if (!parcel) return "";
  const storage = storageInfo(parcel);
  return `
    <article class="parcel-detail">
      <div class="avatar">${(parcel.receiverName || "K").slice(0, 1)}</div>
      <div>
        <strong>${displayText(parcel.receiverName, "Người nhận hàng")}</strong>
        <p>${displayText(parcel.receiverPhone, "Chưa có số điện thoại")}</p>
        <p class="muted">${displayText(parcel.receiverAddress, "Chưa có địa chỉ")}</p>
      </div>
      <div class="detail-code">
        <span>Mã đơn</span>
        <strong>${displayText(parcel.code, "Chưa có mã")}</strong>
      </div>
      <div class="parcel-storage-detail">
        <span>${icon("schedule")} ${storage.label}</span>
        <strong>Phí hiện tại: ${money(storage.fee)}</strong>
      </div>
    </article>
  `;
}

function input(label, name, value, placeholder, type = "text") {
  return `
    <label class="field">
      <span>${label}</span>
      <input type="${type}" data-field="${name}" value="${displayText(value)}" placeholder="${displayText(placeholder)}" />
    </label>
  `;
}

function select(label, name, value, options) {
  return `
    <label class="field">
      <span>${label}</span>
      <select data-field="${name}">
        ${options.map(([val, text]) => `<option value="${displayText(val)}" ${val === value ? "selected" : ""}>${displayText(text)}</option>`).join("")}
      </select>
    </label>
  `;
}

function metric(label, value) {
  return `<article class="metric-card"><span>${displayText(label)}</span><strong>${displayText(value, "0")}</strong></article>`;
}

function metricRow(label, value) {
  return `<div class="metric-row"><span>${displayText(label)}</span><strong>${displayText(value, "Chưa cập nhật")}</strong></div>`;
}

function processList(items, activeIndex) {
  return `
    <div class="process-list">
      ${items.map((item, index) => `
        <div class="${index < activeIndex ? "done" : index === activeIndex ? "current" : "todo"}">
          ${icon(index < activeIndex ? "check_circle" : index === activeIndex ? "pending" : "radio_button_unchecked")}
          <strong>${item}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

async function handleAction(action, button) {
  if (action === "scanLocker") {
    state.scanning = true;
    render();
    window.setTimeout(async () => {
      state.scanning = false;
      await chooseLocker("SL-LOCKER-05");
      setRoute("lockerLocation");
      showToast("Đã nhận diện block tủ A");
    }, 1400);
  }

  if (action === "manualLocker") {
    await chooseLocker("SL-LOCKER-05");
    setRoute("lockerLocation");
  }

  if (action === "selectLocker") {
    await chooseLocker(button.dataset.locker);
    render();
  }

  if (action === "chooseRole") {
    state.role = button.dataset.role;
    state.auth = {
      phone: "",
      otp: "",
      otpSent: false,
      accountExists: null,
      fullName: "",
      apartmentAddress: "",
      deliveryPartner: "",
    };
    saveState();
    setRoute("login");
  }

  if (action === "requestPhoneOtp") await requestPhoneOtp();
  if (action === "verifyPhoneOtp") await verifyPhoneOtp();
  if (action === "saveResidentProfile") await saveResidentProfile();
  if (action === "refreshParcels") await refreshParcels();
  if (action === "refreshCompartments") await refreshCompartments();

  if (action === "selectParcel") {
    const parcels = state.residentParcels || [];
    state.selectedParcel = parcels.find((item) => String(item.id) === button.dataset.id);
    state.payment = null;
    setRoute("residentPayment");
  }

  if (action === "verifyHelper") {
    if (!state.helper.phone || !state.helper.otp || !state.helper.parcelCode) {
      showToast("Vui lòng nhập đủ số điện thoại, OTP và mã đơn.");
      return;
    }
    state.selectedParcel = {
      id: `helper-${Date.now()}`,
      code: state.helper.parcelCode,
      receiverName: "Người nhận hộ đã xác thực",
      receiverPhone: state.helper.phone,
      receiverAddress: state.locker?.locationName || "Block tủ hiện tại",
      compartmentCode: "A12",
      pickupFee: 2000,
      paymentStatus: "Pending",
      status: "PaymentPending",
      storedAt: new Date().toISOString(),
    };
    setRoute("residentPayment");
  }

  if (action === "createPayment") await createPayment();
  if (action === "simulatePayment") await simulatePayment();
  if (action === "openResidentLocker") setRoute("residentOpen");
  if (action === "completePickup") await completePickup();

  if (action === "fillDemoParcel") {
    state.dropoff.parcelCode = `DH${Math.floor(100 + Math.random() * 900)}`;
    state.dropoff.receiverPhone = "0901234567";
    state.dropoff.receiverName = "Nguyễn Văn A";
    state.dropoff.receiverAddress = "Căn A1204, Khu nhà ở xã hội Định Hòa";
    render();
  }

  if (action === "selectCompartment") {
    const compartment = state.dropoff.compartments.find((item) => item.code === button.dataset.code);
    if (!compartment || compartment.status !== "Available") {
      showToast("Ngăn này hiện không thể sử dụng.");
      return;
    }
    state.dropoff.selectedCompartmentCode = compartment.code;
    render();
  }

  if (action === "createDropoff") await createDropoff();
  if (action === "captureEvidence") {
    state.dropoff.evidenceReady = true;
    showToast("Đã chụp ảnh minh chứng.");
    render();
  }
  if (action === "completeDropoff") await completeDropoff();
  if (action === "logout") logout();
}

async function chooseLocker(code) {
  try {
    state.locker = await api(`/locker-blocks/by-qr/${encodeURIComponent(code)}`);
  } catch {
    state.apiOnline = false;
    state.locker = state.lockerBlocks.find((item) => item.qrCode === code || item.publicCode === code) || demoLockerBlocks[0];
  }
  saveState();
}

async function loadLockerCompartments() {
  if (!state.locker) return;
  try {
    state.dropoff.compartments = await api(
      `/locker-blocks/${encodeURIComponent(selectedLockerQr())}/compartments`,
    );
  } catch {
    state.apiOnline = false;
    state.dropoff.compartments = demoCompartments;
  }

  const selected = state.dropoff.compartments.find(
    (item) => item.code === state.dropoff.selectedCompartmentCode && item.status === "Available",
  );
  if (!selected) state.dropoff.selectedCompartmentCode = "";
  render();
}

async function refreshCompartments() {
  state.refreshingCompartments = true;
  render();
  try {
    await loadLockerCompartments();
    showToast("Đã cập nhật trạng thái các ngăn tủ.");
  } finally {
    state.refreshingCompartments = false;
    render();
  }
}

async function requestPhoneOtp() {
  const phone = String(state.auth.phone || "").replace(/\s+/g, "");
  if (!/^(\+?84|0)\d{8,10}$/.test(phone)) {
    showToast("Vui lòng nhập số điện thoại hợp lệ.");
    return;
  }

  try {
    const challenge = await api("/auth/phone/request-otp", {
      method: "POST",
      body: JSON.stringify({
        phone,
        role: state.role === "shipper" ? "Shipper" : "Resident",
      }),
    });
    state.auth.phone = challenge.phone;
    state.auth.accountExists = challenge.accountExists;
  } catch (error) {
    state.apiOnline = false;
    state.auth.accountExists = false;
    showToast(`Đang dùng chế độ demo: ${error.message}`);
  }

  state.auth.otpSent = true;
  state.auth.otp = "";
  render();
}

async function verifyPhoneOtp() {
  const isShipper = state.role === "shipper";
  if (state.auth.otp !== "123456") {
    showToast("Mã OTP không đúng. Hãy nhập 123456.");
    return;
  }
  if (state.auth.accountExists === false && !state.auth.fullName.trim()) {
    showToast("Vui lòng nhập họ và tên để đăng ký.");
    return;
  }

  const request = {
    phone: state.auth.phone,
    otp: state.auth.otp,
    role: isShipper ? "Shipper" : "Resident",
    fullName: state.auth.fullName || null,
    apartmentAddress: state.auth.apartmentAddress || null,
    deliveryPartner: state.auth.deliveryPartner || null,
  };

  try {
    applySession(await api("/auth/phone/verify-otp", {
      method: "POST",
      body: JSON.stringify(request),
    }));
  } catch (error) {
    state.apiOnline = false;
    const displayName = state.auth.fullName || (isShipper ? "Người giao hàng demo" : "Người nhận hàng demo");
    state.user = {
      email: `${state.auth.phone}@phone.shipmates.local`,
      displayName,
      phone: state.auth.phone,
      role: request.role,
    };
    if (isShipper) {
      state.shipperProfile = {
        fullName: displayName,
        phone: state.auth.phone,
        deliveryPartner: state.auth.deliveryPartner,
      };
    } else {
      state.residentProfile = {
        fullName: displayName,
        phone: state.auth.phone,
        apartmentAddress: state.auth.apartmentAddress,
      };
    }
    showToast(`Đăng nhập demo: ${error.message}`);
  }

  saveState();
  if (!isShipper) await loadResidentParcels();
  setRoute(isShipper ? "shipperDropoff" : "residentOrders");
}

async function saveResidentProfile() {
  if (!state.residentProfile.fullName || !state.residentProfile.phone) {
    showToast("Vui lòng nhập họ tên và số điện thoại.");
    return;
  }
  try {
    applySession(await api("/auth/resident-profile", {
      method: "PUT",
      body: JSON.stringify(state.residentProfile),
    }));
  } catch {
    state.apiOnline = false;
  }
  await refreshParcels();
  setRoute("residentOrders");
}

async function refreshParcels() {
  await loadResidentParcels();
  render();
}

async function createPayment() {
  const parcel = state.selectedParcel;
  if (!parcel) return;
  if (String(parcel.id).startsWith("demo")) {
    state.payment = {
      paymentRequestId: `demo-pay-${parcel.code}`,
      parcelCode: parcel.code,
      amount: parcel.pickupFee,
      referenceCode: `SM${parcel.code}`,
      qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`SHIPMATES ${parcel.code} ${parcel.pickupFee}`)}`,
      status: "Pending",
    };
    render();
    return;
  }
  try {
    state.payment = await api(`/resident/parcels/${parcel.id}/payment`, { method: "POST", body: "{}" });
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function simulatePayment() {
  if (!state.payment) return;
  if (String(state.payment.paymentRequestId).startsWith("demo")) {
    state.selectedParcel.paymentStatus = "Paid";
    setRoute("residentOpen");
    return;
  }
  try {
    await api(`/payments/${state.payment.paymentRequestId}/simulate-paid`, { method: "POST", body: "{}" });
    state.selectedParcel.paymentStatus = "Paid";
    setRoute("residentOpen");
  } catch (error) {
    showToast(error.message);
  }
}

async function completePickup() {
  const parcel = state.selectedParcel;
  if (!parcel) return;
  if (!String(parcel.id).startsWith("demo") && !String(parcel.id).startsWith("helper")) {
    try {
      await api(`/resident/parcels/${parcel.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ parcelId: parcel.id, pickupOtp: state.helper.otp || null }),
      });
    } catch (error) {
      showToast(error.message);
      return;
    }
  }
  state.residentParcels = (state.residentParcels || []).filter((item) => item.id !== parcel.id);
  state.history.unshift({ type: "resident", title: parcel.code, status: "Đã nhận hàng và đóng tủ." });
  saveState();
  setRoute("residentDone");
}

async function createDropoff() {
  const d = state.dropoff;
  if (!d.receiverPhone || !d.parcelCode) {
    showToast("Vui lòng nhập mã vận đơn và số điện thoại người nhận.");
    return;
  }
  if (!d.selectedCompartmentCode) {
    showToast("Vui lòng chọn một ngăn tủ đang trống.");
    return;
  }
  const payload = {
    lockerQrCode: selectedLockerQr(),
    parcelCode: d.parcelCode,
    receiverPhone: d.receiverPhone,
    receiverName: d.receiverName || "Khách nhận hàng",
    receiverAddress: d.receiverAddress || state.locker?.address,
    compartmentCode: d.selectedCompartmentCode,
  };
  try {
    state.dropoff.openedParcel = await api("/shipper/dropoffs/quick", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    state.apiOnline = false;
    showToast(`Không thể gửi lệnh mở tủ: ${error.message}`);
    return;
  }
  state.dropoff.evidenceReady = false;
  await loadLockerCompartments();
  saveState();
  setRoute("shipperOpen");
}

async function completeDropoff() {
  const parcel = state.dropoff.openedParcel;
  if (!parcel) return;
  if (!String(parcel.id).startsWith("demo")) {
    try {
      await api(`/shipper/dropoffs/${parcel.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ parcelId: parcel.id, evidenceImageUrl: state.dropoff.evidenceReady ? "demo-proof.jpg" : null }),
      });
    } catch (error) {
      showToast(error.message);
      return;
    }
  }
  state.history.unshift({ type: "shipper", title: parcel.code, status: `Đã gửi vào ngăn ${parcel.compartmentCode}.` });
  if (state.residentProfile.phone === parcel.receiverPhone || parcel.receiverPhone === "0901234567") {
    state.residentParcels = [parcel, ...(state.residentParcels || []).filter((item) => item.id !== parcel.id)];
  }
  state.dropoff = { ...state.dropoff, parcelCode: "", evidenceReady: false, openedParcel: null };
  saveState();
  setRoute("shipperDone");
}

function logout() {
  state.token = "";
  state.user = null;
  state.role = "";
  localStorage.removeItem("shipmates.token");
  localStorage.removeItem("shipmates.user");
  localStorage.removeItem("shipmates.role");
  showToast("Đã đăng xuất.");
  setRoute("lockerScan");
}

document.addEventListener("click", async (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) setRoute(routeButton.dataset.route);

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton || state.isBusy) return;

  state.isBusy = true;
  actionButton.classList.add("is-pressed");
  try {
    await handleAction(actionButton.dataset.action, actionButton);
  } finally {
    state.isBusy = false;
    actionButton.classList.remove("is-pressed");
  }
});

document.addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (!field) return;
  const [group, name] = field.split(".");
  if (!state[group]) return;
  state[group][name] = event.target.type === "number" ? Number(event.target.value) : event.target.value;
  saveState();
});

setInterval(() => {
  if (state.route === "residentOrders" || state.route === "residentPayment") {
    render();
  }
}, 60000);

boot();
