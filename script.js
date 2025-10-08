document.addEventListener("DOMContentLoaded", async function () {
  // --- ELEMENTOS DO DOM ---
  const tableBody = document.getElementById("schoolTableBody");
  const tableHeader = document.getElementById("table-header");
  const searchInput = document.getElementById("searchInput");
  const nteFilter = document.getElementById("nteFilter");
  const municipioFilter = document.getElementById("municipioFilter");
  const logoutButton = document.getElementById("logout-button");
  const counterElement = document.getElementById("escolas-encontradas-counter");
  const detailsModalEl = document.getElementById("detailsModal");
  const projectListModalEl = document.getElementById("projectListModal");

  // --- MODAIS BOOTSTRAP ---
  const detailsModal = new bootstrap.Modal(detailsModalEl);
  const detailsModalBodyContent = document.getElementById("detailsModalBodyContent");
  const projectListModal = projectListModalEl ? new bootstrap.Modal(projectListModalEl) : null;
  const projectListModalTitle = document.getElementById("projectListModalTitle");
  const projectListModalBody = document.getElementById("projectListModalBody");

  // --- ESTADO DA APLICAÇÃO ---
  let schoolData = [];
  let currentlyDisplayedData = [];
  let currentSort = { key: "nte", direction: "asc" }; // AJUSTE: Inicia ordenado por NTE.

  // --- FUNÇÕES UTILITÁRIAS ---
  const formatCurrency = (value) =>
    Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  function cleanAndParseFloat(value) {
    if (typeof value !== "string") return parseFloat(value) || 0;
    const cleanedValue = value.replace(/R\$|\s/g, "").replace(/\./g, "").replace(",", ".");
    return parseFloat(cleanedValue) || 0;
  }

  function parseCSV(csvText) {
    const lines = csvText.trim().replace(/\r/g, "").split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    const data = [];
    const csvRegex = /("([^"]|"")*"|[^,]*)(,|$)/g; // Regex para tratar campos com aspas.

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      let values = [];
      let match;
      csvRegex.lastIndex = 0;
      while ((match = csvRegex.exec(lines[i]))) {
        let value = match[1];
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"');
        }
        values.push(value.trim());
        if (match[3] === "") break;
      }

      const entry = {};
      headers.forEach((header, index) => (entry[header] = values[index] || ""));

      // AJUSTE: Adiciona o 'originalIndex' aqui para otimização.
      // Isso evita o uso de findIndex() repetidamente na renderização.
      data.push({
        originalIndex: data.length, // Armazena o índice original
        nte: entry.nte,
        inep: entry.inep,
        sec: entry.sec,
        escola: entry.escola,
        municipio: entry.municipio,
        saldoInicial: {
          capital: cleanAndParseFloat(entry.saldoInicial_capital),
          custeio: cleanAndParseFloat(entry.saldoInicial_custeio),
          total: cleanAndParseFloat(entry.saldoInicial_total),
        },
        valorComprometido: {
          capital: cleanAndParseFloat(entry.valorComprometido_capital),
          custeio: cleanAndParseFloat(entry.valorComprometido_custeio),
          total: cleanAndParseFloat(entry.valorComprometido_total),
        },
        saldoDisponivel: {
          capital: cleanAndParseFloat(entry.saldoDisponivel_capital),
          custeio: cleanAndParseFloat(entry.saldoDisponivel_custeio),
          total: cleanAndParseFloat(entry.saldoDisponivel_total),
        },
        statusConta: entry.statusConta,
        labInformatica: entry.labInformatica,
        escritoriosCriativos: entry.escritoriosCriativos,
        projetoAgroecologico: entry.projetoAgroecologico,
        labRobotica: entry.labRobotica,
      });
    }
    return data;
  }

  // --- FUNÇÕES DE UI E RENDERIZAÇÃO ---
  function showLoadingState() {
    tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Buscando dados...</p></td></tr>`;
  }

  function showErrorState(message) {
    tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-5"><i class="bi bi-exclamation-triangle-fill text-danger fs-3"></i><p class="mt-2 text-danger">${message}</p></td></tr>`;
  }

  function populateTable(data) {
    tableBody.innerHTML = ""; // Limpa a tabela antes de popular
    if (data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-5">Nenhuma escola encontrada.</td></tr>`;
      return;
    }

    // AJUSTE: Usa DocumentFragment para otimizar a performance de renderização.
    // O DOM é atualizado apenas uma vez no final, em vez de a cada linha.
    const fragment = document.createDocumentFragment();

    data.forEach((school) => {
      const row = document.createElement("tr");

      let statusClass = "status-default";
      const statusText = (school.statusConta || "").toUpperCase();
      if (statusText === "ATIVA") statusClass = "status-ativa";
      else if (statusText.includes("ABERTURA")) statusClass = "status-abertura";
      else if (statusText.includes("REPASSE")) statusClass = "status-repasse";
      else if (statusText.includes("POSSE")) statusClass = "status-posse";
      else if (statusText.includes("REPARO")) statusClass = "status-reparo";

      row.innerHTML = `
        <td data-label="INEP">${school.inep}</td>
        <td data-label="SEC">${school.sec}</td>
        <td data-label="NTE">${school.nte}</td>
        <td data-label="Município">${school.municipio}</td>
        <td data-label="Escola" class="escola-mobile"><strong>${school.escola}</strong></td>
        <td data-label="Saldo Inicial">${formatCurrency(school.saldoInicial.total)}</td>
        <td data-label="Comprometido">${formatCurrency(school.valorComprometido.total)}</td>
        <td data-label="Disponível" class="fw-bold ${school.saldoDisponivel.total < 0 ? "text-danger" : ""}">${formatCurrency(school.saldoDisponivel.total)}</td>
        <td data-label="Status"><span class="status-badge ${statusClass}">${school.statusConta}</span></td>
        <td data-label="Ações"><button class="btn btn-details" data-index="${school.originalIndex}">Detalhes</button></td>
      `;
      fragment.appendChild(row);
    });

    tableBody.appendChild(fragment); // Adiciona todas as linhas de uma só vez.
  }

  function updateCards(data) {
    const sumReducer = (key) => (sum, item) => sum + item[key].total;
    const countImplemented = (key) => data.filter(item => (item[key] || "").toUpperCase() === "IMPLANTADO").length;

    document.getElementById("totalSaldoInicial").textContent = formatCurrency(data.reduce(sumReducer('saldoInicial'), 0));
    document.getElementById("totalSaldoDisponivel").textContent = formatCurrency(data.reduce(sumReducer('saldoDisponivel'), 0));
    document.getElementById("totalComprometido").textContent = formatCurrency(data.reduce(sumReducer('valorComprometido'), 0));
    document.getElementById("totalEscolas").textContent = data.length;
    document.getElementById("labsImplantados").textContent = `${countImplemented('labInformatica')} Implantados`;
    document.getElementById("escritoriosImplantados").textContent = `${countImplemented('escritoriosCriativos')} Implantados`;
    document.getElementById("totalAgro").textContent = `${countImplemented('projetoAgroecologico')} Implantados`;
    document.getElementById("totalRobotica").textContent = `${countImplemented('labRobotica')} Implantados`;
  }

  function populateNteFilter(data) {
    nteFilter.innerHTML = '<option value="todos">Todos os NTEs</option>';
    const ntes = [...new Set(data.map((school) => school.nte).filter(Boolean))];
    // AJUSTE: Garante que a ordenação do filtro seja numérica.
    ntes.sort((a, b) => a - b).forEach((nte) => {
      const option = document.createElement("option");
      option.value = nte;
      option.textContent = nte;
      nteFilter.appendChild(option);
    });
  }

  function populateMunicipioFilter(data) {
    municipioFilter.innerHTML = '<option value="todos">Todos os Municípios</option>';
    const municipios = [...new Set(data.map((school) => school.municipio).filter(Boolean))];
    municipios.sort().forEach((municipio) => {
      const option = document.createElement("option");
      option.value = municipio;
      option.textContent = municipio;
      municipioFilter.appendChild(option);
    });
  }

  // AJUSTE: Função de ordenação corrigida para tratar NTE como número.
  function applySort(data) {
    data.sort((a, b) => {
      const key = currentSort.key;
      const direction = currentSort.direction === "asc" ? 1 : -1;
      let valA, valB;

      if (["saldoInicial", "valorComprometido", "saldoDisponivel"].includes(key)) {
        valA = a[key].total;
        valB = b[key].total;
        return (valA - valB) * direction;
      } else if (key === "nte" || key === "inep" || key === "sec") { // Trata NTE e códigos como números
        valA = parseInt(a[key], 10) || 0;
        valB = parseInt(b[key], 10) || 0;
        return (valA - valB) * direction;
      } else { // Trata o resto como texto
        valA = (a[key] || "").toLowerCase();
        valB = (b[key] || "").toLowerCase();
        return valA.localeCompare(valB) * direction;
      }
    });
  }

  function updateSortIcons() {
    document.querySelectorAll(".sortable-header").forEach((header) => {
      const key = header.getAttribute("data-sort-key");
      const icon = header.querySelector(".sort-icon");
      if (icon) {
        icon.classList.remove("bi-caret-up-fill", "bi-caret-down-fill");
        if (key === currentSort.key) {
          icon.classList.add(currentSort.direction === "asc" ? "bi-caret-up-fill" : "bi-caret-down-fill");
        }
      }
    });
  }

  function showDetailsModal(index) {
    const school = schoolData[index]; // Acesso direto pelo índice, muito mais rápido!
    if (!school) return;

    detailsModalBodyContent.innerHTML = `
      <h4 class="mb-2" style="color: var(--dark-purple);">${school.escola || "Nome não informado"}</h4>
      <p class="text-muted mb-3">${school.municipio || "N/A"} | <strong>NTE:</strong> ${school.nte || "N/A"}</p>
      <div class="school-codes">
        <div><p>CÓDIGO INEP (MEC)</p><span>${school.inep || "N/A"}</span></div>
        <div><p>CÓDIGO SEC</p><span>${school.sec || "N/A"}</span></div>
      </div>
      <div class="modal-body-columns">
        <div class="detail-group">
          <h6><i class="bi bi-cash-stack"></i> Valores Financeiros</h6>
          <div class="row g-3">
            <div class="col-md-4">
              <strong style="color: var(--primary-purple);">Saldo Inicial</strong>
              <div class="detail-item"><p>Capital:</p> <span>${formatCurrency(school.saldoInicial.capital)}</span></div>
              <div class="detail-item"><p>Custeio:</p> <span>${formatCurrency(school.saldoInicial.custeio)}</span></div>
              <div class="detail-item"><p>Total:</p> <span>${formatCurrency(school.saldoInicial.total)}</span></div>
            </div>
            <div class="col-md-4">
              <strong style="color: var(--primary-purple);">Valor Comprometido</strong>
              <div class="detail-item"><p>Capital:</p> <span>${formatCurrency(school.valorComprometido.capital)}</span></div>
              <div class="detail-item"><p>Custeio:</p> <span>${formatCurrency(school.valorComprometido.custeio)}</span></div>
              <div class="detail-item"><p>Total:</p> <span>${formatCurrency(school.valorComprometido.total)}</span></div>
            </div>
            <div class="col-md-4">
              <strong style="color: var(--primary-purple);">Saldo Disponível</strong>
              <div class="detail-item"><p>Capital:</p> <span>${formatCurrency(school.saldoDisponivel.capital)}</span></div>
              <div class="detail-item"><p>Custeio:</p> <span>${formatCurrency(school.saldoDisponivel.custeio)}</span></div>
              <div class="detail-item"><p>Total:</p> <span>${formatCurrency(school.saldoDisponivel.total)}</span></div>
            </div>
          </div>
        </div>
        <div class="detail-group">
          <h6><i class="bi bi-kanban"></i> Status dos Projetos</h6>
          <div class="detail-grid">
            <div class="detail-item"><p>Lab. Informática:</p> <span>${school.labInformatica || "N/A"}</span></div>
            <div class="detail-item"><p>Escritórios Criativos:</p> <span>${school.escritoriosCriativos || "N/A"}</span></div>
            <div class="detail-item"><p>Proj. Agroecológico:</p> <span>${school.projetoAgroecologico || "N/A"}</span></div>
            <div class="detail-item"><p>Lab. Robótica:</p> <span>${school.labRobotica || "N/A"}</span></div>
          </div>
        </div>
      </div>
    `;
    detailsModal.show();
  }

  // --- LÓGICA PRINCIPAL DE FILTRO E EXIBIÇÃO ---
  function filterAndDisplayData() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedNte = nteFilter.value;
    const selectedMunicipio = municipioFilter.value;

    currentlyDisplayedData = schoolData.filter((school) => {
      const matchesSearch =
        (school.escola || "").toLowerCase().includes(searchTerm) ||
        (school.inep || "").includes(searchTerm) ||
        (school.sec || "").includes(searchTerm);
      const matchesNte = selectedNte === "todos" || school.nte === selectedNte;
      const matchesMunicipio = selectedMunicipio === "todos" || school.municipio === selectedMunicipio;
      return matchesSearch && matchesNte && matchesMunicipio;
    });

    applySort(currentlyDisplayedData);
    populateTable(currentlyDisplayedData);
    updateCards(currentlyDisplayedData);
    updateSortIcons();
    counterElement.textContent = `${currentlyDisplayedData.length} escolas encontradas`;
  }

  // --- EVENT LISTENERS ---
  searchInput.addEventListener("keyup", filterAndDisplayData);
  nteFilter.addEventListener("change", filterAndDisplayData);
  municipioFilter.addEventListener("change", filterAndDisplayData);

  tableHeader.addEventListener("click", (e) => {
    const header = e.target.closest(".sortable-header");
    if (!header) return;
    const key = header.getAttribute("data-sort-key");
    if (currentSort.key === key) {
      currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
    } else {
      currentSort.key = key;
      currentSort.direction = "asc";
    }
    filterAndDisplayData();
  });

  tableBody.addEventListener("click", function (e) {
    const button = e.target.closest("button.btn-details");
    if (button) {
      const index = button.getAttribute("data-index");
      if (index !== null) showDetailsModal(index);
    }
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      sessionStorage.removeItem("isLoggedIn");
      window.location.href = "login.html";
    });
  }

  document.querySelectorAll(".clickable-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (!projectListModal) return;
      const projectKey = card.dataset.projectKey;
      const projectName = card.dataset.projectName;

      const schoolsWithProject = currentlyDisplayedData.filter(
        (school) => (school[projectKey] || "").toUpperCase() === "IMPLANTADO"
      );

      projectListModalTitle.textContent = `Unidades com ${projectName} Implantado`;
      projectListModalBody.innerHTML = ""; // Limpa o conteúdo anterior

      if (schoolsWithProject.length === 0) {
        projectListModalBody.innerHTML = '<li class="list-group-item text-center text-muted">Nenhuma unidade encontrada.</li>';
      } else {
        const fragment = document.createDocumentFragment();
        schoolsWithProject.forEach((school) => {
          const li = document.createElement("li");
          li.className = "list-group-item";
          li.innerHTML = `<div class="d-flex justify-content-between align-items-center"><div><div class="fw-bold">${school.escola}</div><small class="text-muted">${school.municipio}</small></div><span class="badge bg-success-subtle text-success-emphasis rounded-pill"><i class="bi bi-check-circle-fill me-1"></i>Implantado</span></div>`;
          fragment.appendChild(li);
        });
        projectListModalBody.appendChild(fragment);
      }
      projectListModal.show();
    });
  });

  // --- FUNÇÃO DE INICIALIZAÇÃO ---
  async function initialize() {
    if (!sessionStorage.getItem("isLoggedIn")) {
      window.location.href = "login.html";
      return;
    }

    showLoadingState();
    try {
      const googleSheetURL = "https://docs.google.com/spreadsheets/d/1Qcvxk7tC9k7l3kjUlw5AgzuVb8aprbJvzrsGEvG4CMA/export?format=csv&gid=305762792";
      const response = await fetch(googleSheetURL);
      if (!response.ok) {
        throw new Error("Falha ao carregar dados. Verifique o link e o compartilhamento da planilha.");
      }
      const csvText = await response.text();
      schoolData = parseCSV(csvText);

      // Popula os elementos da página com os dados iniciais
      populateNteFilter(schoolData);
      populateMunicipioFilter(schoolData); // Renomeei de populateFilters para ser mais específico
      filterAndDisplayData(); // Esta função agora também atualiza os cards

    } catch (error) {
      console.error("Erro ao inicializar a aplicação:", error);
      showErrorState(error.message);
    }
  }

  initialize();
});
