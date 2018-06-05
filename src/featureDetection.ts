let cachedSupportsDynamicImport: boolean;

export function supportsDynamicImport() {
    if (typeof cachedSupportsDynamicImport !== 'boolean') {
        try {
            // tslint:disable-next-line no-unused-expression
            new Function('import("")');
            cachedSupportsDynamicImport = true;
        } catch (err) {
            cachedSupportsDynamicImport = false;
        }
    }

    return cachedSupportsDynamicImport;
}
