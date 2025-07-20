import { auth, db } from '../firebase/config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { collection, query, where, getDocs, doc, onSnapshot, addDoc, updateDoc, increment, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const { createApp, ref, computed, onMounted, onBeforeUnmount } = Vue;

createApp({
    setup() {
        // State variables
        const user = ref(null);
        const apps = ref([]);
        const isLoading = ref(true);
        const isModalOpen = ref(false);
        const selectedApp = ref(null);
        const purchaseForm = ref({ accountId: '', selectedPackage: null });
        const scrolled = ref(false);
        const mobileMenuOpen = ref(false);
        const searchQuery = ref('');
        const selectedCategory = ref('الكل');
        const sortBy = ref('popular');
        const featuredApps = ref([]);
        const isProcessing = ref(false);
        const unsubscribeUser = ref(null);
        
        // Categories for filtering
        const categories = ref(['الكل', 'تواصل اجتماعي', 'ترفيه', 'تعليم', 'موسيقى', 'فيديو']);
        
        // Computed properties
        const filteredApps = computed(() => {
            let result = apps.value;
            
            // Apply search filter
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                result = result.filter(app => 
                    app.name.toLowerCase().includes(query)
                );
            }
            
            // Apply category filter
            if (selectedCategory.value !== 'الكل') {
                result = result.filter(app => app.category === selectedCategory.value);
            }
            
            // Apply sorting
            if (sortBy.value === 'name') {
                result.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortBy.value === 'popular') {
                // Sort by popularity (number of packages as a proxy)
                result.sort((a, b) => b.packages.length - a.packages.length);
            } else if (sortBy.value === 'newest') {
                // Sort by creation date (if available) or by id
                result.sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        return b.createdAt.toDate() - a.createdAt.toDate();
                    }
                    return b.id.localeCompare(a.id); // Fallback to id comparison
                });
            }
            
            return result;
        });
        
        // Methods
        const fetchUserData = (uid) => {
            const userDocRef = doc(db, "users", uid);
            unsubscribeUser.value = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) { 
                    user.value = docSnap.data(); 
                }
            });
        };
        
        const fetchApps = async () => {
            isLoading.value = true;
            try {
                const servicesRef = collection(db, 'services');
                const q = query(servicesRef, where("category", "==", "app"));
                const querySnapshot = await getDocs(q);
                
                const appsData = querySnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(),
                    // Add createdAt for sorting if available
                    createdAt: doc.data().createdAt || null
                }));
                
                apps.value = appsData;
                
                // Set featured apps (first 3 apps with most packages)
                featuredApps.value = [...appsData]
                    .sort((a, b) => b.packages.length - a.packages.length)
                    .slice(0, 3);
                
            } catch (error) {
                console.error("Error fetching apps:", error);
                Swal.fire('خطأ', 'حدث خطأ أثناء جلب بيانات التطبيقات.', 'error');
            } finally {
                isLoading.value = false;
            }
        };
        
        const openPurchaseModal = (app) => {
            selectedApp.value = app;
            purchaseForm.value = { accountId: '', selectedPackage: null }; // Reset form
            isModalOpen.value = true;
        };
        
        const submitPurchase = async () => {
            const pkg = purchaseForm.value.selectedPackage;
            // Validation
            if (!purchaseForm.value.accountId.trim() || !pkg) {
                Swal.fire('خطأ', 'الرجاء إدخال بيانات الحساب واختيار باقة.', 'error');
                return;
            }
            
            if (!user.value || user.value.walletBalance < pkg.price) {
                Swal.fire('خطأ', 'رصيدك في المحفظة غير كافٍ لإتمام هذه العملية.', 'error');
                return;
            }
            
            // Confirmation
            const confirmation = await Swal.fire({
                title: 'تأكيد العملية',
                html: `سيتم خصم <b>${pkg.price}$</b> من رصيدك لشراء باقة <b>${pkg.name}</b>. هل أنت متأكد؟`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'نعم، قم بالشراء!',
                cancelButtonText: 'إلغاء',
                customClass: {
                    confirmButton: 'btn-primary',
                    cancelButton: 'bg-gray-500 hover:bg-gray-400'
                }
            });
            
            if (confirmation.isConfirmed) {
                isProcessing.value = true;
                try {
                    // 1. Deduct from user's wallet
                    const userDocRef = doc(db, "users", auth.currentUser.uid);
                    await updateDoc(userDocRef, {
                        walletBalance: increment(-pkg.price)
                    });
                    
                    // 2. Create new order
                    await addDoc(collection(db, "orders"), {
                        userId: auth.currentUser.uid,
                        userEmail: user.value.email,
                        serviceId: selectedApp.value.id,
                        serviceName: selectedApp.value.name,
                        playerId: purchaseForm.value.accountId, // Using playerId field for account ID
                        packageName: pkg.name,
                        price: pkg.price,
                        status: 'pending',
                        createdAt: serverTimestamp()
                    });
                    
                    isModalOpen.value = false;
                    Swal.fire({
                        title: 'نجاح!',
                        html: `تم شراء باقة <b>${pkg.name}</b> بنجاح لتطبيق <b>${selectedApp.value.name}</b>!`,
                        icon: 'success',
                        confirmButtonText: 'حسناً',
                        customClass: {
                            confirmButton: 'btn-primary'
                        }
                    });
                    
                } catch (error) {
                    console.error("Purchase error: ", error);
                    Swal.fire('خطأ', 'حدث خطأ أثناء معالجة طلبك.', 'error');
                } finally {
                    isProcessing.value = false;
                }
            }
        };
        
        const logout = async () => { 
            await signOut(auth); 
        };
        
        const filterByCategory = (category) => {
            selectedCategory.value = category;
        };
        
        const resetFilters = () => {
            searchQuery.value = '';
            selectedCategory.value = 'الكل';
            sortBy.value = 'popular';
        };
        
        const nextFeatured = () => {
            if (featuredApps.value.length > 0) {
                featuredApps.value.push(featuredApps.value.shift());
            }
        };
        
        const prevFeatured = () => {
            if (featuredApps.value.length > 0) {
                featuredApps.value.unshift(featuredApps.value.pop());
            }
        };
        
        const handleScroll = () => {
            scrolled.value = window.scrollY > 20;
        };
        
        // Lifecycle hooks
        onMounted(() => {
            onAuthStateChanged(auth, (firebaseUser) => {
                if (firebaseUser) {
                    fetchUserData(firebaseUser.uid);
                } else {
                    window.location.href = 'login.html';
                }
            });
            
            fetchApps();
            window.addEventListener('scroll', handleScroll);
        });
        
        // Cleanup
        const cleanup = () => {
            if (unsubscribeUser.value) unsubscribeUser.value();
            window.removeEventListener('scroll', handleScroll);
        };
        
        onBeforeUnmount(cleanup);
        
        return {
            user,
            apps,
            isLoading,
            isModalOpen,
            selectedApp,
            purchaseForm,
            scrolled,
            mobileMenuOpen,
            searchQuery,
            selectedCategory,
            sortBy,
            featuredApps,
            isProcessing,
            categories,
            filteredApps,
            openPurchaseModal,
            submitPurchase,
            logout,
            filterByCategory,
            resetFilters,
            nextFeatured,
            prevFeatured
        };
    }
}).mount('#app');