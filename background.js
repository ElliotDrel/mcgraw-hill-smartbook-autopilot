chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.data) {
            sendResponse({ success: true, data: request.data });
        }
        return true;
    });