import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NotificationDropdown from '../NotificationDropdown.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================

const mockInertiaAction = vi.fn();

let mockPageProps: {
    unread_notifications?: number | null;
    auth?: {
        user?: {
            id: number;
            name: string;
            email: string;
            role: string;
        } | null;
    };
} = {
    unread_notifications: 0,
    auth: {
        user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            role: 'mitra',
        },
    },
};

vi.mock('@inertiajs/svelte', () => ({
    inertia: () => ({
        update: (opts: unknown) => mockInertiaAction(opts),
        destroy: () => {},
    }),
    page: {
        get props() {
            return mockPageProps;
        },
        get url() {
            return '/';
        },
        get component() {
            return 'Test';
        },
    },
}));

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    mockInertiaAction.mockClear();
    mockPageProps = {
        unread_notifications: 0,
        auth: {
            user: {
                id: 1,
                name: 'Test User',
                email: 'test@example.com',
                role: 'mitra',
            },
        },
    };
});

afterEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// HELPER
// ============================================================

const getBellLink = () =>
    screen.getByRole('link', { name: /Notifikasi/i });

const getBadge = () => {
    // Selector menggunakan class min-w-[18px] dengan escape bracket
    const badge = document.querySelector('span.min-w-\\[18px\\]');
    return badge as HTMLSpanElement | null;
};

// ============================================================
// KATEGORI 1 — UI CONTRACT
// ============================================================

describe('NotificationDropdown — UI Contract', () => {
    it('menampilkan link dengan aria-label "Notifikasi"', () => {
        render(NotificationDropdown);
        expect(getBellLink()).toBeInTheDocument();
    });

    it('link punya href ke /notifications', () => {
        render(NotificationDropdown);
        expect(getBellLink()).toHaveAttribute('href', '/notifications');
    });

    it('menampilkan icon SVG lonceng', () => {
        render(NotificationDropdown);
        const svg = getBellLink().querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('SVG punya viewBox 0 0 24 24', () => {
        render(NotificationDropdown);
        const svg = getBellLink().querySelector('svg');
        expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });
});

// ============================================================
// KATEGORI 2 — BADGE RENDERING
// ============================================================

describe('NotificationDropdown — Badge Rendering', () => {
    it('TIDAK menampilkan badge kalau unread = 0', () => {
        mockPageProps.unread_notifications = 0;
        render(NotificationDropdown);
        expect(getBadge()).not.toBeInTheDocument();
    });

    it('TIDAK menampilkan badge kalau unread tidak di-set (undefined)', () => {
        mockPageProps.unread_notifications = undefined;
        render(NotificationDropdown);
        expect(getBadge()).not.toBeInTheDocument();
    });

    it('TIDAK menampilkan badge kalau unread = null (fallback ke 0)', () => {
        mockPageProps.unread_notifications = null;
        render(NotificationDropdown);
        expect(getBadge()).not.toBeInTheDocument();
    });

    it('menampilkan badge kalau unread = 1', () => {
        mockPageProps.unread_notifications = 1;
        render(NotificationDropdown);
        expect(getBadge()).toBeInTheDocument();
        expect(getBadge()!.textContent?.trim()).toBe('1');
    });

    it('menampilkan badge kalau unread = 5', () => {
        mockPageProps.unread_notifications = 5;
        render(NotificationDropdown);
        expect(getBadge()!.textContent?.trim()).toBe('5');
    });

    it('menampilkan badge kalau unread = 99', () => {
        mockPageProps.unread_notifications = 99;
        render(NotificationDropdown);
        expect(getBadge()!.textContent?.trim()).toBe('99');
    });

    it('menampilkan "99+" kalau unread = 100', () => {
        mockPageProps.unread_notifications = 100;
        render(NotificationDropdown);
        expect(getBadge()!.textContent?.trim()).toBe('99+');
    });

    it('menampilkan "99+" kalau unread = 150', () => {
        mockPageProps.unread_notifications = 150;
        render(NotificationDropdown);
        expect(getBadge()!.textContent?.trim()).toBe('99+');
    });

    it('menampilkan "99+" kalau unread = 999', () => {
        mockPageProps.unread_notifications = 999;
        render(NotificationDropdown);
        expect(getBadge()!.textContent?.trim()).toBe('99+');
    });
});

// ============================================================
// KATEGORI 3 — BADGE STYLING
// ============================================================

describe('NotificationDropdown — Badge Styling', () => {
    it('badge punya class bg-red-500', () => {
        mockPageProps.unread_notifications = 3;
        render(NotificationDropdown);
        expect(getBadge()!.className).toContain('bg-red-500');
    });

    it('badge posisi absolute top-right', () => {
        mockPageProps.unread_notifications = 3;
        render(NotificationDropdown);
        const badge = getBadge()!;
        expect(badge.className).toContain('absolute');
        expect(badge.className).toContain('-top-0.5');
        expect(badge.className).toContain('-right-0.5');
    });

    it('badge text white', () => {
        mockPageProps.unread_notifications = 3;
        render(NotificationDropdown);
        expect(getBadge()!.className).toContain('text-white');
    });
});

// ============================================================
// KATEGORI 4 — INTERAKSI & A11Y
// ============================================================

describe('NotificationDropdown — Interaction & A11y', () => {
    it('link punya aria-label "Notifikasi"', () => {
        render(NotificationDropdown);
        expect(getBellLink()).toHaveAttribute('aria-label', 'Notifikasi');
    });

    it('link adalah elemen <a> dengan href valid', () => {
        render(NotificationDropdown);
        const link = getBellLink();
        expect(link.tagName).toBe('A');
        expect(link.getAttribute('href')).toBe('/notifications');
    });

    it('link punya accessible name "Notifikasi"', () => {
        render(NotificationDropdown);
        expect(getBellLink()).toHaveAccessibleName('Notifikasi');
    });
});

// ============================================================
// KATEGORI 5 — EDGE CASES
// ============================================================

// ============================================================
// KATEGORI 5 — EDGE CASES
// ============================================================

describe('NotificationDropdown — Edge Cases', () => {
    it('handle unread = 0', () => {
        mockPageProps.unread_notifications = 0;
        render(NotificationDropdown);
        expect(getBadge()).not.toBeInTheDocument();
    });

    it('handle unread negatif (tidak render badge)', () => {
        mockPageProps.unread_notifications = -1;
        render(NotificationDropdown);
        expect(getBadge()).not.toBeInTheDocument();
    });

    it('render ulang dengan unread berbeda tetap konsisten', async () => {
        mockPageProps.unread_notifications = 3;
        const { unmount } = render(NotificationDropdown);

        expect(getBadge()!.textContent?.trim()).toBe('3');

        // Unmount dulu, ubah nilai, lalu mount ulang.
        // Catatan: `rerender({})` tidak memicu reaktivitas `page.props`
        // karena `mockPageProps` adalah objek plain (bukan $state Svelte).
        unmount();
        mockPageProps.unread_notifications = 7;
        render(NotificationDropdown);

        expect(getBadge()!.textContent?.trim()).toBe('7');
    });
});

// ============================================================
// KATEGORI 6 — BVA (Boundary Value Analysis)
// ============================================================

describe('NotificationDropdown — BVA Badge', () => {
    it('unread = 1 → "1"', () => {
        mockPageProps.unread_notifications = 1;
        render(NotificationDropdown);
        expect(getBadge()!.textContent?.trim()).toBe('1');
    });

    it('unread = 99 → "99"', () => {
        mockPageProps.unread_notifications = 99;
        render(NotificationDropdown);
        expect(getBadge()!.textContent?.trim()).toBe('99');
    });

    it('unread = 100 → "99+"', () => {
        mockPageProps.unread_notifications = 100;
        render(NotificationDropdown);
        expect(getBadge()!.textContent?.trim()).toBe('99+');
    });

    it('unread = 101 → "99+"', () => {
        mockPageProps.unread_notifications = 101;
        render(NotificationDropdown);
        expect(getBadge()!.textContent?.trim()).toBe('99+');
    });
});