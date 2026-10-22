<script lang="ts">
    /**
     * Badge — label status/kategori dengan warna dari design system.
     *
     * Bisa dipakai standalone (kirim `class` hasil dari utils/enums)
     * atau via shortcut variant (kirim `variant` + `value`).
     *
     * @example Standalone
     *   <Badge label="Terkonfirmasi" class={bookingStatusBadge('confirmed')} />
     *
     * @example Shortcut
     *   <Badge variant="booking_status" value="confirmed" />
     */

    import {
        bookingStatusLabel,
        bookingStatusBadge,
        tripStatusLabel,
        tripStatusBadge,
        dailyReportStatusLabel,
        dailyReportStatusBadge,
        payoutStatusLabel,
        payoutStatusBadge,
        packageStatusLabel,
        packageStatusBadge,
        packageKategoriLabel,
        packageKategoriBadge,
        tripMitraRoleLabel,
        tripMitraRoleBadge,
        packageFacilityTipeLabel,
        packageFacilityTipeBadge,
        packageDayCostKategoriLabel,
        packageDayCostKategoriBadge,
    } from '@/utils/enums';

    // ==========================================
    // TYPES
    // ==========================================

    type BadgeVariant =
        | 'booking_status'
        | 'trip_status'
        | 'daily_report_status'
        | 'payout_status'
        | 'package_status'
        | 'package_kategori'
        | 'trip_mitra_role'
        | 'package_facility_tipe'
        | 'package_day_cost_kategori';

    type BadgeSize = 'sm' | 'md';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        label = '',
        class: className = '',
        variant,
        value,
        size = 'md',
        icon = null,
    }: {
        label?: string;
        class?: string;
        variant?: BadgeVariant;
        value?: string;
        size?: BadgeSize;
        icon?: 'check' | 'clock' | 'x' | 'warning' | null;
    } = $props();

    // ==========================================
    // RESOLVE — variant + value → label + class
    // ==========================================

    function resolveFromVariant(
        v: BadgeVariant,
        val: string,
    ): { label: string; className: string } {
        switch (v) {
            case 'booking_status':
                return {
                    label: bookingStatusLabel(val),
                    className: bookingStatusBadge(val),
                };
            case 'trip_status':
                return {
                    label: tripStatusLabel(val),
                    className: tripStatusBadge(val),
                };
            case 'daily_report_status':
                return {
                    label: dailyReportStatusLabel(val),
                    className: dailyReportStatusBadge(val),
                };
            case 'payout_status':
                return {
                    label: payoutStatusLabel(val),
                    className: payoutStatusBadge(val),
                };
            case 'package_status':
                return {
                    label: packageStatusLabel(val),
                    className: packageStatusBadge(val),
                };
            case 'package_kategori':
                return {
                    label: packageKategoriLabel(val),
                    className: packageKategoriBadge(val),
                };
            case 'trip_mitra_role':
                return {
                    label: tripMitraRoleLabel(val),
                    className: tripMitraRoleBadge(val),
                };
            case 'package_facility_tipe':
                return {
                    label: packageFacilityTipeLabel(val),
                    className: packageFacilityTipeBadge(val),
                };
            case 'package_day_cost_kategori':
                return {
                    label: packageDayCostKategoriLabel(val),
                    className: packageDayCostKategoriBadge(val),
                };
        }
    }

    // ==========================================
    // DERIVED
    // ==========================================

    let resolved = $derived.by(() => {
        if (variant && value) {
            const r = resolveFromVariant(variant, value);
            return { label: r.label, className: r.className };
        }
        return { label, className };
    });

    let sizeClass = $derived(
        size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : 'px-3 py-1.5 text-[11px]',
    );

    let iconPath = $derived.by(() => {
        if (icon === 'check')
            return 'M5 13l4 4L19 7';
        if (icon === 'clock')
            return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
        if (icon === 'x')
            return 'M6 18L18 6M6 6l12 12';
        if (icon === 'warning')
            return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
        return null;
    });
</script>

<span
    class={[
        'inline-flex items-center gap-1 rounded-full font-extrabold whitespace-nowrap',
        sizeClass,
        resolved.className,
    ].join(' ')}
>
    {#if iconPath}
        <svg
            class="w-3 h-3 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d={iconPath}
            />
        </svg>
    {/if}
    {resolved.label}
</span>