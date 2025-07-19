// firebase/config.js (النسخة الكاملة والمحدثة)

// استيراد الدوال الأساسية من مكتبة فايربيس
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
// 👈 إضافة استيراد خدمة تخزين الملفات
import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

// ==========================================================
//   هذا هو كود الربط الخاص بك
// ==========================================================
const firebaseConfig = {
  apiKey: "AIzaSyBQQ0JiSvMg3A-CKZLWjhR8bTjYIYN85lc",
  authDomain: "coins-store-d1df3.firebaseapp.com",
  projectId: "coins-store-d1df3",
  storageBucket: "coins-store-d1df3.appspot.com",
  messagingSenderId: "301936225616",
  appId: "1:301936225616:web:4180ef6d4cca80b8165055"
};

// تهيئة خدمة فايربيس
const app = initializeApp(firebaseConfig);

// تهيئة الخدمات الثلاث
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // 👈 تهيئة خدمة التخزين

// 👈 تصدير الخدمات الثلاث معًا
export { db, auth, storage };