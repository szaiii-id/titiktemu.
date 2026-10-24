<script lang="ts">
    let {
        startDate = $bindable(),
        endDate = $bindable(),
        onApply,
    }: {
        startDate: string;
        endDate: string;
        onApply: () => void;
    } = $props();
</script>

<div class="bg-white rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6">
    <div class="flex flex-col sm:flex-row items-end gap-4">
        <div class="flex-1 w-full sm:w-auto">
            <label
                for="report-filter-start-date"
                class="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5"
            >
                Dari Tanggal
            </label>
            <input
                id="report-filter-start-date"
                type="date"
                bind:value={startDate}
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all"
            />
        </div>
        <div class="flex-1 w-full sm:w-auto">
            <label
                for="report-filter-end-date"
                class="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5"
            >
                Sampai Tanggal
            </label>
            <input
                id="report-filter-end-date"
                type="date"
                bind:value={endDate}
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium focus:outline-none focus:border-pink focus:bg-white transition-all"
            />
        </div>
        <button
            onclick={onApply}
            class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-dark text-white font-bold text-sm hover:bg-gray-800 transition-all shadow-md"
        >
            Terapkan Filter
        </button>
    </div>
</div>