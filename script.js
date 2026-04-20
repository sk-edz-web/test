// script.js – Full Working Version with GitHub URL Logic & All Original Features

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
let selectedTemplate = 'temp1';

// --- GITHUB PATH LOGIC (NO 404 ERROR) ---
const urlParams = new URLSearchParams(window.location.search);
const publicSiteUser = urlParams.get('user');

const isLoginPage = window.location.pathname.includes('login.html');
const isAdminPage = window.location.pathname.includes('admin.html');

if (publicSiteUser) {
    document.addEventListener('DOMContentLoaded', () => loadPublicStore(publicSiteUser));
} else if (isLoginPage) {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else if (isAdminPage) {
    document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
    document.addEventListener('DOMContentLoaded', initMainApp);
}

// ---------- PUBLIC STORE RENDERER ----------
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
                    <p class="small text-muted mt-2">If you are the owner, go to the Website Builder and click "Save Changes".</p>
                </div>
            </div>
        `;
    }
}

// ---------- AUTH & LOGIN ----------
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

// ---------- MAIN APP ----------
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

// ---------- ONBOARDING FLOW ----------
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
                <div class="card p-3 h-100 border-0 shadow-sm" style="border-radius: 12px;">
                    <h5 class="fw-bold text-primary">${p.name}</h5>
                    <p class="small text-secondary mb-4">${features}</p>
                    <button class="btn btn-outline-primary mt-auto select-plan w-100 fw-bold" data-plan='${JSON.stringify(p)}'>Select Plan</button>
                </div>
            </div>
        `;
    });

    const html = `
        <div class="modal-header border-0 pb-0">
            <h4 class="fw-bold">Choose Your Plan</h4>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <p class="text-muted mb-4">Select a subscription plan that fits your business needs.</p>
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
            <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold">
                    <i class="fas fa-check-circle text-success me-2"></i>Payment Instructions
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center">
                <div class="alert alert-info mb-4" style="border-radius: 10px;">
                    <i class="fas fa-mobile-alt me-2"></i> Complete payment in your UPI app, then return here.
                </div>
                <button class="btn btn-outline-primary w-100 mb-4 py-2 fw-bold" id="openUpiBtn" style="border-radius: 8px;">
                    <i class="fas fa-external-link-alt me-2"></i>Open UPI App Again
                </button>
                <div class="text-start bg-light p-3 mb-4" style="border-radius: 10px;">
                    <p class="mb-2">1. Take a <strong>screenshot</strong> of the successful payment.</p>
                    <p class="mb-0">2. Click the button below to open your email app and attach the screenshot.</p>
                </div>
                <a href="${mailtoLink}" class="btn btn-primary w-100 mb-3 py-2 fw-bold" target="_blank" style="border-radius: 8px;">
                    <i class="fas fa-envelope me-2"></i>Open Email App to Send Screenshot
                </a>
                <p class="small text-secondary mb-4">Recipient: ${ADMIN_EMAIL}<br>Your mobile: ${mobile}</p>
                <hr>
                <p class="small text-secondary mb-3">
                    After sending the email, click below to activate your subscription.
                </p>
                <button class="btn btn-gradient w-100 py-2 fw-bold" id="simulatePaymentBtn">
                    <i class="fas fa-paper-plane me-2"></i>I've Emailed – Activate Now
                </button>
                <p class="small text-muted mt-3 mb-0">
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
        <div class="modal-header border-0 pb-0">
            <h4 class="fw-bold">Select a Template</h4>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <p class="text-muted mb-4">Choose a starting design for your store.</p>
            <div class="row">
                <div class="col-6">
                    <div class="card p-4 text-center border-0 shadow-sm h-100" style="border-radius: 12px;">
                        <i class="fas fa-desktop fa-3x text-primary mb-3"></i>
                        <h5 class="fw-bold">Minimal</h5>
                        <p class="small text-muted">Clean and simple design.</p>
                        <button class="btn btn-outline-success pick-tmp mt-auto fw-bold" data-tmp="temp1">Choose</button>
                    </div>
                </div>
                <div class="col-6">
                    <div class="card p-4 text-center border-0 shadow-sm h-100" style="border-radius: 12px;">
                        <i class="fas fa-store-alt fa-3x text-primary mb-3"></i>
                        <h5 class="fw-bold">Bold Store</h5>
                        <p class="small text-muted">Vibrant and modern look.</p>
                        <button class="btn btn-outline-success pick-tmp mt-auto fw-bold" data-tmp="temp2">Choose</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modal = showModal(html);
    
    document.querySelectorAll('.pick-tmp').forEach(btn => {
        btn.addEventListener('click', async () => {
            const tmp = btn.dataset.tmp;
            selectedTemplate = tmp;
            await update(ref(db, `users/${currentUser.uid}`), { template: tmp });
            userProfile.template = tmp;
            bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
            loadSection('builder');
        });
    });
}

// ---------- SECTION ROUTING ----------
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

// ---------- DASHBOARD SECTION ----------
async function renderDashboard(panel) {
    const totalFree = userProfile.subscription?.free || userProfile.subscription?.freeCards || 0;
    
    panel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3 class="fw-bold">Dashboard</h3>
            ${!userProfile.onboardingComplete || !userProfile.subscription?.activated ? 
                '<button class="btn btn-gradient shadow-sm" id="resume-onboarding">Resume Setup</button>' : ''}
        </div>
        <p class="lead text-secondary">Welcome back, <strong>${userProfile.businessName || 'Store Owner'}</strong>!</p>
        
        <div class="row mt-4">
            <div class="col-md-4 mb-4">
                <div class="card p-4 border-0 shadow-sm" style="border-radius: 15px;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-secondary mb-1">Total Products</h6>
                            <h2 class="fw-bold mb-0" id="prod-count">0</h2>
                        </div>
                        <div class="bg-light p-3 rounded-circle text-primary">
                            <i class="fas fa-box fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card p-4 border-0 shadow-sm" style="border-radius: 15px;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-secondary mb-1">Total Orders</h6>
                            <h2 class="fw-bold mb-0" id="order-count">0</h2>
                        </div>
                        <div class="bg-light p-3 rounded-circle text-success">
                            <i class="fas fa-shopping-cart fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card p-4 border-0 shadow-sm" style="border-radius: 15px;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-secondary mb-1">Free Cards Used</h6>
                            <h2 class="fw-bold mb-0" id="cards-used">${userProfile.subscription?.usedCards || 0} <span class="fs-5 text-muted">/ ${totalFree}</span></h2>
                        </div>
                        <div class="bg-light p-3 rounded-circle text-warning">
                            <i class="fas fa-layer-group fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const prodSnap = await get(ref(db, `products/${currentUser.uid}`));
    document.getElementById('prod-count').innerText = prodSnap.exists() ? Object.keys(prodSnap.val()).length : 0;
    
    const orderSnap = await get(ref(db, `orders/${currentUser.uid}`));
    document.getElementById('order-count').innerText = orderSnap.exists() ? Object.keys(orderSnap.val()).length : 0;
    
    const resumeBtn = document.getElementById('resume-onboarding');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => checkOnboardingFlow());
    }
}

// ---------- PRODUCTS SECTION ----------
function renderProducts(panel) {
    panel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3 class="fw-bold">Product Management</h3>
            <button class="btn btn-gradient shadow-sm" id="add-product-btn">
                <i class="fas fa-plus me-2"></i>Add Product
            </button>
        </div>
        <div class="row" id="product-list"></div>
    `;
    
    document.getElementById('add-product-btn').addEventListener('click', () => openProductForm());
    loadProductList();
}

function openProductForm(product = null) {
    const html = `
        <div class="modal-header border-0 pb-0">
            <h5 class="fw-bold">${product ? 'Edit' : 'Add New'} Product</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <form id="prodForm">
                <input name="id" type="hidden" value="${product?.id || ''}">
                <div class="mb-3">
                    <label class="form-label fw-bold">Product Name</label>
                    <input name="name" class="form-control" value="${product?.name || ''}" required placeholder="e.g. Classic T-Shirt">
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Price (₹)</label>
                    <input name="price" type="number" step="0.01" class="form-control" value="${product?.price || ''}" required placeholder="0.00">
                </div>
                <div class="mb-3">
                    <label class="form-label fw-bold">Description</label>
                    <textarea name="desc" class="form-control" rows="3" placeholder="Describe your product...">${product?.desc || ''}</textarea>
                </div>
                <div class="mb-4">
                    <label class="form-label fw-bold">Image URL</label>
                    <input name="image" class="form-control" value="${product?.image || ''}" placeholder="https://...">
                </div>
                <button type="submit" class="btn btn-gradient w-100 py-2 fw-bold">Save Product</button>
            </form>
        </div>
    `;
    
    const modal = showModal(html);
    
    document.getElementById('prodForm').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        data.price = parseFloat(data.price);
        
        let prodRef;
        if (data.id) {
            prodRef = ref(db, `products/${currentUser.uid}/${data.id}`);
        } else {
            prodRef = push(ref(db, `products/${currentUser.uid}`));
            data.id = prodRef.key;
        }
        
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
    
    if (Object.keys(products).length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="text-secondary opacity-50 mb-3"><i class="fas fa-box-open fa-4x"></i></div>
                <h5 class="text-secondary">No products added yet.</h5>
                <p class="text-muted">Click "Add Product" to start building your catalog.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    Object.entries(products).forEach(([id, p]) => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-sm-6 mb-4';
        col.innerHTML = `
            <div class="card card-product h-100 border-0 shadow-sm" style="border-radius: 12px; overflow: hidden;">
                ${p.image ? `<img src="${p.image}" class="card-img-top" style="height: 200px; object-fit: cover;">` : 
                '<div class="bg-light text-center d-flex align-items-center justify-content-center" style="height: 200px;"><i class="fas fa-image fa-3x text-secondary opacity-25"></i></div>'}
                <div class="card-body">
                    <h5 class="card-title fw-bold mb-1">${p.name}</h5>
                    <h6 class="card-text text-primary fw-bold mb-2">₹${p.price}</h6>
                    <p class="card-text small text-muted text-truncate">${p.desc || 'No description provided.'}</p>
                </div>
                <div class="card-footer bg-transparent border-0 pb-3 pt-0 d-flex justify-content-between">
                    <button class="btn btn-sm btn-outline-primary flex-grow-1 me-2 edit-prod" data-id="${id}">
                        <i class="fas fa-edit me-1"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger flex-grow-1 del-prod" data-id="${id}">
                        <i class="fas fa-trash me-1"></i> Delete
                    </button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
    
    document.querySelectorAll('.edit-prod').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const snap = await get(ref(db, `products/${currentUser.uid}/${id}`));
            openProductForm({ id, ...snap.val() });
        });
    });
    
    document.querySelectorAll('.del-prod').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this product?')) {
                await remove(ref(db, `products/${currentUser.uid}/${btn.dataset.id}`));
                loadProductList();
                checkCardUsage();
            }
        });
    });
}

async function checkCardUsage() {
    const snap = await get(ref(db, `products/${currentUser.uid}`));
    const count = snap.exists() ? Object.keys(snap.val()).length : 0;
    const sub = userProfile.subscription;
    if (!sub) return;
    
    const free = sub.free || sub.freeCards || 0;
    if (count > free) {
        alert(`You have exceeded your free card limit (${free}). Extra charges of ₹${sub.extra}/card will apply.`);
    }
    
    await update(ref(db, `users/${currentUser.uid}`), { 
        subscription: { ...userProfile.subscription, usedCards: count } 
    });
    userProfile.subscription.usedCards = count;
    updateCardsInfo();
}

// ---------- ORDERS SECTION ----------
function renderOrders(panel) {
    panel.innerHTML = `
        <h3 class="fw-bold mb-4">Order Management</h3>
        <div id="order-list"></div>
    `;
    
    onValue(ref(db, `orders/${currentUser.uid}`), snap => {
        const orders = snap.val() || {};
        const container = document.getElementById('order-list');
        
        if (Object.keys(orders).length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="text-secondary opacity-50 mb-3"><i class="fas fa-receipt fa-4x"></i></div>
                    <h5 class="text-secondary">No orders yet.</h5>
                    <p class="text-muted">When customers buy your products, they will appear here.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        Object.entries(orders).forEach(([id, o]) => {
            const statusBadge = {
                'pending': 'bg-warning text-dark',
                'processing': 'bg-info text-dark',
                'completed': 'bg-success'
            }[o.status] || 'bg-secondary';
            
            html += `
                <div class="card mb-4 border-0 shadow-sm" style="border-radius: 12px;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 class="fw-bold mb-1">${o.customerName}</h5>
                                <div class="text-muted small">
                                    <span class="me-3"><i class="fas fa-envelope me-1"></i>${o.email}</span>
                                    <span class="me-3"><i class="fas fa-phone me-1"></i>${o.mobile}</span>
                                </div>
                                <div class="text-muted small mt-1">
                                    <i class="fas fa-map-marker-alt me-1"></i>${o.address}
                                </div>
                            </div>
                            <span class="badge ${statusBadge} px-3 py-2" style="border-radius: 20px;">${(o.status || 'pending').toUpperCase()}</span>
                        </div>
                        
                        <div class="bg-light p-3 rounded mb-3">
                            <h6 class="fw-bold mb-2">Order Items:</h6>
                            <ul class="list-unstyled mb-0">
                                ${o.items?.map(item => `
                                    <li class="d-flex justify-content-between border-bottom border-light pb-2 mb-2 last-child-no-border">
                                        <span>${item.name} <span class="text-muted">x ${item.qty}</span></span>
                                        <span class="fw-bold">₹${item.price * item.qty}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-info proc-order flex-grow-1" data-id="${id}">
                                <i class="fas fa-spinner me-1"></i> Mark Processing
                            </button>
                            <button class="btn btn-sm btn-outline-success comp-order flex-grow-1" data-id="${id}">
                                <i class="fas fa-check me-1"></i> Mark Completed
                            </button>
                            <button class="btn btn-sm btn-outline-danger del-order" data-id="${id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        document.querySelectorAll('.proc-order').forEach(btn => {
            btn.addEventListener('click', () => update(ref(db, `orders/${currentUser.uid}/${btn.dataset.id}`), { status: 'processing' }));
        });
        document.querySelectorAll('.comp-order').forEach(btn => {
            btn.addEventListener('click', () => update(ref(db, `orders/${currentUser.uid}/${btn.dataset.id}`), { status: 'completed' }));
        });
        document.querySelectorAll('.del-order').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this order?')) {
                    remove(ref(db, `orders/${currentUser.uid}/${btn.dataset.id}`));
                }
            });
        });
    });
}

// ---------- BUILDER & PUBLISH SECTION ----------
function renderBuilder(panel) {
    panel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3 class="fw-bold">Website Builder</h3>
            <div>
                <button class="btn btn-outline-secondary me-2 shadow-sm" id="preview-site">
                    <i class="fas fa-eye me-2"></i>Preview
                </button>
                <button class="btn btn-gradient shadow-sm" id="publish-site">
                    <i class="fas fa-rocket me-2"></i>Publish
                </button>
            </div>
        </div>
        <div class="alert alert-info border-0 shadow-sm" style="border-radius: 10px;">
            <div class="d-flex align-items-center">
                <i class="fas fa-info-circle fa-2x me-3"></i>
                <div>
                    <strong>Current Template:</strong> ${userProfile.template || 'Not selected'} <br>
                    <span class="small">Make your edits below. Remember to click "Save Changes" before publishing.</span>
                </div>
            </div>
        </div>
        <div class="mt-4 card border-0 shadow-sm" style="border-radius: 12px;">
            <div class="card-body p-4">
                <h5 class="fw-bold mb-1">Edit Your Store HTML</h5>
                <p class="text-secondary small mb-3">Use placeholders like {{businessName}}, {{email}}, {{mobile}} for dynamic content.</p>
                <form id="storeContentForm">
                    <textarea class="form-control font-monospace bg-light text-dark" id="store-html" rows="20" style="font-size: 14px; border-radius: 8px; border: 1px solid #dee2e6;"></textarea>
                    <button class="btn btn-primary mt-3 py-2 px-4 fw-bold shadow-sm" type="submit" style="border-radius: 8px;">
                        <i class="fas fa-save me-2"></i>Save Changes
                    </button>
                </form>
            </div>
        </div>
    `;
    
    loadTemplateContent();
    
    document.getElementById('preview-site').addEventListener('click', previewSite);
    document.getElementById('publish-site').addEventListener('click', publishFlow);
    document.getElementById('storeContentForm').addEventListener('submit', async e => {
        e.preventDefault();
        await saveTemplateContent();
    });
}

async function loadTemplateContent() {
    const tmp = userProfile.template || 'temp1';
    try {
        const res = await fetch(`${tmp}.html`);
        let html = await res.text();
        html = html.replace(/{{businessName}}/g, userProfile.businessName || 'My Store')
                   .replace(/{{fullName}}/g, userProfile.fullName || '')
                   .replace(/{{email}}/g, userProfile.contactEmail || '')
                   .replace(/{{mobile}}/g, userProfile.mobile || '');
        
        const savedSnap = await get(ref(db, `sites/${currentUser.uid}/content`));
        const savedHtml = savedSnap.val();
        document.getElementById('store-html').value = savedHtml || html;
    } catch (err) {
        console.error('Error loading template:', err);
        document.getElementById('store-html').value = '\n<h1>Welcome to my store</h1>';
    }
}

async function saveTemplateContent() {
    const content = document.getElementById('store-html').value;
    const btn = document.querySelector('#storeContentForm button');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
    btn.disabled = true;
    
    try {
        await set(ref(db, `sites/${currentUser.uid}/content`), content);
        btn.innerHTML = '<i class="fas fa-check me-2"></i>Saved!';
        btn.classList.replace('btn-primary', 'btn-success');
    } catch(err) {
        alert("Error saving: " + err.message);
    } finally {
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.replace('btn-success', 'btn-primary');
            btn.disabled = false;
        }, 2000);
    }
}

function previewSite() {
    const content = document.getElementById('store-html').value;
    const html = `
        <div class="modal-header border-0 pb-0">
            <h5 class="modal-title fw-bold"><i class="fas fa-eye me-2 text-primary"></i>Live Preview</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body p-0 mt-3" style="height: 75vh; border-top: 1px solid #eee;">
            <iframe id="dynamic-preview-iframe" style="width: 100%; height: 100%; border: none; background: #fff;"></iframe>
        </div>
    `;
    
    showModal(html, 'lg');
    
    setTimeout(() => {
        document.getElementById('dynamic-preview-iframe').srcdoc = content;
    }, 100);
}

function showPublishedSuccessModal(siteUrl) {
    const html = `
        <div class="modal-header border-0 pb-0">
            <h5 class="text-success fw-bold"><i class="fas fa-check-circle me-2"></i>Site is Live!</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body text-center pb-4">
            <p class="mb-3 text-secondary">Your store is successfully published and accessible at:</p>
            <div class="bg-light p-3 shadow-sm mb-4" style="border-radius: 12px; border: 1px dashed #ccc;">
                <a href="${siteUrl}" target="_blank" class="h5 d-block text-primary text-decoration-none fw-bold mb-0" style="word-break: break-all;">${siteUrl}</a>
            </div>
            <div class="d-flex flex-column flex-md-row justify-content-center gap-3">
                <a href="${siteUrl}" target="_blank" class="btn btn-gradient py-2 px-4 fw-bold">
                    <i class="fas fa-external-link-alt me-2"></i>Open Store
                </a>
                <button class="btn btn-outline-secondary py-2 px-4 fw-bold" id="copySiteLink">
                    <i class="far fa-copy me-2"></i>Copy Link
                </button>
            </div>
        </div>
    `;
    const modal = showModal(html);
    
    document.getElementById('copySiteLink').addEventListener('click', (e) => {
        navigator.clipboard.writeText(siteUrl);
        const originalText = e.target.innerHTML;
        e.target.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
        setTimeout(() => e.target.innerHTML = originalText, 2000);
    });
}

async function publishFlow() {
    const siteSnap = await get(ref(db, `sites/${currentUser.uid}/published`));
    const isPublished = siteSnap.val();
    
    // Create a clean URL-friendly sitename from username (or fallback to UID)
    let rawName = userProfile.username || currentUser.uid.substring(0, 8);
    const sitename = rawName.toLowerCase().replace(/[^a-z0-9]/g, ''); 
    
    // Dynamic domain path matching GitHub URL params logic
    const siteUrl = `${window.location.origin}${window.location.pathname}?user=${sitename}`;

    if (isPublished) {
        showPublishedSuccessModal(siteUrl);
        return;
    }

    const html = `
        <div class="modal-header border-0 pb-0">
            <h5 class="fw-bold">Enter Product Key</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <p class="text-muted">To publish your site for the first time, please enter a valid product key provided by the admin.</p>
            <input id="keyInput" class="form-control form-control-lg text-center font-monospace bg-light border-0 shadow-sm" placeholder="XXXX-XXXX-XXXX" maxlength="14" style="letter-spacing: 2px;">
            <div id="keyFeedback" class="mt-2 small text-danger fw-bold text-center"></div>
        </div>
        <div class="modal-footer border-0 pt-0">
            <button class="btn btn-gradient w-100 py-2 fw-bold" id="validateKey">Publish Site Now</button>
        </div>
    `;
    
    const modal = showModal(html);
    
    document.getElementById('validateKey').addEventListener('click', async () => {
        const key = document.getElementById('keyInput').value.trim().toUpperCase();
        const feedback = document.getElementById('keyFeedback');
        const btn = document.getElementById('validateKey');
        
        if (!key.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
            feedback.innerText = 'Invalid format. Use XXXX-XXXX-XXXX';
            return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        
        try {
            const keySnap = await get(ref(db, `keys/${key}`));
            if (!keySnap.exists()) {
                feedback.innerText = 'Invalid product key.';
                return;
            }
            
            const keyData = keySnap.val();
            if (keyData.used) {
                feedback.innerText = 'This key has already been used.';
                return;
            }
            if (Date.now() > keyData.expiry) {
                feedback.innerText = 'This key has expired.';
                return;
            }
            if (keyData.userId !== currentUser.uid) {
                feedback.innerText = 'This key is not assigned to your account.';
                return;
            }
            
            await update(ref(db, `keys/${key}`), { used: true, usedAt: Date.now() });
            await set(ref(db, `sites/${currentUser.uid}/published`), true);
            
            bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
            showPublishedSuccessModal(siteUrl);
            
        } catch (error) {
            feedback.innerText = 'Error verifying key. Try again.';
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Publish Site Now';
        }
    });
}

// ---------- SETTINGS SECTION ----------
function renderSettings(panel) {
    panel.innerHTML = `
        <h3 class="fw-bold mb-4">Account Settings</h3>
        <div class="card border-0 shadow-sm" style="border-radius: 12px;">
            <div class="card-body p-4">
                <h5 class="fw-bold mb-3 border-bottom pb-2">Profile Information</h5>
                <form id="settingsForm">
                    <div class="mb-3">
                        <label class="form-label fw-bold">Business Name</label>
                        <input class="form-control" name="businessName" value="${userProfile.businessName || ''}" placeholder="Your store name">
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold">Contact Email</label>
                            <input type="email" class="form-control" name="contactEmail" value="${userProfile.contactEmail || ''}" placeholder="store@example.com">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label fw-bold">Mobile Number</label>
                            <input type="tel" class="form-control" name="mobile" value="${userProfile.mobile || ''}" placeholder="+91 XXXXX XXXXX">
                        </div>
                    </div>
                    <div class="mb-4">
                        <label class="form-label fw-bold">Username <span class="text-muted fw-normal">(Used for store link)</span></label>
                        <input class="form-control bg-light" name="username" value="${userProfile.username || ''}" readonly title="Username cannot be changed easily">
                    </div>
                    <button type="submit" class="btn btn-primary px-4 py-2 fw-bold shadow-sm" style="border-radius: 8px;">
                        <i class="fas fa-save me-2"></i>Save Changes
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('settingsForm').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        // Do not update username here as it's readonly
        delete data.username; 
        
        await update(ref(db, `users/${currentUser.uid}`), data);
        userProfile = { ...userProfile, ...data };
        
        const btn = e.submitter;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check me-2"></i>Saved!';
        btn.classList.replace('btn-primary', 'btn-success');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.replace('btn-success', 'btn-primary');
        }, 2000);
        
        setupNavigation();
    });
}

// ---------- ADMIN DASHBOARD LOGIC ----------
function initAdminPage() {
    onAuthStateChanged(auth, user => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        setupAdminUI();
    });
}

function setupAdminUI() {
    document.body.innerHTML = `
        <div class="container mt-5 pt-3">
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card border-0 shadow-lg" style="border-radius: 15px; overflow: hidden;">
                        <div class="card-header bg-dark text-white p-4 border-0">
                            <h4 class="mb-0 fw-bold"><i class="fas fa-user-shield me-2 text-warning"></i>Super Admin Dashboard</h4>
                            <p class="mb-0 small text-light opacity-75 mt-1">Generate product keys for store publishing</p>
                        </div>
                        <div class="card-body p-4 bg-light">
                            <div class="card border-0 shadow-sm mb-4" style="border-radius: 10px;">
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label class="form-label fw-bold text-secondary">User Email, Username, or UID</label>
                                        <input id="adminUserIdentifier" class="form-control form-control-lg bg-light border-0" placeholder="e.g. storeowner@mail.com">
                                    </div>
                                    <div class="mb-4">
                                        <label class="form-label fw-bold text-secondary">Key Validity (Days)</label>
                                        <input id="adminDays" type="number" class="form-control form-control-lg bg-light border-0" value="30">
                                    </div>
                                    <button class="btn btn-primary btn-lg w-100 fw-bold shadow-sm" id="genKeyBtn" style="border-radius: 10px;">
                                        <i class="fas fa-key me-2"></i>Generate Secure Key
                                    </button>
                                </div>
                            </div>
                            <div id="keyResult"></div>
                        </div>
                    </div>
                    <div class="text-center mt-4">
                        <button class="btn btn-outline-secondary rounded-pill px-4" id="logoutAdmin">
                            <i class="fas fa-sign-out-alt me-2"></i>Exit Admin Panel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const genBtn = document.getElementById('genKeyBtn');
    const identifierInput = document.getElementById('adminUserIdentifier');
    const daysInput = document.getElementById('adminDays');
    const resultDiv = document.getElementById('keyResult');
    const logoutBtn = document.getElementById('logoutAdmin');

    if (!genBtn) return; 

    genBtn.addEventListener('click', async () => {
        const identifier = identifierInput.value.trim();
        const days = parseInt(daysInput.value);
        if (!identifier || !days) {
            alert('Please enter both user identifier and days');
            return;
        }

        genBtn.disabled = true;
        genBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Searching User...';

        try {
            const usersSnap = await get(ref(db, 'users'));
            if (!usersSnap.exists()) {
                resultDiv.innerHTML = `<div class="alert alert-danger border-0 shadow-sm" style="border-radius: 10px;"><i class="fas fa-exclamation-triangle me-2"></i>No users found in database</div>`;
                return;
            }

            const users = usersSnap.val();
            let targetUid = null;
            let targetUserData = null;

            // Search by email
            for (const [uid, data] of Object.entries(users)) {
                if (data.email && data.email.toLowerCase() === identifier.toLowerCase()) {
                    targetUid = uid;
                    targetUserData = data;
                    break;
                }
            }

            // Search by username
            if (!targetUid) {
                for (const [uid, data] of Object.entries(users)) {
                    if (data.username && data.username.toLowerCase() === identifier.toLowerCase()) {
                        targetUid = uid;
                        targetUserData = data;
                        break;
                    }
                }
            }

            // Search by direct UID
            if (!targetUid && users[identifier]) {
                targetUid = identifier;
                targetUserData = users[identifier];
            }

            if (!targetUid) {
                resultDiv.innerHTML = `<div class="alert alert-warning border-0 shadow-sm" style="border-radius: 10px;"><i class="fas fa-search me-2"></i>User not found with identifier: <strong>${identifier}</strong></div>`;
                return;
            }

            // Generate key
            const key = generateKey();
            const expiry = Date.now() + (days * 24 * 60 * 60 * 1000);

            await set(ref(db, `keys/${key}`), {
                userId: targetUid,
                userEmail: targetUserData.email || '',
                userName: targetUserData.username || targetUserData.fullName || '',
                expiry: expiry,
                used: false,
                createdAt: Date.now()
            });

            resultDiv.innerHTML = `
                <div class="alert alert-success border-0 shadow-sm" style="border-radius: 10px; border-left: 5px solid #198754 !important;">
                    <h5 class="fw-bold mb-3"><i class="fas fa-check-circle me-2"></i>Key Generated Successfully</h5>
                    <div class="bg-white p-3 text-center mb-3 border" style="border-radius: 8px;">
                        <h3 class="font-monospace mb-2 text-dark tracking-wide" style="letter-spacing: 2px;">${key}</h3>
                        <button class="btn btn-sm btn-outline-success rounded-pill px-3 copy-key" data-key="${key}">
                            <i class="far fa-copy me-1"></i> Copy Key
                        </button>
                    </div>
                    <div class="small text-dark">
                        <div class="d-flex justify-content-between border-bottom pb-1 mb-1">
                            <span class="text-muted">Target User:</span> 
                            <span class="fw-bold">${targetUserData.username || targetUserData.email || targetUid}</span>
                        </div>
                        <div class="d-flex justify-content-between border-bottom pb-1 mb-1">
                            <span class="text-muted">Validity:</span> 
                            <span class="fw-bold">${days} Days</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span class="text-muted">Expires On:</span> 
                            <span class="fw-bold">${new Date(expiry).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `;

            document.querySelector('.copy-key')?.addEventListener('click', (e) => {
                const keyToCopy = e.target.closest('button').dataset.key;
                navigator.clipboard?.writeText(keyToCopy);
                const originalHtml = e.target.closest('button').innerHTML;
                e.target.closest('button').innerHTML = '<i class="fas fa-check me-1"></i> Copied!';
                setTimeout(() => e.target.closest('button').innerHTML = originalHtml, 2000);
            });

        } catch (error) {
            console.error(error);
            resultDiv.innerHTML = `<div class="alert alert-danger border-0 shadow-sm" style="border-radius: 10px;">Error generating key: ${error.message}</div>`;
        } finally {
            genBtn.disabled = false;
            genBtn.innerHTML = '<i class="fas fa-key me-2"></i>Generate Secure Key';
        }
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = 'login.html');
    });
}

function generateKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 4; i++) key += chars[Math.floor(Math.random() * chars.length)];
    key += '-';
    for (let i = 0; i < 4; i++) key += chars[Math.floor(Math.random() * chars.length)];
    key += '-';
    for (let i = 0; i < 4; i++) key += chars[Math.floor(Math.random() * chars.length)];
    return key;
}
