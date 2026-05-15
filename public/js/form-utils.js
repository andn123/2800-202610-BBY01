class FormUtils {
    static validateEmail(value) {
        if (!value) return { isValid: false, message: 'Email address is required' };
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return { isValid: false, message: 'Please enter a valid email address' };
        return { isValid: true };
    }

    static validatePassword(value) {
        if (!value) return { isValid: false, message: 'Password is required' };
        if (value.length < 6) return { isValid: false, message: 'Password must be at least 6 characters long' };
        return { isValid: true };
    }

    static showError(fieldName, message, formGroupSelector = '.form-group') {
        const field = document.getElementById(fieldName);
        if (!field) return;
        const formGroup = field.closest(formGroupSelector);
        const errorElement = document.getElementById(fieldName + 'Error');
        if (formGroup) formGroup.classList.add('error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
        field.style.animation = 'shake 0.5s ease-in-out';
        field.addEventListener('animationend', () => { field.style.animation = ''; }, { once: true });
    }

    static clearError(fieldName, formGroupSelector = '.form-group') {
        const field = document.getElementById(fieldName);
        if (!field) return;
        const formGroup = field.closest(formGroupSelector);
        const errorElement = document.getElementById(fieldName + 'Error');
        if (formGroup) formGroup.classList.remove('error');
        if (errorElement) {
            errorElement.classList.remove('show');
            errorElement.textContent = '';
        }
    }

    static showSuccess(fieldName) {
        const field = document.getElementById(fieldName);
        const wrapper = field?.closest('.input-wrapper');
        if (!wrapper) return;
        wrapper.style.borderColor = '#22c55e';
        setTimeout(() => { wrapper.style.borderColor = ''; }, 2000);
    }

    static showNotification(message, type = 'info', container = null) {
        const target = container || document.querySelector('form');
        if (!target) return;
        const palette = {
            error:   { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' },
            success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' },
            info:    { bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.3)', text: '#06b6d4' },
        };
        const c = palette[type] || palette.info;
        const wrapper = document.createElement('div');
        wrapper.className = `notification ${type}`;
        wrapper.setAttribute('role', type === 'error' ? 'alert' : 'status');
        const inner = document.createElement('div');
        inner.style.cssText = `
            background: ${c.bg};
            backdrop-filter: blur(10px);
            border: 1px solid ${c.border};
            border-radius: 12px;
            padding: 12px 16px;
            margin-top: 16px;
            color: ${c.text};
            text-align: center;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;
        inner.textContent = message;
        wrapper.appendChild(inner);
        target.appendChild(wrapper);
        setTimeout(() => {
            wrapper.style.animation = 'slideOut 0.3s ease';
            wrapper.addEventListener('animationend', () => wrapper.remove(), { once: true });
        }, 3000);
    }

    static setupFloatingLabels(form) {
        if (!form) return;
        form.querySelectorAll('input').forEach(input => {
            const sync = () => input.classList.toggle('has-value', input.value.trim() !== '');
            sync();
            input.addEventListener('input', sync);
        });
    }

    static setupPasswordToggle(passwordInput, toggleButton) {
        if (!passwordInput || !toggleButton) return;
        toggleButton.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            const eyeIcon = toggleButton.querySelector('.eye-icon');
            eyeIcon?.classList.toggle('show-password', isPassword);
            toggleButton.style.transform = 'scale(0.9)';
            setTimeout(() => { toggleButton.style.transform = 'scale(1)'; }, 150);
            passwordInput.focus();
        });
    }

    static addEntranceAnimation(element, delay = 100) {
        if (!element) return;
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        setTimeout(() => {
            element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, delay);
    }

    static addSharedAnimations() {
        if (document.getElementById('shared-animations')) return;
        const style = document.createElement('style');
        style.id = 'shared-animations';
        style.textContent = `
            @keyframes slideIn  { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes slideOut { from { opacity: 1; transform: translateY(0); }     to { opacity: 0; transform: translateY(-10px); } }
            @keyframes shake    { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
            @keyframes successPulse { 0% { transform: scale(0); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
            @keyframes spin     { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

FormUtils.LoginFormBase = class LoginFormBase {
    constructor(options = {}) {
        this.formId = options.formId || 'loginForm';
        this.form = document.getElementById(this.formId);
        if (!this.form) return;

        this.submitBtn = this.form.querySelector('button[type="submit"], .login-btn');
        this.passwordInput = this.form.querySelector('input[type="password"]');
        this.passwordToggle = document.getElementById('passwordToggle') || this.form.querySelector('.password-toggle');
        this.cardSelector = options.cardSelector || '.login-card';
        this.formGroupSelector = options.formGroupSelector || '.form-group';
        this.hideOnSuccess = options.hideOnSuccess || [];

        this.validators = options.validators || {
            email: FormUtils.validateEmail,
            password: FormUtils.validatePassword,
        };

        this.isSubmitting = false;
        this.init();
    }

    init() {
        FormUtils.addSharedAnimations();
        FormUtils.setupFloatingLabels(this.form);
        FormUtils.setupPasswordToggle(this.passwordInput, this.passwordToggle);
        this.bindCoreEvents();
        this.bindKeyboardShortcuts();
        this.decorate();
    }

    bindCoreEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        Object.keys(this.validators).forEach(name => {
            const field = document.getElementById(name);
            if (!field) return;
            field.addEventListener('blur', () => this.validateField(name));
            field.addEventListener('input', () => this.clearError(name));
            field.addEventListener('focus', (e) => this.onInputFocus(e));
            field.addEventListener('blur', (e) => this.onInputBlur(e));
        });
    }

    bindKeyboardShortcuts() {
        this.form.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') Object.keys(this.validators).forEach(name => this.clearError(name));
        });
    }

    showError(name, message) { FormUtils.showError(name, message, this.formGroupSelector); }
    clearError(name) { FormUtils.clearError(name, this.formGroupSelector); }

    decorate() {}
    onInputFocus(e) { e.target.closest('.input-wrapper')?.classList.add('focused'); }
    onInputBlur(e)  { e.target.closest('.input-wrapper')?.classList.remove('focused'); }

    async handleSubmit(e) {
        e.preventDefault();
        if (this.isSubmitting) return;
        if (this.validateForm()) {
            await this.submitForm();
        } else {
            this.shakeForm();
        }
    }

    validateForm() {
        return Object.keys(this.validators).every(name => this.validateField(name));
    }

    validateField(name) {
        const field = document.getElementById(name);
        const validator = this.validators[name];
        if (!field || !validator) return true;
        const result = validator(field.value.trim(), field);
        if (result.isValid) {
            this.clearError(name);
            FormUtils.showSuccess(name);
        } else {
            this.showError(name, result.message);
        }
        return result.isValid;
    }

    shakeForm() {
        this.form.style.animation = 'shake 0.5s ease-in-out';
        this.form.addEventListener('animationend', () => { this.form.style.animation = ''; }, { once: true });
    }

    async submitForm() {
        this.isSubmitting = true;
        this.submitBtn?.classList.add('loading');
        try {
            const formData = new FormData(this.form);
            const response = await fetch(this.form.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData).toString(),
            });
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                const text = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                // Try to extract error from re-rendered page body text
                const errorEl = doc.getElementById('error-message') 
                    || doc.querySelector('.error-message.show')
                    || doc.querySelector('[id$="Error"]');
                const msg = errorEl?.textContent?.trim() || 'Something went wrong. Please try again.';
                this.onLoginError(msg);
            }
        } catch (error) {
            this.onLoginError('Something went wrong. Please try again.');
        } finally {
            this.isSubmitting = false;
            this.submitBtn?.classList.remove('loading');
        }
    }

    onLoginError(message) {
        FormUtils.showNotification(message, 'error', this.form);
        const card = document.querySelector(this.cardSelector);
        if (!card) return;
        card.style.animation = 'shake 0.5s ease-in-out';
        card.addEventListener('animationend', () => { card.style.animation = ''; }, { once: true });
    }

    getFormData() {
        return Object.fromEntries(new FormData(this.form).entries());
    }
};