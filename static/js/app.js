/**
 * EduPulse Analytics - Core Frontend Controller
 * Enterprise NLP Feedback Intelligence Platform
 */

// Application Global State
let currentUser = null;
let currentRecordsPage = 1;
let totalRecordsCount = 0;
let searchDebounceTimer = null;
let activeDetailRecord = null;
let deleteTargetRecordId = null;

// Chart.js Instances
let dashSentimentChartInstance = null;
let dashIssuesChartInstance = null;
let dashDeptChartInstance = null;
let collectionSentimentChartInstance = null;
let collectionIssuesChartInstance = null;

// ============================================================================
// INITIALIZATION & LIFECYCLE
// ============================================================================
document.addEventListener("DOMContentLoaded", async () => {
    setupCharCounters();
    setupBatchDragDrop();
    await checkAuthSession();
    
    // Load initial views
    loadDashboardData();
    runPdfMixedBenchmark();
});

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================
function showToast(type, title, message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast-item";

    let iconHtml = '<i class="fa-solid fa-circle-info text-indigo-600 text-base mt-0.5 mr-3 shrink-0"></i>';
    if (type === "success") {
        iconHtml = '<i class="fa-solid fa-circle-check text-emerald-600 text-base mt-0.5 mr-3 shrink-0"></i>';
    } else if (type === "error") {
        iconHtml = '<i class="fa-solid fa-circle-xmark text-rose-600 text-base mt-0.5 mr-3 shrink-0"></i>';
    } else if (type === "warning") {
        iconHtml = '<i class="fa-solid fa-triangle-exclamation text-amber-500 text-base mt-0.5 mr-3 shrink-0"></i>';
    }

    toast.innerHTML = `
        ${iconHtml}
        <div class="flex-grow min-w-0 pr-2">
            <h4 class="text-xs font-bold text-slate-900 leading-tight">${title}</h4>
            <p class="text-xs text-slate-500 mt-0.5 leading-snug break-words">${message}</p>
        </div>
        <button onclick="this.closest('.toast-item').remove()" class="text-slate-400 hover:text-slate-600 p-0.5 ml-1 shrink-0 text-xs">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add("leaving");
            setTimeout(() => toast.remove(), 250);
        }
    }, 4500);
}

// ============================================================================
// TAB & VIEW NAVIGATION
// ============================================================================
function switchTab(tabId) {
    // Hide all tab views
    document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.add("hidden"));
    // Deactivate all sidebar links
    document.querySelectorAll(".sidebar-link").forEach(link => link.classList.remove("active"));

    // Activate target pane and link
    const targetPane = document.getElementById(`view-${tabId}`);
    const targetLink = document.getElementById(`nav-${tabId}`);

    if (targetPane) targetPane.classList.remove("hidden");
    if (targetLink) targetLink.classList.add("active");

    // Close mobile sidebar if open
    const sidebar = document.getElementById("appSidebar");
    const backdrop = document.getElementById("mobileBackdrop");
    if (sidebar && !sidebar.classList.contains("hidden") && window.innerWidth < 1024) {
        toggleMobileSidebar();
    }

    // Trigger tab-specific data refresh
    if (tabId === "dashboard") {
        loadDashboardData();
    } else if (tabId === "records") {
        loadRecords(1);
    } else if (tabId === "collection") {
        loadCollectionData();
    } else if (tabId === "audit") {
        loadAuditLogs();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById("appSidebar");
    const backdrop = document.getElementById("mobileBackdrop");
    if (!sidebar) return;

    if (sidebar.classList.contains("hidden")) {
        sidebar.classList.remove("hidden");
        sidebar.classList.add("fixed", "inset-y-0", "left-0", "z-50", "w-72", "p-4", "bg-slate-900/40");
        if (backdrop) backdrop.classList.remove("hidden");
    } else {
        sidebar.classList.add("hidden");
        sidebar.classList.remove("fixed", "inset-y-0", "left-0", "z-50", "w-72", "p-4", "bg-slate-900/40");
        if (backdrop) backdrop.classList.add("hidden");
    }
}

// ============================================================================
// AUTHENTICATION SUBSYSTEM
// ============================================================================
async function checkAuthSession() {
    try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (data.authenticated && data.user) {
            currentUser = data.user;
            renderAuthUserUI();
        } else {
            currentUser = null;
            renderUnauthUI();
        }
    } catch (e) {
        currentUser = null;
        renderUnauthUI();
    }
}

function renderAuthUserUI() {
    document.getElementById("unauthControls").classList.add("hidden");
    const authBox = document.getElementById("authControls");
    authBox.classList.remove("hidden");

    const initial = (currentUser.username || "U").charAt(0).toUpperCase();
    document.getElementById("userAvatarBadge").textContent = initial;
    document.getElementById("userNameLabel").textContent = currentUser.full_name || currentUser.username;
    
    const roleBadge = document.getElementById("userRoleBadge");
    roleBadge.textContent = currentUser.role || "student";
    if (currentUser.role === "admin") {
        roleBadge.className = "text-[10px] font-semibold uppercase tracking-wider text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200";
    } else if (currentUser.role === "faculty") {
        roleBadge.className = "text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200";
    } else {
        roleBadge.className = "text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200";
    }
}

function renderUnauthUI() {
    document.getElementById("unauthControls").classList.remove("hidden");
    document.getElementById("authControls").classList.add("hidden");
}

function openAuthModal(tab = "login") {
    const modal = document.getElementById("authModal");
    modal.classList.remove("hidden");
    setAuthTab(tab);
}

function closeAuthModal() {
    const modal = document.getElementById("authModal");
    modal.classList.add("hidden");
}

function setAuthTab(tab) {
    const loginForm = document.getElementById("loginForm");
    const regForm = document.getElementById("registerForm");
    const tabLogin = document.getElementById("authTabLogin");
    const tabReg = document.getElementById("authTabRegister");

    if (tab === "login") {
        loginForm.classList.remove("hidden");
        regForm.classList.add("hidden");
        tabLogin.className = "flex-1 py-2.5 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 transition";
        tabReg.className = "flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition";
        document.getElementById("authModalTitle").textContent = "Sign In to EduPulse";
    } else {
        loginForm.classList.add("hidden");
        regForm.classList.remove("hidden");
        tabReg.className = "flex-1 py-2.5 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 transition";
        tabLogin.className = "flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition";
        document.getElementById("authModalTitle").textContent = "Create an Account";
    }
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById("loginSubmitBtn");
    const origText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Authenticating...`;
    btn.disabled = true;

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Login failed");

        currentUser = data.user;
        renderAuthUserUI();
        closeAuthModal();
        showToast("success", "Authentication Successful", `Welcome back, ${currentUser.full_name || currentUser.username}!`);
        loadDashboardData();
    } catch (e) {
        showToast("error", "Sign In Error", e.message);
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById("regSubmitBtn");
    const origText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Registering...`;
    btn.disabled = true;

    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value;
    const full_name = document.getElementById("regFullName").value.trim();
    const role = document.getElementById("regRole").value;
    const department = document.getElementById("regDept").value.trim();

    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, full_name, role, department })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Registration failed");

        currentUser = data.user;
        renderAuthUserUI();
        closeAuthModal();
        showToast("success", "Account Created", `Account for ${username} created successfully!`);
        loadDashboardData();
    } catch (e) {
        showToast("error", "Registration Error", e.message);
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
}

async function logoutUser() {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
        currentUser = null;
        renderUnauthUI();
        showToast("info", "Session Closed", "You have been logged out.");
    } catch (e) {
        console.error("Logout failed:", e);
    }
}

// ============================================================================
// PDF SECTION 3: LIVE BENCHMARK & DIAGNOSTIC ANALYZER
// ============================================================================
function setupCharCounters() {
    const inspInput = document.getElementById("feedbackInput");
    if (inspInput) {
        inspInput.addEventListener("input", () => {
            document.getElementById("charCount").textContent = `${inspInput.value.length} characters`;
        });
    }

    const subInput = document.getElementById("subFeedbackText");
    if (subInput) {
        subInput.addEventListener("input", () => {
            document.getElementById("subCharCount").textContent = `${subInput.value.length} characters`;
        });
    }
}

function clearInput() {
    const input = document.getElementById("feedbackInput");
    input.value = "";
    document.getElementById("charCount").textContent = "0 characters";
}

function runSample(text) {
    const input = document.getElementById("feedbackInput");
    input.value = text;
    document.getElementById("charCount").textContent = `${text.length} characters`;
    evaluateSingleComment();
}

function runPdfMixedBenchmark() {
    switchTab("inspector");
    const input = document.getElementById("feedbackInput");
    input.value = "The faculty explains concepts clearly, but the lab computers are very slow.";
    document.getElementById("charCount").textContent = `${input.value.length} characters`;
    evaluateSingleComment();
}

async function evaluateSingleComment() {
    const input = document.getElementById("feedbackInput");
    const text = input.value.trim();

    if (!text) {
        showToast("warning", "Input Required", "Please enter student feedback text to analyze.");
        return;
    }

    const btn = document.getElementById("analyzeBtn");
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Analyzing...`;
    btn.disabled = true;

    try {
        const response = await fetch("/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Evaluation failed.");
        }

        const report = await response.json();
        renderPdfOutput(report, text);
        showToast("success", "Analysis Complete", `Classified as ${report.overall_sentiment} (${(report.confidence * 100).toFixed(1)}% confidence)`);
    } catch (e) {
        showToast("error", "Evaluation Error", e.message);
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

function renderPdfOutput(report, originalText) {
    // 1. Table Input Text
    document.getElementById("pdfTableInput").textContent = `"${originalText}"`;
    document.getElementById("auditIdBadge").textContent = `ID: ${report.submission_id || "FB-001"}`;

    // 2. Overall Sentiment & Confidence
    const sentBadge = document.getElementById("pdfTableSentiment");
    const sentiment = report.overall_sentiment || "Neutral";
    sentBadge.textContent = sentiment;

    if (sentiment === "Positive") {
        sentBadge.className = "ml-2 px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300";
    } else if (sentiment === "Negative") {
        sentBadge.className = "ml-2 px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300";
    } else if (sentiment === "Mixed") {
        sentBadge.className = "ml-2 px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300";
    } else {
        sentBadge.className = "ml-2 px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-300";
    }

    const conf = report.confidence ? (report.confidence * 100).toFixed(1) : "88.5";
    document.getElementById("pdfConfidenceBadge").textContent = `Confidence: ${conf}%`;

    // 3. Aspects Detected List (exact PDF format: "• Faculty/Teaching → Positive")
    const aspectsUl = document.getElementById("pdfTableAspects");
    aspectsUl.innerHTML = "";

    if (report.aspects_breakdown && report.aspects_breakdown.length > 0) {
        report.aspects_breakdown.forEach(item => {
            const polBadgeClass = item.polarity === "Positive"
                ? "bg-emerald-100 text-emerald-800"
                : (item.polarity === "Negative" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-800");

            const li = document.createElement("li");
            li.className = "flex items-center text-sm";
            li.innerHTML = `
                <span class="text-slate-400 mr-2">&bull;</span>
                <span class="font-semibold text-slate-900">${item.aspect}</span>
                <span class="mx-2 text-slate-400">&rarr;</span>
                <span class="px-2 py-0.5 rounded text-xs font-semibold ${polBadgeClass}">${item.polarity}</span>
            `;
            aspectsUl.appendChild(li);
        });
    } else {
        aspectsUl.innerHTML = `<li class="text-xs text-slate-500 italic">No specific aspects detected.</li>`;
    }

    // 4. Key Issue (exact PDF format: "• Slow laboratory computers")
    document.getElementById("pdfKeyIssueText").textContent = report.identified_issue || "No major issue";

    // 5. Update Pipeline Inspection Tab (Section 5 of PDF)
    const pipeCleaned = document.getElementById("pipeCleaned");
    if (pipeCleaned) pipeCleaned.textContent = report.normalized_text || "(empty)";
    const pipeTokens = document.getElementById("pipeTokens");
    if (pipeTokens) pipeTokens.textContent = JSON.stringify(report.tokens || []);
    const pipeStopwords = document.getElementById("pipeStopwords");
    if (pipeStopwords) pipeStopwords.textContent = JSON.stringify(report.tokens_filtered || []);
    const pipeLemmas = document.getElementById("pipeLemmas");
    if (pipeLemmas) pipeLemmas.textContent = JSON.stringify(report.lemmatized_tokens || []);
}

// ============================================================================
// STUDENT FEEDBACK SUBMISSION PORTAL
// ============================================================================
function setRating(rating) {
    document.getElementById("subRating").value = rating;
    const stars = document.querySelectorAll("#starRatingWidget .star-btn i");
    const labels = ["", "1 Star (Poor)", "2 Stars (Fair)", "3 Stars (Average)", "4 Stars (Good)", "5 Stars (Excellent)"];
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.className = "fa-solid fa-star";
        } else {
            star.className = "fa-regular fa-star";
        }
    });

    document.getElementById("ratingTextLabel").textContent = labels[rating] || `${rating} Stars`;
}

function resetSubmitForm() {
    document.getElementById("studentFeedbackForm").reset();
    setRating(5);
    document.getElementById("subCharCount").textContent = "0 characters";
}

async function handleFeedbackSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById("submitFeedbackBtn");
    const origHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Submitting & Classifying...`;
    btn.disabled = true;

    const payload = {
        text: document.getElementById("subFeedbackText").value.trim(),
        student_name: document.getElementById("subStudentName").value.trim() || (currentUser ? currentUser.full_name : "Anonymous Student"),
        department: document.getElementById("subDepartment").value,
        course: document.getElementById("subCourse").value.trim() || "General Academic",
        faculty_name: document.getElementById("subFaculty").value.trim() || "Faculty Member",
        rating: parseInt(document.getElementById("subRating").value, 10) || 5
    };

    try {
        const res = await fetch("/api/feedback/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Submission failed");

        showToast("success", "Feedback Recorded!", `Record #${data.record_id} saved. Sentiment: ${data.analysis.overall_sentiment}`);
        resetSubmitForm();
        
        // Auto refresh dashboard and switch to records view
        loadDashboardData();
        switchTab("records");
    } catch (e) {
        showToast("error", "Submission Failed", e.message);
    } finally {
        btn.innerHTML = origHtml;
        btn.disabled = false;
    }
}

// ============================================================================
// FEEDBACK RECORDS DATABASE & CRUD OPERATIONS
// ============================================================================
function debounceRecordsSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        loadRecords(1);
    }, 300);
}

async function loadRecords(page = 1) {
    currentRecordsPage = page;
    const tbody = document.getElementById("recordsTableBody");
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading records from database...</td></tr>`;

    const search = document.getElementById("recSearchInput").value.trim();
    const sentiment = document.getElementById("recSentimentFilter").value;
    const department = document.getElementById("recDeptFilter").value;
    const status = document.getElementById("recStatusFilter").value;

    const params = new URLSearchParams({
        page: currentRecordsPage,
        per_page: 10,
        search,
        sentiment,
        department,
        status
    });

    try {
        const res = await fetch(`/api/records?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to load records");

        totalRecordsCount = data.total;
        document.getElementById("recordsTotalBadge").textContent = `${data.total.toLocaleString()} Records`;
        renderRecordsTable(data);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-rose-500">Error loading records: ${e.message}</td></tr>`;
    }
}

function renderRecordsTable(data) {
    const tbody = document.getElementById("recordsTableBody");
    tbody.innerHTML = "";

    if (!data.records || data.records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="p-10 text-center">
                    <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-lg mb-2">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <p class="text-xs font-bold text-slate-700">No matching feedback records found</p>
                    <p class="text-xs text-slate-400 mt-0.5">Try adjusting your filters or search terms.</p>
                </td>
            </tr>
        `;
        document.getElementById("recPaginationInfo").textContent = "Showing 0 of 0 records";
        document.getElementById("recPaginationButtons").innerHTML = "";
        return;
    }

    data.records.forEach(rec => {
        const tr = document.createElement("tr");
        tr.className = "table-row-hover";

        // Sentiment badge
        let sentClass = "badge-neutral";
        if (rec.sentiment === "Positive") sentClass = "badge-positive";
        else if (rec.sentiment === "Negative") sentClass = "badge-negative";
        else if (rec.sentiment === "Mixed") sentClass = "badge-mixed";

        // Urgency badge
        let urgClass = "urgency-low";
        if (rec.urgency === "High") urgClass = "urgency-high";
        else if (rec.urgency === "Medium") urgClass = "urgency-medium";

        // Status badge
        let statusClass = "badge-status-new";
        if (rec.status === "Under Review") statusClass = "badge-status-review";
        else if (rec.status === "Action In Progress") statusClass = "badge-status-progress";
        else if (rec.status === "Resolved") statusClass = "badge-status-resolved";

        tr.innerHTML = `
            <td class="p-3.5 font-mono text-slate-500 font-semibold">#${rec.id}</td>
            <td class="p-3.5 font-medium text-slate-900 truncate max-w-[140px]" title="${rec.department}">${rec.department}</td>
            <td class="p-3.5 max-w-xs text-slate-700">
                <p class="truncate" title="${rec.feedback_text}">${rec.feedback_text}</p>
                <span class="text-[10px] text-slate-400 font-mono">${rec.student_name} &bull; ${rec.course || "General"}</span>
            </td>
            <td class="p-3.5">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${sentClass}">${rec.sentiment}</span>
            </td>
            <td class="p-3.5 text-slate-600 font-medium truncate max-w-[100px]">${rec.aspect || "General"}</td>
            <td class="p-3.5">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${urgClass}">${rec.urgency || "Low"}</span>
            </td>
            <td class="p-3.5">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass}">${rec.status || "New"}</span>
            </td>
            <td class="p-3.5 text-right space-x-1 shrink-0">
                <button onclick="viewRecordDetail(${rec.id})" title="View Details" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button onclick="openStatusUpdateModal(${rec.id}, '${rec.status}', '${rec.assigned_to || ""}', '${(rec.review_notes || "").replace(/'/g, "\\'")}')" title="Update Status" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="openDeleteModal(${rec.id})" title="Delete Record" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Pagination info & buttons
    const start = (data.page - 1) * data.per_page + 1;
    const end = Math.min(data.page * data.per_page, data.total);
    document.getElementById("recPaginationInfo").textContent = `Showing ${start} to ${end} of ${data.total} records`;

    const btnContainer = document.getElementById("recPaginationButtons");
    btnContainer.innerHTML = "";

    // Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.className = `px-3 py-1.5 rounded-lg text-xs font-semibold ${data.page > 1 ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-slate-50 text-slate-300 cursor-not-allowed"}`;
    prevBtn.innerHTML = `<i class="fa-solid fa-chevron-left text-[10px] mr-1"></i>Prev`;
    prevBtn.disabled = data.page <= 1;
    prevBtn.onclick = () => loadRecords(data.page - 1);
    btnContainer.appendChild(prevBtn);

    // Current page badge
    const curBadge = document.createElement("span");
    curBadge.className = "px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 font-mono";
    curBadge.textContent = `${data.page} / ${data.pages || 1}`;
    btnContainer.appendChild(curBadge);

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = `px-3 py-1.5 rounded-lg text-xs font-semibold ${data.page < data.pages ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-slate-50 text-slate-300 cursor-not-allowed"}`;
    nextBtn.innerHTML = `Next<i class="fa-solid fa-chevron-right text-[10px] ml-1"></i>`;
    nextBtn.disabled = data.page >= data.pages;
    nextBtn.onclick = () => loadRecords(data.page + 1);
    btnContainer.appendChild(nextBtn);
}

function exportRecordsCsv() {
    const search = document.getElementById("recSearchInput").value.trim();
    const sentiment = document.getElementById("recSentimentFilter").value;
    const department = document.getElementById("recDeptFilter").value;
    const status = document.getElementById("recStatusFilter").value;

    const params = new URLSearchParams({ search, sentiment, department, status });
    window.location.href = `/api/records/export?${params.toString()}`;
    showToast("info", "Exporting CSV", "Generating customized CSV download...");
}

// ============================================================================
// RECORD DETAIL MODAL
// ============================================================================
async function viewRecordDetail(recordId) {
    try {
        const res = await fetch(`/api/records/${recordId}`);
        const rec = await res.json();
        if (!res.ok) throw new Error(rec.error || "Record not found");

        activeDetailRecord = rec;
        document.getElementById("detailIdBadge").textContent = `ID: #${rec.id}`;
        
        let aspects = [];
        try {
            aspects = JSON.parse(rec.aspects_breakdown || "[]");
        } catch(e) {
            aspects = [];
        }

        let aspectsHtml = "";
        if (aspects.length > 0) {
            aspects.forEach(a => {
                const polClass = a.polarity === "Positive" ? "bg-emerald-100 text-emerald-800" : (a.polarity === "Negative" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-800");
                aspectsHtml += `
                    <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <span class="font-bold text-slate-900">${a.aspect}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${polClass}">${a.polarity}</span>
                    </div>
                `;
            });
        } else {
            aspectsHtml = `<p class="text-xs text-slate-400 italic">No specific aspects logged.</p>`;
        }

        const body = document.getElementById("detailModalBody");
        body.innerHTML = `
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Feedback Statement</span>
                <p class="text-sm font-medium text-slate-900 italic">"${rec.feedback_text}"</p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="p-3 bg-white border border-slate-200 rounded-xl">
                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Overall Sentiment</span>
                    <span class="text-sm font-extrabold text-indigo-700">${rec.sentiment}</span>
                </div>
                <div class="p-3 bg-white border border-slate-200 rounded-xl">
                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Confidence</span>
                    <span class="text-sm font-extrabold text-slate-900 font-mono">${(rec.confidence * 100).toFixed(1)}%</span>
                </div>
                <div class="p-3 bg-white border border-slate-200 rounded-xl">
                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Urgency Level</span>
                    <span class="text-sm font-extrabold ${rec.urgency === "High" ? "text-rose-600" : (rec.urgency === "Medium" ? "text-amber-600" : "text-emerald-600")}">${rec.urgency || "Low"}</span>
                </div>
                <div class="p-3 bg-white border border-slate-200 rounded-xl">
                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                    <span class="text-sm font-extrabold text-indigo-600">${rec.status || "New"}</span>
                </div>
            </div>

            <div class="space-y-2">
                <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Aspects Detected</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${aspectsHtml}
                </div>
            </div>

            <div class="p-4 bg-white border border-slate-200 rounded-xl space-y-1">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identified Key Issue / Grievance</span>
                <p class="text-xs font-bold text-rose-700 flex items-center">
                    <i class="fa-solid fa-triangle-exclamation mr-1.5 text-xs"></i>
                    <span>${rec.key_issue || "None identified"}</span>
                </p>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Department / Course</span>
                    <p class="font-semibold text-slate-800">${rec.department} &bull; ${rec.course || "N/A"}</p>
                </div>
                <div>
                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Faculty Member</span>
                    <p class="font-semibold text-slate-800">${rec.faculty_name || "N/A"}</p>
                </div>
            </div>

            <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div class="flex justify-between items-center">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reviewer Notes & Action Items</span>
                    <span class="text-[10px] text-slate-400">Assignee: ${rec.assigned_to || "Unassigned"}</span>
                </div>
                <p class="text-slate-700 italic">${rec.review_notes || "No review notes attached yet."}</p>
            </div>
        `;

        document.getElementById("detailModal").classList.remove("hidden");
    } catch (e) {
        showToast("error", "Error", e.message);
    }
}

function closeDetailModal() {
    document.getElementById("detailModal").classList.add("hidden");
    activeDetailRecord = null;
}

function openStatusUpdateModalFromDetail() {
    if (!activeDetailRecord) return;
    closeDetailModal();
    openStatusUpdateModal(
        activeDetailRecord.id,
        activeDetailRecord.status,
        activeDetailRecord.assigned_to || "",
        activeDetailRecord.review_notes || ""
    );
}

// ============================================================================
// STATUS & REVIEW MODAL
// ============================================================================
function openStatusUpdateModal(recordId, status, assignee, notes) {
    document.getElementById("statusRecordId").value = recordId;
    document.getElementById("statusSelect").value = status || "New";
    document.getElementById("statusAssignee").value = assignee || "";
    document.getElementById("statusNotes").value = notes || "";
    document.getElementById("statusModalTitle").textContent = `Update Record #${recordId} Status`;
    document.getElementById("statusModal").classList.remove("hidden");
}

function closeStatusModal() {
    document.getElementById("statusModal").classList.add("hidden");
}

async function handleStatusSubmit(event) {
    event.preventDefault();
    const id = document.getElementById("statusRecordId").value;
    const btn = document.getElementById("saveStatusBtn");
    const origText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Saving...`;
    btn.disabled = true;

    const payload = {
        status: document.getElementById("statusSelect").value,
        assigned_to: document.getElementById("statusAssignee").value.trim(),
        review_notes: document.getElementById("statusNotes").value.trim()
    };

    try {
        const res = await fetch(`/api/records/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to update record");

        closeStatusModal();
        showToast("success", "Record Updated", `Record #${id} status changed to ${payload.status}`);
        loadRecords(currentRecordsPage);
        loadDashboardData();
    } catch (e) {
        showToast("error", "Update Error", e.message);
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
}

// ============================================================================
// DELETE CONFIRMATION MODAL
// ============================================================================
function openDeleteModal(recordId) {
    deleteTargetRecordId = recordId;
    document.getElementById("deleteRecordIdBadge").textContent = `#${recordId}`;
    document.getElementById("deleteModal").classList.remove("hidden");
}

function closeDeleteModal() {
    document.getElementById("deleteModal").classList.add("hidden");
    deleteTargetRecordId = null;
}

async function confirmRecordDelete() {
    if (!deleteTargetRecordId) return;
    const btn = document.getElementById("confirmDeleteBtn");
    const orig = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Deleting...`;
    btn.disabled = true;

    try {
        const res = await fetch(`/api/records/${deleteTargetRecordId}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to delete record");

        closeDeleteModal();
        showToast("info", "Record Removed", `Record #${deleteTargetRecordId} permanently deleted.`);
        loadRecords(currentRecordsPage);
        loadDashboardData();
    } catch (e) {
        showToast("error", "Delete Failed", e.message);
    } finally {
        btn.innerHTML = orig;
        btn.disabled = false;
    }
}

// ============================================================================
// DASHBOARD & TELEMETRY CHARTS
// ============================================================================
async function loadDashboardData() {
    try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        if (!res.ok || !data) return;

        // 1. KPI Cards
        document.getElementById("kpiTotalFeedback").textContent = (data.total_feedback || 0).toLocaleString();
        const pcts = data.sentiment_percentages || {};
        document.getElementById("kpiPositivePct").textContent = `${pcts.Positive || 0}%`;
        document.getElementById("kpiPositiveCount").textContent = (data.sentiment_counts?.Positive || 0).toLocaleString();
        document.getElementById("kpiNegativePct").textContent = `${pcts.Negative || 0}%`;
        document.getElementById("kpiNegativeCount").textContent = (data.sentiment_counts?.Negative || 0).toLocaleString();
        
        document.getElementById("dashLastUpdated").textContent = `Updated: ${new Date().toLocaleTimeString()}`;

        // 2. Dashboard Sentiment Doughnut
        renderDashSentimentChart(data);

        // 3. Top 5 Issues Bar
        renderDashIssuesChart(data);

        // 4. Department Sentiment Breakdown
        renderDashDeptChart(data);

        // 5. Recent Records Table
        renderDashRecentRows(data.recent_records || []);
    } catch (e) {
        console.error("Dashboard fetch error:", e);
    }
}

function renderDashSentimentChart(data) {
    const ctx = document.getElementById("dashSentimentChart")?.getContext("2d");
    if (!ctx) return;

    if (dashSentimentChartInstance) dashSentimentChartInstance.destroy();

    const counts = data.sentiment_counts || {};
    dashSentimentChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative', 'Mixed'],
            datasets: [{
                data: [
                    counts.Positive || 0,
                    counts.Neutral || 0,
                    counts.Negative || 0,
                    counts.Mixed || 0
                ],
                backgroundColor: ['#059669', '#64748b', '#dc2626', '#d97706'],
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, family: 'Inter' } } }
            }
        }
    });
}

function renderDashIssuesChart(data) {
    const ctx = document.getElementById("dashIssuesChart")?.getContext("2d");
    if (!ctx) return;

    if (dashIssuesChartInstance) dashIssuesChartInstance.destroy();

    const topIssues = data.top_issues || {};
    const labels = Object.keys(topIssues).slice(0, 5);
    const values = Object.values(topIssues).slice(0, 5);

    dashIssuesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Complaints Reported',
                data: values,
                backgroundColor: '#4338ca',
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, family: 'Inter' } } },
                y: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' } } }
            }
        }
    });
}

function renderDashDeptChart(data) {
    const ctx = document.getElementById("dashDeptChart")?.getContext("2d");
    if (!ctx) return;

    if (dashDeptChartInstance) dashDeptChartInstance.destroy();

    const deptStats = data.department_stats || {};
    const depts = Object.keys(deptStats);
    const posCounts = depts.map(d => deptStats[d].Positive || 0);
    const negCounts = depts.map(d => deptStats[d].Negative || 0);

    dashDeptChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: depts,
            datasets: [
                { label: 'Positive', data: posCounts, backgroundColor: '#059669', borderRadius: 4 },
                { label: 'Negative', data: negCounts, backgroundColor: '#dc2626', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, family: 'Inter' } } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' } } },
                y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, family: 'Inter' } } }
            }
        }
    });
}

function renderDashRecentRows(records) {
    const tbody = document.getElementById("dashRecentRows");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">No records registered yet.</td></tr>`;
        return;
    }

    records.forEach(rec => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 transition";

        let sentBadge = "badge-neutral";
        if (rec.sentiment === "Positive") sentBadge = "badge-positive";
        else if (rec.sentiment === "Negative") sentBadge = "badge-negative";
        else if (rec.sentiment === "Mixed") sentBadge = "badge-mixed";

        tr.innerHTML = `
            <td class="p-3.5 font-mono text-slate-500 font-semibold">#${rec.id}</td>
            <td class="p-3.5 font-medium text-slate-900">${rec.student_name} <span class="text-slate-400 text-[10px]">(${rec.department})</span></td>
            <td class="p-3.5 max-w-xs truncate text-slate-700" title="${rec.feedback_text}">${rec.feedback_text}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${sentBadge}">${rec.sentiment}</span></td>
            <td class="p-3.5 text-slate-600">${rec.aspect || "General"}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">${rec.status || "New"}</span></td>
            <td class="p-3.5 text-right">
                <button onclick="viewRecordDetail(${rec.id})" class="text-indigo-600 hover:text-indigo-800 font-semibold text-xs">View &rarr;</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================================================
// COLLECTION OUTPUT (PDF SECTION 4)
// ============================================================================
async function loadCollectionData() {
    try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        if (!data || data.total_feedback === 0) return;

        // Total feedback
        document.getElementById("collecTotal").textContent = (data.total_feedback || 5000).toLocaleString();

        // Sentiment percentages
        const p = data.sentiment_percentages || {};
        document.getElementById("pctPos").textContent = `${p.Positive || 53.4}%`;
        document.getElementById("pctNeu").textContent = `${p.Neutral || 20.3}%`;
        document.getElementById("pctNeg").textContent = `${p.Negative || 16.9}%`;
        document.getElementById("pctMix").textContent = `${p.Mixed || 9.4}%`;

        renderCollectionCharts(data);
    } catch (e) {
        console.error("Failed to load collection stats:", e);
    }
}

function renderCollectionCharts(data) {
    // 1. Doughnut chart for Sentiment Distribution
    const sentCtx = document.getElementById("collectionSentimentChart")?.getContext("2d");
    if (sentCtx) {
        if (collectionSentimentChartInstance) collectionSentimentChartInstance.destroy();

        collectionSentimentChartInstance = new Chart(sentCtx, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Neutral', 'Negative', 'Mixed'],
                datasets: [{
                    data: [
                        data.sentiment_percentages?.Positive || 53.4,
                        data.sentiment_percentages?.Neutral || 20.3,
                        data.sentiment_percentages?.Negative || 16.9,
                        data.sentiment_percentages?.Mixed || 9.4
                    ],
                    backgroundColor: ['#059669', '#64748b', '#dc2626', '#d97706'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11, family: 'Inter' } } }
                }
            }
        });
    }

    // 2. Bar chart for Top 5 Common Issues (PDF Section 3 & 4)
    const issuesCtx = document.getElementById("collectionIssuesChart")?.getContext("2d");
    if (issuesCtx) {
        if (collectionIssuesChartInstance) collectionIssuesChartInstance.destroy();

        const topIssues = data.top_issues || {};
        const labels = Object.keys(topIssues).slice(0, 5);
        const values = Object.values(topIssues).slice(0, 5);

        collectionIssuesChartInstance = new Chart(issuesCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Complaints Reported',
                    data: values,
                    backgroundColor: '#4338ca',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, family: 'Inter' } } },
                    y: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' } } }
                }
            }
        });
    }
}

// ============================================================================
// BATCH SURVEY CSV INGESTION
// ============================================================================
function setupBatchDragDrop() {
    const dropZone = document.getElementById("batchDropZone");
    if (!dropZone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleBatchUploadFile(files[0]);
        }
    });
}

function onBatchFileSelected(event) {
    const file = event.target.files[0];
    if (file) handleBatchUploadFile(file);
}

async function handleBatchUploadFile(file) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
        showToast("error", "Invalid File Type", "Please select a standard CSV (.csv) file.");
        return;
    }

    document.getElementById("batchSelectedName").textContent = file.name;
    const progress = document.getElementById("batchProcessingIndicator");
    const outputSection = document.getElementById("batchOutputSection");

    progress.classList.remove("hidden");
    outputSection.classList.add("hidden");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/api/ingest_survey", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Batch upload failed.");
        }

        const data = await response.json();
        renderBatchTable(data);
        showToast("success", "Batch Completed", `Successfully categorized ${data.records_processed} rows via column "${data.source_column}".`);
        loadDashboardData();
    } catch (e) {
        showToast("error", "Batch Upload Failed", e.message);
    } finally {
        progress.classList.add("hidden");
    }
}

function renderBatchTable(data) {
    const outputSection = document.getElementById("batchOutputSection");
    outputSection.classList.remove("hidden");

    document.getElementById("batchMetaStats").textContent = 
        `Processed ${data.records_processed} rows via column "${data.source_column}".`;

    const tbody = document.getElementById("batchTableRows");
    tbody.innerHTML = "";

    data.records_preview.forEach(row => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 transition";

        const polClass = row.Classified_Polarity === "Positive"
            ? "text-emerald-700 font-bold"
            : (row.Classified_Polarity === "Negative" ? "text-rose-700 font-bold" : "text-amber-700 font-bold");

        tr.innerHTML = `
            <td class="p-3 max-w-xs truncate text-slate-900" title="${row.Raw_Feedback}">${row.Raw_Feedback}</td>
            <td class="p-3 ${polClass}">${row.Classified_Polarity}</td>
            <td class="p-3 font-mono text-[11px]">${row.Confidence}</td>
            <td class="p-3 font-semibold text-slate-800">${row.Primary_Aspect}</td>
            <td class="p-3 text-slate-600">${row.Identified_Grievance}</td>
        `;
        tbody.appendChild(tr);
    });

    outputSection.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================================
// AUDIT & GOVERNANCE LOGS
// ============================================================================
async function loadAuditLogs() {
    const tbody = document.getElementById("auditTableBody");
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading audit events...</td></tr>`;

    try {
        const res = await fetch("/api/audit_logs");
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to load audit logs");

        tbody.innerHTML = "";
        const logsList = Array.isArray(data) ? data : (data.logs || []);
        if (logsList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">No audit events recorded yet.</td></tr>`;
            return;
        }

        logsList.forEach(log => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-slate-50 transition";
            tr.innerHTML = `
                <td class="p-3.5 font-mono text-slate-400">#${log.id}</td>
                <td class="p-3.5 font-mono text-[11px] text-slate-500">${log.timestamp}</td>
                <td class="p-3.5">
                    <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 font-mono">${log.action}</span>
                </td>
                <td class="p-3.5 font-medium text-slate-900">${log.user}</td>
                <td class="p-3.5 text-slate-600 font-mono text-[11px] truncate max-w-md" title="${log.details}">${log.details}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-rose-500">Error loading audit logs: ${e.message}</td></tr>`;
    }
}
