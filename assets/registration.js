const idInput = document.querySelector('#identity-id');
const statusMessage = document.querySelector('#badge-status');
const details = document.querySelector('#details');
const form = document.querySelector('#registration-form');
const camera = document.querySelector('#camera');
let stream;

async function checkBadge() {
    details.hidden = true;
    const response = await fetch('/registration/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: idInput.value,
            encryptionKey: form.elements.encryptionKey.value
        })
    });
    const result = await response.json();
    if (result.status === 'available') {
        statusMessage.textContent = 'Badge is available.';
        details.hidden = false;
        return;
    }
    statusMessage.textContent = result.status === 'claimed'
        ? 'This badge has already been registered.'
        : 'This badge was not found for the authorized event.';
}

document.querySelector('#check-id').addEventListener('click', () => {
    checkBadge().catch(() => {
        statusMessage.textContent = 'Unable to check the badge.';
    });
});

document.querySelector('#start-camera').addEventListener('click', async () => {
    const message = document.querySelector('#camera-message');
    if (!('BarcodeDetector' in window)) {
        message.textContent = 'This browser does not support webcam QR scanning. Enter the ID manually.';
        return;
    }
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        camera.srcObject = stream;
        camera.hidden = false;
        const detector = new BarcodeDetector({ formats: ['qr_code'] });
        const scan = async () => {
            if (camera.hidden) return;
            const codes = await detector.detect(camera);
            if (codes.length > 0) {
                const match = codes[0].rawValue.match(/\/([0-9]+)\/?$/);
                if (match) {
                    idInput.value = match[1];
                    stopCamera();
                    await checkBadge();
                    return;
                }
                message.textContent = 'That QR code is not a badge QR code.';
            }
            requestAnimationFrame(scan);
        };
        scan();
    } catch {
        message.textContent = 'Camera access was unavailable. Enter the ID manually.';
    }
});

function stopCamera() {
    camera.hidden = true;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = undefined;
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(form));
    const response = await fetch('/registration/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const result = await response.json();
    if (response.status === 409) {
        details.hidden = true;
        statusMessage.textContent = result.message;
        return;
    }
    if (!response.ok) {
        statusMessage.textContent = result.error || 'Unable to register the badge.';
        return;
    }
    details.hidden = true;
    statusMessage.textContent = 'Badge registered successfully.';
});
