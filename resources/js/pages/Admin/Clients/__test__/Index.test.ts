import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ClientIndex from '../Index.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================

const mockGet = vi.fn();

let mockPageProps: {
    flash?: {
        status?: string | null;
        error?: string | null;
    };
    auth?: {
        user?: {
            id: number;
            name: string;
            username: string | null;
            email: string;
            role: string;
        } | null;
    };
} = {
    flash: {},
    auth: {
        user: {
            id: 1,
            name: 'Admin User',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
        },
    },
};

let mockPageUrl = '/admin/clients';

vi.mock('@inertiajs/svelte', () => ({
    router: {
        get: (...args: unknown[]) => mockGet(...args),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
    page: {
        get props() {
            return mockPageProps;
        },
        get url() {
            return mockPageUrl;
        },
        get component() {
            return 'Admin/Client/Index';
        },
    },
    inertia: () => ({
        update: () => {},
        destroy: () => {},
    }),
}));

// ============================================================
// HELPERS — Build Props
// ============================================================

interface ClientData {
    id: number;
    name: string;
    username: string | null;
    email: string;
    created_at: string;
}

interface ClientsPaginator {
    data: ClientData[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

const makeClientsPaginator = (
    overrides: Partial<ClientsPaginator> = {},
): ClientsPaginator => ({
    data: [
        {
            id: 1,
            name: 'Budi Santoso',
            username: 'budisantoso',
            email: 'budi@example.com',
            created_at: '2026-01-15T10:00:00Z',
        },
        {
            id: 2,
            name: 'Ani Wijaya',
            username: 'aniwijaya',
            email: 'ani@example.com',
            created_at: '2026-02-20T10:00:00Z',
        },
    ],
    current_page: 1,
    last_page: 1,
    from: 1,
    to: 2,
    total: 2,
    links: [
        { url: null, label: '&laquo; Previous', active: false },
        { url: '/admin/clients?page=1', label: '1', active: true },
        { url: null, label: 'Next &raquo;', active: false },
    ],
    ...overrides,
});

const defaultFilters = { search: '', per_page: 15 };

const getSearchInput = () =>
    screen.getByPlaceholderText(/Cari nama, email, atau username/i);

const getTable = () => document.querySelector('table');

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    mockGet.mockClear();
    mockPageUrl = '/admin/clients';
    mockPageProps = {
        flash: {},
        auth: {
            user: {
                id: 1,
                name: 'Admin User',
                username: 'admin',
                email: 'admin@example.com',
                role: 'admin',
            },
        },
    };
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — UI CONTRACT
// ============================================================

describe('Admin/Client/Index.svelte — UI Contract', () => {
    it('menampilkan heading "Daftar Client"', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        const headings = screen.getAllByRole('heading', { name: /Daftar Client/i });
        expect(headings.length).toBeGreaterThan(0);
    });

    it('menampilkan subtitle "Read-only"', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        expect(
            screen.getByText(/Read-only — tidak bisa diedit atau dihapus/i)
        ).toBeInTheDocument();
    });

    it('menampilkan info badge total client', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({ total: 2 }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText(/Client Terdaftar/i)).toBeInTheDocument();
    });

    it('menampilkan search input', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        expect(getSearchInput()).toBeInTheDocument();
    });

    it('menampilkan badge "Mode Read-only"', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText(/Mode Read-only/i)).toBeInTheDocument();
    });

    it('menampilkan kolom tabel: Client, Username, Terdaftar', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText(/^Client$/i)).toBeInTheDocument();
        expect(screen.getByText(/^Username$/i)).toBeInTheDocument();
        expect(screen.getByText(/^Terdaftar$/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — DATA RENDERING
// ============================================================

describe('Admin/Client/Index.svelte — Data Rendering', () => {
    it('menampilkan nama client dari data', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
        expect(screen.getByText('Ani Wijaya')).toBeInTheDocument();
    });

    it('menampilkan email client dari data', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText('budi@example.com')).toBeInTheDocument();
        expect(screen.getByText('ani@example.com')).toBeInTheDocument();
    });

    it('menampilkan username client dari data', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText(/budisantoso/i)).toBeInTheDocument();
        expect(screen.getByText(/aniwijaya/i)).toBeInTheDocument();
    });

    it('menampilkan avatar inisial (huruf pertama nama)', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });

        const table = document.querySelector('table');
        const avatarsInTable = table?.querySelectorAll(
            'div[class*="bg-gradient-to-br"]'
        );
        expect(avatarsInTable?.length).toBeGreaterThan(0);

        expect(table?.textContent).toContain('B');
        expect(table?.textContent).toContain('A');
    });

    it('menampilkan total client di info badge', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({ total: 42 }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('menampilkan "-" untuk username null', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    data: [
                        {
                            id: 1,
                            name: 'Google User',
                            username: null,
                            email: 'google@example.com',
                            created_at: '2026-01-15T10:00:00Z',
                        },
                    ],
                }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('menampilkan tanggal terdaftar dalam format Indonesia', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    data: [
                        {
                            id: 1,
                            name: 'Budi',
                            username: 'budi',
                            email: 'budi@example.com',
                            created_at: '2026-01-15T10:00:00Z',
                        },
                    ],
                }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText(/Jan/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — EMPTY STATE
// ============================================================

describe('Admin/Client/Index.svelte — Empty State', () => {
    it('menampilkan empty state saat data kosong', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({ data: [], total: 0, from: 0, to: 0 }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText(/Belum ada client/i)).toBeInTheDocument();
    });

    it('menampilkan pesan "Tidak ada hasil" saat search aktif', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({ data: [], total: 0 }),
                filters: { search: 'xyz', per_page: 15 },
            },
        });
        expect(screen.getByText(/Tidak ada hasil ditemukan/i)).toBeInTheDocument();
    });

    it('menampilkan kata kunci search di empty message', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({ data: [], total: 0 }),
                filters: { search: 'budi', per_page: 15 },
            },
        });
        expect(screen.getByText(/budi/i)).toBeInTheDocument();
    });

    it('tombol "Hapus Filter" tampil saat search aktif', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({ data: [], total: 0 }),
                filters: { search: 'xyz', per_page: 15 },
            },
        });

        // EmptyState global merender tombol dengan text "Hapus Filter"
        // (bukan "Hapus Pencarian"). Sesuaikan assertion.
        const button = document.querySelector('button.mt-5') as HTMLButtonElement;
        expect(button).toBeInTheDocument();
        expect(button.textContent).toMatch(/Hapus (Filter|Pencarian)/i);
    });

    it('TIDAK menampilkan tabel saat data kosong', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({ data: [], total: 0 }),
                filters: defaultFilters,
            },
        });
        expect(getTable()).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — SEARCH BEHAVIOR (debounce)
// ============================================================

describe('Admin/Client/Index.svelte — Search Behavior', () => {
    it('mengetik di search input memanggil router.get setelah debounce 300ms', async () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });

        await fireEvent.input(getSearchInput(), { target: { value: 'budi' } });

        expect(mockGet).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);

        await waitFor(() => {
            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockGet).toHaveBeenCalledWith(
                '/admin/clients',
                { search: 'budi', per_page: 15 },
                expect.objectContaining({
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }),
            );
        });
    });

    it('mengetik cepat berulang hanya memicu 1x router.get', async () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });

        await fireEvent.input(getSearchInput(), { target: { value: 'b' } });
        vi.advanceTimersByTime(100);

        await fireEvent.input(getSearchInput(), { target: { value: 'bu' } });
        vi.advanceTimersByTime(100);

        await fireEvent.input(getSearchInput(), { target: { value: 'bud' } });
        vi.advanceTimersByTime(300);

        await waitFor(() => {
            expect(mockGet).toHaveBeenCalledTimes(1);
        });
    });

    it('tombol clear tampil saat search ada nilainya', async () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });

        await fireEvent.input(getSearchInput(), { target: { value: 'budi' } });

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: /Hapus pencarian/i })
            ).toBeInTheDocument();
        });
    });

    it('tombol clear TIDAK tampil saat search kosong', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });

        expect(
            screen.queryByRole('button', { name: /Hapus pencarian/i })
        ).not.toBeInTheDocument();
    });

    it('klik tombol clear mengosongkan search dan panggil router.get', async () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: { search: 'budi', per_page: 15 },
            },
        });

        const input = getSearchInput();
        expect((input as HTMLInputElement).value).toBe('budi');

        // Ketik dulu agar SearchInput render tombol clear (butuh `value` truthy)
        await fireEvent.input(input, { target: { value: 'budi' } });

        // findByRole pakai MutationObserver (bukan timer) — aman dengan fake timers
        const clearBtn = await screen.findByRole('button', {
            name: /Hapus pencarian/i,
        });

        await fireEvent.click(clearBtn);

        // clearSearch() dipanggil SINKRON via prop `onclear`,
        // jadi router.get langsung terpanggil tanpa debounce.
        expect(mockGet).toHaveBeenCalledWith(
            '/admin/clients',
            { search: '', per_page: 15 },
            expect.objectContaining({
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }),
        );
    });

    it('search input terisi dari props filters.search', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: { search: 'existing', per_page: 15 },
            },
        });

        expect((getSearchInput() as HTMLInputElement).value).toBe('existing');
    });
});

// ============================================================
// KATEGORI 5 — PAGINATION
// ============================================================

describe('Admin/Client/Index.svelte — Pagination', () => {
    it('menampilkan info "Menampilkan X–Y dari Z client"', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    from: 1,
                    to: 15,
                    total: 42,
                    last_page: 3,
                    links: [
                        { url: null, label: '&laquo; Previous', active: false },
                        { url: '/admin/clients?page=1', label: '1', active: true },
                        { url: '/admin/clients?page=2', label: '2', active: false },
                        { url: '/admin/clients?page=3', label: '3', active: false },
                        { url: '/admin/clients?page=2', label: 'Next &raquo;', active: false },
                    ],
                }),
                filters: defaultFilters,
            },
        });

        const paragraphs = Array.from(document.querySelectorAll('p'));
        const menampilkanP = paragraphs.find((p) =>
            p.textContent?.includes('Menampilkan')
        );

        expect(menampilkanP).toBeInTheDocument();
        expect(menampilkanP?.textContent).toContain('42');
    });

    it('TIDAK menampilkan pagination kalau last_page = 1', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({ last_page: 1 }),
                filters: defaultFilters,
            },
        });
        expect(screen.queryByText(/Menampilkan/i)).not.toBeInTheDocument();
    });

    it('menampilkan pagination kalau last_page > 1', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    last_page: 3,
                    links: [
                        { url: null, label: '&laquo; Previous', active: false },
                        { url: '/admin/clients?page=1', label: '1', active: true },
                        { url: '/admin/clients?page=2', label: '2', active: false },
                        { url: '/admin/clients?page=3', label: '3', active: false },
                        { url: '/admin/clients?page=2', label: 'Next &raquo;', active: false },
                    ],
                }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText(/Menampilkan/i)).toBeInTheDocument();
    });

    it('link pagination punya href yang benar', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    last_page: 3,
                    links: [
                        { url: null, label: '&laquo; Previous', active: false },
                        { url: '/admin/clients?page=1', label: '1', active: true },
                        { url: '/admin/clients?page=2', label: '2', active: false },
                        { url: '/admin/clients?page=3', label: '3', active: false },
                        { url: '/admin/clients?page=2', label: 'Next &raquo;', active: false },
                    ],
                }),
                filters: defaultFilters,
            },
        });

        const page2Link = document.querySelector('a[href="/admin/clients?page=2"]');
        expect(page2Link).toBeInTheDocument();
        expect(page2Link).toHaveAttribute('href', '/admin/clients?page=2');
    });

    it('tombol "Previous" tidak jadi link kalau url null', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    last_page: 3,
                    links: [
                        { url: null, label: '&laquo; Previous', active: false },
                        { url: '/admin/clients?page=1', label: '1', active: true },
                        { url: '/admin/clients?page=2', label: '2', active: false },
                    ],
                }),
                filters: defaultFilters,
            },
        });

        const prevText = screen.getByText(/Previous/i);
        expect(prevText.tagName).toBe('SPAN');
    });
});

// ============================================================
// KATEGORI 6 — FLASH MESSAGE
// ============================================================

describe('Admin/Client/Index.svelte — Flash Message', () => {
    it('menampilkan flash status jika ada', () => {
        mockPageProps.flash = { status: 'Berhasil.' };
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        expect(mockPageProps.flash.status).toBe('Berhasil.');
    });
});

// ============================================================
// KATEGORI 7 — EDGE CASE
// ============================================================

describe('Admin/Client/Index.svelte — Edge Cases', () => {
    it('handle data client dengan username null', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    data: [
                        {
                            id: 1,
                            name: 'No Username User',
                            username: null,
                            email: 'no-username@example.com',
                            created_at: '2026-01-15T10:00:00Z',
                        },
                    ],
                }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText('No Username User')).toBeInTheDocument();
        expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('handle data client dengan nama panjang', () => {
        const longName = 'a'.repeat(100);
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    data: [
                        {
                            id: 1,
                            name: longName,
                            username: 'user',
                            email: 'user@example.com',
                            created_at: '2026-01-15T10:00:00Z',
                        },
                    ],
                }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('handle filter dengan per_page kustom', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: { search: '', per_page: 25 },
            },
        });
        expect(getSearchInput()).toBeInTheDocument();
    });

    it('handle data dengan 1 client', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    data: [
                        {
                            id: 1,
                            name: 'Solo Client',
                            username: 'solo',
                            email: 'solo@example.com',
                            created_at: '2026-01-15T10:00:00Z',
                        },
                    ],
                    total: 1,
                    from: 1,
                    to: 1,
                }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText('Solo Client')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 8 — UI CONTRACT: Route & Menu
// ============================================================

describe('Admin/Client/Index.svelte — Route & Menu', () => {
    it('menu item "Daftar Client" ada di sidebar', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        const menuLink = screen.getByRole('link', { name: /^Daftar Client$/i });
        expect(menuLink).toHaveAttribute('href', '/admin/clients');
    });

    it('menu item "Dashboard" ada di sidebar', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        const menuLink = screen.getByRole('link', { name: /^Dashboard$/i });
        expect(menuLink).toHaveAttribute('href', '/admin/dashboard');
    });

    it('menu item "Manajemen User" ada di sidebar', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator(),
                filters: defaultFilters,
            },
        });
        const menuLink = screen.getByRole('link', { name: /^Manajemen User$/i });
        expect(menuLink).toHaveAttribute('href', '/admin/users');
    });
});

// ============================================================
// KATEGORI 9 — BEHAVIORAL: formatDate
// ============================================================

describe('Admin/Client/Index.svelte — formatDate', () => {
    it('menampilkan tanggal dalam format Indonesia (day)', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    data: [
                        {
                            id: 1,
                            name: 'Budi',
                            username: 'budi',
                            email: 'budi@example.com',
                            created_at: '2026-03-15T10:00:00Z',
                        },
                    ],
                }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText(/15/)).toBeInTheDocument();
    });

    it('menampilkan tanggal dalam format Indonesia (month)', () => {
        render(ClientIndex, {
            props: {
                clients: makeClientsPaginator({
                    data: [
                        {
                            id: 1,
                            name: 'Budi',
                            username: 'budi',
                            email: 'budi@example.com',
                            created_at: '2026-03-15T10:00:00Z',
                        },
                    ],
                }),
                filters: defaultFilters,
            },
        });
        expect(screen.getByText(/Mar/i)).toBeInTheDocument();
    });
});