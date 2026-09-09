// Navigation

const navToggle = document.getElementById('navCall');
const siteNavWrap = document.getElementById('siteNav');
const siteNav = siteNavWrap?.querySelector('.nav');

const navClassListAdd = ['flex-column'];
const navClassListWrapAdd = ['mob-nav', 'd-none', 'position-absolute', 'start-0', 'top-100', 'w-100', 'text-center'];

function navCall() {
	if (!navToggle || !siteNav || !siteNavWrap) return;

	navToggle.addEventListener('click', function () {
		this.classList.toggle('is-active');

		navClassListWrapAdd.forEach((c) => siteNavWrap.classList.toggle(c));
		navClassListAdd.forEach((c) => siteNav.classList.toggle(c));
	});
}

document.addEventListener('DOMContentLoaded', function () {
	navCall();
});
