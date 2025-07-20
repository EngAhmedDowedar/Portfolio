import { auth, db } from '../firebase/config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { collection, query, where, getDocs, doc, onSnapshot, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const { createApp, ref, computed, onMounted, onBeforeUnmount } = Vue;

createApp({
    setup() {
        // State variables
        const user = ref(null);
        const numbers = ref([]);
        const isLoading = ref(true);
        const isModalOpen = ref(false);
        const selectedNumber = ref(null);
        const purchaseForm = ref({ appName: '', selectedPackage: null });
        const scrolled = ref(false);
        const mobileMenuOpen = ref(false);
        const searchQuery = ref('');
        const selectedCountry = ref('الكل');
        const sortBy = ref('popular');
        const featuredNumbers = ref([]);
        const isProcessing = ref(false);
        const unsubscribeUser = ref(null);
        
        // Countries for filtering
        const countries = ref(['الكل', 'السعودية', 'مصر', 'الإمارات', 'الكويت', 'العراق', 'الأردن', 'عُمان', 'قطر', 'البحرين', 'تركيا', 'الولايات المتحدة']);
        
        // Computed properties
        const filteredNumbers = computed(() => {
            let result = numbers.value;
            
            // Apply search filter
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                result = result.filter(num => 
                    num.name.toLowerCase().includes(query) ||
                    (num.country && num.country.toLowerCase().includes(query))
                );
            }
            
            // Apply country filter
            if (selectedCountry.value !== 'الكل') {
                result = result.filter(num => num.country === selectedCountry.value);
            }
            
            // Apply sorting
            if (sortBy.value === 'name') {
                result.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortBy.value === 'popular') {
                // Sort by popularity (number of packages as a proxy)
                result.sort((a, b) => b.packages.length - a.packages.length);
            } else if (sortBy.value === 'price') {
                // Sort by the lowest package price
                result.sort((a, b) => {
                    const minA = Math.min(...a.packages.map(p => p.price));
                    const minB = Math.min(...b.packages.map(p => p.price));
                    return minA - minB;
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
        
        const fetchNumbers = async () => {
            isLoading.value = true;
            try {
                const servicesRef = collection(db, 'services');
                const q = query(servicesRef, where("category", "==", "number"));
                const querySnapshot = await getDocs(q);
                
                const numbersData = querySnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(),
                    // Add createdAt for sorting if available
                    createdAt: doc.data().createdAt || null
                }));
                
                numbers.value = numbersData;
                
                // Set featured numbers (first 3 numbers with most packages)
                featuredNumbers.value = [...numbersData]
                    .sort((a, b) => b.packages.length - a.packages.length)
                    .slice(0, 3);
                
            } catch (error) {
                console.error("Error fetching numbers:", error);
                Swal.fire('خطأ', 'حدث خطأ أثناء جلب بيانات الأرقام.', 'error');
            } finally {
                isLoading.value = false;
            }
        };
        
        const openPurchaseModal = (num) => {
            selectedNumber.value = num;
            purchaseForm.value = { appName: '', selectedPackage: null }; // Reset form
            isModalOpen.value = true;
        };
        
        const submitPurchase = async () => {
            const pkg = purchaseForm.value.selectedPackage;
            // Validation
            if (!purchaseForm.value.appName.trim() || !pkg) {
                Swal.fire('خطأ', 'الرجاء إدخال اسم التطبيق واختيار نوع الرقم.', 'error');
                return;
            }
            
            if (!user.value || user.value.walletBalance < pkg.price) {
                Swal.fire('خطأ', 'رصيدك في المحفظة غير كافٍ لإتمام هذه العملية.', 'error');
                return;
            }
            
            // Confirmation
            const confirmation = await Swal.fire({
                title: 'تأكيد العملية',
                html: `سيتم حجز مبلغ <b>${pkg.price}$</b> من رصيدك لشراء <b>${pkg.name}</b>. سيتم الخصم الفعلي بعد موافقة الإدارة.`,
                icon: 'info',
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
                    // Create new order in 'orders' collection
                    await addDoc(collection(db, "orders"), {
                        userId: auth.currentUser.uid,
                        userEmail: user.value.email,
                        serviceId: selectedNumber.value.id,
                        serviceName: selectedNumber.value.name,
                        playerId: purchaseForm.value.appName, // Using playerId to store the app name
                        packageName: pkg.name,
                        price: pkg.price,
                        status: 'pending',
                        createdAt: serverTimestamp()
                    });
                    
                    isModalOpen.value = false;
                    Swal.fire({
                        title: 'نجاح!',
                        html: `تم إرسال طلبك بنجاح لشراء <b>${pkg.name}</b> لتطبيق <b>${purchaseForm.value.appName}</b>! سيتم التواصل معك قريبًا.`,
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
        
        const filterByCountry = (country) => {
            selectedCountry.value = country;
        };
        
        const resetFilters = () => {
            searchQuery.value = '';
            selectedCountry.value = 'الكل';
            sortBy.value = 'popular';
        };
        
        const nextFeatured = () => {
            if (featuredNumbers.value.length > 0) {
                featuredNumbers.value.push(featuredNumbers.value.shift());
            }
        };
        
        const prevFeatured = () => {
            if (featuredNumbers.value.length > 0) {
                featuredNumbers.value.unshift(featuredNumbers.value.pop());
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
            
            fetchNumbers();
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
            numbers,
            isLoading,
            isModalOpen,
            selectedNumber,
            purchaseForm,
            scrolled,
            mobileMenuOpen,
            searchQuery,
            selectedCountry,
            sortBy,
            featuredNumbers,
            isProcessing,
            countries,
            filteredNumbers,
            openPurchaseModal,
            submitPurchase,
            logout,
            filterByCountry,
            resetFilters,
            nextFeatured,
            prevFeatured
        };
    }
}).mount('#app');