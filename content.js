// content.js - Script que se ejecuta en Google Drive para ayudar con la captura de tokens
(function() {
    'use strict';
    
    // Función para interceptar y capturar tokens de autenticación
    function interceptGoogleDriveTokens() {
        // Interceptar fetch requests
        const originalFetch = window.fetch;
        
        window.fetch = function(...args) {
            const [url, options] = args;
            
            // Buscar peticiones a la API de Google que contengan tokens
            if (url.includes('googleapis.com') && options?.headers?.Authorization) {
                console.log('🔑 Token capturado desde Google Drive:', options.headers.Authorization);
                
                // Guardar en localStorage para fácil acceso
                localStorage.setItem('googleDriveApiToken', options.headers.Authorization);
                localStorage.setItem('tokenCaptureTime', new Date().toISOString());
                
                // Mostrar notificación visual
                showTokenNotification(options.headers.Authorization);
            }
            
            return originalFetch.apply(this, args);
        };

        // Interceptar XMLHttpRequest también
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalSetRequestHeader = xhr.setRequestHeader;
            
            xhr.setRequestHeader = function(header, value) {
                if (header === 'Authorization' && value.startsWith('Bearer')) {
                    console.log('🔑 Token XHR capturado:', value);
                    localStorage.setItem('googleDriveApiToken', value);
                    localStorage.setItem('tokenCaptureTime', new Date().toISOString());
                    showTokenNotification(value);
                }
                return originalSetRequestHeader.apply(this, arguments);
            };
            
            return xhr;
        };
    }
    
    // Función para mostrar notificación visual del token capturado
    function showTokenNotification(token) {
        // Remover notificación anterior si existe
        const existingNotification = document.getElementById('transcription-downloader-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Crear nueva notificación
        const notification = document.createElement('div');
        notification.id = 'transcription-downloader-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            z-index: 999999;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 350px;
            border: 2px solid #4caf50;
            animation: slideIn 0.3s ease-out;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 24px; margin-right: 10px;">🚀</span>
                <strong style="font-size: 16px;">Transcription Downloader</strong>
            </div>
            <div style="margin-bottom: 15px;">
                <div style="color: #e8f5e8; font-size: 13px; margin-bottom: 8px;">
                    ✅ Token de Google Drive capturado exitosamente
                </div>
                <div style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 6px; font-family: monospace; font-size: 11px; word-break: break-all;">
                    ${token.substring(0, 50)}...
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="copyTokenToClipboard()" style="
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    📋 Copiar Token
                </button>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                    ✕ Cerrar
                </button>
            </div>
            <div style="margin-top: 12px; font-size: 11px; color: #e8f5e8; opacity: 0.8;">
                💡 Ahora puedes usar este token en la extensión
            </div>
        `;
        
        // Agregar CSS de animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 15 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 15000);
    }
    
    // Función global para copiar token (accesible desde el HTML)
    window.copyTokenToClipboard = function() {
        const token = localStorage.getItem('googleDriveApiToken');
        if (token) {
            navigator.clipboard.writeText(token).then(() => {
                // Actualizar el botón para mostrar confirmación
                const notification = document.getElementById('transcription-downloader-notification');
                if (notification) {
                    const button = notification.querySelector('button');
                    const originalText = button.innerHTML;
                    button.innerHTML = '✅ ¡Copiado!';
                    button.style.background = 'rgba(255,255,255,0.4)';
                    
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.style.background = 'rgba(255,255,255,0.2)';
                    }, 2000);
                }
            }).catch(err => {
                console.error('Error al copiar token:', err);
                alert('Error al copiar. Puedes encontrar el token en la consola del navegador.');
                console.log('Token para copiar manualmente:', token);
            });
        } else {
            alert('No hay token disponible. Navega por Google Drive para generar peticiones.');
        }
    };
    
    // Función para agregar botón helper permanente
    function addHelperButton() {
        // Verificar si ya existe
        if (document.getElementById('transcription-helper-button')) {
            return;
        }
        
        const button = document.createElement('div');
        button.id = 'transcription-helper-button';
        button.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
            color: white;
            border: none;
            padding: 15px 18px;
            border-radius: 50px;
            cursor: pointer;
            z-index: 999998;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 4px 20px rgba(26, 115, 232, 0.4);
            transition: all 0.3s ease;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        button.innerHTML = `
            <span style="font-size: 18px;">🔑</span>
            <span>Obtener Token</span>
        `;
        
        // Efectos hover
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px) scale(1.05)';
            button.style.boxShadow = '0 8px 25px rgba(26, 115, 232, 0.6)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0) scale(1)';
            button.style.boxShadow = '0 4px 20px rgba(26, 115, 232, 0.4)';
        });
        
        button.addEventListener('click', () => {
            const token = localStorage.getItem('googleDriveApiToken');
            const captureTime = localStorage.getItem('tokenCaptureTime');
            
            if (token) {
                // Verificar si el token es reciente (menos de 45 minutos)
                const tokenAge = captureTime ? (new Date() - new Date(captureTime)) / 1000 / 60 : 999;
                const isTokenFresh = tokenAge < 45;
                
                const message = `
🔑 Token ${isTokenFresh ? '✅ Válido' : '⚠️ Puede estar expirado'}
📅 Capturado: ${captureTime ? new Date(captureTime).toLocaleString() : 'Desconocido'}
⏰ Antigüedad: ${Math.round(tokenAge)} minutos

${isTokenFresh ? '✅ Puedes usar este token en la extensión' : '⚠️ Recomendamos obtener un token nuevo navegando por Drive'}

¿Copiar al portapapeles?
                `;
                
                if (confirm(message.trim())) {
                    window.copyTokenToClipboard();
                }
            } else {
                alert('🔍 No hay token capturado.\n\n📋 Para obtener un token:\n1. Navega por Google Drive\n2. Abre carpetas o archivos\n3. El token se capturará automáticamente');
            }
        });
        
        document.body.appendChild(button);
    }
    
    // Función para mostrar información de ayuda
    function showHelpInfo() {
        console.log(`
🚀 TRANSCRIPTION DOWNLOADER - AYUDA

📋 CÓMO OBTENER EL TOKEN:
1. Navega por Google Drive (abre carpetas, ve archivos)
2. Las peticiones automáticas generarán un token
3. Aparecerá una notificación verde cuando se capture
4. Usa el botón "Copiar Token" o el botón flotante azul

🔧 SOLUCIÓN DE PROBLEMAS:
• Si no aparece el token: Actualiza la página e intenta de nuevo
• El token expira cada ~1 hora, necesitarás obtener uno nuevo
• Asegúrate de estar en drive.google.com

💾 ALMACENAMIENTO:
• El token se guarda en localStorage del navegador
• Se sobrescribe cada vez que se captura uno nuevo
• Es específico para tu sesión de Google Drive

🔍 DEPURACIÓN:
• localStorage.getItem('googleDriveApiToken') - Ver token actual
• localStorage.getItem('tokenCaptureTime') - Ver cuándo se capturó
        `);
    }
    
    // Inicializar cuando el DOM esté listo
    function initialize() {
        // Solo ejecutar en Google Drive
        if (window.location.hostname !== 'drive.google.com') {
            return;
        }
        
        console.log('🚀 Transcription Downloader - Content Script cargado');
        console.log('📋 Para obtener ayuda: showHelpInfo()');
        
        // Interceptar tokens
        interceptGoogleDriveTokens();
        
        // Agregar botón helper después de un momento
        setTimeout(addHelperButton, 2000);
        
        // Hacer función de ayuda accesible globalmente
        window.showHelpInfo = showHelpInfo;
        
        // Mostrar info inicial si es la primera vez
        if (!localStorage.getItem('transcriptionDownloaderWelcome')) {
            setTimeout(() => {
                console.log('👋 ¡Bienvenido a Transcription Downloader!');
                console.log('🔍 Navega por Google Drive para capturar automáticamente tu token de acceso.');
                localStorage.setItem('transcriptionDownloaderWelcome', 'true');
            }, 1000);
        }
    }
    
    // Ejecutar cuando el documento esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // También ejecutar en cambios de URL (para SPAs como Drive)
    let currentURL = location.href;
    new MutationObserver(() => {
        if (location.href !== currentURL) {
            currentURL = location.href;
            if (window.location.hostname === 'drive.google.com') {
                setTimeout(addHelperButton, 1000);
            }
        }
    }).observe(document, { subtree: true, childList: true });
    
})();