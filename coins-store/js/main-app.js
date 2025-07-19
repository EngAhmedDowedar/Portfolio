// استيراد الخدمات التي نحتاجها من Firebase
import { db } from '../firebase/config.js'; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// استيراد Vue
const { createApp } = Vue;

// إنشاء تطبيق Vue للصفحة الرئيسية
createApp({
    data() {
        return {
            services: [],     // مصفوفة لتخزين الخدمات
            isLoading: true,  // متغير للتحكم في مؤشر التحميل
        };
    },
    mounted() {
        this.fetchServices(); // استدعاء دالة جلب الخدمات عند تحميل الصفحة
    },
    methods: {
        async fetchServices() {
            this.isLoading = true;
            const servicesCollection = collection(db, 'services');
            try {
                // جلب البيانات من collection 'services'
                const querySnapshot = await getDocs(servicesCollection);
                // تحويل البيانات وإضافتها للمصفوفة
                this.services = querySnapshot.docs.map(doc => doc.data());
            } catch (error) {
                console.error("Error fetching services for homepage: ", error);
                // يمكنك إضافة رسالة خطأ للمستخدم هنا إذا أردت
            }
            this.isLoading = false; // إخفاء مؤشر التحميل
        }
    }
}).mount('#app');
