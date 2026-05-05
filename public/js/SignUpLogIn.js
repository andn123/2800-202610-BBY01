
class GlassmorphismLoginForm extends FormUtils.LoginFormBase {
    constructor() {
        super({
            hideOnSuccess: ['.divider', '.signup-link'],
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

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
        } else {
            passwordInput.type = 'password';
        }
}

document.addEventListener('DOMContentLoaded', () => {
    new GlassmorphismLoginForm();
    togglePasswordVisibility();
});