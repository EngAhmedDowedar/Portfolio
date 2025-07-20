import { auth, db } from '../firebase/config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { collection, query, where, getDocs, doc, onSnapshot, addDoc, updateDoc, increment, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';



const { createApp, ref, computed, onMounted, onBeforeUnmount } = Vue;
    
createApp({
    setup() {
        // State variables
        const user = ref(null);
        const games = ref([]);
        const isLoading = ref(true);
        const isModalOpen = ref(false);
        const selectedGame = ref(null);
        const purchaseForm = ref({ playerId: '', amountUSD: 1 });
        const scrolled = ref(false);
        const mobileMenuOpen = ref(false);
        const searchQuery = ref('');
        const selectedCategory = ref('الكل');
        const sortBy = ref('popular');
        const featuredGames = ref([]);
        const isProcessing = ref(false);
        const unsubscribeUser = ref(null);
        
        // Categories for filtering
        const categories = ref(['الكل', 'أكشن', 'استراتيجية', 'رياضية', 'مغامرة', 'قتال']);
        
        // Computed properties
        const filteredGames = computed(() => {
            let result = games.value;
            
            // Apply search filter
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                result = result.filter(game => 
                    game.name.toLowerCase().includes(query)
                );
            }
            
            // Apply category filter
            if (selectedCategory.value !== 'الكل') {
                result = result.filter(game => game.category === selectedCategory.value);
            }
            
            // Apply sorting
            if (sortBy.value === 'name') {
                result.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortBy.value === 'popular') {
                // Sort by popularity (conversion rate as a proxy)
                result.sort((a, b) => b.conversionRate - a.conversionRate);
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
        
        const calculatedGems = computed(() => {
            if (selectedGame.value && purchaseForm.value.amountUSD > 0) {
                const totalGems = purchaseForm.value.amountUSD * selectedGame.value.conversionRate;
                return `${totalGems.toLocaleString('ar-EG')} وحدة`;
            }
            return '';
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
        
        const fetchGames = async () => {
            isLoading.value = true;
            try {
                const servicesRef = collection(db, 'services');
                const q = query(servicesRef, where("category", "==", "game"));
                const querySnapshot = await getDocs(q);
                
                const gamesData = querySnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(),
                    // Add createdAt for sorting if available
                    createdAt: doc.data().createdAt || null
                }));
                
                games.value = gamesData;
                
                // Set featured games (first 3 games with highest conversion rate)
                featuredGames.value = [...gamesData]
                    .sort((a, b) => b.conversionRate - a.conversionRate)
                    .slice(0, 3);
                
            } catch (error) {
                console.error("Error fetching games:", error);
                Swal.fire('خطأ', 'حدث خطأ أثناء جلب بيانات الألعاب.', 'error');
            } finally {
                isLoading.value = false;
            }
        };
        
        const openPurchaseModal = (game) => {
            selectedGame.value = game;
            purchaseForm.value = { playerId: '', amountUSD: 1 };
            isModalOpen.value = true;
        };
        
        const submitPurchase = async () => {
            // Validation
            if (!purchaseForm.value.playerId.trim() || !purchaseForm.value.amountUSD || purchaseForm.value.amountUSD <= 0) {
                Swal.fire('خطأ', 'الرجاء إدخال ID والمبلغ بشكل صحيح.', 'error');
                return;
            }
            
            if (!user.value || user.value.walletBalance < purchaseForm.value.amountUSD) {
                Swal.fire('خطأ', 'رصيدك في المحفظة غير كافٍ لإتمام هذه العملية.', 'error');
                return;
            }
            
            // Confirmation
            const confirmation = await Swal.fire({
                title: 'تأكيد العملية',
                html: `سيتم خصم <b>${purchaseForm.value.amountUSD}$</b> من رصيدك لشحن <b>${calculatedGems.value}</b>. هل أنت متأكد؟`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'نعم، قم بالشحن!',
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
                        walletBalance: increment(-purchaseForm.value.amountUSD)
                    });
                    
                    // 2. Create new order
                    await addDoc(collection(db, "orders"), {
                        userId: auth.currentUser.uid,
                        userEmail: user.value.email,
                        serviceId: selectedGame.value.id,
                        serviceName: selectedGame.value.name,
                        playerId: purchaseForm.value.playerId,
                        amountUSD: purchaseForm.value.amountUSD,
                        convertedAmount: calculatedGems.value,
                        status: 'pending',
                        createdAt: serverTimestamp()
                    });
                    
                    isModalOpen.value = false;
                    Swal.fire({
                        title: 'نجاح!',
                        html: `تم شحن <b>${calculatedGems.value}</b> بنجاح إلى لعبة <b>${selectedGame.value.name}</b>!`,
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
            if (featuredGames.value.length > 0) {
                featuredGames.value.push(featuredGames.value.shift());
            }
        };
        
        const prevFeatured = () => {
            if (featuredGames.value.length > 0) {
                featuredGames.value.unshift(featuredGames.value.pop());
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
            
            fetchGames();
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
            games,
            isLoading,
            isModalOpen,
            selectedGame,
            purchaseForm,
            scrolled,
            mobileMenuOpen,
            searchQuery,
            selectedCategory,
            sortBy,
            featuredGames,
            isProcessing,
            categories,
            filteredGames,
            calculatedGems,
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