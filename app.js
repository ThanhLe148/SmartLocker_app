// === MQTT CONFIGURATION ===
let mqttClient = null;
const MQTT_BROKER = "test.mosquitto.org";
const MQTT_PORT = 8081; 
const MQTT_TOPIC = "locker_may/command"; 

function setupMQTT() {
  const clientId = "WebApp_" + Math.random().toString(16).substr(2, 8);
  mqttClient = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, clientId);

  mqttClient.onConnectionLost = function (responseObject) {
    if (responseObject.errorCode !== 0) {
      console.log("MQTT Connection Lost: " + responseObject.errorMessage);
      setTimeout(setupMQTT, 3000); 
    }
  };

  mqttClient.connect({
    useSSL: true, 
    onSuccess: function () {
      console.log("Web App successfully connected to MQTT Broker");
    },
    onFailure: function (error) {
      console.log("MQTT Connection Failed: ", error.errorMessage);
    }
  });
}

// === SEND UNLOCK COMMAND ===
function sendUnlockCommand() {
  if (mqttClient && mqttClient.isConnected()) {
    const cmd = "UNLOCK"; 
    const message = new Paho.MQTT.Message(cmd);
    message.destinationName = MQTT_TOPIC;
    mqttClient.send(message);
    console.log("Sent unlock command: " + cmd);
  } else {
    showToast("Error: Reconnecting to locker system!");
  }
}

//ORG CODES FROM HERE 
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

const lockerBlock = {
  id: "BLOCK-DH-001",
  name: "Block tủ B-04",
  site: "Khu nhà ở xã hội Định Hòa",
  address: "Phường Định Hòa, TP. Thủ Dầu Một, Bình Dương",
  floor: "Sảnh A - Tầng trệt",
  status: "Đang hoạt động",
  compartments: { small: 6, medium: 8, large: 3 },
};

const receiverSteps = ["Quét tủ", "Đăng nhập", "Hồ sơ", "Chọn đơn", "Xác thực", "Lấy hàng", "Đóng tủ"];
const shipperSteps = ["Quét tủ", "Đăng nhập", "Hồ sơ", "Quét đơn", "Thanh toán", "Chọn ngăn", "Xác minh", "Hoàn tất"];

const receiverOrders = [
  { id: "DH001", shop: "Shopee", locker: "A12", sent: "09:30 hôm nay", remain: "Còn 2 giờ 15 phút", fee: "0đ", status: "Chờ nhận", receiver: "Nguyễn Văn A", phone: "0901234567" },
  { id: "DH002", shop: "Lazada", locker: "B02", sent: "10:10 hôm nay", remain: "Sắp hết hạn", fee: "5.000đ", status: "Cần thanh toán phí", receiver: "Nguyễn Văn A", phone: "0901234567" },
];

const helperOrders = [
  { id: "DH-HO-01", shop: "Tiki", locker: "C03", receiver: "Trần Minh Khang", phone: "0912345678", otp: "4821", status: "Ủy quyền nhận hộ" },
];

const compartmentSlots = {
  Nhỏ: ["A01", "A02", "A05"],
  Vừa: ["B01", "B04", "B06"],
  Lớn: ["C01", "C04"],
};

const deliveryApps = ["Shopee Express", "TikTok Shop", "Lazada Logistics", "Giao Hàng Nhanh", "Giao Hàng Tiết Kiệm", "J&T Express", "Viettel Post"];
const bankOptions = ["MBBANK - Ngân Hàng Quân Đội", "VCB - Vietcombank", "TCB - Techcombank", "ACB - Á Châu", "BIDV", "VietinBank", "VPBank"];
const demoAccounts = [
  { id: "demo_one", name: "Demo Account 1", email: "demo1@smartlocker.vn" },
  { id: "demo_two", name: "Demo Account 2", email: "demo2@smartlocker.vn" },
];

const profiles = JSON.parse(localStorage.getItem("smartlocker.profiles") || "{}");

const state = {
  route: "lockerScan",
  role: localStorage.getItem("smartlocker.role") || "",
  user: null,
  currentStep: 0,
  selectedOrderId: "DH001",
  selectedHelperOrderId: "",
  helperPhone: "",
  helperOtp: "",
  lockerScanned: localStorage.getItem("smartlocker.lockerScanned") === "true",
  scanningLocker: false,
  doorAttempt: 0,
  paymentWaitExpired: false,
  shipperBalance: Number(localStorage.getItem("smartlocker.shipperBalance") || "31500"),
  otp: makeOtp(),
  draft: {
    parcelCode: "DH118",
    receiverPhone: "0901234567",
    receiverName: "Nguyễn Văn A",
    receiverAddress: "Căn A1204, Khu nhà ở xã hội Định Hòa",
    note: "",
    size: "Vừa",
    compartment: "B04",
    proofReady: false,
    proofCameraOpen: false,
    proofUploaded: false,
  },
  residentProfile: JSON.parse(localStorage.getItem("smartlocker.residentProfile") || "null") || {
    name: "",
    phone: "",
    address: "",
    defaultNote: "",
  },
  shipperProfile: JSON.parse(localStorage.getItem("smartlocker.shipperProfile") || "null") || {
    name: "",
    phone: "",
    company: "",
    bankName: "",
    bankAccountOwner: "",
    bankAccount: "",
    approved: true,
  },
  history: JSON.parse(localStorage.getItem("smartlocker.history") || "null") || [
    { title: "DH000 - Shopee", status: "Đã lấy hàng lúc 08:45 hôm nay" },
    { title: "DH099 - Giao hàng", status: "Đã giao thành công, thưởng 700đ" },
  ],
};

const routes = {
  lockerScan,
  lockerLocation,
  lockerMap,
  roleSelect,
  login,
  home,
  orders,
  history,
  profile,
  residentProfileSetup,
  receiverOrdersScreen,
  receiverHelper,
  receiverHelperInfo,
  receiverProcess,
  receiverClose,
  receiverDoorCheck,
  receiverDone,
  shipperProfileSetup,
  shipperParcelScan,
  shipperParcelDetail,
  shipperPayment,
  shipperPaymentWaiting,
  shipperCancelled,
  shipperChooseCompartment,
  shipperDropoff,
  shipperProof,
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

function currentEmail() {
  return state.user?.email || "demo@smartlocker.vn";
}

function saveProfiles() {
  localStorage.setItem("smartlocker.profiles", JSON.stringify(profiles));
}

function saveState() {
  localStorage.setItem("smartlocker.role", state.role || "");
  localStorage.setItem("smartlocker.history", JSON.stringify(state.history));
  localStorage.setItem("smartlocker.lockerScanned", String(state.lockerScanned));
  localStorage.setItem("smartlocker.residentProfile", JSON.stringify(state.residentProfile));
  localStorage.setItem("smartlocker.shipperProfile", JSON.stringify(state.shipperProfile));
  localStorage.setItem("smartlocker.shipperBalance", String(state.shipperBalance));
}

function saveRoleForEmail() {
  if (!state.role) return;
  profiles[currentEmail()] = {
    ...(profiles[currentEmail()] || {}),
    role: state.role,
    residentProfile: state.residentProfile,
    shipperProfile: state.shipperProfile,
  };
  saveProfiles();
}

function restoreRoleForEmail() {
  const saved = profiles[currentEmail()];
  if (!saved?.role) return false;
  state.role = saved.role;
  if (saved.residentProfile) state.residentProfile = saved.residentProfile;
  if (saved.shipperProfile) state.shipperProfile = saved.shipperProfile;
  return true;
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
  window.clearTimeout(window.smartlockerAutoTimer);
  updateChrome();
  view.innerHTML = (routes[state.route] || lockerScan)();
  stepPanel.innerHTML = stepper();
  if (state.route === "shipperPaymentWaiting" && !state.paymentWaitExpired) startPaymentCountdown();
  scheduleAutoTransition();
}

function scheduleAutoTransition() {
  const autoRoutes = {
    receiverProcess: () => setRoute("receiverDone"),
    shipperClose: () => completeShipperDelivery(),
  };
  const next = autoRoutes[state.route];
  if (!next) return;
  window.smartlockerAutoTimer = window.setTimeout(next, 4500);
}

function updateChrome() {
  const isShipper = state.role === "shipper";
  roleBadge.textContent = state.user ? (isShipper ? "Người giao hàng" : "Cư dân") : "Chưa đăng nhập";
  roleBadge.classList.toggle("shipper", isShipper);
  accountName.textContent = state.user?.name || "Đăng nhập";
  ordersNavLabel.textContent = isShipper ? "Đơn giao" : "Đơn hàng";
  historyNavLabel.textContent = "Lịch sử";

  document.querySelectorAll(".nav-item").forEach((item) => {
    const route = item.dataset.route;
    const requiresLogin = route === "orders" || route === "history";
    const requiresLocker = route === "lockerMap";
    const hidden = (requiresLogin && !state.user) || (requiresLocker && !state.lockerScanned);
    const active = route === state.route || (route === "home" && state.route === "home");
    item.classList.toggle("is-hidden", hidden);
    item.classList.toggle("active", active && !item.dataset.action);
  });
}

function currentSteps() {
  return state.role === "shipper" ? shipperSteps : receiverSteps;
}

function stepper() {
  if (!state.role) {
    return `
      <div class="stack">
        <span class="eyebrow">Bắt đầu tại tủ</span>
        <h3>Quét mã block tủ</h3>
        ${lockerSummary()}
      </div>
    `;
  }
  const steps = currentSteps();
  return `
    <div class="stack">
      <span class="eyebrow">${state.role === "shipper" ? "Luồng giao hàng" : "Luồng nhận hàng"}</span>
      <h3>${state.role === "shipper" ? "Giao hàng tại block tủ" : "Nhận hàng tại block tủ"}</h3>
      <p class="muted">${lockerBlock.name} đang được chọn tại ${lockerBlock.site}.</p>
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

function backButton(route = "lockerScan", label = "Quay về") {
  return `<button class="back-link" data-route="${route}" type="button">${icon("arrow_back")} ${label}</button>`;
}

function sectionHeader(title, copy = "") {
  return `<div class="section-head"><h2>${title}</h2>${copy ? `<p class="muted">${copy}</p>` : ""}</div>`;
}

function lockerSummary() {
  return `
    <article class="location-card">
      <span class="order-icon">${icon("inventory_2")}</span>
      <div>
        <strong>${lockerBlock.name}</strong>
        <p class="muted">${lockerBlock.site}</p>
        <small>${lockerBlock.floor}</small>
      </div>
    </article>
  `;
}

function lockerScan() {
  state.currentStep = 0;
  const scanning = state.scanningLocker;
  return `
    <div class="page">
      <section class="hero-card button-stack">
        ${titleBlock("SmartLocker", "Quét mã block tủ")}
        <div class="camera-card locker-camera ${scanning ? "is-scanning" : ""}">
          <div class="scan-frame locker-scan-frame">
            <span class="corner-a"></span><span class="corner-b"></span>
            <div class="qr-plate">
              ${icon("qr_code_2")}
              <span class="scan-line"></span>
            </div>
          </div>
          <p class="scan-caption">${scanning ? "Đang quét mã block tủ..." : "Căn QR vào giữa khung để nhận diện block tủ"}</p>
        </div>
        <div class="choice-grid">
          <button class="secondary-btn" data-action="manualLocker" type="button" ${scanning ? "disabled" : ""}>${icon("pin")} Nhập mã tủ thủ công</button>
          <button class="primary-btn" data-action="scanLockerBlock" type="button" ${scanning ? "disabled" : ""}>${icon("qr_code_scanner")} ${scanning ? "Đang quét..." : "Quét mã block tủ"}</button>
        </div>
      </section>
    </div>
  `;
}

function lockerLocation() {
  return `
    <div class="page">
      ${backButton("lockerScan", "Quét lại mã tủ")}
      <section class="dashboard-hero">
        <div>
          <span class="eyebrow">Đã nhận diện block tủ</span>
          <h1>${lockerBlock.name}</h1>
          <p class="lead">${lockerBlock.site}</p>
          <p class="muted">${lockerBlock.address} • ${lockerBlock.floor}</p>
        </div>
        <img src="./assets/green-locker.png" alt="Block tủ SmartLocker tại Định Hòa" />
      </section>
      <section class="metric-grid">
        ${metric("Ngăn nhỏ trống", lockerBlock.compartments.small, "inventory")}
        ${metric("Ngăn vừa trống", lockerBlock.compartments.medium, "inventory_2")}
        ${metric("Ngăn lớn trống", lockerBlock.compartments.large, "deployed_code")}
        ${metric("Trạng thái", "Online", "wifi")}
      </section>
      <section class="action-panel location-ready-panel">
        <div>
          <h2>Vị trí tủ đã sẵn sàng</h2>
          <button class="secondary-btn" data-route="lockerMap" type="button">${icon("map")} Xem bản đồ tủ</button>
        </div>
        <button class="primary-btn next-cta" data-route="roleSelect" type="button">Tiếp theo</button>
      </section>
    </div>
  `;
}

function lockerMap() {
  return `
    <div class="page">
      ${backButton("lockerLocation", "Quay về vị trí tủ")}
      <section class="hero-card button-stack">
        ${titleBlock("Bản đồ tủ", "Mạng lưới SmartLocker")}
        <div class="map-preview">
          <div class="map-grid"></div>
          <div class="map-pin active">
            ${icon("location_on")}
            <strong>Khu nhà ở xã hội Định Hòa</strong>
            <span>${lockerBlock.name} • Đang hoạt động</span>
          </div>
          <div class="map-pin future one">${icon("add_location")} Điểm tủ tương lai</div>
          <div class="map-pin future two">${icon("add_location")} Đang cập nhật</div>
        </div>
        <button class="primary-btn" data-action="continueAfterLocker" type="button">Tiếp tục với block tủ này</button>
      </section>
    </div>
  `;
}

function roleSelect() {
  return `
    <section class="hero-card button-stack">
      ${backButton("lockerLocation", "Quay về vị trí tủ")}
      ${titleBlock("Chọn vai trò", "Bạn đang thao tác với tư cách nào?")}
      ${lockerSummary()}
      <div class="role-grid">
        <button class="role-card" data-action="chooseResident" type="button">
          <span class="role-icon">${icon("home")}</span>
          <span><strong>Tôi là Cư dân</strong><small class="muted">Nhận hàng của mình hoặc nhận hộ</small></span>
        </button>
        <button class="role-card" data-action="chooseShipper" type="button">
          <span class="role-icon">${icon("local_shipping")}</span>
          <span><strong>Tôi là Shipper</strong><small class="muted">Gửi hàng vào tủ và nhận thưởng</small></span>
        </button>
      </div>
    </section>
  `;
}

function login() {
  const roleLabel = state.role === "shipper" ? "Shipper" : "Cư dân";
  return `
    <section class="hero-card button-stack">
      ${backButton("lockerScan", "Chưa đăng nhập, quay về quét mã")}
      ${progress(2)}
      ${titleBlock("Đăng nhập Gmail", `Đăng nhập cho vai trò ${roleLabel}`)}
      <div class="status-timeline">
        <div class="done">${icon("task_alt")}<strong>Đã chọn ${roleLabel}</strong></div>
        <div class="current">${icon("mail")}<strong>Chờ xác thực Gmail</strong></div>
      </div>
      <button class="primary-btn" data-action="googleLogin" type="button">${icon("mail")} Đăng nhập bằng Gmail</button>
      <div class="demo-account-grid">
        ${demoAccounts.map((account) => `
          <button class="secondary-btn demo-account-btn" data-action="demoLogin" data-account="${account.id}" type="button">
            ${icon("person")}
            <span><strong>${account.name}</strong><small>${account.email}</small></span>
          </button>
        `).join("")}
      </div>
      <button class="secondary-btn" data-route="roleSelect" type="button">Đổi vai trò</button>
    </section>
  `;
}

function home() {
  if (!state.lockerScanned) return lockerScan();
  if (!state.user && state.role) return lockerScan();
  if (!state.role) return roleSelect();
  state.currentStep = 3;
  return state.role === "shipper" ? shipperDashboard() : residentDashboard();
}

function residentDashboard() {
  return `
    <div class="page">
      <section class="dashboard-hero">
        <div>
          <span class="eyebrow">Cư dân</span>
          <h1>Xin chào, ${state.residentProfile.name}</h1>
          <p class="lead">Bạn có <strong>2 đơn</strong> đang chờ nhận tại ${lockerBlock.name}.</p>
          <p class="muted">${state.residentProfile.address}</p>
        </div>
        <img src="./assets/green-locker.png" alt="Tủ khóa thông minh SmartLocker" />
      </section>
      <section class="action-panel">
        <div>
          <h2>Nhận hàng tại ${lockerBlock.name}</h2>
          <p class="muted">Danh sách chỉ hiển thị đơn đang nằm trong block tủ đã quét.</p>
        </div>
        <div class="choice-grid">
          <button class="primary-btn tall-btn" data-route="receiverOrdersScreen" type="button">${icon("inventory_2")} Lấy hàng của tôi</button>
          <button class="secondary-btn tall-btn" data-route="receiverHelper" type="button">${icon("group")} Nhận hộ</button>
        </div>
      </section>
      <section class="card button-stack">
        ${sectionHeader("Đơn đang chờ nhận", "Thông tin đơn hàng trong block tủ ở vị trí đã quét.")}
        <div class="list-stack">${receiverOrders.map(orderCard).join("")}</div>
      </section>
    </div>
  `;
}

function shipperDashboard() {
  return `
    <div class="page">
      <section class="dashboard-hero shipper">
        <div>
          <span class="eyebrow">Shipper - Đã duyệt</span>
          <h1>Giao hàng tại ${lockerBlock.name}</h1>
          <p class="lead">Số dư hiện tại: <strong>${formatMoney(state.shipperBalance)}</strong></p>
          <p class="muted">${state.shipperProfile.company} • ${state.shipperProfile.phone}</p>
        </div>
        <img src="./assets/green-locker.png" alt="Tủ khóa thông minh SmartLocker" />
      </section>
      <section class="action-panel">
        <div>
          <h2>Bắt đầu gửi hàng</h2>
        </div>
        <div class="home-action-stack">
          <button class="primary-btn parcel-scan-cta" data-route="shipperParcelScan" type="button">${icon("barcode_scanner")} Quét mã đơn hàng</button>
          <button class="secondary-btn" data-route="orders" type="button">${icon("list_alt")} Đơn đang xử lý</button>
        </div>
      </section>
      <section class="metric-grid">
        ${metric("Cần giao", "12", "inventory_2")}
        ${metric("Đã hoàn thành", "45", "task_alt")}
        ${metric("Chưa thanh toán", "1", "payments")}
        ${metric("Số dư", formatMoney(state.shipperBalance), "account_balance_wallet")}
      </section>
    </div>
  `;
}

function residentProfileSetup() {
  state.currentStep = 2;
  return `
    <section class="hero-card button-stack">
      ${backButton("roleSelect", "Đổi vai trò")}
      ${progress(3)}
      ${titleBlock("Thông tin người nhận", "Thiết lập tài khoản nhận hàng")}
      <div class="form-stack">
        ${field("Họ tên người nhận", "residentName", state.residentProfile.name)}
        ${field("Số điện thoại", "residentPhone", state.residentProfile.phone)}
        ${field("Địa chỉ căn hộ", "residentAddress", state.residentProfile.address)}
        ${field("Ghi chú nhận hàng", "residentNote", state.residentProfile.defaultNote)}
      </div>
      <button class="primary-btn" data-action="saveResidentProfile" type="button">Lưu và xem đơn cần nhận</button>
    </section>
  `;
}

function receiverOrdersScreen() {
  state.currentStep = 3;
  return `
    <section class="hero-card button-stack">
      ${backButton("home", "Quay về trang chủ")}
      ${progress(4)}
      ${titleBlock("Danh sách hàng cần nhận", `Đơn trong ${lockerBlock.name}`, "Chọn đơn của bạn để mở đúng ngăn tủ.")}
      <div class="list-stack">${receiverOrders.map(orderCard).join("")}</div>
      <button class="secondary-btn" data-route="receiverHelper" type="button">${icon("group")} Nhận hộ bằng số điện thoại và OTP</button>
    </section>
  `;
}

function receiverHelper() {
  state.currentStep = 3;
  return `
    <section class="hero-card button-stack">
      ${backButton("receiverOrdersScreen", "Quay về đơn của tôi")}
      ${progress(4)}
      ${titleBlock("Nhận hộ", "Nhập số điện thoại và OTP", "OTP được gửi đến số điện thoại của người nhận hàng. Sau khi xác thực, hệ thống sẽ hiện thông tin người được nhận hộ.")}
      <div class="form-stack">
        ${field("Số điện thoại người nhận", "helperPhone", "0912345678")}
        ${field("Mã OTP từ số điện thoại đó", "helperOtp", "4821")}
      </div>
      <button class="primary-btn" data-action="verifyHelper" type="button">Xác thực nhận hộ</button>
      <button class="secondary-btn" data-route="receiverOrdersScreen" type="button">Quay lại đơn của tôi</button>
    </section>
  `;
}

function receiverHelperInfo() {
  state.currentStep = 4;
  const helper = helperOrders[0];
  return `
    <section class="hero-card button-stack">
      ${backButton("receiverHelper", "Quay về xác thực nhận hộ")}
      ${progress(5)}
      ${titleBlock("Thông tin nhận hộ", helper.receiver, "Thông tin được xác thực từ số điện thoại và OTP.")}
      <div class="profile-card">
        <div class="avatar large">K</div>
        <div>
          <strong>${helper.receiver}</strong>
          <p class="muted">${helper.phone}</p>
          <p class="muted">Trạng thái: ${helper.status}</p>
        </div>
      </div>
      <div class="form-stack">
        ${field("Mã đơn hàng cần lấy hộ", "helperOrderCode", helper.id)}
      </div>
      <button class="primary-btn" data-action="selectHelperOrder" data-order="${helper.id}" type="button">Mở đơn nhận hộ</button>
    </section>
  `;
}

function receiverProcess() {
  state.currentStep = 4;
  const order = findSelectedOrder();
  return `
    <section class="hero-card button-stack">
      ${backButton("receiverOrdersScreen", "Quay về danh sách đơn")}
      ${progress(5)}
      ${titleBlock("Đang xử lý nhận hàng", `Ngăn ${order.locker} đã mở`, "Vui lòng lấy hàng ra khỏi tủ rồi đóng cửa lại.")}
      ${statusTimeline([
        ["done", "Xác thực đơn hàng"],
        ["done", "Gửi lệnh mở tủ"],
        ["current", "Chờ bạn lấy hàng và đóng cửa"],
        ["todo", "Cập nhật trạng thái"],
      ])}
      <div class="system-wait-card">
        <span class="mini-spinner" aria-hidden="true"></span>
        <div>
          <strong>Hệ thống tự chuyển bước khi cửa đóng</strong>
          <p class="muted">Lấy hàng ra rồi đóng cửa tủ.</p>
        </div>
      </div>
    </section>
  `;
}

function receiverClose() {
  state.currentStep = 5;
  const order = findSelectedOrder();
  return `
    <section class="hero-card button-stack">
      ${backButton("receiverProcess", "Quay lại bước lấy hàng")}
      ${progress(6)}
      ${titleBlock("Đóng cửa tủ", "Cửa tủ đang mở", `Vui lòng đóng cửa ngăn ${order.locker} để hoàn tất nhận hàng.`)}
      <div class="door-state warning">${icon("door_open")} Cửa ngăn ${order.locker} đang mở</div>
      <button class="primary-btn" data-route="receiverDoorCheck" type="button">${icon("door_front")} Tôi đã đóng cửa</button>
    </section>
  `;
}

function receiverDoorCheck() {
  state.currentStep = 5;
  if (state.doorAttempt === 0) {
    return alertScreen(6, 7, "Cửa tủ chưa đóng", "Hãy đóng cửa tủ để hoàn tất nhận hàng.", "receiverDoorRetry");
  }
  return `
    <section class="hero-card button-stack">
      ${progress(6)}
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
  state.currentStep = 6;
  return successScreen(7, 7, "Nhận hàng thành công", `${state.selectedOrderId} đã được cập nhật: Đã lấy hàng.`, "Về trang chủ", "home");
}

function shipperProfileSetup() {
  state.currentStep = 2;
  return `
    <section class="hero-card button-stack">
      ${backButton("roleSelect", "Đổi vai trò")}
      ${progress(3)}
      ${titleBlock("Thông tin shipper", "Thiết lập tài khoản giao hàng")}
      <div class="form-stack">
        ${field("Họ tên shipper", "shipperName", "Nhập họ tên shipper")}
        ${field("Số điện thoại", "shipperPhone", "Nhập số điện thoại")}
        ${selectField("Đơn vị giao hàng", "shipperCompany", deliveryApps, "Chọn đơn vị giao hàng")}
        ${bankField("Ngân hàng", "shipperBankName", bankOptions, "Nhập hoặc chọn ngân hàng")}
        ${field("Tên chủ tài khoản", "shipperBankAccountOwner", "Nhập tên chủ tài khoản")}
        ${field("Số tài khoản nhận COD", "shipperBankAccount", "Nhập số tài khoản nhận COD")}
      </div>
      <button class="primary-btn" data-action="saveShipperProfile" type="button">Lưu và quét đơn hàng</button>
    </section>
  `;
}

function shipperParcelScan() {
  state.currentStep = 3;
  return `
    <section class="hero-card button-stack">
      ${backButton("home", "Quay về trang chủ")}
      ${progress(4)}
      ${titleBlock("Quét mã đơn hàng", "Đưa mã vận đơn vào khung quét")}
      <div class="camera-card">
        <div class="scan-frame">
          <span class="corner-a"></span><span class="corner-b"></span>
          ${icon("barcode_scanner")}
        </div>
      </div>
      <div class="choice-grid">
        <button class="secondary-btn" data-action="manualParcel" type="button">${icon("keyboard")} Nhập mã đơn</button>
        <button class="primary-btn" data-route="shipperParcelDetail" type="button">${icon("barcode_scanner")} Quét xong</button>
      </div>
    </section>
  `;
}

function shipperParcelDetail() {
  state.currentStep = 3;
  return `
    <section class="hero-card button-stack">
      ${backButton("shipperParcelScan", "Quay lại quét đơn")}
      ${progress(4)}
      ${titleBlock("Thông tin người nhận", state.draft.receiverName)}
      <div class="notice-tab">${icon("info")}<strong>Shipper kiểm tra thông tin trước khi xác nhận trạng thái thanh toán.</strong></div>
      <div class="profile-card">
        <div class="avatar large">A</div>
        <div>
          <strong>${state.draft.receiverName}</strong>
          <p class="muted">${state.draft.receiverPhone}</p>
          <p class="muted">${state.draft.receiverAddress}</p>
        </div>
      </div>
      <div class="metric-row"><span>Mã đơn hàng</span><strong>${state.draft.parcelCode}</strong></div>
      <div class="choice-grid">
        <button class="primary-btn" data-action="paymentPaid" type="button">Đã thanh toán</button>
        <button class="secondary-btn" data-action="paymentUnpaid" type="button">Chưa thanh toán</button>
      </div>
    </section>
  `;
}

function shipperPayment() {
  state.currentStep = 4;
  return `
    <section class="hero-card button-stack">
      ${backButton("shipperParcelDetail", "Quay về thông tin người nhận")}
      ${progress(5)}
      ${titleBlock("Thanh toán", "Đơn hàng đã thanh toán chưa?")}
      <div class="choice-grid">
        <button class="primary-btn" data-action="paymentPaid" type="button">Đã thanh toán</button>
        <button class="secondary-btn" data-action="paymentUnpaid" type="button">Chưa thanh toán</button>
      </div>
    </section>
  `;
}

function shipperPaymentWaiting() {
  state.currentStep = 4;
  return `
    <section class="hero-card button-stack">
      ${backButton("shipperPayment", "Quay về kiểm tra thanh toán")}
      ${progress(5)}
      ${titleBlock("Chờ người nhận thanh toán", "Đã gửi thông báo thanh toán", "Người nhận nhận được mã QR và số tài khoản của shipper. Sau 3 phút có thể hủy giao đơn.")}
      <div class="payment-card">
        <div class="fake-qr">${icon("qr_code_2")}</div>
        <div>
          <strong>${state.shipperProfile.bankName || "Ngân hàng nhận COD"}</strong>
          <p class="muted">Số tài khoản: ${state.shipperProfile.bankAccount || "Chưa nhập"}</p>
          <p class="muted">Chủ tài khoản: ${state.shipperProfile.bankAccountOwner || "Chưa nhập"}</p>
          <p class="muted">Nội dung: ${state.draft.parcelCode}</p>
        </div>
      </div>
      <div class="status-timeline">
        <div class="done">${icon("task_alt")}<strong>Đã thông báo cho người nhận</strong></div>
        <div class="current payment-loading-row">
          ${state.paymentWaitExpired ? icon("hourglass_disabled") : `<span class="mini-spinner" aria-hidden="true"></span>`}
          <strong>${state.paymentWaitExpired ? "Đã quá 3 phút" : "Đang chờ thanh toán trong 3 phút"}</strong>
        </div>
        ${!state.paymentWaitExpired ? `
          <div class="waiting-copy" aria-live="polite">
            <span>Đang kiểm tra trạng thái thanh toán...</span>
            <span>Giữ kết nối để nhận phản hồi mới nhất...</span>
            <span>Có thể gọi người nhận nếu cần xác nhận nhanh.</span>
          </div>
        ` : ""}
      </div>
      <div class="choice-grid">
        <button class="primary-btn" data-action="receiverPays" type="button">Người nhận đã thanh toán</button>
        <button class="secondary-btn" data-action="callReceiver" type="button">${icon("call")} Gọi người nhận</button>
      </div>
      ${state.paymentWaitExpired ? `<button class="danger-btn" data-route="shipperCancelled" type="button">Hủy giao đơn hàng</button>` : `<button class="danger-btn muted-action" data-action="expirePaymentWait" type="button">Mô phỏng hết 3 phút</button>`}
    </section>
  `;
}

function shipperCancelled() {
  state.currentStep = 4;
  return successScreen(5, 8, "Đơn hàng chuyển vào mục chưa thanh toán", "Hệ thống đã cập nhật cho shipper và người nhận, đồng thời gửi thông báo hủy giao đơn.", "Quay về trang chủ", "home", "warning");
}

function shipperChooseCompartment() {
  state.currentStep = 5;
  // Gộp tất cả các ngăn tủ từ mọi kích thước (Nhỏ, Vừa, Lớn) thành một danh sách
  const allSlotsHtml = Object.entries(compartmentSlots).map(([size, slots]) => {
    return slots.map(slot => 
      `<button class="order-card" data-action="chooseSlot" data-slot="${slot}" type="button">
        <span class="order-icon">${icon("inventory")}</span>
        <span><strong>Ngăn ${slot}</strong><small class="muted">Còn trống • ${size}</small></span>
        ${icon("chevron_right")}
      </button>`
    ).join("");
  }).join("");

  return `
    <section class="hero-card button-stack">
      ${backButton("shipperPayment", "Quay về thanh toán")}
      ${progress(6)}
      ${titleBlock("Chọn ngăn tủ", "Tất cả các ngăn còn trống", "Chọn trực tiếp một ngăn tủ phù hợp với kiện hàng của bạn.")}
      <div class="list-stack">
        ${allSlotsHtml}
      </div>
    </section>
  `;
}

function shipperDropoff() {
  state.currentStep = 6;
  return `
    <section class="hero-card button-stack">
      ${backButton("shipperChooseCompartment", "Chọn lại ngăn")}
      ${progress(7)}
      ${titleBlock("Bỏ hàng vào tủ", `Ngăn ${state.draft.compartment} đã mở`, "Chụp ảnh kiện hàng trong ngăn để xác thực đã bỏ hàng.")}
      <div class="proof-card">
        <span>${icon("photo_camera")}</span>
        <div>
          <strong>Mã đơn: ${state.draft.parcelCode}</strong>
          <p class="muted">Ngăn ${state.draft.compartment} • Người nhận: ${state.draft.receiverName}</p>
          <p class="muted">${state.draft.proofReady ? "Đã có ảnh minh chứng" : "Chưa có ảnh minh chứng"}</p>
        </div>
      </div>
      <div class="choice-grid">
        <button class="secondary-btn" data-action="openProofCamera" type="button">${icon("photo_camera")} Chụp ảnh minh chứng</button>
        ${state.draft.proofReady && state.draft.proofUploaded ? `<button class="primary-btn" data-route="shipperClose" type="button">Xác nhận đã bỏ hàng</button>` : `<button class="primary-btn" type="button" disabled>Xác nhận đã bỏ hàng</button>`}
      </div>
    </section>
  `;
}

function shipperProof() {
  state.currentStep = 6;
  return `
    <section class="hero-card button-stack">
      ${backButton("shipperChooseCompartment", "Chọn lại ngăn")}
      ${progress(7)}
      ${titleBlock("Chụp ảnh minh chứng", `Ngăn ${state.draft.compartment}`)}
      <div class="capture-card ${state.draft.proofCameraOpen ? "camera-live" : ""}">
        <div class="capture-frame">
          ${state.draft.proofReady ? icon("check_circle") : icon("photo_camera")}
          ${state.draft.proofCameraOpen && !state.draft.proofReady ? `<span class="scan-line"></span>` : ""}
        </div>
        <strong>${state.draft.proofReady ? "Đã chụp ảnh kiện hàng" : "Màn hình chụp ảnh kiện hàng"}</strong>
        <p class="muted">${state.draft.proofReady ? "Tiếp tục tải ảnh lên để lưu minh chứng." : "Đặt kiện hàng trong khung rồi bấm chụp ảnh."}</p>
      </div>
      <div class="choice-grid">
        <button class="secondary-btn" data-action="captureProof" type="button">${icon("photo_camera")} Chụp ảnh</button>
        ${state.draft.proofReady ? `<button class="secondary-btn" data-action="uploadProof" type="button">${icon("upload")} Tải ảnh lên</button>` : `<button class="secondary-btn" type="button" disabled>${icon("upload")} Tải ảnh lên</button>`}
      </div>
      ${state.draft.proofReady && state.draft.proofUploaded ? `<button class="primary-btn" data-route="shipperClose" type="button">Xác nhận đã bỏ hàng</button>` : `<button class="primary-btn" type="button" disabled>Xác nhận đã bỏ hàng</button>`}
    </section>
  `;
}

function shipperClose() {
  state.currentStep = 7;
  return `
    <section class="hero-card button-stack">
      ${backButton("shipperProof", "Quay lại xác minh bỏ hàng")}
      ${progress(8)}
      ${titleBlock("Đang kiểm tra cửa tủ", `Đang chờ cửa ngăn ${state.draft.compartment} đóng`)}
      <div class="door-state warning">${icon("door_open")} Cửa ngăn ${state.draft.compartment} đang mở</div>
      <div class="system-wait-card">
        <span class="mini-spinner" aria-hidden="true"></span>
        <div>
          <strong>Hệ thống tự xác nhận khi cửa đóng</strong>
          <p class="muted">Vui lòng đóng cửa tủ để hoàn tất giao hàng.</p>
        </div>
      </div>
    </section>
  `;
}

function shipperDoorCheck() {
  state.currentStep = 7;
  if (state.doorAttempt === 0) {
    return alertScreen(7, 8, "Cửa tủ chưa đóng", "Vui lòng đóng cửa lại để gửi thông báo giao hàng.", "shipperDoorRetry");
  }
  return `
    <section class="hero-card button-stack">
      ${backButton("shipperClose", "Quay lại đóng tủ")}
      ${progress(8)}
      ${titleBlock("Đang cập nhật giao hàng", "Cửa tủ đã đóng")}
      ${statusTimeline([
        ["done", "Xác nhận cửa tủ đã đóng"],
        ["done", "Gửi thông báo và mã mở tủ cho người nhận"],
        ["done", "Cập nhật đơn hàng: Đã giao vào tủ"],
        ["done", `Cộng 700đ vào tài khoản shipper: ${formatMoney(state.shipperBalance + 700)}`],
      ])}
      <button class="primary-btn" data-action="completeShipperDelivery" type="button">Hoàn tất giao hàng</button>
    </section>
  `;
}

function shipperDone() {
  state.currentStep = 7;
  return `
    <section class="hero-card button-stack">
      ${progress(8)}
      ${titleBlock("Hoàn tất giao hàng", "Cửa tủ đã đóng")}
      <div class="status-card">
        <div class="success-icon">${icon("task_alt")}</div>
        <h2>Giao hàng thành công</h2>
        <p class="lead">Bạn đã nhận 700đ. Số dư hiện tại: ${formatMoney(state.shipperBalance)}.</p>
      </div>
      <div class="choice-grid">
        <button class="primary-btn" data-route="shipperParcelScan" type="button">Giao đơn tiếp theo</button>
        <button class="secondary-btn" data-route="history" type="button">Xem lịch sử</button>
      </div>
    </section>
  `;
}

function orders() {
  return `
    <section class="hero-card button-stack">
      ${titleBlock(state.role === "shipper" ? "Đơn giao" : "Đơn hàng", state.role === "shipper" ? "Đơn đang xử lý" : "Đơn đang chờ nhận")}
      <div class="list-stack">
        ${state.role === "shipper"
          ? shipperTaskList()
          : receiverOrders.map(orderCard).join("")}
      </div>
    </section>
  `;
}

function shipperTaskList() {
  return `
    <article class="task-card">
      <span class="order-icon">${icon("payments")}</span>
      <div>
        <strong>${state.draft.parcelCode}</strong>
        <p class="muted">${state.paymentWaitExpired ? "Chưa thanh toán • Có thể hủy giao" : "Đang xử lý"}</p>
      </div>
      <button class="mini-btn" data-route="shipperPayment" type="button">Tiếp tục</button>
    </article>
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
  if (!state.user) {
    return `
      <section class="hero-card button-stack">
        ${titleBlock("Tài khoản", "Chưa đăng nhập", "Bạn cần quét mã block tủ, chọn vai trò rồi đăng nhập bằng Gmail để dùng tài khoản.")}
        <div class="status-timeline">
          <div class="${state.lockerScanned ? "done" : "current"}">${icon(state.lockerScanned ? "task_alt" : "qr_code_scanner")}<strong>${state.lockerScanned ? "Đã quét block tủ" : "Chưa quét block tủ"}</strong></div>
          <div class="${state.role ? "done" : "todo"}">${icon(state.role ? "task_alt" : "radio_button_unchecked")}<strong>${state.role ? "Đã chọn vai trò" : "Chưa chọn vai trò"}</strong></div>
          <div class="todo">${icon("mail")}<strong>Chưa đăng nhập Gmail</strong></div>
        </div>
        <div class="choice-grid">
          <button class="primary-btn" data-route="lockerScan" type="button">Quét mã block tủ</button>
          ${state.lockerScanned ? `<button class="secondary-btn" data-route="roleSelect" type="button">Chọn vai trò</button>` : ""}
        </div>
      </section>
    `;
  }
  const isShipper = state.role === "shipper";
  const profile = isShipper ? state.shipperProfile : state.residentProfile;
  return `
    <section class="hero-card button-stack">
      ${titleBlock("Tài khoản", profile.name || state.user?.name || "Khách demo", hasSupabase ? "Supabase đã cấu hình." : "Đang chạy demo trên máy.")}
      <div class="profile-card">
        <div class="avatar large">${isShipper ? "S" : "A"}</div>
        <div>
          <strong>${profile.name}</strong>
          <p class="muted">${state.user?.email || currentEmail()}</p>
          <p class="muted">${isShipper ? profile.company : profile.address}</p>
        </div>
      </div>
      <div class="metric-row"><span>Vai trò</span><strong>${isShipper ? "Shipper" : "Cư dân"}</strong></div>
      <div class="metric-row"><span>Block tủ hiện tại</span><strong>${lockerBlock.name}</strong></div>
      ${isShipper ? `<div class="metric-row"><span>Số dư shipper</span><strong>${formatMoney(state.shipperBalance)}</strong></div>` : ""}
      <button class="secondary-btn" data-action="switchRole" type="button">Đổi vai trò demo</button>
      <button class="secondary-btn" data-action="resetStart" type="button">Quét lại block tủ</button>
      <button class="danger-btn logout-btn" data-action="logout" type="button">${icon("logout")} Đăng xuất</button>
    </section>
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

function statusTimeline(items) {
  return `
    <div class="status-timeline">
      ${items.map(([type, text]) => `<div class="${type}"><span>${type === "done" ? icon("task_alt") : type === "current" ? icon("pending") : icon("radio_button_unchecked")}</span><strong>${text}</strong></div>`).join("")}
    </div>
  `;
}

function field(label, key, placeholder) {
  const value = readFieldValue(key);
  return `<div class="field"><label>${label}</label><input data-field="${key}" value="${escapeHtml(value)}" placeholder="${placeholder}" /></div>`;
}

function selectField(label, key, options, placeholder) {
  const value = readFieldValue(key);
  return `
    <div class="field">
      <label>${label}</label>
      <select data-field="${key}">
        <option value="">${placeholder}</option>
        ${options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${option}</option>`).join("")}
      </select>
    </div>
  `;
}

function bankField(label, key, options, placeholder) {
  const value = readFieldValue(key);
  return `
    <div class="field">
      <label>${label}</label>
      <input data-field="${key}" value="${escapeHtml(value)}" placeholder="${placeholder}" list="bank-options" autocomplete="off" />
      <datalist id="bank-options">
        ${options.map((option) => `<option value="${escapeHtml(option)}"></option>`).join("")}
      </datalist>
    </div>
  `;
}

function readFieldValue(key) {
  const profileMap = {
    residentName: state.residentProfile.name,
    residentPhone: state.residentProfile.phone,
    residentAddress: state.residentProfile.address,
    residentNote: state.residentProfile.defaultNote,
    shipperName: state.shipperProfile.name,
    shipperPhone: state.shipperProfile.phone,
    shipperCompany: state.shipperProfile.company,
    shipperBankAccount: state.shipperProfile.bankAccount,
    shipperBankAccountOwner: state.shipperProfile.bankAccountOwner,
    shipperBankName: state.shipperProfile.bankName,
    helperOrderCode: state.selectedHelperOrderId || helperOrders[0].id,
  };
  if (key in profileMap) return profileMap[key];
  if (key in state.draft) return state.draft[key];
  return state[key] || "";
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

function findSelectedOrder() {
  return receiverOrders.find((item) => item.id === state.selectedOrderId) || helperOrders.find((item) => item.id === state.selectedHelperOrderId) || receiverOrders[0];
}

function formatMoney(value) {
  return `${Number(value).toLocaleString("vi-VN")}đ`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function startPaymentCountdown() {
  window.clearTimeout(window.smartlockerPaymentTimer);
  window.smartlockerPaymentTimer = window.setTimeout(() => {
    if (state.route === "shipperPaymentWaiting" && !state.paymentWaitExpired) {
      state.paymentWaitExpired = true;
      render();
    }
  }, 180000);
}

async function handleAction(action, button) {
  if (action === "quickScan" || action === "resetStart") {
    state.lockerScanned = false;
    state.role = "";
    state.user = null;
    localStorage.removeItem("smartlocker.pendingRole");
    setRoute("lockerScan");
  }
  if (action === "logout") {
    if (hasSupabase) await supabaseClient.auth.signOut();
    state.user = null;
    state.role = "";
    state.lockerScanned = false;
    localStorage.removeItem("smartlocker.pendingRole");
    localStorage.removeItem("smartlocker.role");
    localStorage.setItem("smartlocker.lockerScanned", "false");
    showToast("Đã đăng xuất");
    setRoute("lockerScan");
  }
  if (action === "manualLocker") showToast("Demo: đã nhập mã block tủ BLOCK-DH-001");
  if (action === "scanLockerBlock") {
    if (state.scanningLocker) return;
    state.scanningLocker = true;
    render();
    window.setTimeout(() => {
      state.scanningLocker = false;
      state.lockerScanned = true;
      showToast("Đã nhận diện block tủ B-04");
      setRoute("lockerLocation");
    }, 1600);
  }
  if (action === "continueAfterLocker") {
    if (state.user && restoreRoleForEmail()) setRoute(state.role === "shipper" ? "home" : "home");
    else setRoute("roleSelect");
  }
  if (action === "chooseResident") {
    state.role = "resident";
    if (state.user) {
      saveRoleForEmail();
      setRoute("residentProfileSetup");
    } else {
      setRoute("login");
    }
  }
  if (action === "chooseShipper") {
    state.role = "shipper";
    if (state.user) {
      saveRoleForEmail();
      setRoute("shipperProfileSetup");
    } else {
      setRoute("login");
    }
  }
  if (action === "googleLogin") await signInWithGoogle();
  if (action === "demoLogin") signInWithDemo(button.dataset.account);
  if (action === "saveResidentProfile") {
    saveRoleForEmail();
    setRoute("receiverOrdersScreen");
  }
  if (action === "saveShipperProfile") {
    saveRoleForEmail();
    setRoute("shipperParcelScan");
  }
  //Trigger MQTT customer
  if (action === "selectReceiverOrder") {
    state.selectedOrderId = button.dataset.order;
    state.selectedHelperOrderId = "";
    sendUnlockCommand();
    setRoute("receiverProcess");
  }
  if (action === "verifyHelper") {
    if (!state.helperPhone || !state.helperOtp) showToast("Vui lòng nhập số điện thoại và OTP");
    else setRoute("receiverHelperInfo");
  }
  if (action === "selectHelperOrder") {
    state.selectedHelperOrderId = button.dataset.order;
    state.selectedOrderId = button.dataset.order;
    setRoute("receiverProcess");
  }
  if (action === "receiverDoorRetry") {
    state.doorAttempt = 1;
    setRoute("receiverDoorCheck");
  }
  if (action === "manualParcel") showToast("Demo: đã nhập mã đơn DH118");
  if (action === "paymentPaid" || action === "receiverPays") {
    state.paymentWaitExpired = false;
    setRoute("shipperChooseCompartment");
  }
  if (action === "paymentUnpaid") {
    state.paymentWaitExpired = false;
    setRoute("shipperPaymentWaiting");
  }
  if (action === "callReceiver") showToast(`Đang gọi ${state.draft.receiverPhone}`);
  if (action === "expirePaymentWait") {
    state.paymentWaitExpired = true;
    render();
  }
  if (action === "chooseSize") {
    state.draft.size = button.dataset.size;
    render();
  }
  //MQTT trigger for shipper
  if (action === "chooseSlot") {
    state.draft.compartment = button.dataset.slot;
    sendUnlockCommand();
    state.draft.proofReady = false;
    state.draft.proofCameraOpen = false;
    state.draft.proofUploaded = false;
    setRoute("shipperProof");
  }
  if (action === "openProofCamera") {
    state.draft.proofCameraOpen = true;
    setRoute("shipperProof");
  }
  if (action === "captureProof") {
    state.draft.proofCameraOpen = true;
    state.draft.proofReady = true;
    showToast("Đã chụp ảnh minh chứng demo");
    render();
  }
  if (action === "uploadProof") {
    if (!state.draft.proofReady) {
      showToast("Vui lòng chụp ảnh trước khi tải lên");
      return;
    }
    state.draft.proofUploaded = true;
    showToast("Đã tải ảnh minh chứng lên");
    render();
  }
  if (action === "shipperDoorRetry") {
    state.doorAttempt = 1;
    setRoute("shipperDoorCheck");
  }
  if (action === "completeShipperDelivery") {
    completeShipperDelivery();
  }
  if (action === "switchRole") {
    state.role = state.role === "shipper" ? "resident" : "shipper";
    saveRoleForEmail();
    setRoute("roleSelect");
  }
}

function completeShipperDelivery() {
  state.shipperBalance += 700;
  state.history.unshift({ title: state.draft.parcelCode, status: `Đã giao thành công, cộng 700đ. Số dư: ${formatMoney(state.shipperBalance)}` });
  setRoute("shipperDone");
}

function signInWithDemo(accountId) {
  const intendedRole = state.role;
  const account = demoAccounts.find((item) => item.id === accountId) || demoAccounts[0];
  localStorage.setItem("smartlocker.pendingRole", intendedRole);
  state.user = { name: account.name, email: account.email };
  state.role = intendedRole;
  saveRoleForEmail();
  showToast(`Đã đăng nhập ${account.name}`);
  setRoute(intendedRole === "shipper" ? "shipperProfileSetup" : "residentProfileSetup");
}

async function signInWithGoogle() {
  const intendedRole = state.role;
  localStorage.setItem("smartlocker.pendingRole", intendedRole);
  if (!hasSupabase) {
    state.user = { name: intendedRole === "shipper" ? state.shipperProfile.name : state.residentProfile.name, email: "demo@smartlocker.vn" };
    state.role = intendedRole;
    saveRoleForEmail();
    setRoute(intendedRole === "shipper" ? "shipperProfileSetup" : "residentProfileSetup");
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

function updateField(event) {
  const fieldKey = event.target.dataset.field;
  if (!fieldKey) return;
  const value = event.target.value;
  const setters = {
    residentName: () => state.residentProfile.name = value,
    residentPhone: () => state.residentProfile.phone = value,
    residentAddress: () => state.residentProfile.address = value,
    residentNote: () => state.residentProfile.defaultNote = value,
    shipperName: () => state.shipperProfile.name = value,
    shipperPhone: () => state.shipperProfile.phone = value,
    shipperCompany: () => state.shipperProfile.company = value,
    shipperBankAccount: () => state.shipperProfile.bankAccount = value,
    shipperBankAccountOwner: () => state.shipperProfile.bankAccountOwner = value,
    shipperBankName: () => state.shipperProfile.bankName = value,
    helperOrderCode: () => state.selectedHelperOrderId = value,
  };
  if (setters[fieldKey]) setters[fieldKey]();
  else if (fieldKey in state.draft) state.draft[fieldKey] = value;
  else state[fieldKey] = value;
}

document.addEventListener("input", updateField);
document.addEventListener("change", updateField);

(async function init() {
  setupMQTT();
  if (hasSupabase) {
    const { data } = await supabaseClient.auth.getUser();
    if (data?.user) {
      state.user = {
        name: data.user.email?.split("@")[0] || "google_user",
        email: data.user.email,
      };
      const pendingRole = localStorage.getItem("smartlocker.pendingRole");
      if (pendingRole) {
        state.role = pendingRole;
        localStorage.removeItem("smartlocker.pendingRole");
        saveRoleForEmail();
        state.route = pendingRole === "shipper" ? "shipperProfileSetup" : "residentProfileSetup";
      } else if (restoreRoleForEmail()) {
        state.route = "lockerScan";
      }
    }
  }
  render();
})();
