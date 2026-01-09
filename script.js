// Current active plan
let currentPlan = '2025';
let courses = []; 
let courseStates = {};

const selector = document.getElementById('plan-selector');
const creditsDisplay = document.getElementById('total-credits');
const resetBtn = document.getElementById('reset-btn');

selector.addEventListener('change', (e) => {
    currentPlan = e.target.value;
    loadPlan(currentPlan);
});

resetBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres desmarcar todo?')) {
        resetProgress();
    }
});

function resetProgress() {
    courses.forEach(c => {
        courseStates[c.id].completed = false;
    });
    updateAvailability();
    updateTotalCredits();
    saveState();
    render();
}

function loadPlan(planKey) {
    // curriculumData is global from data.js
    if (!curriculumData[planKey]) return; // Safety check

    courses = curriculumData[planKey];
    
    // Reset states object
    courseStates = {};
    
    // Initialize states
    courses.forEach(c => {
        courseStates[c.id] = {
            completed: false,
            available: false
        };
    });

    // Load from local storage
    const storageKey = `geology_state_${planKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        const parsed = JSON.parse(saved);
        for (const id in parsed) {
            if (courseStates[id]) {
                courseStates[id].completed = parsed[id].completed;
            }
        }
    }

    updateAvailability();
    updateTotalCredits();
    render();
}

function updateAvailability() {
    let changed = false;
    courses.forEach(course => {
        const prevState = courseStates[course.id].available;
        let isAvailable = true;
        
        if (course.prereqs.length === 0) {
            isAvailable = true;
        } else {
            isAvailable = course.prereqs.every(pid => courseStates[pid] && courseStates[pid].completed);
        }

        courseStates[course.id].available = isAvailable;
        if (prevState !== isAvailable) changed = true;
    });
    return changed;
}

function updateTotalCredits() {
    let current = 0;
    let total = 0;
    
    courses.forEach(c => {
        total += c.credits;
        if (courseStates[c.id] && courseStates[c.id].completed) {
            current += c.credits;
        }
    });
    
    // Calculate percentage
    const percentage = total > 0 ? (current / total) * 100 : 0;
    
    // Update text
    // If completed (or very close, >99%), show success message
    if (percentage >= 100) {
        creditsDisplay.innerHTML = `<div>🎓 ¡EGRESADO!</div><div style="font-size:0.6em; margin-top:5px">${current} / ${total}</div>`;
        document.getElementById('credits-floating').classList.add('success');
    } else {
        creditsDisplay.innerHTML = `${current} <span style="font-size:0.6em; opacity:0.7">/ ${total}</span>`;
        document.getElementById('credits-floating').classList.remove('success');
    }
    
    // Update progress bar width
    creditsDisplay.style.setProperty('--progress', `${percentage}%`);
}

function uncheckDependents(courseId) {
    const dependents = courses.filter(c => c.prereqs.includes(courseId));
    dependents.forEach(dep => {
        if (courseStates[dep.id].completed) {
            courseStates[dep.id].completed = false;
            uncheckDependents(dep.id);
        }
    });
}

function toggleCourse(id) {
    const state = courseStates[id];
    if (!state.available && !state.completed) return; 

    state.completed = !state.completed;

    if (!state.completed) {
        uncheckDependents(id);
    }

    updateAvailability();
    updateTotalCredits();
    saveState();
    render();
}

function saveState() {
    const storageKey = `geology_state_${currentPlan}`;
    localStorage.setItem(storageKey, JSON.stringify(courseStates));
}

function render() {
    const container = document.getElementById('curriculum-container');
    container.innerHTML = '';

    // Group by Year -> Semester
    const structure = {};
    courses.forEach(c => {
        if (!structure[c.year]) structure[c.year] = {};
        if (!structure[c.year][c.semester]) structure[c.year][c.semester] = [];
        structure[c.year][c.semester].push(c);
    });

    for (const year in structure) {
        const yearSection = document.createElement('div');
        yearSection.className = 'year-section';
        const yearTitle = document.createElement('h2');
        yearTitle.innerText = year;
        yearSection.appendChild(yearTitle);

        const semestersContainer = document.createElement('div');
        semestersContainer.className = 'semesters-container';

        for (const sem in structure[year]) {
            const semCol = document.createElement('div');
            semCol.className = 'semester-column';
            const semTitle = document.createElement('h3');
            semTitle.innerText = sem;
            semCol.appendChild(semTitle);

            const courseList = document.createElement('div');
            courseList.className = 'course-list';

            structure[year][sem].forEach(course => {
                const state = courseStates[course.id];
                const card = document.createElement('div');
                card.className = `course-card ${state.completed ? 'completed' : ''} ${state.available ? 'available' : 'locked'}`;
                card.onclick = () => toggleCourse(course.id);

                const header = document.createElement('div');
                header.className = 'course-header';
                
                const codeSpan = document.createElement('span');
                codeSpan.className = 'course-code';
                codeSpan.innerText = course.id;

                const credSpan = document.createElement('span');
                credSpan.className = 'course-credits';
                credSpan.innerText = `${course.credits} CR`;

                header.appendChild(codeSpan);
                header.appendChild(credSpan);

                const name = document.createElement('div');
                name.className = 'course-name';
                name.innerText = course.name;

                card.appendChild(header);
                card.appendChild(name);
                
                const checkbox = document.createElement('div');
                checkbox.className = 'checkbox-indicator';
                checkbox.innerHTML = state.completed ? '✔' : '';
                card.appendChild(checkbox);

                courseList.appendChild(card);
            });

            semCol.appendChild(courseList);
            semestersContainer.appendChild(semCol);
        }
        
        yearSection.appendChild(semestersContainer);
        container.appendChild(yearSection);
    }
}

// Init
loadPlan(currentPlan);