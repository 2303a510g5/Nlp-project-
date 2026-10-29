/**
 * Student Feedback Analyzer - NLP Project Controller
 * Direct implementation of Project PDF Specification
 */

let collectionSentimentChartInstance = null;
let collectionIssuesChartInstance = null;
let collectionDataLoaded = false;

document.addEventListener("DOMContentLoaded", () => {
    setupCharCounter();
    // Pre-populate with default PDF example on load
    runPdfMixedBenchmark();
});

// ---------------------------------------------------------------------------
// 1. Tab Navigation
// ---------------------------------------------------------------------------
function switchTab(tabId) {
    document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.add("hidden"));
    document.querySelectorAll(".nav-tab").forEach(tab => tab.classList.remove("active"));

    const targetPane = document.getElementById(`tab-${tabId}`);
    const targetBtn = document.getElementById(`tab-btn-${tabId}`);

    if (targetPane) targetPane.classList.remove("hidden");
    if (targetBtn) targetBtn.classList.add("active");

    if (tabId === "collection" && !collectionDataLoaded) {
        loadCollectionData();
    }
}

function setupCharCounter() {
    const input = document.getElementById("feedbackInput");
    if (input) {
        input.addEventListener("input", () => {
            document.getElementById("charCount").textContent = `${input.value.length} characters`;
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

// ---------------------------------------------------------------------------
// 2. 1-Click PDF Benchmark Case (Section 3 of PDF)
// ---------------------------------------------------------------------------
function runPdfMixedBenchmark() {
    const input = document.getElementById("feedbackInput");
    input.value = "The faculty explains concepts clearly, but the lab computers are very slow.";
    document.getElementById("charCount").textContent = `${input.value.length} characters`;
    evaluateSingleComment();
}

// ---------------------------------------------------------------------------
// 3. Single Feedback Evaluation
// ---------------------------------------------------------------------------
async function evaluateSingleComment() {
    const input = document.getElementById("feedbackInput");
    const text = input.value.trim();

    if (!text) {
        alert("Please enter feedback text to analyze.");
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
    } catch (e) {
        alert("Evaluation Error: " + e.message);
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

function renderPdfOutput(report, originalText) {
    // 1. Table Input Text
    document.getElementById("pdfTableInput").textContent = `"${originalText}"`;
    document.getElementById("auditIdBadge").textContent = `ID: ${report.submission_id || "FB-001"}`;

    // 2. Overall Sentiment
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
    document.getElementById("pipeCleaned").textContent = report.normalized_text || "(empty)";
    document.getElementById("pipeTokens").textContent = JSON.stringify(report.tokens || []);
    document.getElementById("pipeStopwords").textContent = JSON.stringify(report.tokens_filtered || []);
    document.getElementById("pipeLemmas").textContent = JSON.stringify(report.lemmatized_tokens || []);
}

// ---------------------------------------------------------------------------
// 4. Collection Output (Page 1 & 2 of PDF)
// ---------------------------------------------------------------------------
async function loadCollectionData() {
    try {
        const response = await fetch("/api/dashboard");
        const data = await response.json();

        if (!data || data.total_feedback === 0) return;

        // Total feedback
        document.getElementById("collecTotal").textContent = data.total_feedback.toLocaleString();

        // Sentiment percentages
        const p = data.sentiment_percentages || {};
        document.getElementById("pctPos").textContent = `${p.Positive || 0}%`;
        document.getElementById("pctNeu").textContent = `${p.Neutral || 0}%`;
        document.getElementById("pctNeg").textContent = `${p.Negative || 0}%`;
        document.getElementById("pctMix").textContent = `${p.Mixed || 0}%`;

        renderCollectionCharts(data);
        collectionDataLoaded = true;
    } catch (e) {
        console.error("Failed to load collection stats:", e);
    }
}

function renderCollectionCharts(data) {
    // 1. Doughnut chart for Sentiment Distribution
    const sentCtx = document.getElementById("collectionSentimentChart").getContext("2d");
    if (collectionSentimentChartInstance) collectionSentimentChartInstance.destroy();

    collectionSentimentChartInstance = new Chart(sentCtx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Neutral', 'Negative', 'Mixed'],
            datasets: [{
                data: [
                    data.sentiment_percentages.Positive || 0,
                    data.sentiment_percentages.Neutral || 0,
                    data.sentiment_percentages.Negative || 0,
                    data.sentiment_percentages.Mixed || 0
                ],
                backgroundColor: ['#10b981', '#94a3b8', '#ef4444', '#f59e0b'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
            }
        }
    });

    // 2. Bar chart for Top 5 Common Issues (PDF Section 3 & 4)
    const issuesCtx = document.getElementById("collectionIssuesChart").getContext("2d");
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
                backgroundColor: '#6366f1',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                y: { grid: { display: false }, ticks: { font: { size: 10 } } }
            }
        }
    });
}

// ---------------------------------------------------------------------------
// 5. Batch CSV Upload Subsystem
// ---------------------------------------------------------------------------
async function onBatchFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

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
    } catch (e) {
        alert("Batch Error: " + e.message);
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
