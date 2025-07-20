const { createApp, ref, onMounted, onBeforeUnmount } = Vue;

// تهيئة Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBQQ0JiSvMg3A-CKZLWjhR8bTjYIYN85lc",
    authDomain: "coins-store-d1df3.firebaseapp.com",
    projectId: "coins-store-d1df3",
    storageBucket: "coins-store-d1df3.appspot.com",
    messagingSenderId: "301936225616",
    appId: "1:301936225616:web:4180ef6d4cca80b8165055"
};

// استيراد مكتبات Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

createApp({
    setup() {
        // State variables
        const user = ref(null);
        const purchaseOrders = ref([]);
        const fundRequests = ref([]);
        const isLoading = ref(true);
        const activeTab = ref('profile');
        const profileForm = ref({ displayName: '', username: '' });
        const passwordForm = ref({ newPassword: '', confirmPassword: '' });
        const emailForm = ref({ newEmail: '' });
        const phoneForm = ref({ 
            countryCode: '+966',
            newPhone: '' 
        });
        const mobileMenuOpen = ref(false);
        const scrolled = ref(false);
        const isSaving = ref(false);
        const isSavingPhone = ref(false);
        
        // قائمة أسماء الدول
        const countryNames = {
            '+966': 'السعودية',
            '+971': 'الإمارات',
            '+20': 'مصر',
            '+962': 'الأردن',
            '+973': 'البحرين',
            '+974': 'قطر',
            '+968': 'عُمان',
            '+965': 'الكويت',
            '+213': 'الجزائر',
            '+212': 'المغرب',
            '+216': 'تونس',
            '+249': 'السودان',
            '+964': 'العراق',
            '+963': 'سوريا',
            '+961': 'لبنان',
            '+967': 'اليمن',
            '+1': 'الولايات المتحدة',
            '+44': 'المملكة المتحدة',
            '+33': 'فرنسا',
            '+49': 'ألمانيا',
            '+81': 'اليابان',
            '+86': 'الصين',
            '+91': 'الهند',
            '+52': 'المكسيك',
            '+55': 'البرازيل'
        };
        
        // Methods
        const fetchUserData = async (uid) => {
            try {
                const userDocRef = db.collection('users').doc(uid);
                const userDoc = await userDocRef.get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    
                    if (userData.createdAt && userData.createdAt.toDate) {
                        userData.createdAt = userData.createdAt.toDate();
                    }
                    
                    user.value = userData;
                    profileForm.value.displayName = user.value.displayName || '';
                    profileForm.value.username = user.value.username || '';
                }
                isLoading.value = false;
            } catch (error) {
                console.error('Error fetching user data:', error);
                Swal.fire('خطأ', 'حدث خطأ أثناء جلب بيانات المستخدم.', 'error');
                isLoading.value = false;
            }
        };
        
        const fetchUserOrders = async (uid) => {
            try {
                const ordersQuery = db.collection('orders')
                    .where('userId', '==', uid)
                    .orderBy('createdAt', 'desc');
                    
                const ordersSnapshot = await ordersQuery.get();
                
                purchaseOrders.value = ordersSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
                    };
                });
            } catch (error) {
                console.error('Error fetching orders:', error);
                Swal.fire('خطأ', 'حدث خطأ أثناء جلب سجل الطلبات.', 'error');
            }
        };
        
        const fetchFundRequests = async (uid) => {
            try {
                const fundsQuery = db.collection('fundRequests')
                    .where('userId', '==', uid)
                    .orderBy('createdAt', 'desc');
                    
                const fundsSnapshot = await fundsQuery.get();
                
                fundRequests.value = fundsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
                    };
                });
            } catch (error) {
                console.error('Error fetching fund requests:', error);
                Swal.fire('خطأ', 'حدث خطأ أثناء جلب سجل الشحنات.', 'error');
            }
        };
        
        const formatDate = (date) => {
            if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                return 'غير محدد';
            }
            
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('ar-EG', options);
        };
        
        const getCountryName = (code) => {
            return countryNames[code] || 'غير معروف';
        };
        
        const updateProfile = async () => {
            isSaving.value = true;
            try {
                await db.collection('users').doc(auth.currentUser.uid).update({
                    displayName: profileForm.value.displayName,
                    username: profileForm.value.username
                });
                
                user.value.displayName = profileForm.value.displayName;
                user.value.username = profileForm.value.username;
                
                Swal.fire({
                    title: 'نجاح',
                    text: 'تم تحديث بياناتك بنجاح!',
                    icon: 'success',
                    confirmButtonText: 'حسناً',
                    customClass: {
                        confirmButton: 'btn-primary'
                    }
                });
            } catch (error) {
                console.error('Error updating profile:', error);
                Swal.fire('خطأ', 'فشل تحديث البيانات.', 'error');
            } finally {
                isSaving.value = false;
            }
        };
        
        const changePhoneNumber = async () => {
            if (!phoneForm.value.newPhone) {
                Swal.fire('خطأ', 'الرجاء إدخال رقم الهاتف الجديد.', 'warning'); 
                return;
            }
            
            // تجميع رقم الهاتف الكامل
            const fullPhone = phoneForm.value.countryCode + phoneForm.value.newPhone;
            
            // تنظيف الرقم من أي أحرف غير رقمية
            const cleanedPhone = fullPhone.replace(/\D/g, '');
            
            // التحقق من أن الرقم يحتوي على 8 أرقام على الأقل
            if (cleanedPhone.length < 8) {
                Swal.fire('خطأ', 'رقم الهاتف قصير جدًا. الرجاء إدخال رقم هاتف صالح.', 'warning'); 
                return;
            }
            
            // رقم الهاتف الكامل مع علامة '+'
            const formattedPhone = '+' + cleanedPhone;
            
            isSavingPhone.value = true;
            try {
                await db.collection('users').doc(auth.currentUser.uid).update({
                    phone: formattedPhone
                });
                
                // تحديث البيانات المحلية
                user.value.phone = formattedPhone;
                
                Swal.fire({
                    title: 'نجاح',
                    text: 'تم تغيير رقم هاتفك بنجاح!',
                    icon: 'success',
                    confirmButtonText: 'حسناً',
                    customClass: {
                        confirmButton: 'btn-primary'
                    }
                });
                
                // إعادة تعيين الحقل
                phoneForm.value.newPhone = '';
            } catch (error) {
                console.error('Error updating phone number:', error);
                Swal.fire('خطأ', 'فشل تغيير رقم الهاتف. يرجى المحاولة مرة أخرى.', 'error');
            } finally {
                isSavingPhone.value = false;
            }
        };
        
        const changeEmail = async () => {
            if (!emailForm.value.newEmail) {
                Swal.fire('خطأ', 'الرجاء إدخال البريد الإلكتروني الجديد.', 'warning'); 
                return;
            }
            
            isSaving.value = true;
            try {
                await auth.currentUser.updateEmail(emailForm.value.newEmail);
                
                await db.collection('users').doc(auth.currentUser.uid).update({
                    email: emailForm.value.newEmail
                });
                
                user.value.email = emailForm.value.newEmail;
                emailForm.value.newEmail = '';
                
                Swal.fire({
                    title: 'نجاح',
                    text: 'تم تغيير بريدك الإلكتروني بنجاح!',
                    icon: 'success',
                    confirmButtonText: 'حسناً',
                    customClass: {
                        confirmButton: 'btn-primary'
                    }
                });
            } catch (error) {
                console.error('Error updating email:', error);
                Swal.fire('خطأ', 'فشل تغيير البريد الإلكتروني.', 'error');
            } finally {
                isSaving.value = false;
            }
        };
        
        const changePassword = async () => {
            if (passwordForm.value.newPassword.length < 6) {
                Swal.fire('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', 'warning'); 
                return;
            }
            if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
                Swal.fire('خطأ', 'كلمتا المرور غير متطابقتين.', 'error'); 
                return;
            }
            
            isSaving.value = true;
            try {
                await auth.currentUser.updatePassword(passwordForm.value.newPassword);
                passwordForm.value = { newPassword: '', confirmPassword: '' };
                
                Swal.fire({
                    title: 'نجاح',
                    text: 'تم تغيير كلمة المرور بنجاح!',
                    icon: 'success',
                    confirmButtonText: 'حسناً',
                    customClass: {
                        confirmButton: 'btn-primary'
                    }
                });
            } catch (error) {
                console.error('Error updating password:', error);
                Swal.fire('خطأ', 'فشل تغيير كلمة المرور.', 'error');
            } finally {
                isSaving.value = false;
            }
        };
        
        const deleteAccount = async () => {
            const { value: confirmation } = await Swal.fire({
                title: 'هل أنت متأكد تمامًا؟',
                html: `سيتم حذف حسابك وكل بياناتك نهائيًا. للمتابعة، اكتب <b>'تأكيد الحذف'</b> في الحقل أدناه.`,
                input: 'text',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'نعم، احذف حسابي!',
                cancelButtonText: 'إلغاء',
                inputValidator: (value) => {
                    if (value !== 'تأكيد الحذف') {
                        return 'الرجاء كتابة الجملة المطلوبة بشكل صحيح للتأكيد.'
                    }
                }
            });

            if (confirmation) {
                try {
                    await db.collection('users').doc(auth.currentUser.uid).delete();
                    await auth.currentUser.delete();
                    
                    Swal.fire({
                        title: 'تم الحذف',
                        text: 'تم حذف حسابك بنجاح.',
                        icon: 'success',
                        confirmButtonText: 'حسناً',
                        customClass: {
                            confirmButton: 'btn-primary'
                        }
                    }).then(() => {
                        window.location.href = 'index.html';
                    });
                } catch (error) {
                    console.error('Error deleting account:', error);
                    Swal.fire('خطأ', 'فشل حذف الحساب.', 'error');
                }
            }
        };
        
        const logout = async () => {
            try {
                await auth.signOut();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error logging out:', error);
                Swal.fire('خطأ', 'فشل تسجيل الخروج.', 'error');
            }
        };
        
        const handleScroll = () => {
            scrolled.value = window.scrollY > 20;
        };
        
        // Lifecycle hooks
        onMounted(() => {
            auth.onAuthStateChanged(firebaseUser => {
                if (firebaseUser) {
                    fetchUserData(firebaseUser.uid);
                    fetchUserOrders(firebaseUser.uid);
                    fetchFundRequests(firebaseUser.uid);
                } else {
                    window.location.href = 'login.html';
                }
            });
            
            window.addEventListener('scroll', handleScroll);
        });
        
        // Cleanup
        const cleanup = () => {
            window.removeEventListener('scroll', handleScroll);
        };
        
        onBeforeUnmount(cleanup);
        
        return {
            user,
            purchaseOrders,
            fundRequests,
            isLoading,
            activeTab,
            profileForm,
            passwordForm,
            emailForm,
            phoneForm,
            mobileMenuOpen,
            scrolled,
            isSaving,
            isSavingPhone,
            getCountryName,
            fetchUserData,
            fetchUserOrders,
            fetchFundRequests,
            formatDate,
            updateProfile,
            changePhoneNumber,
            changeEmail,
            changePassword,
            deleteAccount,
            logout
        };
    }
}).mount('#app');