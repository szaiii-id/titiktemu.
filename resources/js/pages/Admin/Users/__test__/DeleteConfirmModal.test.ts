import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import DeleteConfirmModal from '../DeleteConfirmModal.svelte';

// ============================================================
// SETUP & TEARDOWN
// ============================================================

afterEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — CONDITIONAL RENDERING
// ============================================================

describe('DeleteConfirmModal.svelte — Conditional Rendering', () => {
    it('TIDAK render modal saat open = false', () => {
        render(DeleteConfirmModal, {
            props: { open: false, userName: 'Budi Santoso' },
        });
        expect(screen.queryByText(/Hapus User\?/i)).not.toBeInTheDocument();
    });

    it('render modal saat open = true', () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi Santoso' },
        });
        expect(screen.getByText(/Hapus User\?/i)).toBeInTheDocument();
    });

    it('TIDAK render backdrop saat open = false', () => {
        render(DeleteConfirmModal, {
            props: { open: false, userName: 'Budi' },
        });
        expect(screen.queryByLabelText(/Tutup modal/i)).not.toBeInTheDocument();
    });

    it('render backdrop saat open = true', () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi' },
        });
        expect(screen.getByLabelText(/Tutup modal/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — UI CONTRACT
// ============================================================

describe('DeleteConfirmModal.svelte — UI Contract', () => {
    beforeEach(() => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi Santoso' },
        });
    });

    it('menampilkan heading "Hapus User?"', () => {
        expect(
            screen.getByRole('heading', { name: /Hapus User\?/i })
        ).toBeInTheDocument();
    });

    it('menampilkan nama user di konfirmasi', () => {
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });

    it('menampilkan pesan "Tindakan ini tidak bisa dibatalkan"', () => {
        expect(
            screen.getByText(/Tindakan ini tidak bisa dibatalkan/i)
        ).toBeInTheDocument();
    });

    it('menampilkan tombol "Batal"', () => {
        expect(screen.getByRole('button', { name: /^Batal$/i })).toBeInTheDocument();
    });

    it('menampilkan tombol "Ya, Hapus"', () => {
        expect(
            screen.getByRole('button', { name: /Ya, Hapus/i })
        ).toBeInTheDocument();
    });

    it('menampilkan icon warning (SVG)', () => {
        const svg = document.querySelector('svg.text-red-600');
        expect(svg).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — USERNAME RENDERING
// ============================================================

describe('DeleteConfirmModal.svelte — Username Rendering', () => {
    it('menampilkan nama user dengan bold', () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi Santoso' },
        });

        const userNameSpan = screen.getByText('Budi Santoso');
        expect(userNameSpan).toHaveClass('font-bold');
    });

    it('menampilkan nama user berbeda', () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Ani Wijaya' },
        });
        expect(screen.getByText('Ani Wijaya')).toBeInTheDocument();
    });

    it('handle userName default (string kosong)', () => {
        render(DeleteConfirmModal, {
            props: { open: true },
        });
        expect(screen.getByText(/Hapus User\?/i)).toBeInTheDocument();
    });

    it('handle userName panjang', () => {
        const longName = 'a'.repeat(100);
        render(DeleteConfirmModal, {
            props: { open: true, userName: longName },
        });
        expect(screen.getByText(longName)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — CANCEL BEHAVIOR
// ============================================================

describe('DeleteConfirmModal.svelte — Cancel Behavior', () => {
    it('klik tombol "Batal" menutup modal (open = false)', async () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi' },
        });

        const batalBtn = screen.getByRole('button', { name: /^Batal$/i });
        await fireEvent.click(batalBtn);

        await waitFor(() => {
            expect(screen.queryByText(/Hapus User\?/i)).not.toBeInTheDocument();
        });
    });

    it('klik backdrop menutup modal', async () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi' },
        });

        const backdrop = screen.getByLabelText(/Tutup modal/i);
        await fireEvent.click(backdrop);

        await waitFor(() => {
            expect(screen.queryByText(/Hapus User\?/i)).not.toBeInTheDocument();
        });
    });

    it('klik "Batal" TIDAK memanggil onConfirm', async () => {
        const onConfirm = vi.fn();
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi', onConfirm },
        });

        const batalBtn = screen.getByRole('button', { name: /^Batal$/i });
        await fireEvent.click(batalBtn);

        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('klik backdrop TIDAK memanggil onConfirm', async () => {
        const onConfirm = vi.fn();
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi', onConfirm },
        });

        const backdrop = screen.getByLabelText(/Tutup modal/i);
        await fireEvent.click(backdrop);

        expect(onConfirm).not.toHaveBeenCalled();
    });
});

// ============================================================
// KATEGORI 5 — CONFIRM BEHAVIOR
// ============================================================

describe('DeleteConfirmModal.svelte — Confirm Behavior', () => {
    it('klik "Ya, Hapus" memanggil onConfirm callback', async () => {
        const onConfirm = vi.fn();
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi', onConfirm },
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Hapus/i });
        await fireEvent.click(confirmBtn);

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('klik "Ya, Hapus" TIDAK menutup modal secara otomatis', async () => {
        const onConfirm = vi.fn();
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi', onConfirm },
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Hapus/i });
        await fireEvent.click(confirmBtn);

        expect(screen.getByText(/Hapus User\?/i)).toBeInTheDocument();
    });

    it('klik "Ya, Hapus" berkali-kali memanggil onConfirm berkali-kali', async () => {
        const onConfirm = vi.fn();
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi', onConfirm },
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Hapus/i });
        await fireEvent.click(confirmBtn);
        await fireEvent.click(confirmBtn);
        await fireEvent.click(confirmBtn);

        expect(onConfirm).toHaveBeenCalledTimes(3);
    });

    it('TIDAK error kalau onConfirm undefined', async () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi' },
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Hapus/i });
        await fireEvent.click(confirmBtn);

        expect(true).toBe(true);
    });
});

// ============================================================
// KATEGORI 6 — ACCESSIBILITY
// ============================================================

describe('DeleteConfirmModal.svelte — Accessibility', () => {
    beforeEach(() => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi' },
        });
    });

    it('backdrop punya type="button"', () => {
        const backdrop = screen.getByLabelText(/Tutup modal/i);

        // ✅ FIX: <button> semantic — cek type="button" (bukan role="button")
        expect(backdrop).toHaveAttribute('type', 'button');

        // Bonus: cek tag name = BUTTON
        expect(backdrop.tagName).toBe('BUTTON');
    });

    it('backdrop punya aria-label "Tutup modal"', () => {
        const backdrop = screen.getByLabelText(/Tutup modal/i);
        expect(backdrop).toHaveAttribute('aria-label', 'Tutup modal');
    });

    it('backdrop TIDAK punya tabindex="-1" (button focusable by default)', () => {
        const backdrop = screen.getByLabelText(/Tutup modal/i);

        // ✅ FIX: <button> sudah focusable by default.
        // `tabindex="-1"` justru akan menghilangkan sifat focusable.
        expect(backdrop).not.toHaveAttribute('tabindex');
    });

    it('heading pakai h2', () => {
        const heading = screen.getByRole('heading', { name: /Hapus User\?/i });
        expect(heading.tagName).toBe('H2');
    });
});

// ============================================================
// KATEGORI 7 — EDGE CASES
// ============================================================

describe('DeleteConfirmModal.svelte — Edge Cases', () => {
    it('handle userName dengan karakter khusus', () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: "O'Brien & Sons" },
        });
        expect(screen.getByText("O'Brien & Sons")).toBeInTheDocument();
    });

    it('handle userName dengan emoji', () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi 🚀' },
        });
        expect(screen.getByText('Budi 🚀')).toBeInTheDocument();
    });

    it('berubah dari open=false ke open=true menampilkan modal', async () => {
        const { rerender } = render(DeleteConfirmModal, {
            props: { open: false, userName: 'Budi' },
        });

        expect(screen.queryByText(/Hapus User\?/i)).not.toBeInTheDocument();

        await rerender({ open: true, userName: 'Budi' });

        expect(screen.getByText(/Hapus User\?/i)).toBeInTheDocument();
    });

    it('berubah dari open=true ke open=false menyembunyikan modal', async () => {
        const { rerender } = render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi' },
        });

        expect(screen.getByText(/Hapus User\?/i)).toBeInTheDocument();

        await rerender({ open: false, userName: 'Budi' });

        expect(screen.queryByText(/Hapus User\?/i)).not.toBeInTheDocument();
    });

    it('onConfirm tetap bekerja setelah re-render', async () => {
        const onConfirm1 = vi.fn();
        const onConfirm2 = vi.fn();

        const { rerender } = render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi', onConfirm: onConfirm1 },
        });

        await rerender({ open: true, userName: 'Ani', onConfirm: onConfirm2 });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Hapus/i });
        await fireEvent.click(confirmBtn);

        expect(onConfirm1).not.toHaveBeenCalled();
        expect(onConfirm2).toHaveBeenCalledTimes(1);
    });

    it('modal punya max-width class', () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi' },
        });

        const modal = document.querySelector('.max-w-md');
        expect(modal).toBeInTheDocument();
    });

    it('tombol "Ya, Hapus" punya warna red', () => {
        render(DeleteConfirmModal, {
            props: { open: true, userName: 'Budi' },
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Hapus/i });
        expect(confirmBtn).toHaveClass('bg-red-600');
    });
});