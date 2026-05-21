class GlassmorphismLoginForm extends FormUtils.LoginFormBase {
    constructor() {
        super({
            hideOnSuccess: ['.signup-link'],
        });
    }

    decorate() {
        FormUtils.addEntranceAnimation(document.querySelector('.login-card'));
        this.form.querySelectorAll('input').forEach((input, index) => {
            input.style.opacity = '0';
            input.style.transform = 'translateY(10px)';
            setTimeout(() => {
                input.style.transition = 'all 0.4s ease';
                input.style.opacity = '1';
                input.style.transform = 'translateY(0)';
            }, 200 + index * 150);
        });
    }
}

class GlassmorphismSignupForm extends FormUtils.LoginFormBase {
    constructor() {
        super({
            hideOnSuccess: ['.signup-link'],
            validators: {
                username: (value) => {
                    if (!value) return { isValid: false, message: 'Username is required' };
                    if (value.length < 3) return { isValid: false, message: 'Username must be at least 3 characters' };
                    if (!/^[a-zA-Z0-9]+$/.test(value)) return { isValid: false, message: 'Username can only contain letters and numbers' };
                    return { isValid: true };
                },
                email: FormUtils.validateEmail,
                password: FormUtils.validatePassword,
            },
        });
    }

    decorate() {
        FormUtils.addEntranceAnimation(document.querySelector('.login-card'));
        this.form.querySelectorAll('input').forEach((input, index) => {
            input.style.opacity = '0';
            input.style.transform = 'translateY(10px)';
            setTimeout(() => {
                input.style.transition = 'all 0.4s ease';
                input.style.opacity = '1';
                input.style.transform = 'translateY(0)';
            }, 200 + index * 150);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('form[action="/signingup"]')) {
        new GlassmorphismSignupForm();
    } else {
        new GlassmorphismLoginForm();
    }
});