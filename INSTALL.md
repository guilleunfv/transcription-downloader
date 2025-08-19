# 📋 Guía Completa de Instalación - Transcription Downloader Pro

Esta guía te llevará paso a paso para instalar y usar la extensión **Transcription Downloader Pro** en Google Chrome.

## 🎯 **Requisitos Previos**

- ✅ **Google Chrome** (versión 88 o superior)
- ✅ **Acceso a Google Drive** con las transcripciones
- ✅ **Conexión a internet** estable
- ✅ **5 minutos** de tu tiempo

---

## 🚀 **MÉTODO 1: Instalación Rápida (Recomendado)**

### **Paso 1: Descargar la Extensión**

1. **Ve al repositorio**: [https://github.com/extgucamahu/transcription-downloader](https://github.com/extgucamahu/transcription-downloader)

2. **Descargar ZIP**:
   - Haz clic en el botón verde **"Code"**
   - Selecciona **"Download ZIP"**
   - Guarda el archivo en tu computadora

3. **Extraer archivos**:
   - Haz clic derecho en el archivo ZIP descargado
   - Selecciona **"Extraer todo..."** o **"Extract All..."**
   - Elige una carpeta fácil de encontrar (ej: Escritorio)

### **Paso 2: Instalar en Chrome**

1. **Abrir extensiones de Chrome**:
   - Abre Google Chrome
   - En la barra de direcciones, escribe: `chrome://extensions/`
   - Presiona **Enter**

2. **Activar modo desarrollador**:
   - En la esquina superior derecha, activa **"Modo de desarrollador"**
   - Verás que aparecen nuevos botones

3. **Cargar la extensión**:
   - Haz clic en **"Cargar extensión sin empaquetar"**
   - Navega hasta la carpeta extraída `transcription-downloader`
   - Selecciona la carpeta y haz clic en **"Seleccionar carpeta"**

4. **Verificar instalación**:
   - Deberías ver la extensión **"Transcription Downloader Pro"** en tu lista
   - Aparecerá un ícono 🚀 en la barra de herramientas de Chrome

---

## 🔑 **MÉTODO 2: Obtener tu Token de Google Drive**

### **Paso 1: Método Automático (Más Fácil)**

1. **Ir a Google Drive**:
   - Abre una nueva pestaña
   - Ve a [https://drive.google.com](https://drive.google.com)
   - Asegúrate de estar logueado con tu cuenta

2. **Activar la captura automática**:
   - La extensión detectará automáticamente cuando navegues
   - Abre algunas carpetas en Drive
   - Verás una notificación verde cuando se capture el token

3. **Usar el botón flotante**:
   - Busca el botón azul **"🔑 Obtener Token"** en la esquina inferior derecha
   - Haz clic para copiar el token capturado

### **Paso 2: Método Manual (Si el automático falla)**

1. **Abrir herramientas de desarrollador**:
   - Estando en Google Drive, presiona **F12**
   - Selecciona la pestaña **"Network"** o **"Red"**

2. **Generar peticiones**:
   - Navega por Google Drive (abre carpetas, ve archivos)
   - En la lista de peticiones, busca una que contenga **"files"**

3. **Extraer el token**:
   - Haz clic en una petición de tipo **"files"**
   - Ve a la pestaña **"Headers"** o **"Encabezados"**
   - Busca la línea **"Authorization"**
   - Copia todo el valor (comienza con `Bearer ya29...`)

---

## ⚙️ **MÉTODO 3: Configurar y Usar la Extensión**

### **Paso 1: Abrir la Extensión**

1. **Haz clic en el ícono 🚀** de la extensión en la barra de Chrome
2. Se abrirá una ventana emergente con la interfaz

### **Paso 2: Configurar Token**

1. **Pegar token**:
   - En el campo **"Token de Acceso"**
   - Pega el token que obtuviste (debe empezar con `Bearer ya29...`)
   - Haz clic en **"✅ Validar Token"**

2. **Verificar validación**:
   - Debe mostrar tu nombre de usuario de Google
   - El botón se pondrá verde: **"✅ Token Válido"**

### **Paso 3: Configurar Fechas**

1. **Fecha de inicio**: Establece desde cuándo buscar archivos
2. **Fecha de fin**: Establece hasta cuándo buscar archivos
3. **Ejemplo**: Del 2025-08-08 al 2025-08-16

### **Paso 4: Configurar Opciones**

- ✅ **Separar archivos filtrados/no filtrados**: Recomendado
- **IDs Objetivo**: Ya están preconfigurados (250 IDs)

### **Paso 5: Iniciar Descarga**

1. **Haz clic en "🚀 INICIAR DESCARGA MASIVA"**
2. **Confirma** en el diálogo que aparece
3. **Espera**: El proceso puede tomar varios minutos
4. **Monitorea**: Ve el progreso en tiempo real

---

## 📊 **MÉTODO 4: Entender los Resultados**

### **Durante el Proceso**

- **Barra de progreso**: Muestra el avance general
- **Status**: Indica qué está haciendo ahora
- **Estadísticas en tiempo real**:
  - **Procesados**: Archivos analizados
  - **Descargados**: Archivos descargados exitosamente
  - **Errores**: Archivos que no se pudieron descargar

### **Estructura de Descarga**

Los archivos se descargan en esta estructura:

📁 Descargas/
├── 📁 filtrados/                    (IDs que están en la lista)
│   ├── 📁 Supervisor1/
│   │   ├── 📁 Agente1/
│   │   │   └── 📄 transcripcion1.txt
│   │   └── 📁 Agente2/
│   └── 📁 Supervisor2/
└── 📁 no_filtrados/                 (IDs que NO están en la lista)
├── 📁 Supervisor1/
└── 📁 Supervisor2/

---

## 🔧 **Solución de Problemas**

### **❌ "Token inválido o expirado"**

**Causa**: Los tokens de Google expiran cada ~1 hora

**Solución**:
1. Ve a Google Drive nuevamente
2. Navega por algunas carpetas
3. Obtén un nuevo token
4. Pégalo en la extensión

### **❌ "No se encontraron archivos"**

**Causa**: Los filtros son muy restrictivos

**Solución**:
1. Verifica el rango de fechas
2. Asegúrate de que hay archivos con keywords: `gemini`, `transcript`, `anotações`
3. Revisa que tienes acceso a la carpeta principal

### **❌ "Descarga muy lenta"**

**Causa**: Chrome limita descargas simultáneas

**Solución**:
1. Es comportamiento normal con muchos archivos
2. Puedes pausar y reanudar el proceso
3. Deja que termine, puede tomar tiempo

### **❌ "La extensión no aparece"**

**Causa**: Error en la instalación

**Solución**:
1. Ve a `chrome://extensions/`
2. Verifica que está activada
3. Si hay errores, reinstala desde el ZIP
4. Asegúrate de tener "Modo desarrollador" activado

### **❌ "No se captura el token automáticamente"**

**Causa**: Problemas con el script de captura

**Solución**:
1. Actualiza la página de Google Drive
2. Usa el método manual (F12 → Network)
3. Verifica que estás en `drive.google.com`

---

## 💡 **Consejos y Mejores Prácticas**

### **Para Máximo Rendimiento**

1. **Usa Chrome actualizado**: Versiones recientes funcionan mejor
2. **Cierra pestañas innecesarias**: Libera memoria
3. **Conexión estable**: Evita WiFi intermitente
4. **Paciencia**: Procesos grandes toman tiempo

### **Para Máxima Organización**

1. **Revisa las fechas**: Usa rangos específicos
2. **Monitorea el log**: Ve qué está pasando
3. **Verifica descargas**: Revisa la carpeta de descargas
4. **Guarda configuración**: La extensión recuerda tus ajustes

### **Para Máxima Seguridad**

1. **Token privado**: No lo compartas con nadie
2. **Usa tu propia cuenta**: No uses cuentas de otros
3. **Revisa permisos**: Solo funciona con cuentas autorizadas

---

## 🆘 **Soporte y Ayuda**

### **Si nada funciona**

1. **Revisa la consola**:
   - Presiona F12 en la extensión
   - Ve a "Console" y busca errores en rojo

2. **Reinstala completamente**:
   - Elimina la extensión de Chrome
   - Descarga el ZIP nuevamente
   - Instala desde cero

3. **Reporta el problema**:
   - Ve a [GitHub Issues](https://github.com/extgucamahu/transcription-downloader/issues)
   - Describe el problema detalladamente
   - Incluye capturas de pantalla si es posible

### **Información para reportes**

Cuando reportes un problema, incluye:
- **Versión de Chrome**: `chrome://version/`
- **Sistema operativo**: Windows/Mac/Linux
- **Mensaje de error exacto**
- **Pasos que realizaste**
- **Captura de pantalla del error**

---

## ✅ **Lista de Verificación Final**

Antes de usar la extensión, asegúrate de que:

- [ ] Chrome está actualizado
- [ ] La extensión está instalada y activa
- [ ] Tienes un token válido de Google Drive
- [ ] Las fechas están configuradas correctamente
- [ ] Tienes acceso a las carpetas de transcripciones
- [ ] Tu conexión a internet es estable

---

## 🎉 **¡Listo para Usar!**

Si has seguido todos los pasos, tu extensión debería estar funcionando perfectamente. 

**¿Problemas?** No dudes en [crear un issue en GitHub](https://github.com/extgucamahu/transcription-downloader/issues) con todos los detalles.

**¿Todo funciona?** ¡Dale una ⭐ estrella al repositorio y comparte con tu equipo!

---

