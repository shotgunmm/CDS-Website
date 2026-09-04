// Navigation

const navToggle = document.getElementById('navCall');
const siteNavWrap = document.getElementById('siteNav');
const siteNav = siteNavWrap?.querySelector('.nav');

const navClassListAdd = ['flex-column'];
const navClassListWrapAdd = ['mob-nav', 'd-none', 'position-absolute', 'start-0', 'w-100'];

function navCall() {
	if (!navToggle || !siteNav || !siteNavWrap) return;

	navToggle.addEventListener('click', function () {
		this.classList.toggle('is-active');

		navClassListWrapAdd.forEach((c) => siteNavWrap.classList.toggle(c));
		navClassListAdd.forEach((c) => siteNav.classList.toggle(c));
	});
}

function subMenuToggle() {
	const icons = document.querySelectorAll('.has-sub > .icon, .has-sub-more > .icon');

	icons.forEach((icon) => {
		icon.addEventListener('click', function (e) {
			if (window.innerWidth > 991) return;

			e.preventDefault();
			e.stopPropagation();

			const parentLi = this.closest('li');
			const subMenu = parentLi.querySelector(':scope > .nav');

			if (!subMenu) return;

			const isHidden = subMenu.classList.contains('d-none');

			if (isHidden) {
				subMenu.classList.remove('d-none');
				subMenu.classList.add('flex-column');
				subMenu.classList.remove('shadow');
				this.classList.add('active-icon');
			} else {
				subMenu.classList.add('d-none');
				subMenu.classList.remove('flex-column');
				this.classList.remove('active-icon');
			}
		});
	});
}

function columnToggle() {
	const heads = document.querySelectorAll('.head');

	heads.forEach((head) => {
		const icon = head.querySelector('.icon');
		const list = head.nextElementSibling;

		if (!icon || !list) return;

		icon.addEventListener('click', function (e) {
			if (window.innerWidth > 991) return;

			e.preventDefault();

			const isHidden = list.classList.contains('d-none');

			if (isHidden) {
				list.classList.remove('d-none');
				icon.classList.add('active-icon');
			} else {
				list.classList.add('d-none');
				icon.classList.remove('active-icon');
			}
		});
	});
}

function handleResize() {
	if (!siteNavWrap) return;

	const subMenus = siteNavWrap.querySelectorAll('.nav .nav');
	const icons = siteNavWrap.querySelectorAll('.has-sub > .icon, .has-sub-more > .icon');

	if (window.innerWidth > 991) {
		if (navToggle) navToggle.classList.remove('is-active');

		if (siteNav) navClassListAdd.forEach((c) => siteNav.classList.remove(c));

		navClassListWrapAdd.forEach((c) => siteNavWrap.classList.remove(c));
		siteNavWrap.classList.add('d-none', 'd-lg-flex');

		subMenus.forEach((menu) => {
			menu.classList.remove('d-none');
			menu.classList.remove('flex-column');
			menu.classList.add('shadow');
		});

		icons.forEach((icon) => icon.classList.remove('active-icon'));
	} else {
		subMenus.forEach((menu) => {
			menu.classList.add('d-none');
			menu.classList.remove('flex-column');
			menu.classList.remove('shadow');
		});

		icons.forEach((icon) => icon.classList.remove('active-icon'));
	}
}

function handleColumnResize() {
	const lists = document.querySelectorAll('.link.nav');
	const icons = document.querySelectorAll('.head .icon');

	if (window.innerWidth > 991) {
		lists.forEach((list) => {
			list.classList.remove('d-none');
		});

		icons.forEach((icon) => {
			icon.classList.remove('active-icon');
		});
	} else {
		lists.forEach((list) => {
			list.classList.add('d-none');
		});

		icons.forEach((icon) => {
			icon.classList.remove('active-icon');
		});
	}
}

let resizeTimer;

window.addEventListener('resize', function () {
	clearTimeout(resizeTimer);

	resizeTimer = setTimeout(() => {
		handleResize();
		handleColumnResize();
	}, 150);
});

document.addEventListener('DOMContentLoaded', function () {
	navCall();
	subMenuToggle();
	handleResize();
	columnToggle();
	handleColumnResize();
});
