const demoOrders = [
  {
    id: "SPX-150",
    shipper: "Shopee Express",
    receiver: "Binh Duong, Viet Nam",
    price: 150000,
    size: "M",
    compartment: "05",
    status: "ready",
    created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  {
    id: "NHT-884",
    shipper: "Người thân gửi",
    receiver: "Binh Duong, Viet Nam",
    price: 0,
    size: "S",
    compartment: "03",
    status: "pending",
    created_at: new Date(Date.now() - 62 * 60 * 1000).toISOString(),
  },
  {
    id: "LZD-420",
    shipper: "Lazada Logistics",
    receiver: "Binh Duong, Viet Nam",
    price: 99000,
    size: "L",
    compartment: "09",
    status: "ready",
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
    parcelCode: "435962506434",
    receiver: "Nguyễn Văn A",
    phone: "0957 684 876",
    amount: "150 000 VND",
    size: "M",
  },
  dropoffPhotoCaptured: false,
};

const config = window.SUPABASE_CONFIG || {};
const hasSupabase = Boolean(config.url && config.anonKey && window.supabase);
const supabaseClient = hasSupabase ? window.supabase.createClient(config.url, config.anonKey) : null;
const view = document.querySelector("#view");
const toast = document.querySelector("#toast");

function money(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0) + " VND";
}

function timeAgo(dateString) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(dateString).getTime()) / 60000));
  if (minutes < 60) return `${minutes} phút trước`;
  return `${Math.round(minutes / 60)} giờ trước`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function persistOrders() {
  localStorage.setItem("smartlocker.orders", JSON.stringify(state.orders));
}

function setRoute(route) {
  state.route = route;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.route === route);
  });
  render();
}

function selectedOrder() {
  return state.orders.find((order) => order.id === state.selectedOrderId) || state.orders[0];
}

function render() {
  const templates = {
    home: state.user ? dashboard : landing,
    orders,
    profile,
    login,
    detail,
    lockerStatus,
    receiveDone,
    shipperHome,
    scanLocker,
    parcelForm,
    scanParcel,
    chooseSize,
    shipperConfirm,
    shipperDone,
  };
  view.innerHTML = templates[state.route]();
  bindView();
}

function landing() {
  return `
    <div class="hero">
      <span class="eyebrow">PLATFORM</span>
      <h1>Hàng luôn tới. Không thất lạc.</h1>
      <p class="lead">Hệ sinh thái giao nhận an toàn đặt tại sảnh khu dân cư, giúp shipper giao nhanh và cư dân nhận chủ động 24/7.</p>
      <button class="primary" data-action="login">Đăng nhập để dùng ngay</button>
      <figure class="locker-visual">
        <img src="./assets/green-locker.png" alt="Tủ đồ thông minh màu xanh đặt tại sảnh chung cư" />
      </figure>
      <div class="row muted">
        <span>Nhanh chóng</span>
        <span>Bảo mật</span>
        <span>Tiện lợi</span>
      </div>
    </div>
  `;
}

function login() {
  return `
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="row">
          <h2>Đăng nhập</h2>
          <button class="ghost" data-action="closeLogin" type="button">x</button>
        </div>
        <div class="role-grid">
          <button class="role-card" data-role="resident" type="button">Bạn là cư dân</button>
          <button class="role-card" data-role="shipper" type="button">Bạn là shipper</button>
        </div>
        <button class="secondary" data-action="google" type="button">Đăng nhập bằng Gmail</button>
        <button class="primary" data-action="demoLogin" type="button">Dùng tài khoản demo</button>
        <p class="muted">Bản demo vẫn chạy nếu chưa cấu hình Supabase. Khi deploy thật, Gmail login dùng Supabase Auth.</p>
      </div>
    </div>
  `;
}

function dashboard() {
  if (state.role === "shipper") return shipperHome();
  const ready = state.orders.filter((order) => order.status === "ready").length;
  return `
    <div class="stack">
      <div class="toolbar">
        <span class="balance">Ví ${money(200000)}</span>
        <button class="secondary" data-action="refresh">Rút tiền</button>
      </div>
      <h2>Tủ đồ của tôi</h2>
      <h3>Hàng chờ lấy</h3>
      <div class="stack">
        ${state.orders.map(orderCard).join("")}
      </div>
      <div class="card row">
        <div>
          <strong>${ready} đơn sẵn sàng</strong>
          <p class="muted">Tủ đã xác thực bằng QR và mã đơn</p>
        </div>
        <button class="primary" data-action="scanReceive">Nhận hàng</button>
      </div>
    </div>
  `;
}

function orderCard(order) {
  const status = order.status === "ready" ? "Trong tủ - Chờ lấy" : "Đang xử lý";
  return `
    <button class="order-card" data-order="${order.id}" type="button">
      <span class="order-icon">${order.size}</span>
      <span class="order-meta">
        <strong>${order.shipper}</strong>
        <span>${order.id} • ${timeAgo(order.created_at)}</span>
        <span class="status ${order.status === "ready" ? "ready" : ""}">${status}</span>
      </span>
      <span>›</span>
    </button>
  `;
}

function orders() {
  return `
    <div class="stack">
      <div class="toolbar">
        <h2>Lịch sử đơn</h2>
        <button class="secondary" data-action="refresh">Làm mới</button>
      </div>
      ${state.orders.map(orderCard).join("")}
    </div>
  `;
}

function detail() {
  const order = selectedOrder();
  return `
    <div class="stack">
      <button class="ghost" data-route="home" type="button">‹ Tủ đồ của tôi</button>
      <h2>Chi tiết đơn</h2>
      <div class="detail-photo"></div>
      <div class="card stack">
        <h3>Đơn ${order.shipper} - Ngăn ${order.compartment}</h3>
        <div class="kv">
          <div><span>Tên hàng/COD</span><strong>${money(order.price)}</strong></div>
          <div><span>Mã nhận hàng</span><strong>${order.id}</strong></div>
          <div><span>Kích thước</span><strong>${order.size}</strong></div>
        </div>
      </div>
      <button class="primary" data-action="openLocker" type="button">Mở tủ lấy hàng</button>
    </div>
  `;
}

function lockerStatus() {
  const order = selectedOrder();
  return `
    <div class="locker-panel">
      <button class="ghost" data-route="detail" type="button">‹ Chi tiết đơn</button>
      <div class="locker-door">▯</div>
      <h2>Cửa số ${order.compartment} đã mở</h2>
      <p class="lead">Đã tự động thanh toán ${money(order.price)}. Vui lòng đóng chặt cửa sau khi lấy hàng.</p>
      <div class="alert">Hàng hư hại hoặc vấn đề? Liên hệ ban quản lý để được hỗ trợ.</div>
      <button class="primary" data-action="confirmReceive" type="button">Xác nhận nhận hàng</button>
    </div>
  `;
}

function receiveDone() {
  return `
    <div class="success-panel">
      <div class="checkmark">✓</div>
      <h2>Nhận hàng thành công</h2>
      <p class="lead">Đơn đã chuyển vào lịch sử. Cửa tủ đã được khóa lại sau xác nhận.</p>
      <button class="primary" data-route="home" type="button">Về tủ đồ của tôi</button>
    </div>
  `;
}

function shipperHome() {
  const completed = state.orders.filter((order) => order.status === "ready" || order.status === "received").length;
  return `
    <div class="stack shipper-dashboard">
      <div class="wallet-row">
        <span class="balance">Ví ${money(500000)}</span>
        <button class="secondary topup" data-action="refresh">+ Nạp tiền</button>
        <button class="secondary" data-action="refresh">Rút tiền</button>
      </div>
      <section class="overview">
        <h2>Tổng quan hôm nay</h2>
        <div class="stat-card todo"><span>Cần giao</span><strong>12</strong></div>
        <div class="stat-card done"><span>Đã hoàn thành</span><strong>${completed}</strong></div>
        <div class="stat-card error"><span>Đơn lỗi</span><strong>0</strong></div>
      </section>
      <div class="shipper-actions ${completed > 0 ? "two-actions" : ""}">
        <button class="qr-round" data-route="scanLocker" type="button"><span class="qr-icon">▦</span>Quét QR<br />trạm tủ</button>
        ${completed > 0 ? `<button class="continue-round" data-route="parcelForm" type="button">Tiếp tục<br />giao ở tủ<br />này</button>` : ""}
      </div>
    </div>
  `;
}

function scanLocker() {
  return `
    <div class="stack">
      <button class="ghost" data-route="home" type="button">‹ Giao hàng</button>
      <h2>Quét mã QR</h2>
      <div class="camera-box"></div>
      <button class="primary" data-route="parcelForm" type="button">Xác nhận</button>
    </div>
  `;
}

function parcelForm() {
  return `
    <div class="stack parcel-screen">
      <button class="ghost back-title" data-route="shipperHome" type="button">‹ Quét mã QR</button>
      <section class="locker-info">
        <strong>Mã tủ: A32</strong>
        <strong>Địa chỉ: nhà ở xã hội Định Hòa, Bình Dương, Việt Nam</strong>
      </section>
      <h2>Khai báo đơn hàng</h2>
      <form class="form" data-form="parcel">
        <label class="field-row">
          <span>Mã đơn hàng</span>
          <input name="parcelCode" value="${state.draft.parcelCode}" />
        </label>
        <label class="field-row">
          <span>Người nhận</span>
          <input name="receiver" value="${state.draft.receiver}" />
        </label>
        <label class="field-row">
          <span>Số điện thoại</span>
          <input name="phone" value="${state.draft.phone}" />
        </label>
        <label class="field-row">
          <span>Số tiền<br />cần thu</span>
          <input name="amount" inputmode="numeric" value="${state.draft.amount}" />
        </label>
        <button class="secondary scan-waybill" data-route="scanParcel" type="button">Quét mã vận đơn hàng</button>
        <button class="primary wide-submit" type="submit">Tiếp tục</button>
      </form>
    </div>
  `;
}

function scanParcel() {
  return `
    <div class="stack">
      <button class="ghost" data-route="parcelForm" type="button">‹ Khai báo đơn</button>
      <h2>Quét mã đơn hàng</h2>
      <div class="camera-box"></div>
      <button class="primary" data-route="parcelForm" type="button">Xác nhận mã</button>
    </div>
  `;
}

function chooseSize() {
  return `
    <div class="stack">
      <button class="ghost" data-route="parcelForm" type="button">‹ Khai báo đơn</button>
      <h2>Chọn ngăn</h2>
      <p class="lead" style="text-align:center">Chọn kích thước phù hợp</p>
      <div class="size-grid">
        <button class="size-card" data-size="S" type="button">[ S ]<br /><span>- Ngăn nhỏ -</span></button>
        <button class="size-card" data-size="M" type="button">[ M ]<br /><span>- Ngăn trung -</span></button>
        <button class="size-card" data-size="L" type="button">[ L ]<br /><span>- Ngăn to -</span></button>
      </div>
    </div>
  `;
}

function shipperConfirm() {
  const captured = state.dropoffPhotoCaptured;
  return `
    <div class="stack confirm-screen">
      <h2>Xác nhận</h2>
      <section class="dropoff-card ${captured ? "captured" : ""}">
        <div class="dropoff-status">${captured ? "ĐÃ LƯU ẢNH MINH CHỨNG" : "ĐANG MỞ: NGĂN M - SỐ 05"}</div>
        <div class="dropoff-photo"></div>
        ${captured ? "" : `
          <div class="dropoff-instruction">
            <p>Vui lòng cho hàng vào<br />và <strong>ĐÓNG CHẶT CỬA</strong></p>
            <button class="primary camera-action" data-action="captureDropoff" type="button">▣ Chụp ảnh xác nhận</button>
          </div>
        `}
      </section>
      ${captured ? `
        <section class="delivery-success">
          <div class="mini-check">✓</div>
          <h2>Giao hàng thành công!</h2>
          <p>Đã chụp ảnh minh chứng.<br />Tiền COD (+150.000đ)<br />đã được cộng vào ví.</p>
        </section>
      ` : ""}
      <button class="${captured ? "outline-primary" : "secondary"}" ${captured ? "" : "disabled"} data-action="confirmDropoff" type="button">Giao đơn tiếp theo</button>
    </div>
  `;
}

function shipperDone() {
  return `
    <div class="success-panel">
      <div class="checkmark">✓</div>
      <h2>Giao hàng thành công</h2>
      <p class="lead">Đã tạo thông báo cho cư dân và lưu lịch sử giao hàng.</p>
      <button class="primary" data-route="shipperHome" type="button">Giao đơn tiếp theo</button>
    </div>
  `;
}

function profile() {
  return `
    <div class="stack">
      <h2>Tài khoản</h2>
      <div class="card stack">
        <div class="row"><span class="muted">Vai trò</span><strong>${state.role === "shipper" ? "Shipper" : "Cư dân"}</strong></div>
        <div class="row"><span class="muted">Email</span><strong>${state.user?.email || "demo@smartlocker.vn"}</strong></div>
        <div class="row"><span class="muted">Backend</span><strong>${hasSupabase ? "Supabase" : "Demo local"}</strong></div>
      </div>
      <button class="secondary" data-action="switchRole" type="button">Đổi vai trò demo</button>
      <button class="danger" data-action="logout" type="button">Đăng xuất</button>
    </div>
  `;
}

function bindView() {
  view.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
  });

  view.querySelectorAll("[data-order]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedOrderId = button.dataset.order;
      setRoute("detail");
    });
  });

  view.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", () => {
      state.role = button.dataset.role;
      localStorage.setItem("smartlocker.role", state.role);
      showToast(`Đã chọn vai trò ${state.role === "shipper" ? "shipper" : "cư dân"}`);
    });
  });

  view.querySelectorAll("[data-size]").forEach((button) => {
    button.addEventListener("click", () => {
      state.draft.size = button.dataset.size;
      setRoute("shipperConfirm");
    });
  });

  const form = view.querySelector('[data-form="parcel"]');
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      state.draft.parcelCode = data.get("parcelCode") || state.draft.parcelCode;
      state.draft.receiver = data.get("receiver") || state.draft.receiver;
      state.draft.phone = data.get("phone") || state.draft.phone;
      state.draft.amount = data.get("amount") || "0";
      setRoute("chooseSize");
    });
  }

  view.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
}

async function handleAction(action) {
  if (action === "login") setRoute("login");
  if (action === "closeLogin") setRoute("home");
  if (action === "demoLogin") {
    state.user = { email: state.role === "shipper" ? "shipper@smartlocker.vn" : "resident@smartlocker.vn" };
    document.querySelector("#accountName").textContent = "demo_account";
    setRoute(state.role === "shipper" ? "shipperHome" : "home");
  }
  if (action === "google") await signInWithGoogle();
  if (action === "openLocker") setRoute("lockerStatus");
  if (action === "scanReceive") setRoute("detail");
  if (action === "confirmReceive") {
    const order = selectedOrder();
    order.status = "received";
    persistOrders();
    showToast("Đã xác nhận nhận hàng");
    setRoute("receiveDone");
  }
  if (action === "confirmDropoff") {
    await createParcel();
    state.dropoffPhotoCaptured = false;
    setRoute("shipperDone");
  }
  if (action === "captureDropoff") {
    state.dropoffPhotoCaptured = true;
    showToast("Đã lưu ảnh minh chứng");
    render();
  }
  if (action === "refresh") showToast("Dữ liệu đã được cập nhật");
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
    document.querySelector("#accountName").textContent = data.user.email?.split("@")[0] || "account";
  }
}

async function createParcel() {
  const id = state.draft.parcelCode || "SL-" + Math.floor(100 + Math.random() * 900);
  const order = {
    id,
    shipper: "SmartLocker Delivery",
    receiver: state.draft.receiver,
    price: Number(String(state.draft.amount).replace(/\D/g, "")) || 0,
    size: state.draft.size,
    compartment: "05",
    status: "ready",
    created_at: new Date().toISOString(),
  };
  state.orders = [order, ...state.orders];
  persistOrders();

  if (supabaseClient && state.user) {
    await supabaseClient.from("parcels").insert({
      code: order.id,
      receiver_label: order.receiver,
      cod_amount: order.price,
      size: order.size,
      compartment_code: order.compartment,
      status: "stored",
    });
  }
  showToast("Đã tạo đơn và gửi thông báo cho cư dân");
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setRoute(button.dataset.route));
});

hydrateAuth().finally(render);
