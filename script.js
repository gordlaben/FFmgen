// New state management
const activeParams = new Map();

function addParameter(button) {
    const option = button.closest('.option');
    const param = button.dataset.param;
    const values = collectValues(option);
    
    activeParams.set(param, values);
    
    // Update button states
    button.textContent = 'Remove';
    button.classList.replace('btn-add', 'btn-remove');
    option.classList.add('option-added');
    
    // Add change listeners to inputs/selects for auto-update
    option.querySelectorAll('select, input[type="number"], input[type="text"]').forEach(input => {
        input.addEventListener('change', () => {
            if (activeParams.has(param)) {
                activeParams.set(param, collectValues(option));
                generateCommand();
            }
        });
    });
    
    generateCommand();
}

function removeParameter(button) {
    const option = button.closest('.option');
    const param = button.dataset.param;
    
    activeParams.delete(param);
    
    // Reset button states
    button.textContent = 'Add';
    button.classList.replace('btn-remove', 'btn-add');
    option.classList.remove('option-added');
    
    const updateBtn = option.querySelector('.btn-update');
    if (updateBtn) updateBtn.style.display = 'none';
    
    generateCommand();
}

// Remove updateParameter function since it's no longer needed

function collectValues(option) {
    const values = {};
    option.querySelectorAll('[data-param-key]').forEach(el => {
        if (el.multiple) {
            values[el.dataset.paramKey] = Array.from(el.selectedOptions)
                .map(opt => opt.value)
                .filter(Boolean)
                .join(' ');
        } else {
            values[el.dataset.paramKey] = el.value?.trim();
        }
    });
    return values;
}

function generateCommand() {
    const userAgent = document.getElementById('userAgent').value.trim();
    const streamUrl = document.getElementById('streamUrl').value.trim();
    
    let inputParams = [];
    let outputParams = [];
    let hasVideoCodec = false;
    let hasAudioCodec = false;
    let hasUserAgent = false;
    let hasStreamUrl = false;
    
    try {
        // Process active parameters
        activeParams.forEach((values, paramTemplate) => {
            let param = paramTemplate;
            if (param.includes('{')) {
                Object.entries(values).forEach(([key, value]) => {
                    param = param.replace(`{${key}}`, value);
                });
            }
            
            // Track special parameters
            if (param.includes('-user_agent')) hasUserAgent = true;
            if (param.includes('-i ')) hasStreamUrl = true;
            if (param.includes('-c:v')) hasVideoCodec = true;
            if (param.includes('-c:a')) hasAudioCodec = true;
            
            // Find the section this parameter belongs to
            const option = document.querySelector(`[data-param="${paramTemplate}"]`).closest('.option');
            const section = option.closest('.section');
            const isInputSection = !section.querySelector('h2') || section.querySelector('h2').textContent.includes('Input');
            
            if (isInputSection) {
                inputParams.push(param);
            } else {
                outputParams.push(param);
            }
        });
        
        // Add default parameters if not specified
        if (!hasUserAgent) inputParams.unshift(`-user_agent {userAgent}`);
        if (!hasStreamUrl) inputParams.push(`-i {streamUrl}`);
        
        // Add default codec parameters if not specified
        const codecParams = [];
        if (!hasVideoCodec) codecParams.push('-c:v copy');
        if (!hasAudioCodec) codecParams.push('-c:a copy');
        
        // Construct command with proper ordering
        const command = [
            ...inputParams.filter(Boolean),
            ...codecParams,
            ...outputParams.filter(Boolean),
            '-f mpegts pipe:1'
        ].filter(Boolean).join(' ');
        
        document.getElementById('commandOutput').textContent = command;
    } catch (error) {
        console.error('Error generating command:', error);
    }
}

function toggleParameter(option) {
    const isAdded = option.classList.contains('option-added');
    const param = option.dataset.param;
    
    if (isAdded) {
        // Remove parameter
        activeParams.delete(param);
        option.classList.remove('option-added');
    } else {
        // Add parameter
        const values = collectValues(option);
        activeParams.set(param, values);
        option.classList.add('option-added');
        
        // Add change listeners to inputs/selects for auto-update
        option.querySelectorAll('select, input[type="number"], input[type="text"]').forEach(input => {
            input.addEventListener('change', () => {
                if (activeParams.has(param)) {
                    activeParams.set(param, collectValues(option));
                    generateCommand();
                }
            });
        });
    }
    
    generateCommand();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initial command
    document.getElementById('commandOutput').textContent = '-user_agent {userAgent} -i {streamUrl} -c:v copy -c:a copy -f mpegts pipe:1';
    
    // Add click handlers for options
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', (e) => {
            // Don't toggle if clicking on input/select elements
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'SELECT' || 
                e.target.closest('select[multiple]')) {
                return;
            }
            
            toggleParameter(option);
        });
    });

    // Add input/select change handlers
    document.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', generateCommand);
    });

    // Set default command
    document.getElementById('commandOutput').textContent = '-user_agent {userAgent} -i {streamUrl} -c:v copy -c:a copy -f mpegts pipe:1';
    
    // Single click handler for group headers and remove other toggle handlers
    document.querySelectorAll('.group-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // Prevent multiple triggers
            e.stopPropagation();
            
            const paramGroup = header.closest('.param');
            const options = paramGroup.querySelector('.param-options');
            const toggleBtn = header.querySelector('.toggle-options');
            
            options.classList.toggle('visible');
            toggleBtn.classList.toggle('active');
            header.classList.toggle('active');  // Add this line
        });
    });

    // Prevent option click behavior for multiselect containers
    document.querySelectorAll('select[multiple]').forEach(select => {
        select.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        select.addEventListener('change', (e) => {
            e.stopPropagation();
            generateCommand();
        });
    });

    // Update option click handler to ignore multiselect containers
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', (e) => {
            if (e.target.closest('.sub-options') || 
                e.target.tagName === 'INPUT' || 
                e.target.tagName === 'SELECT' || 
                e.target.closest('select[multiple]') || 
                e.target.tagName === 'LABEL') {
                return;
            }
            
            const checkbox = option.querySelector('input[type="checkbox"]:not(.flag-checkbox)');
            if (!checkbox) return;
            
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });
    });

    // Rest of the event listeners
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', (e) => {
            if (e.target.closest('.sub-options') || 
                e.target.tagName === 'INPUT' || 
                e.target.tagName === 'SELECT' || 
                e.target.tagName === 'LABEL') {
                return;
            }
            
            const checkbox = option.querySelector('input[type="checkbox"]:not(.flag-checkbox)');
            if (!checkbox) return;
            
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });
    });

    // Handle flag checkboxes
    document.querySelectorAll('.flag-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const parentId = e.target.dataset.parent;
            const parentInput = document.getElementById(parentId);
            if (!parentInput) return;

            const selectedFlags = Array.from(document.querySelectorAll(`.flag-checkbox[data-parent="${parentId}"]:checked`))
                .map(cb => cb.value)
                .filter(Boolean)
                .join(' ');
            
            parentInput.value = selectedFlags;
            generateCommand();
        });
    });

    // Replace copy button with click-to-copy functionality
    document.getElementById('commandOutput').addEventListener('click', async () => {
        try {
            const output = document.getElementById('commandOutput').textContent;
            await navigator.clipboard.writeText(output);
            
            // Show notification
            const notification = document.getElementById('copyNotification');
            notification.classList.add('show');
            
            // Hide notification after 2 seconds
            setTimeout(() => {
                notification.classList.remove('show');
            }, 2000);
        } catch (error) {
            console.error('Failed to copy command:', error);
        }
    });

    // Add input validation to number fields
    document.querySelectorAll('input[type="text"][pattern]').forEach(input => {
        input.addEventListener('input', (e) => {
            if (!validateInput(e.target.value, 'number') && e.target.value !== '') {
                e.target.style.borderColor = 'red';
            } else {
                e.target.style.borderColor = '';
            }
        });
    });

    // Add auto-selection functionality for inputs and selects
    document.querySelectorAll('.option').forEach(option => {
        const inputs = option.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                // Don't trigger for flag checkboxes
                if (e.target.classList.contains('flag-checkbox')) return;
                
                // If the option isn't already selected, select it
                if (!option.classList.contains('option-added')) {
                    toggleParameter(option);
                }
                
                // If it's a select with multiple attribute, don't trigger auto-select
                if (e.target.tagName === 'SELECT' && e.target.multiple) return;
                
                generateCommand();
            });

            // Also trigger on focus for text/number inputs
            if (input.type === 'text' || input.type === 'number') {
                input.addEventListener('focus', () => {
                    if (!option.classList.contains('option-added')) {
                        toggleParameter(option);
                    }
                });
            }
        });
    });
});
