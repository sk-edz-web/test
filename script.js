// script.js – Full working version with User Lookup, Fixed Preview, Fixed Card Count & Direct Publish

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

const isLoginPage = window.location.pathname.includes('login.html');
const isAdminPage = window.location.pathname.includes('admin.html');

if (isLoginPage) {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else if (isAdminPage) {
    document.addEventListener('DOMContentLoaded', initAdminPage);
} else {
    document.addEventListener('DOMContentLoaded', initMainApp);
}

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
    // Fixed: Checking both 'free' and 'freeCards'
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
            selectedTemplate = tmp;
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
    // Fixed: Grabbing correct free card value for dashboard UI
    const totalFree = userProfile.subscription?.free || userProfile.subscription?.freeCards || 0;
    
    panel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Dashboard</h3>
            ${!userProfile.onboardingComplete || !userProfile.subscription?.activated ? 
                '<button class="btn btn-gradient" id="resume-onboarding">Resume Setup</button>' : ''}
        </div>
        <p class="lead">Welcome, ${userProfile.businessName || 'Store Owner'}!</p>
        <div class="row mt-4">
            <div class="col-md-4 mb-3">
                <div class="card p-4">
                    <h6 class="text-secondary">Products</h6>
                    <h2 id="prod-count">0</h2>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card p-4">
                    <h6 class="text-secondary">Orders</h6>
                    <h2 id="order-count">0</h2>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card p-4">
                    <h6 class="text-secondary">Free Cards Used</h6>
                    <h2 id="cards-used">${userProfile.subscription?.usedCards || 0} / ${totalFree}</h2>
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

function renderProducts(panel) {
    panel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Product Management</h3>
            <button class="btn btn-gradient" id="add-product-btn">
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
        <div class="modal-header">
            <h5>${product ? 'Edit' : 'Add'} Product</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <form id="prodForm">
                <input name="id" type="hidden" value="${product?.id || ''}">
                <div class="mb-3">
                    <label>Product Name</label>
                    <input name="name" class="form-control" value="${product?.name || ''}" required>
                </div>
                <div class="mb-3">
                    <label>Price (₹)</label>
                    <input name="price" type="number" step="0.01" class="form-control" value="${product?.price || ''}" required>
                </div>
                <div class="mb-3">
                    <label>Description</label>
                    <textarea name="desc" class="form-control" rows="3">${product?.desc || ''}</textarea>
                </div>
                <div class="mb-3">
                    <label>Image URL</label>
                    <input name="image" class="form-control" value="${product?.image || ''}" placeholder="https://...">
                </div>
                <button type="submit" class="btn btn-gradient w-100">Save Product</button>
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
        container.innerHTML = '<div class="col-12 text-center py-5 text-secondary">No products yet. Click "Add Product" to get started.</div>';
        return;
    }
    
    container.innerHTML = '';
    Object.entries(products).forEach(([id, p]) => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-3';
        col.innerHTML = `
            <div class="card card-product h-100">
                ${p.image ? `<img src="${p.image}" class="card-img-top" style="height: 180px; object-fit: cover;">` : 
                '<div class="bg-light text-center py-5"><i class="fas fa-box fa-3x text-secondary"></i></div>'}
                <div class="card-body">
                    <h5 class="card-title">${p.name}</h5>
                    <p class="card-text text-muted">₹${p.price}</p>
                    <p class="card-text small">${p.desc || ''}</p>
                </div>
                <div class="card-footer bg-transparent border-0 pb-3">
                    <button class="btn btn-sm btn-outline-secondary me-2 edit-prod" data-id="${id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger del-prod" data-id="${id}">
                        <i class="fas fa-trash"></i> Delete
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
            if (confirm('Delete this product?')) {
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
    
    // Fixed: Checking both 'free' and 'freeCards'
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

function renderOrders(panel) {
    panel.innerHTML = `
        <h3 class="mb-4">Order Management</h3>
        <div id="order-list"></div>
    `;
    
    onValue(ref(db, `orders/${currentUser.uid}`), snap => {
        const orders = snap.val() || {};
        const container = document.getElementById('order-list');
        
        if (Object.keys(orders).length === 0) {
            container.innerHTML = '<p class="text-center py-4 text-secondary">No orders yet.</p>';
            return;
        }
        
        let html = '';
        Object.entries(orders).forEach(([id, o]) => {
            const statusBadge = {
                'pending': 'bg-warning',
                'processing': 'bg-info',
                'completed': 'bg-success'
            }[o.status] || 'bg-secondary';
            
            html += `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5>${o.customerName}</h5>
                                <p class="mb-1"><i class="fas fa-envelope me-2"></i>${o.email}</p>
                                <p class="mb-1"><i class="fas fa-phone me-2"></i>${o.mobile}</p>
                                <p class="mb-1"><i class="fas fa-map-marker-alt me-2"></i>${o.address}</p>
                            </div>
                            <span class="badge ${statusBadge}">${o.status || 'pending'}</span>
                        </div>
                        <hr>
                        <h6>Order Items:</h6>
                        <ul>
                            ${o.items?.map(item => `<li>${item.name} x ${item.qty} - ₹${item.price * item.qty}</li>`).join('')}
                        </ul>
                        <div class="mt-3">
                            <button class="btn btn-sm btn-outline-primary proc-order" data-id="${id}">
                                <i class="fas fa-spinner"></i> Processing
                            </button>
                            <button class="btn btn-sm btn-outline-success comp-order" data-id="${id}">
                                <i class="fas fa-check"></i> Completed
                            </button>
                            <button class="btn btn-sm btn-outline-danger del-order" data-id="${id}">
                                <i class="fas fa-trash"></i> Delete
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
                if (confirm('Delete this order?')) {
                    remove(ref(db, `orders/${currentUser.uid}/${btn.dataset.id}`));
                }
            });
        });
    });
}

function renderBuilder(panel) {
    panel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Website Builder</h3>
            <div>
                <button class="btn btn-outline-secondary me-2" id="preview-site">
                    <i class="fas fa-eye me-2"></i>Preview
                </button>
                <button class="btn btn-gradient" id="publish-site">
                    <i class="fas fa-rocket me-2"></i>Publish
                </button>
            </div>
        </div>
        <div class="alert alert-info">
            <i class="fas fa-info-circle me-2"></i>
            Current Template: <strong>${userProfile.template || 'Not selected'}</strong>
        </div>
        <div class="mt-4">
            <h5>Edit Your Store HTML</h5>
            <p class="text-secondary small">Use placeholders like {{businessName}}, {{email}}, {{mobile}} for dynamic content.</p>
            <form id="storeContentForm">
                <textarea class="form-control font-monospace" id="store-html" rows="20" style="font-size: 14px;"></textarea>
                <button class="btn btn-primary mt-3" type="submit">
                    <i class="fas fa-save me-2"></i>Save Changes
                </button>
            </form>
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
        document.getElementById('store-html').value = '<h1>Error loading template</h1>';
    }
}

async function saveTemplateContent() {
    const content = document.getElementById('store-html').value;
    await set(ref(db, `sites/${currentUser.uid}/content`), content);
    alert('Content saved successfully!');
}

function previewSite() {
    const content = document.getElementById('store-html').value;
    const html = `
        <div class="modal-header">
            <h5 class="modal-title"><i class="fas fa-eye me-2"></i>Live Preview</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body p-0" style="height: 70vh;">
            <iframe id="dynamic-preview-iframe" style="width: 100%; height: 100%; border: none;"></iframe>
        </div>
    `;
    
    showModal(html, 'lg');
    
    setTimeout(() => {
        document.getElementById('dynamic-preview-iframe').srcdoc = content;
    }, 100);
}

// Function to handle the success UI for publishing
function showPublishedSuccessModal(siteUrl) {
    const html = `
        <div class="modal-header">
            <h5 class="text-success"><i class="fas fa-check-circle me-2"></i>Site is Live!</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body text-center">
            <p class="mb-3">Your store is successfully published and accessible at:</p>
            <div class="bg-light p-3 rounded mb-4">
                <a href="${siteUrl}" target="_blank" class="h5 d-block text-primary text-decoration-none" style="word-break: break-all;">${siteUrl}</a>
            </div>
            <div class="d-flex flex-column flex-md-row justify-content-center gap-3">
                <a href="${siteUrl}" target="_blank" class="btn btn-gradient">
                    <i class="fas fa-external-link-alt me-2"></i>Open Link
                </a>
                <button class="btn btn-outline-secondary" id="copySiteLink">
                    <i class="far fa-copy me-2"></i>Copy Link
                </button>
            </div>
        </div>
    `;
    const modal = showModal(html);
    
    document.getElementById('copySiteLink').addEventListener('click', () => {
        navigator.clipboard.writeText(siteUrl);
        alert('Link copied to clipboard!');
    });
}

// Fixed: Checks if already published, otherwise asks for key.
async function publishFlow() {
    const siteSnap = await get(ref(db, `sites/${currentUser.uid}/published`));
    const isPublished = siteSnap.val();
    const subdomain = `${currentUser.uid.substring(0, 8)}.skcommerse.com`;
    const siteUrl = `https://${subdomain}`;

    // Direct link popup if already published
    if (isPublished) {
        showPublishedSuccessModal(siteUrl);
        return;
    }

    const html = `
        <div class="modal-header">
            <h5>Enter Product Key</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <p>To publish your site, enter a valid product key.</p>
            <input id="keyInput" class="form-control text-center font-monospace" placeholder="XXXX-XXXX-XXXX" maxlength="14">
            <div id="keyFeedback" class="mt-2 small text-danger"></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-gradient" id="validateKey">Publish Site</button>
        </div>
    `;
    
    const modal = showModal(html);
    
    document.getElementById('validateKey').addEventListener('click', async () => {
        const key = document.getElementById('keyInput').value.trim().toUpperCase();
        const feedback = document.getElementById('keyFeedback');
        
        if (!key.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
            feedback.innerText = 'Invalid key format. Use XXXX-XXXX-XXXX';
            return;
        }
        
        const keySnap = await get(ref(db, `keys/${key}`));
        if (!keySnap.exists()) {
            feedback.innerText = 'Invalid key';
            return;
        }
        
        const keyData = keySnap.val();
        if (keyData.used) {
            feedback.innerText = 'This key has already been used';
            return;
        }
        if (Date.now() > keyData.expiry) {
            feedback.innerText = 'This key has expired';
            return;
        }
        if (keyData.userId !== currentUser.uid) {
            feedback.innerText = 'This key is not assigned to your account';
            return;
        }
        
        await update(ref(db, `keys/${key}`), { used: true, usedAt: Date.now() });
        await set(ref(db, `sites/${currentUser.uid}/published`), true);
        
        bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
        showPublishedSuccessModal(siteUrl);
    });
}

function renderSettings(panel) {
    panel.innerHTML = `
        <h3>Account Settings</h3>
        <div class="card mt-4">
            <div class="card-body">
                <h5>Profile Information</h5>
                <form id="settingsForm">
                    <div class="mb-3">
                        <label>Business Name</label>
                        <input class="form-control" name="businessName" value="${userProfile.businessName || ''}">
                    </div>
                    <div class="mb-3">
                        <label>Contact Email</label>
                        <input type="email" class="form-control" name="contactEmail" value="${userProfile.contactEmail || ''}">
                    </div>
                    <div class="mb-3">
                        <label>Mobile Number</label>
                        <input type="tel" class="form-control" name="mobile" value="${userProfile.mobile || ''}">
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('settingsForm').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        await update(ref(db, `users/${currentUser.uid}`), data);
        userProfile = { ...userProfile, ...data };
        alert('Settings saved!');
        setupNavigation();
    });
}

// ---------- ADMIN PAGE ----------
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
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-dark text-white">
                            <h4>Super Admin - Key Generator</h4>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label>User Email, Username, or UID</label>
                                <input id="adminUserIdentifier" class="form-control" placeholder="Enter identifier">
                            </div>
                            <div class="mb-3">
                                <label>Validity (Days)</label>
                                <input id="adminDays" type="number" class="form-control" value="30">
                            </div>
                            <button class="btn btn-primary w-100" id="genKeyBtn">Generate Key</button>
                            <div id="keyResult" class="mt-4"></div>
                        </div>
                    </div>
                    <button class="btn btn-secondary mt-3" id="logoutAdmin">Logout</button>
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

        const usersSnap = await get(ref(db, 'users'));
        if (!usersSnap.exists()) {
            resultDiv.innerHTML = `<div class="alert alert-danger">No users found in database</div>`;
            return;
        }

        const users = usersSnap.val();
        let targetUid = null;
        let targetUserData = null;

        for (const [uid, data] of Object.entries(users)) {
            if (data.email && data.email.toLowerCase() === identifier.toLowerCase()) {
                targetUid = uid;
                targetUserData = data;
                break;
            }
        }

        if (!targetUid) {
            for (const [uid, data] of Object.entries(users)) {
                if (data.username && data.username.toLowerCase() === identifier.toLowerCase()) {
                    targetUid = uid;
                    targetUserData = data;
                    break;
                }
            }
        }

        if (!targetUid && users[identifier]) {
            targetUid = identifier;
            targetUserData = users[identifier];
        }

        if (!targetUid) {
            resultDiv.innerHTML = `<div class="alert alert-warning">User not found with email/username: ${identifier}</div>`;
            return;
        }

        const key = generateKey();
        const expiry = Date.now() + (days * 24 * 60 * 60 * 1000);

        try {
            await set(ref(db, `keys/${key}`), {
                userId: targetUid,
                userEmail: targetUserData.email || '',
                userName: targetUserData.username || targetUserData.fullName || '',
                expiry: expiry,
                used: false,
                createdAt: Date.now()
            });

            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <h5><i class="fas fa-check-circle me-2"></i>Key Generated</h5>
                    <div class="key-display my-3">
                        <h2 class="font-monospace mb-2">${key}</h2>
                        <button class="btn btn-sm btn-outline-secondary copy-key" data-key="${key}">
                            <i class="far fa-copy"></i> Copy
                        </button>
                    </div>
                    <p class="mb-1"><strong>User:</strong> ${targetUserData.email || targetUserData.username || targetUid}</p>
                    <p class="mb-1"><strong>Expires in:</strong> ${days} days</p>
                    <p class="mb-0 small text-secondary">Expiry date: ${new Date(expiry).toLocaleString()}</p>
                </div>
            `;

            document.querySelector('.copy-key')?.addEventListener('click', (e) => {
                const keyToCopy = e.target.closest('button').dataset.key;
                navigator.clipboard?.writeText(keyToCopy);
                alert('Key copied to clipboard');
            });

        } catch (error) {
            console.error(error);
            resultDiv.innerHTML = `<div class="alert alert-danger">Error generating key: ${error.message}</div>`;
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