// user.js

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getFirestore, collection, getDocs, getDoc, doc 
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
const quizDropdown = document.getElementById('quizDropdown');
const quizSection = document.getElementById('quizSection');
const quizDateDisplay = document.getElementById('selectedDate');
const questionContainer = document.getElementById('questionContainer');
const submitQuizBtn = document.getElementById('submitQuiz');

const resultSection = document.getElementById('resultSection');
const resultChart = document.getElementById('resultChart').getContext('2d');
const feedbackDiv = document.getElementById('feedback');
const promoCodeDiv = document.getElementById('promoCode');
const promoCodeSpan = document.getElementById('code');
const viewLeaderboardBtn = document.getElementById('viewLeaderboard');
const closeResultBtn = document.getElementById('closeResult');

const completedSection = document.getElementById('completedSection');
const completedScoreSpan = document.getElementById('completedScore');
const completedPromoCodeDiv = document.getElementById('completedPromoCode');
const completedCodeSpan = document.getElementById('completedCode');
const viewLeaderboardCompletedBtn = document.getElementById('viewLeaderboardCompleted');
const closeCompletedBtn = document.getElementById('closeCompleted');

const leaderboardSection = document.getElementById('leaderboardSection');
const leaderboardBody = document.getElementById('leaderboardBody');
const closeLeaderboardBtn = document.getElementById('closeLeaderboard');

const resetQuizzesBtn = document.getElementById('resetQuizzes');

// New DOM Elements for Overall and Daily Scores
const overallScoreElement = document.getElementById('overallScore');
const totalQuizzesElement = document.getElementById('totalQuizzes');
const overallAccuracyElement = document.getElementById('overallAccuracy');

const dailyScoreSection = document.getElementById('dailyScoreSection');
const dailyScoreElement = document.getElementById('dailyScore');
const dailyAccuracyElement = document.getElementById('dailyAccuracy');

// Theme Elements
const themeSwitch = document.getElementById('themeSwitch');

// Threshold for Promo Code
const PROMO_THRESHOLD = 70;

// Initialize Theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.classList.add(`${savedTheme}-theme`);
if (savedTheme === 'dark') {
    themeSwitch.checked = true;
}

// Event listener for theme toggle
themeSwitch.addEventListener('change', () => {
    if (themeSwitch.checked) {
        document.body.classList.replace('light-theme', 'dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.replace('dark-theme', 'light-theme');
        localStorage.setItem('theme', 'light');
    }
});

// Fetch and populate quiz dropdown on page load
document.addEventListener('DOMContentLoaded', async () => {
    await populateQuizDropdown();
    populateCompletedQuizzes();
    calculateAndDisplayScores();
});

// Function to populate quiz dropdown with dates
async function populateQuizDropdown() {
    try {
        const quizzesSnapshot = await getDocs(collection(db, "quizzes"));
        if (quizzesSnapshot.empty) {
            quizDropdown.innerHTML += `<option value="">No quizzes available</option>`;
            return;
        }

        quizzesSnapshot.forEach((doc) => {
            const quiz = doc.data();
            quizDropdown.innerHTML += `<option value="${doc.id}">${quiz.date}</option>`;
        });
    } catch (error) {
        console.error("Error fetching quizzes: ", error);
        quizDropdown.innerHTML += `<option value="">Failed to load quizzes</option>`;
    }
}

// Event listener for quiz selection
quizDropdown.addEventListener('change', async (e) => {
    const quizId = e.target.value;
    if (!quizId) {
        quizSection.style.display = 'none';
        return;
    }

    const isCompleted = checkIfQuizCompleted(quizId);
    if (isCompleted) {
        displayCompletedQuiz(quizId);
    } else {
        await displayQuiz(quizId);
    }
});

// Function to check if quiz is already completed
function checkIfQuizCompleted(quizId) {
    const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes')) || {};
    return completedQuizzes.hasOwnProperty(quizId);
}

// Function to display completed quiz
function displayCompletedQuiz(quizId) {
    const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes')) || {};
    const score = completedQuizzes[quizId].score;

    quizSection.style.display = 'none';
    completedSection.style.display = 'block';
    completedScoreSpan.innerText = score;

    if (score >= PROMO_THRESHOLD) {
        const promo = generatePromoCode();
        completedPromoCodeDiv.style.display = 'block';
        completedCodeSpan.innerText = promo;
    } else {
        completedPromoCodeDiv.style.display = 'none';
    }

    // Display daily score if the completed quiz is from today
    const quizDate = completedQuizzes[quizId].date;
    const today = new Date().toISOString().split('T')[0];
    if (quizDate === today) {
        dailyScoreElement.innerText = score;
        dailyAccuracyElement.innerText = `${getAccuracyPercentage(quizId)}%`;
        dailyScoreSection.style.display = 'block';
    } else {
        dailyScoreSection.style.display = 'none';
    }
}

// Function to display quiz questions
async function displayQuiz(quizId) {
    try {
        const quizDoc = await getDoc(doc(db, "quizzes", quizId));
        if (!quizDoc.exists()) {
            alert('Selected quiz does not exist.');
            quizSection.style.display = 'none';
            return;
        }

        const quizData = quizDoc.data();
        quizDateDisplay.innerText = quizData.date;
        quizSection.style.display = 'block';
        completedSection.style.display = 'none';
        dailyScoreSection.style.display = 'none';

        questionContainer.innerHTML = ''; // Clear previous questions

        quizData.questions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('question');
            questionDiv.innerHTML = `<p><strong>Q${index + 1}:</strong> ${q.question}</p>`;

            const optionsDiv = document.createElement('div');
            optionsDiv.classList.add('options');

            for (let key in q.options) {
                const optionLabel = document.createElement('label');
                optionLabel.innerHTML = `
                    <input type="radio" name="question${index}" value="${key}" required> ${key}: ${q.options[key]}
                `;
                optionsDiv.appendChild(optionLabel);
            }

            // Note: Explanations are not added here to prevent premature display

            questionDiv.appendChild(optionsDiv);
            questionContainer.appendChild(questionDiv);
        });

        // Attach quiz data to a global variable for submission
        window.currentQuizData = {
            id: quizDoc.id,
            date: quizDoc.data().date,
            ...quizData
        };

    } catch (error) {
        console.error("Error fetching quiz: ", error);
        alert('Failed to load the selected quiz.');
        quizSection.style.display = 'none';
    }
}

// Event listener for submitting the quiz
submitQuizBtn.addEventListener('click', () => {
    submitQuiz();
});

// Function to submit the quiz
function submitQuiz() {
    if (!window.currentQuizData) {
        alert('No quiz data available.');
        return;
    }

    const quizId = window.currentQuizData.id;
    const quizDate = window.currentQuizData.date;
    const totalQuestions = window.currentQuizData.questions.length;
    let score = 0;
    let userAnswers = [];

    // Iterate through each question to check answers
    window.currentQuizData.questions.forEach((q, index) => {
        const selectedOption = document.querySelector(`input[name="question${index}"]:checked`);
        const userAnswer = selectedOption ? selectedOption.value : null;
        if (userAnswer === q.correctOption) {
            score += 1;
        }
        userAnswers.push({
            question: q.question,
            selectedOption: userAnswer,
            correctOption: q.correctOption,
            explanation: q.explanation
        });
    });

    const percentage = ((score / totalQuestions) * 100).toFixed(2);

    // Store the quiz completion in localStorage with detailed answers and date
    const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes')) || {};
    completedQuizzes[quizId] = { 
        score: Number(percentage),
        userAnswers: userAnswers,
        date: quizDate // Store the date of the quiz
    };
    localStorage.setItem('completedQuizzes', JSON.stringify(completedQuizzes));

    // Update Overall Scores
    calculateAndDisplayScores();

    // Display results
    displayResults(percentage, userAnswers);
}

// Function to calculate and display Overall and Daily Scores
function calculateAndDisplayScores() {
    const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes')) || {};
    const quizIds = Object.keys(completedQuizzes);
    const totalQuizzes = quizIds.length;

    if (totalQuizzes === 0) {
        overallScoreElement.innerText = '0';
        totalQuizzesElement.innerText = '0';
        overallAccuracyElement.innerText = '0%';
        dailyScoreSection.style.display = 'none';
        return;
    }

    let cumulativeScore = 0;
    let totalQuestionsAttempted = 0;
    let totalCorrectAnswers = 0;

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    let todayQuizId = null;

    quizIds.forEach((quizId) => {
        const quiz = completedQuizzes[quizId];
        cumulativeScore += quiz.score;
        const numQuestions = quiz.userAnswers.length;
        totalQuestionsAttempted += numQuestions;
        quiz.userAnswers.forEach(answer => {
            if (answer.selectedOption === answer.correctOption) {
                totalCorrectAnswers += 1;
            }
        });

        // Check if the quiz was taken today
        if (quiz.date === today) {
            todayQuizId = quizId;
        }
    });

    const averageScore = (cumulativeScore / totalQuizzes).toFixed(2);
    const overallAccuracy = ((totalCorrectAnswers / totalQuestionsAttempted) * 100).toFixed(2);

    overallScoreElement.innerText = averageScore;
    totalQuizzesElement.innerText = totalQuizzes;
    overallAccuracyElement.innerText = `${overallAccuracy}%`;

    // If there's a quiz taken today, display daily score and accuracy
    if (todayQuizId) {
        const todayQuiz = completedQuizzes[todayQuizId];
        dailyScoreElement.innerText = todayQuiz.score;
        const dailyAccuracy = getAccuracyPercentage(todayQuizId);
        dailyAccuracyElement.innerText = `${dailyAccuracy}%`;
        dailyScoreSection.style.display = 'block';
    } else {
        dailyScoreSection.style.display = 'none';
    }
}

// Helper function to calculate accuracy percentage for a specific quiz
function getAccuracyPercentage(quizId) {
    const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes')) || {};
    if (!completedQuizzes.hasOwnProperty(quizId)) return 0;

    const quiz = completedQuizzes[quizId];
    const totalQuestions = quiz.userAnswers.length;
    let correctAnswers = 0;
    quiz.userAnswers.forEach(answer => {
        if (answer.selectedOption === answer.correctOption) {
            correctAnswers += 1;
        }
    });
    const accuracy = ((correctAnswers / totalQuestions) * 100).toFixed(2);
    return accuracy;
}

// Function to display quiz results
function displayResults(percentage, userAnswers) {
    quizSection.style.display = 'none';
    resultSection.style.display = 'block';
    completedSection.style.display = 'none';

    // Render Chart.js visualization
    new Chart(resultChart, {
        type: 'bar',
        data: {
            labels: ['Score'],
            datasets: [{
                label: 'Your Score (%)',
                data: [percentage],
                backgroundColor: ['#28a745']
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    // Provide feedback
    if (percentage >= PROMO_THRESHOLD) {
        feedbackDiv.innerHTML = `<p>Great job! You scored ${percentage}%. Keep up the good work!</p>`;
        // Generate Promo Code
        const promo = generatePromoCode();
        promoCodeDiv.style.display = 'block';
        promoCodeSpan.innerText = promo;
    } else {
        feedbackDiv.innerHTML = `<p>You scored ${percentage}%. Focus on your weak areas and try again!</p>`;
        promoCodeDiv.style.display = 'none';
    }

    // Display detailed feedback with explanations
    const detailedFeedback = document.createElement('div');
    detailedFeedback.classList.add('detailed-feedback');

    userAnswers.forEach((answer, index) => {
        const questionFeedback = document.createElement('div');
        questionFeedback.classList.add('question-feedback');

        // Determine if the answer was correct
        const isCorrect = answer.selectedOption === answer.correctOption;
        const statusText = isCorrect ? 'Correct' : 'Incorrect';
        const statusColor = isCorrect ? '#28a745' : '#dc3545';

        // Fetch the corresponding options from the currentQuizData
        const correctOptionText = window.currentQuizData.questions[index].options[answer.correctOption];
        const selectedOptionText = answer.selectedOption ? window.currentQuizData.questions[index].options[answer.selectedOption] : "No Answer";

        questionFeedback.innerHTML = `
            <p><strong>Q${index + 1}:</strong> ${answer.question}</p>
            <p><strong>Your Answer:</strong> ${answer.selectedOption ? answer.selectedOption + ": " + selectedOptionText : "No Answer"}</p>
            <p><strong>Correct Answer:</strong> ${answer.correctOption}: ${correctOptionText}</p>
            <p style="color: ${statusColor};"><strong>Status:</strong> ${statusText}</p>
            <p><strong>Explanation:</strong> ${answer.explanation}</p>
            <hr>
        `;

        detailedFeedback.appendChild(questionFeedback);
    });

    resultSection.appendChild(detailedFeedback);

    // Update completed section
    const selectedQuizId = quizDropdown.value;
    const selectedQuizDate = window.currentQuizData.date;
    completedScoreSpan.innerText = percentage;

    if (percentage >= PROMO_THRESHOLD) {
        completedPromoCodeDiv.style.display = 'block';
        completedCodeSpan.innerText = generatePromoCode();
    } else {
        completedPromoCodeDiv.style.display = 'none';
    }

    // Reset currentQuizData
    window.currentQuizData = null;
}

// Function to generate a random promo code
function generatePromoCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Function to populate completed quizzes on page load
function populateCompletedQuizzes() {
    const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes')) || {};
    // Currently not displaying a list, but this can be expanded
}

// Event listener for viewing the leaderboard
viewLeaderboardBtn.addEventListener('click', () => {
    displayLeaderboard();
});

// Event listener for viewing the leaderboard from completed section
viewLeaderboardCompletedBtn.addEventListener('click', () => {
    displayLeaderboard();
});

// Event listener for closing the result section
closeResultBtn.addEventListener('click', () => {
    resultSection.style.display = 'none';
});

// Event listener for closing the completed section
closeCompletedBtn.addEventListener('click', () => {
    completedSection.style.display = 'none';
});

// Event listener for closing the leaderboard
closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardSection.style.display = 'none';
});

// Function to display leaderboard
function displayLeaderboard() {
    // Fetch all completed quizzes from localStorage
    const completedQuizzes = JSON.parse(localStorage.getItem('completedQuizzes')) || {};
    const leaderboardData = [];

    for (let quizId in completedQuizzes) {
        const quizDate = completedQuizzes[quizId].date;
        const score = completedQuizzes[quizId].score;
        leaderboardData.push({ quizDate, score });
    }

    // Sort by score descending
    leaderboardData.sort((a, b) => b.score - a.score);

    // Populate leaderboard table
    leaderboardBody.innerHTML = '';
    leaderboardData.forEach((data, index) => {
        leaderboardBody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${data.quizDate}</td>
                <td>${data.score}%</td>
            </tr>
        `;
    });

    // Display leaderboard section
    leaderboardSection.style.display = 'block';
}

// Event listener for resetting all quiz attempts
resetQuizzesBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all quiz attempts? This cannot be undone.')) {
        localStorage.removeItem('completedQuizzes');
        alert('All quiz attempts have been reset.');
        location.reload();
    }
});
