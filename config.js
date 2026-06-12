window.SMARTLOCKER_API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? `http://${window.location.hostname}:5000/api`
    : "https://alot-andrea-skins-cradle.trycloudflare.com/api";
