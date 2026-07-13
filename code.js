const DEFAULT_CUSTOMERS = [
  { id: "A", name: "A客戶", projects: ["1", "2"] },
  { id: "B", name: "B客戶", projects: ["3", "4"] },
  { id: "C", name: "C客戶", projects: ["5", "6"] },
  { id: "D", name: "D客戶", projects: ["7", "8"] },
  { id: "E", name: "E客戶", projects: ["9", "10"] },
  { id: "F", name: "F客戶", projects: ["11", "12"] }
];

const CUSTOMER_STORAGE_KEY = "customer_list";
const PASSWORD = "1234";
const STORAGE_KEY = "customer_data_list";

let selectedCustomer = "";
let dataList = [];
let customerList = [];
let currentDateValue = "";
let stepAValue = ""; 
let stepBValue = ""; 

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  cleanupOldCustomerStorage();
  loadData();
  loadCustomers();
  renderCustomerButtons();
  setCurrentDateTime();
  bindEvents();
  renderTable();
  renderCustomerManager();
  showPage('A');
  lockTable();
}

function cleanupOldCustomerStorage() {
  const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
  if (!raw) return;

  try {
    const oldData = JSON.parse(raw);
    if (
      !Array.isArray(oldData) ||
      oldData.some(item => typeof item === "string") ||
      oldData.some(item => typeof item === "object" && !Array.isArray(item.projects))
    ) {
      localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    }
  } catch (error) {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
  }
}

function loadCustomers() {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const sourceList = Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CUSTOMERS;

    customerList = sourceList.map((customer, index) => {
      const customerId = typeof customer === "string" ? customer : (customer.id || customer.name || `CUSTOMER_${index + 1}`);
      const customerName = typeof customer === "string" ? customer : (customer.name || customer.id || `客戶${index + 1}`);
      const defaultCustomer = DEFAULT_CUSTOMERS.find(dc => dc.id === customerId || dc.name === customerName || dc.id === customerName || dc.name === customerId);
      const customerProjects = Array.isArray(customer.projects) && customer.projects.length > 0 ? customer.projects.map(p => String(p).trim()).filter(Boolean) : (defaultCustomer ? [...defaultCustomer.projects] : []);

      return { id: customerId, name: customerName, projects: customerProjects };
    });

    DEFAULT_CUSTOMERS.forEach(defaultCustomer => {
      const exists = customerList.some(c => c.id === defaultCustomer.id || c.name === defaultCustomer.name);
      if (!exists) {
        customerList.push({ id: defaultCustomer.id, name: defaultCustomer.name, projects: [...defaultCustomer.projects] });
      }
    });
    saveCustomers();
  } catch (error) {
    customerList = DEFAULT_CUSTOMERS.map(c => ({ ...c, projects: [...c.projects] }));
    saveCustomers();
  }
}

function saveCustomers() {
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customerList));
}

function renderCustomerButtons() {
  const customerGrid = document.getElementById("customerGrid");
  if (!customerGrid) return;

  customerGrid.innerHTML = "";
  customerList.forEach((customer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "customer-btn";
    button.textContent = customer.name;

    button.addEventListener("click", () => {
      selectedCustomer = customer.id;
      updateCustomerActiveState();
      renderProjectOptions();
      showPage(2);
    });
    customerGrid.appendChild(button);
  });
  updateCustomerActiveState();
}

function updateCustomerActiveState() {
  document.querySelectorAll(".customer-btn").forEach((button) => {
    const customer = customerList.find(c => c.name === button.textContent);
    button.classList.toggle("active", !!customer && customer.id === selectedCustomer);
  });
}

function renderCustomerManager() {
  const container = document.getElementById("customerManageList");
  if (!container) return;

  container.innerHTML = "";
  customerList.forEach((customer, index) => {
    const item = document.createElement("div");
    item.className = "customer-manage-item";
    const projectText = Array.isArray(customer.projects) && customer.projects.length > 0 ? customer.projects.join(" ") : "無指定項目";

    item.innerHTML = `
      <div>
        <strong>${escapeHtml(customer.name)}</strong><br>
        <span>品項：${escapeHtml(projectText)}</span>
      </div>
      <div>
        <button type="button" class="edit-btn" data-customer-index="${index}">編輯</button>
        <button type="button" class="delete-btn" data-customer-index="${index}">刪除</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function parseProjectsInput(text) {
  return String(text || "").trim().split(/\s+/).map(item => item.trim()).filter(Boolean);
}

function addCustomer() {
  const nameInput = document.getElementById("newCustomerName");
  const projectsInput = document.getElementById("newCustomerProjects");
  if (!nameInput || !projectsInput) return;

  const name = nameInput.value.trim();
  const projectsText = projectsInput.value.trim();
  if (!name) { alert("請輸入客戶名稱"); return; }
  
  const isDuplicate = customerList.some(c => c.id === name || c.name === name);
  if (isDuplicate) { alert("客戶名稱已存在"); return; }

  const projects = parseProjectsInput(projectsText);
  customerList.push({ id: name, name: name, projects });

  saveCustomers();
  renderCustomerButtons();
  renderCustomerManager();

  nameInput.value = "";
  projectsInput.value = "";
}

function handleCustomerManageClick(event) {
  const target = event.target;
  if (target.dataset.customerIndex === undefined) return;

  const index = Number(target.dataset.customerIndex);
  if (Number.isNaN(index)) return;

  const targetCustomer = customerList[index];
  if (!targetCustomer) return;

  if (target.classList.contains("delete-btn")) {
    const relatedDataCount = dataList.filter(item => item.customer === targetCustomer.id).length;
    let message = `確定要刪除客戶「${targetCustomer.name}」嗎？\n此客戶的品項也會一併刪除。`;
    if (relatedDataCount > 0) message += `\n另外會一併刪除 ${relatedDataCount} 筆資料紀錄。`;

    if (!confirm(message)) return;

    dataList = dataList.filter(item => item.customer !== targetCustomer.id);
    saveDataToStorage();
    customerList.splice(index, 1);
    saveCustomers();

    if (selectedCustomer === targetCustomer.id) {
      selectedCustomer = "";
      const projectEl = document.getElementById("project");
      const quantityEl = document.getElementById("quantity");
      if (projectEl) projectEl.innerHTML = '<option value="">請選擇品項</option>';
      if (quantityEl) quantityEl.value = "";
    }

    renderCustomerButtons();
    renderCustomerManager();
    renderTable();
    updateCustomerActiveState();
    alert(`客戶「${targetCustomer.name}」及其相關品項/資料已刪除`);
    return;
  }

  if (target.classList.contains("edit-btn")) {
    editCustomerProjects(index);
  }
}

function editCustomerProjects(index) {
  const customer = customerList[index];
  if (!customer) return;

  const currentProjects = customer.projects || [];
  const projectsStr = currentProjects.join(" ");
  const newProjects = prompt(`編輯客戶「${customer.name}」的品項\n(多個品項請用空格分隔，例如：1 2 3)`, projectsStr);

  if (newProjects === null) return;

  customerList[index].projects = parseProjectsInput(newProjects);
  saveCustomers();
  renderCustomerButtons();
  renderCustomerManager();

  if (selectedCustomer === customer.id) renderProjectOptions();
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    dataList = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(dataList)) dataList = [];
  } catch (error) {
    dataList = [];
  }
}

function saveDataToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dataList));
}

function renderTable() {
  const tbody = document.querySelector("#dataTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  
  // 只有「客戶」身分會隱藏操作按鈕，出貨主任不會被影響
  const isCustomerView = (stepAValue === "客戶");

  const opHeader = document.getElementById("operationHeader");
  if (opHeader) {
    opHeader.style.display = isCustomerView ? "none" : "";
  }

  if (dataList.length === 0) {
    const colSpan = isCustomerView ? 4 : 5;
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `<td colspan="${colSpan}">目前沒有資料</td>`;
    tbody.appendChild(emptyRow);
    return;
  }

  dataList.forEach((item, index) => {
    const customerName = item.customerName || item.customer;
    const row = document.createElement("tr");

    let rowHtml = `
      <td>${escapeHtml(customerName)}</td>
      <td>${escapeHtml(formatDateTimeForDisplay(item.date))}</td>
      <td>${escapeHtml(item.project)}</td>
      <td>${escapeHtml(item.quantity)}</td>
    `;

    // 只要不是「客戶」視角，就一律顯示編輯和刪除按鈕
    if (!isCustomerView) {
      rowHtml += `
        <td>
          <button type="button" class="edit-btn" data-index="${index}">編輯</button>
          <button type="button" class="delete-btn" data-index="${index}">刪除</button>
        </td>
      `;
    }

    row.innerHTML = rowHtml;
    tbody.appendChild(row);
  });
}

function handleTableClick(event) {
  const target = event.target;
  const index = Number(target.dataset.index);
  if (Number.isNaN(index)) return;

  if (target.classList.contains("delete-btn")) deleteData(index);
  if (target.classList.contains("edit-btn")) editData(index);
}

function deleteData(index) {
  const item = dataList[index];
  if (!item) return;

  const ok = confirm(`確定要刪除這筆資料嗎？\n客戶：${item.customerName || item.customer}\n品項：${item.project}\n數量：${item.quantity}`);
  if (!ok) return;

  dataList.splice(index, 1);
  saveDataToStorage();
  renderTable();
}

function editData(index) {
  const item = dataList[index];
  if (!item) return;

  selectedCustomer = item.customer;
  updateCustomerActiveState();
  currentDateValue = item.date;

  const dateDisplay = document.getElementById("dateDisplay");
  if (dateDisplay) dateDisplay.textContent = formatDateTimeForDisplay(item.date);

  renderProjectOptions();

  const projectEl = document.getElementById("project");
  const quantityEl = document.getElementById("quantity");
  if (projectEl) projectEl.value = item.project;
  if (quantityEl) quantityEl.value = item.quantity;

  dataList.splice(index, 1);
  saveDataToStorage();
  renderTable();

  showPage(2);
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  
  const targetPage = document.getElementById(`page${pageId}`);
  if (targetPage) targetPage.classList.remove("hidden");

  const dataCenter = document.getElementById("dataCenterSection");
  if (dataCenter) {
    dataCenter.classList.add("hidden");

    if (pageId === 'DataCenterOnly') {
      dataCenter.classList.remove("hidden");
    }

    if (stepAValue === "作業員" && stepBValue === "出貨主任") {
      if (pageId === 1 || pageId === '1' || pageId === 2 || pageId === '2' || pageId === 3 || pageId === '3') {
        dataCenter.classList.remove("hidden");
      }
    }
  }
}

function renderProjectOptions() {
  const projectSelect = document.getElementById("project");
  if (!projectSelect) return;

  projectSelect.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "請選擇品項";
  projectSelect.appendChild(defaultOption);

  const currentCustomer = customerList.find(c => c.id === selectedCustomer);
  if (!currentCustomer) return;

  const projectsToShow = Array.isArray(currentCustomer.projects) ? currentCustomer.projects : [];
  projectsToShow.forEach((project) => {
    const option = document.createElement("option");
    option.value = project;
    option.textContent = project;
    projectSelect.appendChild(option);
  });
}

function setCurrentDateTime() {
  const now = new Date();
  currentDateValue = toDatetimeLocalValue(now);
  const dateDisplay = document.getElementById("dateDisplay");
  if (dateDisplay) dateDisplay.textContent = formatDateTimeForDisplay(currentDateValue);
}

function validatePage2() {
  const projectEl = document.getElementById("project");
  const quantityEl = document.getElementById("quantity");

  if (!selectedCustomer) { alert("請先選擇客戶"); showPage(1); return false; }
  if (!projectEl || !projectEl.value) { alert("請先選擇品項"); return false; }
  if (!quantityEl || !quantityEl.value.trim()) { alert("請先輸入數量"); return false; }

  return true;
}

function resetForm() {
  selectedCustomer = "";
  updateCustomerActiveState();
  setCurrentDateTime();

  const projectEl = document.getElementById("project");
  const quantityEl = document.getElementById("quantity");
  if (projectEl) projectEl.innerHTML = '<option value="">請選擇品項</option>';
  if (quantityEl) quantityEl.value = "";
}

function handleSubmitData() {
  if (!validatePage2()) return;

  const currentCustomer = customerList.find(c => c.id === selectedCustomer);
  const customerName = currentCustomer ? currentCustomer.name : selectedCustomer;

  const record = {
    customer: selectedCustomer,
    customerName: customerName,
    date: currentDateValue,
    project: document.getElementById("project").value,
    quantity: document.getElementById("quantity").value.trim()
  };

  dataList.push(record);
  saveDataToStorage();
  renderResult(record);
  renderTable();
  lockTable();
  showPage(3);
}

function renderResult(record) {
  const customerName = record.customerName || record.customer;
  document.getElementById("resultCustomer").textContent = customerName;
  document.getElementById("resultDate").textContent = formatDateTimeForDisplay(record.date);
  document.getElementById("resultProject").textContent = record.project;
  document.getElementById("resultQuantity").textContent = record.quantity;
}

function prepareNext() {
  resetForm();
  showPage('A'); 
}

function appendQuantity(value) {
  const input = document.getElementById("quantity");
  if (!input) return;
  input.value += value;
}

function clearQuantity() {
  const input = document.getElementById("quantity");
  if (!input) return;
  input.value = "";
}

function backspaceQuantity() {
  const input = document.getElementById("quantity");
  if (!input) return;
  input.value = input.value.slice(0, -1);
}

function unlockTable() {
  const passwordValue = document.getElementById("tablePassword").value;
  if (passwordValue === PASSWORD) {
    document.getElementById("lockSection").classList.add("hidden");
    document.getElementById("tableSection").classList.remove("hidden");

    const adminControls = document.getElementById("adminControls");
    if (adminControls) {
      // 這裡設定：如果是「客戶」或是「出貨主任」，都隱藏上方的名單管理
      const isCustomer = (stepAValue === "客戶");
      const isShippingDirector = (stepAValue === "作業員" && stepBValue === "出貨主任");
      
      if (isCustomer || isShippingDirector) {
        adminControls.classList.add("hidden");
      } else {
        adminControls.classList.remove("hidden");
      }
    }
    
    renderTable();
  } else {
    alert("密碼錯誤");
    document.getElementById("tablePassword").value = ""; 
  }
}

function lockTable() {
  const passwordEl = document.getElementById("tablePassword");
  if (passwordEl) passwordEl.value = "";
  document.getElementById("lockSection").classList.remove("hidden");
  document.getElementById("tableSection").classList.add("hidden");
}

function formatDateOnly(dateString) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function exportCSV() {
  if (dataList.length === 0) { alert("沒有資料"); return; }

  const wb = XLSX.utils.book_new();
  const customers = [...new Set(dataList.map(d => d.customer))];
  const wsData = [];
  const CUSTOMERS_PER_ROW = 2;

  for (let i = 0; i < customers.length; i += CUSTOMERS_PER_ROW) {
    const currentGroup = customers.slice(i, i + CUSTOMERS_PER_ROW);
    let maxRowsInBlock = 0;
    
    currentGroup.forEach(c => {
      const count = dataList.filter(d => d.customer === c).length;
      if (count > maxRowsInBlock) maxRowsInBlock = count;
    });

    let headerLine = [];
    for (let col = 0; col < CUSTOMERS_PER_ROW; col++) {
      const customerId = currentGroup[col];
      if (customerId) {
        const customerData = dataList.filter(d => d.customer === customerId);
        const dispName = customerData[0] ? (customerData[0].customerName || customerId) : customerId;
        headerLine.push("時間", dispName, "數量", ""); 
      } else {
        headerLine.push("", "", "", ""); 
      }
    }
    wsData.push(headerLine);

    for (let rowIdx = 0; rowIdx < maxRowsInBlock; rowIdx++) {
      let dataLine = [];
      for (let col = 0; col < CUSTOMERS_PER_ROW; col++) {
        const customerId = currentGroup[col];
        if (customerId) {
          const customerData = dataList.filter(d => d.customer === customerId);
          const item = customerData[rowIdx];
          if (item) {
            dataLine.push(formatDateOnly(item.date), item.project, item.quantity, "");
          } else {
            dataLine.push("", "", "", ""); 
          }
        } else {
          dataLine.push("", "", "", "");
        }
      }
      wsData.push(dataLine);
    }
    wsData.push([]); wsData.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [
    { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 3 }, 
    { wch: 12 }, { wch: 15 }, { wch: 10 }              
  ];

  XLSX.utils.book_append_sheet(wb, ws, "報表");
  XLSX.writeFile(wb, "福星客戶報表.xlsx"); 
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return "";
  return String(dateTimeString).replace("T", " ");
}

function formatDateTimeForDisplay(dateTimeString) {
  if (!dateTimeString) return "";
  const date = new Date(dateTimeString);
  if (Number.isNaN(date.getTime())) return formatDateTime(dateTimeString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "下午" : "上午";

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${year}/${month}/${day} ${period} ${String(hours).padStart(2, "0")}:${minutes}`;
}

function toDatetimeLocalValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function escapeHtml(value) {
  const text = String(value ?? "");
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function bindEvents() {
  document.querySelectorAll(".step-a-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const val = button.dataset.val; 
      stepAValue = val; 
      
      if (val === "主管" || val === "財務" || val === "客戶") {
        showPage('DataCenterOnly'); 
        lockTable();
        const passwordInput = document.getElementById("tablePassword");
        if (passwordInput) passwordInput.focus();
      } else {
        showPage('B');
      }
    });
  });

  document.querySelectorAll(".step-b-btn").forEach((button) => {
    button.addEventListener("click", () => {
      stepBValue = button.dataset.val; 
      showPage('1'); 
    });
  });

  const btnAddCustomer = document.getElementById("btnAddCustomer");
  const customerManageList = document.getElementById("customerManageList");
  const btnBackToPage1 = document.getElementById("btnBackToPage1");
  const btnSubmitData = document.getElementById("btnSubmitData");
  const btnPrepareNext = document.getElementById("btnPrepareNext");
  const btnUnlockTable = document.getElementById("btnUnlockTable");
  const btnLockTable = document.getElementById("btnLockTable");
  const btnExportCsv = document.getElementById("btnExportCsv");
  const btnClearQuantity = document.getElementById("btnClearQuantity");
  const btnBackspaceQuantity = document.getElementById("btnBackspaceQuantity");
  const dataTableBody = document.querySelector("#dataTable tbody");

  if (btnAddCustomer) btnAddCustomer.addEventListener("click", addCustomer);
  if (customerManageList) customerManageList.addEventListener("click", handleCustomerManageClick);
  if (btnBackToPage1) btnBackToPage1.addEventListener("click", () => showPage(1));
  if (btnSubmitData) btnSubmitData.addEventListener("click", handleSubmitData);
  if (btnPrepareNext) btnPrepareNext.addEventListener("click", prepareNext);
  if (btnUnlockTable) btnUnlockTable.addEventListener("click", unlockTable);
  if (btnLockTable) btnLockTable.addEventListener("click", lockTable);
  if (btnExportCsv) btnExportCsv.addEventListener("click", exportCSV);
  if (btnClearQuantity) btnClearQuantity.addEventListener("click", clearQuantity);
  if (btnBackspaceQuantity) btnBackspaceQuantity.addEventListener("click", backspaceQuantity);

  document.querySelectorAll(".keypad-btn").forEach((button) => {
    button.addEventListener("click", () => appendQuantity(button.dataset.value));
  });

  if (dataTableBody) dataTableBody.addEventListener("click", handleTableClick);
}