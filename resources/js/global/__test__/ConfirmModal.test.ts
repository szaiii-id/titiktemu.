import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ConfirmModal from '../ConfirmModal.svelte';

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR & OPEN STATE
// ============================================================

describe('ConfirmModal.svelte — Rendering Dasar', () => {
    it('TIDAK merender apa pun jika open = false', () => {
        render(ConfirmModal, {
            props: {
                open: false,
                title: 'Hapus Data?',
                onConfirm: vi.fn(),
            },
        });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('merender dialog jika open = true', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Hapus Data?',
                onConfirm: vi.fn(),
            },
        });

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('menampilkan title yang diberikan', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Konfirmasi Hapus',
                onConfirm: vi.fn(),
            },
        });

        expect(screen.getByText('Konfirmasi Hapus')).toBeInTheDocument();
    });

    it('menampilkan deskripsi jika diberikan', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                description: 'Deskripsi detail tindakan.',
                onConfirm: vi.fn(),
            },
        });

        expect(
            screen.getByText('Deskripsi detail tindakan.'),
        ).toBeInTheDocument();
    });

    it('TIDAK menampilkan deskripsi jika kosong', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                description: '',
                onConfirm: vi.fn(),
            },
        });

        // Hanya title yang dirender, tidak ada elemen <p> deskripsi
        const p = document.querySelector('p.text-gray-600');
        expect(p).toBeNull();
    });
});

// ============================================================
// KATEGORI 2 — TOMBOL KONFIRMASI & BATAL
// ============================================================

describe('ConfirmModal.svelte — Tombol Aksi', () => {
    it('menampilkan tombol konfirmasi dengan label default', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                onConfirm: vi.fn(),
            },
        });

        expect(
            screen.getByRole('button', { name: /Ya, Lanjutkan/i }),
        ).toBeInTheDocument();
    });

    it('menampilkan tombol konfirmasi dengan label kustom', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                confirmLabel: 'Ya, Hapus',
                onConfirm: vi.fn(),
            },
        });

        expect(
            screen.getByRole('button', { name: /Ya, Hapus/i }),
        ).toBeInTheDocument();
    });

    it('memanggil onConfirm saat tombol konfirmasi diklik', async () => {
        const onConfirm = vi.fn();
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                confirmLabel: 'Hapus',
                onConfirm,
            },
        });

        await fireEvent.click(
            screen.getByRole('button', { name: /Hapus/i }),
        );
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('menutup modal (open = false) dan memanggil onCancel saat tombol batal diklik', async () => {
        const onCancel = vi.fn();
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                onConfirm: vi.fn(),
                onCancel,
            },
        });

        // Dialog mula-mula terlihat
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await fireEvent.click(
            screen.getByRole('button', { name: /Batal/i }),
        );

        expect(onCancel).toHaveBeenCalledTimes(1);
        // Svelte 5: verifikasi modal tertutup lewat DOM (open = false → dialog hilang)
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('memanggil onCancel saat backdrop (overlay) diklik', async () => {
        const onCancel = vi.fn();
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                onConfirm: vi.fn(),
                onCancel,
            },
        });

        const backdrop = screen.getByRole('button', {
            name: /Tutup modal/i,
        });
        await fireEvent.click(backdrop);

        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// KATEGORI 3 — REASON INPUT (requiresReason)
// ============================================================

describe('ConfirmModal.svelte — Reason Input', () => {
    it('TIDAK menampilkan textarea jika requiresReason = false', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                onConfirm: vi.fn(),
            },
        });

        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('menampilkan textarea jika requiresReason = true', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                requiresReason: true,
                reasonLabel: 'Alasan Penolakan',
                onConfirm: vi.fn(),
            },
        });

        expect(
            screen.getByText(/Alasan Penolakan/i),
        ).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('menonaktifkan tombol konfirmasi jika alasan kurang dari minReasonLength', async () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                requiresReason: true,
                minReasonLength: 5,
                onConfirm: vi.fn(),
            },
        });

        const textarea = screen.getByRole('textbox');
        const confirmBtn = screen.getByRole('button', {
            name: /Ya, Lanjutkan/i,
        });

        expect(confirmBtn).toBeDisabled();

        await fireEvent.input(textarea, { target: { value: 'abc' } });
        expect(confirmBtn).toBeDisabled();

        await fireEvent.input(textarea, { target: { value: 'abcde' } });
        expect(confirmBtn).not.toBeDisabled();
    });

    it('menampilkan error reason jika reasonError diberikan', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                requiresReason: true,
                reasonError: 'Alasan wajib diisi.',
                onConfirm: vi.fn(),
            },
        });

        expect(
            screen.getByText('Alasan wajib diisi.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    it('menonaktifkan textarea saat processing', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                requiresReason: true,
                processing: true,
                onConfirm: vi.fn(),
            },
        });

        expect(screen.getByRole('textbox')).toBeDisabled();
    });
});

// ============================================================
// KATEGORI 4 — STATE PROCESSING & DISABLED
// ============================================================

describe('ConfirmModal.svelte — State Processing', () => {
    it('menampilkan teks "Memproses..." dan spinner jika processing = true', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                processing: true,
                onConfirm: vi.fn(),
            },
        });

        expect(screen.getByText(/Memproses/i)).toBeInTheDocument();
        expect(
            document.querySelector('svg.animate-spin'),
        ).toBeInTheDocument();
    });

    it('menonaktifkan tombol konfirmasi dan batal saat processing = true', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                processing: true,
                onConfirm: vi.fn(),
            },
        });

        expect(
            screen.getByRole('button', { name: /Batal/i }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', { name: /Memproses/i }),
        ).toBeDisabled();
    });

    it('menonaktifkan tombol konfirmasi jika disabled = true', () => {
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                disabled: true,
                onConfirm: vi.fn(),
            },
        });

        expect(
            screen.getByRole('button', { name: /Ya, Lanjutkan/i }),
        ).toBeDisabled();
    });
});

// ============================================================
// KATEGORI 5 — KEYBOARD INTERACTION
// ============================================================

describe('ConfirmModal.svelte — Keyboard Interaction', () => {
    it('menutup modal saat tombol Escape ditekan', async () => {
        const onCancel = vi.fn();
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                onConfirm: vi.fn(),
                onCancel,
            },
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        // Simulasi tekan Escape pada window
        await fireEvent.keyDown(window, { key: 'Escape' });

        expect(onCancel).toHaveBeenCalledTimes(1);
        // Svelte 5: verifikasi modal tertutup lewat DOM
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('TIDAK menutup modal saat tombol lain ditekan', async () => {
        const onCancel = vi.fn();
        render(ConfirmModal, {
            props: {
                open: true,
                title: 'Judul',
                onConfirm: vi.fn(),
                onCancel,
            },
        });

        await fireEvent.keyDown(window, { key: 'Enter' });

        expect(onCancel).not.toHaveBeenCalled();
        // Dialog tetap ada
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});