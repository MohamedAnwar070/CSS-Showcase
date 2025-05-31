class DemoHandler {
    constructor() {
        this.observers = new Map();
        this.initializeEventListeners();
        this.initializeThemeToggle();
        this.initializeResizeHandles();
        this.initializeCopyButtons();
        this.initializeResetButtons();
    }

    initializeEventListeners() {
        // Handle messages from iframes
        window.addEventListener('message', (event) => {
            const { type, demoId, error } = event.data;
            switch (type) {
                case 'elementInView':
                    console.log(`Demo ${demoId}: Element in view`);
                    break;
                case 'demoReady':
                    this.handleDemoReady(demoId);
                    break;
                case 'demoError':
                    this.handleDemoError(demoId, error);
                    break;
                case 'demoResize':
                    this.handleDemoResize(demoId, event.data.height);
                    break;
            }
        });

        // Initialize all demos
        document.querySelectorAll('button').forEach(btn => btn.click());
    }

    updateDemo(demoId, htmlId, cssId) {
        const container = document.getElementById(demoId);
        const section = container.closest('.section');

        // Remove active class from other demos in the row
        const row = section.closest('.sections-container');
        row.querySelectorAll('.demo.active').forEach(demo => {
            if (demo.id !== demoId) {
                demo.classList.remove('active');
            }
        });

        // Smooth transition for new demo
        container.classList.add('demo-loading');
        
        try {
            const htmlCode = document.getElementById(htmlId).value;
            const cssCode = document.getElementById(cssId).value;
            
            // Create and prepare iframe
            const iframe = this.createIframe(demoId, htmlCode, cssCode);
            
            // Animate out old content
            container.style.height = container.offsetHeight + 'px';
            container.innerHTML = '';
            
            // Animate in new content
            requestAnimationFrame(() => {
                container.appendChild(iframe);
                container.classList.add('active');
                container.classList.remove('demo-loading');
                
                // Scroll into view if not visible
                if (!this.isElementInViewport(container)) {
                    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        } catch (error) {
            this.handleDemoError(demoId, error.message);
        }
    }

    isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
        );
    }

    createIframe(demoId, htmlCode, cssCode) {
        const iframe = document.createElement('iframe');
        iframe.sandbox = 'allow-same-origin allow-scripts';
        iframe.srcdoc = `
            <html>
                <head>
                    <style>
                        body { margin: 0; padding: 16px; overflow: auto; }
                        * { box-sizing: border-box; }
                        ${cssCode}
                    </style>
                </head>
                <body>
                    <div class="demo-content">${htmlCode}</div>
                    <script>
                        window.addEventListener('error', (event) => {
                            window.parent.postMessage({
                                type: 'demoError',
                                demoId: '${demoId}',
                                error: event.message
                            }, '*');
                        });
                        
                        // Handle demo resize
                        const resizeObserver = new ResizeObserver(entries => {
                            window.parent.postMessage({
                                type: 'demoResize',
                                demoId: '${demoId}',
                                height: document.body.scrollHeight
                            }, '*');
                        });
                        
                        resizeObserver.observe(document.body);
                    </script>
                </body>
            </html>
        `;
        return iframe;
    }

    setupViewAnimation(iframe, demoId) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    iframe.contentWindow.postMessage({
                        type: 'checkVisibility',
                        visible: true
                    }, '*');
                }
            });
        }, { threshold: [0.2, 0.5, 0.8] });

        observer.observe(iframe);
        this.observers.set(demoId, observer);
    }

    handleDemoError(demoId, error) {
        const container = document.getElementById(demoId);
        container.classList.remove('loading');
        container.classList.add('error');
        container.innerHTML = `
            <div class="demo-error">
                <strong>Error:</strong> ${error}
                <button class="retry-btn" onclick="demoHandler.retryDemo('${demoId}')">
                    Retry
                </button>
            </div>
        `;
        console.error(`Demo ${demoId} error:`, error);
    }

    retryDemo(demoId) {
        const htmlId = `html${demoId.slice(-1)}`;
        const cssId = `css${demoId.slice(-1)}`;
        this.updateDemo(demoId, htmlId, cssId);
    }

    handleDemoResize(demoId, height) {
        const demo = document.getElementById(demoId);
        if (demo) {
            demo.style.height = `${height}px`;
        }
    }

    handleDemoReady(demoId) {
        console.log(`Demo ${demoId} ready`);
    }

    initializeThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const html = document.documentElement;
        
        const setTheme = (theme) => {
            html.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            
            // Add transition class
            html.classList.add('theme-transitioning');
            
            // Remove transition class after animation
            setTimeout(() => {
                html.classList.remove('theme-transitioning');
            }, 300);
        };

        themeToggle.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
        });

        // Load saved theme with transition
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
    }

    initializeResizeHandles() {
        const container = document.getElementById('demo4');
        const handle = container.querySelector('.resize-handle');
        
        let isResizing = false;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', () => {
                isResizing = false;
                document.removeEventListener('mousemove', handleMouseMove);
            });
        });

        function handleMouseMove(e) {
            if (!isResizing) return;
            const containerRect = container.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;
            container.style.width = `${Math.max(200, Math.min(800, newWidth))}px`;
        }
    }

    initializeCopyButtons() {
        document.querySelectorAll('.copy-code').forEach(button => {
            button.addEventListener('click', async () => {
                const section = button.closest('.section');
                const html = section.querySelector('textarea[id^="html"]').value;
                const css = section.querySelector('textarea[id^="css"]').value;
                
                try {
                    await navigator.clipboard.writeText(`HTML:\n${html}\n\nCSS:\n${css}`);
                    button.classList.add('copied');
                    setTimeout(() => button.classList.remove('copied'), 2000);
                } catch (err) {
                    console.error('Failed to copy code:', err);
                }
            });
        });
    }

    initializeResetButtons() {
        document.querySelectorAll('.reset-demo').forEach(button => {
            button.addEventListener('click', () => {
                const section = button.closest('.section');
                const demoId = section.querySelector('.demo').id;
                const htmlId = `html${demoId.slice(-1)}`;
                const cssId = `css${demoId.slice(-1)}`;
                
                // Reset to original values and update demo
                document.getElementById(htmlId).value = this.getOriginalHTML(demoId);
                document.getElementById(cssId).value = this.getOriginalCSS(demoId);
                this.updateDemo(demoId, htmlId, cssId);
            });
        });
    }

    getOriginalHTML(demoId) {
        // Placeholder for original HTML content retrieval logic
        return '<!-- Original HTML content -->';
    }

    getOriginalCSS(demoId) {
        // Placeholder for original CSS content retrieval logic
        return '/* Original CSS content */';
    }
}

// Initialize the demo handler
const demoHandler = new DemoHandler();

// Update global function to use the handler
function updateDemo(demoId, htmlId, cssId) {
    demoHandler.updateDemo(demoId, htmlId, cssId);
}
