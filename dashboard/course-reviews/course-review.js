const API_URL = "https://ai-impact-server.vercel.app";
const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get("courseId");
let courseData = null;

function showProgress(a) { const b=document.getElementById("progressBar"); if(b) b.classList.toggle("active",!!a); }

function escapeHTML(v) { return String(v==null?"":v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

function pillClass(s) { const v=String(s||"").toLowerCase(); if(["approved","active","published"].includes(v)) return "green"; if(["pending","draft"].includes(v)) return "yellow"; if(["rejected","disabled"].includes(v)) return "red"; return "blue"; }

function formatDate(iso) { if(!iso) return "—"; try { return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); } catch(e) { return "—"; } }

function modal(el) { const m=typeof el==="string"?document.getElementById(el):el; if(!m) return; const isOpen=m.getAttribute("aria-hidden")!=="true"; m.setAttribute("aria-hidden",String(isOpen)); }

document.addEventListener("click",e => {
  const t=e.target.closest("[data-close-modal]");
  if(t) modal(t.dataset.closeModal);
});

async function ValidateAdmin() {
  try {
    const r = await fetch(`${API_URL}/api/admin/validate`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"} });
    const d = await r.json().catch(()=>({}));
    if (!r.ok||!d.success) { localStorage.removeItem("impact_admin"); window.location.href="https://nx7-vault-core.impactacademy.site"; return false; }
    if (d.admin) localStorage.setItem("impact_admin",JSON.stringify(d.admin));
    return true;
  } catch(e) {
    console.error("ValidateAdmin error:",e);
    localStorage.removeItem("impact_admin");
    window.location.href="https://nx7-vault-core.impactacademy.site";
    return false;
  }
}

/* ── Custom Video Player ── */
function fmtTime(s) {
  if (!s||!isFinite(s)) return "0:00";
  const m = Math.floor(s/60), sec = Math.floor(s%60);
  return m + ":" + String(sec).padStart(2,"0");
}

function initCustomPlayer(container) {
  const video = container.querySelector(".custom-player-video");
  if (!video) return;

  const wrap = container.querySelector(".custom-player-video-wrap");
  const overlay = container.querySelector(".custom-player-play-overlay");
  const bigPlay = container.querySelector(".cp-big-play");
  const loading = container.querySelector(".custom-player-loading");
  const errorEl = container.querySelector(".custom-player-error");
  const controls = container.querySelector(".custom-player-controls");
  const playBtn = container.querySelector(".cp-play-btn");
  const currentEl = container.querySelector(".cp-current");
  const durationEl = container.querySelector(".cp-duration");
  const progressBg = container.querySelector(".cp-progress-bg");
  const progressFill = container.querySelector(".cp-progress-fill");
  const progressThumb = container.querySelector(".cp-progress-thumb");
  const volumeBtn = container.querySelector(".cp-volume-btn");
  const volumeBg = container.querySelector(".cp-volume-bg");
  const volumeFill = container.querySelector(".cp-volume-fill");
  const fullscreenBtn = container.querySelector(".cp-fullscreen-btn");
  const progressTrack = container.querySelector(".cp-progress");
  const volumeTrack = container.querySelector(".cp-volume-slider");

  let isPlaying = false;
  let isDragging = false;
  let isVolumeDragging = false;
  let wasPlayingBeforeSeek = false;

  function updatePlayBtn() {
    const icon = playBtn.querySelector("i");
    if (icon) icon.className = "fa-solid " + (video.paused ? "fa-play" : "fa-pause");
    if (bigPlay) bigPlay.innerHTML = video.paused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
  }

  function updateProgress() {
    if (!video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    progressFill.style.width = pct + "%";
    if (progressThumb) progressThumb.style.left = pct + "%";
    currentEl.textContent = fmtTime(video.currentTime);
  }

  function updateVolume() {
    const pct = (video.volume || 0) * 100;
    volumeFill.style.width = pct + "%";
    const icon = volumeBtn.querySelector("i");
    if (icon) {
      if (video.muted || video.volume === 0) icon.className = "fa-solid fa-volume-xmark";
      else if (video.volume < 0.5) icon.className = "fa-solid fa-volume-low";
      else icon.className = "fa-solid fa-volume-high";
    }
  }

  function showError() {
    loading.style.display = "none";
    overlay.style.display = "none";
    errorEl.style.display = "flex";
    controls.style.display = "none";
  }

  function togglePlay() {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  function enterFullscreen() {
    if (container.requestFullscreen) container.requestFullscreen();
    else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
    else if (container.msRequestFullscreen) container.msRequestFullscreen();
  }

  // ── Video events ──
  video.addEventListener("loadedmetadata", () => {
    durationEl.textContent = fmtTime(video.duration);
    loading.style.display = "none";
  });

  video.addEventListener("canplay", () => {
    loading.style.display = "none";
  });

  video.addEventListener("waiting", () => {
    loading.style.display = "flex";
  });

  video.addEventListener("playing", () => {
    loading.style.display = "none";
    overlay.style.display = "none";
    isPlaying = true;
    updatePlayBtn();
  });

  video.addEventListener("pause", () => {
    isPlaying = false;
    updatePlayBtn();
    if (video.currentTime < video.duration && !video.ended) {
      overlay.style.display = "flex";
    }
  });

  video.addEventListener("ended", () => {
    isPlaying = false;
    updatePlayBtn();
    overlay.style.display = "flex";
    if (bigPlay) bigPlay.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
  });

  video.addEventListener("error", () => showError());

  video.addEventListener("timeupdate", updateProgress);

  video.addEventListener("volumechange", updateVolume);

  // ── Play/Pause ──
  bigPlay.addEventListener("click", togglePlay);
  playBtn.addEventListener("click", togglePlay);
  video.addEventListener("click", togglePlay);

  // ── Progress bar seeking ──
  function seekClientX(clientX) {
    const rect = progressTrack.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = x / rect.width;
    if (video.duration) {
      video.currentTime = pct * video.duration;
      updateProgress();
    }
  }

  progressTrack.addEventListener("mousedown", (e) => {
    wasPlayingBeforeSeek = !video.paused;
    video.pause();
    isDragging = true;
    seekClientX(e.clientX);
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) seekClientX(e.clientX);
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      if (wasPlayingBeforeSeek) video.play().catch(() => {});
    }
  });

  // ── Volume ──
  volumeBtn.addEventListener("click", () => {
    video.muted = !video.muted;
    updateVolume();
  });

  function setVolumeClientX(clientX) {
    const rect = volumeTrack.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const vol = x / rect.width;
    video.volume = vol;
    video.muted = false;
    updateVolume();
  }

  volumeTrack.addEventListener("mousedown", (e) => {
    isVolumeDragging = true;
    setVolumeClientX(e.clientX);
  });

  document.addEventListener("mousemove", (e) => {
    if (isVolumeDragging) setVolumeClientX(e.clientX);
  });

  document.addEventListener("mouseup", () => {
    isVolumeDragging = false;
  });

  // ── Fullscreen ──
  fullscreenBtn.addEventListener("click", enterFullscreen);

  document.addEventListener("fullscreenchange", () => {
    const icon = fullscreenBtn.querySelector("i");
    if (icon) icon.className = "fa-solid fa-" + (document.fullscreenElement ? "compress" : "expand");
  });

  // Init
  updatePlayBtn();
  updateVolume();
  loading.style.display = "none";
  if (video.readyState >= 1) {
    durationEl.textContent = fmtTime(video.duration);
  }
}

function renderCourse(course) {
  const c = course;
  // Breadcrumb
  document.getElementById("breadcrumbTitle").textContent = c.title||"Course Review";
  // Hero
  document.getElementById("heroInitials").textContent = (c.title||"?").charAt(0).toUpperCase();
  document.getElementById("heroTitle").textContent = c.title||"Untitled";
  document.getElementById("heroTeacher").textContent = c.teacher?.fullname||c.teacher?.email||"Unknown Teacher";
  // Pills
  const pills = document.getElementById("heroPills");
  pills.innerHTML = "";
  if (c.category) pills.innerHTML += `<span class="pill blue">${escapeHTML(c.category)}</span>`;
  if (c.accessType) pills.innerHTML += `<span class="pill ${c.accessType==="paid"?"green":"blue"}">${escapeHTML(c.accessType)}</span>`;
  // Status
  const statusEl = document.getElementById("heroStatus");
  statusEl.textContent = c.status==="approved"?"Approved":c.status==="rejected"?"Rejected":"Pending Review";
  statusEl.className = `hero-status ${pillClass(c.status)}`;
  // Info grid
  const infoGrid = document.getElementById("infoGrid");
  const tagsHtml = c.tags?.length ? c.tags.map(t=>`<span>${escapeHTML(t)}</span>`).join("") : "—";
  const countriesHtml = c.countries?.length ? c.countries.join(", ") : "—";
  infoGrid.innerHTML = `
    <div class="kv-item"><div class="label">Title</div><div class="value">${escapeHTML(c.title||"—")}</div></div>
    <div class="kv-item"><div class="label">Subtitle</div><div class="value">${escapeHTML(c.subtitle||"—")}</div></div>
    <div class="kv-item full"><div class="label">Description</div><div class="value">${escapeHTML(c.description||"—")}</div></div>
    <div class="kv-item"><div class="label">Category</div><div class="value">${escapeHTML(c.category||"—")}</div></div>
    <div class="kv-item"><div class="label">Tags</div><div class="value tags">${tagsHtml}</div></div>
    <div class="kv-item"><div class="label">Countries</div><div class="value">${countriesHtml}</div></div>
    <div class="kv-item"><div class="label">Time Zone</div><div class="value">${escapeHTML(c.timezone||"—")}</div></div>
    <div class="kv-item"><div class="label">Access Type</div><div class="value">${escapeHTML(c.accessType||"free")}</div></div>
    <div class="kv-item"><div class="label">Start Date</div><div class="value">${formatDate(c.startDate)}</div></div>
    <div class="kv-item"><div class="label">End Date</div><div class="value">${formatDate(c.endDate)}</div></div>
  `;
  // Media
  const mediaGrid = document.getElementById("mediaGrid");
  let mediaHtml = "";
  // Thumbnail
  if (c.thumbnail) {
    mediaHtml += `<div class="media-item"><h4><i class="fa-solid fa-image"></i> Thumbnail</h4><div class="media-preview" data-preview='{"type":"image","url":"${escapeHTML(c.thumbnail)}"}'><img src="${escapeHTML(c.thumbnail)}" alt="thumbnail" /><div class="play-overlay"><i class="fa-solid fa-expand"></i></div></div></div>`;
  } else {
    mediaHtml += `<div class="media-item"><h4>Thumbnail</h4><div class="preview-empty"><span>No thumbnail</span></div></div>`;
  }
  // Helper for video blocks
  function videoBlock(label, icon, url, meta, id) {
    if (url) {
      return `<div class="media-item"><h4><i class="fa-solid ${icon}"></i> ${escapeHTML(label)}</h4><div class="custom-player" data-player-id="${id}" data-video-url="${escapeHTML(url)}"><div class="custom-player-video-wrap"><video class="custom-player-video" preload="metadata" playsinline src="${escapeHTML(url)}"></video><div class="custom-player-loading"><div class="cp-spinner"></div></div><div class="custom-player-play-overlay"><button class="cp-big-play" type="button"><i class="fa-solid fa-play"></i></button></div><div class="custom-player-error"><i class="fa-solid fa-circle-exclamation"></i><span>Video unavailable</span></div></div><div class="custom-player-controls"><button class="cp-btn cp-play-btn" type="button"><i class="fa-solid fa-play"></i></button><span class="cp-time cp-current">0:00</span><div class="cp-progress"><div class="cp-progress-bg"></div><div class="cp-progress-fill"></div><div class="cp-progress-thumb"></div></div><span class="cp-time cp-duration">0:00</span><button class="cp-btn cp-volume-btn" type="button"><i class="fa-solid fa-volume-high"></i></button><div class="cp-volume-slider"><div class="cp-volume-bg"></div><div class="cp-volume-fill"></div></div><button class="cp-btn cp-fullscreen-btn" type="button"><i class="fa-solid fa-expand"></i></button></div></div></div>`;
    }
    if (meta && meta.fileName && meta.mimeType?.startsWith("video/")) {
      return `<div class="media-item"><h4><i class="fa-solid ${icon}"></i> ${escapeHTML(label)}</h4><div style="padding:32px 16px;display:flex;flex-direction:column;gap:10px;align-items:center;color:#94a3b8;"><i class="fa-solid fa-video-slash" style="font-size:32px;color:#64748b;"></i><span style="font-size:13px;">Video content unavailable</span><span style="font-size:11px;">The teacher may need to re-upload this video.</span></div></div>`;
    }
    if (meta && meta.fileName) {
      const sizeStr = meta.size ? (meta.size/1024/1024).toFixed(1)+" MB" : "";
      return `<div class="media-item"><h4><i class="fa-solid ${icon}"></i> ${escapeHTML(label)}</h4><div style="padding:20px 16px;display:flex;flex-direction:column;gap:6px;align-items:center;color:#94a3b8;"><i class="fa-solid fa-file" style="font-size:28px;color:#818cf8;"></i><span style="font-size:13px;font-weight:600;">${escapeHTML(meta.fileName)}</span><span style="font-size:11px;">${escapeHTML(meta.mimeType||"")} ${sizeStr}</span></div></div>`;
    }
    return `<div class="media-item"><h4><i class="fa-solid ${icon}"></i> ${escapeHTML(label)}</h4><div class="preview-empty"><span>Not provided</span></div></div>`;
  }
  mediaHtml += videoBlock("Promotional Video", "fa-video", c.promoVideo, c.promoVideoMeta, "promo");
  mediaHtml += videoBlock("Trailer Video", "fa-video", c.trailerVideo, c.trailerVideoMeta, "trailer");
  // Uploaded files
  const files = c.uploadedFiles||[];
  if (files.length) {
    mediaHtml += `<div class="media-item"><h4><i class="fa-solid fa-files"></i> Uploaded Files (${files.length})</h4><div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px;">`;
    files.forEach(f=>{
      const fname = escapeHTML(f.name||f.url?.split("/").pop()||"file");
      mediaHtml += `<div style="display:flex;align-items:center;gap:10px;font-size:13px;"><i class="fa-solid fa-file" style="color:#818cf8"></i><span style="flex:1">${fname}</span></div>`;
    });
    mediaHtml += `</div></div>`;
  } else {
    mediaHtml += `<div class="media-item"><h4>Uploaded Files</h4><div class="preview-empty"><span>No files</span></div></div>`;
  }
  mediaGrid.innerHTML = mediaHtml;
  // Init custom video players
  document.querySelectorAll(".custom-player").forEach(el => initCustomPlayer(el));
  // Thumbnail click to open lightbox
  document.querySelectorAll(".media-preview[data-preview]").forEach(el=>{
    el.addEventListener("click",()=>{
      try {
        const data = JSON.parse(el.dataset.preview);
        openPreview(data.type, data.url);
      } catch(e) {}
    });
  });
  // Requirements
  const reqs = c.requirements||[];
  document.getElementById("requirementsBlock").innerHTML = reqs.length
    ? `<ul>${reqs.map(r=>`<li><i class="fa-solid fa-circle-check"></i> ${escapeHTML(r)}</li>`).join("")}</ul>`
    : `<p style="color:#94a3b8;font-size:13px;">No requirements listed.</p>`;
  // Outcomes
  const outcomes = c.outcomes||[];
  document.getElementById("outcomesBlock").innerHTML = outcomes.length
    ? `<ul>${outcomes.map(o=>`<li><i class="fa-solid fa-star"></i> ${escapeHTML(o)}</li>`).join("")}</ul>`
    : `<p style="color:#94a3b8;font-size:13px;">No learning outcomes listed.</p>`;
  // Sidebar: verify status
  const vs = document.getElementById("verifyStatus");
  const vi = document.getElementById("verifyIcon");
  const vt = document.getElementById("verifyTitle");
  const vx = document.getElementById("verifyText");
  const sc = pillClass(c.status);
  vi.className = `verify-status-icon ${sc}`;
  if (c.status==="approved") {
    vi.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    vt.textContent = "Approved";
    vx.textContent = `Approved on ${formatDate(c.approvedAt)}`;
    document.getElementById("approveBtn").disabled = true;
    document.getElementById("approveBtn").style.opacity = "0.4";
    document.getElementById("approveBtn").style.cursor = "not-allowed";
    document.getElementById("rejectBtn").disabled = true;
    document.getElementById("rejectBtn").style.opacity = "0.4";
    document.getElementById("rejectBtn").style.cursor = "not-allowed";
  } else if (c.status==="rejected") {
    vi.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
    vt.textContent = "Rejected";
    vx.textContent = `Rejected on ${formatDate(c.rejectedAt)}${c.rejectionReason?`: ${c.rejectionReason}`:""}`;
    document.getElementById("approveBtn").disabled = true;
    document.getElementById("approveBtn").style.opacity = "0.4";
    document.getElementById("approveBtn").style.cursor = "not-allowed";
    document.getElementById("rejectBtn").disabled = true;
    document.getElementById("rejectBtn").style.opacity = "0.4";
    document.getElementById("rejectBtn").style.cursor = "not-allowed";
  } else {
    vi.innerHTML = '<i class="fa-solid fa-hourglass-half"></i>';
    vt.textContent = "Awaiting Review";
    vx.textContent = "This course is waiting for review.";
  }
  // Teacher block
  const tb = document.getElementById("teacherBlock");
  const t = c.teacher||{};
  const tInitials = t.fullname ? t.fullname.split(" ").map(s=>s[0]).join("").slice(0,2).toUpperCase() : "?";
  tb.innerHTML = `
    <div class="teacher-photo">${escapeHTML(tInitials)}</div>
    <div class="teacher-info">
      <h4>${escapeHTML(t.fullname||"Unknown")}</h4>
      <p>${escapeHTML(t.email||"—")}</p>
      <div class="teacher-pills">
        <span class="pill ${pillClass(t.status)}">${escapeHTML(t.status||"active")}</span>
        <span class="pill ${t.verified?"green":"yellow"}">${t.verified?"Verified":"Unverified"}</span>
      </div>
      ${t.email?`<a class="teacher-profile-link" href="mailto:${escapeHTML(t.email)}"><i class="fa-solid fa-envelope"></i> Contact Teacher</a>`:""}
    </div>`;
  // Meta list
  const meta = document.getElementById("metaList");
  meta.innerHTML = `
    <div class="meta-item"><span>Course ID</span><span>${escapeHTML(c.courseId||"—")}</span></div>
    <div class="meta-item"><span>Created</span><span>${formatDate(c.createdAt)}</span></div>
    <div class="meta-item"><span>Updated</span><span>${formatDate(c.updatedAt)}</span></div>
    <div class="meta-item"><span>Price</span><span>${c.price?`$${c.price}`:"—"}</span></div>
    <div class="meta-item"><span>Students</span><span>${c.students||0}</span></div>
  `;
}

function openPreview(type, url) {
  const body = document.getElementById("previewBody");
  const title = document.getElementById("previewTitle");
  const sub = document.getElementById("previewSubtitle");
  if (type==="image") {
    title.textContent = "Image Preview";
    sub.textContent = "Thumbnail full resolution";
    body.innerHTML = `<img src="${escapeHTML(url)}" alt="preview" />`;
  } else if (type==="video") {
    title.textContent = "Video Preview";
    sub.textContent = "Play video";
    body.innerHTML = `<video src="${escapeHTML(url)}" controls autoplay style="width:100%"></video>`;
  }
  modal("previewModal");
}

async function loadCourse() {
  if (!courseId) {
    document.getElementById("errorState").style.display="";
    document.getElementById("errorTitle").textContent="Missing course ID";
    document.getElementById("errorText").textContent="No course ID provided in URL.";
    return;
  }
  showProgress(true);
  document.getElementById("errorState").style.display="none";
  try {
    const r = await fetch(`${API_URL}/api/admin/courses/${encodeURIComponent(courseId)}`, { method:"GET", credentials:"include", headers:{"Content-Type":"application/json"} });
    const d = await r.json().catch(()=>({}));
    if (!r.ok||!d.success) throw new Error(d.message||"Failed to load course");
    courseData = d.course;
    renderCourse(d.course);
  } catch(e) {
    console.error("loadCourse error:",e);
    document.getElementById("errorState").style.display="";
    document.getElementById("errorTitle").textContent="Failed to load course";
    document.getElementById("errorText").textContent=e.message;
  } finally { showProgress(false); }
}

async function approveCourse() {
  if (!courseData || courseData.status!=="pending") return;
  showProgress(true);
  try {
    const r = await fetch(`${API_URL}/api/admin/courses/${encodeURIComponent(courseData.courseId)}/approve`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"} });
    const d = await r.json().catch(()=>({}));
    if (!r.ok||!d.success) throw new Error(d.message||"Failed to approve");
    courseData.status = "approved";
    courseData.approvedAt = new Date().toISOString();
    renderCourse(courseData);
    modal("approveModal");
    showResult("success","APPROVED","Course Approved","The course has been approved and published. An email notification has been sent to the teacher.");
  } catch(e) {
    console.error("approve error:",e);
    showResult("error","ERROR","Approval Failed",e.message);
  } finally { showProgress(false); }
}

async function rejectCourse() {
  if (!courseData || courseData.status!=="pending") return;
  const reason = document.getElementById("rejectionReason").value.trim();
  if (!reason) {
    document.getElementById("rejectionReason").style.borderColor = "#f87171";
    return;
  }
  document.getElementById("rejectionReason").style.borderColor = "";
  showProgress(true);
  try {
    const r = await fetch(`${API_URL}/api/admin/courses/${encodeURIComponent(courseData.courseId)}/reject`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ rejectionReason:reason }) });
    const d = await r.json().catch(()=>({}));
    if (!r.ok||!d.success) throw new Error(d.message||"Failed to reject");
    courseData.status = "rejected";
    courseData.rejectedAt = new Date().toISOString();
    courseData.rejectionReason = reason;
    renderCourse(courseData);
    modal("rejectModal");
    showResult("info","REJECTED","Course Rejected","The course has been rejected. An email notification has been sent to the teacher.");
  } catch(e) {
    console.error("reject error:",e);
    showResult("error","ERROR","Rejection Failed",e.message);
  } finally { showProgress(false); }
}

function showResult(iconType, tag, title, text) {
  const icon = document.getElementById("resultIcon");
  const colors = { success:"#34d399", error:"#f87171", info:"#818cf8", warning:"#fbbf24" };
  const bgColors = { success:"rgba(16,185,129,.12)", error:"rgba(239,68,68,.12)", info:"rgba(49,82,255,.12)", warning:"rgba(245,158,11,.12)" };
  const icons = { success:"fa-circle-check", error:"fa-circle-xmark", info:"fa-circle-info", warning:"fa-triangle-exclamation" };
  icon.style.background = bgColors[iconType]||bgColors.info;
  icon.style.color = colors[iconType]||colors.info;
  icon.innerHTML = `<i class="fa-solid ${icons[iconType]||icons.info}"></i>`;
  document.getElementById("resultTag").textContent = tag||"INFO";
  document.getElementById("resultTitle").textContent = title;
  document.getElementById("resultText").textContent = text;
  modal("resultModal");
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await ValidateAdmin();
  if (!ok) return;
  document.getElementById("retryBtn")?.addEventListener("click", loadCourse);
  document.getElementById("approveBtn")?.addEventListener("click", ()=>{
    if (courseData?.status==="pending") modal("approveModal");
  });
  document.getElementById("rejectBtn")?.addEventListener("click", ()=>{
    if (courseData?.status==="pending") modal("rejectModal");
  });
  document.getElementById("confirmApproveBtn")?.addEventListener("click", approveCourse);
  document.getElementById("confirmRejectBtn")?.addEventListener("click", rejectCourse);
  // Reset rejection reason input on modal open
  document.getElementById("rejectModal")?.addEventListener("click", e => {
    if (e.target.closest("[data-close-modal]")) document.getElementById("rejectionReason").value = "";
  });
  document.querySelectorAll("[data-close-modal]").forEach(el=>{
    el.addEventListener("click", ()=>{
      document.getElementById("rejectionReason").value = "";
      document.getElementById("rejectionReason").style.borderColor = "";
    });
  });
  await loadCourse();
});
