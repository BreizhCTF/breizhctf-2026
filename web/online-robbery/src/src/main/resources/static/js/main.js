document.documentElement.classList.add('reveal-ready');

document.addEventListener('DOMContentLoaded', () => {
    const revealItems = document.querySelectorAll('[data-reveal]');
    const premiumBars = document.querySelectorAll('.tiers-vertical');

    premiumBars.forEach((bar) => {
        const fill = bar.querySelector('.tiers-vertical__fill');
        const balanceValue = Number.parseFloat(bar.dataset.balance ?? '0');

        if (!fill || Number.isNaN(balanceValue)) {
            return;
        }

        const tier1 = 1_000;
        const tier2 = 10_000;
        const tier3 = 100_000;
        const tier4 = 1_000_000;

        const edgeSegment = 10.2409638554;
        const fullSegment = 26.5060240964;
        const secondMilestone = edgeSegment + fullSegment;
        const thirdMilestone = secondMilestone + fullSegment;
        const flagMilestone = thirdMilestone + fullSegment;

        let progress;

        if (balanceValue < tier1) {
            progress = (balanceValue / tier1) * edgeSegment;
        } else if (balanceValue < tier2) {
            progress = edgeSegment + ((balanceValue - tier1) / (tier2 - tier1)) * fullSegment;
        } else if (balanceValue < tier3) {
            progress = secondMilestone + ((balanceValue - tier2) / (tier3 - tier2)) * fullSegment;
        } else if (balanceValue < tier4) {
            progress = thirdMilestone + ((balanceValue - tier3) / (tier4 - tier3)) * fullSegment;
        } else {
            const excess = balanceValue - tier4;
            const tailRatio = excess / (excess + tier4);
            progress = flagMilestone + edgeSegment * tailRatio;
        }

        const clampedProgress = Math.max(0, Math.min(progress, 100));
        fill.style.height = `${clampedProgress}%`;
    });

    if (!('IntersectionObserver' in window) || revealItems.length === 0) {
        revealItems.forEach((item) => item.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    revealItems.forEach((item) => observer.observe(item));
});
