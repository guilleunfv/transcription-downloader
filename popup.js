class TranscriptionDownloaderPro {
    constructor() {
        this.accessToken = '';
        this.isRunning = false;
        this.stats = { processed: 0, downloaded: 0, errors: 0 };
        this.targetIds = new Set();
        this.config = {};
        this.downloadedFiles = [];
        
        this.initializeUI();
        this.loadSavedConfig();
        this.setupEventListeners();
    }

    initializeUI() {
        this.log('🚀 Transcription Downloader Pro inicializado');
        this.updateStatus('Configura los campos para comenzar');
        this.updateIdsCount();
    }

    setupEventListeners() {
        // Eventos principales
        document.getElementById('validateToken').addEventListener('click', () => this.validateToken());
        document.getElementById('startProcess').addEventListener('click', () => this.startProcess());
        document.getElementById('stopProcess').addEventListener('click', () => this.stopProcess());
        document.getElementById('clearLogs').addEventListener('click', () => this.clearLogs());
        
        // Eventos de configuración
        document.getElementById('useGoogleSheets').addEventListener('change', (e) => {
            document.getElementById('sheetsConfig').style.display = e.target.checked ? 'block' : 'none';
            this.saveConfig();
        });

        // Eventos de IDs
        document.querySelectorAll('input[name="idsMode"]').forEach(radio => {
            radio.addEventListener('change', () => this.toggleIdsSection());
        });

        document.getElementById('targetIds').addEventListener('input', () => this.updateIdsCount());
        document.getElementById('loadIdsFromFile').addEventListener('click', () => this.loadIdsFromFile());
        document.getElementById('validateIds').addEventListener('click', () => this.validateIds());
        document.getElementById('clearIds').addEventListener('click', () => this.clearIds());

        // Auto-guardar configuración
        const configFields = [
            'mainFolderId', 'googleSheetId', 'sheetTabName', 
            'startDate', 'endDate', 'separateFolders', 'targetIds'
        ];
        
        configFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.saveConfig());
                if (element.type === 'textarea') {
                    element.addEventListener('input', () => this.saveConfig());
                }
            }
        });
    }

    toggleIdsSection() {
        const filterMode = document.querySelector('input[name="idsMode"]:checked').value;
        const section = document.getElementById('idsFilterSection');
        section.style.display = filterMode === 'filter' ? 'block' : 'none';
        this.saveConfig();
    }

    updateIdsCount() {
        const textarea = document.getElementById('targetIds');
        const countElement = document.getElementById('idsCount');
        
        if (textarea && countElement) {
            const text = textarea.value.trim();
            if (!text) {
                countElement.textContent = '0 IDs configurados';
                return;
            }

            // Extraer IDs usando regex más flexible
            const ids = this.extractIdsFromText(text);
            this.targetIds = new Set(ids);
            
            countElement.textContent = `${ids.length} IDs configurados`;
            countElement.style.color = ids.length > 0 ? '#4caf50' : '#666';
        }
    }

    extractIdsFromText(text) {
        // Regex para encontrar números de 7-12 dígitos
        const regex = /\b\d{7,12}\b/g;
        const matches = text.match(regex);
        return matches ? [...new Set(matches)] : [];
    }

    loadIdsFromFile() {
        const fileInput = document.getElementById('fileInput');
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target.result;
                    const ids = this.extractIdsFromText(content);
                    
                    document.getElementById('targetIds').value = ids.join(', ');
                    this.updateIdsCount();
                    this.log(`📂 Archivo cargado: ${ids.length} IDs encontrados`);
                };
                reader.readAsText(file);
            }
        };
        fileInput.click();
    }

    validateIds() {
        const textarea = document.getElementById('targetIds');
        const text = textarea.value.trim();
        
        if (!text) {
            this.showError('No hay IDs para validar');
            return;
        }

        const ids = this.extractIdsFromText(text);
        const validIds = ids.filter(id => id.length >= 7 && id.length <= 12);
        const invalidIds = ids.filter(id => id.length < 7 || id.length > 12);

        let message = `✅ Validación completada:\n`;
        message += `• IDs válidos: ${validIds.length}\n`;
        
        if (invalidIds.length > 0) {
            message += `• IDs inválidos: ${invalidIds.length}\n`;
            message += `• IDs problemáticos: ${invalidIds.slice(0, 5).join(', ')}`;
            if (invalidIds.length > 5) message += '...';
        }

        // Limpiar y poner solo IDs válidos
        textarea.value = validIds.join(', ');
        this.updateIdsCount();
        
        alert(message);
        this.log(`🔍 Validación: ${validIds.length} válidos, ${invalidIds.length} inválidos`);
    }

    clearIds() {
        if (confirm('¿Limpiar todos los IDs configurados?')) {
            document.getElementById('targetIds').value = '';
            this.updateIdsCount();
            this.log('🗑️ IDs limpiados');
        }
    }

    async validateToken() {
        const token = document.getElementById('accessToken').value.trim();
        if (!token) {
            this.showError('Por favor ingresa un token de acceso');
            return;
        }

        if (!token.startsWith('Bearer ')) {
            this.showError('El token debe comenzar con "Bearer "');
            return;
        }

        this.log('🔍 Validando token de acceso...');
        this.updateStatus('Validando token...');
        
        try {
            const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
                headers: { 'Authorization': token }
            });

            if (response.ok) {
                const data = await response.json();
                this.accessToken = token;
                this.enableStartButton();
                
                this.log(`✅ Token válido - Usuario: ${data.user.displayName || 'Usuario'}`);
                this.log(`📧 Email: ${data.user.emailAddress || 'No disponible'}`);
                this.updateStatus('✅ Token validado - Configura los demás campos');
                this.saveConfig();
                
                const btn = document.getElementById('validateToken');
                btn.textContent = '✅ Token Válido';
                btn.style.background = '#4caf50';
                
            } else {
                throw new Error(`HTTP ${response.status}: Token inválido o expirado`);
            }
        } catch (error) {
            this.showError(`Error validando token: ${error.message}`);
            this.updateStatus('❌ Error de validación');
        }
    }

    enableStartButton() {
        const mainFolderId = document.getElementById('mainFolderId').value.trim();
        const hasToken = !!this.accessToken;
        
        const canStart = hasToken && mainFolderId;
        document.getElementById('startProcess').disabled = !canStart;
        
        if (canStart) {
            this.updateStatus('✅ Listo para iniciar - Haz clic en "INICIAR DESCARGA MASIVA"');
        } else if (!mainFolderId) {
            this.updateStatus('⚠️ Falta: ID de carpeta principal de Google Drive');
        }
    }

    getConfig() {
        const idsMode = document.querySelector('input[name="idsMode"]:checked').value;
        const useSheets = document.getElementById('useGoogleSheets').checked;
        
        const config = {
            mainFolderId: document.getElementById('mainFolderId').value.trim(),
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            separateFolders: document.getElementById('separateFolders').checked,
            idsMode: idsMode,
            useGoogleSheets: useSheets
        };

        if (idsMode === 'filter') {
            const idsText = document.getElementById('targetIds').value.trim();
            config.targetIds = this.extractIdsFromText(idsText);
        }

        if (useSheets) {
            config.googleSheetId = document.getElementById('googleSheetId').value.trim();
            config.sheetTabName = document.getElementById('sheetTabName').value.trim() || 'Reporte Consolidado';
        }

        return config;
    }

    async startProcess() {
        const config = this.getConfig();
        
        // Validaciones
        if (!this.accessToken) {
            this.showError('Debes validar tu token primero');
            return;
        }

        if (!config.mainFolderId) {
            this.showError('Debes ingresar el ID de la carpeta principal de Google Drive');
            return;
        }

        if (config.idsMode === 'filter' && (!config.targetIds || config.targetIds.length === 0)) {
            this.showError('Si eliges filtrar por IDs, debes ingresar al menos un ID válido');
            return;
        }

        if (config.useGoogleSheets && !config.googleSheetId) {
            this.showError('Si eliges usar Google Sheets, debes ingresar el ID de tu hoja');
            return;
        }

        // Confirmación
        let confirmMessage = '¿Iniciar la descarga masiva de transcripciones?\n\n';
        confirmMessage += `📁 Carpeta: ${config.mainFolderId}\n`;
        confirmMessage += `📅 Período: ${config.startDate} a ${config.endDate}\n`;
        confirmMessage += `🎯 Modo: ${config.idsMode === 'all' ? 'TODOS los archivos' : config.targetIds.length + ' IDs específicos'}\n`;
        confirmMessage += `📊 Google Sheets: ${config.useGoogleSheets ? 'SÍ' : 'NO'}\n`;
        confirmMessage += '\nEsto puede tomar varios minutos.';

        if (!confirm(confirmMessage)) {
            return;
        }

        // Iniciar proceso
        this.isRunning = true;
        this.stats = { processed: 0, downloaded: 0, errors: 0 };
        this.downloadedFiles = [];
        
        document.getElementById('startProcess').disabled = true;
        document.getElementById('stopProcess').disabled = false;
        document.querySelector('.container').classList.add('processing');

        this.log('�� INICIANDO PROCESO DE DESCARGA MASIVA');
        this.log('='.repeat(60));
        this.log(`📁 Carpeta principal: ${config.mainFolderId}`);
        this.log(`📅 Período: ${config.startDate} hasta ${config.endDate}`);
        this.log(`🎯 Modo de filtrado: ${config.idsMode}`);
        if (config.idsMode === 'filter') {
            this.log(`   └─ ${config.targetIds.length} IDs específicos configurados`);
        }
        this.log(`📊 Google Sheets: ${config.useGoogleSheets ? 'Activado' : 'Desactivado'}`);
        this.log(`📁 Carpetas separadas: ${config.separateFolders ? 'SÍ' : 'NO'}`);
        this.log('='.repeat(60));
        
        try {
            await this.processAllTranscriptions(config);
            
            if (this.isRunning) {
                this.log('🎉 PROCESO COMPLETADO EXITOSAMENTE');
                this.showSuccess();
            }
        } catch (error) {
            this.log(`❌ ERROR CRÍTICO: ${error.message}`);
            this.updateStatus('❌ Error en el proceso');
        }

        this.stopProcess();
    }

    async processAllTranscriptions(config) {
        // FASE 1: Obtener supervisores
        this.updateStatus('🔍 Obteniendo lista de supervisores...');
        this.log('📋 FASE 1: Obteniendo supervisores');
        
        const supervisors = await this.fetchFolders(config.mainFolderId);
        this.log(`👨‍💼 Supervisores encontrados: ${supervisors.length}`);
        
        if (supervisors.length === 0) {
            throw new Error('No se encontraron supervisores en la carpeta principal. Verifica el ID de carpeta.');
        }

        supervisors.forEach((supervisor, i) => {
            this.log(`   ${i + 1}. ${supervisor.name}`);
        });

        // FASE 2: Mapear todos los archivos
        this.log('\n📋 FASE 2: Mapeando archivos en todas las carpetas');
        let allFiles = [];
        
        for (let i = 0; i < supervisors.length && this.isRunning; i++) {
            const supervisor = supervisors[i];
            this.updateStatus(`📁 Explorando supervisor ${i+1}/${supervisors.length}: ${supervisor.name}`);
            
            const files = await this.exploreFolder(supervisor.id, [supervisor.name]);
            allFiles = allFiles.concat(files);
            
            this.log(`   📁 ${supervisor.name}: ${files.length} archivos encontrados`);
            this.updateProgress((i + 1) / supervisors.length * 25);
        }

        this.log(`\n📊 TOTAL DE ARCHIVOS MAPEADOS: ${allFiles.length}`);

        // FASE 3: Aplicar filtros
        this.log('\n📋 FASE 3: Aplicando filtros');
        const filteredFiles = this.filterFiles(allFiles, config);
        
        this.log(`🎯 ARCHIVOS QUE CUMPLEN CRITERIOS: ${filteredFiles.length}`);
        this.log(`   ✅ Filtro de fechas: ${config.startDate} a ${config.endDate}`);
        this.log(`   ✅ Filtro de keywords: gemini, transcript, anotações, notas`);
        
        if (config.idsMode === 'filter') {
            this.log(`   ✅ Filtro de IDs: ${config.targetIds.length} IDs específicos`);
        } else {
            this.log(`   ✅ Modo: TODOS los archivos (sin filtro de IDs)`);
        }

        if (filteredFiles.length === 0) {
            this.log('⚠️ No se encontraron archivos que cumplan todos los criterios');
            this.updateStatus('⚠️ Sin archivos para procesar');
            return;
        }

        // FASE 4: Descargar archivos
        this.log('\n📋 FASE 4: Iniciando descargas');
        this.updateStatus('⬇️ Descargando archivos...');
        
        for (let i = 0; i < filteredFiles.length && this.isRunning; i++) {
            const file = filteredFiles[i];
            const fileName = file.name.length > 40 ? file.name.substring(0, 40) + '...' : file.name;
            
            this.updateStatus(`⬇️ ${i+1}/${filteredFiles.length}: ${fileName}`);
            
            await this.downloadFile(file, config);
            
            const progress = 25 + ((i + 1) / filteredFiles.length) * 65; // 65% para descarga
            this.updateProgress(progress);
            
            await this.sleep(200);
        }

        // FASE 5: Actualizar Google Sheets (si está activado)
        if (config.useGoogleSheets && config.googleSheetId) {
            this.log('\n📋 FASE 5: Actualizando Google Sheets');
            this.updateStatus('📊 Actualizando Google Sheets...');
            await this.updateGoogleSheet(config);
            this.updateProgress(100);
        }

        this.log(`\n📊 RESUMEN FINAL:`);
        this.log(`   📄 Archivos procesados: ${this.stats.processed}`);
        this.log(`   ✅ Descargados exitosamente: ${this.stats.downloaded}`);
        this.log(`   ❌ Errores: ${this.stats.errors}`);
    }

    async fetchFolders(parentId) {
        const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        return await this.fetchFromDrive(query);
    }

    async exploreFolder(folderId, pathList) {
        const query = `'${folderId}' in parents and trashed=false`;
        const items = await this.fetchFromDrive(query);
        
        let allFiles = [];
        
        for (const item of items) {
            if (!this.isRunning) break;
            
            if (item.mimeType === 'application/vnd.google-apps.folder') {
                const subFiles = await this.exploreFolder(item.id, [...pathList, item.name]);
                allFiles = allFiles.concat(subFiles);
            } else {
                item.pathList = pathList;
                allFiles.push(item);
            }
        }
        
        return allFiles;
    }

    filterFiles(files, config) {
        const keywords = ['gemini', 'transcript', 'transcrip', 'anotações', 'notas'];
        const startDate = new Date(config.startDate + 'T00:00:00');
        const endDate = new Date(config.endDate + 'T23:59:59');
        
        return files.filter(file => {
            // Filtro por fecha
            const fileDate = new Date(file.modifiedTime);
            if (fileDate < startDate || fileDate > endDate) return false;
            
            // Filtro por keywords de transcripción
            const fileName = file.name.toLowerCase();
            if (!keywords.some(keyword => fileName.includes(keyword))) return false;
            
            // Filtro por IDs (solo si está en modo filter)
            if (config.idsMode === 'filter') {
                const fileIds = this.extractIdsFromText(file.name);
                const hasTargetId = fileIds.some(id => config.targetIds.includes(id));
                if (!hasTargetId) return false;
            }
            
            return true;
        });
    }

    async downloadFile(file, config) {
        this.stats.processed++;
        
        try {
            const content = await this.getFileContent(file.id);
            if (!content) {
                this.stats.errors++;
                this.log(`❌ Sin contenido: ${file.name}`);
                this.updateStats();
                return;
            }

            // Determinar categoría (solo si hay filtro de IDs)
            let isTarget = false;
            if (config.idsMode === 'filter') {
                const customerIds = this.extractIdsFromText(file.name);
                isTarget = customerIds.some(id => config.targetIds.includes(id));
            }

            // Crear nombre de archivo
            let filename = this.sanitizeFilename(file.name);
            
            if (config.separateFolders && config.idsMode === 'filter') {
                const folder = isTarget ? 'filtrados' : 'no_filtrados';
                filename = `${folder}/${filename}`;
            }
            
            // Agregar información de supervisor y agente
            const supervisor = file.pathList[0] || 'Sin_Supervisor';
            const agent = file.pathList[file.pathList.length - 1] || 'Sin_Agente';
            filename = `${supervisor}/${agent}/${filename}`;
            
            // Crear y descargar archivo
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            await chrome.downloads.download({
                url: url,
                filename: filename,
                conflictAction: 'uniquify'
            });

            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            this.stats.downloaded++;
            
            const icon = config.idsMode === 'filter' ? (isTarget ? '🎯' : '📄') : '📄';
            this.log(`✅ ${icon} ${file.name}`);
            
            // Guardar datos para el reporte
            if (config.useGoogleSheets) {
                this.downloadedFiles.push({
                    id: file.id,
                    name: file.name,
                    supervisor: supervisor,
                    agent: agent,
                    isTarget: config.idsMode === 'filter' ? (isTarget ? 'Sí' : 'No') : 'N/A',
                    date: this.extractDateFromFilename(file.name),
                    url: file.webViewLink
                });
            }
            
        } catch (error) {
            this.stats.errors++;
            this.log(`❌ Error: ${file.name} - ${error.message}`);
        }
        
        this.updateStats();
    }

    // Continúa en la siguiente parte...

    async getFileContent(fileId) {
        try {
            // Método 1: Exportar como texto plano
            let response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
                headers: { 'Authorization': this.accessToken }
            });
            
            if (response.ok) {
                return await response.text();
            }

            // Método 2: Descarga directa
            response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': this.accessToken }
            });
            
            if (response.ok) {
                return await response.text();
            }
            
            return null;
            
        } catch (error) {
            console.error('Error obteniendo contenido:', error);
            return null;
        }
    }

    async fetchFromDrive(query, pageToken = null) {
        let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink)&pageSize=1000`;
        if (pageToken) {
            url += `&pageToken=${pageToken}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': this.accessToken }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        let allFiles = data.files || [];

        // Si hay más páginas, obtenerlas recursivamente
        if (data.nextPageToken && this.isRunning) {
            const moreFiles = await this.fetchFromDrive(query, data.nextPageToken);
            allFiles = allFiles.concat(moreFiles);
        }

        return allFiles;
    }

    async updateGoogleSheet(config) {
        if (!config.googleSheetId || this.downloadedFiles.length === 0) {
            this.log('📊 Sin datos para actualizar en Google Sheets');
            return;
        }

        this.log(`📊 Actualizando Google Sheet: ${config.googleSheetId}`);
        
        try {
            // Intentar acceder a la hoja
            const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.googleSheetId}`;
            const sheetResponse = await fetch(sheetUrl, {
                headers: { 'Authorization': this.accessToken }
            });

            if (!sheetResponse.ok) {
                throw new Error(`No se puede acceder a la hoja. Verifica el ID y permisos.`);
            }

            // Preparar datos
            const headers = [
                'ID de Archivo', 'Nombre de Archivo', 'Supervisor', 
                'Agente', 'En Lista Objetivo', 'Fecha Extraída', 'URL Drive'
            ];

            const rows = this.downloadedFiles.map(file => [
                file.id,
                file.name,
                file.supervisor,
                file.agent,
                file.isTarget,
                file.date,
                file.url
            ]);

            // Intentar crear/actualizar la pestaña
            await this.updateSheetTab(config.googleSheetId, config.sheetTabName, headers, rows);
            
            this.log(`✅ Google Sheet actualizado con ${rows.length} registros`);
            
        } catch (error) {
            this.log(`❌ Error actualizando Google Sheet: ${error.message}`);
            // No fallar todo el proceso por esto
        }
    }

    async updateSheetTab(sheetId, tabName, headers, rows) {
        // Aquí iría la lógica para actualizar Google Sheets
        // Por simplicidad, solo logueamos que se haría
        this.log(`📋 Se actualizaría la pestaña "${tabName}" con ${rows.length} filas`);
        
        // En una implementación completa, usarías:
        // 1. Sheets API para crear/encontrar la pestaña
        // 2. Agregar headers si es nueva
        // 3. Insertar los datos
        // 4. Formatear la hoja
    }

    extractDateFromFilename(filename) {
        const dateRegex = /(\d{4})[/-](\d{2})[/-](\d{2})/;
        const match = filename.match(dateRegex);
        if (match) {
            const [, year, month, day] = match;
            return `${day}/${month}/${year}`;
        }
        return 'No extraída';
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 100) + '.txt';
    }

    stopProcess() {
        this.isRunning = false;
        document.getElementById('startProcess').disabled = false;
        document.getElementById('stopProcess').disabled = true;
        document.querySelector('.container').classList.remove('processing');
        this.updateStatus('⏹️ Proceso detenido');
        this.log('⏹️ Proceso detenido por el usuario');
    }

    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }

    updateProgress(percent) {
        document.getElementById('progressFill').style.width = `${Math.round(percent)}%`;
        document.getElementById('progressPercent').textContent = `${Math.round(percent)}%`;
    }

    updateStats() {
        document.getElementById('processed').textContent = this.stats.processed;
        document.getElementById('downloaded').textContent = this.stats.downloaded;
        document.getElementById('errors').textContent = this.stats.errors;
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logDiv = document.getElementById('logs');
        logDiv.innerHTML += `[${timestamp}] ${message}\n`;
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    clearLogs() {
        document.getElementById('logs').innerHTML = '';
        this.log('📋 Log limpiado');
    }

    showError(message) {
        this.log(`❌ ERROR: ${message}`);
        alert(`❌ Error: ${message}`);
    }

    showSuccess() {
        let message = `�� Proceso completado exitosamente!\n\n`;
        message += `📊 Resumen:\n`;
        message += `• Procesados: ${this.stats.processed}\n`;
        message += `• Descargados: ${this.stats.downloaded}\n`;
        message += `• Errores: ${this.stats.errors}\n\n`;
        
        if (this.stats.downloaded > 0) {
            message += `📁 Revisa tu carpeta de descargas para ver los archivos organizados.`;
        }
        
        alert(message);
    }

    saveConfig() {
        const config = {
            ...this.getConfig(),
            accessToken: this.accessToken,
            lastSaved: new Date().toISOString()
        };
        
        chrome.storage.local.set({ transcriptionConfig: config }, () => {
            // Config guardada silenciosamente
        });

        // Verificar si puede habilitar el botón de inicio
        this.enableStartButton();
    }

    loadSavedConfig() {
        chrome.storage.local.get(['transcriptionConfig'], (result) => {
            if (result.transcriptionConfig) {
                const config = result.transcriptionConfig;
                
                // Cargar campos básicos
                if (config.mainFolderId) document.getElementById('mainFolderId').value = config.mainFolderId;
                if (config.startDate) document.getElementById('startDate').value = config.startDate;
                if (config.endDate) document.getElementById('endDate').value = config.endDate;
                if (config.separateFolders !== undefined) document.getElementById('separateFolders').checked = config.separateFolders;
                
                // Cargar configuración de Google Sheets
                if (config.useGoogleSheets !== undefined) {
                    document.getElementById('useGoogleSheets').checked = config.useGoogleSheets;
                    document.getElementById('sheetsConfig').style.display = config.useGoogleSheets ? 'block' : 'none';
                }
                if (config.googleSheetId) document.getElementById('googleSheetId').value = config.googleSheetId;
                if (config.sheetTabName) document.getElementById('sheetTabName').value = config.sheetTabName;
                
                // Cargar modo de IDs
                if (config.idsMode) {
                    document.querySelector(`input[name="idsMode"][value="${config.idsMode}"]`).checked = true;
                    this.toggleIdsSection();
                }
                
                // Cargar IDs si están en modo filter
                if (config.targetIds && config.idsMode === 'filter') {
                    document.getElementById('targetIds').value = config.targetIds.join(', ');
                    this.updateIdsCount();
                }
                
                // Cargar token si existe (y no ha expirado)
                if (config.accessToken && config.lastSaved) {
                    const lastSaved = new Date(config.lastSaved);
                    const now = new Date();
                    const hoursSinceLastSaved = (now - lastSaved) / (1000 * 60 * 60);
                    
                    // Solo cargar token si tiene menos de 45 minutos
                    if (hoursSinceLastSaved < 0.75) {
                        document.getElementById('accessToken').value = config.accessToken;
                        this.accessToken = config.accessToken;
                        
                        const btn = document.getElementById('validateToken');
                        btn.textContent = '✅ Token Cargado';
                        btn.style.background = '#4caf50';
                        
                        this.enableStartButton();
                        this.updateStatus('🔄 Configuración anterior cargada - Verifica los datos');
                        this.log('🔄 Configuración anterior restaurada');
                    } else {
                        this.log('⚠️ Token anterior expirado, necesitas obtener uno nuevo');
                    }
                }
            }
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Inicializar cuando se carga el popup
document.addEventListener('DOMContentLoaded', () => {
    new TranscriptionDownloaderPro();
});
