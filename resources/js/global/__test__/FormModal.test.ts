import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FormModalFixture from './__fixtures__/FormModalFixture.svelte';

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR & OPEN STATE
// ============================================================

describe('FormModal.svelte — Rendering Dasar', () => {
    it('TIDAK merender apa pun jika open = false', () => {
        render(FormModalFixture, {
            props: { open: false, title: 'Tambah Data', onSubmit: vi.fn() },
        });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('merender dialog jika open = true', () => {
        render(FormModalFixture, {
            props: { open: true, title: 'Tambah Data', onSubmit: vi.fn() },
        });

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('menampilkan title yang diberikan', () => {
        render(FormModalFixture, {
            props: { open: true, title: 'Tambah Hari', onSubmit: vi.fn() },
        });

        expect(screen.getByText('Tambah Hari')).toBeInTheDocument();
    });

    it('menampilkan deskripsi jika diberikan', () => {
        render(FormModalFixture, {
            props: {
                open: true,
                title: 'Judul',
                description: 'Deskripsi modal',
                onSubmit: vi.fn(),
            },
        });

        expect(screen.getByText('Deskripsi modal')).toBeInTheDocument();
    });

    it('merender children (konten form)', () => {
        render(FormModalFixture, {
            props: { open: true, title: 'Judul', onSubmit: vi.fn() },
        });

        expect(screen.getByPlaceholderText('Isi form')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — FOOTER DEFAULT (SUBMIT & CANCEL)
// ============================================================

describe('FormModal.svelte — Footer Default', () => {
    it('menampilkan tombol submit dengan label default "Simpan"', () => {
        render(FormModalFixture, {
            props: { open: true, title: 'Judul', onSubmit: vi.fn() },
        });

        expect(
            screen.getByRole('button', { name: /Simpan/i }),
        ).toBeInTheDocument();
    });

    it('menampilkan tombol submit dengan label kustom', () => {
        render(FormModalFixture, {
            props: {
                open: true,
                title: 'Judul',
                submitLabel: 'Tambah',
                onSubmit: vi.fn(),
            },
        });

        expect(
            screen.getByRole('button', { name: /Tambah/i }),
        ).toBeInTheDocument();
    });

    it('menampilkan tombol batal dengan label default "Batal"', () => {
        render(FormModalFixture, {
            props: { open: true, title: 'Judul', onSubmit: vi.fn() },
        });

        expect(
            screen.getByRole('button', { name: /Batal/i }),
        ).toBeInTheDocument();
    });

    it('memanggil onSubmit saat form disubmit', async () => {
        const onSubmit = vi.fn();
        render(FormModalFixture, {
            props: { open: true, title: 'Judul', onSubmit },
        });

        const form = screen
            .getByRole('button', { name: /Simpan/i })
            .closest('form') as HTMLFormElement;
        await fireEvent.submit(form);

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('menonaktifkan tombol submit & batal saat processing = true', () => {
        render(FormModalFixture, {
            props: {
                open: true,
                title: 'Judul',
                processing: true,
                onSubmit: vi.fn(),
            },
        });

        expect(
            screen.getByRole('button', { name: /Menyimpan/i }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', { name: /Batal/i }),
        ).toBeDisabled();
    });
});

// ============================================================
// KATEGORI 3 — CUSTOM FOOTER (SNIPPET)
// ------------------------------------------------------------
// Svelte 5: `footer` adalah Snippet, bukan fungsi JS yang
// return HTMLElement. Wrapper fixture yang men-declare
// {#snippet footer()} di .svelte asli.
// ============================================================

describe('FormModal.svelte — Custom Footer', () => {
    it('merender custom footer jika diberikan', () => {
        render(FormModalFixture, {
            props: {
                open: true,
                title: 'Judul',
                onSubmit: vi.fn(),
                withCustomFooter: true,
            },
        });

        expect(
            screen.getByRole('button', { name: /Aksi Kustom/i }),
        ).toBeInTheDocument();
        // Tombol default tidak dirender
        expect(
            screen.queryByRole('button', { name: /^Simpan$/i }),
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — INTERAKSI PENUTUPAN (ESCAPE & BACKDROP)
// ============================================================

describe('FormModal.svelte — Interaksi Penutupan', () => {
    it('memanggil onCancel dan menutup modal saat klik backdrop', async () => {
        const onCancel = vi.fn();
        render(FormModalFixture, {
            props: { open: true, title: 'Judul', onSubmit: vi.fn(), onCancel },
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        const backdrop = screen.getByRole('button', {
            name: /Tutup modal/i,
        });
        await fireEvent.click(backdrop);

        expect(onCancel).toHaveBeenCalledTimes(1);
        // Svelte 5: verifikasi modal tertutup lewat DOM
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('memanggil onCancel saat tombol "X" (Tutup) diklik', async () => {
        const onCancel = vi.fn();
        render(FormModalFixture, {
            props: { open: true, title: 'Judul', onSubmit: vi.fn(), onCancel },
        });

        const closeBtn = screen.getByRole('button', {
            name: /^Tutup$/i,
        });
        await fireEvent.click(closeBtn);

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('menutup modal saat tombol Escape ditekan', async () => {
        const onCancel = vi.fn();
        render(FormModalFixture, {
            props: { open: true, title: 'Judul', onSubmit: vi.fn(), onCancel },
        });

        await fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('TIDAK menutup modal saat processing = true', async () => {
        const onCancel = vi.fn();
        render(FormModalFixture, {
            props: {
                open: true,
                title: 'Judul',
                processing: true,
                onSubmit: vi.fn(),
                onCancel,
            },
        });

        const backdrop = screen.getByRole('button', {
            name: /Tutup modal/i,
        });
        await fireEvent.click(backdrop);
        await fireEvent.keyDown(window, { key: 'Escape' });

        expect(onCancel).not.toHaveBeenCalled();
    });
});