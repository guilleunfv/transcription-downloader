class TranscriptionDownloaderPro {
    constructor() {
        this.accessToken = '';
        this.isRunning = false;
        this.stats = { processed: 0, downloaded: 0, errors: 0 };
        this.targetIds = new Set();
        this.MAIN_FOLDER_ID = "1EG1FTkomRb9W02Qr1x7PEJBjsC26fqN_";
        this.downloadedFiles = [];
        
        this.initializeUI();
        this.loadSavedConfig();
        this.setupEventListeners();
    }

    initializeUI() {
        // Configurar IDs objetivo desde el textarea
        const targetIdsText = document.getElementById('targetIds').value;
        this.targetIds = new Set(
            targetIdsText.split(',').map(id => id.trim()).filter(id => id.length >= 7)
        );

        this.log(`🎯 ${this.targetIds.size} IDs objetivo configurados`);
    }

    setupEventListeners() {
        document.getElementById('validateToken').addEventListener('click', () => this.validateToken());
        document.getElementById('startProcess').addEventListener('click', () => this.startProcess());
        document.getElementById('stopProcess').addEventListener('click', () => this.stopProcess());
        document.getElementById('clearLogs').addEventListener('click', () => this.clearLogs());
        
        // Auto-guardar configuración
        ['startDate', 'endDate', 'separateFolders'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.saveConfig());
        });
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
                document.getElementById('startProcess').disabled = false;
                
                this.log(`✅ Token válido - Usuario: ${data.user.displayName || 'Usuario'}`);
                this.log(`📧 Email: ${data.user.emailAddress || 'No disponible'}`);
                this.updateStatus('✅ Token validado - Listo para procesar');
                this.saveConfig();
                
                // Cambiar estilo del botón
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

    async startProcess() {
        if (!this.accessToken) {
            this.showError('Debes validar tu token primero');
            return;
        }

        // Confirmación de inicio
        if (!confirm('¿Iniciar la descarga masiva de transcripciones?\n\nEsto puede tomar varios minutos y descargar muchos archivos.')) {
            return;
        }

        this.isRunning = true;
        this.stats = { processed: 0, downloaded: 0, errors: 0 };
        this.downloadedFiles = [];
        
        document.getElementById('startProcess').disabled = true;
        document.getElementById('stopProcess').disabled = false;
        document.querySelector('.container').classList.add('processing');

        const config = this.getConfig();
        
        this.log('🚀 INICIANDO PROCESO DE DESCARGA MASIVA');
        this.log('='.repeat(50));
        this.log(`📅 Período: ${config.startDate} hasta ${config.endDate}`);
        this.log(`🎯 IDs objetivo: ${this.targetIds.size} configurados`);
        this.log(`📁 Carpetas separadas: ${config.separateFolders ? 'SÍ' : 'NO'}`);
        this.log('='.repeat(50));
        
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
        
        const supervisors = await this.fetchFolders(this.MAIN_FOLDER_ID);
        this.log(`👨‍💼 Supervisores encontrados: ${supervisors.length}`);
        
        if (supervisors.length === 0) {
            throw new Error('No se encontraron supervisores en la carpeta principal');
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
            this.updateProgress((i + 1) / supervisors.length * 25); // 25% para mapeo
        }

        this.log(`\n📊 TOTAL DE ARCHIVOS MAPEADOS: ${allFiles.length}`);

        // FASE 3: Aplicar filtros
        this.log('\n📋 FASE 3: Aplicando filtros de fecha y contenido');
        const filteredFiles = this.filterFiles(allFiles, config);
        
        this.log(`🎯 ARCHIVOS QUE CUMPLEN CRITERIOS: ${filteredFiles.length}`);
        this.log(`   ✅ Filtro de fechas: ${config.startDate} a ${config.endDate}`);
        this.log(`   ✅ Filtro de keywords: gemini, transcript, anotações, notas`);

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
            
            const progress = 25 + ((i + 1) / filteredFiles.length) * 75; // 75% restante para descarga
            this.updateProgress(progress);
            
            // Pausa pequeña para no saturar
            await this.sleep(200);
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

    async downloadFile(file, config) {
        this.stats.processed++;
        
        try {
            // Obtener contenido
            const content = await this.getFileContent(file.id);
            if (!content) {
                this.stats.errors++;
                this.log(`❌ Sin contenido: ${file.name}`);
                this.updateStats();
                return;
            }

            // Determinar categoría
            const customerIds = this.extractIds(file.name);
            const isTarget = customerIds.some(id => this.targetIds.has(id));
            
            // Crear nombre de archivo
            let filename = this.sanitizeFilename(file.name);
            
            if (config.separateFolders) {
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

            // Limpiar URL
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            this.stats.downloaded++;
            this.log(`✅ ${isTarget ? '🎯' : '📄'} ${file.name}`);
            
        } catch (error) {
            this.stats.errors++;
            this.log(`❌ Error: ${file.name} - ${error.message}`);
        }
        
        this.updateStats();
    }

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

    extractIds(filename) {
        const regex = /(\d{7,12})/g;
        return filename.match(regex) || [];
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 100) + '.txt';
    }

    getConfig() {
        return {
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            separateFolders: document.getElementById('separateFolders').checked,
            targetIds: document.getElementById('targetIds').value
                .split(',')
                .map(id => id.trim())
                .filter(id => id && id.length >= 7)
        };
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
        const message = `🎉 Proceso completado exitosamente!\n\n📊 Resumen:\n• Procesados: ${this.stats.processed}\n• Descargados: ${this.stats.downloaded}\n• Errores: ${this.stats.errors}`;
        alert(message);
    }

    saveConfig() {
        const config = {
            ...this.getConfig(),
            accessToken: this.accessToken
        };
        chrome.storage.local.set({ transcriptionConfig: config });
    }

    loadSavedConfig() {
        chrome.storage.local.get(['transcriptionConfig'], (result) => {
            if (result.transcriptionConfig) {
                const config = result.transcriptionConfig;
                
                if (config.startDate) document.getElementById('startDate').value = config.startDate;
                if (config.endDate) document.getElementById('endDate').value = config.endDate;
                if (config.separateFolders !== undefined) document.getElementById('separateFolders').checked = config.separateFolders;
                if (config.accessToken) {
                    document.getElementById('accessToken').value = config.accessToken;
                    this.accessToken = config.accessToken;
                    document.getElementById('startProcess').disabled = false;
                    this.updateStatus('Token cargado - Listo para procesar');
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