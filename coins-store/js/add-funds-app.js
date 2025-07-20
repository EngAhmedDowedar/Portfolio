const { createApp } = Vue;

// Firebase configuration - استبدل هذه القيم بتفاصيل مشروعك
const firebaseConfig = {
apiKey: "AIzaSyBQQ0JiSvMg3A-CKZLWjhR8bTjYIYN85lc",
authDomain: "coins-store-d1df3.firebaseapp.com",
projectId: "coins-store-d1df3",
storageBucket: "coins-store-d1df3.appspot.com",
messagingSenderId: "301936225616",
appId: "1:301936225616:web:4180ef6d4cca80b8165055"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

createApp({
    data() {
        return {
            user: null,
            isLoading: false,
            dragover: false,
            requestForm: {
                amount: null,
                receiptBase64: null
            }
        };
    },
    mounted() {
        // مراقبة حالة المصادقة
        auth.onAuthStateChanged(user => {
            if (user) {
                this.user = user;
            } else {
                // توجيه المستخدم إلى صفحة تسجيل الدخول إذا لم يكن مسجلاً
                window.location.href = 'login.html';
            }
        });
    },
    methods: {
        copyText(text) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    Swal.fire({
                        title: 'تم النسخ!',
                        text: 'تم نسخ النص إلى الحافظة',
                        icon: 'success',
                        confirmButtonText: 'حسناً',
                        timer: 1500
                    });
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                });
        },
        handleDrop(e) {
            this.dragover = false;
            const file = e.dataTransfer.files[0];
            this.processFile(file);
        },
        handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
            this.processFile(file);
        },
        processFile(file) {
            if (!file.type.match('image.*')) {
                Swal.fire('خطأ', 'الرجاء اختيار ملف صورة فقط (JPG, PNG)', 'error');
                return;
            }

            if (file.size > 700 * 1024) {
                Swal.fire('خطأ', 'حجم الصورة كبير جدًا. الرجاء اختيار صورة أصغر من 700KB.', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.requestForm.receiptBase64 = e.target.result;
            };
            reader.readAsDataURL(file);
        },
        async submitFundRequest() {
            if (!this.requestForm.amount || !this.requestForm.receiptBase64) {
                Swal.fire('بيانات ناقصة', 'الرجاء إدخال المبلغ وإرفاق صورة الإيصال.', 'warning');
                return;
            }

            this.isLoading = true;

            try {
                // إضافة طلب الشحن إلى Firestore
                await db.collection("fundRequests").add({
                    userId: this.user.uid,
                    userEmail: this.user.email,
                    amount: this.requestForm.amount,
                    receiptBase64: this.requestForm.receiptBase64,
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                Swal.fire({
                    title: 'تم إرسال طلبك!',
                    text: 'سيتم مراجعة طلبك وإضافة الرصيد إلى محفظتك قريبًا.',
                    icon: 'success',
                    confirmButtonText: 'حسنًا'
                }).then(() => {
                    // إعادة تعيين النموذج
                    this.requestForm.amount = null;
                    this.requestForm.receiptBase64 = null;
                    this.isLoading = false;
                });

            } catch (error) {
                console.error("Error submitting fund request: ", error);
                Swal.fire('خطأ', 'حدث خطأ أثناء إرسال طلبك. الرجاء المحاولة مرة أخرى.', 'error');
                this.isLoading = false;
            }
        }
    }
}).mount('#app');