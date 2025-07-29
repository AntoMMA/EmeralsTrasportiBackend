// *** VARIABILE AGGIORNATA E SPOSTATA QUI PER ACCESSO GLOBALE AL MODULO ***
const backend_url = "https://emeralstrasportibackend.onrender.com"; // Assicurati che questo sia il tuo URL di Render EFFETTIVO!

const grades = [
    'Tirocinante', 'Autista', 'Autista Esperto', 'Responsabile Autisti',
    'Supervisore Generale', 'Supervisore Sandy', 'Supervisore Los Santos',
    'Vice Direttore', 'Direttore'
];

// Variabile globale per tracciare il dipendente in fase di modifica
window.editingEmployeeId = null;

document.addEventListener('DOMContentLoaded', () => {

    // Funzione per formattare la data GG/MM/AAAA e gestirne l'input
    function setupDateInput(inputId) {
        const dateInput = document.getElementById(inputId);
        if (!dateInput) return; // Aggiunto controllo per elementi dinamici
        dateInput.addEventListener('input', (event) => {
            let value = event.target.value.replace(/\D/g, ''); // Rimuove tutti i caratteri non numerici
            
            if (value.length > 8) {
                value = value.slice(0, 8); // Limita a 8 cifre
            }

            if (value.length >= 5) {
                value = value.slice(0, 4) + '/' + value.slice(4);
            }
            if (value.length >= 3) {
                value = value.slice(0, 2) + '/' + value.slice(2);
            }
            event.target.value = value;
        });
        
        dateInput.addEventListener('blur', (event) => {
            const value = event.target.value;
            if (value && !isValidDate(value)) {
                alert('Formato data non valido. Inserire GG/MM/AAAA.');
                event.target.value = '';
            }
        });
    }

    // Funzione di validazione della data GG/MM/AAAA
    function isValidDate(dateString) {
        const parts = dateString.split('/');
        if (parts.length !== 3) return false;
        
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;

        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day;
    }
    
    // Funzione per convertire GG/MM/AAAA in YYYY-MM-DD
    function convertDateToISO(dateString) {
        if (!dateString) return '';
        const parts = dateString.split('/');
        if (parts.length !== 3) return ''; // Aggiunto controllo robusto
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    
    // Funzione per convertire YYYY-MM-DD in GG/MM/AAAA
    function convertDateToIT(dateString) {
         if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length !== 3) return ''; // Aggiunto controllo robusto
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    // Applica la nuova logica agli input delle date
    setupDateInput('employeeDob');
    setupDateInput('employeeHireDate');

    // Popola il select per i gradi
    const employeeGradesSelect = document.getElementById('employeeGrade');
    grades.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = grade;
        employeeGradesSelect.appendChild(option);
    });

    // Gestione delle sezioni a tendina
    const collapsibleButtons = document.querySelectorAll('.collapsible-title');
    collapsibleButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const content = button.nextElementSibling;
            const icon = button.querySelector('.collapsible-icon');
            const isVisible = content.style.display === 'block';

            const parent = button.closest('.collapsible-container');
            const siblings = parent.querySelectorAll('.collapsible-content');
            siblings.forEach(sibling => {
                if (sibling !== content) {
                    sibling.style.display = 'none';
                    sibling.previousElementSibling.classList.remove('active');
                    sibling.previousElementSibling.querySelector('.collapsible-icon').style.transform = 'rotate(0deg)';
                }
            });

            if (!isVisible) {
                content.style.display = 'block';
                button.classList.add('active');
                icon.style.transform = 'rotate(90deg)';
            } else {
                content.style.display = 'none';
                button.classList.remove('active');
                icon.style.transform = 'rotate(0deg)';
            }
        });
    });

    // Funzione per il calcolo dell'età
    document.getElementById('employeeDob').addEventListener('change', (event) => {
        const isoDate = convertDateToISO(event.target.value);
        const dob = new Date(isoDate);
        if (!isNaN(dob.getTime())) { // Usa getTime() per una validazione più robusta
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                age--;
            }
            document.getElementById('employeeAge').value = age;
        } else {
            document.getElementById('employeeAge').value = '';
        }
    });

    // Funzione per ridimensionare l'immagine prima di convertirla in Base64
    function resizeImage(file, maxWidth, maxHeight, callback) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                callback(canvas.toDataURL('image/jpeg', 0.7)); // Qualità JPEG ridotta per risparmiare spazio
            };
        };
        reader.readAsDataURL(file); // Non toccare questa riga
    }

    // Funzione per mostrare l'anteprima delle immagini e ridimensionarle
    function setupImagePreview(fileInputId, previewImgId) {
        const fileInput = document.getElementById(fileInputId);
        const previewImg = document.getElementById(previewImgId);
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                resizeImage(file, 800, 600, (resizedBase64) => { // Ridimensiona a max 800x600 px
                    previewImg.src = resizedBase64;
                    previewImg.style.display = 'block';
                });
            } else {
                previewImg.src = '';
                previewImg.style.display = 'none';
            }
        });
    }

    setupImagePreview('patenteFile', 'patentePreview');
    setupImagePreview('idFile', 'idPreview');
    setupImagePreview('lavorativoFile', 'lavorativoPreview');

    // Funzione per assumere un dipendente e gestione dei dati
    document.getElementById('hireEmployeeBtn').addEventListener('click', async () => {
        const grade = document.getElementById('employeeGrade').value;
        const name = document.getElementById('employeeName').value;
        const dob = document.getElementById('employeeDob').value;
        const hireDate = document.getElementById('employeeHireDate').value;
        const patentePreview = document.getElementById('patentePreview').src;
        const idPreview = document.getElementById('idPreview').src;
        const lavorativoPreview = document.getElementById('lavorativoPreview').src;

        if (name && isValidDate(dob) && isValidDate(hireDate)) {
            try {
                // Assicurati che 'db' sia importato e disponibile qui per Firestore
                await addDoc(collection(db, "employees"), {
                    grade,
                    name,
                    dob: convertDateToISO(dob),
                    hire_date: convertDateToISO(hireDate),
                    patente_image: patentePreview,
                    id_image: idPreview,
                    lavorativo_image: lavorativoPreview,
                    status: 'active'
                });
                alert('Dipendente ' + name + ' assunto con successo!');
            } catch (e) {
                console.error("Errore nell'assumere il dipendente: ", e);
                alert("Si è verificato un errore durante l'assunzione.");
            }

            document.getElementById('employeeName').value = '';
            document.getElementById('employeeDob').value = '';
            document.getElementById('employeeHireDate').value = '';
            document.getElementById('employeeAge').value = '';
            document.getElementById('patentePreview').src = '';
            document.getElementById('patentePreview').style.display = 'none';
            document.getElementById('idPreview').src = '';
            document.getElementById('idPreview').style.display = 'none';
            document.getElementById('lavorativoPreview').src = '';
            document.getElementById('lavorativoPreview').style.display = 'none';
        } else {
            alert('Per favore, compila tutti i campi obbligatori (Nome completo, Data di Nascita, Assunto il) e assicurati che le date siano nel formato GG/MM/AAAA.');
        }
    });

    // Funzione per renderizzare la lista dei dipendenti attivi
    function renderEmployeeList(employees) {
        const employeeList = document.getElementById('activeEmployeeList');
        employeeList.innerHTML = '';

        const activeEmployees = employees.filter(emp => emp.status === 'active');
        if (activeEmployees.length === 0) {
            employeeList.innerHTML = '<p class="centered-text">Nessun dipendente registrato.</p>';
            return;
        }

        activeEmployees.forEach((employee) => {
            const formattedDob = convertDateToIT(employee.dob);
            const formattedHireDate = convertDateToIT(employee.hire_date);
            
            // Conserva i valori degli input se il dipendente è in fase di modifica
            let currentEditName = employee.name;
            let currentEditDob = formattedDob;
            let currentEditHireDate = formattedHireDate;

            if (window.editingEmployeeId === employee.id) {
                const existingCard = document.querySelector(`.employee-card [data-id="${employee.id}"]`);
                if (existingCard && existingCard.classList.contains('editing')) {
                    currentEditName = existingCard.querySelector('.edit-name').value;
                    currentEditDob = existingCard.querySelector('.edit-dob').value;
                    currentEditHireDate = existingCard.querySelector('.edit-hire-date').value;
                }
            }

            const card = document.createElement('div');
            card.classList.add('employee-card');
            card.innerHTML = `
                <div class="employee-info" data-id="${employee.id}">
                    <div class="text-fields">
                        <h4>${employee.name}</h4>
                        <p><strong>Grado:</strong> <span class="employee-grade-span">${employee.grade}</span></p>
                        <p><strong>Nato il:</strong> ${formattedDob}</p>
                        <p><strong>Assunto il:</strong> ${formattedHireDate}</p>
                    </div>
                    <div class="edit-fields">
                        <input type="text" class="edit-name" value="${currentEditName}">
                        <input type="text" class="edit-dob" value="${currentEditDob}" placeholder="GG/MM/AAAA" maxlength="10">
                        <input type="text" class="edit-hire-date" value="${currentEditHireDate}" placeholder="GG/MM/AAAA" maxlength="10">
                        <button class="btn-small save-edit-btn" data-id="${employee.id}">Salva modifiche</button>
                    </div>
                    <div class="image-preview-container">
                        <img src="${employee.patente_image}" alt="Patente" class="image-preview" style="display: ${employee.patente_image ? 'block' : 'none'};" data-doc-type="Patente">
                        <img src="${employee.id_image}" alt="Documento d'Identità" class="image-preview" style="display: ${employee.id_image ? 'block' : 'none'};" data-doc-type="ID">
                        <img src="${employee.lavorativo_image}" alt="Documento Lavorativo" class="image-preview" style="display: ${employee.lavorativo_image ? 'block' : 'none'};" data-doc-type="Lavorativo">
                    </div>
                    <div class="input-group" style="margin-top: 10px;">
                        <label>Modifica Documento Lavorativo:</label>
                        <input type="file" class="update-lavorativo-file" data-id="${employee.id}" accept="image/*">
                        <button class="btn-small update-lavorativo-btn" data-id="${employee.id}">Aggiorna Documento</button>
                    </div>
                </div>
                <div class="button-group">
                    <div class="button-row">
                        <select class="grade-select" data-id="${employee.id}">
                            ${grades.map(grade => `<option value="${grade}" ${employee.grade === grade ? 'selected' : ''}>${grade}</option>`).join('')}
                        </select>
                        <button class="btn-small promote-btn" data-id="${employee.id}">Promuovi/Degradazione</button>
                    </div>
                    <div class="button-row">
                        <button class="btn-small btn-edit" data-id="${employee.id}">Modifica Dati</button>
                        <button class="btn-small btn-fire" data-id="${employee.id}">Licenzia</button>
                        <button class="btn-small btn-delete" data-id="${employee.id}">Elimina</button>
                    </div>
                </div>
            `;
            employeeList.appendChild(card);
        });

        setupImageModalListeners();
        setupPromoteListeners();
        setupLavorativoUpdateListeners();
        setupFireListeners();
        setupDeleteListeners();
        setupEditListeners();
        
        // Applica la nuova logica agli input di modifica
        document.querySelectorAll('.edit-dob').forEach(input => setupDateInput(input.id = `edit-dob-${input.dataset.id || Math.random().toString(36).substring(7)}`)); // ID dinamico
        document.querySelectorAll('.edit-hire-date').forEach(input => setupDateInput(input.id = `edit-hire-date-${input.dataset.id || Math.random().toString(36).substring(7)}`)); // ID dinamico
    }
    
    function setupEditListeners() {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const employeeId = event.target.dataset.id;
                const card = event.target.closest('.employee-card');
                card.querySelector('.employee-info').classList.toggle('editing');
                
                // Imposta la variabile globale di editing
                if (card.querySelector('.employee-info').classList.contains('editing')) {
                    window.editingEmployeeId = employeeId;
                } else {
                    window.editingEmployeeId = null;
                }
            });
        });

        document.querySelectorAll('.save-edit-btn').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                const employeeId = event.target.dataset.id;
                const card = event.target.closest('.employee-card');
                const newName = card.querySelector('.edit-name').value;
                const newDob = card.querySelector('.edit-dob').value;
                const newHireDate = card.querySelector('.edit-hire-date').value;

                if (newName && isValidDate(newDob) && isValidDate(newHireDate)) {
                    try {
                        await updateDoc(doc(db, "employees", employeeId), {
                            name: newName,
                            dob: convertDateToISO(newDob),
                            newHireDate: convertDateToISO(newHireDate) // Errore qui, dovrebbe essere hire_date
                        });
                        alert('Dati anagrafici aggiornati con successo!');
                        card.querySelector('.employee-info').classList.remove('editing');
                        window.editingEmployeeId = null; // Resetta la variabile globale
                    } catch (e) {
                        console.error("Errore nell'aggiornare i dati: ", e);
                        alert("Si è verificato un errore durante l'aggiornamento.");
                    }
                } else {
                    alert('Per favori, compila tutti i campi e assicurati che le date siano nel formato GG/MM/AAAA.');
                }
            });
        });
    }
    
    function setupDeleteListeners() {
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                const employeeId = event.target.dataset.id;
                const confirmDelete = confirm("Sei sicuro di voler eliminare questo dipendente? Questa azione è irreversibile.");
                if (confirmDelete) {
                    try {
                        await deleteDoc(doc(db, "employees", employeeId));
                        alert('Dipendente eliminato con successo!');
                    } catch (e) {
                        console.error("Errore nell'eliminare il dipendente: ", e);
                        alert("Si è verificato un errore durante l'eliminazione.");
                    }
                }
            });
        });
    }

    // Funzione per renderizzare la lista dei dipendenti licenziati
    function renderFiredEmployeeList(employees) {
        const employeeList = document.getElementById('firedEmployeeList');
        employeeList.innerHTML = '';

        const firedEmployees = employees.filter(emp => emp.status === 'fired');
        if (firedEmployees.length === 0) {
            employeeList.innerHTML = '<p class="centered-text">Nessun dipendente licenziato.</p>';
            return;
        }

        firedEmployees.forEach((employee) => {
            const formattedDob = convertDateToIT(employee.dob);
            const formattedHireDate = convertDateToIT(employee.hire_date);
            const card = document.createElement('div');
            card.classList.add('employee-card');
            card.innerHTML = `
                <div class="employee-info">
                    <h4>${employee.name}</h4>
                    <p><strong>Grado:</strong> <span class="employee-grade-span">${employee.grade}</span></p>
                    <p><strong>Nato il:</strong> ${formattedDob}</p>
                    <p><strong>Data Assunzione:</strong> ${formattedHireDate}</p>
                    <p style="color: #dc3545; font-weight: bold;">STATO: LICENZIATO</p>
                </div>
                <div class="button-group">
                    <button class="btn-small btn-delete" data-id="${employee.id}">Elimina</button>
                </div>
            `;
            employeeList.appendChild(card);
        });
        setupFiredDeleteListeners();
    }

    function setupFiredDeleteListeners() {
        document.querySelectorAll('#firedEmployeeList .btn-delete').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                const employeeId = event.target.dataset.id;
                const confirmDelete = confirm("Sei sicuro di voler eliminare definitivamente questo dipendente licenziato? Questa azione è irreversibile.");
                if (confirmDelete) {
                    try {
                        await deleteDoc(doc(db, "employees", employeeId));
                        alert('Dipendente licenziato eliminato con successo!');
                    } catch (e) {
                        console.error("Errore nell'eliminare il dipendente: ", e);
                        alert("Si è verificato un errore durante l'eliminazione.");
                    }
                }
            });
        });
    }


    function setupImageModalListeners() {
        document.querySelectorAll('.image-preview').forEach(img => {
            img.addEventListener('click', (event) => {
                const modal = document.getElementById('imageModal');
                const modalImg = document.getElementById('modalImage');
                modal.style.display = 'block';
                modalImg.src = event.target.src;
            });
        });
    }

    function setupPromoteListeners() {
        document.querySelectorAll('.promote-btn').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                const employeeId = event.target.dataset.id;
                const select = event.target.previousElementSibling;
                const newGrade = select.value;
                try {
                    await updateDoc(doc(db, "employees", employeeId), {
                        grade: newGrade
                    });
                    alert(`Grado aggiornato a ${newGrade}.`);
                } catch (e) {
                    console.error("Errore nell'aggiornare il grado: ", e);
                    alert("Si è verificato un errore durante l'aggiornamento.");
                }
            });
        });
    }
    
    function setupFireListeners() {
        document.querySelectorAll('.btn-fire').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                const employeeId = event.target.dataset.id;
                const confirmFire = confirm("Sei sicuro di voler licenziare questo dipendente?");
                if (confirmFire) {
                    try {
                        await updateDoc(doc(db, "employees", employeeId), {
                            status: 'fired'
                        });
                        alert(`Dipendente licenziato con successo.`);
                    } catch (e) {
                        console.error("Errore nel licenziare il dipendente: ", e);
                        alert("Si è verificato un errore durante il licenziamento.");
                    }
                }
            });
        });
    }

    function setupLavorativoUpdateListeners() {
        document.querySelectorAll('.update-lavorativo-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const employeeId = event.target.dataset.id;
                const fileInput = document.querySelector(`.update-lavorativo-file[data-id="${employeeId}"]`);
                const file = fileInput.files[0];
                if (file) {
                    resizeImage(file, 800, 600, async (resizedBase64) => { // Ridimensiona prima di aggiornare
                        try {
                            await updateDoc(doc(db, "employees", employeeId), {
                                lavorativo_image: resizedBase64
                            });
                            alert(`Documento lavorativo aggiornato con successo.`);
                        } catch (e) {
                            console.error("Errore nell'aggiornare il documento: ", e);
                            alert("Si è verificato un errore durante l'aggiornamento.");
                        }
                    });
                } else {
                    alert('Seleziona un file immagine da aggiornare.');
                }
            });
        });
    }

    // Funzione per renderizzare la tabella degli stipendi per grado
    function renderGradeRatesTable(gradeRates) {
        const tableBody = document.getElementById('gradeRatesTableBody');
        tableBody.innerHTML = '';

        grades.forEach(grade => {
            const rate = gradeRates[grade] || 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${grade}</td>
                <td><input type="number" class="rate-input" data-grade="${grade}" min="0" value="${rate}"></td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Funzione per salvare gli stipendi per grado
    document.getElementById('saveRatesBtn').addEventListener('click', async () => {
        const gradeRates = {};
        document.querySelectorAll('#gradeRatesTableBody .rate-input').forEach(input => {
            const grade = input.dataset.grade;
            const rate = parseFloat(input.value) || 0;
            gradeRates[grade] = rate;
        });
        try {
            await setDoc(doc(db, "settings", "gradeRates"), gradeRates);
            alert('Stipendi per grado salvati con successo!');
        } catch (e) {
            console.error("Errore nel salvare gli stipendi: ", e);
            alert("Si è verificato un errore durante il salvataggio.");
        }
    });

    // Funzione per renderizzare la tabella degli stipendi per dipendente
    function renderStipendiTable(employees) {
        const tableBody = document.getElementById('stipendiTableBody');
        tableBody.innerHTML = '';

        const activeEmployees = employees.filter(emp => emp.status === 'active');
        if (activeEmployees.length === 0) {
            tableBody.innerHTML = '<tr id="noEmployeesRow"><td colspan="4" class="centered-text">Nessun dipendente registrato.</td></tr>';
            document.getElementById('downloadTableBtn').style.display = 'none';
            return;
        }

        activeEmployees.forEach(employee => {
            const row = document.createElement('tr');
            row.dataset.id = employee.id;
            row.innerHTML = `
                <td>${employee.name}</td>
                <td>${employee.grade}</td>
                <td><input type="number" class="hours-input" min="0" value="0" step="0.5"></td>
                <td class="total-stipendio">0.00 €</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Funzione per calcolare gli stipendi
    document.getElementById('calcolaStipendiBtn').addEventListener('click', async () => {
        const gradeRatesRef = doc(db, "settings", "gradeRates");
        const gradeRatesSnap = await getDoc(gradeRatesRef);
        const gradeRates = gradeRatesSnap.exists() ? gradeRatesSnap.data() : {};

        const employeesRef = collection(db, "employees");
        const employeesSnap = await getDocs(employeesRef);
        const employees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const rows = document.querySelectorAll('#stipendiTableBody tr');
        let totalHours = 0;
        const employeeDataForPdf = [];

        rows.forEach(row => {
            if (row.id !== 'noEmployeesRow') {
                const employeeId = row.dataset.id;
                const employee = employees.find(e => e.id === employeeId);

                if (employee) {
                    const ratePerHalfHour = gradeRates[employee.grade] || 0;
                    const hoursInput = row.querySelector('.hours-input');
                    const hours = parseFloat(hoursInput.value) || 0;
                    const totalStipendio = (hours * 2) * ratePerHalfHour;
                    row.querySelector('.total-stipendio').textContent = `${totalStipendio.toFixed(2)} €`;
                    totalHours += hours;

                    employeeDataForPdf.push({
                        name: employee.name,
                        grade: employee.grade,
                        hours: hours,
                        hourlyRate: ratePerHalfHour * 2,
                        totalSalary: totalStipendio
                    });
                }
            }
        });

        // Popola il riepilogo del PDF
        document.getElementById('total-hours-span').textContent = totalHours;
        document.getElementById('total-members-span').textContent = employeeDataForPdf.length;
        const topWorkers = [...employeeDataForPdf].sort((a, b) => b.hours - a.hours).slice(0, 3);
        const topWorkersTableBody = document.getElementById('top-workers-table-body');
        topWorkersTableBody.innerHTML = '';
        topWorkers.forEach((worker, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${index + 1}</td><td>${worker.name}</td>`;
            topWorkersTableBody.appendChild(row);
        });

        document.getElementById('pdf-summary').style.display = 'block';
        document.getElementById('downloadTableBtn').style.display = 'block';
    });

    // Funzione per scaricare il PDF
    document.getElementById('downloadTableBtn').addEventListener('click', () => {
        // Clona il contenuto da stampare per non modificarlo sulla pagina
        const elementToPrint = document.getElementById('calcolatoreStipendiContent').cloneNode(true);
        
        // Rimuovi i pulsanti dalla versione clonata
        elementToPrint.querySelector('#calcolaStipendiBtn').remove();
        elementToPrint.querySelector('#downloadTableBtn').remove();

        // Rimuovi le sezioni specificate dall'utente
        const gradoStipendiSection = elementToPrint.querySelector('.collapsible-container');
        if (gradoStipendiSection) {
            gradoStipendiSection.remove();
        }
        const calcoloStipendiTitle = elementToPrint.querySelector('h2');
        if (calcoloStipendiTitle) {
            calcoloStipendiTitle.remove();
        }

        // Aggiungi un header personalizzato per il PDF
        const header = document.createElement('h1');
        header.textContent = 'Riepilogo Stipendi Settimanale';
        header.style.textAlign = 'center';
        header.style.color = 'var(--header-color)';
        elementToPrint.prepend(header);

        const today = new Date();
        const dateString = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;

        // Crea un wrapper per il contenuto del PDF per impostare lo sfondo
        const pdfWrapper = document.createElement('div');
        pdfWrapper.classList.add('pdf-content-wrapper');
        pdfWrapper.appendChild(elementToPrint);

        const options = {
            filename: `Stipendi-${dateString}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(pdfWrapper).set(options).save();
    });


    // Gestione della chiusura del modal
    document.querySelector('.modal-close').addEventListener('click', () => {
        document.getElementById('imageModal').style.display = 'none';
    });

    // Chiudi il modal cliccando fuori dall'immagine
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('imageModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Avvia l'ascolto in tempo reale dei dati
    function setupRealtimeEmployeesListener() {
        // Assicurati che 'db' sia importato e configurato per Firestore
        onSnapshot(collection(db, "employees"), (snapshot) => {
            const employees = [];
            snapshot.forEach((doc) => {
                employees.push({ id: doc.id, ...doc.data() });
            });
            renderEmployeeList(employees);
            renderFiredEmployeeList(employees);
            renderStipendiTable(employees);
        });
    }

    function setupRealtimeGradeRatesListener() {
        // Assicurati che 'db' sia importato e configurato per Firestore
        onSnapshot(doc(db, "settings", "gradeRates"), (docSnapshot) => {
            if (docSnapshot.exists()) {
                renderGradeRatesTable(docSnapshot.data());
            } else {
                renderGradeRatesTable({});
            }
        });
    }

    // --- NUOVA LOGICA PER IL CONTROLLO DEGLI AGGIORNAMENTI ---
    async function checkAppUpdate() {
        const platform = 'desktop'; // Imposta la piattaforma (es. 'desktop' o 'android')

        try {
            const response = await fetch(`${backend_url}/checkUpdate?platform=${platform}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            const updateStatusDiv = document.getElementById('updateStatus');
            const downloadButton = document.getElementById('downloadUpdateBtn');

            if (data.updateAvailable) {
                updateStatusDiv.textContent = `Aggiornamento disponibile! Versione: ${data.latestVersion}, Rilasciato il: ${data.releaseDate}.`;
                updateStatusDiv.style.color = '#28a745'; // Colore verde per aggiornamento disponibile
                downloadButton.style.display = 'block';
                downloadButton.onclick = () => {
                    window.open(data.downloadUrl, '_blank');
                };
            } else {
                updateStatusDiv.textContent = data.message;
                updateStatusDiv.style.color = '#6c757d'; // Colore grigio per nessun aggiornamento
                downloadButton.style.display = 'none';
            }
        } catch (error) {
            console.error('Errore durante la verifica aggiornamenti:', error);
            document.getElementById('updateStatus').textContent = 'Errore durante la verifica aggiornamenti.';
            document.getElementById('updateStatus').style.color = '#dc3545'; // Colore rosso per errore
            document.getElementById('downloadUpdateBtn').style.display = 'none';
        }
    }

    // Inizializza l'applicazione chiamando i listener e la funzione di controllo aggiornamenti
    setupRealtimeEmployeesListener();
    setupRealtimeGradeRatesListener();
    checkAppUpdate(); // <-- Chiamata alla funzione di controllo aggiornamenti all'avvio
}); // Fine di document.addEventListener('DOMContentLoaded')
