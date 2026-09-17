window.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-vendor-code-selector]').forEach(function (selector) {
        var choice = selector.querySelector('[name="vendorCodeChoice"]');
        var newCode = selector.querySelector('[name="newVendorCode"]');

        function updateNewCodeVisibility() {
            var isNewCode = choice.value === '__new__';
            newCode.hidden = !isNewCode;
            newCode.required = isNewCode;
            if (isNewCode) {
                newCode.focus();
            }
        }

        choice.addEventListener('change', updateNewCodeVisibility);
        updateNewCodeVisibility();
    });
});
