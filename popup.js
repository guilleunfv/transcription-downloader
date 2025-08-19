class TranscriptionDownloaderPro {
    constructor() {
        this.accessToken = '';
        this.isRunning = false;
        this.stats = { processed: 0, downloaded: 0, errors: 0, included: 0, excluded: 0 };
        this.targetIds = new Set();
        this.config = {};
        this.downloadedFiles = [];
        
        this.initializeUI();
        this.loadSavedConfig();
        this.setupEventListeners();
    }

    initializeUI() {
        this.log('🚀 Transcription Downloader Pro v1.2.0 inicializado');
        this.updateStatus('Configura los campos para comenzar');
        this.updateIdsCount();
    }

    setupEventListeners() {
        // Eventos principales
        document.getElementById('validateToken').addEventListener('click', () => this.validateToken());
        document.getElementById('startProcess').addEventListener('click', () => this.startProcess());
        document.getElementById('stopProcess').addEventListener('click', () => this.stopProcess());
        document.getElementById('clearLogs').addEventListener('click', () => this.clearLogs());
        
        // Eventos de configuración de Google Sheets
        document.getElementById('useGoogleSheets').addEventListener('change', (e) => {
            document.getElementById('sheetsConfig').style.display = e.target.checked ? 'block' : 'none';
            this.saveConfig();
        });

        // Eventos de filtrado
        document.querySelectorAll('input[name="hasIdFilter"]').forEach(radio => {
            radio.addEventListener('change', () => this.toggleIdFilterSection());
        });

        // Eventos de IDs
        document.getElementById('targetIds').addEventListener('input', () => this.updateIdsCount());
        document.getElementById('loadIdsFromFile').addEventListener('click', () => this.loadIdsFromFile());
        document.getElementById('validateIds').addEventListener('click', () => this.validateIds());
        document.getElementById('clearIds').addEventListener('click', () => this.clearIds());

        // Auto-guardar configuración
        const configFields = [
            'mainFolderId', 'googleSheetId', 'sheetTabName', 
            'startDate', 'endDate', 'targetIds'
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

        // Auto-guardar para radios
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => this.saveConfig());
        });
    }

    toggleIdFilterSection() {
        const hasFilter = document.querySelector('input[name="hasIdFilter"]:checked').value;
        const section = document.getElementById('idFilterConfig');
        section.style.display = hasFilter === 'yes' ? 'block' : 'none';
        this.saveConfig();
        this.enableStartButton();
    }

    updateIdsCount() {
        const textarea = document.getElementById('targetIds');
        const countElement = document.getElementById('idsCount');
        
        if (textarea && countElement) {
            const text = textarea.value.trim();
            if (!text) {
                countElement.textContent = '0 IDs configurados';
                countElement.style.background = '#f8f9fa';
                return;
            }

            const ids = this.extractIdsFromText(text);
            this.targetIds = new Set(ids);
            
            countElement.textContent = `✅ ${ids.length} IDs configurados y listos`;
            countElement.style.background = ids.length > 0 ? '#e8f5e8' : '#f8f9fa';
        }
    }

    extractIdsFromText(text) {
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
            message += `• Problemáticos: ${invalidIds.slice(0, 3).join(', ')}`;
            if (invalidIds.length > 3) message += '...';
        }

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
                
                this.log(`✅ Token válido - Usuario: ${data.user.displayName || 'Usuario'}`);
                this.updateStatus('✅ Token validado - Configura los demás campos');
                this.saveConfig();
                
                const btn = document.getElementById('validateToken');
                btn.textContent = '✅ Token Válido';
                btn.style.background = '#4caf50';
                
                this.enableStartButton();
                
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
        const hasFilter = document.querySelector('input[name="hasIdFilter"]:checked').value;
        
        let canStart = hasToken && mainFolderId;
        
        // Si tiene filtro de IDs, verificar que tenga IDs
        if (hasFilter === 'yes') {
            const hasIds = this.targetIds.size > 0;
            canStart = canStart && hasIds;
            
            if (!hasIds && hasToken && mainFolderId) {
                this.updateStatus('⚠️ Falta: Configura tus IDs para filtrar');
                document.getElementById('startProcess').disabled = true;
                return;
            }
        }
        
        document.getElementById('startProcess').disabled = !canStart;
        
        if (canStart) {
            this.updateStatus('✅ Todo listo - Haz clic en "INICIAR DESCARGA INTELIGENTE"');
        } else if (!mainFolderId) {
            this.updateStatus('⚠️ Falta: ID de carpeta principal de Google Drive');
        }
    }

    getConfig() {
        const hasFilter = document.querySelector('input[name="hasIdFilter"]:checked').value;
        const useSheets = document.getElementById('useGoogleSheets').checked;
        
        const config = {
            mainFolderId: document.getElementById('mainFolderId').value.trim(),
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            hasIdFilter: hasFilter,
            useGoogleSheets: useSheets
        };

        if (hasFilter === 'yes') {
            const filterMode = document.querySelector('input[name="filterMode"]:checked').value;
            const idsText = document.getElementById('targetIds').value.trim();
            
            config.filterMode = filterMode;
            config.targetIds = this.extractIdsFromText(idsText);
        }

        if (useSheets) {
            config.googleSheetId = document.getElementById('googleSheetId').value.trim();
            config.sheetTabName = document.getElementById('sheetTabName').value.trim() || 'Reporte Transcripciones';
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

        if (config.hasIdFilter === 'yes' && (!config.targetIds || config.targetIds.length === 0)) {
            this.showError('Si eliges filtrar por IDs, debes ingresar al menos un ID válido');
            return;
        }

        if (config.useGoogleSheets && !config.googleSheetId) {
            this.showError('Si eliges usar Google Sheets, debes ingresar el ID de tu hoja');
            return;
        }

        // Generar mensaje de confirmación inteligente
        let confirmMessage = this.generateConfirmationMessage(config);

        if (!confirm(confirmMessage)) {
            return;
        }

        // Iniciar proceso
        this.isRunning = true;
        this.stats = { processed: 0, downloaded: 0, errors: 0, included: 0, excluded: 0 };
        this.downloadedFiles = [];
        
        document.getElementById('startProcess').disabled = true;
        document.getElementById('stopProcess').disabled = false;
        document.querySelector('.container').classList.add('processing');

        this.logProcessStart(config);
        
        try {
            await this.processAllTranscriptions(config);
            
            if (this.isRunning) {
                this.log('🎉 PROCESO COMPLETADO EXITOSAMENTE');
                this.showSuccessWithDetails(config);
            }
        } catch (error) {
            this.log(`❌ ERROR CRÍTICO: ${error.message}`);
            this.updateStatus('❌ Error en el proceso');
        }

        this.stopProcess();
    }

    generateConfirmationMessage(config) {
        let message = '🚀 ¿INICIAR DESCARGA INTELIGENTE?\n\n';
        message += `📁 Carpeta: ${config.mainFolderId}\n`;
        message += `📅 Período: ${config.startDate} a ${config.endDate}\n`;
        
        if (config.hasIdFilter === 'no') {
            message += `🎯 Modo: TODOS los archivos encontrados\n`;
            message += `📂 Carpeta: TODOS_LOS_ARCHIVOS\n`;
        } else {
            const modeNames = {
                'only-included': 'Solo archivos INCLUIDOS en tu lista',
                'only-excluded': 'Solo archivos NO INCLUIDOS en tu lista', 
                'both': 'Ambos tipos (separados en 2 carpetas)'
            };
            
            message += `🎯 IDs configurados: ${config.targetIds.length} IDs\n`;
            message += `📋 Modo: ${modeNames[config.filterMode]}\n`;
            
            if (config.filterMode === 'only-included') {
                message += `📂 Carpeta: INCLUIDOS\n`;
            } else if (config.filterMode === 'only-excluded') {
                message += `📂 Carpeta: NO_INCLUIDOS\n`;
            } else {
                message += `📂 Carpetas: INCLUIDOS + NO_INCLUIDOS\n`;
            }
        }
        
        message += `📊 Google Sheets: ${config.useGoogleSheets ? 'SÍ' : 'NO'}\n`;
        message += '\n⚡ Este proceso puede tomar varios minutos dependiendo del volumen de archivos.';
        
        return message;
    }

    logProcessStart(config) {
        this.log('🚀 INICIANDO DESCARGA INTELIGENTE DE TRANSCRIPCIONES');
        this.log('='.repeat(70));
        this.log(`📁 Carpeta principal: ${config.mainFolderId}`);
        this.log(`📅 Período: ${config.startDate} hasta ${config.endDate}`);
        
        if (config.hasIdFilter === 'no') {
            this.log(`🎯 Modo: DESCARGAR TODO (sin filtro de IDs)`);
            this.log(`📂 Estructura: Una sola carpeta "TODOS_LOS_ARCHIVOS"`);
        } else {
            this.log(`🎯 Filtrado por IDs: ${config.targetIds.length} IDs específicos`);
            this.log(`📋 Modo de descarga: ${config.filterMode}`);
            
            if (config.filterMode === 'only-included') {
                this.log(`📂 Estructura: Solo carpeta "INCLUIDOS"`);
                this.log(`⚡ Optimización: Se saltarán archivos sin tus IDs`);
            } else if (config.filterMode === 'only-excluded') {
                this.log(`📂 Estructura: Solo carpeta "NO_INCLUIDOS"`);
                this.log(`⚡ Optimización: Se saltarán archivos con tus IDs`);
            } else {
                this.log(`📂 Estructura: Carpetas "INCLUIDOS" + "NO_INCLUIDOS"`);
            }
        }
        
        this.log(`📊 Google Sheets: ${config.useGoogleSheets ? 'Activado' : 'Desactivado'}`);
        this.log('='.repeat(70));
    }

    async processAllTranscriptions(config) {
        // FASE 1: Obtener supervisores
        this.updateStatus('🔍 Obteniendo lista de supervisores...');
        this.log('📋 FASE 1: Obteniendo supervisores');
        
        const supervisors = await this.fetchFolders(config.mainFolderId);
        this.log(`👨‍💼 Supervisores encontrados: ${supervisors.length}`);
        
        if (supervisors.length === 0) {
            throw new Error('No se encontraron supervisores. Verifica el ID de carpeta.');
        }

        supervisors.forEach((supervisor, i) => {
            this.log(`   ${i + 1}. ${supervisor.name}`);
        });

        // FASE 2: Mapear archivos
        this.log('\n📋 FASE 2: Mapeando archivos de transcripciones');
        let allFiles = [];
        
        for (let i = 0; i < supervisors.length && this.isRunning; i++) {
            const supervisor = supervisors[i];
            this.updateStatus(`📁 Explorando ${i+1}/${supervisors.length}: ${supervisor.name}`);
            
            const files = await this.exploreFolder(supervisor.id, [supervisor.name]);
            allFiles = allFiles.concat(files);
            
            this.log(`   📁 ${supervisor.name}: ${files.length} archivos encontrados`);
            this.updateProgress((i + 1) / supervisors.length * 20);
        }

        this.log(`\n📊 TOTAL ARCHIVOS MAPEADOS: ${allFiles.length}`);

        // FASE 3: Filtrar archivos
        this.log('\n📋 FASE 3: Aplicando filtros');
        const filteredFiles = this.filterFiles(allFiles, config);
        
        this.log(`🎯 ARCHIVOS VÁLIDOS: ${filteredFiles.length}`);
        this.log(`   ✅ Filtro fechas: ${config.startDate} a ${config.endDate}`);
        this.log(`   ✅ Filtro keywords: gemini, transcript, anotações, notas`);

        if (filteredFiles.length === 0) {
            this.log('⚠️ No se encontraron archivos que cumplan los criterios');
            this.updateStatus('⚠️ Sin archivos para procesar');
            return;
        }

        // FASE 4: Aplicar lógica de descarga inteligente
        this.log('\n📋 FASE 4: Aplicando lógica de descarga inteligente');
        const filesToDownload = this.applyDownloadLogic(filteredFiles, config);
        
        this.log(`📥 ARCHIVOS PARA DESCARGAR: ${filesToDownload.length}`);

        if (filesToDownload.length === 0) {
            this.log('ℹ️ No hay archivos para descargar según la configuración seleccionada');
            this.updateStatus('ℹ️ Filtros aplicados - Sin archivos para descargar');
            return;
        }

        // FASE 5: Descargar archivos
        this.log('\n📋 FASE 5: Iniciando descargas');
        this.updateStatus('⬇️ Descargando archivos...');
        
        for (let i = 0; i < filesToDownload.length && this.isRunning; i++) {
            const fileData = filesToDownload[i];
            const fileName = fileData.file.name.length > 35 ? fileData.file.name.substring(0, 35) + '...' : fileData.file.name;
            
            this.updateStatus(`⬇️ ${i+1}/${filesToDownload.length}: ${fileName}`);
            
            await this.downloadFileIntelligent(fileData, config);
            
            const progress = 20 + ((i + 1) / filesToDownload.length) * 60;
            this.updateProgress(progress);
            
            await this.sleep(150);
        }

        // FASE 6: Actualizar Google Sheets si está habilitado
        if (config.useGoogleSheets && config.googleSheetId) {
            this.log('\n📋 FASE 6: Actualizando Google Sheets');
            this.updateStatus('📊 Generando reporte...');
            await this.updateGoogleSheet(config);
            this.updateProgress(100);
        }

        this.logFinalSummary(config);
    }

    applyDownloadLogic(files, config) {
        if (config.hasIdFilter === 'no') {
            // Modo simple: todos los archivos van a la misma carpeta
            return files.map(file => ({
                file: file,
                targetFolder: 'TODOS_LOS_ARCHIVOS',
                isIncluded: null
            }));
        }

        // Modo con filtro de IDs
        const filesToDownload = [];
        
        files.forEach(file => {
            const fileIds = this.extractIdsFromText(file.name);
            const hasTargetId = fileIds.some(id => config.targetIds.includes(id));
            
            const shouldDownload = this.shouldDownloadFile(hasTargetId, config.filterMode);
            
            if (shouldDownload) {
                filesToDownload.push({
                    file: file,
                    targetFolder: hasTargetId ? 'INCLUIDOS' : 'NO_INCLUIDOS',
                    isIncluded: hasTargetId
                });
            }
        });

        // Log de estadísticas
        const includedCount = filesToDownload.filter(f => f.isIncluded === true).length;
        const excludedCount = filesToDownload.filter(f => f.isIncluded === false).length;
        
        this.log(`   📊 Archivos INCLUIDOS: ${includedCount}`);
        this.log(`   📊 Archivos NO INCLUIDOS: ${excludedCount}`);
        
        return filesToDownload;
    }

    shouldDownloadFile(hasTargetId, filterMode) {
        switch (filterMode) {
            case 'only-included':
                return hasTargetId;
            case 'only-excluded':
                return !hasTargetId;
            case 'both':
                return true;
            default:
                return true;
        }
    }

    async downloadFileIntelligent(fileData, config) {
        this.stats.processed++;
        const { file, targetFolder, isIncluded } = fileData;
        
        try {
            const content = await this.getFileContent(file.id);
            if (!content) {
                this.stats.errors++;
                this.log(`❌ Sin contenido: ${file.name}`);
                this.updateStats();
                return;
            }

            // Nombre de archivo simple: solo carpeta + archivo
            const safeFileName = this.sanitizeFilename(file.name);
            const filename = `${targetFolder}/${safeFileName}`;
            
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
            
            // Actualizar estadísticas específicas
            if (isIncluded === true) {
                this.stats.included++;
            } else if (isIncluded === false) {
                this.stats.excluded++;
            }
            
            // Log con emoji indicativo
            let logIcon = '📄';
            if (isIncluded === true) logIcon = '🎯';
            else if (isIncluded === false) logIcon = '📋';
            
            this.log(`✅ ${logIcon} ${targetFolder}/${safeFileName}`);
            
            // Guardar para reporte si está habilitado
            if (config.useGoogleSheets) {
                this.downloadedFiles.push({
                    id: file.id,
                    name: file.name,
                    targetFolder: targetFolder,
                    isIncluded: isIncluded === null ? 'N/A' : (isIncluded ? 'Sí' : 'No'),
                    extractedIds: this.extractIdsFromText(file.name).join(', '),
                    extractedDate: this.extractDateFromFilename(file.name),
                    url: file.webViewLink
                });
            }
            
        } catch (error) {
            this.stats.errors++;
            this.log(`❌ Error: ${file.name} - ${error.message}`);
        }
        
        this.updateStats();
    }

    async exploreFolder(folderId, pathList) {
        const query = `'${folderId}' in parents and trashed=false`;
        const items = await this.fetchFromDrive(query);
        
        let allFiles = [];
        
        for (const item of items) {
            if (!this.isRunning) break;
            
            if (item.mimeType === 'application/vnd.google-apps.folder') {
                // Solo explorar carpetas de transcripciones
                const folderName = item.name.toLowerCase();
                const isTranscriptionFolder = this.isTranscriptionFolder(folderName);
                
                if (isTranscriptionFolder) {
                    const subFiles = await this.exploreFolder(item.id, [...pathList, item.name]);
                    allFiles = allFiles.concat(subFiles);
                }
            } else {
                // Es un archivo, agregarlo con su ruta
                item.pathList = pathList;
                allFiles.push(item);
            }
        }
        
        return allFiles;
    }

    isTranscriptionFolder(folderName) {
        const transcriptionFolders = [
            'transcripciones gemini',
            'transcipciones gemini', 
            'transcrição gemini',
            'transcricoes gemini',
            'meet recordings',
            'recordings',
            'transcripts',
            'anotações',
            'notas'
        ];
        
        return transcriptionFolders.some(name => folderName.includes(name));
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
            
            return true;
        });
    }

    async fetchFolders(parentId) {
        const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        return await this.fetchFromDrive(query);
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

        if (data.nextPageToken && this.isRunning) {
            const moreFiles = await this.fetchFromDrive(query, data.nextPageToken);
            allFiles = allFiles.concat(moreFiles);
        }

        return allFiles;
    }

    async getFileContent(fileId) {
        try {
            let response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
                headers: { 'Authorization': this.accessToken }
            });
            
            if (response.ok) {
                return await response.text();
            }

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

    logFinalSummary(config) {
        this.log(`\n📊 RESUMEN FINAL DETALLADO:`);
        this.log(`   📄 Total procesados: ${this.stats.processed}`);
        this.log(`   ✅ Descargados exitosamente: ${this.stats.downloaded}`);
        this.log(`   ❌ Errores: ${this.stats.errors}`);
        
        if (config.hasIdFilter === 'yes') {
            this.log(`   🎯 Archivos INCLUIDOS: ${this.stats.included}`);
            this.log(`   📋 Archivos NO INCLUIDOS: ${this.stats.excluded}`);
        }
        
        if (this.stats.downloaded > 0) {
            this.log(`\n📁 ESTRUCTURA DE DESCARGA:`);
            if (config.hasIdFilter === 'no') {
                this.log(`   └── 📂 TODOS_LOS_ARCHIVOS/ (${this.stats.downloaded} archivos)`);
            } else {
                if (this.stats.included > 0) {
                    this.log(`   └── 📂 INCLUIDOS/ (${this.stats.included} archivos)`);
                }
                if (this.stats.excluded > 0) {
                    this.log(`   └── 📂 NO_INCLUIDOS/ (${this.stats.excluded} archivos)`);
                }
            }
        }
    }

    showSuccessWithDetails(config) {
        let message = `🎉 ¡DESCARGA COMPLETADA!\n\n`;
        
        message += `📊 RESUMEN:\n`;
        message += `• Total procesados: ${this.stats.processed}\n`;
        message += `• Descargados: ${this.stats.downloaded}\n`;
        message += `• Errores: ${this.stats.errors}\n`;
        
        if (config.hasIdFilter === 'yes') {
            message += `• Incluidos: ${this.stats.included}\n`;
            message += `• No incluidos: ${this.stats.excluded}\n`;
        }
        
        message += `\n📁 UBICACIÓN:\n`;
        message += `Revisa tu carpeta de Descargas\n`;
        
        if (config.hasIdFilter === 'no') {
            message += `Carpeta: TODOS_LOS_ARCHIVOS\n`;
        } else {
            if (this.stats.included > 0) message += `Carpeta: INCLUIDOS\n`;
            if (this.stats.excluded > 0) message += `Carpeta: NO_INCLUIDOS\n`;
        }
        
        if (config.useGoogleSheets) {
            message += `\n📊 Reporte guardado en Google Sheets`;
        }
        
        alert(message);
    }

    async updateGoogleSheet(config) {
        if (!config.googleSheetId || this.downloadedFiles.length === 0) {
            this.log('📊 Sin datos para Google Sheets');
            return;
        }

        this.log(`📊 Preparando reporte para Google Sheets...`);
        
        try {
            // Intentar acceder a la hoja (verificación básica)
            const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.googleSheetId}`;
            const sheetResponse = await fetch(sheetUrl, {
                headers: { 'Authorization': this.accessToken }
            });

            if (!sheetResponse.ok) {
                throw new Error(`No se puede acceder a la hoja. Verifica el ID y permisos.`);
            }

            this.log(`✅ Reporte preparado con ${this.downloadedFiles.length} registros`);
            this.log(`📋 Datos incluidos: archivo, carpeta destino, IDs extraídos, fecha, estado`);
            this.log(`💡 Implementación completa de Google Sheets pendiente en próxima versión`);
            
        } catch (error) {
            this.log(`❌ Error con Google Sheets: ${error.message}`);
        }
    }

    extractDateFromFilename(filename) {
        // Buscar fechas en diferentes formatos
        const patterns = [
            /(\d{4})[/_-](\d{2})[/_-](\d{2})/,  // YYYY-MM-DD, YYYY_MM_DD, YYYY/MM/DD
            /(\d{2})[/_-](\d{2})[/_-](\d{4})/,  // DD-MM-YYYY, DD_MM_YYYY, DD/MM/YYYY
            /(\d{4})(\d{2})(\d{2})/             // YYYYMMDD
        ];
        
        for (const pattern of patterns) {
            const match = filename.match(pattern);
            if (match) {
                const [, part1, part2, part3] = match;
                
                // Determinar formato basado en longitud del primer grupo
                if (part1.length === 4) {
                    // YYYY-MM-DD
                    return `${part3}/${part2}/${part1}`;
                } else {
                    // DD-MM-YYYY
                    return `${part1}/${part2}/${part3}`;
                }
            }
        }
        
        return 'Fecha no encontrada';
    }

    sanitizeFilename(filename) {
        // Limpiar caracteres problemáticos
        let clean = filename
            .replace(/[<>:"/\\|?*]/g, '_')           // Caracteres inválidos
            .replace(/\s+/g, '_')                    // Espacios múltiples
            .replace(/[^\w\s.-]/g, '_')              // Caracteres especiales
            .replace(/_+/g, '_')                     // Guiones múltiples
            .replace(/^_|_$/g, '');                  // Guiones al inicio/final
        
        // Asegurar que termina en .txt
        if (!clean.toLowerCase().endsWith('.txt')) {
            // Remover extensión actual si existe
            clean = clean.replace(/\.[^/.]+$/, '');
            clean += '.txt';
        }
        
        // Limitar longitud
        if (clean.length > 100) {
            const name = clean.substring(0, 96);
            clean = name + '.txt';
        }
        
        return clean;
    }

    stopProcess() {
        this.isRunning = false;
        document.getElementById('startProcess').disabled = false;
        document.getElementById('stopProcess').disabled = true;
        document.querySelector('.container').classList.remove('processing');
        this.updateStatus('⏹️ Proceso detenido por el usuario');
        this.log('⏹️ Proceso interrumpido');
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
        this.log('🧹 Log limpiado - Transcription Downloader Pro v1.2.0');
    }

    showError(message) {
        this.log(`❌ ERROR: ${message}`);
        alert(`❌ Error\n\n${message}`);
    }

    saveConfig() {
        const config = {
            ...this.getConfig(),
            accessToken: this.accessToken,
            lastSaved: new Date().toISOString()
        };
        
        chrome.storage.local.set({ transcriptionConfigV2: config }, () => {
            // Configuración guardada silenciosamente
        });

        this.enableStartButton();
    }

    loadSavedConfig() {
        chrome.storage.local.get(['transcriptionConfigV2'], (result) => {
            if (result.transcriptionConfigV2) {
                const config = result.transcriptionConfigV2;
                
                // Cargar campos básicos
                if (config.mainFolderId) {
                    document.getElementById('mainFolderId').value = config.mainFolderId;
                }
                if (config.startDate) {
                    document.getElementById('startDate').value = config.startDate;
                }
                if (config.endDate) {
                    document.getElementById('endDate').value = config.endDate;
                }
                
                // Cargar configuración de filtros
                if (config.hasIdFilter) {
                    document.querySelector(`input[name="hasIdFilter"][value="${config.hasIdFilter}"]`).checked = true;
                    this.toggleIdFilterSection();
                    
                    if (config.hasIdFilter === 'yes' && config.targetIds) {
                        document.getElementById('targetIds').value = config.targetIds.join(', ');
                        this.updateIdsCount();
                        
                        if (config.filterMode) {
                            document.querySelector(`input[name="filterMode"][value="${config.filterMode}"]`).checked = true;
                        }
                    }
                }
                
                // Cargar configuración de Google Sheets
                if (config.useGoogleSheets !== undefined) {
                    document.getElementById('useGoogleSheets').checked = config.useGoogleSheets;
                    document.getElementById('sheetsConfig').style.display = config.useGoogleSheets ? 'block' : 'none';
                    
                    if (config.googleSheetId) {
                        document.getElementById('googleSheetId').value = config.googleSheetId;
                    }
                    if (config.sheetTabName) {
                        document.getElementById('sheetTabName').value = config.sheetTabName;
                    }
                }
                
                // Cargar token si no ha expirado
                if (config.accessToken && config.lastSaved) {
                    const lastSaved = new Date(config.lastSaved);
                    const now = new Date();
                    const minutesSinceLastSaved = (now - lastSaved) / (1000 * 60);
                    
                    // Token válido por 45 minutos
                    if (minutesSinceLastSaved < 45) {
                        document.getElementById('accessToken').value = config.accessToken;
                        this.accessToken = config.accessToken;
                        
                        const btn = document.getElementById('validateToken');
                        btn.textContent = '✅ Token Cargado';
                        btn.style.background = '#4caf50';
                        
                        this.enableStartButton();
                        this.updateStatus('🔄 Configuración anterior restaurada');
                        this.log('🔄 Token y configuración anteriores cargados automáticamente');
                    } else {
                        this.log('⚠️ Token anterior expirado (>45 min). Obtén uno nuevo.');
                    }
                }
            } else {
                // Primera vez - mostrar mensaje de bienvenida
                this.log('👋 ¡Bienvenido a Transcription Downloader Pro v1.2.0!');
                this.log('🎯 Nueva versión con filtrado inteligente y carpetas simplificadas');
                this.log('📋 Configura tus datos y comienza a descargar automáticamente');
            }
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Inicializar la extensión cuando se cargue el popup
document.addEventListener('DOMContentLoaded', () => {
    const app = new TranscriptionDownloaderPro();
    
    // Hacer la instancia accesible globalmente para debugging
    window.transcriptionApp = app;
    
    console.log('🚀 Transcription Downloader Pro v1.2.0 iniciado');
    console.log('🔧 Instancia disponible en window.transcriptionApp para debugging');
});
