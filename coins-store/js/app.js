document.addEventListener('DOMContentLoaded', () => {

    // الحصول على زر البرجر والقائمة الخاصة بالهاتف
    const burgerButton = document.getElementById('burger-button');
    const mobileMenu = document.getElementById('mobile-menu');

    // التأكد من وجود العناصر قبل إضافة المستمع لتجنب الأخطاء
    if (burgerButton && mobileMenu) {
        // إضافة مستمع حدث 'النقر' على زر البرجر
        burgerButton.addEventListener('click', () => {
            // عند النقر، قم بإظهار أو إخفاء القائمة عن طريق تبديل كلاس 'hidden'
            mobileMenu.classList.toggle('hidden');
        });
    }

});