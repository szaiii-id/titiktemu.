<script lang="ts">
    let { pdfUrl, excelUrl }: { pdfUrl: string; excelUrl: string } = $props();
</script>

<div class="flex gap-2">
    <a 
        href={pdfUrl} 
        target="_blank" 
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 text-dark font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
    >
        <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        PDF
    </a>
    <a 
        href={excelUrl} 
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-green-700 text-white font-bold text-sm hover:bg-green-800 transition-all shadow-sm"
    >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        Excel
    </a>
</div>