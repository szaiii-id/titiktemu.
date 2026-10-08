<script>
    // Svelte 5: Menangkap konten anak
    let { children } = $props();
</script>

<!-- Cangkang dasar: Memastikan layar penuh, font sesuai, dan tidak ada overflow (geser samping) -->
<div class="min-h-screen bg-white text-dark font-sans selection:bg-pink selection:text-white w-full overflow-x-hidden flex flex-col">
    {@render children()}
</div>