const API_URL = "https://ai-impact-server.vercel.app";
const urlParams = new URLSearchParams(window.location.search);
let courses = [];
let filtered = [];

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

function showProgress(a) { const b=document.getElementById("progressBar"); if(b) b.classList.toggle("active",!!a); }

function escapeHTML(v) { return String(v==null?"":v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

function pillClass(s) { const v=String(s||"").toLowerCase(); if(["approved","active","published"].includes(v)) return "green"; if(["pending","draft"].includes(v)) return "yellow"; if(["rejected","disabled"].includes(v)) return "red"; return "blue"; }

function formatDate(iso) { if(!iso) return "—"; try { return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); } catch(e) { return "—"; } }

function renderTable(list) {
  const tbody = document.getElementById("tableBody");
  const empty = document.getElementById("emptyState");
  if (!list.length) {
    tbody.innerHTML = "";
    empty.style.display = "";
    document.getElementById("emptyText").textContent = "No courses match your current filters.";
    return;
  }
  empty.style.display = "none";
  tbody.innerHTML = list.map(c => {
    const thumbHtml = c.thumbnail ? `<img src="${escapeHTML(c.thumbnail)}" alt="" />` : `<i class="fa-solid fa-book"></i>`;
    const statusLabel = c.status === "approved" ? "Approved" : c.status === "rejected" ? "Rejected" : "Pending Review";
    return `<tr>
      <td><div class="course-cell"><div class="course-thumb">${thumbHtml}</div><div><h4>${escapeHTML(c.title)}</h4><p>${escapeHTML(c.category||"")}</p></div></div></td>
      <td class="teacher-cell">${escapeHTML(c.teacher.fullname)}<small>${escapeHTML(c.teacher.email)}</small></td>
      <td>${escapeHTML(c.category||"—")}</td>
      <td>${escapeHTML(c.accessType||"free")}</td>
      <td>${formatDate(c.createdAt)}</td>
      <td><span class="pill ${pillClass(c.status)}">${statusLabel}</span></td>
      <td><div class="action-cell">
        <a class="btn-icon" href="./review.html?courseId=${encodeURIComponent(c.courseId)}" title="View"><i class="fa-solid fa-eye"></i></a>
      </div></td>
    </tr>`;
  }).join("");
}

async function loadCourses() {
  showProgress(true);
  document.getElementById("errorState").style.display = "none";
  try {
    const params = new URLSearchParams();
    const sf = document.getElementById("statusFilter")?.value;
    if (sf) params.set("status", sf);
    const sq = document.getElementById("searchInput")?.value.trim().toLowerCase();
    if (sq) params.set("search", sq);
    const qs = params.toString();
    const r = await fetch(`${API_URL}/api/admin/courses${qs?"?"+qs:""}`, { method:"GET", credentials:"include", headers:{"Content-Type":"application/json"} });
    const d = await r.json().catch(()=>({}));
    if (!r.ok||!d.success) throw new Error(d.message||"Failed to load");
    courses = d.courses||[];
    filtered = courses;
    renderTable(filtered);
  } catch(e) {
    console.error("loadCourses error:",e);
    document.getElementById("errorState").style.display="";
    document.getElementById("errorTitle").textContent="Failed to load courses";
    document.getElementById("errorText").textContent=e.message;
  } finally { showProgress(false); }
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await ValidateAdmin();
  if (!ok) return;
  document.getElementById("statusFilter")?.addEventListener("change", loadCourses);
  document.getElementById("searchInput")?.addEventListener("keydown", e => { if(e.key==="Enter") loadCourses(); });
  document.getElementById("refreshBtn")?.addEventListener("click", loadCourses);
  document.getElementById("retryBtn")?.addEventListener("click", loadCourses);
  const initFilter = urlParams.get("status")||"";
  if (initFilter && document.getElementById("statusFilter")) document.getElementById("statusFilter").value = initFilter;
  await loadCourses();
});
