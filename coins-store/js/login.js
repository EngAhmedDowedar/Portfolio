import { auth, db } from '../firebase/config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const { createApp, ref } = Vue;

createApp({
    setup() {
        const form = ref({
            email: '',
            password: ''
        });

        const passwordFieldType = ref('password');

        const togglePasswordVisibility = () => {
            passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password';
        };

        const loginUser = async () => {
            try {
                // 1. تسجيل الدخول
                const userCredential = await signInWithEmailAndPassword(auth, form.value.email, form.value.password);
                const user = userCredential.user;

                // 2. التحقق من دور المستخدم
                const userDocRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    // توجيه المدير
                    window.location.href = 'admin.html';
                } else {
                    // توجيه المستخدم العادي
                    window.location.href = 'index.html';
                }

            } catch (error) {
                console.error('Login Error:', error.message);
                Swal.fire('خطأ', 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
            }
        };

        return {
            form,
            passwordFieldType,
            togglePasswordVisibility,
            loginUser
        };
    }
}).mount('#login-app');
