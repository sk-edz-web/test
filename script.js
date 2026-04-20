// script.js – GitHub Friendly Version (No 404 Error)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    update, 
    push, 
    onValue, 
    remove 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCd60_0wJHiCn6ly33AL5mTZRy3nigZr90",
    authDomain: "e-commers-ac863.firebaseapp.com",
    databaseURL: "https://e-commers-ac863-default-rtdb.firebaseio.com",
    projectId: "e-commers-ac863",
    storageBucket: "e-commers-ac863.firebasestorage.app",
    messagingSenderId: "1077435595653",
    appId: "1:1077435595653:web:619f3be2cb932d5b7e22ec"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const UPI_ID = 'sarathi.edz@fam';
const ADMIN_EMAIL = 'info.skedz@gmail.com';

let currentUser = null;
let userProfile = {};

// --- GITHUB PATH LOGIC ---
const urlParams = new URLSearchParams(window.location.search);
const publicSiteUser = urlParams.get('user'); // ?user=sitename nu irundha site load aagum

const isLoginPage = window.location.pathname.includes('login.html');
const isAdminPage = window.location.pathname.includes('admin.html');

// Check if we should show a public store or the admin dashboard
if (publicSiteUser) {
    document.addEventListener('DOMContentLoaded', () => loadPublicStore(publicSiteUser));
} else if (isLoginPage) {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else if (isAdminPage) {
    document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
    document.addEventListener('DOMContentLoaded', initMainApp);
}

// Function to load a user's store on the public URL
async function loadPublicStore(sitename) {
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
        document.body.innerHTML = `<div class="text-center mt-5"><h1>404</h1><p>Store "${sitename}" not found.</p></div>`;
        return;
    }

    const siteSnap = await get(ref(db, `sites/${targetUid}/content`));
    if (siteSnap.exists()) {
        document.open();
        document.write(siteSnap.val());
        document.close();
    } else {
        document.body.innerHTML = `<div class="text-center mt-5"><h3>Store exists but has no content yet.</h3></div>`;
    }
}

// --- REST OF YOUR ADMIN LOGIC ---

function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const msgDiv = document.getElementById('auth-message');

    document.getElementById('show-signup').addEventListener('click', e => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        msgDiv.textContent = '';
    });
    
    document.getElementById('show-login').addEventListener('click', e => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        msgDiv.textContent = '';
    });

    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-password').value;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            window.location.href = 'index.html';
        } catch (err) {
            msgDiv.textContent = err.message;
        }
    });

    signupForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value.trim();
        const pass = document.getElementById('signup-password').value;
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            await set(ref(db, `users/${cred.user.uid}`), {
                email,
                createdAt: Date.now(),
                onboardingComplete: false
            });
            window.location.href = 'index.html';
        } catch (err) {
            msgDiv.textContent = err.message;
        }
    });
}

async function initMainApp() {
    onAuthStateChanged(auth, async user => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;
        await loadProfile();
        setupNavigation();
        checkOnboardingFlow();
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'login.html';
    });
}

async function loadProfile() {
    const snap = await get(ref(db, `users/${currentUser.uid}`));
    userProfile = snap.exists() ? snap.val() : {};
    if (!userProfile.email) userProfile.email = currentUser.email;
}

function setupNavigation() {
    document.getElementById('user-greeting').innerHTML = 
        `<i class="far fa-user-circle me-1"></i>${userProfile.businessName || userProfile.fullName || currentUser.email}`;
    document.getElementById('sidebar-business').textContent = userProfile.businessName || 'My Store';
    
    const plan = userProfile.subscription?.planName || userProfile.subscription?.name || 'Free';
    document.getElementById('plan-badge').textContent = plan;
    updateCardsInfo();

    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.querySelectorAll('[data-section]').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            loadSection(link.dataset.section);
        });
    });
    
    loadSection('dashboard');
}

function updateCardsInfo() {
    const sub = userProfile.subscription;
    if (!sub) {
        document.getElementById('free-cards-info').innerText = 'No active plan';
        return;
    }
    const used = sub.usedCards || 0;
    const free = sub.free || sub.freeCards || 0;
    document.getElementById('free-cards-info').innerHTML = `📦 ${used}/${free} free cards used`;
}

async function checkOnboardingFlow() {
    if (!userProfile.onboardingComplete) {
        await showQuestionnaire();
    } else if (!userProfile.subscription?.activated) {
        await showPlanSelection();
    } else if (!userProfile.template) {
        await showTemplatePicker();
    }
}

function showModal(content, size = 'lg') {
    const modalEl = document.getElementById('globalModal');
    const modalContent = document.getElementById('globalModalContent');
    modalContent.innerHTML = content;
    
    if (size === 'lg') {
        modalEl.querySelector('.modal-dialog').classList.add('modal-lg');
    } else {
        modalEl.querySelector('.modal-dialog').classList.remove('modal-lg');
    }
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    return modal;
}

async function showQuestionnaire() {
    const html = `
        <div class="modal-header">
            <h4 class="fw-bold">🚀 Let's setup your store</h4>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <form id="qForm">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label>Username</label>
                        <input class="form-control" name="username" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label>Full Name</label>
                        <input class="form-control" name="fullName" required>
                    </div>
                </div>
                <div class="mb-3">
                    <label>Contact Email</label>
                    <input type="email" class="form-control" name="contactEmail" required>
                </div>
                <div class="mb-3">
                    <label>Mobile Number</label>
                    <input type="tel" class="form-control" name="mobile" required>
                </div>
                <div class="mb-3">
                    <label>Business Name</label>
                    <input class="form-control" name="businessName" required>
                </div>
                <div class="mb-3">
                    <label>Business Category</label>
                    <select class="form-select" id="catSelect" name="category">
                        <option>Fashion</option>
                        <option>Electronics</option>
                        <option>Home & Living</option>
                        <option>Beauty</option>
                        <option>Other</option>
                    </select>
                    <input class="form-control mt-2 d-none" id="otherCat" placeholder="Specify other category">
                </div>
                <button type="submit" class="btn btn-gradient w-100">Continue to Plans</button>
            </form>
        </div>
    `;
    
    const modal = showModal(html);
    
    document.getElementById('catSelect').addEventListener('change', e => {
        document.getElementById('otherCat').classList.toggle('d-none', e.target.value !== 'Other');
    });
    
    document.getElementById('qForm').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        if (data.category === 'Other') {
            data.category = document.getElementById('otherCat').value;
        }
        await update(ref(db, `users/${currentUser.uid}`), { 
            ...data, 
            onboardingStep: 'plan' 
        });
        userProfile = { ...userProfile, ...data };
        bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
        await showPlanSelection();
    });
}

async function showPlanSelection() {
    const plans = [
        { id: 'basic_m', name: '₹199 / 30 Days', free: 30, extra: 10, commission: 3, support: false, wait: 0, price: 199, days: 30 },
        { id: 'pro_m', name: '₹499 / 30 Days', free: 50, extra: 8, commission: 0, support: true, wait: 3, price: 499, days: 30 },
        { id: 'basic_y', name: '₹1999 / 365 Days', free: 60, extra: 5, commission: 0, support: true, wait: 3, price: 1999, days: 365 },
        { id: 'pro_y', name: '₹2999 / 365 Days', free: 80, extra: 5, commission: 0, support: true, wait: 5, price: 2999, days: 365 }
    ];

    let cards = '';
    plans.forEach(p => {
        const features = `${p.free} free cards, ₹${p.extra}/extra, ${p.commission}% commission, ${p.support ? 'Quick support' : 'No support'}, ${p.wait} days wait`;
        cards += `
            <div class="col-md-6 mb-3">
                <div class="card p-3 h-100">
                    <h5>${p.name}</h5>
                    <p class="small">${features}</p>
                    <button class="btn btn-outline-primary mt-auto select-plan" data-plan='${JSON.stringify(p)}'>Select</button>
                </div>
            </div>
        `;
    });

    const html = `
        <div class="modal-header">
            <h4>Choose Your Plan</h4>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div class="row">${cards}</div>
        </div>
    `;
    
    const modal = showModal(html);
    
    document.querySelectorAll('.select-plan').forEach(btn => {
        btn.addEventListener('click', async () => {
            const plan = JSON.parse(btn.dataset.plan);
            const subscriptionData = {
                ...plan,
                activated: false,
                usedCards: 0,
                planName: plan.name
            };
            await update(ref(db, `users/${currentUser.uid}`), { subscription: subscriptionData });
            userProfile.subscription = subscriptionData;
            bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
            showPaymentPopup(plan.price);
        });
    });
}

function showPaymentPopup(amount) {
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=SK-Commerse&am=${amount}&cu=INR`;
    
    window.location.href = upiLink;

    setTimeout(() => {
        const mobile = userProfile.mobile || 'not provided';
        const subject = encodeURIComponent('Subscription Payment Screenshot - SK-Commerse');
        const body = encodeURIComponent(`Please find attached the screenshot of my successful payment.\n\nRegistered Mobile Number: ${mobile}\n\nThank you.`);
        const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;

        const html = `
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-check-circle text-success me-2"></i>Payment Instructions
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center">
                <div class="alert alert-info">
                    <i class="fas fa-mobile-alt me-2"></i> Complete payment in your UPI app, then return here.
                </div>
                <button class="btn btn-outline-primary w-100 mb-3" id="openUpiBtn">
                    <i class="fas fa-external-link-alt me-2"></i>Open UPI App Again
                </button>
                <p class="mb-3">1. Take a <strong>screenshot</strong> of the successful payment.</p>
                <p class="mb-3">2. Click the button below to open your email app and attach the screenshot.</p>
                <a href="${mailtoLink}" class="btn btn-primary w-100 mb-3" target="_blank">
                    <i class="fas fa-envelope me-2"></i>Open Email App to Send Screenshot
                </a>
                <p class="small text-secondary">Recipient: ${ADMIN_EMAIL}<br>Your mobile: ${mobile}</p>
                <hr>
                <p class="small text-secondary">
                    After sending the email, click below to activate your subscription.
                </p>
                <button class="btn btn-gradient w-100" id="simulatePaymentBtn">
                    <i class="fas fa-paper-plane me-2"></i>I've Emailed – Activate Now
                </button>
                <p class="small text-muted mt-3">
                    *Demo: This will activate immediately for testing purposes.
                </p>
            </div>
        `;
        
        const modalEl = document.getElementById('globalModal');
        const modalContent = document.getElementById('globalModalContent');
        modalContent.innerHTML = html;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        document.getElementById('openUpiBtn').addEventListener('click', () => {
            window.location.href = upiLink;
        });

        document.getElementById('simulatePaymentBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await activateSubscription();
                modal.hide();
            } catch (error) {
                alert('Activation failed: ' + error.message);
            }
        });
    }, 1000);
}

async function activateSubscription() {
    const updates = {};
    updates[`users/${currentUser.uid}/subscription/activated`] = true;
    updates[`users/${currentUser.uid}/onboardingComplete`] = true;
    
    await update(ref(db), updates);
    
    if (!userProfile.subscription) userProfile.subscription = {};
    userProfile.subscription.activated = true;
    userProfile.onboardingComplete = true;
    
    await showTemplatePicker();
}

async function showTemplatePicker() {
    const html = `
        <div class="modal-header">
            <h4>Select a Template</h4>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div class="row">
                <div class="col-6">
                    <div class="card p-3 text-center">
                        <h5>Minimal</h5>
                        <button class="btn btn-outline-success pick-tmp" data-tmp="temp1">Choose</button>
                    </div>
                </div>
                <div class="col-6">
                    <div class="card p-3 text-center">
                        <h5>Bold Store</h5>
                        <button class="btn btn-outline-success pick-tmp" data-tmp="temp2">Choose</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modal = showModal(html);
    
    document.querySelectorAll('.pick-tmp').forEach(btn => {
        btn.addEventListener('click', async () => {
            const tmp = btn.dataset.tmp;
            await update(ref(db, `users/${currentUser.uid}`), { template: tmp });
            userProfile.template = tmp;
            bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
            loadSection('builder');
        });
    });
}

function loadSection(section) {
    const panel = document.getElementById('main-panel');
    switch (section) {
        case 'dashboard': renderDashboard(panel); break;
        case 'products': renderProducts(panel); break;
        case 'orders': renderOrders(panel); break;
        case 'builder': renderBuilder(panel); break;
        case 'settings': renderSettings(panel); break;
        default: panel.innerHTML = '<h3>Section not found</h3>';
    }
}

async function renderDashboard(panel) {
    const totalFree = userProfile.subscription?.free || userProfile.subscription?.freeCards || 0;
    panel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Dashboard</h3>
            ${!userProfile.onboardingComplete || !userProfile.subscription?.activated ? 
                '<button class="btn btn-gradient" id="resume-onboarding">Resume Setup</button>' : ''}
        </div>
        <p class="lead">Welcome, ${userProfile.businessName || 'Store Owner'}!</p>
        <div class="row mt-4">
            <div class="col-md-4 mb-3"><div class="card p-4"><h6 class="text-secondary">Products</h6><h2 id="prod-count">0</h2></div></div>
            <div class="col-md-4 mb-3"><div class="card p-4"><h6 class="text-secondary">Orders</h6><h2 id="order-count">0</h2></div></div>
            <div class="col-md-4 mb-3"><div class="card p-4"><h6 class="text-secondary">Free Cards Used</h6><h2 id="cards-used">${userProfile.subscription?.usedCards || 0} / ${totalFree}</h2></div></div>
        </div>
    `;
    const prodSnap = await get(ref(db, `products/${currentUser.uid}`));
    document.getElementById('prod-count').innerText = prodSnap.exists() ? Object.keys(prodSnap.val()).length : 0;
    const orderSnap = await get(ref(db, `orders/${currentUser.uid}`));
    document.getElementById('order-count').innerText = orderSnap.exists() ? Object.keys(orderSnap.val()).length : 0;
    if (document.getElementById('resume-onboarding')) {
        document.getElementById('resume-onboarding').addEventListener('click', () => checkOnboardingFlow());
    }
}

function renderProducts(panel) {
    panel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Product Management</h3>
            <button class="btn btn-gradient" id="add-product-btn"><i class="fas fa-plus me-2"></i>Add Product</button>
        </div>
        <div class="row" id="product-list"></div>
    `;
    document.getElementById('add-product-btn').addEventListener('click', () => openProductForm());
    loadProductList();
}

function openProductForm(product = null) {
    const html = `
        <div class="modal-header"><h5>${product ? 'Edit' : 'Add'} Product</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
            <form id="prodForm">
                <input name="id" type="hidden" value="${product?.id || ''}">
                <div class="mb-3"><label>Product Name</label><input name="name" class="form-control" value="${product?.name || ''}" required></div>
                <div class="mb-3"><label>Price (₹)</label><input name="price" type="number" step="0.01" class="form-control" value="${product?.price || ''}" required></div>
                <div class="mb-3"><label>Description</label><textarea name="desc" class="form-control" rows="3">${product?.desc || ''}</textarea></div>
                <div class="mb-3"><label>Image URL</label><input name="image" class="form-control" value="${product?.image || ''}" placeholder="https://..."></div>
                <button type="submit" class="btn btn-gradient w-100">Save Product</button>
            </form>
        </div>
    `;
    showModal(html);
    document.getElementById('prodForm').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        data.price = parseFloat(data.price);
        let prodRef = data.id ? ref(db, `products/${currentUser.uid}/${data.id}`) : push(ref(db, `products/${currentUser.uid}`));
        if (!data.id) data.id = prodRef.key;
        await set(prodRef, data);
        bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
        loadProductList();
        checkCardUsage();
    });
}

async function loadProductList() {
    const snap = await get(ref(db, `products/${currentUser.uid}`));
    const products = snap.val() || {};
    const container = document.getElementById('product-list');
    container.innerHTML = Object.keys(products).length === 0 ? '<div class="col-12 text-center py-5 text-secondary">No products yet.</div>' : '';
    Object.entries(products).forEach(([id, p]) => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-3';
        col.innerHTML = `
            <div class="card card-product h-100">
                ${p.image ? `<img src="${p.image}" class="card-img-top" style="height: 180px; object-fit: cover;">` : '<div class="bg-light text-center py-5"><i class="fas fa-box fa-3x text-secondary"></i></div>'}
                <div class="card-body"><h5 class="card-title">${p.name}</h5><p class="card-text text-muted">₹${p.price}</p></div>
                <div class="card-footer bg-transparent border-0 pb-3">
                    <button class="btn btn-sm btn-outline-secondary edit-prod" data-id="${id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-outline-danger del-prod" data-id="${id}"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
    document.querySelectorAll('.edit-prod').forEach(btn => btn.addEventListener('click', async () => {
        const snap = await get(ref(db, `products/${currentUser.uid}/${btn.dataset.id}`));
        openProductForm({ id: btn.dataset.id, ...snap.val() });
    }));
    document.querySelectorAll('.del-prod').forEach(btn => btn.addEventListener('click', async () => {
        if (confirm('Delete?')) { await remove(ref(db, `products/${currentUser.uid}/${btn.dataset.id}`)); loadProductList(); checkCardUsage(); }
    }));
}

async function checkCardUsage() {
    const snap = await get(ref(db, `products/${currentUser.uid}`));
    const count = snap.exists() ? Object.keys(snap.val()).length : 0;
    const sub = userProfile.subscription;
    if (!sub) return;
    const free = sub.free || sub.freeCards || 0;
    if (count > free) alert(`Exceeded limit! ₹${sub.extra}/card applies.`);
    await update(ref(db, `users/${currentUser.uid}`), { subscription: { ...sub, usedCards: count } });
    userProfile.subscription.usedCards = count;
    updateCardsInfo();
}

function renderOrders(panel) {
    panel.innerHTML = `<h3 class="mb-4">Order Management</h3><div id="order-list"></div>`;
    onValue(ref(db, `orders/${currentUser.uid}`), snap => {
        const orders = snap.val() || {};
        const container = document.getElementById('order-list');
        container.innerHTML = Object.keys(orders).length === 0 ? '<p class="text-center py-4">No orders.</p>' : '';
        Object.entries(orders).forEach(([id, o]) => {
            const row = `<div class="card mb-3"><div class="card-body"><h5>${o.customerName}</h5><p>${o.email} | ${o.mobile}</p><hr>
                <button class="btn btn-sm btn-outline-primary proc-order" data-id="${id}">Processing</button>
                <button class="btn btn-sm btn-outline-success comp-order" data-id="${id}">Completed</button>
                <button class="btn btn-sm btn-outline-danger del-order" data-id="${id}">Delete</button>
            </div></div>`;
            container.innerHTML += row;
        });
        document.querySelectorAll('.proc-order').forEach(btn => btn.addEventListener('click', () => update(ref(db, `orders/${currentUser.uid}/${btn.dataset.id}`), { status: 'processing' })));
        document.querySelectorAll('.comp-order').forEach(btn => btn.addEventListener('click', () => update(ref(db, `orders/${currentUser.uid}/${btn.dataset.id}`), { status: 'completed' })));
        document.querySelectorAll('.del-order').forEach(btn => btn.addEventListener('click', () => { if(confirm('Delete?')) remove(ref(db, `orders/${currentUser.uid}/${btn.dataset.id}`)); }));
    });
}

function renderBuilder(panel) {
    panel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4"><h3>Builder</h3>
            <div><button class="btn btn-outline-secondary me-2" id="preview-site">Preview</button><button class="btn btn-gradient" id="publish-site">Publish</button></div>
        </div>
        <textarea class="form-control font-monospace" id="store-html" rows="15"></textarea>
        <button class="btn btn-primary mt-3" id="save-content">Save Changes</button>
    `;
    loadTemplateContent();
    document.getElementById('preview-site').addEventListener('click', previewSite);
    document.getElementById('publish-site').addEventListener('click', publishFlow);
    document.getElementById('save-content').addEventListener('click', saveTemplateContent);
}

async function loadTemplateContent() {
    const tmp = userProfile.template || 'temp1';
    try {
        const res = await fetch(`${tmp}.html`);
        let html = await res.text();
        html = html.replace(/{{businessName}}/g, userProfile.businessName || 'My Store')
                   .replace(/{{email}}/g, userProfile.contactEmail || '').replace(/{{mobile}}/g, userProfile.mobile || '');
        const savedSnap = await get(ref(db, `sites/${currentUser.uid}/content`));
        document.getElementById('store-html').value = savedSnap.val() || html;
    } catch (err) { console.error(err); }
}

async function saveTemplateContent() {
    await set(ref(db, `sites/${currentUser.uid}/content`), document.getElementById('store-html').value);
    alert('Saved!');
}

function previewSite() {
    const html = `<div class="modal-header"><h5>Preview</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                  <div class="modal-body p-0" style="height: 70vh;"><iframe id="dynamic-preview-iframe" style="width: 100%; height: 100%; border: none;"></iframe></div>`;
    showModal(html, 'lg');
    setTimeout(() => { document.getElementById('dynamic-preview-iframe').srcdoc = document.getElementById('store-html').value; }, 100);
}

// --- GITHUB PATH FIX FOR PUBLISH ---
async function publishFlow() {
    const siteSnap = await get(ref(db, `sites/${currentUser.uid}/published`));
    const sitename = (userProfile.username || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Updated siteUrl to use Query Parameter (GitHub safe)
    const siteUrl = `${window.location.origin}${window.location.pathname}?user=${sitename}`;

    if (siteSnap.val()) {
        showPublishedSuccessModal(siteUrl);
        return;
    }

    const html = `<div class="modal-header"><h5>Enter Key</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body"><input id="keyInput" class="form-control text-center" placeholder="XXXX-XXXX-XXXX"><div id="keyFeedback" class="small text-danger"></div></div>
        <div class="modal-footer"><button class="btn btn-gradient" id="validateKey">Publish</button></div>`;
    showModal(html);
    document.getElementById('validateKey').addEventListener('click', async () => {
        const key = document.getElementById('keyInput').value.trim().toUpperCase();
        const keySnap = await get(ref(db, `keys/${key}`));
        if (!keySnap.exists() || keySnap.val().used || keySnap.val().userId !== currentUser.uid) {
            document.getElementById('keyFeedback').innerText = 'Invalid or used key';
            return;
        }
        await update(ref(db, `keys/${key}`), { used: true, usedAt: Date.now() });
        await set(ref(db, `sites/${currentUser.uid}/published`), true);
        bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
        showPublishedSuccessModal(siteUrl);
    });
}

function showPublishedSuccessModal(siteUrl) {
    const html = `<div class="modal-header"><h5 class="text-success">Site Live!</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body text-center"><p>${siteUrl}</p>
        <a href="${siteUrl}" target="_blank" class="btn btn-gradient">Open Store</a>
        <button class="btn btn-outline-secondary mt-2" id="copyBtn">Copy Link</button></div>`;
    showModal(html);
    document.getElementById('copyBtn').addEventListener('click', () => { navigator.clipboard.writeText(siteUrl); alert('Copied!'); });
}

function renderSettings(panel) {
    panel.innerHTML = `<h3>Settings</h3><form id="settingsForm">
        <div class="mb-3"><label>Business Name</label><input class="form-control" name="businessName" value="${userProfile.businessName || ''}"></div>
        <button type="submit" class="btn btn-primary">Save</button></form>`;
    document.getElementById('settingsForm').addEventListener('submit', async e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        await update(ref(db, `users/${currentUser.uid}`), data);
        userProfile = { ...userProfile, ...data };
        alert('Saved!');
        setupNavigation();
    });
}

// --- ADMIN PAGE ---
function initAdminPage() {
    onAuthStateChanged(auth, user => { if (!user) window.location.href = 'login.html'; setupAdminUI(); });
}

function setupAdminUI() {
    document.body.innerHTML = `<div class="container mt-5"><div class="card"><div class="card-body">
        <h4>Admin Key Gen</h4><input id="adminUserIdentifier" class="form-control mb-2" placeholder="Email/Username">
        <input id="adminDays" type="number" class="form-control mb-2" value="30">
        <button class="btn btn-primary w-100" id="genBtn">Gen Key</button><div id="keyResult" class="mt-3"></div>
    </div></div></div>`;
    document.getElementById('genBtn').addEventListener('click', async () => {
        const identifier = document.getElementById('adminUserIdentifier').value.trim();
        const usersSnap = await get(ref(db, 'users'));
        const users = usersSnap.val() || {};
        let targetUid = null;
        for (const [uid, data] of Object.entries(users)) {
            if ((data.email || '').toLowerCase() === identifier.toLowerCase() || (data.username || '').toLowerCase() === identifier.toLowerCase()) {
                targetUid = uid; break;
            }
        }
        if (!targetUid) { alert('Not found'); return; }
        const key = generateKey();
        await set(ref(db, `keys/${key}`), { userId: targetUid, expiry: Date.now() + (30*24*60*60*1000), used: false });
        document.getElementById('keyResult').innerHTML = `Key: <b>${key}</b>`;
    });
}

function generateKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 12; i++) { if (i > 0 && i % 4 === 0) key += '-'; key += chars[Math.floor(Math.random() * chars.length)]; }
    return key;
}
