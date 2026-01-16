// Landing Page JavaScript

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Mobile menu toggle (if needed)
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Navbar scroll effect
const navbar = document.querySelector('.navbar');
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.boxShadow = 'var(--shadow-md)';
    } else {
        navbar.style.boxShadow = 'none';
    }

    lastScrollY = window.scrollY;
});

// Check if user is logged in and update nav accordingly
document.addEventListener('DOMContentLoaded', async () => {
    // Check Supabase auth state
    if (typeof supabaseClient !== 'undefined') {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (session) {
            updateNavForLoggedInUser();

            // Check if we just came from an email link (hash contains access_token)
            // If so, forward to dashboard immediately for better UX
            if (window.location.hash && window.location.hash.includes('access_token')) {
                console.log('Detected auth token, redirecting to dashboard...');
                window.location.href = 'dashboard.html';
            }
        }

        // Listen for changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session) {
                updateNavForLoggedInUser();
                // Also redirect on explicit sign-in events if on landing page
                if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
                    // specific check to avoid redirect loop if just loading
                    // but for landing page, usually safe if they just signed in
                }
            }
        });
    }
});

function updateNavForLoggedInUser() {
    const navActions = document.querySelector('.nav-actions');
    if (navActions) {
        navActions.innerHTML = `
            <a href="dashboard.html" class="btn btn-primary">Go to Dashboard</a>
        `;
    }
}

// Add animation on scroll (simple reveal)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card, .pricing-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(card);
});
