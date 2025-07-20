document.addEventListener('DOMContentLoaded', () => {

    const burgerButton = document.getElementById('burger-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (burgerButton && mobileMenu) {
        burgerButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

});
