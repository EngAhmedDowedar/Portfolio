// request-app.js

// استيراد الخدمات التي نحتاجها من Firebase
// db فقط من Firestore، لأننا سنقوم بتخزين الصور كـ Base64 مباشرة في Firestore
import { db } from '../firebase/config.js'; 
import { collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// لا يوجد استيراد لـ ref, uploadBytes, getDownloadURL من Firebase Storage
// لأننا لن نستخدم Firebase Storage لرفع الصور في هذا النهج

// استيراد Vue
const { createApp } = Vue;

// إنشاء تطبيق Vue
createApp({
    data() {
        return {
            step: 1, // الخطوة الحالية في النموذج (1: اختيار الخدمة، 2: تفاصيل الطلب)
            services: [], // قائمة الخدمات المتاحة
            selectedService: null, // الخدمة التي اختارها المستخدم
            selectedPackage: null, // الباقة التي اختارها المستخدم
            playerId: '', // معرف اللاعب الذي يدخله المستخدم
            isLoading: false, // حالة التحميل عند إرسال الطلب
            isFetching: true, // حالة التحميل عند جلب الخدمات من Firestore
            phoneNumber: '', // رقم هاتف المستخدم
            receiptFile: null, // ملف الإيصال الذي يرفعه المستخدم
        };
    },
    
    // يتم استدعاء هذه الدالة عند تحميل المكون لأول مرة
    mounted() {
        this.fetchServices(); // جلب الخدمات من Firestore
    },

    methods: {
        // دالة لجلب الخدمات من Firestore
        async fetchServices() {
            this.isFetching = true; // تفعيل مؤشر التحميل لجلب الخدمات
            const servicesCollection = collection(db, 'services'); // الإشارة إلى مجموعة 'services'
            try {
                const querySnapshot = await getDocs(servicesCollection); // جلب المستندات
                // تحويل المستندات إلى مصفوفة من الكائنات، مع إضافة معرف المستند (id)
                this.services = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            } catch (error) {
                console.error("Error fetching services: ", error);
                Swal.fire('خطأ', 'فشل تحميل الخدمات، الرجاء المحاولة لاحقاً', 'error');
            } finally {
                this.isFetching = false; // تعطيل مؤشر التحميل بعد الانتهاء
            }
        },

        // دالة لاختيار الخدمة والانتقال للخطوة التالية
        selectService(service) {
            this.selectedService = service; // تعيين الخدمة المختارة
            this.step = 2; // الانتقال للخطوة الثانية
        },

        // دالة للعودة للخطوة الأولى وإعادة تعيين البيانات
        backToStep1() {
            this.step = 1; // العودة للخطوة الأولى
            this.selectedPackage = null; // إعادة تعيين الباقة المختارة
            this.playerId = ''; // مسح معرف اللاعب
            this.phoneNumber = ''; // مسح رقم الهاتف
            this.receiptFile = null; // مسح ملف الإيصال
            // مسح قيمة حقل الملف يدوياً لضمان إعادة تعيينه في الواجهة
            const receiptInput = document.getElementById('receipt');
            if (receiptInput) {
                receiptInput.value = '';
            }
        },

        // دالة للتعامل مع اختيار ملف الإيصال من قبل المستخدم
        handleFileSelect(event) {
            this.receiptFile = event.target.files[0]; // حفظ الملف المختار
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
        
        // دالة لإرسال الطلب إلى Firestore
        async submitOrder() {
            // التحقق من أن جميع الحقول المطلوبة مملوءة قبل الإرسال
            if (!this.selectedPackage || !this.playerId.trim() || !this.phoneNumber.trim() || !this.receiptFile) {
                Swal.fire('بيانات ناقصة', 'الرجاء ملء كل الحقول وإرفاق صورة الإيصال', 'warning');
                return; // إيقاف الدالة إذا كانت البيانات ناقصة
            }

            this.isLoading = true; // تفعيل مؤشر التحميل لإرسال الطلب

            try {
                // استخدام Compressor.js لضغط الصورة
                const compressedFile = await new Promise((resolve, reject) => {
                    new Compressor(this.receiptFile, {
                        quality: 0.6, // جودة الصورة المضغوطة (0 إلى 1). يمكنك تعديلها.
                        maxWidth: 1024, // أقصى عرض للصورة (اختياري). يمكنك تعديله.
                        maxHeight: 1024, // أقصى ارتفاع للصورة (اختياري). يمكنك تعديله.
                        success(result) {
                            resolve(result); // result هو الكائن File الجديد المضغوط
                        },
                        error(err) {
                            reject(err);
                        },
                    });
                });

                // تحويل الصورة المضغوطة إلى نص Base64 طويل
                const base64ImageString = await this.convertFileToBase64(compressedFile);

                // تجهيز بيانات الطلب التي سيتم حفظها في Firestore
                const orderData = {
                    serviceName: this.selectedService.name, // اسم الخدمة
                    packageName: this.selectedPackage.name, // اسم الباقة
                    price: this.selectedPackage.price, // سعر الباقة
                    playerId: this.playerId, // معرف اللاعب
                    phoneNumber: this.phoneNumber, // رقم الهاتف
                    receiptImageBase64: base64ImageString, // الصورة المحولة إلى Base64
                    status: 'pending', // حالة الطلب الأولية
                    createdAt: serverTimestamp() // إضافة ختم الوقت لإنشاء الطلب
                };

                // حفظ الطلب في مجموعة "orders" في Firestore
                const docRef = await addDoc(collection(db, "orders"), orderData);
                console.log("Order submitted with ID: ", docRef.id);

                // عرض رسالة نجاح للمستخدم باستخدام SweetAlert2
                Swal.fire({
                    title: 'تم إرسال الطلب بنجاح!',
                    text: `رقم طلبك هو: ${docRef.id}. سيتم مراجعته قريباً.`,
                    icon: 'success',
                    confirmButtonText: 'حسناً'
                }).then(() => {
                    this.resetForm(); // إعادة تعيين النموذج بعد النجاح
                    this.step = 1; // العودة للخطوة الأولى
                });

            } catch (error) {
                console.error("Error submitting order: ", error);
                // عرض رسالة خطأ للمستخدم في حالة فشل الإرسال (سواء كان خطأ ضغط أو خطأ Firestore)
                let errorMessage = 'حدث مشكلة أثناء إرسال طلبك. الرجاء المحاولة مرة أخرى.';
                if (error.message && error.message.includes("longer than 1048487 bytes")) {
                    errorMessage = 'حجم الصورة كبير جداً حتى بعد الضغط. الرجاء اختيار صورة أصغر.';
                } else if (error.message) {
                    errorMessage = `خطأ: ${error.message}`;
                }
                Swal.fire('خطأ', errorMessage, 'error');
            } finally {
                this.isLoading = false; // تعطيل مؤشر التحميل سواء نجح الإرسال أو فشل
            }
        },

        // دالة مساعدة لإعادة تعيين جميع حقول النموذج إلى حالتها الأولية
        resetForm() {
            this.selectedService = null;
            this.selectedPackage = null;
            this.playerId = '';
            this.phoneNumber = '';
            this.receiptFile = null;
            const receiptInput = document.getElementById('receipt');
            if (receiptInput) {
                receiptInput.value = ''; // مسح قيمة حقل الملف
            }
        }
    }
}).mount('#request-app');
