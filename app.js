const STORAGE_KEY = "followup-crm-state-v4";
const DEFAULT_QUALIFIED_STATUS = "Qualified Not Called";
const DEFAULT_LEAD_REMARK = "Qualified Not Called";
const DEFAULT_CATALOG_MESSAGE =
  "Hi {leadName}, sharing the Cult Equipment catalog for your gym planning. Please review and tell me what equipment setup you are looking for.";
const VALID_USERS = [
  { email: "syed.hussain@curefit.com", password: "Curefit@2026" },
  { email: "vinay.kh@curefit.com", password: "Curefit@2026" },
];
const ASM_NAMES = [
  "Sanjay",
  "mohit",
  "govind",
  "atul",
  "vikas",
  "mohan",
  "ramesh",
  "om",
  "fauzan",
];
const LEAD_STATUSES = [
  "Qualified Not Called",
  "Casual Enquiry",
  "Franchise",
  "Sale Discussion",
  "Sale Done",
  "Not Responding",
  "Quotation Sent",
  "Waiting for response",
  "Lost",
];
const FUNNEL_STAGES = [
  {
    label: "Qualified Leads",
    helper: "",
    statuses: ["Qualified Not Called", "Casual Enquiry"],
    color: "#38bdf8",
  },
  {
    label: "Quotation Sent",
    helper: "Commercial proposal shared",
    statuses: ["Quotation Sent"],
    color: "#ed2f7b",
  },
  {
    label: "Waiting Response",
    helper: "Decision or reply pending",
    statuses: ["Waiting for response", "Not Responding"],
    color: "#f5d636",
  },
  {
    label: "Sale Discussion",
    helper: "Advanced closure discussion",
    statuses: ["Sale Discussion", "Franchise"],
    color: "#c99a2e",
  },
  {
    label: "Sale Done",
    helper: "Converted to sale",
    statuses: ["Sale Done"],
    color: "#1fae57",
  },
];
const SUPABASE_CONFIG = window.CRM_SUPABASE_CONFIG || {};
const supabaseClient =
  SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && window.supabase
    ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
    : null;

const seedState = {
  session: null,
  selectedLeadId: "",
  deletedLeadDateFilter: "",
  leads: [],
  deletedLeads: [],
  followups: [],
  calls: [],
  userTemplates: {},
};

let state = loadState();

const authPanel = document.querySelector("#authPanel");
const dashboardShell = document.querySelector("#dashboardShell");
const loginForm = document.querySelector("#loginForm");
const authError = document.querySelector("#authError");
const logoutBtn = document.querySelector("#logoutBtn");
const userName = document.querySelector("#userName");
const userEmail = document.querySelector("#userEmail");
const viewTitle = document.querySelector("#viewTitle");
const viewEyebrow = document.querySelector("#viewEyebrow");
const metricGrid = document.querySelector("#metricGrid");
const funnelStageList = document.querySelector("#funnelStageList");
const funnelSummary = document.querySelector("#funnelSummary");
const todayFollowups = document.querySelector("#todayFollowups");
const recentCalls = document.querySelector("#recentCalls");
const leadsTable = document.querySelector("#leadsTable");
const deletedLeadsTable = document.querySelector("#deletedLeadsTable");
const deletedLeadDateFilter = document.querySelector("#deletedLeadDateFilter");
const bulkDeleteDeletedLeadsBtn = document.querySelector("#bulkDeleteDeletedLeadsBtn");
const leadDetail = document.querySelector("#leadDetail");
const leadDetailName = document.querySelector("#leadDetailName");
const followupList = document.querySelector("#followupList");
const callList = document.querySelector("#callList");
const leadForm = document.querySelector("#leadForm");
const bulkLeadForm = document.querySelector("#bulkLeadForm");
const bulkLeadResult = document.querySelector("#bulkLeadResult");
const templateForm = document.querySelector("#templateForm");
const leadModalTitle = document.querySelector("#leadModalTitle");
const leadSubmitBtn = document.querySelector("#leadSubmitBtn");
const lostReasonField = document.querySelector("#lostReasonField");
const competitionQuoteField = document.querySelector("#competitionQuoteField");
const followupForm = document.querySelector("#followupForm");
const callForm = document.querySelector("#callForm");
const reassignForm = document.querySelector("#reassignForm");
const reassignLeadHint = document.querySelector("#reassignLeadHint");
const followupLeadSelect = document.querySelector("#followupLeadSelect");
const callLeadSelect = document.querySelector("#callLeadSelect");

initialize();
document.documentElement.dataset.crmAppReady = "true";

async function initialize() {
  state = normalizeState(state);
  bindNavigation();
  bindModals();
  bindAuth();
  bindForms();
  await restoreSupabaseSession();
  refreshApp();
  scheduleAllNotifications();
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      document.querySelectorAll(".view").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `${view}View`);
      });
      const titleMap = {
        overview: ["Overview", "Daily operating view"],
        salesFunnel: ["Sales Funnel", "Qualified lead conversion report"],
        leads: ["Leads", "Capture and qualify customer demand"],
        deletedLeads: ["Deleted Leads", "Deleted lead history"],
        followups: ["Follow-ups", "Reminder queue for every active conversation"],
        calls: ["Call Log", "Tracked customer conversations"],
      };
      const [title, eyebrow] = titleMap[view];
      viewTitle.textContent = title;
      viewEyebrow.textContent = eyebrow;
    });
  });
}

function bindModals() {
  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = document.getElementById(button.dataset.openModal);
      if (button.dataset.openModal === "leadModal") {
        resetLeadForm();
      }
      if (button.dataset.openModal === "bulkLeadModal") {
        resetBulkLeadForm();
      }
      if (button.dataset.openModal === "templateModal") {
        resetTemplateForm();
      }
      populateLeadSelects();
      primeDefaultTimes();
      modal.showModal();
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.closeModal).close();
    });
  });
}

function bindAuth() {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#loginEmail").value.trim();
    const password = document.querySelector("#loginPassword").value;

    const authResult = supabaseClient
      ? await signInWithSupabase(email, password)
      : signInLocally(email, password);

    if (!authResult.ok) {
      authError.textContent = authResult.message || "Invalid email or password.";
      authError.classList.remove("hidden");
      return;
    }

    authError.classList.add("hidden");
    saveState();
    refreshApp();
    loginForm.reset();
  });

  logoutBtn.addEventListener("click", async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    state.session = null;
    saveState();
    refreshApp();
  });
}

async function signInWithSupabase(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  applyAuthenticatedUser(data.user);
  return { ok: true };
}

function signInLocally(email, password) {
  if (!isValidUser(email, password)) {
    return { ok: false, message: "Invalid email or password." };
  }

  applyAuthenticatedUser({ email });
  return { ok: true };
}

async function restoreSupabaseSession() {
  if (!supabaseClient) return;

  const { data } = await supabaseClient.auth.getSession();
  if (data.session?.user) {
    applyAuthenticatedUser(data.session.user);
    saveState();
  } else if (state.session?.provider === "supabase") {
    state.session = null;
    saveState();
  }
}

function applyAuthenticatedUser(user) {
  const email = user.email || "";
  const sessionName = email.split("@")[0].replace(/[._-]/g, " ");
  state.session = {
    name: toTitleCase(user.user_metadata?.full_name || sessionName || "sales user"),
    email,
    provider: supabaseClient ? "supabase" : "local",
    userId: user.id || "",
  };
}

function isValidUser(email, password) {
  return VALID_USERS.some(
    (user) => user.email === email.toLowerCase() && user.password === password
  );
}

function isAllowedEmail(email) {
  return VALID_USERS.some((user) => user.email === String(email).toLowerCase());
}

function bindForms() {
  leadForm.elements.namedItem("status").addEventListener("change", toggleLostFields);
  leadForm.elements.namedItem("lostReason").addEventListener("change", toggleLostFields);
  reassignForm.elements
    .namedItem("mobileSearch")
    .addEventListener("input", handleReassignMobileSearch);
  bulkLeadForm.elements
    .namedItem("csvFile")
    .addEventListener("change", handleBulkCsvFile);
  deletedLeadDateFilter.addEventListener("change", () => {
    state.deletedLeadDateFilter = deletedLeadDateFilter.value;
    saveState();
    renderDeletedLeads();
  });
  bulkDeleteDeletedLeadsBtn.addEventListener("click", permanentlyDeleteFilteredLeads);

  templateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.userTemplates[state.session.email] = {
      catalogMessage: templateForm.elements.namedItem("catalogMessage").value.trim(),
    };
    persistAndRender();
    closeModal("templateModal");
  });

  leadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(leadForm);
    const leadId = formData.get("leadId");
    const leadData = {
      asmName: formData.get("asmName").trim(),
      leadName: formData.get("leadName").trim(),
      mobile: formData.get("mobile").trim(),
      status: formData.get("status"),
      lostReason: formData.get("status") === "Lost" ? formData.get("lostReason").trim() : "",
      competitionQuote:
        formData.get("status") === "Lost" && formData.get("lostReason") === "Competitor"
          ? formData.get("competitionQuote").trim()
          : "",
      gymOpeningDate: formData.get("gymOpeningDate"),
      saleValue: Number(formData.get("saleValue") || 0),
      remark: normalizeLeadRemark(formData.get("remark")),
    };

    if (leadId) {
      const lead = state.leads.find((item) => item.id === leadId);
      if (!lead) return;

      const changes = getLeadChanges(lead, leadData);
      if (changes.length) {
        lead.editHistory = [
          createLeadEditHistory(changes),
          ...(lead.editHistory || []),
        ];
      }

      if (lead.status !== leadData.status) {
        lead.statusHistory = [
          createStatusChange(lead.status, leadData.status),
          ...(lead.statusHistory || []),
        ];
      }
      Object.assign(lead, leadData);
      state.selectedLeadId = leadId;
    } else {
      const lead = {
        id: createId(),
        ...leadData,
        nextFollowup: "",
        statusHistory: [],
        editHistory: [],
        createdAt: new Date().toISOString().slice(0, 16),
      };
      state.leads.unshift(lead);
      state.selectedLeadId = lead.id;
    }

    persistAndRender();
    closeModal("leadModal");
    resetLeadForm();
  });

  bulkLeadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const csvText = bulkLeadForm.elements.namedItem("csvText").value.trim();
    const result = importBulkLeads(csvText);
    showBulkImportResult(result);
    if (result.imported > 0) {
      persistAndRender();
      bulkLeadForm.elements.namedItem("csvFile").value = "";
      bulkLeadForm.elements.namedItem("csvText").value = "";
    }
  });

  followupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(followupForm);
    const lead = state.leads.find((item) => item.id === formData.get("leadId"));
    if (lead) {
      lead.nextFollowup = formData.get("dueAt");
      scheduleNotification(lead);
    }

    state.followups.unshift({
      id: createId(),
      leadId: formData.get("leadId"),
      title: formData.get("title").trim(),
      priority: formData.get("priority"),
      dueAt: formData.get("dueAt"),
      completed: false,
    });
    persistAndRender();
    closeModal("followupModal");
    followupForm.reset();
  });

  callForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(callForm);
    const leadId = formData.get("leadId");
    const nextFollowup = formData.get("nextFollowup");

    state.calls.unshift({
      id: createId(),
      leadId,
      outcome: formData.get("outcome"),
      calledAt: formData.get("calledAt"),
      summary: formData.get("summary").trim(),
      createdAt: new Date().toISOString(),
    });

    if (nextFollowup) {
      const lead = state.leads.find((item) => item.id === leadId);
      if (lead) {
        lead.nextFollowup = nextFollowup;
        scheduleNotification(lead);
      }

      state.followups.unshift({
        id: createId(),
        leadId,
        title: `Follow-up after ${formData.get("outcome").toLowerCase()} call`,
        priority: "Medium",
        dueAt: nextFollowup,
        completed: false,
      });
    }

    persistAndRender();
    closeModal("callModal");
    callForm.reset();
  });

  reassignForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(reassignForm);
    const lead = state.leads.find((item) => item.id === formData.get("leadId"));
    if (!lead) {
      updateReassignLeadHint(null, formData.get("mobileSearch"));
      return;
    }

    const nextAsmName = formData.get("asmName");
    if (lead.asmName !== nextAsmName) {
      lead.editHistory = [
        createLeadEditHistory([
          {
            field: "asmName",
            label: "ASM name",
            fromValue: lead.asmName,
            toValue: nextAsmName,
          },
        ]),
        ...(lead.editHistory || []),
      ];
    }
    lead.asmName = nextAsmName;
    state.selectedLeadId = lead.id;

    persistAndRender();
    closeModal("reassignModal");
    reassignForm.reset();
  });
}

function refreshApp() {
  const loggedIn = Boolean(state.session);
  if (loggedIn && !supabaseClient && !isAllowedEmail(state.session.email)) {
    state.session = null;
    saveState();
  }

  const hasValidSession = Boolean(state.session);
  authPanel.classList.toggle("hidden", hasValidSession);
  dashboardShell.classList.toggle("hidden", !hasValidSession);

  if (!hasValidSession) return;

  userName.textContent = state.session.name;
  userEmail.textContent = state.session.email;
  renderMetrics();
  renderFunnelReport();
  renderOverviewLists();
  renderLeads();
  renderDeletedLeads();
  renderLeadDetail();
  renderFollowups();
  renderCalls();
  populateLeadSelects();
}

function renderMetrics() {
  const today = todayKey();
  const dueToday = state.followups.filter(
    (item) => !item.completed && item.dueAt.slice(0, 10) === today
  ).length;
  const openLeads = state.leads.filter((lead) => lead.status !== "Lost" && lead.status !== "Sale Done").length;
  const riskLeads = state.leads.filter(isQualifiedUncalledRisk).length;
  const revenue = getTotalRevenue();

  metricGrid.innerHTML = [
    metricCard("Open leads", openLeads, "Qualified not called and active opportunities"),
    metricCard("Due today", dueToday, "Calls and reminders needing attention"),
    metricCard("Revenue", formatCurrency(revenue), "Sale Done value captured"),
    metricCard("Red risk", riskLeads, "Qualified Not Called leads older than 3 days"),
  ].join("");
}

function renderFunnelReport() {
  const totalLeads = state.leads.length;
  const maxStageCount = Math.max(
    1,
    ...FUNNEL_STAGES.map((stage) => getStageCount(stage.statuses))
  );
  const wonCount = getStageCount(["Sale Done"]);
  const lostCount = getStageCount(["Lost"]);
  const notRespondingCount = getStageCount(["Not Responding"]);
  const conversionRate = totalLeads ? Math.round((wonCount / totalLeads) * 100) : 0;

  funnelStageList.innerHTML = FUNNEL_STAGES.map((stage, index) => {
    const count = getStageCount(stage.statuses);
    const width = Math.max(34, Math.round((count / maxStageCount) * 100));
    return `
      <div class="funnel-stage" style="--stage-color: ${stage.color}; --stage-width: ${width}%">
        <div class="funnel-band">
          <span>${index + 1}</span>
          <strong>${count}</strong>
        </div>
        <div>
          <h4>${stage.label}</h4>
          ${stage.helper ? `<p>${stage.helper}</p>` : ""}
        </div>
      </div>
    `;
  }).join("");

  funnelSummary.innerHTML = `
    <div class="summary-tile">
      <span>Total qualified pool</span>
      <strong>${totalLeads}</strong>
    </div>
    <div class="summary-tile">
      <span>Sale conversion</span>
      <strong>${conversionRate}%</strong>
    </div>
    <div class="summary-tile revenue-tile">
      <span>Revenue won</span>
      <strong>${formatCurrency(getTotalRevenue())}</strong>
    </div>
    <div class="summary-tile">
      <span>Lost deals</span>
      <strong>${lostCount}</strong>
    </div>
    <div class="summary-tile">
      <span>Not responding</span>
      <strong>${notRespondingCount}</strong>
    </div>
  `;
}

function renderOverviewLists() {
  const todayItems = getSortedFollowups()
    .filter((item) => !item.completed)
    .slice(0, 5);
  todayFollowups.innerHTML = todayItems.length
    ? todayItems
        .map((item) => {
          const lead = findLead(item.leadId);
          return `
            <article class="list-item">
              <div class="row-head">
                <div>
                  <h4>${escapeHtml(item.title)}</h4>
                  <p class="meta-line">${escapeHtml(lead.leadName)} - ASM ${escapeHtml(
            lead.asmName
          )}</p>
                </div>
                <span class="pill ${isOverdue(item.dueAt) ? "overdue" : ""}">${formatDateTime(
            item.dueAt
          )}</span>
              </div>
              <p class="support-line">Priority: ${item.priority}</p>
            </article>
          `;
        })
        .join("")
    : emptyCard("No follow-ups pending.");

  const visibleCalls = getVisibleCalls();
  recentCalls.innerHTML = visibleCalls.length
    ? [...visibleCalls]
        .sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt))
        .slice(0, 5)
        .map((call) => {
          const lead = findLead(call.leadId);
          return `
            <article class="list-item">
              <div class="row-head">
                <div>
                  <h4>${escapeHtml(lead.leadName)}</h4>
                  <p class="meta-line">${escapeHtml(call.outcome)} - ${formatDateTime(
            call.calledAt
          )}</p>
                </div>
                <span class="pill warm">${escapeHtml(lead.status)}</span>
              </div>
              <p class="support-line">${escapeHtml(call.summary)}</p>
            </article>
          `;
        })
        .join("")
    : emptyCard("No calls logged yet.");
}

function renderLeads() {
  if (!state.leads.length) {
    leadsTable.innerHTML = emptyCard("No leads yet. Add your first customer lead.");
    return;
  }

  leadsTable.innerHTML = state.leads
    .map((lead) => {
      const activeClass = lead.id === state.selectedLeadId ? "active" : "";
      const riskClass = isQualifiedUncalledRisk(lead) ? "risk-lead" : "";
      return `
        <article class="table-row lead-table-entry ${activeClass} ${riskClass}" data-lead-id="${lead.id}">
          <div class="row-head">
            <div>
              <h4>${escapeHtml(lead.leadName)}</h4>
              <p class="meta-line">ASM: ${escapeHtml(lead.asmName)} - ${escapeHtml(
        lead.mobile
      )}</p>
            </div>
            <span class="pill">${escapeHtml(lead.status)}</span>
          </div>
          ${isQualifiedUncalledRisk(lead) ? `<p class="risk-text">Qualified Not Called lead older than 3 days</p>` : ""}
          <p class="status-line">Next follow-up: ${formatDateTime(lead.nextFollowup)}</p>
          <p class="status-line">Gym opening: ${formatDate(lead.gymOpeningDate)}</p>
          <p class="status-line">Sale value: ${formatCurrency(lead.saleValue || 0)}</p>
          ${lead.remark ? `<p class="support-line">Remark: ${escapeHtml(shortenText(lead.remark, 120))}</p>` : ""}
          ${lead.status === "Lost" && lead.lostReason ? `<p class="support-line">Lost reason: ${escapeHtml(lead.lostReason)}</p>` : ""}
          ${lead.status === "Lost" && lead.competitionQuote ? `<p class="support-line">Competition quote: ${escapeHtml(shortenText(lead.competitionQuote, 120))}</p>` : ""}
          <div class="row-actions">
            <button type="button" class="secondary-btn small" data-edit-lead-row="${lead.id}">Edit</button>
            <button type="button" class="ghost-btn small" data-reassign-lead-row="${lead.id}">Reassign ASM</button>
            <button type="button" class="danger-btn small" data-delete-lead-row="${lead.id}">Delete</button>
            <a class="whatsapp-btn small" href="${buildWhatsAppUrl(lead)}" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-lead-id]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedLeadId = row.dataset.leadId;
      saveState();
      renderLeads();
      renderLeadDetail();
      renderFollowups();
    });
  });

  document.querySelectorAll("[data-edit-lead-row]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedLeadId = button.dataset.editLeadRow;
      saveState();
      renderLeads();
      renderLeadDetail();
      openLeadEditor(button.dataset.editLeadRow);
    });
  });

  document.querySelectorAll("[data-reassign-lead-row]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openReassignModal(button.dataset.reassignLeadRow);
    });
  });

  document.querySelectorAll("[data-delete-lead-row]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteLead(button.dataset.deleteLeadRow);
    });
  });
}

function renderLeadDetail() {
  const lead = state.leads.find((item) => item.id === state.selectedLeadId);
  if (!lead) {
    leadDetailName.textContent = "Select a lead";
    leadDetail.className = "lead-detail empty-state";
    leadDetail.textContent =
      "Pick a lead to see ASM ownership, follow-up, and call history.";
    return;
  }

  leadDetailName.textContent = lead.leadName;
  leadDetail.className = "lead-detail";

  const relatedCalls = state.calls
    .filter((item) => item.leadId === lead.id)
    .sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt));

  const relatedFollowups = state.followups
    .filter((item) => item.leadId === lead.id && !item.completed)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));

  leadDetail.innerHTML = `
    ${isQualifiedUncalledRisk(lead) ? `<div class="risk-banner">Qualified Not Called lead older than 3 days</div>` : ""}
    <div class="detail-grid">
      <div class="detail-chip"><span>ASM name</span>${escapeHtml(lead.asmName)}</div>
      <div class="detail-chip"><span>Lead name</span>${escapeHtml(lead.leadName)}</div>
      <div class="detail-chip"><span>Mobile number</span>${escapeHtml(lead.mobile)}</div>
      <div class="detail-chip"><span>Lead status</span>${escapeHtml(lead.status)}</div>
      <div class="detail-chip"><span>Gym opening date</span>${formatDate(lead.gymOpeningDate)}</div>
      <div class="detail-chip"><span>Sale value</span>${formatCurrency(lead.saleValue || 0)}</div>
      <div class="detail-chip"><span>Follow-up date & time</span>${formatDateTime(lead.nextFollowup)}</div>
      ${lead.status === "Lost" ? `<div class="detail-chip"><span>Lost reason</span>${escapeHtml(lead.lostReason || "Not added")}</div>` : ""}
      ${lead.status === "Lost" ? `<div class="detail-chip"><span>Competition quote</span>${escapeHtml(lead.competitionQuote || "Not added")}</div>` : ""}
    </div>
    <div class="detail-chip remark-chip">
      <span>Remark</span>
      ${escapeHtml(lead.remark || "No remark added")}
    </div>
    <div class="history-panel">
      <h4>Edit history</h4>
      <div class="timeline">
        ${renderEditHistory(lead)}
      </div>
    </div>
    <div class="detail-actions">
      <button type="button" class="primary-btn small" data-edit-lead="${lead.id}">Edit lead</button>
      <button type="button" class="secondary-btn small" data-reassign-lead="${lead.id}">Reassign ASM</button>
      <button type="button" class="danger-btn small" data-delete-lead="${lead.id}">Delete lead</button>
      <a class="secondary-btn small" href="${buildCallUrl(lead)}">Call now</a>
      <a class="whatsapp-btn small" href="${buildWhatsAppUrl(lead)}" target="_blank" rel="noopener">WhatsApp</a>
      <a class="secondary-btn small" href="${buildWhatsAppUrl(lead, getUserTemplates().catalogMessage)}" target="_blank" rel="noopener">Send catalog</a>
      ${lead.nextFollowup ? `<a class="secondary-btn small calendar-link" href="${buildGoogleCalendarUrl(lead)}" target="_blank" rel="noopener">Add to Google Calendar</a>` : ""}
    </div>
    <div>
      <h4>Upcoming reminders</h4>
      <div class="timeline">
        ${
          relatedFollowups.length
            ? relatedFollowups
                .map(
                  (item) => `
              <div class="timeline-item">
                <strong>${escapeHtml(item.title)}</strong>
                <span class="meta-line">${formatDateTime(item.dueAt)} - ${escapeHtml(
                    item.priority
                  )}</span>
              </div>
            `
                )
                .join("")
            : `<div class="empty-state">No upcoming reminders for this lead.</div>`
        }
      </div>
    </div>
    <div>
      <h4>Call history</h4>
      <div class="timeline">
        ${
          relatedCalls.length
            ? getLeadCallHistory(lead.id)
                .map(
                  ({ call, index }) => `
              <div class="timeline-item">
                <strong>Call status ${index}: ${escapeHtml(call.outcome)}</strong>
                <span class="meta-line">${formatDateTime(call.calledAt)}</span>
                <p class="support-line"><strong>Call remark ${index}:</strong> ${escapeHtml(call.summary)}</p>
              </div>
            `
                )
                .join("")
            : `<div class="empty-state">No calls logged for this lead yet.</div>`
        }
      </div>
    </div>
  `;

  leadDetail.querySelector("[data-edit-lead]").addEventListener("click", () => {
    openLeadEditor(lead.id);
  });

  leadDetail.querySelector("[data-reassign-lead]").addEventListener("click", () => {
    openReassignModal(lead.id);
  });

  leadDetail.querySelector("[data-delete-lead]").addEventListener("click", () => {
    deleteLead(lead.id);
  });
}

function renderDeletedLeads() {
  deletedLeadDateFilter.value = state.deletedLeadDateFilter || "";
  const deletedRows = getFilteredDeletedLeads();
  bulkDeleteDeletedLeadsBtn.disabled = deletedRows.length === 0;

  if (!deletedRows.length) {
    deletedLeadsTable.innerHTML = emptyCard(
      state.deletedLeadDateFilter
        ? "No deleted leads found for this date."
        : "No deleted leads yet."
    );
    return;
  }

  deletedLeadsTable.innerHTML = deletedRows
    .map(
      (lead) => `
        <article class="table-row deleted-lead-entry">
          <div class="row-head">
            <div>
              <h4>${escapeHtml(lead.leadName)}</h4>
              <p class="meta-line">ASM: ${escapeHtml(lead.asmName)} - ${escapeHtml(lead.mobile)}</p>
            </div>
            <span class="pill overdue">Deleted</span>
          </div>
          <p class="status-line">Deleted on: ${formatDateTimeFull(lead.deletedAt)}</p>
          <p class="status-line">Deleted by: ${escapeHtml(lead.deletedBy || "Unknown user")}</p>
          <p class="status-line">Status before delete: ${escapeHtml(lead.status)}</p>
          <p class="status-line">Sale value: ${formatCurrency(lead.saleValue || 0)}</p>
          ${lead.remark ? `<p class="support-line">Remark: ${escapeHtml(shortenText(lead.remark, 140))}</p>` : ""}
          <div class="row-actions">
            <button type="button" class="primary-btn small" data-restore-lead="${lead.id}">Restore</button>
            <button type="button" class="danger-btn small" data-permanent-delete-lead="${lead.id}">Permanent delete</button>
          </div>
        </article>
      `
    )
    .join("");

  document.querySelectorAll("[data-restore-lead]").forEach((button) => {
    button.addEventListener("click", () => restoreLead(button.dataset.restoreLead));
  });

  document.querySelectorAll("[data-permanent-delete-lead]").forEach((button) => {
    button.addEventListener("click", () => permanentlyDeleteLead(button.dataset.permanentDeleteLead));
  });
}

function deleteLead(leadId) {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) return;
  if (!window.confirm(`Delete ${lead.leadName}? You can restore it from Deleted Leads.`)) return;

  state.leads = state.leads.filter((item) => item.id !== leadId);
  state.deletedLeads.unshift({
    ...lead,
    deletedAt: new Date().toISOString(),
    deletedBy: state.session?.email || "Unknown user",
  });

  if (state.selectedLeadId === leadId) {
    state.selectedLeadId = state.leads[0]?.id || "";
  }

  persistAndRender();
}

function restoreLead(leadId) {
  const lead = state.deletedLeads.find((item) => item.id === leadId);
  if (!lead) return;

  const restoredLead = {
    ...lead,
    editHistory: [
      createLeadEditHistory([
        {
          field: "restore",
          label: "Restore",
          fromValue: "Deleted Leads",
          toValue: "Active Leads",
        },
      ]),
      ...(lead.editHistory || []),
    ],
  };
  delete restoredLead.deletedAt;
  delete restoredLead.deletedBy;

  state.deletedLeads = state.deletedLeads.filter((item) => item.id !== leadId);
  state.leads.unshift(restoredLead);
  state.selectedLeadId = restoredLead.id;
  persistAndRender();
}

function permanentlyDeleteLead(leadId) {
  const lead = state.deletedLeads.find((item) => item.id === leadId);
  if (!lead) return;
  if (!window.confirm(`Permanently delete ${lead.leadName}? This cannot be restored.`)) return;

  state.deletedLeads = state.deletedLeads.filter((item) => item.id !== leadId);
  removeLeadActivity([leadId]);
  persistAndRender();
}

function permanentlyDeleteFilteredLeads() {
  const deletedRows = getFilteredDeletedLeads();
  if (!deletedRows.length) return;
  const filterLabel = state.deletedLeadDateFilter || "all dates";
  if (
    !window.confirm(
      `Permanently delete ${deletedRows.length} deleted lead(s) for ${filterLabel}? This cannot be restored.`
    )
  ) {
    return;
  }

  const deleteIds = new Set(deletedRows.map((lead) => lead.id));
  state.deletedLeads = state.deletedLeads.filter((lead) => !deleteIds.has(lead.id));
  removeLeadActivity(deleteIds);
  persistAndRender();
}

function removeLeadActivity(leadIds) {
  const ids = new Set(leadIds);
  state.calls = state.calls.filter((call) => !ids.has(call.leadId));
  state.followups = state.followups.filter((followup) => !ids.has(followup.leadId));
}

function getFilteredDeletedLeads() {
  return [...state.deletedLeads]
    .filter((lead) => {
      if (!state.deletedLeadDateFilter) return true;
      return lead.deletedAt?.slice(0, 10) === state.deletedLeadDateFilter;
    })
    .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
}

function renderFollowups() {
  const rows = getSortedFollowups();
  followupList.innerHTML = rows.length
    ? rows
        .map((item) => {
          const lead = findLead(item.leadId);
          return `
            <article class="table-row">
              <div class="row-head">
                <div>
                  <h4>${escapeHtml(item.title)}</h4>
                  <p class="meta-line">${escapeHtml(lead.leadName)} - ASM ${escapeHtml(
            lead.asmName
          )}</p>
                </div>
                <span class="pill ${isOverdue(item.dueAt) ? "overdue" : ""}">${formatDateTime(
            item.dueAt
          )}</span>
              </div>
              <p class="status-line">Mobile: ${escapeHtml(lead.mobile)} - Priority: ${escapeHtml(item.priority)}</p>
              <div class="row-actions">
                <a class="whatsapp-btn small" href="${buildWhatsAppUrl(lead)}" target="_blank" rel="noopener">WhatsApp</a>
                <a class="secondary-btn small calendar-link" href="${buildGoogleCalendarUrl(lead, item.dueAt)}" target="_blank" rel="noopener">Add to Google Calendar</a>
              </div>
            </article>
          `;
        })
        .join("")
    : emptyCard("No follow-up reminders yet.");
}

function renderCalls() {
  const rows = [...getVisibleCalls()].sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt));
  callList.innerHTML = rows.length
    ? rows
        .map((call) => {
          const lead = findLead(call.leadId);
          return `
            <article class="table-row">
              <div class="row-head">
                <div>
                  <h4>${escapeHtml(lead.leadName)}</h4>
                  <p class="meta-line">${escapeHtml(lead.mobile)} - ${formatDateTime(
            call.calledAt
          )}</p>
                </div>
                <span class="pill warm">${escapeHtml(call.outcome)}</span>
              </div>
              <p class="support-line">${escapeHtml(call.summary)}</p>
              <div class="row-actions">
                <a class="whatsapp-btn small" href="${buildWhatsAppUrl(lead)}" target="_blank" rel="noopener">WhatsApp</a>
              </div>
            </article>
          `;
        })
        .join("")
    : emptyCard("No calls logged yet.");
}

function populateLeadSelects() {
  const options = state.leads
    .map(
      (lead) =>
        `<option value="${lead.id}" ${
          lead.id === state.selectedLeadId ? "selected" : ""
        }>${escapeHtml(lead.leadName)} - ${escapeHtml(lead.mobile)}</option>`
    )
    .join("");
  followupLeadSelect.innerHTML = options;
  callLeadSelect.innerHTML = options;
}

function primeDefaultTimes() {
  const now = new Date();
  const plusOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const callTimeInput = callForm.elements.namedItem("calledAt");
  const followupDueInput = followupForm.elements.namedItem("dueAt");

  if (!callTimeInput.value) callTimeInput.value = toLocalDateTimeValue(now);
  if (!followupDueInput.value) followupDueInput.value = toLocalDateTimeValue(plusOneDay);
}

function persistAndRender() {
  saveState();
  refreshApp();
  scheduleAllNotifications();
}

function closeModal(id) {
  document.getElementById(id).close();
}

function resetLeadForm() {
  leadForm.reset();
  leadForm.elements.namedItem("leadId").value = "";
  leadForm.elements.namedItem("status").value = DEFAULT_QUALIFIED_STATUS;
  leadForm.elements.namedItem("remark").value = DEFAULT_LEAD_REMARK;
  toggleLostFields();
  leadModalTitle.textContent = "Add a new lead";
  leadSubmitBtn.textContent = "Save lead";
}

function resetBulkLeadForm() {
  bulkLeadForm.reset();
  bulkLeadResult.className = "bulk-result hidden";
  bulkLeadResult.textContent = "";
}

function resetTemplateForm() {
  const templates = getUserTemplates();
  templateForm.elements.namedItem("catalogMessage").value = templates.catalogMessage;
}

async function handleBulkCsvFile() {
  const file = bulkLeadForm.elements.namedItem("csvFile").files[0];
  if (!file) return;

  bulkLeadForm.elements.namedItem("csvText").value = await file.text();
  bulkLeadResult.className = "bulk-result";
  bulkLeadResult.textContent = `${file.name} loaded. Review the CSV text, then click Import leads.`;
}

function openLeadEditor(leadId) {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) return;

  leadForm.elements.namedItem("leadId").value = lead.id;
  leadForm.elements.namedItem("asmName").value = lead.asmName;
  leadForm.elements.namedItem("leadName").value = lead.leadName;
  leadForm.elements.namedItem("mobile").value = lead.mobile;
  leadForm.elements.namedItem("status").value = lead.status;
  leadForm.elements.namedItem("gymOpeningDate").value = lead.gymOpeningDate || "";
  leadForm.elements.namedItem("saleValue").value = lead.saleValue || "";
  leadForm.elements.namedItem("lostReason").value = lead.lostReason || "";
  leadForm.elements.namedItem("competitionQuote").value = lead.competitionQuote || "";
  leadForm.elements.namedItem("remark").value = lead.remark || "";
  toggleLostFields();
  leadModalTitle.textContent = "Edit lead";
  leadSubmitBtn.textContent = "Update lead";
  document.getElementById("leadModal").showModal();
}

function openReassignModal(leadId) {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) return;

  reassignForm.elements.namedItem("leadId").value = lead.id;
  reassignForm.elements.namedItem("leadName").value = lead.leadName;
  reassignForm.elements.namedItem("mobileSearch").value = lead.mobile;
  reassignForm.elements.namedItem("asmName").value = lead.asmName;
  updateReassignLeadHint(lead);
  document.getElementById("reassignModal").showModal();
}

function handleReassignMobileSearch() {
  const mobile = reassignForm.elements.namedItem("mobileSearch").value;
  const lead = findLeadByMobile(mobile);
  reassignForm.elements.namedItem("leadId").value = lead?.id || "";
  reassignForm.elements.namedItem("leadName").value = lead?.leadName || "";
  if (lead) {
    reassignForm.elements.namedItem("asmName").value = lead.asmName;
  }
  updateReassignLeadHint(lead, mobile);
}

function updateReassignLeadHint(lead, mobile = "") {
  if (!reassignLeadHint) return;

  const normalizedMobile = normalizePhoneForWhatsApp(mobile);
  if (lead) {
    reassignLeadHint.textContent = `Matched ${lead.leadName} - current ASM ${lead.asmName}.`;
    reassignLeadHint.classList.remove("error-text");
    return;
  }

  reassignLeadHint.textContent = normalizedMobile
    ? "No lead found for this mobile number."
    : "Type a mobile number to find the lead.";
  reassignLeadHint.classList.toggle("error-text", Boolean(normalizedMobile));
}

function toggleLostFields() {
  const isLost = leadForm.elements.namedItem("status").value === "Lost";
  const isCompetitorLoss = isLost && leadForm.elements.namedItem("lostReason").value === "Competitor";
  lostReasonField.classList.toggle("hidden", !isLost);
  competitionQuoteField.classList.toggle("hidden", !isCompetitorLoss);
  leadForm.elements.namedItem("lostReason").required = isLost;
  leadForm.elements.namedItem("competitionQuote").required = isCompetitorLoss;
  if (!isCompetitorLoss) {
    leadForm.elements.namedItem("competitionQuote").value = "";
  }
}

function scheduleAllNotifications() {
  if (!("Notification" in window)) return;
  state.leads.forEach((lead) => scheduleNotification(lead));
}

function scheduleNotification(lead) {
  if (!("Notification" in window) || !lead.nextFollowup) return;

  if (Notification.permission === "default") {
    Notification.requestPermission().then(() => scheduleNotification(lead));
    return;
  }

  if (Notification.permission !== "granted") return;

  const delay = new Date(lead.nextFollowup).getTime() - Date.now();
  if (delay <= 0 || delay > 2147483647) return;

  window.setTimeout(() => {
    new Notification(`Follow-up: ${lead.leadName}`, {
      body: `ASM: ${lead.asmName} | Mobile: ${lead.mobile}`,
    });
  }, delay);
}

function buildGoogleCalendarUrl(lead, followupTime = lead.nextFollowup) {
  const start = new Date(followupTime);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Follow-up: ${lead.leadName}`,
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: `ASM: ${lead.asmName}\nMobile: ${lead.mobile}\nStatus: ${lead.status}\nGym opening date: ${lead.gymOpeningDate || ""}\nSale value: ${lead.saleValue || 0}\nRemark: ${lead.remark || ""}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildWhatsAppUrl(lead, template = `Hi {leadName}, this is regarding your Cult Equipment enquiry.`) {
  const phone = normalizePhoneForWhatsApp(lead.mobile);
  const message = applyLeadTemplate(template, lead);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function buildCallUrl(lead) {
  const digits = String(lead.mobile || "").replace(/\D/g, "");
  return `tel:${digits}`;
}

function getUserTemplates() {
  const email = state.session?.email || "default";
  return {
    catalogMessage: state.userTemplates[email]?.catalogMessage || DEFAULT_CATALOG_MESSAGE,
  };
}

function applyLeadTemplate(template, lead) {
  return String(template || "")
    .replaceAll("{leadName}", lead.leadName || "")
    .replaceAll("{asmName}", lead.asmName || "")
    .replaceAll("{mobile}", lead.mobile || "");
}

function normalizePhoneForWhatsApp(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function toGoogleDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function getSortedFollowups() {
  const activeLeadIds = getActiveLeadIds();
  return [...state.followups]
    .filter((item) => item.dueAt && activeLeadIds.has(item.leadId))
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}

function getActiveLeadIds() {
  return new Set(state.leads.map((lead) => lead.id));
}

function getVisibleCalls() {
  const activeLeadIds = getActiveLeadIds();
  return state.calls.filter((call) => activeLeadIds.has(call.leadId));
}

function findLead(leadId) {
  return (
    state.leads.find((item) => item.id === leadId) ??
    state.leads[0] ?? {
      asmName: "Unassigned",
      leadName: "Unknown lead",
      mobile: "Not added",
      status: DEFAULT_QUALIFIED_STATUS,
      nextFollowup: "",
      lostReason: "",
      competitionQuote: "",
      gymOpeningDate: "",
      saleValue: 0,
      remark: "",
    }
  );
}

function findLeadByMobile(mobile) {
  const searchDigits = String(mobile || "").replace(/\D/g, "");
  if (!searchDigits) return null;

  return (
    state.leads.find((lead) => {
      const leadDigits = String(lead.mobile || "").replace(/\D/g, "");
      return leadDigits === searchDigits || leadDigits.endsWith(searchDigits);
    }) || null
  );
}

function getLeadCallHistory(leadId) {
  return state.calls
    .map((call, stateIndex) => ({ call, stateIndex }))
    .filter(({ call }) => call.leadId === leadId)
    .sort((a, b) => compareCallHistoryOrder(a, b))
    .map(({ call }) => call)
    .map((call, index) => ({ call, index: index + 1 }));
}

function compareCallHistoryOrder(a, b) {
  const aCalledAt = new Date(a.call.calledAt).getTime();
  const bCalledAt = new Date(b.call.calledAt).getTime();
  if (aCalledAt !== bCalledAt) return aCalledAt - bCalledAt;

  const aCreatedAt = new Date(a.call.createdAt || a.call.calledAt).getTime();
  const bCreatedAt = new Date(b.call.createdAt || b.call.calledAt).getTime();
  if (aCreatedAt !== bCreatedAt) return aCreatedAt - bCreatedAt;

  return b.stateIndex - a.stateIndex;
}

function isQualifiedUncalledRisk(lead) {
  if (lead.status !== DEFAULT_QUALIFIED_STATUS) return false;
  const relatedCalls = state.calls.filter((call) => call.leadId === lead.id);
  if (relatedCalls.length > 0) return false;

  const createdAt = new Date(lead.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;

  return Date.now() - createdAt.getTime() > 3 * 24 * 60 * 60 * 1000;
}

function getStageCount(statuses) {
  return state.leads.filter((lead) => statuses.includes(lead.status)).length;
}

function importBulkLeads(csvText) {
  if (!csvText) {
    return {
      imported: 0,
      errors: ["Paste CSV data or upload a CSV file before importing."],
    };
  }

  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return {
      imported: 0,
      errors: ["CSV should include a header row and at least one lead row."],
    };
  }

  const headers = rows[0].map(mapCsvHeader);
  const requiredHeaders = [
    "asmName",
    "leadName",
    "mobile",
    "status",
    "gymOpeningDate",
    "saleValue",
    "remark",
  ];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    return {
      imported: 0,
      errors: [`Missing required CSV columns: ${missingHeaders.join(", ")}.`],
    };
  }

  const importedLeads = [];
  const errors = [];

  rows.slice(1).forEach((row, index) => {
    if (row.every((cell) => !String(cell || "").trim())) return;

    const rawLead = headers.reduce((lead, key, columnIndex) => {
      if (key) lead[key] = String(row[columnIndex] || "").trim();
      return lead;
    }, {});

    const rowNumber = index + 2;
    if (!rawLead.leadName || !rawLead.mobile) {
      errors.push(`Row ${rowNumber}: leadName and mobile are required.`);
      return;
    }

    importedLeads.push(createLeadFromCsv(rawLead));
  });

  if (importedLeads.length) {
    state.leads = [...importedLeads, ...state.leads];
    state.selectedLeadId = importedLeads[0].id;
  }

  return {
    imported: importedLeads.length,
    errors,
  };
}

function createLeadFromCsv(rawLead) {
  const status = normalizeLeadStatus(rawLead.status || DEFAULT_QUALIFIED_STATUS);
  return {
    id: createId(),
    asmName: normalizeAsmName(rawLead.asmName),
    leadName: rawLead.leadName,
    mobile: rawLead.mobile,
    status,
    nextFollowup: "",
    lostReason: status === "Lost" ? rawLead.lostReason || "" : "",
    competitionQuote: status === "Lost" ? rawLead.competitionQuote || "" : "",
    gymOpeningDate: rawLead.gymOpeningDate || "",
    saleValue: Number(rawLead.saleValue || 0),
    remark: normalizeLeadRemark(rawLead.remark),
    statusHistory: [],
    editHistory: [],
    createdAt: new Date().toISOString().slice(0, 16),
  };
}

function showBulkImportResult(result) {
  bulkLeadResult.className = `bulk-result ${result.imported ? "" : "error-text"}`;
  bulkLeadResult.innerHTML = `
    <strong>${result.imported} lead${result.imported === 1 ? "" : "s"} imported.</strong>
    ${
      result.errors.length
        ? `<p>${escapeHtml(result.errors.slice(0, 5).join(" "))}</p>`
        : "<p>All rows were imported successfully.</p>"
    }
  `;
}

function createStatusChange(fromStatus, toStatus) {
  return {
    id: createId(),
    fromStatus,
    toStatus,
    changedAt: new Date().toISOString(),
    changedBy: state.session?.email || "Unknown user",
  };
}

function getLeadChanges(lead, leadData) {
  const fields = [
    ["asmName", "ASM name"],
    ["leadName", "Lead name"],
    ["mobile", "Mobile number"],
    ["status", "Lead status"],
    ["gymOpeningDate", "Gym opening date"],
    ["saleValue", "Sale value"],
    ["lostReason", "Lost reason"],
    ["competitionQuote", "Competition quote"],
    ["remark", "Remark"],
  ];

  return fields
    .filter(([key]) => String(lead[key] ?? "") !== String(leadData[key] ?? ""))
    .map(([key, label]) => ({
      field: key,
      label,
      fromValue: lead[key] ?? "",
      toValue: leadData[key] ?? "",
    }));
}

function createLeadEditHistory(changes) {
  return {
    id: createId(),
    changedAt: new Date().toISOString(),
    changedBy: state.session?.email || "Unknown user",
    changes,
  };
}

function renderEditHistory(lead) {
  const history = lead.editHistory?.length
    ? lead.editHistory
    : (lead.statusHistory || []).map(statusChangeToEditHistory);

  if (!history.length) {
    return `<div class="empty-state">No edits recorded yet. New lead edits will appear here.</div>`;
  }

  return history
    .map(
      (item) => `
        <div class="timeline-item">
          <strong>Lead details updated</strong>
          <span class="meta-line">${formatDateTime(item.changedAt)} by ${escapeHtml(
        item.changedBy || "Unknown user"
      )}</span>
          <div class="change-list">
            ${item.changes.map(renderEditChange).join("")}
          </div>
        </div>
      `
    )
    .join("");
}

function renderEditChange(change) {
  return `
    <p class="support-line">
      <strong>${escapeHtml(change.label || formatFieldLabel(change.field))}:</strong>
      ${escapeHtml(formatEditValue(change.fromValue))} &rarr; ${escapeHtml(
    formatEditValue(change.toValue)
  )}
    </p>
  `;
}

function statusChangeToEditHistory(item) {
  return {
    id: item.id || createId(),
    changedAt: item.changedAt,
    changedBy: item.changedBy,
    changes: [
      {
        field: "status",
        label: "Lead status",
        fromValue: item.fromStatus,
        toValue: item.toStatus,
      },
    ],
  };
}

function getTotalRevenue() {
  return state.leads
    .filter((lead) => lead.status === "Sale Done")
    .reduce((total, lead) => total + Number(lead.saleValue || 0), 0);
}

function metricCard(label, value, description) {
  return `
    <article class="metric-card">
      <h3>${label}</h3>
      <strong>${value}</strong>
      <span>${description}</span>
    </article>
  `;
}

function emptyCard(message) {
  return `<div class="empty-state">${message}</div>`;
}

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTimeFull(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value) {
  if (!value) return "Not added";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatEditValue(value) {
  if (value === null || value === undefined || value === "") return "Blank";
  return String(value);
}

function normalizeLeadRemark(value) {
  const remark = String(value || "").trim();
  return remark || DEFAULT_LEAD_REMARK;
}

function formatFieldLabel(value) {
  return String(value || "Field")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function toLocalDateTimeValue(date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(value) {
  return new Date(value) < new Date();
}

function toTitleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shortenText(value, maxLength) {
  const text = String(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneSeedState() {
  if (typeof structuredClone === "function") {
    return structuredClone(seedState);
  }

  return JSON.parse(JSON.stringify(seedState));
}

function normalizeState(inputState) {
  const normalized = {
    ...cloneSeedState(),
    ...inputState,
    leads: (inputState.leads || []).map(normalizeLead),
    deletedLeads: (inputState.deletedLeads || []).map(normalizeDeletedLead),
    followups: inputState.followups || [],
    calls: (inputState.calls || []).map(normalizeCall),
    userTemplates: inputState.userTemplates || {},
  };

  const retainedLeadIds = new Set([
    ...normalized.leads.map((lead) => lead.id),
    ...normalized.deletedLeads.map((lead) => lead.id),
  ]);
  normalized.followups = normalized.followups.filter(
    (item) => item.source !== "lead" && retainedLeadIds.has(item.leadId)
  );
  normalized.calls = normalized.calls.filter((call) => retainedLeadIds.has(call.leadId));

  if (!normalized.leads.some((lead) => lead.id === normalized.selectedLeadId)) {
    normalized.selectedLeadId = normalized.leads[0]?.id || "";
  }

  return normalized;
}

function normalizeLead(lead) {
  const statusHistory = (lead.statusHistory || []).map(normalizeStatusChange);
  return {
    id: lead.id || createId(),
    asmName: lead.asmName || "Unassigned",
    leadName: lead.leadName || lead.company || lead.contactName || "Untitled lead",
    mobile: lead.mobile || lead.phone || "Not added",
    status: normalizeLeadStatus(lead.status),
    nextFollowup: lead.nextFollowup || "",
    lostReason: lead.lostReason || "",
    competitionQuote: lead.competitionQuote || "",
    gymOpeningDate: lead.gymOpeningDate || "",
    saleValue: Number(lead.saleValue || 0),
    remark: normalizeLeadRemark(lead.remark),
    statusHistory,
    editHistory: normalizeEditHistory(lead.editHistory, statusHistory),
    createdAt: lead.createdAt || new Date().toISOString().slice(0, 16),
  };
}

function normalizeDeletedLead(lead) {
  return {
    ...normalizeLead(lead),
    deletedAt: lead.deletedAt || new Date().toISOString(),
    deletedBy: lead.deletedBy || "Unknown user",
  };
}

function normalizeCall(call) {
  return {
    id: call.id || createId(),
    leadId: call.leadId || "",
    outcome: call.outcome || "Call attempted",
    calledAt: call.calledAt || new Date().toISOString().slice(0, 16),
    summary: call.summary || "",
    createdAt: call.createdAt || call.calledAt || new Date().toISOString(),
  };
}

function normalizeLeadStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  const match = LEAD_STATUSES.find((item) => item.toLowerCase() === normalized);
  if (match) return match;
  if (normalized === "sale discussion") return "Sale Discussion";
  if (normalized === "proposal sent" || normalized === "quote sent") return "Quotation Sent";
  if (normalized === "waiting response") return "Waiting for response";
  if (normalized === "won" || normalized === "converted") return "Sale Done";
  if (normalized === "qualified" || normalized === "contacted" || normalized === "new") {
    return DEFAULT_QUALIFIED_STATUS;
  }
  return DEFAULT_QUALIFIED_STATUS;
}

function normalizeAsmName(value) {
  const match = ASM_NAMES.find(
    (name) => name.toLowerCase() === String(value || "").trim().toLowerCase()
  );
  return match || ASM_NAMES[0];
}

function mapCsvHeader(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const headerMap = {
    asm: "asmName",
    asmname: "asmName",
    salesperson: "asmName",
    owner: "asmName",
    lead: "leadName",
    leadname: "leadName",
    customer: "leadName",
    customername: "leadName",
    name: "leadName",
    mobile: "mobile",
    mobilenumber: "mobile",
    phone: "mobile",
    phonenumber: "mobile",
    status: "status",
    leadstatus: "status",
    gymopeningdate: "gymOpeningDate",
    openingdate: "gymOpeningDate",
    salevalue: "saleValue",
    revenue: "saleValue",
    amount: "saleValue",
    remark: "remark",
    remarks: "remark",
    notes: "remark",
    lostreason: "lostReason",
    competitionquote: "competitionQuote",
    competitorquote: "competitionQuote",
  };

  return headerMap[normalized] || "";
}

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((items) => items.some((item) => String(item || "").trim()));
}

function normalizeStatusChange(item) {
  return {
    id: item.id || createId(),
    fromStatus: normalizeLeadStatus(item.fromStatus),
    toStatus: normalizeLeadStatus(item.toStatus),
    changedAt: item.changedAt || new Date().toISOString(),
    changedBy: item.changedBy || "Unknown user",
  };
}

function normalizeEditHistory(editHistory = [], statusHistory = []) {
  const source = editHistory.length
    ? editHistory
    : statusHistory.map(statusChangeToEditHistory);

  return source.map((item) => ({
    id: item.id || createId(),
    changedAt: item.changedAt || new Date().toISOString(),
    changedBy: item.changedBy || "Unknown user",
    changes: (item.changes || []).map((change) => ({
      field: change.field || "field",
      label: change.label || formatFieldLabel(change.field),
      fromValue: change.fromValue ?? "",
      toValue: change.toValue ?? "",
    })),
  }));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return cloneSeedState();

  try {
    const parsed = JSON.parse(saved);
    return {
      ...cloneSeedState(),
      ...parsed,
    };
  } catch {
    return cloneSeedState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Placeholder for future Supabase wiring:
// 1. Replace local login in bindAuth() with supabase.auth.signInWithPassword().
// 2. Load leads, followups, and calls from shared Postgres tables scoped by organization_id.
// 3. Save changes through Supabase insert/update calls instead of localStorage.
