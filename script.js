// ---------- PUBLIC STORE RENDERER (With Error Handling) ----------
async function loadPublicStore(sitename) {
    // Show a proper loading screen first
    document.body.innerHTML = `
        <div class="container text-center mt-5 pt-5">
            <i class="fas fa-spinner fa-spin fa-3x text-primary mb-3"></i>
            <h4>Loading Store "${sitename}"...</h4>
        </div>
    `;

    try {
        const usersSnap = await get(ref(db, 'users'));
        const users = usersSnap.val() || {};
        let targetUid = null;

        for (const [uid, data] of Object.entries(users)) {
            const cleanName = (data.username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanName === sitename.toLowerCase()) {
                targetUid = uid;
                break;
            }
        }

        if (!targetUid) {
            document.body.innerHTML = `
                <div class="container text-center mt-5 pt-5">
                    <h1 class="display-1 fw-bold text-secondary">404</h1>
                    <h3 class="text-muted">Store "${sitename}" not found.</h3>
                    <p>Please check the link and try again.</p>
                </div>
            `;
            return;
        }

        const siteSnap = await get(ref(db, `sites/${targetUid}/content`));
        if (siteSnap.exists() && siteSnap.val()) {
            document.open();
            document.write(siteSnap.val());
            document.close();
        } else {
            document.body.innerHTML = `
                <div class="container text-center mt-5 pt-5">
                    <div class="alert alert-info d-inline-block p-4 shadow-sm">
                        <h3><i class="fas fa-store me-2"></i>Store Exists</h3>
                        <p class="mb-0">This store has been created but the owner hasn't published any content yet.</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error loading store:", error);
        // Catch errors (like Firebase Permission Denied) and show it
        document.body.innerHTML = `
            <div class="container text-center mt-5 pt-5">
                <div class="alert alert-danger d-inline-block p-4 shadow-sm text-start">
                    <h4 class="fw-bold"><i class="fas fa-exclamation-triangle me-2"></i>Connection Error</h4>
                    <p>Failed to load the store. This is usually a database permission issue.</p>
                    <hr>
                    <p class="mb-0 small font-monospace text-danger">Error: ${error.message}</p>
                </div>
            </div>
        `;
    }
}
