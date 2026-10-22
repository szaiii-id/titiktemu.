/**
 * Helper validasi & preview upload file gambar.
 *
 * Semua validasi dilakukan di frontend untuk UX cepat;
 * backend tetap wajib validasi ulang (Form Request).
 */

// ==========================================
// TYPES
// ==========================================

export type ImageValidationOptions = {
    /** Maksimal ukuran per file dalam MB. Default 2. */
    maxSizeMB?: number;
    /** Mime type yang diizinkan. */
    allowedTypes?: string[];
    /** Label untuk pesan error (misal "logo", "foto bukti"). Default "file". */
    label?: string;
};

export type FileValidationResult = {
    valid: boolean;
    error: string | null;
};

export type MultipleFileValidationResult = {
    valid: boolean;
    errors: string[];
};

// ==========================================
// CONSTANTS
// ==========================================

const DEFAULT_MAX_SIZE_MB = 2;
const DEFAULT_ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];

// ==========================================
// VALIDATE — SINGLE
// ==========================================

/**
 * Validasi satu file gambar.
 */
export function validateImageFile(
    file: File | null | undefined,
    options: ImageValidationOptions = {},
): FileValidationResult {
    if (!file) {
        return { valid: false, error: 'File tidak dipilih.' };
    }

    const maxSizeMB = options.maxSizeMB ?? DEFAULT_MAX_SIZE_MB;
    const allowedTypes = options.allowedTypes ?? DEFAULT_ALLOWED_TYPES;
    const label = options.label ?? 'file';

    // ✅ SIZE DULU — pesan ukuran selalu menang untuk file > maxSizeMB
    if (file.size > maxSizeMB * 1024 * 1024) {
        return {
            valid: false,
            error: `Ukuran ${label} maksimal ${maxSizeMB}MB.`,
        };
    }

    // Baru cek MIME type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Format ${label} tidak didukung. Gunakan JPG, PNG, atau WEBP.`,
        };
    }

    return { valid: true, error: null };
}

// ==========================================
// VALIDATE — MULTIPLE
// ==========================================

/**
 * Validasi banyak file gambar sekaligus.
 */
export function validateMultipleImageFiles(
    files: File[] | FileList | null | undefined,
    options: ImageValidationOptions & { maxCount?: number } = {},
): MultipleFileValidationResult {
    const fileArray = toFileArray(files);
    const maxCount = options.maxCount;

    const errors: string[] = [];

    if (fileArray.length === 0) {
        errors.push('Minimal 1 file wajib dipilih.');
    }

    if (maxCount !== undefined && fileArray.length > maxCount) {
        errors.push(`Maksimal ${maxCount} file.`);
    }

    for (const file of fileArray) {
        const result = validateImageFile(file, options);
        if (!result.valid && result.error) {
            errors.push(result.error);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ==========================================
// PREVIEW
// ==========================================

/**
 * Buat data URL preview dari file gambar.
 */
export function createImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                resolve(result);
            } else {
                reject(new Error('Gagal membaca file.'));
            }
        };

        reader.onerror = () => reject(new Error('Gagal membaca file.'));

        reader.readAsDataURL(file);
    });
}

/**
 * Buat banyak preview sekaligus.
 */
export function createImagePreviews(files: File[]): Promise<string[]> {
    return Promise.all(files.map(createImagePreview));
}

// ==========================================
// FORMAT SIZE
// ==========================================

/**
 * Format ukuran file ke string human-readable.
 */
export function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '-';
    if (bytes < 1024) return `${bytes} B`;

    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }

    return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// ==========================================
// INTERNAL
// ==========================================

function toFileArray(files: File[] | FileList | null | undefined): File[] {
    if (!files) return [];
    if (Array.isArray(files)) return files;
    return Array.from(files);
}