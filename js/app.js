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
	const serviceNames = document.querySelectorAll('#whatWeDo .list-do .service-name');

	const serviceWraps = document.querySelectorAll('#whatWeDo .service-wrap');

	serviceNames.forEach((serviceName) => {
		serviceName.addEventListener('click', function () {
			const service = this.dataset.service;

			serviceNames.forEach((item) => {
				item.classList.remove('active');
			});

			this.classList.add('active');

			serviceWraps.forEach((wrap) => {
				wrap.classList.remove('active');
			});

			const matchingWrap = document.querySelector(`#whatWeDo .service-wrap[data-service="${service}"]`);

			if (matchingWrap) {
				matchingWrap.classList.add('active');
			}
		});
	});
}

document.addEventListener('DOMContentLoaded', () => {
	fadeInSec();
	domCta();
	serviceToggle();
});
