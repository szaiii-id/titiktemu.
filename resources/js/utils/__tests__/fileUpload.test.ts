import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    validateImageFile,
    validateMultipleImageFiles,
    createImagePreview,
    createImagePreviews,
    formatFileSize,
} from '../fileUpload';

// ============================================================
// HELPERS
// ============================================================

/**
 * Buat File dengan ukuran tertentu.
 *
 * CATATAN PENTING: `new File([''], name)` selalu berukuran 0 byte,
 * karena ukuran File = total byte dari array Blob parts. Untuk
 * mensimulasikan file berukuran `size` byte, isi array harus
 * benar-benar berukuran `size` byte.
 */
const createMockFile = (
    name: string,
    size: number,
    type: string,
): File => {
    const content = new Uint8Array(size);
    return new File([content], name, {
        type,
        lastModified: Date.now(),
    });
};

// ============================================================
// KATEGORI 1 — validateImageFile
// ============================================================

describe('validateImageFile', () => {
    it('mengembalikan error jika file null/undefined', () => {
        expect(validateImageFile(null).valid).toBe(false);
        expect(validateImageFile(null).error).toBe('File tidak dipilih.');

        expect(validateImageFile(undefined).valid).toBe(false);
        expect(validateImageFile(undefined).error).toBe('File tidak dipilih.');
    });

    it('valid untuk file JPG/PNG/WEBP yang ukurannya sesuai', () => {
        const file = createMockFile('test.png', 1024 * 1024, 'image/png');
        const result = validateImageFile(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
    });

    it('error jika tipe file tidak didukung', () => {
        const file = createMockFile('document.pdf', 1024, 'application/pdf');
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('tidak didukung');
    });

    it('error jika ukuran file melebihi batas default (2 MB)', () => {
        const file = createMockFile('big.png', 3 * 1024 * 1024, 'image/png');
        const result = validateImageFile(file);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('melebihi 2 MB');
    });

    it('menerima ukuran kustom via options.maxSizeMB', () => {
        const file = createMockFile('medium.png', 3 * 1024 * 1024, 'image/png');
        const result = validateImageFile(file, { maxSizeMB: 5 });
        expect(result.valid).toBe(true);
    });

    it('menerima tipe kustom via options.allowedTypes', () => {
        const file = createMockFile('test.svg', 1024, 'image/svg+xml');
        const result = validateImageFile(file, { allowedTypes: ['image/svg+xml'] });
        expect(result.valid).toBe(true);
    });
});

// ============================================================
// KATEGORI 2 — validateMultipleImageFiles
// ============================================================

describe('validateMultipleImageFiles', () => {
    it('error jika tidak ada file', () => {
        const result = validateMultipleImageFiles([]);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Minimal 1 file wajib dipilih.');
    });

    it('error jika file melebihi maxCount', () => {
        const files = [
            createMockFile('1.png', 1024, 'image/png'),
            createMockFile('2.png', 1024, 'image/png'),
            createMockFile('3.png', 1024, 'image/png'),
        ];
        const result = validateMultipleImageFiles(files, { maxCount: 2 });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Maksimal 2 file.');
    });

    it('mengumpulkan error dari setiap file yang tidak valid', () => {
        const files = [
            createMockFile('ok.png', 1024, 'image/png'),
            createMockFile('bad.pdf', 1024, 'application/pdf'),
            createMockFile('big.png', 3 * 1024 * 1024, 'image/png'),
        ];
        const result = validateMultipleImageFiles(files);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(2);
        expect(result.errors.some((e) => e.includes('tidak didukung'))).toBe(true);
        expect(result.errors.some((e) => e.includes('melebihi'))).toBe(true);
    });

    it('valid jika semua file sesuai', () => {
        const files = [
            createMockFile('1.png', 1024, 'image/png'),
            createMockFile('2.jpg', 1024, 'image/jpeg'),
        ];
        const result = validateMultipleImageFiles(files);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });
});

// ============================================================
// KATEGORI 3 — createImagePreview
// ============================================================

describe('createImagePreview', () => {
    beforeEach(() => {
        vi.stubGlobal('FileReader', class {
            onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
            onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
            result: string | ArrayBuffer | null = null;

            readAsDataURL(_file: File) {
                setTimeout(() => {
                    this.result = 'data:image/png;base64,fake';
                    if (this.onload) {
                        this.onload.call(this as any, {} as any);
                    }
                }, 0);
            }
        });
    });

    it('mengembalikan data URL preview', async () => {
        const file = createMockFile('test.png', 1024, 'image/png');
        const result = await createImagePreview(file);
        expect(result).toBe('data:image/png;base64,fake');
    });
});

// ============================================================
// KATEGORI 4 — formatFileSize
// ============================================================

describe('formatFileSize', () => {
    it('mengembalikan "-" untuk input tidak valid', () => {
        expect(formatFileSize(-1)).toBe('-');
        expect(formatFileSize(NaN)).toBe('-');
        expect(formatFileSize(Infinity)).toBe('-');
    });

    it('format bytes', () => {
        expect(formatFileSize(0)).toBe('0 B');
        expect(formatFileSize(512)).toBe('512 B');
    });

    it('format KB', () => {
        expect(formatFileSize(1024)).toBe('1.0 KB');
        expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('format MB', () => {
        expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
        expect(formatFileSize(1536000)).toBe('1.5 MB');
    });

    it('format GB', () => {
        expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
});