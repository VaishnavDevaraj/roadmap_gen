document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const assessmentSection = document.getElementById('assessment');
    const introductionSection = document.getElementById('introduction');
    const loadingSection = document.getElementById('loading');
    const learningPathSection = document.getElementById('learningPath');
    const roadmapSummaryDiv = document.getElementById('roadmapSummary');
    const roadmapSvgContainer = document.getElementById('roadmapSvgContainer');
    const resetButton = document.getElementById('resetButton');
    const printRoadmapButton = document.getElementById('printRoadmapButton');
    const downloadPngButton = document.getElementById('downloadPngButton');
    const downloadSvgButton = document.getElementById('downloadSvgButton');

    // [ACTION REQUIRED FOR MOBILE]
    // Replace '127.0.0.1' with your computer's local network IP address for mobile testing.
    // e.g., 'http://192.168.1.12:5000/generate-learning-path'
    const API_URL = 'https://roadmap-gen.onrender.com/generate-learning-path';

    // --- SVG drawing constants ---
    const NODE_MAX_TEXT_WIDTH = 550;
    const NODE_SPACING_VERTICAL = 200;
    const NODE_SPACING_HORIZONTAL = 350;
    const NODE_RADIUS = 12;
    const CURVE_OFFSET = 120;
    const HEADER_HEIGHT_SVG = 180;
    const TITLE_FONT_SIZE = 28;
    const DESC_FONT_SIZE = 18;
    const TIME_FONT_SIZE = 16;
    const LINE_HEIGHT_TITLE = 34;
    const LINE_HEIGHT_DESC = 22;
    const TEXT_LEFT_PADDING = 30;
    const TEXT_Y_OFFSET_FROM_NODE_TOP = 55;
    const TIME_TEXT_BOTTOM_BUFFER = 20;
    const VERTICAL_TEXT_BUFFER_TOP = 20;
    const VERTICAL_TEXT_BUFFER_BOTTOM = 20;
    const VERTICAL_BUFFER_BETWEEN_TEXT_BLOCKS = 15;
    const MAX_COLUMNS = 2;
    const INITIAL_STEP_HEIGHT = 120;

    // --- Global State Variables ---
    let svgElement;
    let viewBox = { x: 0, y: 0, width: 0, height: 0 };
    let isPanning = false;
    let startPoint = { x: 0, y: 0 };
    let initialPinchDistance = -1;
    let originalSvgContentWidth = 0;
    let originalSvgContentHeight = 0;
    let currentRenderedNodePositions = [];
    let currentRoadmapPathData = [];
    let currentUserData = {};
    let currentTotalEstimatedDays = 0;
    let currentCssContent = '';

    // --- Pan/Zoom/Touch Helper Functions (Global Scope) ---
    function updateViewBox() {
        if (svgElement) {
            svgElement.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
        }
    }

    function getMouseSvgCoordinates(clientX, clientY) {
        if (!svgElement) return { x: 0, y: 0 };
        const rect = svgElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        const svgX = (clientX - rect.left) * scaleX + viewBox.x;
        const svgY = (clientY - rect.top) * scaleY + viewBox.y;
        return { x: svgX, y: svgY };
    }

    function handleMouseDown(e) {
        if (e.button !== 0) return;
        isPanning = true;
        startPoint = getMouseSvgCoordinates(e.clientX, e.clientY);
        roadmapSvgContainer.style.cursor = 'grabbing';
        e.preventDefault();
    }

    function handleMouseMove(e) {
        if (!isPanning) return;
        e.preventDefault();
        const currentPoint = getMouseSvgCoordinates(e.clientX, e.clientY);
        viewBox.x -= (currentPoint.x - startPoint.x);
        viewBox.y -= (currentPoint.y - startPoint.y);
        updateViewBox();
    }

    function handleMouseUp() {
        isPanning = false;
        roadmapSvgContainer.style.cursor = 'grab';
    }

    function handleWheel(e) {
        e.preventDefault();
        const scaleAmount = 0.1;
        const mousePoint = getMouseSvgCoordinates(e.clientX, e.clientY);
        const zoomFactor = e.deltaY < 0 ? (1 - scaleAmount) : (1 + scaleAmount);
        viewBox.x = mousePoint.x - (mousePoint.x - viewBox.x) * zoomFactor;
        viewBox.y = mousePoint.y - (mousePoint.y - viewBox.y) * zoomFactor;
        viewBox.width *= zoomFactor;
        viewBox.height *= zoomFactor;
        updateViewBox();
    }

    function getMidpoint(touch1, touch2) {
        return { x: (touch1.clientX + touch2.clientX) / 2, y: (touch1.clientY + touch2.clientY) / 2 };
    }

    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function handleTouchStart(e) {
        if (e.touches.length === 1 || e.touches.length === 2) {
            e.preventDefault();
            svgElement.style.touchAction = 'none';
        }
        if (e.touches.length === 1) {
            isPanning = true;
            startPoint = getMouseSvgCoordinates(e.touches[0].clientX, e.touches[0].clientY);
        } else if (e.touches.length === 2) {
            isPanning = false; // Stop panning if a second finger is added
            initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
            const clientMidpoint = getMidpoint(e.touches[0], e.touches[1]);
            startPoint = getMouseSvgCoordinates(clientMidpoint.x, clientMidpoint.y); // Use this for zoom center
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && isPanning) {
            const currentPoint = getMouseSvgCoordinates(e.touches[0].clientX, e.touches[0].clientY);
            viewBox.x -= (currentPoint.x - startPoint.x);
            viewBox.y -= (currentPoint.y - startPoint.y);
            updateViewBox();
        } else if (e.touches.length === 2) {
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            if (initialPinchDistance > 0) {
                 const scaleFactor = initialPinchDistance / currentDistance;
                 viewBox.x = startPoint.x - (startPoint.x - viewBox.x) * scaleFactor;
                 viewBox.y = startPoint.y - (startPoint.y - viewBox.y) * scaleFactor;
                 viewBox.width *= scaleFactor;
                 viewBox.height *= scaleFactor;
                 updateViewBox();
            }
            initialPinchDistance = currentDistance;
        }
    }

    function handleTouchEnd() {
        isPanning = false;
        initialPinchDistance = -1;
        svgElement.style.touchAction = 'auto';
    }
    
    // --- Event Listener Attachment ---
    
    function addSvgEventListeners() {
        removeSvgEventListeners(); // Ensure no old listeners are attached
        roadmapSvgContainer.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove); // Listen on window for dragging outside
        window.addEventListener('mouseup', handleMouseUp);
        roadmapSvgContainer.addEventListener('mouseleave', handleMouseUp);
        roadmapSvgContainer.addEventListener('wheel', handleWheel, { passive: false });
        roadmapSvgContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        roadmapSvgContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        roadmapSvgContainer.addEventListener('touchend', handleTouchEnd);
        roadmapSvgContainer.addEventListener('touchcancel', handleTouchEnd);
    }

    function removeSvgEventListeners() {
        roadmapSvgContainer.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        roadmapSvgContainer.removeEventListener('mouseleave', handleMouseUp);
        roadmapSvgContainer.removeEventListener('wheel', handleWheel);
        roadmapSvgContainer.removeEventListener('touchstart', handleTouchStart);
        roadmapSvgContainer.removeEventListener('touchmove', handleTouchMove);
        roadmapSvgContainer.removeEventListener('touchend', handleTouchEnd);
        roadmapSvgContainer.addEventListener('touchcancel', handleTouchEnd);
    }

    // --- Main Application Logic ---

    startButton.addEventListener('click', () => {
        introductionSection.classList.add('hidden');
        assessmentSection.classList.remove('hidden');
    });

    assessmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        assessmentSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        currentUserData = {
            knowledgeLevel: document.getElementById('knowledgeLevel').value,
            careerAspirations: document.getElementById('careerAspirations').value,
            availableTimePerDay: parseFloat(document.getElementById('availableTimePerDay').value)
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(currentUserData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error ${response.status}: ${errorData.details || errorData.error}`);
            }

            const result = await response.json();
            currentRoadmapPathData = result.path;
            currentTotalEstimatedDays = result.total_estimated_days;
            
            currentCssContent = await fetch('./style.css').then(res => res.text()).catch(() => '');

            loadingSection.classList.add('hidden');
            learningPathSection.classList.remove('hidden');
            
            // Use a short delay to ensure the DOM is updated before rendering SVG
            setTimeout(() => {
                 displayRoadmap(result.path, currentUserData, result.total_estimated_days);
            }, 50);

        } catch (error) {
            console.error('Error generating roadmap:', error);
            loadingSection.classList.add('hidden');
            assessmentSection.classList.remove('hidden'); // Show form again on error
            alert(`Failed to generate roadmap: ${error.message}. Please check the console for details.`);
        }
    });

    resetButton.addEventListener('click', () => {
        learningPathSection.classList.add('hidden');
        introductionSection.classList.remove('hidden');
        assessmentForm.reset();
        roadmapSvgContainer.innerHTML = '';
        roadmapSummaryDiv.innerHTML = '';
        removeSvgEventListeners(); // Clean up listeners
        // Clear global data
        currentRoadmapPathData = [];
        currentUserData = {};
        currentTotalEstimatedDays = 0;
        currentCssContent = '';
        currentRenderedNodePositions = [];
    });

    printRoadmapButton.addEventListener('click', () => window.print());
    
    downloadPngButton.addEventListener('click', () => {
        if (!svgElement) return alert("Please generate a roadmap first.");
        const filename = `roadmap-to-${currentUserData.careerAspirations.replace(/ /g, '_')}.png`;
        downloadSvgAsPng(filename);
    });

    downloadSvgButton.addEventListener('click', () => {
        if (!svgElement) return alert("Please generate a roadmap first.");
        const filename = `roadmap-to-${currentUserData.careerAspirations.replace(/ /g, '_')}.svg`;
        downloadSvgFile(filename);
    });
    
    // --- Utility Functions ---
    function capitalizeWords(str) {
        if (!str) return '';
        return str.replace(/\b\w/g, char => char.toUpperCase());
    }

    function breakTextIntoLines(text, maxWidth, fontSize) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        const avgCharWidth = fontSize * 0.6;
        const maxChars = Math.floor(maxWidth / avgCharWidth);

        for (const word of words) {
            if ((currentLine + ' ' + word).length > maxChars && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                if (currentLine.length === 0) {
                    currentLine = word;
                } else {
                    currentLine += ' ' + word;
                }
            }
        }
        lines.push(currentLine);
        return lines;
    }
    
    function extractKeywordsFromDescription(description) {
        const keywords = new Set();
        const regex = /\b(Python|JavaScript|HTML|CSS|React|Flask|SQL|API|Git|Docker|AWS|Pandas|NumPy|JSON)\b/gi;
        let match;
        while ((match = regex.exec(description)) !== null) {
            keywords.add(match[0].toLowerCase());
        }
        return Array.from(keywords);
    }
    
    function renderMultiLineText(parent, textLines, x, y, lineHeight, className, highlightKeywords = []) {
        const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textElement.setAttribute("x", x);
        textElement.setAttribute("y", y);
        textElement.classList.add(className);

        textLines.forEach((line, index) => {
            const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            tspan.setAttribute("x", x);
            tspan.setAttribute("dy", index === 0 ? "0" : `${lineHeight}px`);
            
            if (highlightKeywords.length > 0) {
                 const words = line.split(' ');
                 words.forEach((word, wordIndex) => {
                     const innerTspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                     innerTspan.textContent = word + (wordIndex === words.length - 1 ? '' : ' ');
                     if (highlightKeywords.includes(word.toLowerCase().replace(/[,.]/g, ''))) {
                         innerTspan.style.fontWeight = 'bold';
                         innerTspan.style.fill = 'var(--primary-color)';
                     }
                     tspan.appendChild(innerTspan);
                 });
            } else {
                tspan.textContent = line;
            }
            textElement.appendChild(tspan);
        });
        parent.appendChild(textElement);
    }


    // --- SVG Roadmap Drawing Function ---
    function displayRoadmap(path, userData, totalEstimatedDays) {
        roadmapSvgContainer.innerHTML = '';
        roadmapSummaryDiv.innerHTML = `
            <p>Roadmap for: <strong>${capitalizeWords(userData.careerAspirations)}</strong></p>
            <p>Based on **${userData.availableTimePerDay} hours/day** of study.</p>
            <p>Total estimated duration: <strong>${totalEstimatedDays} days</strong>.</p>
        `;

        if (!path || path.length === 0) {
            roadmapSvgContainer.innerHTML = '<p>No roadmap could be generated. Please try again.</p>';
            return;
        }

        // --- Pass 1: Calculate Node Positions and Dimensions ---
        currentRenderedNodePositions = [];
        let currentMaxYInColumn = Array(MAX_COLUMNS).fill(HEADER_HEIGHT_SVG);

        path.forEach((item, i) => {
            const colIndex = i % MAX_COLUMNS;
            
            const titleLines = breakTextIntoLines(item.title, NODE_MAX_TEXT_WIDTH - (TEXT_LEFT_PADDING * 2), TITLE_FONT_SIZE);
            const descLines = breakTextIntoLines(item.description, NODE_MAX_TEXT_WIDTH - (TEXT_LEFT_PADDING * 2), DESC_FONT_SIZE);
            const highlightKeywords = extractKeywordsFromDescription(item.description);

            const titleHeight = titleLines.length * LINE_HEIGHT_TITLE;
            const descHeight = descLines.length * LINE_HEIGHT_DESC;
            const timeHeight = item.estimated_time_days > 0 ? TIME_FONT_SIZE + 10 : 0;

            const requiredContentHeight = VERTICAL_TEXT_BUFFER_TOP + titleHeight + VERTICAL_BUFFER_BETWEEN_TEXT_BLOCKS + descHeight + VERTICAL_BUFFER_BETWEEN_TEXT_BLOCKS + timeHeight + VERTICAL_TEXT_BUFFER_BOTTOM;
            const nodeEffectiveHeight = Math.max(INITIAL_STEP_HEIGHT, requiredContentHeight);

            const x = NODE_SPACING_HORIZONTAL / 2 + colIndex * (NODE_MAX_TEXT_WIDTH + NODE_SPACING_HORIZONTAL);
            const y = currentMaxYInColumn[colIndex];

            currentRenderedNodePositions.push({
                x, y,
                width: NODE_MAX_TEXT_WIDTH,
                height: nodeEffectiveHeight,
                originalItem: item,
                titleLines, descLines, highlightKeywords
            });

            currentMaxYInColumn[colIndex] = y + nodeEffectiveHeight + NODE_SPACING_VERTICAL;
        });

        originalSvgContentWidth = Math.max(...currentRenderedNodePositions.map(p => p.x + p.width)) + NODE_SPACING_HORIZONTAL / 2;
        originalSvgContentHeight = Math.max(...currentMaxYInColumn);

        // --- Pass 2: Draw SVG Elements ---
        svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttribute("width", "100%");
        svgElement.setAttribute("height", "100%");
        svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
        roadmapSvgContainer.appendChild(svgElement);

        const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
        style.textContent = currentCssContent;
        svgElement.appendChild(style);

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        defs.innerHTML = `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" class="roadmap-line" style="fill: var(--secondary-color);" /></marker>`;
        svgElement.appendChild(defs);

        const roadmapTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
        roadmapTitle.setAttribute("x", originalSvgContentWidth / 2);
        roadmapTitle.setAttribute("y", 60);
        roadmapTitle.setAttribute("text-anchor", "middle");
        roadmapTitle.classList.add('svg-roadmap-heading');
        roadmapTitle.textContent = `Roadmap to ${capitalizeWords(userData.careerAspirations)}`;
        svgElement.appendChild(roadmapTitle);

        const totalDaysText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        totalDaysText.setAttribute("x", originalSvgContentWidth / 2);
        totalDaysText.setAttribute("y", 100);
        totalDaysText.setAttribute("text-anchor", "middle");
        totalDaysText.classList.add('svg-total-days-text');
        totalDaysText.textContent = `Total Estimated Days: ${totalEstimatedDays}`;
        svgElement.appendChild(totalDaysText);

        // Draw Nodes and Content
        currentRenderedNodePositions.forEach(node => {
            const { x, y, width, height, originalItem, titleLines, descLines, highlightKeywords } = node;
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            svgElement.appendChild(g);

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", x);
            rect.setAttribute("y", y);
            rect.setAttribute("width", width);
            rect.setAttribute("height", height);
            rect.setAttribute("rx", 15);
            rect.classList.add('roadmap-step-rect');
            g.appendChild(rect);

            renderMultiLineText(g, titleLines, x + TEXT_LEFT_PADDING, y + TEXT_Y_OFFSET_FROM_NODE_TOP, LINE_HEIGHT_TITLE, 'roadmap-step-title');
            
            const descY = y + TEXT_Y_OFFSET_FROM_NODE_TOP + (titleLines.length * LINE_HEIGHT_TITLE) + VERTICAL_BUFFER_BETWEEN_TEXT_BLOCKS;
            renderMultiLineText(g, descLines, x + TEXT_LEFT_PADDING, descY, LINE_HEIGHT_DESC, 'roadmap-step-desc', highlightKeywords);
            
            if (originalItem.estimated_time_days > 0) {
                const timeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                timeText.setAttribute("x", x + TEXT_LEFT_PADDING);
                timeText.setAttribute("y", y + height - TIME_TEXT_BOTTOM_BUFFER);
                timeText.classList.add('roadmap-step-time');
                timeText.textContent = `Est. time: ${originalItem.estimated_time_days} day${originalItem.estimated_time_days !== 1 ? 's' : ''}`;
                g.appendChild(timeText);
            }
        });
        
        // Draw Connections
        for (let i = 0; i < currentRenderedNodePositions.length - 1; i++) {
            const current = currentRenderedNodePositions[i];
            const next = currentRenderedNodePositions[i + 1];
            const startX = current.x + current.width / 2;
            const startY = current.y + current.height;
            const endX = next.x + next.width / 2;
            const endY = next.y;

            let pathD;
            if (i % MAX_COLUMNS === (i + 1) % MAX_COLUMNS) {
                pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
            } else {
                const midY = startY + (endY - startY) / 2;
                pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
            }
            
            const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathEl.setAttribute("d", pathD);
            pathEl.classList.add('roadmap-line');
            svgElement.insertBefore(pathEl, svgElement.firstChild);
        }

        viewBox = { x: 0, y: 0, width: originalSvgContentWidth, height: originalSvgContentHeight };
        updateViewBox();
        addSvgEventListeners();
    }
    
    // --- Download Functions ---
    function generateFullSvgString() {
        if (!svgElement) return '';
        const tempSvg = svgElement.cloneNode(true);
        
        // [FIXED] Reset the viewBox on the cloned SVG to ensure the full image is captured
        tempSvg.setAttribute('viewBox', `0 0 ${originalSvgContentWidth} ${originalSvgContentHeight}`);
        
        tempSvg.setAttribute('width', originalSvgContentWidth);
        tempSvg.setAttribute('height', originalSvgContentHeight);
        
        const style = tempSvg.querySelector('style');
        style.textContent = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');\n` + currentCssContent;

        return new XMLSerializer().serializeToString(tempSvg);
    }
    
    function downloadSvgAsPng(filename) {
        const svgString = generateFullSvgString();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 2;
            canvas.width = originalSvgContentWidth * scale;
            canvas.height = originalSvgContentHeight * scale;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = '#FFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        img.onerror = (err) => {
            console.error("PNG conversion failed:", err);
            alert("Failed to convert roadmap to PNG.");
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    function downloadSvgFile(filename) {
        const svgString = generateFullSvgString();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
