import { storage } from './firebase-config.js';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

/**
 * 📤 Sube una imagen a Firebase Storage
 * @param {File} file - Archivo de imagen (del input file)
 * @param {string} path - Ruta en Storage (ej: 'usuarios/uid123/foto.jpg')
 * @returns {Promise<string>} - URL pública de la imagen
 */
export async function subirImagen(file, path) {
    try {
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            throw new Error('El archivo no es una imagen válida');
        }

        // Validar tamaño (3MB)
        if (file.size > 3 * 1024 * 1024) {
            throw new Error('La imagen excede el límite de 3MB');
        }

        // Crear referencia en Storage
        const storageRef = ref(storage, path);
        
        // Subir archivo
        const snapshot = await uploadBytes(storageRef, file);
        
        // Obtener URL pública
        const url = await getDownloadURL(snapshot.ref);
        
        console.log(`✅ Imagen subida: ${path}`);
        return url;
        
    } catch (error) {
        console.error('❌ Error al subir imagen:', error);
        throw error;
    }
}

/**
 * 🗑️ Elimina una imagen de Firebase Storage
 * @param {string} path - Ruta en Storage
 * @returns {Promise<void>}
 */
export async function eliminarImagen(path) {
    try {
        if (!path) return;
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        console.log(`✅ Imagen eliminada: ${path}`);
    } catch (error) {
        // Si el error es que el archivo no existe, no hacemos nada
        if (error.code === 'storage/object-not-found') {
            console.log('ℹ️ El archivo ya había sido eliminado');
            return;
        }
        console.error('❌ Error al eliminar imagen:', error);
    }
}

/**
 * 🖼️ Convierte un archivo a Base64 (para vista previa)
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string>} - Data URL en Base64
 */
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsDataURL(file);
    });
}

/**
 * 📁 Genera una ruta única para una imagen
 * @param {string} tipo - 'usuarios' o 'reportes'
 * @param {string} id - UID del usuario o ID del reporte
 * @param {string} nombreArchivo - Nombre original del archivo
 * @returns {string} - Ruta completa
 */
export function generarRutaImagen(tipo, id, nombreArchivo) {
    // Obtener extensión del archivo
    const extension = nombreArchivo.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    return `${tipo}/${id}/foto_${timestamp}.${extension}`;
}