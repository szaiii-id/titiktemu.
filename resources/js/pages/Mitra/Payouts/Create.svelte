<script lang="ts">
    import DashboardLayout from '@/components/layout/DashboardLayout.svelte';
    import BackButton from '@/global/BackButton.svelte';
    import PageHeader from '@/global/PageHeader.svelte';
    import RupiahInput from '@/global/RupiahInput.svelte';
    import { inertia, router } from '@inertiajs/svelte';
    import type { MitraWallet } from '@/types';
    import { formatCurrency } from '@/utils/formatCurrency';
    import { mitraMenu } from '@/utils/menus';

    // ==========================================
    // PROPS
    // ==========================================

    let {
        wallet,
        minimumPayout = 100000,
    }: {
        wallet: Pick<MitraWallet, 'saldo'>;
        minimumPayout: number;
    } = $props();

    // ==========================================
    // STATE
    // ==========================================

    let form = $state({
        jumlah: 0 as number,
        bank_tujuan: '',
        no_rekening: '',
        nama_pemilik: '',
        catatan: '',
    });
    let errors = $state<Record<string, string>>({});
    let processing = $state(false);

    // ==========================================
    // SUBMIT
    // ==========================================

    function submit(e: SubmitEvent) {
        e.preventDefault();
        errors = {};
        processing = true;

        router.post(
            '/mitra/payouts',
            {
                jumlah: form.jumlah,
                bank_tujuan: form.bank_tujuan,
                no_rekening: form.no_rekening,
                nama_pemilik: form.nama_pemilik,
                catatan: form.catatan || null,
            },
            {
                onError: (err) => {
                    errors = err as Record<string, string>;
                    processing = false;
                },
                onFinish: () => {
                    processing = false;
                },
            },
        );
    }
</script>

<svelte:head
    ><title>Ajukan Pencairan | Titiktemu</title></svelte:head
>

<DashboardLayout title="Ajukan Pencairan" menuItems={mitraMenu}>
    <BackButton
        href="/mitra/payouts"
        label="Kembali ke Pencairan"
    />

    <div class="max-w-xl mx-auto">
        <PageHeader
            title="Ajukan Pencairan"
            description="Tarik saldo wallet Anda ke rekening bank."
        />

        <div
            class="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
        >
            <!-- Saldo Card -->
            <div
                class="p-5 border-b border-gray-100 bg-gradient-to-r from-green-dark to-green text-white"
            >
                <p class="text-xs uppercase tracking-widest opacity-80">
                    Saldo Tersedia
                </p>
                <p class="text-3xl font-extrabold">
                    {formatCurrency(wallet.saldo)}
                </p>
            </div>

            <form onsubmit={submit}>
                <div class="p-5 space-y-4">
                    <RupiahInput
                        label="Jumlah Pencairan"
                        required
                        bind:value={form.jumlah}
                        error={errors.jumlah}
                        hint={`Minimum ${formatCurrency(
                            minimumPayout,
                        )}`}
                    />

                    <div>
                        <label
                            for="bank"
                            class="block text-xs font-bold text-dark mb-1.5"
                        >
                            Bank Tujuan <span class="text-pink">*</span>
                        </label>
                        <input
                            id="bank"
                            type="text"
                            bind:value={form.bank_tujuan}
                            required
                            placeholder="BCA, Mandiri, BNI..."
                            class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none {errors.bank_tujuan
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200 focus:border-pink focus:bg-white'}"
                        />
                        {#if errors.bank_tujuan}
                            <p
                                class="text-pink text-[11px] mt-1 font-bold"
                            >
                                {errors.bank_tujuan}
                            </p>
                        {/if}
                    </div>

                    <div>
                        <label
                            for="norek"
                            class="block text-xs font-bold text-dark mb-1.5"
                        >
                            No Rekening <span class="text-pink">*</span>
                        </label>
                        <input
                            id="norek"
                            type="text"
                            bind:value={form.no_rekening}
                            required
                            class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none {errors.no_rekening
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200 focus:border-pink focus:bg-white'}"
                        />
                        {#if errors.no_rekening}
                            <p
                                class="text-pink text-[11px] mt-1 font-bold"
                            >
                                {errors.no_rekening}
                            </p>
                        {/if}
                    </div>

                    <div>
                        <label
                            for="nama"
                            class="block text-xs font-bold text-dark mb-1.5"
                        >
                            Nama Pemilik Rekening
                            <span class="text-pink">*</span>
                        </label>
                        <input
                            id="nama"
                            type="text"
                            bind:value={form.nama_pemilik}
                            required
                            class="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-sm font-medium focus:outline-none {errors.nama_pemilik
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200 focus:border-pink focus:bg-white'}"
                        />
                        {#if errors.nama_pemilik}
                            <p
                                class="text-pink text-[11px] mt-1 font-bold"
                            >
                                {errors.nama_pemilik}
                            </p>
                        {/if}
                    </div>

                    <div>
                        <label
                            for="catatan"
                            class="block text-xs font-bold text-dark mb-1.5"
                        >
                            Catatan
                            <span class="text-gray-600 font-normal"
                                >(opsional)</span
                            >
                        </label>
                        <textarea
                            id="catatan"
                            bind:value={form.catatan}
                            rows="2"
                            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white resize-none"
                        ></textarea>
                    </div>

                    {#if errors.payout}
                        <div
                            class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700"
                        >
                            {errors.payout}
                        </div>
                    {/if}
                </div>

                <div class="p-4 bg-gray-50/50 flex gap-2">
                    <a
                        href="/mitra/payouts"
                        use:inertia
                        class="px-5 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50"
                    >
                        Batal
                    </a>
                    <button
                        type="submit"
                        disabled={processing}
                        class="flex-1 px-5 py-2.5 rounded-full bg-pink-dark text-white font-bold text-sm hover:bg-sun-dark disabled:opacity-50"
                    >
                        {processing
                            ? 'Mengirim...'
                            : 'Ajukan Pencairan'}
                    </button>
                </div>
            </form>
        </div>
    </div>
</DashboardLayout>