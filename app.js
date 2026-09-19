"use strict";

const API_BASE = "https://84mr6v30b7.execute-api.ap-northeast-2.amazonaws.com";
const OWNER_TOKENS_KEY = "dearlove.ownerTokens.v1";
const POLL_INTERVAL_MS = 6000;

/**
 * @typedef {{id:string,title:string|null,lat:number,lng:number,radius:number,
 *   placeLabel:string|null,createdAt:string,unlocked:boolean,distance:number}} LetterSummary
 */

const state = {
  /** @type {LetterSummary[]} */
  letters: [],
  /** @type {{lat:number,lng:number,accuracy:number}|null} */
  me: null,
  geoError: null,
};

// ---------- owner tokens (local "this is my letter" record, not the content) ----------

function loadOwnerTokens() {
  try {
    return JSON.parse(localStorage.getItem(OWNER_TOKENS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveOwnerToken(id, token) {
  try {
    const map = loadOwnerTokens();
    map[id] = token;
    localStorage.setItem(OWNER_TOKENS_KEY, JSON.stringify(map));
  } catch {
    /* best-effort only */
  }
}

function myOwnerTokenFor(id) {
  return loadOwnerTokens()[id] || null;
}

// ---------- API ----------

async function apiListLetters(lat, lng) {
  const res = await fetch(`${API_BASE}/letters?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error("list failed");
  const data = await res.json();
  return data.letters;
}

async function apiGetLetter(id, lat, lng) {
  const res = await fetch(`${API_BASE}/letters/${id}?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error("get failed");
  return res.json();
}

async function apiCreateLetter(payload) {
  const res = await fetch(`${API_BASE}/letters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "create failed");
  }
  return res.json();
}

async function apiDeleteLetter(id, ownerToken) {
  const res = await fetch(`${API_BASE}/letters/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerToken }),
  });
  return res.ok;
}

// ---------- helpers ----------

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// ---------- map ----------

let map, meMarker, meAccuracyCircle;
const letterMarkers = new Map(); // id -> L.Marker

function initMap() {
  map = L.map("map", { zoomControl: true }).setView([37.5665, 126.978], 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

function iconFor(emoji, extraClass = "") {
  return L.divIcon({
    className: "",
    html: `<div class="dl-marker ${extraClass}">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function updateMeMarker() {
  if (!state.me) return;
  const { lat, lng, accuracy } = state.me;
  if (!meMarker) {
    meMarker = L.marker([lat, lng], { icon: iconFor("🧭", "me"), zIndexOffset: 1000 }).addTo(map);
    meAccuracyCircle = L.circle([lat, lng], {
      radius: accuracy || 0,
      color: "#c9536b",
      fillColor: "#c9536b",
      fillOpacity: 0.08,
      weight: 1,
    }).addTo(map);
  } else {
    meMarker.setLatLng([lat, lng]);
    meAccuracyCircle.setLatLng([lat, lng]);
    meAccuracyCircle.setRadius(accuracy || 0);
  }
}

function renderMarkers() {
  const seen = new Set();
  for (const letter of state.letters) {
    seen.add(letter.id);
    const emoji = letter.unlocked ? "🔓" : "🔒";
    let marker = letterMarkers.get(letter.id);
    if (!marker) {
      marker = L.marker([letter.lat, letter.lng], { icon: iconFor(emoji) })
        .addTo(map)
        .on("click", () => openReadModal(letter.id));
      letterMarkers.set(letter.id, marker);
    } else {
      marker.setIcon(iconFor(emoji));
    }
    marker.bindTooltip(letter.title || "제목 없는 편지", { direction: "top", offset: [0, -14] });
  }
  for (const [id, marker] of letterMarkers) {
    if (!seen.has(id)) {
      map.removeLayer(marker);
      letterMarkers.delete(id);
    }
  }
}

// ---------- list panel ----------

function renderList() {
  const listEl = document.getElementById("letter-list");
  const countEl = document.getElementById("letter-count");
  countEl.textContent = `${state.letters.length}통`;

  const sorted = [...state.letters].sort((a, b) => a.distance - b.distance);

  listEl.innerHTML = "";
  for (const letter of sorted) {
    const li = document.createElement("li");
    li.className = "letter-card";
    li.addEventListener("click", () => openReadModal(letter.id));

    const statusIcon = document.createElement("span");
    statusIcon.className = "status-icon";
    statusIcon.textContent = letter.unlocked ? "🔓" : "🔒";

    const info = document.createElement("div");
    info.className = "info";

    const title = document.createElement("p");
    title.className = "title";
    title.textContent = letter.title || "제목 없는 편지";

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = `${formatDate(letter.createdAt)} · ${letter.placeLabel || "알 수 없는 장소"}`;

    const badge = document.createElement("span");
    badge.className = `dist-badge ${letter.unlocked ? "unlocked" : "locked"}`;
    badge.textContent = letter.unlocked
      ? "지금 열 수 있어요"
      : `${formatDistance(letter.distance)} 떨어짐`;

    info.append(title, meta, badge);
    li.append(statusIcon, info);
    listEl.append(li);
  }
}

function renderAll() {
  renderMarkers();
  renderList();
}

// ---------- syncing with the server ----------

async function refreshLetters() {
  if (!state.me) return;
  try {
    state.letters = await apiListLetters(state.me.lat, state.me.lng);
    renderAll();
  } catch {
    const statusEl = document.getElementById("geo-status");
    statusEl.textContent = "편지 목록을 불러오지 못했어요. 잠시 후 다시 시도할게요.";
    statusEl.classList.add("err");
  }
}

// ---------- geolocation watch ----------

function startWatch() {
  const statusEl = document.getElementById("geo-status");
  if (!("geolocation" in navigator)) {
    statusEl.textContent = "이 브라우저는 위치 정보를 지원하지 않아요.";
    statusEl.classList.add("err");
    return;
  }
  statusEl.textContent = "위치 확인 중…";

  navigator.geolocation.watchPosition(
    (pos) => {
      state.me = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      state.geoError = null;
      statusEl.textContent = `현재 위치 확인됨 (오차 약 ${Math.round(pos.coords.accuracy)}m)`;
      statusEl.classList.remove("err");
      statusEl.classList.add("ok");

      if (!map._dl_centered) {
        map.setView([state.me.lat, state.me.lng], 16);
        map._dl_centered = true;
      }
      updateMeMarker();
      refreshLetters();
      refreshWriteModalLocation();
    },
    (err) => {
      state.geoError = err;
      statusEl.textContent = "위치 권한을 허용해야 편지를 쓰고 열 수 있어요.";
      statusEl.classList.add("err");
      statusEl.classList.remove("ok");
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

// ---------- reverse geocoding (best-effort) ----------

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();
    const a = data.address || {};
    const parts = [a.neighbourhood, a.suburb || a.village, a.city || a.town || a.county].filter(
      Boolean
    );
    return parts.length ? parts.join(" ") : data.display_name?.split(",").slice(0, 2).join(",") || "";
  } catch {
    return "";
  }
}

// ---------- write modal ----------

function refreshWriteModalLocation() {
  const modal = document.getElementById("write-modal");
  if (modal.hidden) return;
  const descEl = document.getElementById("write-location-desc");
  const sealBtn = document.getElementById("btn-seal");
  if (state.me) {
    sealBtn.disabled = false;
    descEl.textContent = `현재 위치(오차 약 ${Math.round(
      state.me.accuracy
    )}m)에 편지를 봉인해요. 선택한 반경 안에서만 다시 열 수 있어요.`;
  } else {
    sealBtn.disabled = true;
    descEl.textContent = state.geoError
      ? "위치 권한이 필요해요. 브라우저 설정에서 위치 접근을 허용해주세요."
      : "현재 위치를 확인하고 있어요…";
  }
}

function openWriteModal() {
  document.getElementById("letter-title-input").value = "";
  document.getElementById("letter-body-input").value = "";
  document.getElementById("radius-select").value = "100";
  showModal("write-modal");
  refreshWriteModalLocation();
}

async function sealLetter() {
  if (!state.me) return;
  const title = document.getElementById("letter-title-input").value.trim();
  const body = document.getElementById("letter-body-input").value.trim();
  const radius = Number(document.getElementById("radius-select").value);

  if (!body) {
    showToast("편지 내용을 적어주세요.");
    return;
  }

  const sealBtn = document.getElementById("btn-seal");
  sealBtn.disabled = true;
  sealBtn.textContent = "봉인 중…";

  try {
    const placeLabel = await reverseGeocode(state.me.lat, state.me.lng);
    const { id, ownerToken } = await apiCreateLetter({
      title,
      body,
      lat: state.me.lat,
      lng: state.me.lng,
      radius,
      placeLabel,
    });
    saveOwnerToken(id, ownerToken);
    await refreshLetters();
    hideModal("write-modal");
    showToast("💌 편지를 이 자리에 봉인했어요. 이제 다른 사람도 같은 장소에서 열어볼 수 있어요.");
  } catch {
    showToast("편지를 봉인하지 못했어요. 잠시 후 다시 시도해주세요.");
  }

  sealBtn.disabled = false;
  sealBtn.textContent = "🔒 이 자리에 편지 봉인하기";
}

// ---------- read modal ----------

async function openReadModal(id) {
  if (!state.me) return;
  const titleEl = document.getElementById("read-title");
  const bodyEl = document.getElementById("read-body");
  const actionsEl = document.getElementById("read-actions");
  titleEl.textContent = "불러오는 중…";
  bodyEl.innerHTML = "";
  actionsEl.innerHTML = "";
  showModal("read-modal");

  let letter;
  try {
    letter = await apiGetLetter(id, state.me.lat, state.me.lng);
  } catch {
    titleEl.textContent = "오류";
    bodyEl.innerHTML = `<div class="read-locked">편지를 불러오지 못했어요.</div>`;
    return;
  }

  titleEl.textContent = letter.title || "제목 없는 편지";

  if (letter.unlocked) {
    const p = document.createElement("div");
    p.textContent = letter.body;
    const metaP = document.createElement("p");
    metaP.className = "read-meta";
    metaP.textContent = `${formatDate(letter.createdAt)} · ${
      letter.placeLabel || "이 장소"
    }에서 쓴 편지`;
    bodyEl.append(p, metaP);
  } else {
    bodyEl.innerHTML = `
      <div class="read-locked">
        <span class="big-icon">🔒</span>
        아직 이 편지를 열 수 없어요.<br />
        이 편지는 <strong>${letter.placeLabel || "다른 장소"}</strong>에서 봉인되었어요.<br />
        현재 위치에서 <span class="dist">${formatDistance(letter.distance)}</span> 더 가까이 가야
        (허용 반경 ${formatDistance(letter.radius)} 이내) 열 수 있어요.
      </div>`;
  }

  const myToken = myOwnerTokenFor(id);
  if (myToken) {
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-ghost";
    deleteBtn.textContent = "🗑 삭제";
    deleteBtn.addEventListener("click", async () => {
      if (confirm("이 편지를 삭제할까요? 되돌릴 수 없어요.")) {
        const ok = await apiDeleteLetter(id, myToken);
        if (ok) {
          await refreshLetters();
          hideModal("read-modal");
          showToast("편지를 삭제했어요.");
        } else {
          showToast("삭제하지 못했어요.");
        }
      }
    });
    actionsEl.append(deleteBtn);
  }

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn btn-primary";
  closeBtn.textContent = "닫기";
  closeBtn.addEventListener("click", () => hideModal("read-modal"));
  actionsEl.append(closeBtn);
}

// ---------- modal / toast utils ----------

function showModal(id) {
  document.getElementById(id).hidden = false;
}
function hideModal(id) {
  document.getElementById(id).hidden = true;
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3200);
}

// ---------- wiring ----------

function init() {
  initMap();
  startWatch();

  document.getElementById("btn-write").addEventListener("click", openWriteModal);
  document.getElementById("btn-seal").addEventListener("click", sealLetter);

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => hideModal(btn.dataset.close));
  });
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) hideModal(backdrop.id);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideModal("write-modal");
      hideModal("read-modal");
    }
  });

  // periodically pull the latest letters/lock state from the server
  setInterval(refreshLetters, POLL_INTERVAL_MS);
}

document.addEventListener("DOMContentLoaded", init);
