import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import NotificationsIndex from '../Index.svelte';

// ============================================================
// MOCK INERTIA — lengkap dengan page.props
// ============================================================
const mockRouterPost = vi.fn();

let mockPageProps: any = {
    auth: {
        user: {
            id: 1,
            name: 'Admin Test',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
        },
    },
    unread_notifications: 0,
    flash: {},
};

vi.mock('@inertiajs/svelte', () => ({
    router: {
        post: (...args: any[]) => mockRouterPost(...args),
    },
    inertia: () => ({
        update: vi.fn(),
        destroy: vi.fn(),
    }),
    page: {
        get props() {
            return mockPageProps;
        },
        get url() {
            return '/notifications';
        },
        get component() {
            return 'Notifications/Index';
        },
    },
}));

// ============================================================
// MOCK UTILS
// ============================================================
vi.mock('@/utils/formatDate', () => ({
    formatDateTime: (d: string) => `TglWaktu: ${d}`,
}));

// ============================================================
// HELPERS
// ============================================================

const createPaginator = (data: any[] = []): any => ({
    data,
    current_page: 1,
    last_page: 1,
    total: data.length,
    from: data.length > 0 ? 1 : 0,
    to: data.length,
    links: [],
    path: '',
    per_page: 10,
    first_page_url: '',
    last_page_url: '',
    next_page_url: null,
    prev_page_url: null,
});

const createNotification = (overrides: any = {}): any => ({
    id: 'uuid-123',
    tipe: 'info',
    judul: 'Notifikasi Test',
    pesan: 'Pesan notifikasi test',
    data: {},
    read_at: null,
    created_at: '2026-04-01T10:00:00Z',
    ...overrides,
});

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
    mockPageProps = {
        auth: {
            user: {
                id: 1,
                name: 'Admin Test',
                username: 'admin',
                email: 'admin@example.com',
                role: 'admin',
            },
        },
        unread_notifications: 0,
        flash: {},
    };
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR
// ============================================================

describe('Notifications Index — Rendering', () => {
    it('merender header dan jumlah belum dibaca', () => {
        render(NotificationsIndex, {
            props: {
                notifications: createPaginator([createNotification()]),
                unreadCount: 1,
            },
        });

        // CATATAN: ada DUA <h1> "Notifikasi" di DOM:
        //   1. Dari DashboardLayout (judul top bar mobile)
        //   2. Dari halaman Index (heading utama halaman)
        // Gunakan getAllByRole dan pastikan heading halaman (text-2xl) ada.
        const headings = screen.getAllByRole('heading', {
            level: 1,
            name: 'Notifikasi',
        });
        expect(headings).toHaveLength(2);

        const pageHeading = headings.find((h) =>
            h.className.includes('text-2xl')
        );
        expect(pageHeading).toBeInTheDocument();

        // "1 belum dibaca" — teks gabungan `{unreadCount} belum dibaca`
        const unreadText = screen.getByText((_content, element) => {
            const text = element?.textContent ?? '';
            return (
                element?.tagName === 'P' &&
                text.includes('1') &&
                text.includes('belum dibaca')
            );
        });
        expect(unreadText).toBeInTheDocument();
    });

    it('merender daftar notifikasi', () => {
        render(NotificationsIndex, {
            props: {
                notifications: createPaginator([createNotification()]),
                unreadCount: 1,
            },
        });

        expect(screen.getByText('Notifikasi Test')).toBeInTheDocument();
        expect(
            screen.getByText('Pesan notifikasi test')
        ).toBeInTheDocument();
        expect(
            screen.getByText('TglWaktu: 2026-04-01T10:00:00Z')
        ).toBeInTheDocument();
    });

    it('merender dot indicator untuk notifikasi belum dibaca', () => {
        render(NotificationsIndex, {
            props: {
                notifications: createPaginator([
                    createNotification({ read_at: null }),
                    createNotification({
                        id: 'uuid-2',
                        read_at: '2026-04-01T10:00:00Z',
                    }),
                ]),
                unreadCount: 1,
            },
        });

        const dots = screen.getAllByLabelText('Belum dibaca');
        expect(dots).toHaveLength(1);
    });
});

// ============================================================
// KATEGORI 2 — TOMBOL TANDAI SEMUA DIBACA
// ============================================================

describe('Notifications Index — Tandai Semua', () => {
    it('merender tombol "Tandai Semua Dibaca" jika unreadCount > 0', () => {
        render(NotificationsIndex, {
            props: {
                notifications: createPaginator([createNotification()]),
                unreadCount: 5,
            },
        });

        expect(
            screen.getByRole('button', {
                name: /Tandai Semua Dibaca/i,
            })
        ).toBeInTheDocument();
    });

    it('TIDAK merender tombol jika unreadCount = 0', () => {
        render(NotificationsIndex, {
            props: {
                notifications: createPaginator([
                    createNotification({
                        read_at: '2026-04-01T10:00:00Z',
                    }),
                ]),
                unreadCount: 0,
            },
        });

        expect(
            screen.queryByRole('button', {
                name: /Tandai Semua Dibaca/i,
            })
        ).not.toBeInTheDocument();
    });

    it('memanggil router.post saat tombol "Tandai Semua Dibaca" diklik', async () => {
        render(NotificationsIndex, {
            props: {
                notifications: createPaginator([createNotification()]),
                unreadCount: 1,
            },
        });

        const btn = screen.getByRole('button', {
            name: /Tandai Semua Dibaca/i,
        });
        await fireEvent.click(btn);

        expect(mockRouterPost).toHaveBeenCalledWith(
            '/notifications/mark-all-read',
            {},
            { preserveScroll: true }
        );
    });
});

// ============================================================
// KATEGORI 3 — AKSI MARK AS READ
// ============================================================

describe('Notifications Index — Mark As Read', () => {
    it('memanggil router.post saat item notifikasi diklik', async () => {
        render(NotificationsIndex, {
            props: {
                notifications: createPaginator([createNotification()]),
                unreadCount: 1,
            },
        });

        // Tombol item notifikasi — accessible name-nya gabungan judul + pesan + tanggal
        // Gunakan selector spesifik: button yang mengandung "Notifikasi Test"
        const item = screen.getByRole('button', {
            name: /Notifikasi Test/i,
        });
        await fireEvent.click(item);

        expect(mockRouterPost).toHaveBeenCalledWith(
            '/notifications/uuid-123/read',
            {},
            { preserveScroll: true }
        );
    });
});

// ============================================================
// KATEGORI 4 — EMPTY STATE
// ============================================================

describe('Notifications Index — Empty State', () => {
    it('merender pesan kosong jika tidak ada notifikasi', () => {
        render(NotificationsIndex, {
            props: {
                notifications: createPaginator([]),
                unreadCount: 0,
            },
        });

        // EmptyState asli merender teks langsung
        expect(
            screen.getByText('Belum ada notifikasi')
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Notifikasi akan muncul di sini/i)
        ).toBeInTheDocument();
    });
});