'use strict';

function domCta() {
	// DOM CTA Style
	const ctas = document.querySelectorAll('.cta');

	const ctaBaseClasses = ['cta', 'py-2', 'text-decoration-none', 'text-uppercase', 'd-inline-flex', 'align-items-center', 'rounded-3'];

	ctas.forEach((cta) => {
		cta.classList.add(...ctaBaseClasses, 'px-3');
	});
}

function fadeInSec() {
	// Fade-In Animation
	const fadeInEle = document.querySelectorAll('.fade-in');
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible');
					observer.unobserve(entry.target);
				}
			});
		},
		{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
	);

	fadeInEle.forEach((ele) => observer.observe(ele));
}

function serviceToggle() {
	const breakpoint = 992;
	const serviceNames = document.querySelectorAll('#whatWeDo .list-do .service-name');
	const serviceWraps = document.querySelectorAll('#whatWeDo .service-wrap');
	const mobileServiceNames = document.querySelectorAll('#whatWeDo .service-wrap > .service-name');
	const firstService = serviceWraps[0]?.dataset.service;
	let activeService = document.querySelector('#whatWeDo .service-wrap.active')?.dataset.service || firstService;

	function setActiveService(service) {
		activeService = service;

		serviceNames.forEach((item) => {
			item.classList.toggle('active', item.dataset.service === service);
		});

		serviceWraps.forEach((wrap) => {
			wrap.classList.toggle('active', wrap.dataset.service === service);
		});
	}

	function closeAllServices() {
		serviceNames.forEach((item) => {
			item.classList.remove('active');
		});

		serviceWraps.forEach((wrap) => {
			wrap.classList.remove('active');
		});

		activeService = null;
	}

	serviceNames.forEach((serviceName) => {
		serviceName.addEventListener('click', function () {
			if (window.innerWidth < breakpoint) return;

			const service = this.dataset.service;

			setActiveService(service);
		});
	});

	mobileServiceNames.forEach((serviceName) => {
		serviceName.addEventListener('click', function () {
			if (window.innerWidth >= breakpoint) return;

			const wrap = this.closest('.service-wrap');

			if (!wrap) return;

			const service = wrap.dataset.service;
			const isOpen = wrap.classList.contains('active');

			if (isOpen) {
				closeAllServices();
			} else {
				setActiveService(service);
			}
		});
	});

	let wasDesktop = window.innerWidth >= breakpoint;

	window.addEventListener('resize', function () {
		const isDesktop = window.innerWidth >= breakpoint;

		if (isDesktop === wasDesktop) return;

		wasDesktop = isDesktop;

		if (isDesktop) {
			if (!activeService) {
				setActiveService(firstService);
			} else {
				setActiveService(activeService);
			}
		} else {
			if (activeService) {
				setActiveService(activeService);
			} else {
				closeAllServices();
			}
		}
	});

	if (window.innerWidth >= breakpoint) {
		setActiveService(activeService || firstService);
	} else {
		if (activeService) {
			setActiveService(activeService);
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	fadeInSec();
	domCta();
	serviceToggle();
});
