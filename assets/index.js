function encodePathValue(value) {
    return encodeURIComponent(value);
}

export function buildApiRequest(row, formData) {
    const method = row.querySelector('[name="method"]')?.value || row.dataset.method.split(' / ')[0];
    const pathParameters = [];
    const path = row.dataset.path.replace(/:([a-zA-Z]+)/g, (_, name) => {
        const value = formData.get(name);
        if (!value) {
            throw new Error(`${name} is required.`);
        }
        if (name === 'id' && !/^\d+$/.test(value)) {
            throw new Error(`${name} must be a number.`);
        }
        pathParameters.push(name);
        return encodePathValue(value);
    });

    const query = new URLSearchParams();
    const body = new URLSearchParams();
    for (const [name, value] of formData.entries()) {
        if (!value || pathParameters.includes(name) || name === 'method') {
            continue;
        }
        if (method === 'GET') {
            query.set(name, value);
        } else {
            body.set(name, value);
        }
    }

    return {
        url: query.toString() ? `${path}?${query}` : path,
        options: method === 'GET'
            ? { method }
            : { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }
    };
}

export function formatApiResponse(response, text) {
    let output = text;
    try {
        output = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
        // Preserve HTML and plain-text API responses as returned.
    }
    return `${response.status} ${response.statusText}\n${output}`;
}

export async function executeApiCall(row, formData, fetchImpl = fetch) {
    const request = buildApiRequest(row, formData);
    const response = await fetchImpl(request.url, request.options);
    return formatApiResponse(response, await response.text());
}

export function formatApiError(error) {
    return error.message;
}

async function runApiCall(form) {
    const result = form.querySelector('.api-result');
    result.textContent = 'Loading...';
    try {
        result.textContent = await executeApiCall(form.closest('tr'), new FormData(form));
    } catch (error) {
        result.textContent = formatApiError(error);
    }
}

if (typeof document !== 'undefined') {
    document.querySelectorAll('.api-call').forEach(form => {
        form.addEventListener('submit', event => {
            event.preventDefault();
            runApiCall(form);
        });
    });
}
