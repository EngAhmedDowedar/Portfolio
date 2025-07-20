// js/admin.js

// استيراد الخدمات التي نحتاجها من Firebase
import { auth, db } from '../firebase/config.js';
import { onAuthStateChanged, signOut, sendPasswordResetEmail, updatePassword, updateEmail } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc, deleteDoc, increment } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const { createApp, computed } = Vue;

// (مُحدّث) هذا الجزء الآن يتحقق من دور المستخدم قبل إظهار الصفحة
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 1. المستخدم مسجل دخوله، الآن سنتحقق من دوره
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        // 2. التحقق من أن المستخدم لديه role === 'admin'
        if (docSnap.exists() && docSnap.data().role === 'admin') {
            // 3. إذا كان مديرًا، اسمح له بالدخول وقم بتهيئة التطبيق
            document.getElementById('admin-app').classList.remove('hidden');
            createVueApp();
        } else {
            // 4. إذا كان مستخدمًا عاديًا، امنعه من الدخول ووجهه للصفحة الرئيسية
            console.log("Access Denied: User is not an admin.");
            alert("ليس لديك صلاحية الوصول لهذه الصفحة."); // رسالة تنبيه
            window.location.replace('index.html');
        }
    } else {
        // إذا لم يكن هناك أي مستخدم مسجل دخوله، وجهه لصفحة تسجيل الدخول
        window.location.replace('login.html');
    }
});

function createVueApp() {
    createApp({
        data() {
            return {
                currentView: 'purchaseOrders', // العرض الافتراضي
                purchaseOrders: [],
                fundRequests: [],
                services: [],
                users: [],
                isLoading: true,
                isSidebarOpen: false,
                // مودال الخدمات
                isModalOpen: false,
                isEditing: false,
                serviceForm: { id: '', name: '', logo: '', category: 'game', conversionRate: 0, packages: [] },
                newLogoBase64: '',
                // مودال طلبات الشراء
                isOrderModalOpen: false,
                selectedOrder: null,
                // مودال طلبات شحن الرصيد
                isFundRequestModalOpen: false,
                selectedFundRequest: null,
                // مودال تعديل المستخدم
                isUserEditModalOpen: false,
                userEditForm: {},
                // مودال إدارة حسابي
                adminProfile: null,
                adminProfileForm: { displayName: '', username: '' },
                adminEmailForm: { newEmail: '' },
                adminPasswordForm: { newPassword: '', confirmPassword: '' },
                adminPasswordFieldType: 'password',
                // دوال إلغاء الاشتراك
                unsubscribePurchases: null,
                unsubscribeFunds: null,
                unsubscribeServices: null,
                unsubscribeUsers: null,
                unsubscribeAdmin: null
            };
        },
        computed: {
            pageTitle() {
                if (this.currentView === 'purchaseOrders') return 'طلبات الشراء';
                if (this.currentView === 'fundRequests') return 'طلبات شحن الرصيد';
                if (this.currentView === 'services') return 'إدارة الخدمات';
                if (this.currentView === 'users') return 'إدارة المستخدمين';
                if (this.currentView === 'adminProfile') return 'إدارة حسابي';
                return 'لوحة التحكم';
            }
        },
        watch: {
            currentView(newView) {
                this.isLoading = true;
                if (this.unsubscribePurchases) this.unsubscribePurchases();
                if (this.unsubscribeFunds) this.unsubscribeFunds();
                if (this.unsubscribeServices) this.unsubscribeServices();
                if (this.unsubscribeUsers) this.unsubscribeUsers();
                if (this.unsubscribeAdmin) this.unsubscribeAdmin();

                if (newView === 'purchaseOrders') this.fetchPurchaseOrders();
                else if (newView === 'fundRequests') this.fetchFundRequests();
                else if (newView === 'services') this.fetchServices();
                else if (newView === 'users') this.fetchUsers();
                else if (newView === 'adminProfile') this.fetchAdminData();
            }
        },
        mounted() {
            this.fetchPurchaseOrders();
        },
        beforeUnmount() {
            if (this.unsubscribePurchases) this.unsubscribePurchases();
            if (this.unsubscribeFunds) this.unsubscribeFunds();
            if (this.unsubscribeServices) this.unsubscribeServices();
            if (this.unsubscribeUsers) this.unsubscribeUsers();
            if (this.unsubscribeAdmin) this.unsubscribeAdmin();
        },
        methods: {
            setView(view) {
                this.currentView = view;
                this.isSidebarOpen = false;
            },
            
            // --- دوال طلبات الشراء ---
            fetchPurchaseOrders() {
                this.isLoading = true;
                const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
                this.unsubscribePurchases = onSnapshot(q, (snapshot) => {
                    this.purchaseOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    this.isLoading = false;
                });
            },
            formatDate(timestamp) {
                if (!timestamp || !timestamp.toDate) return '...';
                return timestamp.toDate().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
            },
            async updateOrderStatus(order) {
                const confirmation = await Swal.fire({
                    title: 'تأكيد الإكمال',
                    html: `هل أنت متأكد من إكمال هذا الطلب؟ سيتم خصم <b>${order.price || order.amountUSD}$</b> من رصيد المستخدم.`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'نعم، قم بالإكمال!',
                    cancelButtonText: 'إلغاء'
                });

                if (confirmation.isConfirmed) {
                    const userDocRef = doc(db, "users", order.userId);
                    const orderRef = doc(db, "orders", order.id);
                    try {
                        await updateDoc(userDocRef, { walletBalance: increment(-(order.price || order.amountUSD)) });
                        await updateDoc(orderRef, { status: 'completed' });
                        Swal.fire('نجاح!', 'تم إكمال الطلب وخصم الرصيد.', 'success');
                    } catch (error) {
                        Swal.fire('خطأ', 'حدث خطأ أثناء إكمال الطلب.', 'error');
                    }
                }
            },
            async deleteOrder(orderId, playerId) {
                const result = await Swal.fire({
                    title: `هل أنت متأكد؟`, text: `سيتم حذف طلب اللاعب ${playerId} بشكل نهائي!`,
                    icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6', confirmButtonText: 'نعم، احذفه!', cancelButtonText: 'إلغاء'
                });
                if (result.isConfirmed) {
                    await deleteDoc(doc(db, "orders", orderId));
                    Swal.fire('تم الحذف!', 'تم حذف الطلب بنجاح.', 'success');
                }
            },
            async openOrderModal(order) {
                this.selectedOrder = { ...order, userDetails: null };
                this.isOrderModalOpen = true;
                try {
                    const userDoc = await getDoc(doc(db, "users", order.userId));
                    if (userDoc.exists()) { this.selectedOrder.userDetails = userDoc.data(); }
                } catch (e) { console.error("Error fetching user details for order:", e); }
            },
            closeOrderModal() { this.isOrderModalOpen = false; this.selectedOrder = null; },
            copyToClipboard(text, type) {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    Swal.fire({ toast: true, position: 'top-start', icon: 'success', title: `تم نسخ ${type}`, showConfirmButton: false, timer: 1500 });
                } catch (err) { console.error('Copy failed', err); }
                document.body.removeChild(textArea);
            },

            // --- دوال طلبات شحن الرصيد ---
            fetchFundRequests() {
                this.isLoading = true;
                const q = query(collection(db, "fundRequests"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
                this.unsubscribeFunds = onSnapshot(q, (snapshot) => {
                    this.fundRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    this.isLoading = false;
                });
            },
            async approveFundRequest(request) {
                const confirmation = await Swal.fire({
                    title: 'تأكيد الموافقة', html: `هل أنت متأكد من إضافة <b>${request.amount}$</b> إلى رصيد المستخدم <b>${request.userEmail}</b>؟`,
                    icon: 'question', showCancelButton: true, confirmButtonText: 'نعم، قم بالإضافة!', cancelButtonText: 'إلغاء'
                });
                if (confirmation.isConfirmed) {
                    const userDocRef = doc(db, "users", request.userId);
                    const fundRequestRef = doc(db, "fundRequests", request.id);
                    try {
                        await updateDoc(userDocRef, { walletBalance: increment(request.amount) });
                        await updateDoc(fundRequestRef, { status: 'approved' });
                        Swal.fire('نجاح!', 'تم إضافة الرصيد وتحديث الطلب بنجاح.', 'success');
                    } catch (error) { Swal.fire('خطأ', 'حدث خطأ أثناء الموافقة على الطلب.', 'error'); }
                }
            },
            async rejectFundRequest(request) {
                const confirmation = await Swal.fire({
                    title: 'تأكيد الرفض', text: `هل أنت متأكد من رفض طلب شحن الرصيد هذا؟`,
                    icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
                    confirmButtonText: 'نعم، قم بالرفض!', cancelButtonText: 'إلغاء'
                });
                if (confirmation.isConfirmed) {
                    const fundRequestRef = doc(db, "fundRequests", request.id);
                    await updateDoc(fundRequestRef, { status: 'rejected' });
                    Swal.fire('تم الرفض', 'تم رفض الطلب بنجاح.', 'info');
                }
            },
            async openFundRequestModal(request) {
                this.selectedFundRequest = { ...request, userDetails: null };
                this.isFundRequestModalOpen = true;
                try {
                    const userDoc = await getDoc(doc(db, "users", request.userId));
                    if (userDoc.exists()) { this.selectedFundRequest.userDetails = userDoc.data(); }
                } catch (e) { console.error("Error fetching user details for fund request:", e); }
            },
            closeFundRequestModal() { this.isFundRequestModalOpen = false; this.selectedFundRequest = null; },

            // --- دوال الخدمات ---
            fetchServices() {
                this.isLoading = true;
                const q = query(collection(db, "services"));
                this.unsubscribeServices = onSnapshot(q, (snapshot) => {
                    this.services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    this.isLoading = false;
                });
            },
            openServiceModal(service = null) {
                this.newLogoBase64 = '';
                if (service) {
                    this.isEditing = true;
                    this.serviceForm = { ...{ category: 'game', conversionRate: 0, packages: [] }, ...JSON.parse(JSON.stringify(service)) };
                } else {
                    this.isEditing = false;
                    this.serviceForm = { id: '', name: '', logo: '', category: 'game', conversionRate: 0, packages: [{ id: Math.random().toString(36).substring(2, 9), name: '', price: 0 }] };
                }
                this.isModalOpen = true;
            },
            handleLogoFileSelect(event) {
                const file = event.target.files[0];
                if (!file) return;
                new Compressor(file, {
                    quality: 0.6, maxWidth: 200, maxHeight: 200,
                    success: (compressedResult) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(compressedResult);
                        reader.onload = () => { this.newLogoBase64 = reader.result; };
                    },
                    error: (err) => { Swal.fire('خطأ', 'فشل ضغط الصورة.', 'error'); },
                });
            },
            addPackage() { this.serviceForm.packages.push({ id: Math.random().toString(36).substring(2, 9), name: '', price: 0 }); },
            removePackage(index) { this.serviceForm.packages.splice(index, 1); },
            async handleServiceSubmit() {
                if (!this.serviceForm.id || !this.serviceForm.name) { Swal.fire('خطأ', 'الرجاء ملء حقلي ID والاسم', 'error'); return; }
                const dataToSave = { ...this.serviceForm };
                if (this.newLogoBase64) { dataToSave.logo = this.newLogoBase64; }
                if (dataToSave.category === 'app' || dataToSave.category === 'number') { dataToSave.conversionRate = 0; }
                else { dataToSave.packages = []; }
                try {
                    await setDoc(doc(db, 'services', dataToSave.id), dataToSave, { merge: true });
                    Swal.fire('تم', `تم حفظ الخدمة بنجاح`, 'success');
                    this.isModalOpen = false;
                } catch (error) { Swal.fire('خطأ', 'لم يتم حفظ التغييرات.', 'error'); }
            },
            async deleteService(serviceId, serviceName) {
                const result = await Swal.fire({
                    title: `هل أنت متأكد من حذف خدمة "${serviceName}"؟`, text: "لا يمكن التراجع عن هذا الإجراء!",
                    icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6', confirmButtonText: 'نعم، احذفها!', cancelButtonText: 'إلغاء'
                });
                if (result.isConfirmed) {
                    await deleteDoc(doc(db, "services", serviceId));
                    Swal.fire('تم الحذف!', 'تم حذف الخدمة بنجاح.', 'success');
                }
            },

            // --- دوال المستخدمين ---
            fetchUsers() {
                this.isLoading = true;
                const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
                this.unsubscribeUsers = onSnapshot(q, (snapshot) => {
                    this.users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    this.isLoading = false;
                });
            },
            openUserEditModal(user) {
                this.userEditForm = JSON.parse(JSON.stringify(user));
                this.isUserEditModalOpen = true;
            },
            async handleUserUpdate() {
                const userRef = doc(db, "users", this.userEditForm.id);
                try {
                    await updateDoc(userRef, {
                        displayName: this.userEditForm.displayName,
                        username: this.userEditForm.username,
                        walletBalance: Number(this.userEditForm.walletBalance)
                    });
                    Swal.fire('نجاح', 'تم تحديث بيانات المستخدم بنجاح.', 'success');
                    this.isUserEditModalOpen = false;
                } catch (error) { Swal.fire('خطأ', 'فشل تحديث بيانات المستخدم.', 'error'); }
            },
            async sendPasswordReset(email) {
                try {
                    await sendPasswordResetEmail(auth, email);
                    Swal.fire('تم الإرسال', `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}`, 'success');
                } catch (error) { Swal.fire('خطأ', 'فشل إرسال البريد الإلكتروني.', 'error'); }
            },
            async deleteUser(userId, userEmail) {
                const result = await Swal.fire({
                    title: `هل أنت متأكد من حذف ${userEmail}؟`,
                    html: "سيتم حذف بيانات المستخدم (المحفظة، الطلبات، إلخ) نهائيًا.<br><b>ملاحظة:</b> هذا الإجراء لا يحذف حساب الدخول الخاص به من نظام المصادقة، يجب حذفه يدويًا من Firebase Console.",
                    icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
                    confirmButtonText: 'نعم، احذف بياناته!', cancelButtonText: 'إلغاء'
                });
                if (result.isConfirmed) {
                    try {
                        await deleteDoc(doc(db, "users", userId));
                        Swal.fire('تم الحذف!', `تم حذف بيانات المستخدم ${userEmail} بنجاح.`, 'success');
                    } catch (error) { Swal.fire('خطأ', 'فشل حذف بيانات المستخدم.', 'error'); }
                }
            },

            // --- دوال إدارة حساب المدير ---
            fetchAdminData() {
                this.isLoading = true;
                const adminUid = auth.currentUser.uid;
                const adminDocRef = doc(db, "users", adminUid);
                this.unsubscribeAdmin = onSnapshot(adminDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        this.adminProfile = docSnap.data();
                        this.adminProfileForm.displayName = this.adminProfile.displayName || '';
                        this.adminProfileForm.username = this.adminProfile.username || '';
                    }
                    this.isLoading = false;
                });
            },
            async updateAdminProfile() {
                const adminDocRef = doc(db, "users", auth.currentUser.uid);
                try {
                    await updateDoc(adminDocRef, {
                        displayName: this.adminProfileForm.displayName,
                        username: this.adminProfileForm.username
                    });
                    Swal.fire('نجاح', 'تم تحديث بياناتك بنجاح!', 'success');
                } catch (error) { Swal.fire('خطأ', 'فشل تحديث البيانات.', 'error'); }
            },
            async updateAdminEmail() {
                if (!this.adminEmailForm.newEmail) { Swal.fire('خطأ', 'الرجاء إدخال البريد الإلكتروني الجديد.', 'warning'); return; }
                try {
                    await updateEmail(auth.currentUser, this.adminEmailForm.newEmail);
                    const adminDocRef = doc(db, "users", auth.currentUser.uid);
                    await updateDoc(adminDocRef, { email: this.adminEmailForm.newEmail });
                    this.adminEmailForm.newEmail = '';
                    Swal.fire('نجاح', 'تم تغيير بريدك الإلكتروني بنجاح!', 'success');
                } catch (error) {
                    let message = 'فشل تغيير البريد الإلكتروني.';
                    if (error.code === 'auth/requires-recent-login') { message = 'هذه عملية حساسة وتتطلب إعادة تسجيل الدخول. الرجاء تسجيل الخروج ثم الدخول مرة أخرى والمحاولة مجددًا.'; }
                    Swal.fire('خطأ', message, 'error');
                }
            },
            async updateAdminPassword() {
                if (this.adminPasswordForm.newPassword.length < 6) { Swal.fire('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 'warning'); return; }
                if (this.adminPasswordForm.newPassword !== this.adminPasswordForm.confirmPassword) { Swal.fire('خطأ', 'كلمتا المرور غير متطابقتين.', 'error'); return; }
                try {
                    await updatePassword(auth.currentUser, this.adminPasswordForm.newPassword);
                    this.adminPasswordForm = { newPassword: '', confirmPassword: '' };
                    Swal.fire('نجاح', 'تم تغيير كلمة المرور بنجاح!', 'success');
                } catch (error) { Swal.fire('خطأ', 'فشل تغيير كلمة المرور. قد تحتاج لتسجيل الدخول من جديد.', 'error'); }
            },
            toggleAdminPasswordVisibility() {
                this.adminPasswordFieldType = this.adminPasswordFieldType === 'password' ? 'text' : 'password';
            },
            async logout() {
                await signOut(auth);
            }
        }
    }).mount('#admin-app');
}
