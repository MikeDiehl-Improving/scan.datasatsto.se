export class TestFormData {
    constructor(values) {
        this.values = new Map(Object.entries(values));
    }

    get(name) {
        return this.values.get(name);
    }

    entries() {
        return this.values.entries();
    }
}

export function row(path, method = 'GET', selectedMethod = null) {
    return {
        dataset: { path, method },
        querySelector: selector => selector === '[name="method"]' && selectedMethod
            ? { value: selectedMethod }
            : null
    };
}
