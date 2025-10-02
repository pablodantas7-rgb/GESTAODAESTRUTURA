document.addEventListener("DOMContentLoaded", async function() {

    const googleSheetURL = 'https://docs.google.com/spreadsheets/d/1Qcvxk7tC9k7l3kjUlw5AgzuVb8aprbJvzrsGEvG4CMA/export?format=csv&gid=305762792';

    if (!sessionStorage.getItem('isLoggedIn')) {
        window.location.href = 'login.html';
        return; 
    }

    const tableBody = document.getElementById('schoolTableBody');
    const tableHeader = document.getElementById('table-header');
    const searchInput = document.getElementById('searchInput');
    const municipioFilter = document.getElementById('municipioFilter');
    const logoutButton = document.getElementById('logout-button');
    const counterElement = document.getElementById('escolas-encontradas-counter');
    
    const detailsModalEl = document.getElementById('detailsModal');
    const detailsModal = new bootstrap.Modal(detailsModalEl);
    const detailsModalBodyContent = document.getElementById('detailsModalBodyContent');

    const projectListModalEl = document.getElementById('projectListModal');
    const projectListModal = projectListModalEl ? new bootstrap.Modal(projectListModalEl) : null;
    const projectListModalTitle = document.getElementById('projectListModalTitle');
    const projectListModalBody = document.getElementById('projectListModalBody');

    let schoolData = []; 
    let currentlyDisplayedData = [];
    let currentSort = { key: 'escola', direction: 'asc' };

    const formatCurrency = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    function cleanAndParseFloat(value) {
        if (typeof value !== 'string') return parseFloat(value) || 0;
        const cleanedValue = value.replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanedValue) || 0;
    }

    function parseCSV(csvText) {
        const lines = csvText.trim().replace(/\r/g, "").split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        const csvRegex = /("([^"]|"")*"|[^,]*)(,|$)/g;
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue;
            let values = [];
            let match;
            csvRegex.lastIndex = 0; 
            while (match = csvRegex.exec(lines[i])) {
                let value = match[1];
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/""/g, '"');
                values.push(value.trim());
                if (match[3] === '') break;
            }
            const entry = {};
            headers.forEach((header, index) => entry[header] = values[index] || '');
            data.push({
                mes: entry.mes, inep: entry.inep, sec: entry.sec, escola: entry.escola, municipio: entry.municipio,
                saldoInicial: { capital: cleanAndParseFloat(entry.saldoInicial_capital), custeio: cleanAndParseFloat(entry.saldoInicial_custeio), total: cleanAndParseFloat(entry.saldoInicial_total) },
                valorComprometido: { capital: cleanAndParseFloat(entry.valorComprometido_capital), custeio: cleanAndParseFloat(entry.valorComprometido_custeio), total: cleanAndParseFloat(entry.valorComprometido_total) },
                saldoDisponivel: { capital: cleanAndParseFloat(entry.saldoDisponivel_capital), custeio: cleanAndParseFloat(entry.saldoDisponivel_custeio), total: cleanAndParseFloat(entry.saldoDisponivel_total) },
                statusConta: entry.statusConta, labInformatica: entry.labInformatica, escritoriosCriativos: entry.escritoriosCriativos, projetoAgroecologico: entry.projetoAgroecologico, labRobotica: entry.labRobotica,
            });
        }
        return data;
    }

    function showLoadingState() {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Buscando dados...</p></td></tr>`;
    }

    function showErrorState(message) {
        tableBody.innerHTML = `<tr><td colspan="9" class="text-center py-5"><i class="bi bi-exclamation-triangle-fill text-danger fs-3"></i><p class="mt-2 text-danger">${message}</p></td></tr>`;
    }

    function populateTable(data) {
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center py-5">Nenhuma escola encontrada.</td></tr>';
            return;
        }
        data.forEach((school) => {
            const row = document.createElement('tr');
            const originalIndex = schoolData.findIndex(originalSchool => originalSchool === school);
            
            let statusClass = 'status-default';
            const statusText = (school.statusConta || '').toUpperCase();
            if (statusText === 'ATIVA') {
                statusClass = 'status-ativa';
            } else if (statusText.includes('ABERTURA')) {
                statusClass = 'status-abertura';
            } else if (statusText.includes('REPASSE')) {
                statusClass = 'status-repasse';
            } else if (statusText.includes('POSSE')) {
                statusClass = 'status-posse';
            } else if (statusText.includes('REPARO')) {
                statusClass = 'status-reparo';
            }

            row.innerHTML = `
                <td><strong>${school.escola}</strong></td>
                <td>${school.inep}</td>
                <td>${school.sec}</td>
                <td>${school.municipio}</td>
                <td>${formatCurrency(school.saldoInicial.total)}</td>
                <td>${formatCurrency(school.valorComprometido.total)}</td>
                <td class="fw-bold ${school.saldoDisponivel.total < 0 ? 'text-danger' : ''}">${formatCurrency(school.saldoDisponivel.total)}</td>
                <td><span class="status-badge ${statusClass}">${school.statusConta}</span></td>
                <td><button class="btn btn-details" data-index="${originalIndex}">Detalhes</button></td>
            `;
            tableBody.appendChild(row);
        });
    }

    function updateCards(data) {
        const totalSaldoInicial = data.reduce((sum, item) => sum + item.saldoInicial.total, 0);
        const totalSaldoDisponivel = data.reduce((sum, item) => sum + item.saldoDisponivel.total, 0);
        const totalComprometido = data.reduce((sum, item) => sum + item.valorComprometido.total, 0);
        document.getElementById('totalSaldoInicial').textContent = formatCurrency(totalSaldoInicial);
        document.getElementById('totalSaldoDisponivel').textContent = formatCurrency(totalSaldoDisponivel);
        document.getElementById('totalComprometido').textContent = formatCurrency(totalComprometido);
        document.getElementById('totalEscolas').textContent = data.length;

        const labsImplantados = data.filter(item => (item.labInformatica || '').toUpperCase() === 'IMPLANTADO').length;
        const escritoriosImplantados = data.filter(item => (item.escritoriosCriativos || '').toUpperCase() === 'IMPLANTADO').length;
        const totalAgro = data.filter(item => (item.projetoAgroecologico || '').toUpperCase() === 'IMPLANTADO').length;
        const totalRobotica = data.filter(item => (item.labRobotica || '').toUpperCase() === 'IMPLANTADO').length;
        document.getElementById('labsImplantados').textContent = `${labsImplantados} Implantados`;
        document.getElementById('escritoriosImplantados').textContent = `${escritoriosImplantados} Implantados`;
        document.getElementById('totalAgro').textContent = `${totalAgro} Implantados`;
        document.getElementById('totalRobotica').textContent = `${totalRobotica} Implantados`;
    }

    function populateFilters(data) {
        municipioFilter.innerHTML = '<option value="todos">Todos os Municípios</option>';
        const municipios = [...new Set(data.map(school => school.municipio))];
        municipios.sort().forEach(municipio => {
            if(municipio) {
                const option = document.createElement('option');
                option.value = municipio;
                option.textContent = municipio;
                municipioFilter.appendChild(option);
            }
        });
    }

    function applySort(data) {
        data.sort((a, b) => {
            const key = currentSort.key;
            const direction = currentSort.direction === 'asc' ? 1 : -1;
            let valA, valB;
            if (['saldoInicial', 'valorComprometido', 'saldoDisponivel'].includes(key)) {
                valA = a[key].total;
                valB = b[key].total;
                return (valA - valB) * direction;
            } else {
                valA = (a[key] || '').toLowerCase();
                valB = (b[key] || '').toLowerCase();
                return valA.localeCompare(valB) * direction;
            }
        });
    }

    function updateSortIcons() {
        document.querySelectorAll('.sortable-header').forEach(header => {
            const key = header.getAttribute('data-sort-key');
            const icon = header.querySelector('.sort-icon');
            if(icon){
                icon.classList.remove('bi-caret-up-fill', 'bi-caret-down-fill');
                if (key === currentSort.key) {
                    icon.classList.add(currentSort.direction === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill');
                }
            }
        });
    }

    function filterAndDisplayData() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedMunicipio = municipioFilter.value;
        currentlyDisplayedData = schoolData.filter(school => {
            const matchesSearch = (school.escola || '').toLowerCase().includes(searchTerm) || (school.inep || '').includes(searchTerm) || (school.sec || '').includes(searchTerm);
            const matchesMunicipio = (selectedMunicipio === 'todos') || (school.municipio === selectedMunicipio);
            return matchesSearch && matchesMunicipio;
        });
        applySort(currentlyDisplayedData);
        populateTable(currentlyDisplayedData);
        updateCards(currentlyDisplayedData);
        updateSortIcons();
        counterElement.textContent = `${currentlyDisplayedData.length} escolas encontradas`;
    }
    
    function showDetailsModal(index) {
        const school = schoolData[index];
        if (!school) return;
        let statusBadgeClass = 'bg-secondary-subtle text-secondary-emphasis';
        const statusConta = (school.statusConta || '').toUpperCase();
        if (statusConta === 'ATIVA') statusBadgeClass = 'bg-success-subtle text-success-emphasis';
        else if (statusConta.includes('PROCESSO')) statusBadgeClass = 'bg-warning-subtle text-warning-emphasis';
        
        detailsModalBodyContent.innerHTML = `
            <h4 class="mb-2" style="color: var(--dark-purple);">${school.escola || 'Nome não informado'}</h4>
            <p class="text-muted mb-3">${school.municipio || 'N/A'} | <strong>Mês:</strong> ${school.mes || 'N/A'}</p>
            <div class="school-codes">
                <div><p>CÓDIGO INEP (MEC)</p><span>${school.inep || 'N/A'}</span></div>
                <div><p>CÓDIGO SEC</p><span>${school.sec || 'N/A'}</span></div>
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
                            <strong style="color: var(--primary-purple);">Saldo Comprometido</strong>
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
                        <div class="detail-item"><p>Lab. Informática:</p> <span>${school.labInformatica || 'N/A'}</span></div>
                        <div class="detail-item"><p>Escritórios Criativos:</p> <span>${school.escritoriosCriativos || 'N/A'}</span></div>
                        <div class="detail-item"><p>Proj. Agroecológico:</p> <span>${school.projetoAgroecologico || 'N/A'}</span></div>
                        <div class="detail-item"><p>Lab. Robótica:</p> <span>${school.labRobotica || 'N/A'}</span></div>
                    </div>
                </div>
            </div>
        `;
        detailsModal.show();
    }
    
    // --- EVENT LISTENERS ---
    searchInput.addEventListener('keyup', filterAndDisplayData);
    municipioFilter.addEventListener('change', filterAndDisplayData);
    tableHeader.addEventListener('click', (e) => {
        const header = e.target.closest('.sortable-header');
        if (!header) return;
        const key = header.getAttribute('data-sort-key');
        if (currentSort.key === key) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.key = key;
            currentSort.direction = 'asc';
        }
        filterAndDisplayData();
    });
    tableBody.addEventListener('click', function(e) {
        const button = e.target.closest('button.btn-details');
        if (button) {
            const index = button.getAttribute('data-index');
            if (index !== null) showDetailsModal(index);
        }
    });
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('isLoggedIn');
            window.location.href = 'login.html';
        });
    }
    document.querySelectorAll('.clickable-card').forEach(card => {
        card.addEventListener('click', () => {
            if (!projectListModal) return;
            const projectKey = card.dataset.projectKey;
            const projectName = card.dataset.projectName;
            const schoolsWithProject = schoolData.filter(school => (school[projectKey] || '').toUpperCase() === 'IMPLANTADO');
            projectListModalTitle.textContent = `Unidades com ${projectName} Implantado`;
            projectListModalBody.innerHTML = '';
            if (schoolsWithProject.length === 0) {
                const li = document.createElement('li');
                li.className = 'list-group-item text-center text-muted';
                li.textContent = 'Nenhuma unidade encontrada.';
                projectListModalBody.appendChild(li);
            } else {
                schoolsWithProject.forEach(school => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.innerHTML = `<div class="d-flex justify-content-between align-items-center"><div><div class="fw-bold">${school.escola}</div><small class="text-muted">${school.municipio}</small></div><span class="badge bg-success-subtle text-success-emphasis rounded-pill"><i class="bi bi-check-circle-fill me-1"></i>Implantado</span></div>`;
                    projectListModalBody.appendChild(li);
                });
            }
            projectListModal.show();
        });
    });
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { filterAndDisplayData(); }, 250);
    });

    async function initialize() {
        showLoadingState();
        try {
            const response = await fetch(googleSheetURL);
            if (!response.ok) throw new Error('Falha ao carregar dados. Verifique o link e o compartilhamento da planilha.');
            const csvText = await response.text();
            schoolData = parseCSV(csvText);
            populateFilters(schoolData);
            filterAndDisplayData();
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            showErrorState(error.message);
        }
    }

    initialize();
});