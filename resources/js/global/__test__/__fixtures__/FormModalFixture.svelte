<script lang="ts">
    import FormModal from '@/global/FormModal.svelte';

    let {
        open = true,
        title = 'Judul',
        description = '',
        processing = false,
        submitLabel = 'Simpan',
        cancelLabel = 'Batal',
        onCancel = undefined,
        onSubmit = () => {},
        withCustomFooter = false,
    }: {
        open?: boolean;
        title?: string;
        description?: string;
        processing?: boolean;
        submitLabel?: string;
        cancelLabel?: string;
        onCancel?: (() => void) | undefined;
        onSubmit?: () => void;
        withCustomFooter?: boolean;
    } = $props();
</script>

{#if withCustomFooter}
    <FormModal
        {open}
        {title}
        {description}
        {processing}
        {submitLabel}
        {cancelLabel}
        {onCancel}
        {onSubmit}
    >
        {#snippet footer()}
            <button type="button">Aksi Kustom</button>
        {/snippet}
        <input type="text" placeholder="Isi form" />
    </FormModal>
{:else}
    <FormModal
        {open}
        {title}
        {description}
        {processing}
        {submitLabel}
        {cancelLabel}
        {onCancel}
        {onSubmit}
    >
        <input type="text" placeholder="Isi form" />
    </FormModal>
{/if}