// admin.js

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Your Firebase configuration (ensure this is correct)
const firebaseConfig = {
  apiKey: "AIzaSyDjM8k5uvvh2G2NAc1lxO4cNjZEtMwigrs",
  authDomain: "quiz-73d53.firebaseapp.com",
  projectId: "quiz-73d53",
  storageBucket: "quiz-73d53.appspot.com",
  messagingSenderId: "824484608948",
  appId: "1:824484608948:web:7c1c4e11bf313ee0cd90e1",
  measurementId: "G-W04Y2DBME5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const adminSection = document.getElementById('adminSection');
const adminForm = document.getElementById('adminForm');
const addQuestionBtn = document.getElementById('addQuestion');
const questionsContainer = document.getElementById('questionsContainer');
const quizListBody = document.getElementById('quizListBody');

// Bulk Upload Elements
const bulkUploadTextarea = document.getElementById('bulkUploadTextarea');
const bulkUploadBtn = document.getElementById('bulkUploadBtn');
const bulkUploadFeedback = document.getElementById('bulkUploadFeedback');

// Handle Admin Form Submission
adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const date = document.getElementById('quizDate').value;
    if (!date) {
        alert('Please select a quiz date.');
        return;
    }

    // Gather all questions
    const questionGroups = document.querySelectorAll('.question-group');
    let questions = [];

    for (let group of questionGroups) {
        const questionText = group.querySelector('.question-text').value.trim();
        const optionA = group.querySelector('.optionA').value.trim();
        const optionB = group.querySelector('.optionB').value.trim();
        const optionC = group.querySelector('.optionC').value.trim();
        const optionD = group.querySelector('.optionD').value.trim();
        const correctOption = group.querySelector('.correctOption').value;
        const explanation = group.querySelector('.explanation').value.trim();

        // Validation
        if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctOption) {
            alert('Please fill in all fields for each question.');
            return;
        }

        questions.push({
            question: questionText,
            options: {
                A: optionA,
                B: optionB,
                C: optionC,
                D: optionD
            },
            correctOption,
            explanation: explanation || "No explanation provided."
        });
    }

    try {
        // Check if quiz for the date already exists in Firestore
        const q = query(collection(db, "quizzes"), where("date", "==", date));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            alert('A quiz for this date already exists.');
            return;
        }

        // Create new quiz object
        const newQuiz = {
            date,
            questions
        };

        // Add new quiz to Firestore
        const docRef = await addDoc(collection(db, "quizzes"), newQuiz);
        console.log("Quiz added with ID: ", docRef.id);
        alert('Quiz added successfully!');
        adminForm.reset();
        questionsContainer.innerHTML = '';
        addQuestionGroup(); // Reset to one question group
        populateQuizList(); // Update quiz list
    } catch (error) {
        console.error("Error adding quiz: ", error);
        alert('Failed to add quiz. Please try again.');
    }
});

// Add Question Button Click
addQuestionBtn.addEventListener('click', () => {
    addQuestionGroup();
});

// Function to Add a New Question Group
function addQuestionGroup() {
    const questionGroup = document.createElement('div');
    questionGroup.classList.add('question-group');

    questionGroup.innerHTML = `
        <h3>Question ${document.querySelectorAll('.question-group').length + 1}</h3>
        <label>Quiz Question:</label>
        <textarea class="question-text" rows="2" placeholder="Enter Quiz Question" required></textarea>

        <label>Option A:</label>
        <input type="text" class="optionA" placeholder="Option A" required>

        <label>Option B:</label>
        <input type="text" class="optionB" placeholder="Option B" required>

        <label>Option C:</label>
        <input type="text" class="optionC" placeholder="Option C" required>

        <label>Option D:</label>
        <input type="text" class="optionD" placeholder="Option D" required>

        <label>Correct Option:</label>
        <select class="correctOption" required>
            <option value="" disabled selected>Select Correct Option</option>
            <option value="A">Option A</option>
            <option value="B">Option B</option>
            <option value="C">Option C</option>
            <option value="D">Option D</option>
        </select>

        <label>Explanation (Optional):</label>
        <textarea class="explanation" rows="2" placeholder="Enter Explanation"></textarea>

        <button type="button" class="btn remove-question-btn"><i class="fas fa-trash-alt"></i> Remove Question</button>
    `;

    questionsContainer.appendChild(questionGroup);

    // Add event listener to remove button
    const removeBtn = questionGroup.querySelector('.remove-question-btn');
    removeBtn.addEventListener('click', () => {
        questionsContainer.removeChild(questionGroup);
        updateQuestionNumbers();
    });
}

// Function to Update Question Numbers After Removal
function updateQuestionNumbers() {
    const questionGroups = document.querySelectorAll('.question-group');
    questionGroups.forEach((group, index) => {
        group.querySelector('h3').innerText = `Question ${index + 1}`;
    });
}

// Function to Populate Quiz List
async function populateQuizList() {
    // Clear existing list
    quizListBody.innerHTML = '';

    try {
        const quizSnapshot = await getDocs(collection(db, "quizzes"));

        if (quizSnapshot.empty) {
            quizListBody.innerHTML = `<tr><td colspan="3">No quizzes available.</td></tr>`;
            return;
        }

        // Sort quizzes by date ascending
        const sortedQuizzes = quizSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedQuizzes.forEach((quiz) => {
            const row = document.createElement('tr');

            // Quiz Date
            const dateCell = document.createElement('td');
            dateCell.innerText = quiz.date;
            row.appendChild(dateCell);

            // Number of Questions
            const numQuestionsCell = document.createElement('td');
            numQuestionsCell.innerText = quiz.questions.length;
            row.appendChild(numQuestionsCell);

            // Actions
            const actionsCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('btn', 'delete-btn');
            deleteBtn.innerHTML = `<i class="fas fa-trash-alt"></i> Delete`;
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete the quiz for ${quiz.date}?`)) {
                    await deleteQuiz(quiz.id);
                }
            });
            actionsCell.appendChild(deleteBtn);
            row.appendChild(actionsCell);

            quizListBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error fetching quizzes: ", error);
        quizListBody.innerHTML = `<tr><td colspan="3">Failed to load quizzes.</td></tr>`;
    }
}

// Function to Delete a Quiz by Document ID
async function deleteQuiz(quizId) {
    try {
        console.log(`Attempting to delete quiz with ID: ${quizId}`);
        const quizDoc = doc(db, "quizzes", quizId);
        await deleteDoc(quizDoc);
        console.log(`Quiz with ID: ${quizId} deleted successfully.`);
        alert('Quiz deleted successfully!');
        populateQuizList();
    } catch (error) {
        console.error("Error deleting quiz: ", error);
        alert('Failed to delete quiz. Please try again.');
    }
}

// Initialize with one question group
addQuestionGroup();

// Bulk Upload Functionality

bulkUploadBtn.addEventListener('click', async () => {
    const rawData = bulkUploadTextarea.value.trim();
    if (!rawData) {
        bulkUploadFeedback.innerText = "Please paste your quiz data in JSON format.";
        bulkUploadFeedback.style.color = 'red';
        return;
    }

    let quizzes;
    try {
        quizzes = JSON.parse(rawData);
    } catch (error) {
        bulkUploadFeedback.innerText = "Invalid JSON format. Please check your data.";
        bulkUploadFeedback.style.color = 'red';
        return;
    }

    // Validate that quizzes is an array
    if (!Array.isArray(quizzes)) {
        bulkUploadFeedback.innerText = "JSON data should be an array of quizzes.";
        bulkUploadFeedback.style.color = 'red';
        return;
    }

    let successCount = 0;
    let failureCount = 0;
    let failureDetails = "";

    for (let i = 0; i < quizzes.length; i++) {
        const quiz = quizzes[i];
        const { date, questions } = quiz;

        // Basic validation
        if (!date || !questions || !Array.isArray(questions) || questions.length === 0) {
            failureCount++;
            failureDetails += `\nQuiz ${i + 1}: Missing date or questions.`;
            continue;
        }

        // Check if quiz for the date already exists
        const q = query(collection(db, "quizzes"), where("date", "==", date));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            failureCount++;
            failureDetails += `\nQuiz ${i + 1}: A quiz for date ${date} already exists.`;
            continue;
        }

        // Validate each question
        let validQuiz = true;
        for (let j = 0; j < questions.length; j++) {
            const qItem = questions[j];
            const { question, options, correctOption } = qItem;

            if (!question || !options || typeof options !== 'object' || !correctOption) {
                validQuiz = false;
                failureDetails += `\nQuiz ${i + 1}, Question ${j + 1}: Missing required fields.`;
                break;
            }

            // Check if all options A-D exist
            const optionKeys = ['A', 'B', 'C', 'D'];
            for (let key of optionKeys) {
                if (!options[key]) {
                    validQuiz = false;
                    failureDetails += `\nQuiz ${i + 1}, Question ${j + 1}: Missing option ${key}.`;
                    break;
                }
            }

            // Check if correctOption is valid
            if (!optionKeys.includes(correctOption)) {
                validQuiz = false;
                failureDetails += `\nQuiz ${i + 1}, Question ${j + 1}: Invalid correctOption '${correctOption}'.`;
                break;
            }
        }

        if (!validQuiz) {
            failureCount++;
            continue;
        }

        try {
            // Create new quiz object
            const newQuiz = {
                date,
                questions
            };

            // Add new quiz to Firestore
            await addDoc(collection(db, "quizzes"), newQuiz);
            successCount++;
        } catch (error) {
            console.error(`Error adding Quiz ${i + 1}: `, error);
            failureCount++;
            failureDetails += `\nQuiz ${i + 1}: Firestore error.`;
        }
    }

    // Provide feedback to the admin
    let feedbackMessage = `Bulk Upload Completed!\nSuccessful uploads: ${successCount}\nFailed uploads: ${failureCount}`;
    if (failureCount > 0) {
        feedbackMessage += `\nDetails:${failureDetails}`;
        bulkUploadFeedback.style.color = 'red';
    } else {
        bulkUploadFeedback.style.color = 'green';
    }
    bulkUploadFeedback.innerText = feedbackMessage;

    // Reset textarea if all uploads succeeded
    if (failureCount === 0) {
        bulkUploadTextarea.value = '';
        populateQuizList();
    }
});
