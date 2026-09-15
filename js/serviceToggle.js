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

			setActiveService(this.dataset.service);
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
			setActiveService(activeService || firstService);
		} else if (activeService) {
			setActiveService(activeService);
		} else {
			closeAllServices();
		}
	});

	if (window.innerWidth >= breakpoint) {
		setActiveService(activeService || firstService);
	} else if (activeService) {
		setActiveService(activeService);
	}

	const helpLinks = document.querySelectorAll('#ourHelp .our-help__list a[href]');

	function setActiveHelpLink(hash) {
		helpLinks.forEach((link) => {
			link.classList.toggle('active', link.getAttribute('href') === hash);
		});
	}

	const currentHash = window.location.hash;

	if (currentHash) {
		setActiveHelpLink(currentHash);
	}

	helpLinks.forEach((link) => {
		link.addEventListener('click', function () {
			if (window.innerWidth < breakpoint) return;

			setActiveHelpLink(this.getAttribute('href'));
		});
	});

	const helpSelect = document.querySelector('#ourHelp .select-help');
	const helpSelectText = helpSelect?.querySelector('.text');
	const helpSelectOption = document.querySelector('#ourHelp .select-help-option');
	console.log(helpSelect, helpSelectText, helpSelectOption);

	if (!helpSelect || !helpSelectText || !helpSelectOption) return;

	helpSelect.addEventListener('click', function () {
		if (window.innerWidth < breakpoint) return;
		helpSelectOption.classList.toggle('d-none');
		this.classList.toggle('clicked');
		const currentHash = window.location.hash;

		if (currentHash) {
			helpSelectText.textContent = currentHash.substring(1);
		}
	});

	function updateHelpSelect() {
		if (window.innerWidth >= breakpoint) {
			helpSelectOption.classList.remove('d-none');
		} else {
			helpSelectOption.classList.add('d-none');
			helpSelect.classList.remove('clicked');
		}
	}

	updateHelpSelect();

	window.addEventListener('resize', updateHelpSelect);
}

serviceToggle();
