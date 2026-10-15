import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import DashboardLayout from '../DashboardLayout.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================

const mockPost = vi.fn();

let mockPageProps: {
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
    auth: {
        user: {
            id: 1,
            name: 'Budi Santoso',
            username: 'budisantoso',
            email: 'budi@example.com',
            role: 'client',
        },
    },
};

let mockPageUrl = '/client/dashboard';

vi.mock('@inertiajs/svelte', () => ({
    router: {
        post: (...args: unknown[]) => mockPost(...args),
        get: vi.fn(),
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
            return 'DashboardLayout';
        },
    },
    inertia: () => ({
        update: () => {},
        destroy: () => {},
    }),
}));

// ============================================================
// MOCK CHILDREN SNIPPET (Svelte 5)
// ============================================================

const createMockChildren = (content = 'Mock Content') => {
    return createRawSnippet(() => ({
        render: () => `<div data-testid="mock-children">${content}</div>`,
    }));
};

// ============================================================
// HELPER — Render dengan children
// ============================================================

const renderWithChildren = (props: any = {}) => {
    return render(DashboardLayout, {
        props: {
            title: 'Dashboard',
            menuItems: [],
            children: createMockChildren(),
            ...props,
        },
    });
};

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    mockPost.mockClear();
    mockPageUrl = '/client/dashboard';
    mockPageProps = {
        auth: {
            user: {
                id: 1,
                name: 'Budi Santoso',
                username: 'budisantoso',
                email: 'budi@example.com',
                role: 'client',
            },
        },
    };
});

afterEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — UI CONTRACT (Sidebar)
// ============================================================

describe('DashboardLayout.svelte — UI Contract', () => {
    it('menampilkan logo "Titiktemu"', () => {
        renderWithChildren();
        expect(screen.getByText(/Titiktemu/i)).toBeInTheDocument();
    });

    it('logo punya href ke dashboard role', () => {
        renderWithChildren();
        const logoLink = screen.getByRole('link', { name: /Titiktemu/i });
        expect(logoLink).toHaveAttribute('href', '/client/dashboard');
    });

    it('menampilkan title di topbar', () => {
        renderWithChildren({ title: 'Profile Saya' });
        expect(screen.getByRole('heading', { name: 'Profile Saya' })).toBeInTheDocument();
    });

    it('menampilkan tombol logout', () => {
        renderWithChildren();
        expect(
            screen.getByRole('button', { name: /Keluar dari akun/i })
        ).toBeInTheDocument();
    });

    it('menampilkan label "Masuk sebagai" di sidebar', () => {
        renderWithChildren();
        expect(screen.getByText(/Masuk sebagai/i)).toBeInTheDocument();
    });

    it('menampilkan tombol "Tutup menu" untuk mobile', () => {
        renderWithChildren();
        expect(
            screen.getByRole('button', { name: /Tutup menu/i })
        ).toBeInTheDocument();
    });

    it('menampilkan tombol "Buka menu" untuk mobile', () => {
        renderWithChildren();
        expect(
            screen.getByRole('button', { name: /Buka menu/i })
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — MENU RENDERING
// ============================================================

describe('DashboardLayout.svelte — Menu Rendering', () => {
    const menuItems = [
        { label: 'Dashboard', href: '/client/dashboard', icon: 'M3 12l2-2' },
        { label: 'Profile Saya', href: '/client/profile', icon: 'M16 7a4 4 0 11-8 0' },
    ];

    it('menampilkan menu item dari props', () => {
        renderWithChildren({ menuItems });
        expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Profile Saya/i })).toBeInTheDocument();
    });

    it('menu item punya href yang benar', () => {
        renderWithChildren({ menuItems });
        const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
        expect(dashboardLink).toHaveAttribute('href', '/client/dashboard');

        const profileLink = screen.getByRole('link', { name: /Profile Saya/i });
        expect(profileLink).toHaveAttribute('href', '/client/profile');
    });

    it('menu item punya class bg-pink-dark kalau aktif', () => {
        mockPageUrl = '/client/profile';
        renderWithChildren({ menuItems });

        const profileLink = screen.getByRole('link', { name: /Profile Saya/i });
        expect(profileLink).toHaveClass('bg-pink-dark');
    });

    it('menu item aktif punya class text-white', () => {
        mockPageUrl = '/client/profile';
        renderWithChildren({ menuItems });

        const profileLink = screen.getByRole('link', { name: /Profile Saya/i });
        expect(profileLink).toHaveClass('text-white');
    });

    it('menu item TIDAK aktif punya class text-gray-600', () => {
        mockPageUrl = '/client/profile';
        renderWithChildren({ menuItems });

        const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
        expect(dashboardLink).toHaveClass('text-gray-600');
    });

    it('TIDAK menampilkan menu item kalau array kosong', () => {
        renderWithChildren({ menuItems: [] });
        expect(screen.queryByRole('link', { name: /Dashboard/i })).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — USER INFO (Sidebar)
// ============================================================

describe('DashboardLayout.svelte — User Info Sidebar', () => {
    it('menampilkan nama user di sidebar card', () => {
        renderWithChildren();
        const elements = screen.getAllByText('Budi Santoso');
        expect(elements.length).toBeGreaterThan(0);
    });

    it('menampilkan email user di sidebar card', () => {
        renderWithChildren();
        const elements = screen.getAllByText('budi@example.com');
        expect(elements.length).toBeGreaterThan(0);
    });

    it('fallback "User" kalau user.name kosong', () => {
        mockPageProps.auth = {
            user: {
                id: 1,
                name: '',
                username: null,
                email: 'test@example.com',
                role: 'client',
            },
        };
        renderWithChildren();
        expect(screen.getByText(/^User$/)).toBeInTheDocument();
    });

    it('fallback "-" kalau user.email kosong', () => {
        mockPageProps.auth = {
            user: {
                id: 1,
                name: 'Test',
                username: null,
                email: '',
                role: 'client',
            },
        };
        renderWithChildren();
        const dashElements = screen.getAllByText('-');
        expect(dashElements.length).toBeGreaterThan(0);
    });

    it('avatar menampilkan huruf pertama nama', () => {
        renderWithChildren();
        const avatars = screen.getAllByText('B');
        expect(avatars.length).toBeGreaterThan(0);
    });

    it('avatar fallback "?" kalau name kosong', () => {
        mockPageProps.auth = {
            user: {
                id: 1,
                name: '',
                username: null,
                email: 'test@example.com',
                role: 'client',
            },
        };
        renderWithChildren();
        const qMark = screen.getAllByText('?');
        expect(qMark.length).toBeGreaterThan(0);
    });
});

// ============================================================
// KATEGORI 4 — TOPBAR USER INFO
// ============================================================

describe('DashboardLayout.svelte — Topbar User Info', () => {
    it('menampilkan username dengan @ prefix di topbar', () => {
        renderWithChildren();
        expect(screen.getByText(/@budisantoso/i)).toBeInTheDocument();
    });

    it('fallback ke name kalau username null', () => {
        mockPageProps.auth = {
            user: {
                id: 1,
                name: 'Budi Santoso',
                username: null,
                email: 'budi@example.com',
                role: 'client',
            },
        };
        renderWithChildren();
        const elements = screen.getAllByText(/@Budi Santoso/i);
        expect(elements.length).toBeGreaterThan(0);
    });

    it('fallback ke "user" kalau username & name null', () => {
        mockPageProps.auth = {
            user: {
                id: 1,
                name: '',
                username: null,
                email: 'test@example.com',
                role: 'client',
            },
        };
        renderWithChildren();
        const elements = screen.getAllByText(/@user/i);
        expect(elements.length).toBeGreaterThan(0);
    });
});

// ============================================================
// KATEGORI 5 — DASHBOARD URL (Role-based)
// ============================================================

describe('DashboardLayout.svelte — Dashboard URL', () => {
    it('admin → /admin/dashboard', () => {
        mockPageProps.auth = {
            user: {
                id: 1,
                name: 'Admin',
                username: 'admin',
                email: 'admin@example.com',
                role: 'admin',
            },
        };
        renderWithChildren();
        const logoLink = screen.getByRole('link', { name: /Titiktemu/i });
        expect(logoLink).toHaveAttribute('href', '/admin/dashboard');
    });

    it('mitra → /mitra/dashboard', () => {
        mockPageProps.auth = {
            user: {
                id: 1,
                name: 'Mitra',
                username: 'mitra',
                email: 'mitra@example.com',
                role: 'mitra',
            },
        };
        renderWithChildren();
        const logoLink = screen.getByRole('link', { name: /Titiktemu/i });
        expect(logoLink).toHaveAttribute('href', '/mitra/dashboard');
    });

    it('client → /client/dashboard', () => {
        renderWithChildren();
        const logoLink = screen.getByRole('link', { name: /Titiktemu/i });
        expect(logoLink).toHaveAttribute('href', '/client/dashboard');
    });

    it('role tidak dikenal → /client/dashboard (default)', () => {
        mockPageProps.auth = {
            user: {
                id: 1,
                name: 'Unknown',
                username: 'unknown',
                email: 'unknown@example.com',
                role: 'superadmin',
            },
        };
        renderWithChildren();
        const logoLink = screen.getByRole('link', { name: /Titiktemu/i });
        expect(logoLink).toHaveAttribute('href', '/client/dashboard');
    });
});

// ============================================================
// KATEGORI 6 — SIDEBAR TOGGLE (Mobile)
// ============================================================

describe('DashboardLayout.svelte — Sidebar Toggle', () => {
    it('sidebar tertutup secara default (class -translate-x-[120%])', () => {
        renderWithChildren();
        const aside = document.querySelector('aside');
        expect(aside?.className).toContain('-translate-x-[120%]');
    });

    it('klik "Buka menu" membuka sidebar', async () => {
        renderWithChildren();

        const openBtn = screen.getByRole('button', { name: /Buka menu/i });
        await fireEvent.click(openBtn);

        const aside = document.querySelector('aside');
        expect(aside?.className).toContain('translate-x-0');
        expect(aside?.className).not.toContain('-translate-x-[120%]');
    });

    it('klik "Tutup menu" menutup sidebar', async () => {
        renderWithChildren();

        const openBtn = screen.getByRole('button', { name: /Buka menu/i });
        await fireEvent.click(openBtn);

        const closeBtn = screen.getByRole('button', { name: /Tutup menu/i });
        await fireEvent.click(closeBtn);

        const aside = document.querySelector('aside');
        expect(aside?.className).toContain('-translate-x-[120%]');
    });

    it('overlay muncul saat sidebar terbuka', async () => {
        renderWithChildren();

        expect(screen.queryByLabelText(/Tutup sidebar/i)).not.toBeInTheDocument();

        const openBtn = screen.getByRole('button', { name: /Buka menu/i });
        await fireEvent.click(openBtn);

        expect(screen.getByLabelText(/Tutup sidebar/i)).toBeInTheDocument();
    });

    it('klik overlay menutup sidebar', async () => {
        renderWithChildren();

        const openBtn = screen.getByRole('button', { name: /Buka menu/i });
        await fireEvent.click(openBtn);

        const overlay = screen.getByLabelText(/Tutup sidebar/i);
        await fireEvent.click(overlay);

        const aside = document.querySelector('aside');
        expect(aside?.className).toContain('-translate-x-[120%]');
    });
});

// ============================================================
// KATEGORI 7 — LOGOUT BEHAVIOR
// ============================================================

describe('DashboardLayout.svelte — Logout', () => {
    it('klik tombol logout memanggil router.post("/logout")', async () => {
        renderWithChildren();

        const logoutBtn = screen.getByRole('button', { name: /Keluar dari akun/i });
        await fireEvent.click(logoutBtn);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).toHaveBeenCalledWith(
            '/logout',
            {},
            expect.objectContaining({
                onFinish: expect.any(Function),
            }),
        );
    });

    it('tombol logout disabled saat processing', async () => {
        renderWithChildren();

        const logoutBtn = screen.getByRole('button', { name: /Keluar dari akun/i });
        await fireEvent.click(logoutBtn);

        await waitFor(() => {
            const processingBtn = screen.getByRole('button', { name: /Keluar/i });
            expect(processingBtn).toBeDisabled();
        });
    });

    it('tombol logout menampilkan "Keluar..." saat processing', async () => {
        renderWithChildren();

        const logoutBtn = screen.getByRole('button', { name: /Keluar dari akun/i });
        await fireEvent.click(logoutBtn);

        await waitFor(() => {
            expect(screen.getByText(/Keluar\.\.\./i)).toBeInTheDocument();
        });
    });

    it('setelah onFinish, tombol logout enabled kembali', async () => {
        renderWithChildren();

        const logoutBtn = screen.getByRole('button', { name: /Keluar dari akun/i });
        await fireEvent.click(logoutBtn);

        const [, , options] = mockPost.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            const btn = screen.getByRole('button', { name: /Keluar/i });
            expect(btn).not.toBeDisabled();
        });
    });
});

// ============================================================
// KATEGORI 8 — ACCESSIBILITY
// ============================================================

describe('DashboardLayout.svelte — Accessibility', () => {
    it('tombol "Buka menu" punya aria-label', () => {
        renderWithChildren();
        expect(screen.getByLabelText(/Buka menu/i)).toBeInTheDocument();
    });

    it('tombol "Tutup menu" punya aria-label', () => {
        renderWithChildren();
        expect(screen.getByLabelText(/Tutup menu/i)).toBeInTheDocument();
    });

    it('tombol logout punya aria-label', () => {
        renderWithChildren();
        expect(screen.getByLabelText(/Keluar dari akun/i)).toBeInTheDocument();
    });

    it('overlay punya type="button" dan aria-label', async () => {
        renderWithChildren();

        const openBtn = screen.getByRole('button', { name: /Buka menu/i });
        await fireEvent.click(openBtn);

        const overlay = screen.getByLabelText(/Tutup sidebar/i);

        // ✅ FIX: <button> semantic — cek type="button" (bukan role="button")
        expect(overlay).toHaveAttribute('type', 'button');
        expect(overlay).toHaveAttribute('aria-label', 'Tutup sidebar');

        // Bonus: cek tag name = BUTTON (bukan DIV)
        expect(overlay.tagName).toBe('BUTTON');
    });
});

// ============================================================
// KATEGORI 9 — CHILDREN RENDERING
// ============================================================

describe('DashboardLayout.svelte — Children Rendering', () => {
    it('main area punya class flex-1 min-w-0', () => {
        renderWithChildren();
        const main = document.querySelector('main');
        expect(main).toHaveClass('flex-1', 'min-w-0');
    });

    it('layout punya class min-h-screen', () => {
        renderWithChildren();
        const wrapper = document.querySelector('.min-h-screen');
        expect(wrapper).toBeInTheDocument();
    });

    it('main area punya class relative z-10', () => {
        renderWithChildren();
        const mainWrapper = document.querySelector('.relative.z-10');
        expect(mainWrapper).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 10 — STICKY HEADER
// ============================================================

describe('DashboardLayout.svelte — Sticky Header', () => {
    it('header punya class sticky', () => {
        renderWithChildren();
        const header = document.querySelector('header');
        expect(header).toHaveClass('sticky');
    });

    it('header punya class top-3 lg:top-6', () => {
        renderWithChildren();
        const header = document.querySelector('header');
        expect(header?.className).toContain('top-3');
        expect(header?.className).toContain('lg:top-6');
    });

    it('header punya class z-20', () => {
        renderWithChildren();
        const header = document.querySelector('header');
        expect(header).toHaveClass('z-20');
    });
});

// ============================================================
// KATEGORI 11 — EDGE CASES
// ============================================================

describe('DashboardLayout.svelte — Edge Cases', () => {
    it('handle user undefined (auth.user = null)', () => {
        mockPageProps.auth = { user: null };
        renderWithChildren();

        const elements = screen.getAllByText(/^User$/);
        expect(elements.length).toBeGreaterThan(0);
    });

    it('handle title kosong', () => {
        renderWithChildren({ title: '' });
        const heading = document.querySelector('h1');
        expect(heading?.textContent?.trim()).toBe('');
    });

    it('handle menuItems dengan 1 item', () => {
        renderWithChildren({
            menuItems: [{ label: 'Dashboard', href: '/client/dashboard' }],
        });
        expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    });

    it('handle menuItems dengan banyak item', () => {
        renderWithChildren({
            menuItems: [
                { label: 'Menu 1', href: '/1' },
                { label: 'Menu 2', href: '/2' },
                { label: 'Menu 3', href: '/3' },
                { label: 'Menu 4', href: '/4' },
                { label: 'Menu 5', href: '/5' },
            ],
        });

        expect(screen.getByRole('link', { name: /Menu 1/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Menu 5/i })).toBeInTheDocument();
    });

    it('handle menu item tanpa icon', () => {
        renderWithChildren({
            menuItems: [{ label: 'No Icon', href: '/no-icon' }],
        });
        expect(screen.getByRole('link', { name: /No Icon/i })).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 12 — ACTIVE STATE (isActive)
// ============================================================

describe('DashboardLayout.svelte — isActive()', () => {
    const menuItems = [
        { label: 'Dashboard', href: '/client/dashboard' },
        { label: 'Profile', href: '/client/profile' },
        { label: 'Password', href: '/client/password' },
    ];

    it('menu aktif saat URL dimulai dengan href', () => {
        mockPageUrl = '/client/dashboard';
        renderWithChildren({ menuItems });

        const dashLink = screen.getByRole('link', { name: /Dashboard/i });
        expect(dashLink).toHaveClass('bg-pink-dark');
    });

    it('menu dengan URL nested tetap dianggap aktif', () => {
        mockPageUrl = '/client/dashboard/sub-page';
        renderWithChildren({ menuItems });

        const dashLink = screen.getByRole('link', { name: /Dashboard/i });
        expect(dashLink).toHaveClass('bg-pink-dark');
    });

    it('menu TIDAK aktif saat URL berbeda', () => {
        mockPageUrl = '/client/dashboard';
        renderWithChildren({ menuItems });

        const profileLink = screen.getByRole('link', { name: /Profile/i });
        expect(profileLink).not.toHaveClass('bg-pink-dark');
    });

    it('hanya 1 menu yang aktif pada satu waktu', () => {
        mockPageUrl = '/client/profile';
        renderWithChildren({ menuItems });

        const activeLinks = document.querySelectorAll('a.bg-pink-dark');
        expect(activeLinks.length).toBe(1);
    });
});