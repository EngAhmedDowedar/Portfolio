import { auth, db } from '../firebase/config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const { createApp, ref, computed, watch } = Vue;

createApp({
    setup() {
        const form = ref({
            fullName: '',
            username: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: ''
        });

        const passwordFieldType = ref('password');
        const passwordsMatch = ref(false);

        // مراقبة حقول كلمة المرور لتحديث حالة التطابق
        watch([() => form.value.password, () => form.value.confirmPassword], ([newPass, newConfirm]) => {
            passwordsMatch.value = newPass === newConfirm;
        });

        const togglePasswordVisibility = () => {
            passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password';
        };

        const registerUser = async () => {
            if (!passwordsMatch.value) {
                Swal.fire('خطأ', 'كلمتا المرور غير متطابقتين.', 'error');
                return;
            }

            try {
                // 1. إنشاء المستخدم في Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, form.value.email, form.value.password);
                const user = userCredential.user;

                // 2. إنشاء مستند المستخدم في Firestore
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    email: form.value.email,
                    displayName: form.value.fullName,
                    username: form.value.username,
                    phone: form.value.phone,
                    createdAt: serverTimestamp(),
                    walletBalance: 0
                });

                // 3. توجيه المستخدم للصفحة الرئيسية
                window.location.href = 'index.html';

            } catch (error) {
                let errorMessage = "حدث خطأ ما. الرجاء المحاولة مرة أخرى.";
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = "هذا البريد الإلكتروني مستخدم بالفعل.";
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = "كلمة المرور ضعيفة جدًا (6 أحرف على الأقل).";
                }
                console.error("Registration Error:", error);
                Swal.fire('خطأ في التسجيل', errorMessage, 'error');
            }
        };

        return {
            form,
            passwordFieldType,
            passwordsMatch,
            togglePasswordVisibility,
            registerUser
        };
    }
}).mount('#register-app');
