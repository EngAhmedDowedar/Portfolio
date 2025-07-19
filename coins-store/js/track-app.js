// track-app.js

// استيراد الخدمات التي نحتاجها من Firebase
import { db } from '../firebase/config.js'; 
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// استيراد Vue
const { createApp } = Vue;

createApp({
    data() {
        return {
            orderIdInput: '', // رقم الطلب الذي يدخله المستخدم
            orderResult: null, // نتيجة البحث عن الطلب
            isLoading: false, // حالة التحميل
            error: null, // رسالة الخطأ
            searchPerformed: false, // لتحديد ما إذا تم إجراء بحث
        };
    },
    methods: {
        async trackOrder() {
            this.isLoading = true;
            this.error = null;
            this.orderResult = null;
            this.searchPerformed = true; // تم إجراء بحث

            if (!this.orderIdInput.trim()) {
                this.error = 'الرجاء إدخال رقم الطلب.';
                this.isLoading = false;
                return;
            }

            try {
                const orderRef = doc(db, 'orders', this.orderIdInput.trim());
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    this.orderResult = { id: orderSnap.id, ...orderSnap.data() };
                } else {
                    this.error = 'عذراً، لم يتم العثور على طلب بهذا الرقم.';
                }
            } catch (error) {
                console.error("Error tracking order: ", error);
                this.error = 'حدث خطأ أثناء البحث عن الطلب. الرجاء المحاولة لاحقاً.';
            } finally {
                this.isLoading = false;
            }
        },
        // دالة لتنسيق التاريخ
        formatDate(timestamp) {
            // إضافة log للمساعدة في التشخيص
            console.log('formatDate called with:', timestamp);
            if (!timestamp || !timestamp.toDate) {
                console.warn('Timestamp is invalid or missing toDate method:', timestamp);
                return 'N/A';
            }
            try {
                const date = timestamp.toDate();
                return date.toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                console.error('Error converting timestamp to date:', e);
                return 'Invalid Date';
            }
        }
    }
}).mount('#track-app');
