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
    
    let schoolData = []; 
    let currentlyDisplayedData = [];
    let currentSort = { key: 'escola', direction: 'asc' };

    const formatCurrency = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const getStatusIcon = (status = '') => {
        const safeStatus = (status || '').toUpperCase();
        let iconClass = 'bi-question-circle', statusClass = 'nao-se-aplica', title = status || 'N/A';
        switch (safeStatus) {
            case 'IMPLANTADO': iconClass = 'bi-check-circle-fill'; statusClass = 'implantado'; break;
            case 'EM PLANEJAMENTO': iconClass = 'bi-pencil-square'; statusClass = 'planejamento'; break;
            case 'AUTORIZADO': iconClass = 'bi-patch-check'; statusClass = 'autorizado'; break;
            case 'NÃO SE APLICA': iconClass = 'bi-x-circle'; statusClass = 'nao-se-aplica'; break;
        }
        return `<i class="bi ${iconClass} status-icon ${statusClass}" title="${title}"></i>`;
    };

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
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Buscando dados da planilha...</p></td></tr>';
    }
    
    function showErrorState(message) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-5"><i class="bi bi-exclamation-triangle-fill text-danger fs-3"></i><p class="mt-2 text-danger">${message}</p></td></tr>`;
    }

    function populateTable(data) {
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-5">Nenhum resultado encontrado para os filtros aplicados.</td></tr>';
            return;
        }
        data.forEach((school) => {
            const row = document.createElement('tr');
            const saldoDisponivelFormatted = formatCurrency(school.saldoDisponivel.total);
            const saldoClass = school.saldoDisponivel.total < 0 ? 'text-danger' : 'text-success';
            const originalIndex = schoolData.findIndex(originalSchool => originalSchool === school);

            row.innerHTML = `
                <td><strong>${school.escola}</strong></td>
                <td class="d-none d-lg-table-cell">${school.municipio}</td>
                <td class="text-center d-none d-lg-table-cell">${getStatusIcon(school.labInformatica)}</td>
                <td class="text-center d-none d-lg-table-cell">${getStatusIcon(school.escritoriosCriativos)}</td>
                <td class="text-center d-none d-lg-table-cell">${getStatusIcon(school.projetoAgroecologico)}</td>
                <td class="text-center d-none d-lg-table-cell">${getStatusIcon(school.labRobotica)}</td>
                <td class="fw-bold d-none d-lg-table-cell ${saldoClass}">${saldoDisponivelFormatted}</td>
                <td class="actions-cell"><button class="btn btn-details" data-index="${originalIndex}">Detalhes</button></td>
            `;
            if (window.innerWidth < 992) {
                row.innerHTML = `
                    <td data-label="Escola"><strong>${school.escola}</strong></td>
                    <td class="actions-cell"><button class="btn btn-details" data-index="${originalIndex}">Ver Detalhes</button></td>
                `;
            }
            tableBody.appendChild(row);
        });
    }
    
    function updateCards(data) {
        const totalSaldoInicial = data.reduce((sum, item) => sum + item.saldoInicial.total, 0);
        const totalSaldoDisponivel = data.reduce((sum, item) => sum + item.saldoDisponivel.total, 0);
        const totalComprometido = data.reduce((sum, item) => sum + item.valorComprometido.total, 0);
        const labsImplantados = data.filter(item => (item.labInformatica || '').toUpperCase() === 'IMPLANTADO').length;
        const escritoriosImplantados = data.filter(item => (item.escritoriosCriativos || '').toUpperCase() === 'IMPLANTADO').length;
        const totalAgro = data.filter(item => (item.projetoAgroecologico || '').toUpperCase() === 'IMPLANTADO').length;
        const totalRobotica = data.filter(item => (item.labRobotica || '').toUpperCase() === 'IMPLANTADO').length;

        document.getElementById('totalSaldoInicial').textContent = formatCurrency(totalSaldoInicial);
        document.getElementById('totalSaldoDisponivel').textContent = formatCurrency(totalSaldoDisponivel);
        document.getElementById('totalComprometido').textContent = formatCurrency(totalComprometido);
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

    // NOVA FUNÇÃO: Aplica a organização (sort) aos dados
    function applySort(data) {
        data.sort((a, b) => {
            const key = currentSort.key;
            const direction = currentSort.direction === 'asc' ? 1 : -1;
            
            let valA, valB;

            if (key === 'saldoDisponivel') {
                valA = a.saldoDisponivel.total;
                valB = b.saldoDisponivel.total;
                return (valA - valB) * direction;
            } else {
                valA = (a[key] || '').toLowerCase();
                valB = (b[key] || '').toLowerCase();
                return valA.localeCompare(valB) * direction;
            }
        });
    }

    // NOVA FUNÇÃO: Atualiza os ícones de seta nos cabeçalhos
    function updateSortIcons() {
        document.querySelectorAll('.sortable-header').forEach(header => {
            const key = header.getAttribute('data-sort-key');
            const icon = header.querySelector('.sort-icon');
            icon.classList.remove('bi-caret-up-fill', 'bi-caret-down-fill');
            if (key === currentSort.key) {
                icon.classList.add(currentSort.direction === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill');
            }
        });
    }

    function filterAndDisplayData() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedMunicipio = municipioFilter.value;
        
        currentlyDisplayedData = schoolData.filter(school => {
            const matchesSearch = (school.escola || '').toLowerCase().includes(searchTerm) ||
                                  (school.inep || '').includes(searchTerm) ||
                                  (school.sec || '').includes(searchTerm);
            const matchesMunicipio = (selectedMunicipio === 'todos') || (school.municipio === selectedMunicipio);
            return matchesSearch && matchesMunicipio;
        });

        applySort(currentlyDisplayedData); // Aplica a organização atual
        populateTable(currentlyDisplayedData); // Popula a tabela com dados filtrados e organizados
        updateCards(currentlyDisplayedData); // Atualiza os cards com base nos dados filtrados
        updateSortIcons(); // Garante que os ícones estejam corretos
    }
    
    function showDetailsModal(index) {
        const school = schoolData[index];
        if (!school) return;
        const modalBody = document.getElementById('modalBodyContent');
        let statusBadgeClass = 'bg-secondary-subtle text-secondary-emphasis';
        const statusConta = (school.statusConta || '').toUpperCase();
        if (statusConta === 'ATIVA') statusBadgeClass = 'bg-success-subtle text-success-emphasis';
        else if (statusConta.includes('PROCESSO')) statusBadgeClass = 'bg-warning-subtle text-warning-emphasis';
        modalBody.innerHTML = `<h4 class="mb-2" style="color: var(--dark-purple);">${school.escola || 'Nome não informado'}</h4><p class="text-muted mb-3">${school.municipio || 'N/A'} <span class="mx-2">|</span> <strong>Mês de Referência:</strong> ${school.mes || 'N/A'} <span class="mx-2">|</span> <strong>Status da Conta:</strong> <span class="badge ${statusBadgeClass} rounded-pill">${school.statusConta || 'N/A'}</span></p><div class="school-codes"><div><p>CÓDIGO INEP (MEC)</p><span>${school.inep || 'N/A'}</span></div><div><p>CÓDIGO SEC</p><span>${school.sec || 'N/A'}</span></div></div><div class="detail-group"><h6><i class="bi bi-cash-stack"></i> Valores Financeiros</h6><div class="row g-3"><div class="col-md-4"><strong style="color: var(--primary-purple);">Saldo Inicial</strong><div class="detail-item"><p>Capital:</p> <span>${formatCurrency(school.saldoInicial.capital)}</span></div><div class="detail-item"><p>Custeio:</p> <span>${formatCurrency(school.saldoInicial.custeio)}</span></div><div class="detail-item"><p>Total:</p> <span>${formatCurrency(school.saldoInicial.total)}</span></div></div><div class="col-md-4"><strong style="color: var(--primary-purple);">Saldo Comprometido</strong><div class="detail-item"><p>Capital:</p> <span>${formatCurrency(school.valorComprometido.capital)}</span></div><div class="detail-item"><p>Custeio:</p> <span>${formatCurrency(school.valorComprometido.custeio)}</span></div><div class="detail-item"><p>Total:</p> <span>${formatCurrency(school.valorComprometido.total)}</span></div></div><div class="col-md-4"><strong style="color: var(--primary-purple);">Saldo Disponível</strong><div class="detail-item"><p>Capital:</p> <span>${formatCurrency(school.saldoDisponivel.capital)}</span></div><div class="detail-item"><p>Custeio:</p> <span>${formatCurrency(school.saldoDisponivel.custeio)}</span></div><div class="detail-item"><p>Total:</p> <span>${formatCurrency(school.saldoDisponivel.total)}</span></div></div></div></div><div class="detail-group mt-4"><h6><i class="bi bi-kanban"></i> Status dos Projetos</h6><div class="detail-grid"><div class="detail-item"><p>Lab. Informática:</p> <span>${school.labInformatica || 'N/A'}</span></div><div class="detail-item"><p>Escritórios Criativos:</p> <span>${school.escritoriosCriativos || 'N/A'}</span></div><div class="detail-item"><p>Proj. Agroecológico:</p> <span>${school.projetoAgroecologico || 'N/A'}</span></div><div class="detail-item"><p>Lab. Robótica:</p> <span>${school.labRobotica || 'N/A'}</span></div></div></div>`;
        const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
        modal.show();
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
        filterAndDisplayData(); // Refiltra e reorganiza
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

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { filterAndDisplayData(); }, 250);
    });

    // --- INICIALIZAÇÃO ---
    async function initialize() {
        showLoadingState();
        try {
            const response = await fetch(googleSheetURL);
            if (!response.ok) throw new Error('Falha ao carregar os dados. Verifique o link e se a planilha está compartilhada como "Qualquer pessoa com o link".');
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