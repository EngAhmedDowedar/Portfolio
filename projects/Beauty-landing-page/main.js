// --- GLOBALS ---
const htmlEl = document.documentElement;
const body = document.body;
const lightIcon = document.querySelector('.light-icon');
const darkIcon = document.querySelector('.dark-icon');
const langEnBtn = document.querySelector('.lang-en');
const langArBtn = document.querySelector('.lang-ar');
const mobileMenu = document.getElementById('mobile-menu');
const backToTopBtn = document.getElementById('back-to-top-btn');

// Translations (would normally be in an external JSON file)
const translations = {
ar: {
    nav_about: "من نحن",
    nav_products: "منتجاتنا",
    nav_features: "مميزاتنا",
    nav_testimonials: "اراء العملاء",
    hero_title: "جمالك الطبيعي <span class='gradient-text'>مشرق</span> مع Glow Beauty",
    hero_subtitle: "اكتشفي منتجات التجميل الفاخرة المصممة لتعزيز جمالك الطبيعي وترطيب بشرتك",
    hero_cta_button: "<i class='fas fa-shopping-bag mr-2'></i> تصفح المنتجات",
    hero_cta_secondary: "تعرف علينا",
    about_title: "عن علامتنا <span class='gradient-text'>Glow Beauty</span>",
    about_description: "في Glow Beauty، نؤمن بأن الجمال الحقيقي ينبع من الثقة بالنفس والعناية الذاتية. تأسست علامتنا التجارية عام 2010 بمهمة واحدة: تقديم منتجات تجميل فاخرة تعزز جمالك الطبيعي دون المساس ببشرتك.",
    about_feature1: "مكونات طبيعية وفعالة",
    about_feature2: "خالية من المواد الضارة",
    about_feature3: "مناسبة لجميع أنواع البشرة",
    products_title: "منتجاتنا <span class='gradient-text'>الأكثر مبيعاً</span>",
    products_subtitle: "اكتشفي مجموعة منتجاتنا الفاخرة التي تم تطويرها بعناية لتعزيز جمال بشرتك",
    product1_name: "سيروم الإشراقة الليلية",
    product1_desc: "لتجديد البشرة أثناء النوم",
    product1_price: "149 ر.س",
    product2_name: "مرطب النهار الخفيف",
    product2_desc: "حماية وترطيب طوال اليوم",
    product2_price: "129 ر.س",
    product3_name: "قناع الطين المنقي",
    product3_desc: "لتنقية المسام وتوحيد لون البشرة",
    product3_price: "99 ر.س",
    add_to_cart_btn: "إضافة للسلة",
    view_all_products: "عرض جميع المنتجات",
    features_title: "لماذا تختار <span class='gradient-text'>Glow Beauty</span>",
    features_subtitle: "جودة لا تضاهى واهتمام بكل التفاصيل لتحصلي على أفضل تجربة تجميل",
    feature1_title: "مكونات طبيعية",
    feature1_description: "منتجاتنا مصنوعة من مكونات طبيعية وفعالة تم اختيارها بعناية لتناسب بشرتك",
    feature2_title: "خالية من المواد الضارة",
    feature2_description: "خالية من البارابين، الكبريتات، العطور الاصطناعية والملونات الضارة",
    feature3_title: "مناسبة للبشرة الحساسة",
    feature3_description: "تم اختبار جميع المنتجات لتكون آمنة على البشرة الحساسة",
    testimonials_title: "أراء <span class='gradient-text'>عملائنا</span>",
    testimonials_subtitle: "انطباعات حقيقية من عملائنا السعداء",
    testimonial1_text: "\"سيروم الإشراقة الليلية غير بشرتي تماماً! أصبحت أكثر نضارة وإشراقاً بعد أسبوعين فقط من الاستخدام.\"",
    testimonial1_name: "سارة محمد",
    testimonial2_text: "\"مرطب النهار مثالي لبشرتي الدهنية. خفيف ولا يسبب اللمعان، ويوفر حماية ممتازة من الشمس.\"",
    testimonial2_name: "لمى أحمد",
    testimonial3_text: "\"قناع الطين المنقي أفضل ما جربته لتنقية مسام وجهي. أستخدمه مرة أسبوعياً وأرى الفرق.\"",
    testimonial3_name: "نورا خالد",
    testimonial_status: "عميلة منذ 2021",
    newsletter_title: "انضمي إلى قائمتنا البريدية",
    newsletter_subtitle: "احصلي على عروض حصرية، نصائح للعناية بالبشرة، وأولوية في المنتجات الجديدة",
    email_placeholder: "بريدك الإلكتروني",
    subscribe_button: "اشتراك",
    footer_description: "جمال مشرق يبدأ من العناية الصحيحة ببشرتك",
    footer_links1: "روابط سريعة",
    footer_link1: "من نحن",
    footer_link2: "منتجاتنا",
    footer_link3: "المدونة",
    footer_link4: "تواصل معنا",
    footer_links2: "المساعدة",
    footer_link5: "الشحن والتوصيل",
    footer_link6: "الأسئلة الشائعة",
    footer_link7: "سياسة الإرجاع",
    footer_link8: "دليل البشرة",
    footer_contact: "تواصل معنا",
    footer_address: "الرياض، المملكة العربية السعودية",
    footer_rights: "جميع الحقوق محفوظة",
    page_title: "Glow Beauty - جمال مشرق"
},
en: {
    nav_about: "About Us",
    nav_products: "Products",
    nav_features: "Features",
    nav_testimonials: "Testimonials",
    hero_title: "Your Natural <span class='gradient-text'>Glow</span> with Glow Beauty",
    hero_subtitle: "Discover luxury cosmetic products designed to enhance your natural beauty and hydrate your skin",
    hero_cta_button: "<i class='fas fa-shopping-bag mr-2'></i> Browse Products",
    hero_cta_secondary: "Learn More",
    about_title: "About <span class='gradient-text'>Glow Beauty</span>",
    about_description: "At Glow Beauty, we believe true beauty comes from self-confidence and self-care. Our brand was founded in 2010 with one mission: to provide luxury cosmetic products that enhance your natural beauty without compromising your skin.",
    about_feature1: "Natural and effective ingredients",
    about_feature2: "Free from harmful substances",
    about_feature3: "Suitable for all skin types",
    products_title: "Our <span class='gradient-text'>Bestsellers</span>",
    products_subtitle: "Discover our collection of luxury products carefully developed to enhance your skin's beauty",
    product1_name: "Night Glow Serum",
    product1_desc: "For skin renewal during sleep",
    product1_price: "149 R.S",
    product2_name: "Light Day Moisturizer",
    product2_desc: "Protection and hydration all day",
    product2_price: "129 R.S",
    product3_name: "Purifying Clay Mask",
    product3_desc: "To cleanse pores and even skin tone",
    product3_price: "99 R.S",
    add_to_cart_btn: "Add to cart",
    view_all_products: "View All Products",
    features_title: "Why Choose <span class='gradient-text'>Glow Beauty</span>",
    features_subtitle: "Unmatched quality and attention to detail for the best beauty experience",
    feature1_title: "Natural Ingredients",
    feature1_description: "Our products are made from natural and effective ingredients carefully selected for your skin",
    feature2_title: "Free from Harmful Substances",
    feature2_description: "Free from parabens, sulfates, synthetic fragrances and harmful dyes",
    feature3_title: "Suitable for Sensitive Skin",
    feature3_description: "All products tested to be safe for sensitive skin",
    testimonials_title: "Customer <span class='gradient-text'>Reviews</span>",
    testimonials_subtitle: "Real impressions from our happy customers",
    testimonial1_text: "\"The Night Glow Serum completely transformed my skin! It became fresher and brighter after just two weeks of use.\"",
    testimonial1_name: "Sarah Mohamed",
    testimonial2_text: "\"The Light Day Moisturizer is perfect for my oily skin. Lightweight, doesn't cause shine, and provides excellent sun protection.\"",
    testimonial2_name: "Lama Ahmed",
    testimonial3_text: "\"The Purifying Clay Mask is the best I've tried for cleansing my facial pores. I use it once a week and see the difference.\"",
    testimonial3_name: "Nora Khaled",
    testimonial_status: "Customer since 2021",
    newsletter_title: "Join Our Newsletter",
    newsletter_subtitle: "Get exclusive offers, skin care tips, and priority on new products",
    email_placeholder: "Your email",
    subscribe_button: "Subscribe",
    footer_description: "Radiant beauty starts with proper skin care",
    footer_links1: "Quick Links",
    footer_link1: "About Us",
    footer_link2: "Products",
    footer_link3: "Blog",
    footer_link4: "Contact Us",
    footer_links2: "Help",
    footer_link5: "Shipping & Delivery",
    footer_link6: "FAQ",
    footer_link7: "Return Policy",
    footer_link8: "Skin Guide",
    footer_contact: "Contact Us",
    footer_address: "Riyadh, Saudi Arabia",
    footer_rights: "All Rights Reserved",
    page_title: "Glow Beauty - Radiant Beauty"
}
};

// --- CORE FUNCTIONS ---
const setLanguage = (lang) => {
const translation = translations[lang];
if (!translation) return;

document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    if (translation[key]) {
    if (el.placeholder) {
        el.placeholder = translation[key];
    } else {
        el.innerHTML = translation[key];
    }
    }
});

htmlEl.lang = lang;
htmlEl.dir = lang === 'ar' ? 'rtl' : 'ltr';
document.title = translation.page_title || "Glow Beauty";
body.classList.toggle('en-lang', lang === 'en');

// Update language toggle button
if (lang === 'ar') {
    langArBtn.textContent = 'EN';
    langEnBtn.classList.add('hidden');
    langArBtn.classList.remove('hidden');
} else {
    langEnBtn.textContent = 'AR';
    langArBtn.classList.add('hidden');
    langEnBtn.classList.remove('hidden');
}

localStorage.setItem('language', lang);
};

const applyTheme = (isDark) => {
body.classList.toggle("dark", isDark);
darkIcon.classList.toggle('hidden', isDark);
lightIcon.classList.toggle('hidden', !isDark);
localStorage.setItem('darkMode', isDark);
};

// --- EVENT HANDLERS ---
const toggleTheme = () => {
const isDark = !body.classList.contains("dark");
applyTheme(isDark);
};

const toggleLanguage = () => {
const currentLang = localStorage.getItem('language') || 'ar';
setLanguage(currentLang === 'ar' ? 'en' : 'ar');
};

const toggleMobileMenu = () => {
mobileMenu.classList.toggle('hidden');
body.classList.toggle('overflow-hidden');
};

const handleScroll = () => {
// Back to top button
if (window.scrollY > 300) {
    backToTopBtn.classList.remove('hidden', 'opacity-0', 'translate-y-2');
    backToTopBtn.classList.add('opacity-100');
} else {
    backToTopBtn.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => backToTopBtn.classList.add('hidden'), 300);
}

// Header shadow
if (window.scrollY > 50) {
    document.querySelector('header').classList.add('shadow-md');
} else {
    document.querySelector('header').classList.remove('shadow-md');
}
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
// Set language
const savedLanguage = localStorage.getItem('language') || 'ar';
setLanguage(savedLanguage);

// Set theme
const savedDarkMode = localStorage.getItem('darkMode') === 'true';
applyTheme(savedDarkMode);

// Set current year
document.getElementById('year').textContent = new Date().getFullYear();

// Initialize animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
    if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
    }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
});
});

// --- EVENT LISTENERS ---
window.addEventListener('scroll', handleScroll);
backToTopBtn.addEventListener('click', () => {
window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Close mobile menu when clicking on links
document.querySelectorAll('#mobile-menu a').forEach(link => {
link.addEventListener('click', toggleMobileMenu);
});
