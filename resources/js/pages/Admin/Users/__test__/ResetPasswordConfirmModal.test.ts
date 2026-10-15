import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ResetPasswordConfirmModal from '../ResetPasswordConfirmModal.svelte';

// ============================================================
// SETUP & TEARDOWN
// ============================================================

afterEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — CONDITIONAL RENDERING
// ============================================================

describe('ResetPasswordConfirmModal.svelte — Conditional Rendering', () => {
    it('TIDAK render modal saat open = false', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: false,
                userName: 'Budi Santoso',
                userEmail: 'budi@example.com',
            },
        });
        expect(screen.queryByText(/Reset Password\?/i)).not.toBeInTheDocument();
    });

    it('render modal saat open = true', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi Santoso',
                userEmail: 'budi@example.com',
            },
        });
        expect(screen.getByText(/Reset Password\?/i)).toBeInTheDocument();
    });

    it('TIDAK render backdrop saat open = false', () => {
        render(ResetPasswordConfirmModal, {
            props: { open: false, userName: 'Budi', userEmail: 'budi@example.com' },
        });
        expect(screen.queryByLabelText(/Tutup modal/i)).not.toBeInTheDocument();
    });

    it('render backdrop saat open = true', () => {
        render(ResetPasswordConfirmModal, {
            props: { open: true, userName: 'Budi', userEmail: 'budi@example.com' },
        });
        expect(screen.getByLabelText(/Tutup modal/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — UI CONTRACT
// ============================================================

describe('ResetPasswordConfirmModal.svelte — UI Contract', () => {
    beforeEach(() => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi Santoso',
                userEmail: 'budi@example.com',
            },
        });
    });

    it('menampilkan heading "Reset Password?"', () => {
        expect(
            screen.getByRole('heading', { name: /Reset Password\?/i })
        ).toBeInTheDocument();
    });

    it('menampilkan pesan "Yakin ingin mereset password user berikut"', () => {
        expect(
            screen.getByText(/Yakin ingin mereset password user berikut/i)
        ).toBeInTheDocument();
    });

    it('menampilkan info "Password baru akan ditampilkan sekali"', () => {
        expect(
            screen.getByText(/ditampilkan sekali/i)
        ).toBeInTheDocument();
    });

    it('menampilkan info "user harus menggantinya saat login"', () => {
        expect(
            screen.getByText(/user harus menggantinya saat login/i)
        ).toBeInTheDocument();
    });

    it('menampilkan tombol "Batal"', () => {
        expect(screen.getByRole('button', { name: /^Batal$/i })).toBeInTheDocument();
    });

    it('menampilkan tombol "Ya, Reset Password"', () => {
        expect(
            screen.getByRole('button', { name: /Ya, Reset Password/i })
        ).toBeInTheDocument();
    });

    it('menampilkan icon warning (SVG kuning)', () => {
        const svg = document.querySelector('svg.text-yellow-600');
        expect(svg).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — USER INFO DISPLAY
// ============================================================

describe('ResetPasswordConfirmModal.svelte — User Info Display', () => {
    it('menampilkan nama user', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi Santoso',
                userEmail: 'budi@example.com',
            },
        });
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });

    it('menampilkan email user', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi Santoso',
                userEmail: 'budi@example.com',
            },
        });
        expect(screen.getByText('budi@example.com')).toBeInTheDocument();
    });

    it('nama user pakai font-bold', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi Santoso',
                userEmail: 'budi@example.com',
            },
        });
        const nameEl = screen.getByText('Budi Santoso');
        expect(nameEl).toHaveClass('font-bold');
    });

    it('email user pakai text-xs', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi Santoso',
                userEmail: 'budi@example.com',
            },
        });
        const emailEl = screen.getByText('budi@example.com');
        expect(emailEl).toHaveClass('text-xs');
    });

    it('handle userName default (string kosong)', () => {
        render(ResetPasswordConfirmModal, {
            props: { open: true },
        });
        expect(screen.getByText(/Reset Password\?/i)).toBeInTheDocument();
    });

    it('handle email user berbeda', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Ani Wijaya',
                userEmail: 'ani@example.com',
            },
        });
        expect(screen.getByText('Ani Wijaya')).toBeInTheDocument();
        expect(screen.getByText('ani@example.com')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — CANCEL BEHAVIOR
// ============================================================

describe('ResetPasswordConfirmModal.svelte — Cancel Behavior', () => {
    it('klik tombol "Batal" menutup modal', async () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
            },
        });

        const batalBtn = screen.getByRole('button', { name: /^Batal$/i });
        await fireEvent.click(batalBtn);

        await waitFor(() => {
            expect(screen.queryByText(/Reset Password\?/i)).not.toBeInTheDocument();
        });
    });

    it('klik backdrop menutup modal', async () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
            },
        });

        const backdrop = screen.getByLabelText(/Tutup modal/i);
        await fireEvent.click(backdrop);

        await waitFor(() => {
            expect(screen.queryByText(/Reset Password\?/i)).not.toBeInTheDocument();
        });
    });

    it('klik "Batal" TIDAK memanggil onConfirm', async () => {
        const onConfirm = vi.fn();
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
                onConfirm,
            },
        });

        const batalBtn = screen.getByRole('button', { name: /^Batal$/i });
        await fireEvent.click(batalBtn);

        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('klik backdrop TIDAK memanggil onConfirm', async () => {
        const onConfirm = vi.fn();
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
                onConfirm,
            },
        });

        const backdrop = screen.getByLabelText(/Tutup modal/i);
        await fireEvent.click(backdrop);

        expect(onConfirm).not.toHaveBeenCalled();
    });
});

// ============================================================
// KATEGORI 5 — CONFIRM BEHAVIOR
// ============================================================

describe('ResetPasswordConfirmModal.svelte — Confirm Behavior', () => {
    it('klik "Ya, Reset Password" memanggil onConfirm callback', async () => {
        const onConfirm = vi.fn();
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
                onConfirm,
            },
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Reset Password/i });
        await fireEvent.click(confirmBtn);

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('klik "Ya, Reset Password" TIDAK menutup modal otomatis', async () => {
        const onConfirm = vi.fn();
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
                onConfirm,
            },
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Reset Password/i });
        await fireEvent.click(confirmBtn);

        expect(screen.getByText(/Reset Password\?/i)).toBeInTheDocument();
    });

    it('klik "Ya, Reset Password" berkali-kali memanggil onConfirm berkali-kali', async () => {
        const onConfirm = vi.fn();
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
                onConfirm,
            },
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Reset Password/i });
        await fireEvent.click(confirmBtn);
        await fireEvent.click(confirmBtn);
        await fireEvent.click(confirmBtn);

        expect(onConfirm).toHaveBeenCalledTimes(3);
    });

    it('TIDAK error kalau onConfirm undefined', async () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
            },
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Reset Password/i });
        await fireEvent.click(confirmBtn);

        expect(true).toBe(true);
    });
});

// ============================================================
// KATEGORI 6 — ACCESSIBILITY
// ============================================================

describe('ResetPasswordConfirmModal.svelte — Accessibility', () => {
    beforeEach(() => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
            },
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
        const heading = screen.getByRole('heading', { name: /Reset Password\?/i });
        expect(heading.tagName).toBe('H2');
    });
});

// ============================================================
// KATEGORI 7 — EDGE CASES
// ============================================================

describe('ResetPasswordConfirmModal.svelte — Edge Cases', () => {
    it('handle userName dengan karakter khusus', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: "O'Brien & Sons",
                userEmail: 'obrien@example.com',
            },
        });
        expect(screen.getByText("O'Brien & Sons")).toBeInTheDocument();
    });

    it('handle userName dengan emoji', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi 🚀',
                userEmail: 'budi@example.com',
            },
        });
        expect(screen.getByText('Budi 🚀')).toBeInTheDocument();
    });

    it('handle email dengan subdomain', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'user@mail.example.com',
            },
        });
        expect(screen.getByText('user@mail.example.com')).toBeInTheDocument();
    });

    it('berubah dari open=false ke open=true menampilkan modal', async () => {
        const { rerender } = render(ResetPasswordConfirmModal, {
            props: {
                open: false,
                userName: 'Budi',
                userEmail: 'budi@example.com',
            },
        });

        expect(screen.queryByText(/Reset Password\?/i)).not.toBeInTheDocument();

        await rerender({
            open: true,
            userName: 'Budi',
            userEmail: 'budi@example.com',
        });

        expect(screen.getByText(/Reset Password\?/i)).toBeInTheDocument();
    });

    it('berubah dari open=true ke open=false menyembunyikan modal', async () => {
        const { rerender } = render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
            },
        });

        expect(screen.getByText(/Reset Password\?/i)).toBeInTheDocument();

        await rerender({
            open: false,
            userName: 'Budi',
            userEmail: 'budi@example.com',
        });

        expect(screen.queryByText(/Reset Password\?/i)).not.toBeInTheDocument();
    });

    it('onConfirm tetap bekerja setelah re-render dengan onConfirm baru', async () => {
        const onConfirm1 = vi.fn();
        const onConfirm2 = vi.fn();

        const { rerender } = render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
                onConfirm: onConfirm1,
            },
        });

        await rerender({
            open: true,
            userName: 'Ani',
            userEmail: 'ani@example.com',
            onConfirm: onConfirm2,
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Reset Password/i });
        await fireEvent.click(confirmBtn);

        expect(onConfirm1).not.toHaveBeenCalled();
        expect(onConfirm2).toHaveBeenCalledTimes(1);
    });

    it('modal punya max-width class max-w-md', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
            },
        });

        const modal = document.querySelector('.max-w-md');
        expect(modal).toBeInTheDocument();
    });

    it('tombol "Ya, Reset Password" punya warna yellow', () => {
        render(ResetPasswordConfirmModal, {
            props: {
                open: true,
                userName: 'Budi',
                userEmail: 'budi@example.com',
            },
        });

        const confirmBtn = screen.getByRole('button', { name: /Ya, Reset Password/i });
        expect(confirmBtn).toHaveClass('bg-yellow-500');
    });
});