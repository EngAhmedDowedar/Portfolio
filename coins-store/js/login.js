import { auth } from '../firebase/config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'admin.html';
    } catch (error) {
        Swal.fire('خطأ', 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
    }
});