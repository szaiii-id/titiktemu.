// Deklarasi matcher dari @testing-library/jest-dom
// agar dikenali oleh svelte-check dan TypeScript.
// Lihat: https://github.com/testing-library/jest-dom#with-typescript

import 'vitest';

declare module 'vitest' {
    interface Assertion<T = any> {
        toBeInTheDocument(): T;
        toBeDisabled(): T;
        toBeEnabled(): T;
        toBeEmptyDOMElement(): T;
        toBeInvalid(): T;
        toBeRequired(): T;
        toBeValid(): T;
        toBeVisible(): T;
        toContainElement(element: HTMLElement | null): T;
        toContainHTML(html: string): T;
        toHaveAccessibleDescription(description?: string | RegExp): T;
        toHaveAccessibleName(name?: string | RegExp): T;
        toHaveAttribute(attr: string, value?: unknown): T;
        toHaveClass(...classNames: string[]): T;
        toHaveFocus(): T;
        toHaveFormValues(values: Record<string, unknown>): T;
        toHaveStyle(css: string | Record<string, unknown>): T;
        toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): T;
        toHaveValue(value?: string | string[] | number | null): T;
        toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): T;
        toBeChecked(): T;
        toBePartiallyChecked(): T;
        toHaveErrorMessage(text?: string | RegExp): T;
    }

    interface AsymmetricMatchersContaining {
        toBeInTheDocument(): void;
        toBeDisabled(): void;
        toBeEnabled(): void;
        toBeVisible(): void;
        toHaveAttribute(attr: string, value?: unknown): void;
        toHaveClass(...classNames: string[]): void;
        toHaveTextContent(text: string | RegExp): void;
        toHaveValue(value?: string | string[] | number | null): void;
    }
}