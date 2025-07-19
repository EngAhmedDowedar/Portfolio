// admin.js

// استيراد الخدمات التي نحتاجها من Firebase
import { auth, db } from '../firebase/config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const { createApp, computed } = Vue;

// هذا الجزء يتحقق من حالة المصادقة قبل تهيئة تطبيق Vue
onAuthStateChanged(auth, (user) => {
    if (user) {
        // إذا كان المستخدم مسجل الدخول، أظهر التطبيق وقم بتهيئته
        document.getElementById('admin-app').classList.remove('hidden');
        createVueApp();
    } else {
        // إذا لم يكن مسجل الدخول، أعد التوجيه إلى صفحة تسجيل الدخول
        window.location.replace('login.html');
    }
});

function createVueApp() {
    createApp({
        data() {
            return {
                currentView: 'orders', // العرض الافتراضي عند التحميل
                orders: [], // قائمة الطلبات
                services: [], // قائمة الخدمات
                isLoading: true, // حالة التحميل العامة
                isModalOpen: false, // حالة مودال إضافة/تعديل الخدمة
                isEditing: false, // لتحديد ما إذا كنا نعدل خدمة موجودة
                serviceForm: { // بيانات نموذج الخدمة
                    id: '',
                    name: '',
                    logo: '', // هذا سيحتوي على Base64 للوجو
                    packages: [] 
                },
                newLogoFile: null, // الملف الخام للوجو الجديد الذي يختاره المستخدم
                newLogoBase64: '', // معاينة Base64 للوجو الجديد
                isSidebarOpen: false, // حالة الشريط الجانبي (مفتوح/مغلق)
                isOrderModalOpen: false, // حالة مودال تفاصيل الطلب
                selectedOrder: null, // الطلب المحدد في المودال
                unsubscribeOrders: null, // دالة إلغاء الاشتراك من onSnapshot للطلبات
                unsubscribeServices: null // دالة إلغاء الاشتراك من onSnapshot للخدمات
            };
        },
        computed: {
            // عنوان الصفحة يعتمد على العرض الحالي
            pageTitle() {
                return this.currentView === 'orders' ? 'إدارة الطلبات' : 'إدارة الخدمات';
            }
        },
        watch: {
            // مراقبة تغيير العرض لجلب البيانات المناسبة
            currentView(newView) {
                this.isLoading = true; // تفعيل التحميل عند تبديل العرض
                // إلغاء الاشتراك القديم قبل الاشتراك في الجديد
                if (this.unsubscribeOrders) this.unsubscribeOrders();
                if (this.unsubscribeServices) this.unsubscribeServices();

                if (newView === 'orders') {
                    this.fetchOrders();
                } else if (newView === 'services') {
                    this.fetchServices();
                }
            }
        },
        mounted() {
            // جلب الطلبات عند تحميل المكون لأول مرة (بعد تسجيل الدخول)
            this.fetchOrders();
        },
        beforeUnmount() {
            // إلغاء جميع الاشتراكات عند إلغاء تحميل المكون لتجنب تسرب الذاكرة
            if (this.unsubscribeOrders) this.unsubscribeOrders();
            if (this.unsubscribeServices) this.unsubscribeServices();
        },
        methods: {
            // دالة لتبديل العرض
            setView(view) {
                this.currentView = view;
                this.isSidebarOpen = false; // إغلاق الشريط الجانبي بعد الاختيار
            },
            
            // جلب الطلبات من Firestore في الوقت الفعلي
            fetchOrders() {
                this.isLoading = true;
                const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
                this.unsubscribeOrders = onSnapshot(q, (snapshot) => {
                    this.orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    this.isLoading = false;
                }, (error) => {
                    console.error("Error fetching orders: ", error);
                    Swal.fire('خطأ', 'فشل تحميل الطلبات.', 'error');
                    this.isLoading = false;
                });
            },

            // تنسيق التاريخ والوقت
            formatDate(timestamp) {
                if (!timestamp || !timestamp.toDate) return 'N/A'; // التحقق من وجود toDate()
                const date = timestamp.toDate();
                return date.toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            },

            // تحديث حالة الطلب
            async updateOrderStatus(orderId, newStatus) {
                const result = await Swal.fire({
                    title: 'هل أنت متأكد؟',
                    text: `هل تريد تغيير حالة الطلب إلى "${newStatus === 'completed' ? 'مكتمل' : 'قيد الانتظار'}"؟`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'نعم، قم بالتحديث!',
                    cancelButtonText: 'إلغاء'
                });
                if (result.isConfirmed) {
                    try {
                        const orderRef = doc(db, "orders", orderId);
                        await updateDoc(orderRef, { status: newStatus });
                        Swal.fire('تم التحديث!', 'تم تحديث حالة الطلب بنجاح.', 'success');
                    } catch (error) {
                        console.error("Error updating order status: ", error);
                        Swal.fire('خطأ', 'فشل تحديث حالة الطلب.', 'error');
                    }
                }
            },

            // حذف الطلب
            async deleteOrder(orderId) { 
                const result = await Swal.fire({
                    title: `هل أنت متأكد؟`,
                    text: `سيتم حذف الطلب بشكل نهائي!`, 
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'نعم، احذفه!',
                    cancelButtonText: 'إلغاء'
                });
                if (result.isConfirmed) {
                    try {
                        await deleteDoc(doc(db, "orders", orderId));
                        Swal.fire('تم الحذف!', 'تم حذف الطلب بنجاح.', 'success');
                    } catch (error) {
                        console.error("Error deleting order: ", error);
                        Swal.fire('خطأ!', 'حدث خطأ أثناء الحذف.', 'error');
                    }
                }
            },

            // فتح مودال تفاصيل الطلب
            openOrderModal(order) {
                this.selectedOrder = order;
                this.isOrderModalOpen = true;
            },

            // إغلاق مودال تفاصيل الطلب
            closeOrderModal() {
                this.isOrderModalOpen = false;
                this.selectedOrder = null;
            },

            // نسخ النص إلى الحافظة
            copyToClipboard(text, type) {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed"; 
                textArea.style.opacity = 0; 
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        Swal.fire({
                            toast: true,
                            position: 'top-start',
                            icon: 'success',
                            title: `تم نسخ ${type}`,
                            showConfirmButton: false,
                            timer: 1500
                        });
                    } else {
                        throw new Error('Fallback: Copying text command was unsuccessful.');
                    }
                } catch (err) {
                    console.error('Fallback: Oops, unable to copy', err);
                    Swal.fire({
                        toast: true,
                        position: 'top-start',
                        icon: 'error',
                        title: `فشل نسخ ${type}`,
                        showConfirmButton: false,
                        timer: 2000
                    });
                } finally {
                    document.body.removeChild(textArea);
                }
            },

            // جلب الخدمات من Firestore في الوقت الفعلي
            fetchServices() {
                this.isLoading = true;
                const q = query(collection(db, "services"));
                onSnapshot(q, (snapshot) => {
                    this.services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    this.isLoading = false;
                }, (error) => {
                    console.error("Error fetching services: ", error);
                    Swal.fire('خطأ', 'فشل تحميل الخدمات.', 'error');
                    this.isLoading = false;
                });
            },

            // دالة لتحويل الملف (الصورة) إلى نص Base64 طويل
            convertFileToBase64(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file); // قراءة الملف كـ Data URL (Base64)

                    reader.onload = () => {
                        resolve(reader.result); // عند الانتهاء، حل الوعد بسلسلة Base64
                    };

                    reader.onerror = (error) => {
                        reject(error); // في حالة وجود خطأ، رفض الوعد
                    };
                });
            },

            // التعامل مع اختيار ملف اللوجو
            async handleLogoFileSelect(event) {
                const file = event.target.files[0];
                if (file) {
                    this.newLogoFile = file;
                    try {
                        // استخدام Compressor.js لضغط الصورة
                        const compressedFile = await new Promise((resolve, reject) => {
                            new Compressor(file, {
                                quality: 0.6, // جودة الصورة المضغوطة (0 إلى 1)
                                maxWidth: 200, // أقصى عرض للوجو (يمكن تعديله)
                                maxHeight: 200, // أقصى ارتفاع للوجو (يمكن تعديله)
                                success(result) {
                                    resolve(result); 
                                },
                                error(err) {
                                    reject(err);
                                },
                            });
                        });
                        this.newLogoBase64 = await this.convertFileToBase64(compressedFile);
                    } catch (error) {
                        console.error("Error compressing or converting logo: ", error);
                        Swal.fire('خطأ', 'فشل ضغط أو تحويل اللوجو. الرجاء المحاولة مرة أخرى.', 'error');
                        this.clearLogoFile();
                    }
                } else {
                    this.clearLogoFile();
                }
            },

            // مسح ملف اللوجو المحدد
            clearLogoFile() {
                this.newLogoFile = null;
                this.newLogoBase64 = '';
                const logoInput = document.getElementById('serviceLogoUpload');
                if (logoInput) {
                    logoInput.value = ''; // مسح قيمة حقل الملف
                }
            },

            // فتح مودال إضافة/تعديل الخدمة
            openServiceModal(service = null) {
                this.clearLogoFile(); // مسح أي لوجو سابق عند فتح المودال
                if (service) {
                    this.isEditing = true;
                    this.serviceForm = JSON.parse(JSON.stringify(service));
                    // إذا كان هناك لوجو موجود، اعرضه كمعاينة مبدئية
                    if (this.serviceForm.logo) {
                        this.newLogoBase64 = this.serviceForm.logo;
                    }
                    this.serviceForm.packages = this.serviceForm.packages.map(pkg => ({ ...pkg, id: pkg.id || Math.random().toString(36).substring(2, 9) }));
                } else {
                    this.isEditing = false;
                    this.serviceForm = { id: '', name: '', logo: '', packages: [{ id: Math.random().toString(36).substring(2, 9), name: '', price: 0 }] };
                }
                this.isModalOpen = true;
            },

            // إضافة باقة جديدة لنموذج الخدمة
            addPackage() {
                this.serviceForm.packages.push({ id: Math.random().toString(36).substring(2, 9), name: '', price: 0 });
            },

            // إزالة باقة من نموذج الخدمة
            removePackage(index) {
                this.serviceForm.packages.splice(index, 1);
            },

            // التعامل مع إرسال نموذج الخدمة (إضافة أو تعديل)
            async handleServiceSubmit() {
                if (!this.serviceForm.id || !this.serviceForm.name) {
                    Swal.fire('خطأ', 'الرجاء ملء حقلي ID والاسم', 'error');
                    return;
                }
                if (this.serviceForm.packages.some(pkg => !pkg.name.trim() || isNaN(pkg.price) || pkg.price < 0)) {
                    Swal.fire('خطأ', 'الرجاء التأكد من أن جميع الباقات لها اسم وسعر صحيح (أكبر من 0).', 'warning');
                    return;
                }

                this.isLoading = true;
                try {
                    // إذا تم اختيار ملف لوجو جديد، استخدم Base64 الخاص به
                    if (this.newLogoFile) {
                        this.serviceForm.logo = this.newLogoBase64;
                    } else if (this.isEditing && !this.newLogoBase64) {
                        // إذا كنا في وضع التعديل ولم يتم اختيار ملف جديد وتم مسح اللوجو القديم
                        this.serviceForm.logo = ''; // مسح اللوجو
                    }
                    // إذا لم يتم اختيار ملف جديد في وضع الإضافة، احتفظ باللوجو الحالي (serviceForm.logo)
                    // إذا لم يتم اختيار ملف جديد في وضع الإضافة، و serviceForm.logo فارغ، سيبقى فارغًا

                    const serviceRef = doc(db, 'services', this.serviceForm.id);
                    await setDoc(serviceRef, this.serviceForm, { merge: true }); 
                    Swal.fire('تم', `تم ${this.isEditing ? 'تحديث' : 'إضافة'} الخدمة بنجاح`, 'success');
                    this.isModalOpen = false;
                    this.clearLogoFile(); // مسح حالة اللوجو بعد الحفظ
                } catch (error) {
                    console.error("Error saving service: ", error);
                    let errorMessage = 'لم يتم حفظ التغييرات.';
                    if (error.message && error.message.includes("longer than 1048487 bytes")) {
                        errorMessage = 'حجم اللوجو كبير جداً حتى بعد الضغط. الرجاء اختيار صورة أصغر.';
                    }
                    Swal.fire('خطأ', errorMessage, 'error');
                } finally {
                    this.isLoading = false;
                }
            },

            // حذف خدمة
            async deleteService(serviceId, serviceName) {
                const result = await Swal.fire({
                    title: `هل أنت متأكد من حذف خدمة "${serviceName}"؟`,
                    text: "لا يمكن التراجع عن هذا الإجراء!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'نعم، احذفها!',
                    cancelButtonText: 'إلغاء'
                });
                if (result.isConfirmed) {
                    try {
                        await deleteDoc(doc(db, "services", serviceId));
                        Swal.fire('تم الحذف!', 'تم حذف الخدمة بنجاح.', 'success');
                    } catch (error) {
                        console.error("Error deleting service: ", error);
                        Swal.fire('خطأ', 'فشل حذف الخدمة.', 'error');
                    }
                }
            },

            // تسجيل الخروج
            async logout() {
                try {
                    await signOut(auth);
                    window.location.replace('login.html'); 
                } catch (error) {
                    console.error("Error logging out: ", error);
                    Swal.fire('خطأ', 'فشل تسجيل الخروج.', 'error');
                }
            }
        }
    }).mount('#admin-app');
}
