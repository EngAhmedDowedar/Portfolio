const { createApp } = Vue;

    createApp({
        data() {
            return {
                user: null,
                scrolled: false,
                banners: [
                    {
                        title: 'عروض الصيف المميزة',
                        subtitle: 'احصل على خصم 20% على جميع عمليات الشحن لفترة محدودة!',
                        imageUrl: './img/banner-1.webp',
                        linkUrl: '#'
                    },
                    {
                        title: 'شحن أسرع من البرق',
                        subtitle: 'خدمة فورية وآمنة لجميع تطبيقاتك وألعابك المفضلة.',
                        imageUrl: '../img/banner-2.webp',
                        linkUrl: '#'
                    },
                    {
                        title: 'كل ألعابك في مكان واحد',
                        subtitle: 'نوفر لك شحن آمن لكل ألعابك المفضلة بأفضل الأسعار.',
                        imageUrl: '../img/banner-3.webp',
                        linkUrl: '#'
                    }
                ],
                currentBannerIndex: 0,
                bannerInterval: null,
            };
        },
        mounted() {
            // Simulate user state for demo
            this.user = {
                name: "محمد أحمد",
                email: "mohamed@example.com"
            };
            
            // Banner auto slide
            this.startBannerInterval();
            
            // Scroll effect for header
            window.addEventListener('scroll', this.handleScroll);
            
            // Mobile menu toggle
            document.getElementById('burger-button').addEventListener('click', () => {
                document.getElementById('mobile-menu').classList.toggle('hidden');
            });
        },
        methods: {
            // دوال التحكم في السلايدر
            nextBanner() {
                this.currentBannerIndex = (this.currentBannerIndex + 1) % this.banners.length;
                this.restartBannerInterval();
            },
            prevBanner() {
                this.currentBannerIndex = (this.currentBannerIndex - 1 + this.banners.length) % this.banners.length;
                this.restartBannerInterval();
            },
            restartBannerInterval() {
                if (this.bannerInterval) clearInterval(this.bannerInterval);
                this.startBannerInterval();
            },
            startBannerInterval() {
                this.bannerInterval = setInterval(() => {
                    this.nextBanner();
                }, 5000); // 5 seconds
            },
            handleScroll() {
                this.scrolled = window.scrollY > 20;
            },
            logout() {
                this.user = null;
                // Here you would normally call Firebase signOut
                console.log("User logged out");
            }
        },
        beforeUnmount() {
            if (this.bannerInterval) clearInterval(this.bannerInterval);
            window.removeEventListener('scroll', this.handleScroll);
        }
    }).mount('#app');
