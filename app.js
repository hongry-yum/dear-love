"use strict";

const STORAGE_KEY = "dearlove.letters.v1";

/** @typedef {{id:string,title:string,body:string,lat:number,lng:number,radius:number,createdAt:number,placeLabel:string}} Letter */

const state = {
  /** @type {Letter[]} */
  letters: loadLetters(),
  /** @type {{lat:number,lng:number,accuracy:number}|null} */
  me: null,
  geoError: null,
};

// ---------- storage ----------

function loadLetters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLetters() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.letters));
  } catch {
    showToast("저장 공간이 부족해 편지를 저장하지 못했어요.");
  }
}

// ---------- geo helpers ----------

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function formatDate(ts) {
  const d = new Date(ts);
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

function distanceToLetter(letter) {
  if (!state.me) return Infinity;
  return haversineMeters(state.me.lat, state.me.lng, letter.lat, letter.lng);
}

function isUnlocked(letter) {
  return distanceToLetter(letter) <= letter.radius;
}

function renderMarkers() {
  const seen = new Set();
  for (const letter of state.letters) {
    seen.add(letter.id);
    const unlocked = isUnlocked(letter);
    const emoji = unlocked ? "🔓" : "🔒";
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

  const sorted = [...state.letters].sort((a, b) => distanceToLetter(a) - distanceToLetter(b));

  listEl.innerHTML = "";
  for (const letter of sorted) {
    const dist = distanceToLetter(letter);
    const unlocked = dist <= letter.radius;

    const li = document.createElement("li");
    li.className = "letter-card";
    li.addEventListener("click", () => openReadModal(letter.id));

    const statusIcon = document.createElement("span");
    statusIcon.className = "status-icon";
    statusIcon.textContent = unlocked ? "🔓" : "🔒";

    const info = document.createElement("div");
    info.className = "info";

    const title = document.createElement("p");
    title.className = "title";
    title.textContent = letter.title || "제목 없는 편지";

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = `${formatDate(letter.createdAt)} · ${letter.placeLabel || "알 수 없는 장소"}`;

    const badge = document.createElement("span");
    badge.className = `dist-badge ${unlocked ? "unlocked" : "locked"}`;
    badge.textContent = unlocked
      ? "지금 열 수 있어요"
      : Number.isFinite(dist)
      ? `${formatDistance(dist)} 떨어짐`
      : "위치 확인 중";

    info.append(title, meta, badge);
    li.append(statusIcon, info);
    listEl.append(li);
  }
}

function renderAll() {
  renderMarkers();
  renderList();
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
      renderAll();
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

  const placeLabel = await reverseGeocode(state.me.lat, state.me.lng);

  /** @type {Letter} */
  const letter = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    body,
    lat: state.me.lat,
    lng: state.me.lng,
    radius,
    createdAt: Date.now(),
    placeLabel,
  };

  state.letters.push(letter);
  saveLetters();
  renderAll();
  hideModal("write-modal");
  showToast("💌 편지를 이 자리에 봉인했어요.");

  sealBtn.disabled = false;
  sealBtn.textContent = "🔒 이 자리에 편지 봉인하기";
}

// ---------- read modal ----------

function openReadModal(id) {
  const letter = state.letters.find((l) => l.id === id);
  if (!letter) return;

  const titleEl = document.getElementById("read-title");
  const bodyEl = document.getElementById("read-body");
  const actionsEl = document.getElementById("read-actions");
  titleEl.textContent = letter.title || "제목 없는 편지";
  actionsEl.innerHTML = "";

  const dist = distanceToLetter(letter);
  const unlocked = dist <= letter.radius;

  if (unlocked) {
    bodyEl.innerHTML = "";
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
        현재 위치에서 <span class="dist">${formatDistance(dist)}</span> 더 가까이 가야
        (허용 반경 ${formatDistance(letter.radius)} 이내) 열 수 있어요.
      </div>`;
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-ghost";
  deleteBtn.textContent = "🗑 삭제";
  deleteBtn.addEventListener("click", () => {
    if (confirm("이 편지를 삭제할까요? 되돌릴 수 없어요.")) {
      state.letters = state.letters.filter((l) => l.id !== id);
      saveLetters();
      renderAll();
      hideModal("read-modal");
      showToast("편지를 삭제했어요.");
    }
  });

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn btn-primary";
  closeBtn.textContent = "닫기";
  closeBtn.addEventListener("click", () => hideModal("read-modal"));

  actionsEl.append(deleteBtn, closeBtn);
  showModal("read-modal");
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
  renderAll();
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

  // re-check lock state periodically even if position hasn't changed
  setInterval(renderAll, 4000);
}

document.addEventListener("DOMContentLoaded", init);
