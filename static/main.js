// ========== DOM READY ==========
document.addEventListener('DOMContentLoaded', function() {
    // ========== IMAGE UPLOAD FIX ==========
    const imageInput = document.getElementById('lesionImage');
    const previewImg = document.getElementById('imagePreview');
    const fileUploadArea = document.querySelector('.file-upload-area');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    const predictForm = document.getElementById('predictForm');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Helper: Update UI after file selection
    function updatePreview(file) {
        if (!file) {
            previewImg.style.display = 'none';
            previewImg.src = '';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
            return;
        }

        // Validate type
        if (!file.type.startsWith('image/')) {
            alert('❌ Veuillez sélectionner une image valide (JPEG, PNG, etc.)');
            imageInput.value = '';
            previewImg.style.display = 'none';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
            return;
        }

        // Validate size (6MB max)
        if (file.size > 6 * 1024 * 1024) {
            alert('📏 L\'image ne doit pas dépasser 6 Mo.');
            imageInput.value = '';
            previewImg.style.display = 'none';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
            // Highlight upload area
            if (fileUploadArea) fileUploadArea.style.borderColor = 'var(--primary)';
        };
        reader.onerror = function() {
            alert('Erreur de lecture de l\'image.');
            imageInput.value = '';
        };
        reader.readAsDataURL(file);
    }

    // Handle file input change
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            updatePreview(file);
        });
    }

    // Drag & Drop support
    if (fileUploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, highlight, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            fileUploadArea.addEventListener(eventName, unhighlight, false);
        });

        function highlight() {
            fileUploadArea.style.borderColor = 'var(--primary)';
            fileUploadArea.style.backgroundColor = 'rgba(44, 125, 160, 0.05)';
        }

        function unhighlight() {
            fileUploadArea.style.borderColor = 'var(--border-light)';
            fileUploadArea.style.backgroundColor = 'transparent';
        }

        fileUploadArea.addEventListener('drop', function(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length) {
                imageInput.files = files;
                updatePreview(files[0]);
            }
        });

        // Click on area triggers file input
        fileUploadArea.addEventListener('click', () => imageInput.click());
    }

    // ========== FORM SUBMISSION WITH LOADING ==========
    if (predictForm && loadingOverlay) {
        predictForm.addEventListener('submit', function(e) {
            const name = predictForm.querySelector('[name="name"]')?.value.trim();
            const age = predictForm.querySelector('[name="age"]')?.value;
            const file = imageInput?.files[0];

            if (!name || !age) {
                e.preventDefault();
                alert('⚠️ Veuillez remplir tous les champs.');
                return false;
            }
            if (!file) {
                e.preventDefault();
                alert('⚠️ Veuillez sélectionner une image.');
                return false;
            }

            // Show loading overlay
            loadingOverlay.classList.add('active');
        });
    }

    // ========== PATIENT SEARCH ==========
    const searchInput = document.getElementById('patientSearch');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const filter = this.value.trim().toLowerCase();
            const rows = document.querySelectorAll('#patientsTable tbody tr');
            rows.forEach(row => {
                const nameCell = row.querySelector('td:first-child');
                if (nameCell && nameCell.innerText.toLowerCase().includes(filter))
                    row.style.display = '';
                else
                    row.style.display = 'none';
            });
        });
    }

    // ========== AUTO-HIDE FLASH MESSAGES ==========
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.4s ease';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 400);
        }, 3500);
    });

    // Remove loading overlay on page load (safety)
    if (loadingOverlay) loadingOverlay.classList.remove('active');
});