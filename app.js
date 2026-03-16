const CATEGORY_KEYS = ["OC", "BC", "BCM", "MBC", "SC", "SCA", "ST"];

const RANK_KEY_BY_CATEGORY = {
    OC: ["ocal", "octl"],
    BC: ["bcal", "bctl"],
    BCM: ["bcmal", "bcmtl"],
    MBC: ["mbcal", "mbctl"],
    SC: ["scal", "sctl"],
    SCA: ["scaal", "scatl"],
    ST: ["stal", "sttl"]
};

const state = {
    years: [2020, 2021, 2022, 2023, 2024],
    selectedYear: null,
    dataByYear: new Map(),
    currentRows: [],
    filteredRows: [],
    currentPage: 1,
    pageSize: 50
};

const yearButtons = document.getElementById("yearButtons");
const statusText = document.getElementById("statusText");
const queryInput = document.getElementById("queryInput");
const categorySelect = document.getElementById("categorySelect");
const userCutoffInput = document.getElementById("userCutoffInput");
const minCutoffInput = document.getElementById("minCutoffInput");
const sortSelect = document.getElementById("sortSelect");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const eligibleOnlyCheck = document.getElementById("eligibleOnlyCheck");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");
const totalRows = document.getElementById("totalRows");
const maxCutoff = document.getElementById("maxCutoff");
const avgCutoff = document.getElementById("avgCutoff");
const eligibleRows = document.getElementById("eligibleRows");
const resultLine = document.getElementById("resultLine");
const resultBody = document.getElementById("resultBody");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");
const trendCollegeSelect = document.getElementById("trendCollegeSelect");
const trendBranchSelect = document.getElementById("trendBranchSelect");
const trendCategorySelect = document.getElementById("trendCategorySelect");
const trendBars = document.getElementById("trendBars");
const trendSummary = document.getElementById("trendSummary");

function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function pickRank(row, keys) {
    for (const key of keys) {
        const value = toNumber(row[key]);
        if (value !== null) return value;
    }
    return null;
}

function unwrapRows(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.user)) return raw.user;
    if (raw && Array.isArray(raw.data)) return raw.data;
    return [];
}

function normalizeRow(row, year) {
    const coc = String(row.coc ?? "").trim();
    const brc = String(row.brc ?? "").trim();

    const cutoffs = {};
    const ranks = {};

    for (const key of CATEGORY_KEYS) {
        cutoffs[key] = toNumber(row[key]);
        ranks[key] = pickRank(row, RANK_KEY_BY_CATEGORY[key]);
    }

    return {
        year,
        coc,
        con: normalizeText(row.con),
        brc,
        brn: normalizeText(row.brn),
        code: normalizeText(row.code) || normalizeText(`${coc} ${brc}`),
        cutoffs,
        ranks
    };
}

async function loadYearData(year) {
    const response = await fetch(`d${year}.json`);
    if (!response.ok) {
        throw new Error(`Failed loading d${year}.json`);
    }
    const raw = await response.json();
    return unwrapRows(raw).map((row) => normalizeRow(row, year));
}

function renderYearButtons() {
    yearButtons.innerHTML = "";
    for (const year of state.years) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "year-btn" + (year === state.selectedYear ? " active" : "");
        btn.textContent = String(year);
        btn.addEventListener("click", () => {
            state.selectedYear = year;
            state.currentPage = 1;
            state.currentRows = state.dataByYear.get(year) || [];
            renderYearButtons();
            syncTrendSelectors();
            applyFilters();
        });
        yearButtons.appendChild(btn);
    }
}

function formatCutoff(value) {
    return value === null ? "-" : value.toFixed(1).replace(/\.0$/, "");
}

function parseInputNumber(input) {
    const raw = input.value.trim();
    return raw ? toNumber(raw) : null;
}

function applyFilters() {
    const query = queryInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const userCutoff = parseInputNumber(userCutoffInput);
    const minCutoff = parseInputNumber(minCutoffInput);
    const onlyEligible = eligibleOnlyCheck.checked;
    const sortValue = sortSelect.value;

    let rows = state.currentRows.filter((row) => {
        const cutoff = row.cutoffs[category];
        if (cutoff === null) return false;

        if (query) {
            const hay = `${row.con} ${row.brn} ${row.brc} ${row.code}`.toLowerCase();
            if (!hay.includes(query)) return false;
        }

        if (minCutoff !== null && cutoff < minCutoff) return false;
        if (onlyEligible && userCutoff !== null && cutoff > userCutoff) return false;

        return true;
    });

    rows.sort((a, b) => {
        const aCutoff = a.cutoffs[category] ?? -Infinity;
        const bCutoff = b.cutoffs[category] ?? -Infinity;

        if (sortValue === "cutoff_asc") return aCutoff - bCutoff;
        if (sortValue === "college") return a.con.localeCompare(b.con);
        if (sortValue === "branch") return a.brn.localeCompare(b.brn);
        if (sortValue === "near_score") {
            if (userCutoff === null) return bCutoff - aCutoff;
            const ad = Math.abs(userCutoff - aCutoff);
            const bd = Math.abs(userCutoff - bCutoff);
            if (ad !== bd) return ad - bd;
            return bCutoff - aCutoff;
        }
        return bCutoff - aCutoff;
    });

    state.filteredRows = rows;
    updateStats(category, userCutoff);
    renderTable(category, userCutoff);
}

function updateStats(category, userCutoff) {
    const data = state.filteredRows;
    const cutoffs = data.map((row) => row.cutoffs[category]).filter((v) => v !== null);

    totalRows.textContent = String(data.length);
    maxCutoff.textContent = cutoffs.length ? formatCutoff(Math.max(...cutoffs)) : "-";

    if (!cutoffs.length) {
        avgCutoff.textContent = "-";
    } else {
        const avg = cutoffs.reduce((sum, value) => sum + value, 0) / cutoffs.length;
        avgCutoff.textContent = formatCutoff(avg);
    }

    if (userCutoff === null) {
        eligibleRows.textContent = "-";
    } else {
        const count = data.filter((row) => row.cutoffs[category] <= userCutoff).length;
        eligibleRows.textContent = String(count);
    }

    resultLine.textContent = `${data.length} matches in ${state.selectedYear} for ${category}.`;
}

function renderTable(category, userCutoff) {
    const total = state.filteredRows.length;
    const pageSize = state.pageSize;
    const pages = Math.max(1, Math.ceil(total / pageSize));

    if (state.currentPage > pages) {
        state.currentPage = pages;
    }

    const startIndex = (state.currentPage - 1) * pageSize;
    const pageRows = state.filteredRows.slice(startIndex, startIndex + pageSize);

    resultBody.innerHTML = "";

    if (!pageRows.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 8;
        td.textContent = "No rows found for this filter combination.";
        tr.appendChild(td);
        resultBody.appendChild(tr);
    } else {
        pageRows.forEach((row, index) => {
            const cutoff = row.cutoffs[category];
            const eligible = userCutoff !== null && cutoff !== null && cutoff <= userCutoff;

            const tr = document.createElement("tr");
            if (eligible) tr.classList.add("eligible");

            const cells = [
                startIndex + index + 1,
                row.coc || "-",
                row.con || "-",
                row.brc || "-",
                row.brn || "-",
                formatCutoff(cutoff),
                row.ranks[category] ?? "-",
                row.code || "-"
            ];

            for (const value of cells) {
                const td = document.createElement("td");
                td.textContent = String(value);
                tr.appendChild(td);
            }
            resultBody.appendChild(tr);
        });
    }

    prevPageBtn.disabled = state.currentPage <= 1;
    nextPageBtn.disabled = state.currentPage >= pages;
    pageInfo.textContent = `Page ${state.currentPage} of ${pages}`;
}

function resetFilters() {
    queryInput.value = "";
    categorySelect.value = "OC";
    userCutoffInput.value = "";
    minCutoffInput.value = "";
    sortSelect.value = "cutoff_desc";
    pageSizeSelect.value = "50";
    eligibleOnlyCheck.checked = false;

    state.pageSize = 50;
    state.currentPage = 1;
    trendCategorySelect.value = "OC";

    applyFilters();
    renderTrend();
}

function downloadCsv() {
    if (!state.filteredRows.length) {
        alert("No filtered rows available to export.");
        return;
    }

    const category = categorySelect.value;
    const lines = [
        [
            "year",
            "college_code",
            "college_name",
            "branch_code",
            "branch_name",
            "category",
            "cutoff",
            "last_rank",
            "combined_code"
        ].join(",")
    ];

    for (const row of state.filteredRows) {
        const record = [
            row.year,
            row.coc,
            row.con,
            row.brc,
            row.brn,
            category,
            row.cutoffs[category] ?? "",
            row.ranks[category] ?? "",
            row.code
        ].map((value) => {
            const text = String(value ?? "").replace(/"/g, '""');
            return `"${text}"`;
        });
        lines.push(record.join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tnea_${state.selectedYear}_${category}_filtered.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function syncTrendSelectors() {
    const rows = state.currentRows;
    const byCollege = new Map();

    for (const row of rows) {
        const key = `${row.coc}||${row.con}`;
        if (!byCollege.has(key)) {
            byCollege.set(key, { coc: row.coc, con: row.con });
        }
    }

    const collegeOptions = Array.from(byCollege.values()).sort((a, b) => a.con.localeCompare(b.con));

    trendCollegeSelect.innerHTML = "";
    collegeOptions.forEach((college) => {
        const option = document.createElement("option");
        option.value = college.coc;
        option.textContent = `${college.coc} - ${college.con}`;
        trendCollegeSelect.appendChild(option);
    });

    syncTrendBranchOptions();
}

function syncTrendBranchOptions() {
    const coc = trendCollegeSelect.value;
    const rows = state.currentRows.filter((row) => row.coc === coc);
    const branchMap = new Map();

    for (const row of rows) {
        if (!branchMap.has(row.brc)) {
            branchMap.set(row.brc, row.brn);
        }
    }

    const branchOptions = Array.from(branchMap.entries())
        .map(([brc, brn]) => ({ brc, brn }))
        .sort((a, b) => a.brc.localeCompare(b.brc));

    trendBranchSelect.innerHTML = "";
    branchOptions.forEach((branch) => {
        const option = document.createElement("option");
        option.value = branch.brc;
        option.textContent = `${branch.brc} - ${branch.brn}`;
        trendBranchSelect.appendChild(option);
    });

    renderTrend();
}

function buildTrendSeries(coc, brc, category) {
    return state.years.map((year) => {
        const rows = state.dataByYear.get(year) || [];
        const found = rows.find((row) => row.coc === coc && row.brc === brc);
        return {
            year,
            cutoff: found ? found.cutoffs[category] : null
        };
    });
}

function renderTrend() {
    const coc = trendCollegeSelect.value;
    const brc = trendBranchSelect.value;
    const category = trendCategorySelect.value;

    if (!coc || !brc) {
        trendBars.innerHTML = "<p class='muted'>Select a college and branch to view trend.</p>";
        trendSummary.textContent = "";
        return;
    }

    const series = buildTrendSeries(coc, brc, category);
    const values = series.map((item) => item.cutoff).filter((v) => v !== null);
    const maxVal = values.length ? Math.max(...values) : 0;
    const safeMaxVal = maxVal > 0 ? maxVal : 1;

    trendBars.innerHTML = "";

    for (const item of series) {
        const card = document.createElement("div");
        card.className = "bar";

        const fill = document.createElement("div");
        fill.className = "bar-fill";
        fill.style.height = item.cutoff === null ? "8px" : `${Math.max(8, (item.cutoff / safeMaxVal) * 120)}px`;

        const val = document.createElement("div");
        val.className = "bar-val";
        val.textContent = item.cutoff === null ? "N/A" : formatCutoff(item.cutoff);

        const year = document.createElement("div");
        year.className = "bar-year";
        year.textContent = String(item.year);

        card.appendChild(fill);
        card.appendChild(val);
        card.appendChild(year);
        trendBars.appendChild(card);
    }

    const available = series.filter((item) => item.cutoff !== null);
    if (available.length >= 2) {
        const first = available[0];
        const last = available[available.length - 1];
        const delta = (last.cutoff - first.cutoff);
        const direction = delta > 0 ? "increased" : (delta < 0 ? "decreased" : "remained stable");
        const diffText = Math.abs(delta).toFixed(1).replace(/\.0$/, "");
        trendSummary.textContent = `${category} cutoff ${direction} by ${diffText} from ${first.year} to ${last.year}.`;
    } else if (available.length === 1) {
        trendSummary.textContent = `Only one year has data for this branch in ${category}.`;
    } else {
        trendSummary.textContent = `No trend data found for this branch in ${category}.`;
    }
}

function bindEvents() {
    const controls = [queryInput, categorySelect, userCutoffInput, minCutoffInput, sortSelect, eligibleOnlyCheck];

    controls.forEach((el) => {
        el.addEventListener("input", () => {
            state.currentPage = 1;
            applyFilters();
        });
        el.addEventListener("change", () => {
            state.currentPage = 1;
            applyFilters();
        });
    });

    pageSizeSelect.addEventListener("change", () => {
        state.pageSize = Number(pageSizeSelect.value);
        state.currentPage = 1;
        applyFilters();
    });

    prevPageBtn.addEventListener("click", () => {
        state.currentPage = Math.max(1, state.currentPage - 1);
        renderTable(categorySelect.value, parseInputNumber(userCutoffInput));
    });

    nextPageBtn.addEventListener("click", () => {
        const totalPages = Math.max(1, Math.ceil(state.filteredRows.length / state.pageSize));
        state.currentPage = Math.min(totalPages, state.currentPage + 1);
        renderTable(categorySelect.value, parseInputNumber(userCutoffInput));
    });

    resetBtn.addEventListener("click", resetFilters);
    exportBtn.addEventListener("click", downloadCsv);

    trendCollegeSelect.addEventListener("change", syncTrendBranchOptions);
    trendBranchSelect.addEventListener("change", renderTrend);
    trendCategorySelect.addEventListener("change", renderTrend);
}

async function init() {
    statusText.textContent = "Loading year-wise JSON data...";

    const loadedYears = [];

    for (const year of state.years) {
        try {
            const rows = await loadYearData(year);
            state.dataByYear.set(year, rows);
            loadedYears.push(year);
        } catch (error) {
            console.error(error);
        }
    }

    if (!loadedYears.length) {
        statusText.textContent = "Unable to load data files. Please verify JSON files are present.";
        return;
    }

    state.years = loadedYears;
    state.selectedYear = loadedYears[loadedYears.length - 1];
    state.currentRows = state.dataByYear.get(state.selectedYear) || [];

    renderYearButtons();
    syncTrendSelectors();
    bindEvents();
    applyFilters();
    renderTrend();

    statusText.textContent = `Loaded ${loadedYears.length} years successfully.`;
}

init();
